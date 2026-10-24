import { db, config } from 'hatchable';
import { withIntegrationHealth } from 'lib/integration-health.js';
import { open, seal } from 'lib/direct-connectors.js';
export const access='member';
export const methods=['POST'];
const ENDPOINT='https://radar-n8n.duckdns.org/mcp-server/http';
const VERSION='2025-03-26';
async function readPayload(response){
 const raw=await response.text();
 if(!response.ok)throw Object.assign(new Error('Servidor MCP respondeu HTTP '+response.status+'.'),{status:502});
 if(!raw.trim())return null;
 if(String(response.headers.get('content-type')||'').includes('text/'+'event-stream')){const lines=raw.split(/\r?\n/).filter(x=>x.startsWith('data:')).map(x=>x.slice(5).trim()).filter(Boolean);for(let i=lines.length-1;i>=0;i--){try{return JSON.parse(lines[i]);}catch{}}throw Object.assign(new Error('Resposta SSE do MCP inválida.'),{status:502});}
 try{return JSON.parse(raw);}catch{throw Object.assign(new Error('Resposta JSON-RPC do MCP inválida.'),{status:502});}
}
async function rpc(token,method,id,params,session,version){
 const headers={'authorization':'Bearer '+token,'content-type':'application/json','accept':['application/json','text/'+'event-stream'].join(', '),'mcp-protocol-version':version||VERSION};
 if(session)headers['mcp-session-id']=session;
 const response=await fetch(ENDPOINT,{method:'POST',headers,body:JSON.stringify({jsonrpc:'2.0',id,method,params}),signal:AbortSignal.timeout(10000)});
 return {response,data:await readPayload(response)};
}
async function handler(req,res){
 if(!req.member)return res.status(401).json({error:'Entre no Radar Promo Brasil para testar o MCP.'});
 try{
  const account=(await db.query("SELECT id FROM accounts WHERE owner_member_id=$1 AND status='ACTIVE' LIMIT 1",[String(req.member.id)])).rows[0];
  if(!account)return res.status(412).json({error:'Abra o painel para inicializar sua conta.'});
  const configuredToken=String(await config.get('N8N_MCP_ACCESS_TOKEN')||'').trim();
  let row=null,token='',refresh=null,useStaticToken=Boolean(configuredToken);
  if(useStaticToken){
   token=configuredToken;
  }else{
   row=(await db.query("SELECT * FROM marketplace_connections WHERE account_id=$1 AND marketplace='N8N_MCP' AND status='ACTIVE' LIMIT 1",[account.id])).rows[0];
   if(!row)return res.status(412).json({ok:false,status:'NOT_CONNECTED',error:'Configure N8N_MCP_ACCESS_TOKEN no cofre de segredos ou conecte o n8n por OAuth.'});
   token=await open(row.access_token_enc);refresh=JSON.parse(await open(row.refresh_token_enc));
   if(new Date(row.expires_at).getTime()<Date.now()+30000){
    if(!refresh.refreshToken)return res.status(412).json({ok:false,status:'REAUTH_REQUIRED',error:'O token expirou sem refresh token. Reconecte o n8n.'});
    const params={grant_type:'refresh_token',client_id:refresh.clientId,refresh_token:refresh.refreshToken};if(refresh.clientSecret)params.client_secret=refresh.clientSecret;
    const response=await fetch('https://radar-n8n.duckdns.org/mcp-oauth/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded',accept:'application/json'},body:new URLSearchParams(params).toString(),signal:AbortSignal.timeout(10000)});
    const fresh=await response.json().catch(()=>({}));
    if(!response.ok||!fresh.access_token){await db.query("UPDATE marketplace_connections SET status='ERROR',last_error=$1,updated_at=now() WHERE account_id=$2 AND marketplace='N8N_MCP'",['Renovação OAuth recusada (HTTP '+response.status+').',account.id]);throw Object.assign(new Error('O n8n recusou a renovação OAuth. Reconecte a conta.'),{status:502});}
    token=String(fresh.access_token);refresh.refreshToken=String(fresh.refresh_token||refresh.refreshToken);
    row.expires_at=new Date(Date.now()+Math.max(60,Number(fresh.expires_in)||3600)*1000).toISOString();
    await db.query("UPDATE marketplace_connections SET access_token_enc=$1,refresh_token_enc=$2,expires_at=$3,status='ACTIVE',last_error='',updated_at=now() WHERE account_id=$4 AND marketplace='N8N_MCP'",[await seal(token),await seal(JSON.stringify(refresh)),row.expires_at,account.id]);
   }
  }
  const init=await rpc(token,'initialize',1,{protocolVersion:VERSION,capabilities:{},clientInfo:{name:'radar-promo-brasil',version:'1.0.0'}},'',VERSION);
  if(init.data?.error)throw Object.assign(new Error('Handshake MCP recusado: '+String(init.data.error.message||'erro JSON-RPC').slice(0,160)),{status:502});
  if(!init.data?.result)throw Object.assign(new Error('O servidor não confirmou o handshake MCP.'),{status:502});
  const session=init.response.headers.get('mcp-session-id')||'',version=String(init.data.result.protocolVersion||VERSION);
  const headers={'authorization':'Bearer '+token,'content-type':'application/json','accept':['application/json','text/'+'event-stream'].join(', '),'mcp-protocol-version':version};if(session)headers['mcp-session-id']=session;
  const notice=await fetch(ENDPOINT,{method:'POST',headers,body:JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'}),signal:AbortSignal.timeout(10000)});
  if(!notice.ok&&notice.status!==202)throw Object.assign(new Error('O servidor recusou a conclusão do handshake (HTTP '+notice.status+').'),{status:502});
  const listed=await rpc(token,'tools/list',2,{},session,version);
  if(listed.data?.error)throw Object.assign(new Error('Falha ao listar ferramentas MCP: '+String(listed.data.error.message||'erro JSON-RPC').slice(0,160)),{status:502});
  const tools=Array.isArray(listed.data?.result?.tools)?listed.data.result.tools:[];
  if(row)await db.query("UPDATE marketplace_connections SET status='ACTIVE',last_error='',updated_at=now() WHERE account_id=$1 AND marketplace='N8N_MCP'",[account.id]);
  return res.json({ok:true,status:'CONNECTED',authentication:useStaticToken?'bearer_token':'oauth',endpoint:ENDPOINT,protocolVersion:version,server:{name:String(init.data.result.serverInfo?.name||'n8n MCP').slice(0,100),version:String(init.data.result.serverInfo?.version||'').slice(0,60)},toolCount:tools.length,tools:tools.slice(0,80).map(t=>({name:String(t.name||'').slice(0,100),description:String(t.description||'').slice(0,240)})),readOnlyCheck:true,message:'Autenticação, handshake MCP e tools/list concluídos. Nenhuma ferramenta remota foi executada.'});
 }catch(e){return res.status(e.status||502).json({ok:false,status:'ERROR',error:String(e.message||'Falha ao testar o servidor MCP.').slice(0,240)});}
}
export default async function(req,res){return withIntegrationHealth(req,res,db,'n8n_mcp',handler);}
