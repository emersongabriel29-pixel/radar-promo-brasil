import { config,db,scheduler } from 'hatchable';
import { runwayCall,geminiVideoCall } from 'lib/direct-connectors.js';
import { clean,isRateLimit,isSetupRequired,mediaRatio,safePublicUrl } from 'lib/media.js';

export const access='member';
export const methods=['GET','POST'];
const uid=()=>crypto.randomUUID();

async function geminiImageInput(rawUrl){
  const source=safePublicUrl(rawUrl);if(!source)return null;
  let url=source;
  for(let redirects=0;redirects<=3;redirects++){
    const parsed=new URL(url),host=parsed.hostname.toLowerCase();
    if(parsed.protocol!=='https:'||(host!=='mlstatic.com'&&!host.endsWith('.mlstatic.com')))throw new Error('A imagem do produto precisa vir de um domínio de imagens permitido do Mercado Livre.');
    const response=await fetch(url,{redirect:'manual',headers:{Accept:'image/jpeg,image/png,image/webp'},signal:AbortSignal.timeout(10000)});
    if([301,302,303,307,308].includes(response.status)){const next=response.headers.get('location');if(!next||redirects===3)throw new Error('Redirecionamento de imagem inválido.');url=new URL(next,url).toString();continue;}
    if(!response.ok)throw new Error('Não foi possível obter a imagem do produto.');
    const mime=String(response.headers.get('content-type')||'').split(';')[0];if(!['image/jpeg','image/png','image/webp'].includes(mime))throw new Error('A imagem do produto tem formato não suportado.');
    if(Number(response.headers.get('content-length'))>5*1024*1024){await response.body?.cancel();throw new Error('A imagem do produto excede 5 MB.');}
    const bytes=new Uint8Array(await response.arrayBuffer());if(!bytes.length||bytes.length>5*1024*1024)throw new Error('Tamanho da imagem do produto inválido.');
    let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    return {type:'image',data:btoa(binary),mime_type:mime};
  }
  throw new Error('Não foi possível resolver a imagem do produto.');
}

async function account(member){return (await db.query('SELECT id FROM accounts WHERE owner_member_id=$1',[String(member.id)])).rows[0]}
function view(row){return {...row,url:row.outputUrl||((row.status==='COMPLETED'||row.status==='FALLBACK_COMPLETED')?'/api/ai/media/file/'+row.id:'')}}

export default async function(req,res){
  const owner=await account(req.member);if(!owner)return res.status(412).json({error:'Abra o painel uma vez para criar sua conta.'});
  if(req.method==='GET'){
    const id=clean(req.query.id,100),params=id?[id,owner.id]:[owner.id],where=id?'id=$1 AND account_id=$2':'account_id=$1';
    const rows=(await db.query('SELECT id,kind,title,ratio,duration_seconds AS "durationSeconds",provider,status,output_url AS "outputUrl",last_error AS "lastError",attempts,created_at AS "createdAt",updated_at AS "updatedAt" FROM media_generation_jobs WHERE '+where+' ORDER BY created_at DESC LIMIT 30',params)).rows.map(view);
    if(id&&!rows.length)return res.status(404).json({error:'Geração não encontrada.'});
    return res.json(id?rows[0]:{jobs:rows});
  }
  const b=req.body||{},kind=clean(b.kind,20).toUpperCase();
  if(kind!=='VIDEO')return res.status(400).json({error:'Tipo de mídia inválido.'});
  const title=clean(b.title,220),prompt=clean(b.prompt,1400),imageUrl=safePublicUrl(b.imageUrl),ratio=mediaRatio(b.ratio,'VIDEO'),duration=[5,10].includes(Number(b.duration))?Number(b.duration):5,provider=clean(b.provider,20).toUpperCase()==='GOOGLE'?'GOOGLE':'RUNWAY';
  if(!title||!prompt)return res.status(400).json({error:'Informe o título e a descrição visual do vídeo.'});
  if(provider==='GOOGLE'&&!imageUrl)return res.status(400).json({error:'A geração Google exige uma imagem HTTPS válida do produto.'});
  try{
    if(provider==='GOOGLE'&&!String(await config.get('GEMINI_API_KEY')||''))throw Object.assign(new Error('GEMINI_API_KEY não configurada.'),{code:'SETUP_REQUIRED'});
    let response;
    if(provider==='GOOGLE'){
      const input=[];if(imageUrl)input.push(await geminiImageInput(imageUrl));input.push({type:'text',text:prompt});
      response=await geminiVideoCall('POST','/interactions',{model:'gemini-omni-1.1-flash',input,response_format:{type:'video',delivery:'uri',aspect_ratio:ratio==='1280:720'?'16:9':'9:16'},background:true});
    }else{
      const body={model:'gen4.5',promptText:prompt,ratio,duration};if(imageUrl)body.promptImage=imageUrl;
      response=await runwayCall('POST','/v1/image_to_video',body);
    }
    if(response.status<200||response.status>=300||!response.body?.id){
      if(response.status===429)throw Object.assign(new Error('Limite temporário do provedor de vídeo.'),{status:429});
      throw new Error('O provedor de vídeo recusou a tarefa.');
    }
    const id=uid();
    await db.query("INSERT INTO media_generation_jobs(id,account_id,kind,title,prompt,style,ratio,duration_seconds,provider,external_task_id,status) VALUES($1,$2,'VIDEO',$3,$4,$5,$6,$7,$8,$9,'PROCESSING')",[id,owner.id,title,prompt,clean(b.style,180),ratio,duration,provider,String(response.body.id)]);
    await scheduler.at(new Date(Date.now()+30000).toISOString(),'/api/jobs/media',{payload:{jobId:id},name:'media-'+id});
    return res.status(202).json({ok:true,jobId:id,status:'PROCESSING',provider,message:provider==='GOOGLE'?'Solicitação enviada ao Google Gemini. A geração pode gerar cobrança conforme o plano da API.':'Renderização Runway iniciada. A geração pode consumir créditos.'});
  }catch(error){
    console.error('ai/media',error);
    if(isSetupRequired(error))return res.status(412).json({error:provider==='GOOGLE'?'Configure GEMINI_API_KEY em Configurações do projeto → APIs.':'Conecte a API do Runway em Configurações do projeto → APIs para renderizar vídeos reais.',connection:provider==='GOOGLE'?'GEMINI':'RUNWAY'});
    if(isRateLimit(error))return res.status(429).json({error:'O provedor de vídeo atingiu um limite ou cota. Confira o painel de uso antes de tentar novamente.'});
    return res.status(502).json({error:'Não foi possível iniciar a renderização do vídeo.'});
  }
}
