import { db } from 'hatchable';
import { meliGet } from 'lib/direct-connectors.js';
export const access='member'; export const methods=['GET'];
const num=(v)=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const cleanResult=x=>{const price=num(x.price)??num(x.buy_box_winner?.price),stock=num(x.available_quantity);const itemId=String(x.item_id||x.buy_box_winner?.item_id||x.buy_box_winner?.item?.id||(/^MLB-?\d+$/i.test(String(x.id||''))?x.id:''));return {id:String(x.id||''),itemId,title:String(x.title||x.name||''),price,availableQuantity:stock,imageUrl:String(x.thumbnail||x.pictures?.[0]?.secure_url||x.pictures?.[0]?.url||'').replace('http://','https://'),productUrl:String(x.permalink||x.buy_box_winner?.permalink||('https://www.mercadolivre.com.br/p/'+String(x.id||''))),condition:String(x.condition||''),canPrepareDraft:Boolean(price>0&&/^MLB-?\d+$/i.test(itemId)&&Number.isFinite(stock)&&stock>0),safeToAutoPublish:false};};
export default async function(req,res){
 const q=String(req.query.q||'').trim().slice(0,500);
 if(!q)return res.status(400).json({error:'Informe o produto que deseja buscar.'});
 const a=(await db.query('SELECT id FROM accounts WHERE owner_member_id=$1',[String(req.member.id)])).rows[0];
 if(!a)return res.status(412).json({error:'Conta não encontrada.'});
 try{
  // A busca por texto descobre produtos de catálogo. Se o usuário fornecer um anúncio
  // individual (ID MLB ou URL oficial), consultar diretamente o recurso /items/{id}.
  let directItemId='';
  if(/^MLB-?\d{6,}$/i.test(q)) directItemId=q.replace(/-/g,'').toUpperCase();
  else {
   try {
    const inputUrl=new URL(q);
    const allowedHost=['mercadolivre.com.br','www.mercadolivre.com.br','produto.mercadolivre.com.br','mercadolibre.com'];
    if(allowedHost.some(host=>inputUrl.hostname.toLowerCase()===host||inputUrl.hostname.toLowerCase().endsWith('.'+host))){
     const match=inputUrl.pathname.match(/(?:^|\/)(MLB)-?(\d{6,})(?:[-/]|$)/i);
     if(match) directItemId='MLB'+match[2];
    }
   } catch {}
  }
  if(directItemId){
   const direct=await meliGet(a.id,'/items/'+encodeURIComponent(directItemId));
   if(direct.status<200||direct.status>=300||!direct.body?.id){
    return res.status(direct.status===403?403:direct.status===404?404:502).json({
     code:direct.status===403?'MELI_ITEM_ACCESS_DENIED':direct.status===404?'MELI_ITEM_NOT_FOUND':'MELI_ITEM_LOOKUP_FAILED',
     error:direct.status===403?'O Mercado Livre não autorizou a consulta deste anúncio nesta conexão.':'Não foi possível localizar este anúncio individual.',
     retryable:![403,404].includes(direct.status), itemId:directItemId
    });
   }
   const item=direct.body,price=num(item.price),stock=num(item.available_quantity);
   const imageUrl=String(item.thumbnail||item.pictures?.[0]?.secure_url||item.pictures?.[0]?.url||'').replace(/^http:\/\//i,'https://');
   const result={
    id:String(item.id||directItemId),itemId:String(item.id||directItemId),title:String(item.title||''),
    price:price!==null&&price>0?price:null,availableQuantity:stock,
    imageUrl,productUrl:String(item.permalink||('https://www.mercadolivre.com.br/p/'+directItemId)),
    condition:String(item.condition||''),status:String(item.status||''),
    canPrepareDraft:Boolean(item.status==='active'&&price>0&&stock>0&&imageUrl&&item.permalink),
    safeToAutoPublish:false
   };
   return res.json({source:'direct_item',searchMode:'individual_listing_lookup',listingSearchAvailable:true,notice:'Anúncio consultado diretamente pela API oficial. O link de afiliado e a comissão ainda precisam ser gerados/confirmados no portal oficial.',affiliatePortalUrl:'https://www.mercadolivre.com.br/l/afiliados-gerar-link',results:[result]});
  }
  // A busca geral de anúncios (/sites/MLB/search) retorna 403 nesta conexão.
  // Usar o catálogo como caminho principal evita repetir uma chamada sabidamente bloqueada
  // em cada pesquisa. Catálogo é apenas descoberta; nunca equivale a anúncio comprável.
  const catalog=await meliGet(a.id,'/products/search',{site_id:'MLB',status:'active',q,limit:20});
  if(catalog.status<200||catalog.status>=300){
   const forbidden=catalog.status===403;
   console.error('meli/products catalog search',JSON.stringify({status:catalog.status,code:String(catalog.body?.error||catalog.body?.code||'').slice(0,80)}));
   // Se o catálogo estiver indisponível, tenta a busca de anúncios como fallback.
   const marketplace=await meliGet(a.id,'/sites/MLB/search',{q,limit:20});
   if(marketplace.status>=200&&marketplace.status<300)return res.json({source:'marketplace',searchMode:'listing_search',results:(marketplace.body?.results||[]).map(cleanResult)});
   console.error('meli/products marketplace search',JSON.stringify({status:marketplace.status,code:String(marketplace.body?.error||marketplace.body?.code||'').slice(0,80),message:String(marketplace.body?.message||'').slice(0,180)}));
   return res.status(forbidden&&marketplace.status===403?424:502).json({
    code:forbidden&&marketplace.status===403?'MELI_SEARCH_AND_CATALOG_DENIED':'MELI_CATALOG_UNAVAILABLE',
    error:forbidden&&marketplace.status===403?'O Mercado Livre recusou tanto a busca geral de anúncios quanto a busca de catálogo nesta conexão. Confira permissões/estado da aplicação no DevCenter; enquanto isso, cole um link de produto individual e o link de afiliado oficial.':'A busca do Mercado Livre está temporariamente indisponível.',
    retryable:!(forbidden&&marketplace.status===403),
    action:forbidden&&marketplace.status===403?'CHECK_APP_PERMISSIONS_AND_USE_OFFICIAL_AFFILIATE_LINK':'RETRY_LATER'
   });
  }
  const base=(catalog.body?.results||[]).slice(0,20);
  const results=base.map(product=>({...cleanResult(product),itemId:''}));
  // Enriquece no máximo 3 produtos por chamada e sequencialmente para evitar rate limit.
  for(let i=0;i<Math.min(3,base.length);i++){
   const product=base[i],productId=String(product.id||''),item=results[i];
   let best={...item};
   try{
    const detail=await meliGet(a.id,'/products/'+encodeURIComponent(productId));
    if(detail.status>=200&&detail.status<300){
     const d=detail.body||{},winner=d.buy_box_winner||{},price=winner.price??d.price??product.price;
     best={...best,title:String(d.name||item.title),price:price!=null&&Number.isFinite(Number(price))?Number(price):best.price,availableQuantity:Number.isFinite(Number(winner.available_quantity))?Number(winner.available_quantity):best.availableQuantity,productUrl:String(winner.permalink||winner.item_url||d.permalink||best.productUrl),imageUrl:String(winner.thumbnail||d.thumbnail||d.pictures?.[0]?.url||best.imageUrl||'').replace('http://','https://'),itemId:String(winner.item_id||winner.item?.id||'')};
    }
   }catch(e){console.error('meli/products detail lookup',JSON.stringify({id:productId.slice(0,40),status:Number(e?.status)||0,code:String(e?.code||'').slice(0,40)}))}
   try{
    const linked=await meliGet(a.id,'/products/'+encodeURIComponent(productId)+'/items',{site_id:'MLB'});
    if(linked.status>=200&&linked.status<300){
     const raw=Array.isArray(linked.body)?linked.body:(linked.body?.results||linked.body?.items||[]);
     const ids=raw.map(x=>typeof x==='string'?x:String(x.item_id||x.id||x.item?.id||'')).filter(x=>/^MLB-?\d+$/i.test(x)).slice(0,2);
     for(const itemId of ids){
      try{
       const listing=await meliGet(a.id,'/items/'+encodeURIComponent(itemId));
       if(listing.status<200||listing.status>=300)continue;
       const d=listing.body||{},price=d.price;
       if(price==null||!Number.isFinite(Number(price)))continue;
       best={...best,itemId:String(d.id||itemId),price:Number(price),availableQuantity:Number.isFinite(Number(d.available_quantity))?Number(d.available_quantity):best.availableQuantity,productUrl:String(d.permalink||best.productUrl),imageUrl:String(d.thumbnail||d.pictures?.[0]?.secure_url||d.pictures?.[0]?.url||best.imageUrl||'').replace('http://','https://'),condition:String(d.condition||best.condition),title:String(d.title||best.title)};
       break;
      }catch(e){console.error('meli/products linked item lookup',JSON.stringify({id:itemId,status:Number(e?.status)||0,code:String(e?.code||'').slice(0,40)}))}
     }
    }else{console.error('meli/products linked items',JSON.stringify({id:productId,status:linked.status,code:String(linked.body?.error||linked.body?.code||'').slice(0,60),message:String(linked.body?.message||'').slice(0,140)}))}
   }catch(e){console.error('meli/products linked items error',JSON.stringify({id:productId,status:Number(e?.status)||0,code:String(e?.code||'').slice(0,40)}))}
   results[i]={...best,canPrepareDraft:Boolean(Number(best.price)>0&&String(best.itemId||'').startsWith('MLB')&&Number.isFinite(Number(best.availableQuantity))&&Number(best.availableQuantity)>0&&best.imageUrl&&best.productUrl),safeToAutoPublish:false};
  }
  return res.json({
   source:'catalog',
   searchMode:'catalog_discovery',
   listingSearchAvailable:false,
   notice:'A busca geral de anúncios retornou 403 nesta conexão. Estes são resultados de catálogo para descoberta, não anúncios confirmados. Abra o produto, escolha um anúncio individual e gere o link pelo portal oficial de afiliados. Preço, estoque e comissão precisam ser conferidos antes de cadastrar.',
   affiliatePortalUrl:'https://www.mercadolivre.com.br/l/afiliados-gerar-link',
   results
  });
 }catch(e){
  if(e.code==='MELI_NOT_CONNECTED')return res.status(412).json({error:'Conecte o Mercado Livre pelo botão de conexão direta.',connectPath:'/api/mercadolivre/connect'});
  console.error('meli/products error',JSON.stringify({code:String(e?.code||'').slice(0,60),status:Number(e?.status)||0}));
  return res.status(502).json({error:'Falha ao consultar o Mercado Livre.'});
 }
}