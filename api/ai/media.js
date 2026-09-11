import { api,db,scheduler } from 'hatchable';
import { clean,isRateLimit,isSetupRequired,mediaRatio,safePublicUrl } from 'lib/media.js';

export const access='member';
export const methods=['GET','POST'];
const uid=()=>crypto.randomUUID();

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
  const title=clean(b.title,220),prompt=clean(b.prompt,1400),imageUrl=safePublicUrl(b.imageUrl),ratio=mediaRatio(b.ratio,'VIDEO'),duration=[5,10].includes(Number(b.duration))?Number(b.duration):5;
  if(!title||!prompt)return res.status(400).json({error:'Informe o título e a descrição visual do vídeo.'});
  try{
    const body={model:'gen4.5',promptText:prompt,ratio,duration};if(imageUrl)body.promptImage=imageUrl;
    const response=await api.runway.post('/v1/image_to_video',{body});
    if(response.status<200||response.status>=300||!response.body?.id){
      if(response.status===429)throw Object.assign(new Error('Limite temporário do provedor de vídeo.'),{status:429});
      throw new Error('O provedor de vídeo recusou a tarefa.');
    }
    const id=uid();
    await db.query("INSERT INTO media_generation_jobs(id,account_id,kind,title,prompt,style,ratio,duration_seconds,provider,external_task_id,status) VALUES($1,$2,'VIDEO',$3,$4,$5,$6,$7,'RUNWAY',$8,'PROCESSING')",[id,owner.id,title,prompt,clean(b.style,180),ratio,duration,String(response.body.id)]);
    await scheduler.at(new Date(Date.now()+30000).toISOString(),'/api/jobs/media',{payload:{jobId:id},name:'media-'+id});
    return res.status(202).json({ok:true,jobId:id,status:'PROCESSING',provider:'RUNWAY',message:'Renderização iniciada. O resultado aparecerá na biblioteca automaticamente.'});
  }catch(error){
    console.error('ai/media',error);
    if(isSetupRequired(error))return res.status(412).json({error:'Conecte a API do Runway em Configurações do projeto → APIs para renderizar vídeos reais.',connection:'RUNWAY'});
    if(isRateLimit(error))return res.status(429).json({error:'O provedor de vídeo está com limite temporário. A solicitação não foi cobrada; tente novamente em alguns minutos.'});
    return res.status(502).json({error:'Não foi possível iniciar a renderização do vídeo.'});
  }
}
