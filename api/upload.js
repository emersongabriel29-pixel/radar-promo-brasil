import { storage } from "hatchable";
export const access = "member";
export const methods = ["POST"];
function matches(buf,type){
  if(type==="image/jpeg")return buf[0]===0xff&&buf[1]===0xd8&&buf[2]===0xff;
  if(type==="image/png")return buf[0]===0x89&&buf[1]===0x50&&buf[2]===0x4e&&buf[3]===0x47&&buf[4]===0x0d&&buf[5]===0x0a&&buf[6]===0x1a&&buf[7]===0x0a;
  if(type==="image/webp")return String.fromCharCode(...buf.slice(0,4))==="RIFF"&&String.fromCharCode(...buf.slice(8,12))==="WEBP";
  return false;
}
export default async function(req,res){
  if (!req.member) return res.status(401).json({error:"Não autorizado."});
  const f=req.files?.[0];
  if(!f)return res.status(400).json({error:"Selecione uma imagem."});
  if(!["image/jpeg","image/png","image/webp"].includes(f.contentType))return res.status(400).json({error:"Use JPG, PNG ou WebP."});
  if(f.buffer.length>8*1024*1024)return res.status(400).json({error:"A imagem deve ter até 8 MB."});
  if(!matches(f.buffer,f.contentType))return res.status(400).json({error:"O conteúdo do arquivo não corresponde a uma imagem válida."});
  const ext=f.contentType==="image/png"?"png":f.contentType==="image/webp"?"webp":"jpg";
  const url=await storage.put("products/"+String(req.member.id)+"/"+crypto.randomUUID()+"."+ext,f.buffer,f.contentType);
  return res.json({url});
}
