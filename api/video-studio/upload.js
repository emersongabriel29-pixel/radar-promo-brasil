import { db,storage } from 'hatchable';

export const access='member';
export const methods=['POST'];

const MAX_BYTES=10*1024*1024;
function validContainer(bytes,type) {
  if(type==='video/mp4')return bytes.length>12&&String.fromCharCode(...bytes.slice(4,8))==='ftyp';
  if(type==='video/webm')return bytes.length>4&&bytes[0]===0x1a&&bytes[1]===0x45&&bytes[2]===0xdf&&bytes[3]===0xa3;
  return false;
}
export default async function(req,res) {
  if(!req.member)return res.status(401).json({error:'Não autorizado.'});
  const file=(req.files||[]).find(x=>x.field==='file'),projectId=String(req.body?.projectId||'').trim().slice(0,80);
  if(!file)return res.status(400).json({error:'Selecione o vídeo renderizado.'});
  const mime=String(file.contentType||'').split(';')[0].toLowerCase();
  if(!['video/mp4','video/webm'].includes(mime))return res.status(415).json({error:'Use MP4 ou WebM.'});
  if(file.buffer.length>MAX_BYTES)return res.status(413).json({error:'O vídeo excede o limite seguro de 10 MB.'});
  if(!validContainer(file.buffer,mime))return res.status(400).json({error:'O arquivo não corresponde a um vídeo MP4/WebM válido.'});
  const account=(await db.query("SELECT id FROM accounts WHERE owner_member_id=$1 AND status='ACTIVE' LIMIT 1",[String(req.member.id)])).rows[0];
  if(!account)return res.status(412).json({error:'Conta não inicializada.'});
  const project=(await db.query("SELECT id FROM video_studio_projects WHERE id=$1 AND account_id=$2",[projectId,account.id])).rows[0];
  if(!project)return res.status(404).json({error:'Projeto não encontrado nesta conta.'});
  const ext=mime==='video/mp4'?'mp4':'webm',key='video-studio/'+account.id+'/'+projectId+'.'+ext;
  await storage.put(key,file.buffer,mime);
  const updated=await db.query(`UPDATE video_studio_projects SET storage_key=$1,content_type=$2,size_bytes=$3,status='READY',last_error='',updated_at=now()
    WHERE id=$4 AND account_id=$5 RETURNING id`,[key,mime,file.buffer.length,projectId,account.id]);
  if(!updated.rows.length)return res.status(404).json({error:'Projeto não encontrado.'});
  return res.json({ok:true,id:projectId,videoUrl:'/api/video-studio/file/'+projectId,contentType:file.contentType,sizeBytes:file.buffer.length});
}