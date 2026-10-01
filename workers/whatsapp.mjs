import {createHmac,randomUUID} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

function endpoint(value){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)throw Error('Use URL HTTPS sem credenciais.');return u.toString().replace(/\/$/,'');}
async function request(url,{method='GET',headers={},body,timeout=15000}={}){
  const r=await fetch(url,{method,headers:{...headers,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(timeout),redirect:'error'});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw Object.assign(Error('Resposta do conector: '+r.status),{status:r.status});return data;
}
export class Bridge{
  constructor({url,accountId,secret}){this.url=endpoint(url);this.accountId=accountId;this.secret=secret;if(!accountId||!secret)throw Error('Configure conta e segredo de pareamento.');}
  async call(action,input={},eventId=randomUUID()){
    const body=JSON.stringify({...input,action,eventId,accountId:this.accountId}),ts=String(Math.floor(Date.now()/1000));
    const sig=createHmac('sha256',this.secret).update(ts+'.'+body).digest('hex');
    const r=await fetch(this.url+'/api/n8n/bridge',{method:'POST',headers:{'Content-Type':'application/json','x-rpb-timestamp':ts,'x-rpb-signature':sig},body,signal:AbortSignal.timeout(15000),redirect:'error'});
    const data=await r.json();if(!r.ok)throw Object.assign(Error('Ponte: '+r.status),{status:r.status});return data;
  }
}
export class WhatsappAdapter{
  constructor(config){this.type=config.type;this.base=endpoint(config.url);this.token=process.env[config.tokenEnv];this.allowed=new Set(config.groups||[]);if(!this.token||!['EVOLUTION','HTTP'].includes(this.type)||!this.allowed.size)throw Error('Configure provedor, credencial e grupos autorizados.');}
  async health(connection){
    const id=encodeURIComponent(connection.externalId);
    if(this.type==='EVOLUTION'){
      const headers={apikey:this.token},rows=await request(this.base+'/instance/fetchInstances?instanceName='+id,{headers});
      const row=Array.isArray(rows)?rows.find(r=>r.name===connection.externalId||r.instance?.instanceName===connection.externalId):null;
      if(!row)return {connected:false,phoneNumber:connection.phoneNumber,groups:[]};
      const phone='+'+String(row.ownerJid||row.number||'').split('@')[0].split(':')[0].replace(/\D/g,'');
      const connected=(row.connectionStatus||row.instance?.status)==='open'&&phone===connection.phoneNumber;
      if(!connected)return {connected:false,phoneNumber:connection.phoneNumber,groups:[]};
      const groups=await request(this.base+'/group/fetchAllGroups/'+id+'?getParticipants=false',{headers});
      return {connected:true,phoneNumber:phone,groups:Array.isArray(groups)?groups.map(g=>g.id).filter(g=>this.allowed.has(g)):[]};
    }
    const row=await request(this.base+'/connections/'+id+'/status',{headers:{Authorization:'Bearer '+this.token}});
    return {connected:row.status==='CONNECTED'&&row.phoneNumber===connection.phoneNumber,phoneNumber:connection.phoneNumber,groups:Array.isArray(row.groupIds)?row.groupIds.filter(g=>this.allowed.has(g)):[]};
  }
  async send(item){
    // A failed precondition is a confirmed absence of an outbound request.
    if(!this.allowed.has(item.groupExternalId))return {status:'FAILED',error:'Destino fora dos grupos autorizados do worker.'};
    try{
      const id=encodeURIComponent(item.connectionExternalId),message=String(item.message||'');
      let data;
      if(this.type==='EVOLUTION'){
        if(!item.groupExternalId.endsWith('@g.us'))return {status:'FAILED',error:'ID de grupo incompatível com este adaptador.'};
        const media=item.contentType!=='MESSAGE';
        data=await request(this.base+'/message/'+(media?'sendMedia/':'sendText/')+id,{method:'POST',headers:{apikey:this.token},body:media?{number:item.groupExternalId,mediatype:'image',media:item.imageUrl,caption:message}:{number:item.groupExternalId,text:message},timeout:20000});
        const receipt=data.key?.id;
        return receipt?{status:'PUBLISHED',externalMessageId:receipt}:{status:'UNKNOWN'};
      }
      data=await request(this.base+'/connections/'+id+'/messages',{method:'POST',headers:{Authorization:'Bearer '+this.token,'Idempotency-Key':item.dispatchToken},body:{groupId:item.groupExternalId,text:message,imageUrl:item.imageUrl||null,dispatchToken:item.dispatchToken},timeout:20000});
      return data.status==='PUBLISHED'&&data.externalMessageId?{status:'PUBLISHED',externalMessageId:data.externalMessageId}:data.status==='FAILED'&&data.confirmedNotDelivered===true?{status:'FAILED',error:'Não entregue, confirmado pelo adaptador.'}:{status:'UNKNOWN'};
    }catch{
      // An HTTP error or timeout may happen after the provider accepted a message.
      return {status:'UNKNOWN'};
    }
  }
}
export async function deliverClaim(item,adapter,journal,bridge){
  const record={publicationId:item.id,dispatchToken:item.dispatchToken,connectionId:item.connectionId};
  await journal.save(item.dispatchToken,{phase:'ISSUED',...record});
  const result={...record,...await adapter.send(item)};
  await journal.save(item.dispatchToken,{phase:'RESULT',...result});
  await bridge.call('result',result,'result:'+item.dispatchToken+':'+result.status);
  await journal.remove(item.dispatchToken);
  return result.status;
}
export class Journal{
  constructor(directory){this.directory=directory;}
  async init(){await fs.mkdir(this.directory,{recursive:true,mode:0o700});}
  file(id){if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Token de entrega inválido.');return path.join(this.directory,id+'.json');}
  async save(id,data){const f=this.file(id),tmp=f+'.tmp';await fs.writeFile(tmp,JSON.stringify(data),{mode:0o600});await fs.rename(tmp,f);}
  async remove(id){await fs.unlink(this.file(id));}
  async reconcile(bridge){
    let count=0;
    for(const file of await fs.readdir(this.directory)){
      if(!/^[a-f0-9-]{36}\.json$/.test(file))continue;
      const saved=JSON.parse(await fs.readFile(path.join(this.directory,file),'utf8'));
      const {phase,...record}=saved,result=phase==='ISSUED'?{...record,status:'UNKNOWN'}:record;
      try{await bridge.call('result',result,'result:'+record.dispatchToken+':'+result.status);}catch(e){if(e.status!==409)throw e;}
      await this.remove(record.dispatchToken);count++;
    }
    return count;
  }
}
export async function workerCycle({bridge,adapters,journal,checkHealth=true}){
  await journal.reconcile(bridge);
  if(checkHealth){
    const {connections}=await bridge.call('connections');
    for(const c of connections){
      const adapter=adapters.get(c.externalId);if(!adapter)continue;
      let health;try{health=await adapter.health(c);}catch{health={connected:false,phoneNumber:c.phoneNumber,groups:[]};}
      await bridge.call('connection',{connectionId:c.id,phoneNumber:health.phoneNumber,status:health.connected?'CONNECTED':'DISCONNECTED',groupMessagingSupported:health.connected&&health.groups.length>0,groupIds:health.groups});
    }
  }
  const {items}=await bridge.call('pull',{limit:5});let processed=0;
  for(const item of items){
    const adapter=adapters.get(item.connectionExternalId);
    await deliverClaim(item,adapter||{send:async()=>({status:'FAILED',error:'Conector ausente neste worker.'})},journal,bridge);processed++;
  }
  return {processed};
}
async function main(){
  const raw=JSON.parse(await fs.readFile(process.env.WHATSAPP_WORKER_CONFIG||'whatsapp-worker.json','utf8'));
  if(!Array.isArray(raw.connections)||!raw.connections.length||raw.connections.length>5||new Set(raw.connections.map(c=>c.externalId)).size!==raw.connections.length)throw Error('Configure entre um e cinco conectores distintos.');
  const adapters=new Map(raw.connections.map(c=>[c.externalId,new WhatsappAdapter(c)]));
  const bridge=new Bridge({url:process.env.PUBLIC_APP_URL,accountId:process.env.WORKER_ACCOUNT_ID,secret:process.env.RPB_PAIRING_SECRET});
  const journal=new Journal(path.resolve(process.env.WORKER_STATE_DIR||'data/whatsapp-worker'));await journal.init();
  const lock=await fs.open(path.join(journal.directory,'worker.lock'),'wx',0o600);await lock.writeFile(String(process.pid));
  let running=true;for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{running=false;});
  try{
    let lastHealth=0;
    do{
      try{const health=Date.now()-lastHealth>300000;const result=await workerCycle({bridge,adapters,journal,checkHealth:health});if(health)lastHealth=Date.now();console.log(JSON.stringify({at:new Date().toISOString(),...result}));}
      catch(e){console.error('Ciclo não concluído. Resultados pendentes serão reconciliados.');if(process.argv.includes('--once'))throw e;}
      if(process.argv.includes('--once'))break;
      await new Promise(resolve=>setTimeout(resolve,Math.max(5,Math.min(300,Number(process.env.WORKER_POLL_SECONDS)||15))*1000));
    }while(running);
  }finally{await lock.close();await fs.unlink(path.join(journal.directory,'worker.lock'));}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(()=>{console.error('Worker indisponível. Verifique configuração, credenciais e lock.');process.exitCode=1;});
