import { config,db,storage } from 'hatchable';
import { open,seal } from 'lib/direct-connectors.js';
export const access='member';
export const methods=['GET','POST'];
const clean=(v,n=5000)=>String(v??'').trim().slice(0,n);
async function account(member){return (await db.query("SELECT id FROM accounts WHERE owner_member_id=$1 AND status='ACTIVE' LIMIT 1",[String(member.id)])).rows[0]}
export default async function(req,res){
  if(!req.member)return res.status(401).json({error:'Entre para acessar a publicação do YouTube.'});
  const owner=await account(req.member);if(!owner)return res.status(412).json({error:'Conta do Radar não inicializada.'});
  const connection=(await db.query("SELECT * FROM youtube_connections WHERE account_id=$1 AND status='ACTIVE' LIMIT 1",[owner.id])).rows[0];
  if(req.method==='GET')return res.json({connected:Boolean(connection),channelTitle:connection?.channel_title||'',channelId:connection?.channel_id||'',lastError:connection?.last_error||''});
  if(!connection)return res.status(412).json({error:'Conecte seu canal do YouTube antes de publicar.'});
  const b=req.body||{},projectId=clean(b.projectId,100),title=clean(b.title,100),description=clean(b.description,5000);
  const privacy=['private','unlisted','public'].includes(clean(b.privacyStatus,20))?clean(b.privacyStatus,20):'private';
  if(!projectId||!title)return res.status(400).json({error:'Informe o projeto finalizado e o título do vídeo.'});
  const project=(await db.query("SELECT id,storage_key,content_type,size_bytes,status,youtube_video_id FROM video_studio_projects WHERE id=$1 AND account_id=$2 LIMIT 1",[projectId,owner.id])).rows[0];
  if(!project||project.status!=='READY'||!project.storage_key)return res.status(409).json({error:'O projeto precisa ter um vídeo renderizado e salvo antes da publicação.'});
  if(project.youtube_video_id)return res.status(409).json({error:'Este projeto já foi enviado ao YouTube: https://youtu.be/'+project.youtube_video_id});
  if(Number(project.size_bytes)>10*1024*1024)return res.status(413).json({error:'O arquivo excede o limite atual de 10 MB do Estúdio.'});
  let accessToken=await open(connection.access_token_enc);
  if(new Date(connection.expires_at).getTime()<Date.now()+60000){
    const refreshToken=await open(connection.refresh_token_enc);
    const refresh=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:String(await config.get('YOUTUBE_CLIENT_ID')||''),client_secret:String(await config.get('YOUTUBE_CLIENT_SECRET')||''),refresh_token:refreshToken,grant_type:'refresh_token'}).toString(),signal:AbortSignal.timeout(20000)});
    const refreshed=await refresh.json().catch(()=>({}));
    if(!refresh.ok||!refreshed.access_token)return res.status(412).json({error:'A autorização do YouTube expirou ou foi revogada. Conecte o canal novamente.'});
    accessToken=refreshed.access_token;
    await db.query("UPDATE youtube_connections SET access_token_enc=$1,expires_at=$2,updated_at=now() WHERE account_id=$3",[await seal(accessToken),new Date(Date.now()+Math.max(60,Number(refreshed.expires_in)||3600)*1000).toISOString(),owner.id]);
  }
  try{
    const file=await storage.get(project.storage_key),mime=String(project.content_type||file.contentType||'video/mp4');
    if(!['video/mp4','video/webm'].includes(mime))return res.status(415).json({error:'O formato do arquivo não é aceito para publicação.'});
    const metadata={snippet:{title,description,tags:['RadarPromoBrasil','ofertas','achadinhos','shorts'],categoryId:'22'},status:{privacyStatus:privacy,selfDeclaredMadeForKids:false}};
    const boundary='radar_'+crypto.randomUUID().replace(/-/g,'');
    const multipart=new Blob(['--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n',JSON.stringify(metadata),'\r\n--'+boundary+'\r\nContent-Type: '+mime+'\r\nContent-Transfer-Encoding: binary\r\n\r\n',file.buffer,'\r\n--'+boundary+'--'],{type:'multipart/related; boundary='+boundary});
    const uploaded=await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status',{method:'POST',headers:{Authorization:'Bearer '+accessToken,'Content-Type':'multipart/related; boundary='+boundary},body:multipart,signal:AbortSignal.timeout(55000)});
    const data=await uploaded.json().catch(()=>({}));
    if(!uploaded.ok||!data.id){
      const msg=clean(data.error?.message,300)||'O YouTube recusou o envio (HTTP '+uploaded.status+').';
      await db.query("UPDATE youtube_connections SET last_error=$1,updated_at=now() WHERE account_id=$2",[msg,owner.id]);
      return res.status(uploaded.status===401||uploaded.status===403?412:502).json({error:msg});
    }
    const url='https://youtu.be/'+data.id;
    await db.query("UPDATE video_studio_projects SET youtube_video_id=$1,youtube_video_url=$2,youtube_published_at=now(),updated_at=now() WHERE id=$3 AND account_id=$4",[data.id,url,projectId,owner.id]);
    await db.query("UPDATE youtube_connections SET last_error='',updated_at=now() WHERE account_id=$1",[owner.id]);
    return res.json({ok:true,videoId:data.id,url,privacyStatus:privacy,message:'Vídeo enviado ao YouTube. A plataforma ainda pode processar a qualidade HD antes de exibi-la.'});
  }catch(error){
    console.error('video-studio/youtube-publish',String(error?.message||'UPLOAD_ERROR').slice(0,180));
    return res.status(502).json({error:'Não foi possível enviar o vídeo ao YouTube. Confira a conexão e tente novamente.'});
  }
}