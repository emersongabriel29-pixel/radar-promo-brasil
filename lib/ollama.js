import { config } from 'hatchable';

const clean=(value,max=500)=>String(value??'').trim().slice(0,max);
const timeoutSignal=()=>AbortSignal.timeout(25000);

async function settings(){
  const raw=String(await config.get('OLLAMA_BASE_URL')||'').trim();
  const model=clean(await config.get('OLLAMA_MODEL'),120);
  const token=String(await config.get('OLLAMA_API_KEY')||'').trim();
  if(!raw||!model||!token)throw Object.assign(new Error('Configure OLLAMA_BASE_URL, OLLAMA_MODEL e OLLAMA_API_KEY no ambiente seguro do Radar.'),{code:'OLLAMA_SETUP_REQUIRED'});
  let url;
  try{url=new URL(raw)}catch{throw Object.assign(new Error('OLLAMA_BASE_URL inválida.'),{code:'OLLAMA_CONFIG_INVALID'})}
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||!url.hostname.includes('.')||url.hostname==='localhost'||url.hostname.endsWith('.local')||/^\d{1,3}(\.\d{1,3}){3}$/.test(url.hostname))
    throw Object.assign(new Error('OLLAMA_BASE_URL deve ser HTTPS público, sem credenciais, query ou fragmento.'),{code:'OLLAMA_CONFIG_INVALID'});
  return {base:url.toString().replace(/\/$/,''),model,token};
}
function messageContent(content){
  if(typeof content==='string')return {content,images:[]};
  const parts=Array.isArray(content)?content:[content];
  const texts=[],images=[];
  for(const part of parts){
    if(typeof part==='string'){texts.push(part);continue;}
    if(!part||typeof part!=='object')continue;
    if(typeof part.text==='string')texts.push(part.text);
    const data=part.data||part.inlineData?.data;
    const mime=part.mime_type||part.mimeType||part.inlineData?.mimeType||'image/jpeg';
    if(data&&/^image\/(jpeg|png|webp|gif)$/.test(mime))images.push(String(data).replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/,'')); 
  }
  return {content:texts.join('\n'),images};
}
function normalizeMessages(options){
  let messages=[];
  if(Array.isArray(options.messages)){
    messages=options.messages.filter(Boolean).map(m=>{
      const role=['system','assistant','tool'].includes(m.role)?m.role:m.role==='model'?'assistant':'user';
      const part=messageContent(m.content);
      return {role,content:part.content,...(part.images.length?{images:part.images}:{}),...(m.name?{name:clean(m.name,80)}:{})};
    });
  }else if(Array.isArray(options.contents)){
    messages=options.contents.map(m=>{
      const parts=(m.parts||[]).map(p=>p?.inlineData?{type:'image',data:p.inlineData.data,mime_type:p.inlineData.mimeType}:p?.text||'');
      const part=messageContent(parts);
      return {role:m.role==='model'?'assistant':'user',content:part.content,...(part.images.length?{images:part.images}:{})};
    });
  }else messages=[{role:'user',content:String(options.prompt||'')}];
  if(options.system)messages.unshift({role:'system',content:clean(options.system,12000)});
  return messages;
}
function toolDefinitions(tools){
  return Object.entries(tools||{}).map(([name,tool])=>({type:'function',function:{name,description:clean(tool?.description,1000),parameters:tool?.inputSchema||{type:'object',properties:{}}}}));
}
async function request(base,token,path,body,signal){
  const response=await fetch(base+path,{method:body?'POST':'GET',headers:{Accept:'application/json',...(body?{'Content-Type':'application/json'}:{}),Authorization:'Bearer '+token},body:body?JSON.stringify(body):undefined,signal});
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
    const code=response.status===401||response.status===403?'OLLAMA_AUTH_INVALID':response.status===429?'OLLAMA_BUSY':'OLLAMA_HTTP_ERROR';
    const message=code==='OLLAMA_BUSY'?'Ollama temporariamente ocupado.':code==='OLLAMA_AUTH_INVALID'?'Autenticação do servidor Ollama recusada.':'Servidor Ollama indisponível (HTTP '+response.status+').';
    throw Object.assign(new Error(message),{code,status:response.status});
  }
  return data;
}
export async function generateOllamaText(options={}){
  const {base,model,token}=await settings();
  if(options.contents&& !Array.isArray(options.contents))throw new Error('Formato de conteúdo Ollama inválido.');
  const messages=normalizeMessages(options),tools=toolDefinitions(options.tools),toolMap=options.tools||{};
  const maxSteps=Math.max(1,Math.min(5,Number(options.maxSteps)||1));
  const signal=options.signal||timeoutSignal();
  const maxTokens=Math.max(32,Math.min(4096,Number(options.maxTokens)||1024));
  for(let step=0;step<=maxSteps;step++){
    const body={model,messages,stream:false,keep_alive:'5m',options:{num_predict:maxTokens},
      ...(tools.length?{tools}:{}),
      ...(options.responseMimeType==='application/json'?{format:'json'}:{})};
    if(Number.isFinite(Number(options.temperature)))body.options.temperature=Math.max(0,Math.min(2,Number(options.temperature)));
    const data=await request(base,token,'/api/chat',body,signal);
    const message=data.message||{},calls=Array.isArray(message.tool_calls)?message.tool_calls:[];
    if(calls.length&&Object.keys(toolMap).length){
      if(step>=maxSteps)throw Object.assign(new Error('Ollama atingiu o limite de etapas de ferramentas.'),{code:'OLLAMA_MAX_STEPS'});
      messages.push({role:'assistant',content:String(message.content||''),tool_calls:calls});
      for(const call of calls){
        const name=clean(call.function?.name,100),tool=toolMap[name];
        if(!tool?.execute){messages.push({role:'tool',name,content:JSON.stringify({error:'Ferramenta não permitida.'})});continue;}
        let result;
        try{result=await tool.execute(call.function?.arguments||{})}catch(error){result={error:clean(error?.message||'Falha ao executar consulta.',300)}}
        messages.push({role:'tool',name,content:JSON.stringify({result})});
      }
      if(step<maxSteps)continue;
    }
    const text=clean(message.content,50000);
    if(!text)throw Object.assign(new Error('Ollama não retornou texto utilizável.'),{code:'OLLAMA_EMPTY_RESPONSE'});
    return {text,model:clean(data.model||model,120),finishReason:data.done_reason==='length'?'length':'stop',steps:step,
      usage:{promptTokenCount:Number(data.prompt_eval_count)||0,candidatesTokenCount:Number(data.eval_count)||0,totalTokenCount:(Number(data.prompt_eval_count)||0)+(Number(data.eval_count)||0)}};
  }
  throw Object.assign(new Error('Ollama atingiu o limite de etapas de ferramentas.'),{code:'OLLAMA_MAX_STEPS'});
}
export async function getOllamaStatus(){
  let cfg;
  try{cfg=await settings()}catch(error){return {configured:false,reachable:false,code:error.code||'OLLAMA_SETUP_REQUIRED',message:clean(error.message,220),models:[],selectedModel:null,modelAvailable:false}}
  try{
    const [version,tags]=await Promise.all([request(cfg.base,cfg.token,'/api/version',null,timeoutSignal()),request(cfg.base,cfg.token,'/api/tags',null,timeoutSignal())]);
    const models=Array.isArray(tags.models)?tags.models.map(x=>clean(x.name,120)).filter(Boolean):[];
    return {configured:true,reachable:true,version:clean(version.version,80)||null,models,selectedModel:cfg.model,modelAvailable:models.includes(cfg.model)||models.includes(cfg.model+':latest')};
  }catch(error){return {configured:true,reachable:false,code:error.code||'OLLAMA_UNAVAILABLE',message:clean(error.message,220),models:[],selectedModel:cfg.model,modelAvailable:false}}
}