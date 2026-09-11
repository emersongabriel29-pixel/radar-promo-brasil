import { api,db,scheduler,storage } from 'hatchable';
import { clean,isRateLimit,isSetupRequired,safePublicUrl } from 'lib/media.js';

export const access='scheduler';
export const methods=['POST'];
const uid=()=>crypto.randomUUID();

async function retry(job,seconds,error){
  const attempts=Number(job.attempts||0)+1;
  if(attempts>=30){
    await db.query("UPDATE media_generation_jobs SET status='FAILED',attempts=$1,last_error=$2,updated_at=now() WHERE id=$3",[attempts,clean(error,500),job.id]);
    return false;
  }
  await db.query("UPDATE media_generation_jobs SET attempts=$1,last_error=$2,updated_at=now() WHERE id=$3",[attempts,clean(error,500),job.id]);
  await scheduler.at(new Date(Date.now()+seconds*1000).toISOString(),'/api/jobs/media',{payload:{jobId:job.id},name:'media-'+job.id});
  return true;
}

export default async function(req,res){
  const id=clean(req.body?.jobId,100),job=(await db.query("SELECT * FROM media_generation_jobs WHERE id=$1 AND status='PROCESSING'",[id])).rows[0];
  if(!job)return res.json({ok:true,skipped:true});
  try{
    const response=await api.runway.get('/v1/tasks/'+encodeURIComponent(job.external_task_id));
    if(response.status===429){await retry(job,180,'Runway 429');return res.status(202).json({ok:true,retry:true})}
    if(response.status<200||response.status>=300)throw new Error('Runway task HTTP '+response.status);
    const task=response.body||{},status=String(task.status||'').toUpperCase();
    if(['PENDING','THROTTLED','RUNNING'].includes(status)){
      await retry(job,status==='THROTTLED'?120:30,'');return res.status(202).json({ok:true,status});
    }
    if(status!=='SUCCEEDED'){
      await db.query("UPDATE media_generation_jobs SET status='FAILED',last_error=$1,updated_at=now() WHERE id=$2",[clean(task.failure||task.failureCode||'Falha informada pelo provedor.',500),job.id]);
      return res.json({ok:false,status:'FAILED'});
    }
    const source=safePublicUrl(Array.isArray(task.output)?task.output[0]:task.output);
    if(!source)throw new Error('O provedor concluiu sem URL de saída.');
    const downloaded=await fetch(source,{signal:AbortSignal.timeout(60000)});if(!downloaded.ok)throw new Error('Falha ao armazenar a mídia concluída.');
    const type=downloaded.headers.get('content-type')||(job.kind==='VIDEO'?'video/mp4':'image/png'),ext=job.kind==='VIDEO'?'mp4':type.includes('jpeg')?'jpg':type.includes('webp')?'webp':'png',key='media/'+job.account_id+'/'+job.id+'.'+ext;
    await storage.put(key,new Uint8Array(await downloaded.arrayBuffer()),type);const url='/api/ai/media/file/'+job.id;
    await db.query("UPDATE media_generation_jobs SET status='COMPLETED',storage_key=$1,output_url=$2,last_error='',updated_at=now() WHERE id=$3",[key,url,job.id]);
    await db.query('INSERT INTO content_assets(id,account_id,kind,channel,provider_model,asset_url,status) VALUES($1,$2,$3,$4,$5,$6,$7)',[uid(),job.account_id,job.kind,job.kind==='VIDEO'?'REELS':'INSTAGRAM','runway-gen4.5',url,'DRAFT']);
    return res.json({ok:true,status:'COMPLETED',url});
  }catch(error){
    console.error('jobs/media',error);
    const wait=isRateLimit(error)?180:isSetupRequired(error)?600:60,queued=await retry(job,wait,error?.message||'Falha temporária');
    return res.status(queued?202:502).json({ok:queued,retry:queued});
  }
}
