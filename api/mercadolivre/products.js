import { api } from "hatchable";

export const access = "admin";
export const methods = ["GET"];

export default async function(req,res){
  if (!req.member) return res.status(401).json({error:"Não autorizado."});
  const q=String(req.query.q||"").trim().slice(0,120);
  if(!q)return res.status(400).json({error:"Informe o produto que deseja buscar."});
  try{
    const response=await api.mercadolivre.get("/sites/MLB/search",{query:{q,limit:20}});
    if(response.status<200||response.status>=300)return res.status(response.status).json({error:"O Mercado Livre não concluiu a consulta.",details:response.body});
    const results=(response.body?.results||[]).map(item=>({
      id:item.id,title:item.title,price:item.price,availableQuantity:item.available_quantity,
      imageUrl:item.thumbnail?.replace("http://","https://")||"",productUrl:item.permalink||"",condition:item.condition||""
    }));
    return res.json({results});
  }catch(e){
    if(e?.code==="SetupRequired"||String(e?.message||"").includes("not connected")||String(e?.message||"").includes("412"))return res.status(412).json({error:"Conecte o Mercado Livre em Settings → APIs no Hatchable.",api:"mercadolivre"});
    return res.status(500).json({error:e?.message||"Falha ao consultar o Mercado Livre."});
  }
}
