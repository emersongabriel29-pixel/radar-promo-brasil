import { storage } from "hatchable";
export const access = "admin";
export const methods = ["POST"];
export default async function(req,res){
  if (!req.member) return res.status(401).json({error:"Não autorizado."});
  const f=req.files?.[0];
  if(!f)return res.status(400).json({error:"Selecione uma imagem."});
  if(!["image/jpeg","image/png","image/webp"].includes(f.contentType))return res.status(400).json({error:"Use JPG, PNG ou WebP."});
  if(f.buffer.length>8*1024*1024)return res.status(400).json({error:"A imagem deve ter até 8 MB."});
  const ext=f.contentType==="image/png"?"png":f.contentType==="image/webp"?"webp":"jpg";
  const url=await storage.put("products/"+crypto.randomUUID()+"."+ext,f.buffer,f.contentType);
  return res.json({url});
}
