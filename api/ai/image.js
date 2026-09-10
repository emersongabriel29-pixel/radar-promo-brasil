import { ai,db,storage } from 'hatchable';

export const access='member';
export const methods=['POST'];
const clean=(v,n=1000)=>String(v??'').trim().slice(0,n);

export default async function(req,res){
  if(!req.member)return res.status(401).json({error:'Não autorizado.'});
  const b=req.body||{},title=clean(b.title,220),style=clean(b.style,180)||'publicidade moderna brasileira';
  const requestedAspect=clean(b.aspect,10)||'1:1',aspectMap={'1:1':'1:1','4:5':'3:4','3:4':'3:4','4:3':'4:3','9:16':'9:16','16:9':'16:9','21:9':'21:9'},aspect=aspectMap[requestedAspect]||'1:1';
  if(!title)return res.status(400).json({error:'Informe o produto ou tema da arte.'});
  const a=(await db.query('SELECT id FROM accounts WHERE owner_member_id=$1',[String(req.member.id)])).rows[0];
  if(!a)return res.status(412).json({error:'Abra o painel uma vez para criar sua conta.'});
  const prompt='Crie uma arte publicitária premium para redes sociais sobre: '+title+'. Estilo: '+style+'. Fundo limpo, composição profissional, alto contraste, espaço seguro para texto. Não inclua marcas registradas, logotipos, preço, porcentagem, cupom, selo, letras ou palavras. Não invente aparência exata de um produto específico.';
  try{
    const result=await ai.generateImage({prompt,aspect,signal:AbortSignal.timeout(60000)});
    const image=result.images?.[0];if(!image?.data)return res.status(502).json({error:'A IA não retornou a imagem.'});
    const mime=image.mimeType||'image/png',ext=mime.includes('jpeg')?'jpg':mime.includes('webp')?'webp':'png',key='ai/'+a.id+'/'+crypto.randomUUID()+'.'+ext;
    const url=await storage.put(key,image.data,mime);
    const saved=(await db.query("INSERT INTO content_assets(id,account_id,kind,channel,provider_model,asset_url,status) VALUES($1,$2,'IMAGE',$3,$4,$5,'DRAFT') RETURNING id",[crypto.randomUUID(),a.id,clean(b.channel,30)||'INSTAGRAM',clean(result.model,80)||'image-ai',url])).rows[0];
    return res.json({ok:true,id:saved.id,url,mimeType:mime,aspect,requestedAspect,model:clean(result.model,80)||'image-ai'});
  }catch(e){console.error('ai/image',e);const message=String(e?.message||''),setup=e?.code==='SetupRequired'||/no .*?(api )?key|setup gate|Builder \+ AI/i.test(message),limited=e?.code==='ai_spend_limit_reached'||/\b429\b|rate.?limit|credit.*used/i.test(message);return res.status(setup?412:limited?429:502).json({error:setup?'Configure uma chave de IA compatível com imagens em Configurações do projeto → IA, ou ative Builder + AI.':limited?'O gerador de imagens atingiu o limite temporário. Aguarde alguns minutos e tente novamente.':'Não foi possível gerar a arte agora.'})}
}
