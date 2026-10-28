import { db,scheduler,storage } from 'hatchable';
import { runwayCall,geminiVideoCall,geminiDownloadVideo } from 'lib/direct-connectors.js';
import { clean,isRateLimit,isSetupRequired,safePublicUrl,downloadMedia } from 'lib/media.js';

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
    const google=job.provider==='GOOGLE';
    const response=google?await geminiVideoCall('GET','/interactions/'+encodeURIComponent(job.external_task_id)):await runwayCall('GET','/v1/tasks/'+encodeURIComponent(job.external_task_id));
    if(response.status===429){await retry(job,180,(google?'Gemini':'Runway')+' 429');return res.status(202).json({ok:true,retry:true})}
    if(response.status<200||response.status>=300)throw new Error((google?'Gemini':'Runway')+' task HTTP '+response.status);
    const task=response.body||{},status=google?String(task.status||'').toLowerCase():String(task.status||'').toUpperCase();
    if(google?['in_progress','pending','running'].includes(status):['PENDING','THROTTLED','RUNNING'].includes(status)){
      await retry(job,status==='THROTTLED'?120:30,'');return res.status(202).json({ok:true,status});
    }
    if(status!==(google?'completed':'SUCCEEDED')){
      await db.query("UPDATE media_generation_jobs SET status='FAILED',last_error=$1,updated_at=now() WHERE id=$2",[clean(task.failure||task.failureCode||'Falha informada pelo provedor.',500),job.id]);
      return res.json({ok:false,status:'FAILED'});
    }
    let bytes,type;
    if(google){
      const video=(task.steps||[]).filter(step=>step.type==='model_output').flatMap(step=>step.content||[]).find(part=>part.type==='video');
      const encoded=video?.data||task.output_video?.data;
      if(encoded){const binary=atob(encoded);bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);type='video/mp4';}
      else if(video?.uri||task.output_video?.uri){bytes=await geminiDownloadVideo(video?.uri||task.output_video.uri);type='video/mp4';}
      else throw new Error('Gemini concluiu sem arquivo de vídeo disponível.');
    }else{
      const source=safePublicUrl(Array.isArray(task.output)?task.output[0]:task.output);
      if(!source)throw new Error('O provedor concluiu sem URL de saída.');
      const downloaded=await downloadMedia(source);bytes=downloaded.data;type=downloaded.type;
    }
    const ext=job.kind==='VIDEO'?'mp4':type.includes('jpeg')?'jpg':type.includes('webp')?'webp':'png',key='media/'+job.account_id+'/'+job.id+'.'+ext;
    await storage.put(key,bytes,type);const url='/api/ai/media/file/'+job.id;
    await db.query("UPDATE media_generation_jobs SET status='COMPLETED',storage_key=$1,output_url=$2,last_error='',updated_at=now() WHERE id=$3",[key,url,job.id]);
    await db.query('INSERT INTO content_assets(id,account_id,kind,channel,provider_model,asset_url,status) VALUES($1,$2,$3,$4,$5,$6,$7)',[uid(),job.account_id,job.kind,job.kind==='VIDEO'?'REELS':'INSTAGRAM',google?'gemini-omni-1.1-flash':'runway-gen4.5',url,'DRAFT']);
    return res.json({ok:true,status:'COMPLETED',url});
  }catch(error){
    console.error('jobs/media',error);
    const wait=isRateLimit(error)?180:isSetupRequired(error)?600:60,queued=await retry(job,wait,error?.message||'Falha temporária');
    return res.status(queued?202:502).json({ok:queued,retry:queued});
  }
}
