import { db, browser } from 'hatchable';

export const access = 'public';
export const methods = ['POST'];

const clean=(v,n=2000)=>String(v??'').trim().slice(0,n);
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const hostAllowed=host=>{
  const h=String(host||'').toLowerCase();
  return ['shopee.com.br','amazon.com.br','mercadolivre.com.br','aliexpress.com','shein.com','magazineluiza.com.br','magalu.com.br','kabum.com.br','americanas.com.br','casasbahia.com.br','temu.com'].some(d=>h===d||h.endsWith('.'+d));
};
const marketplace=host=>{
  const h=String(host||'').toLowerCase();
  if(h.includes('shopee'))return 'SHOPEE';
  if(h.includes('amazon'))return 'AMAZON';
  if(h.includes('mercadolivre'))return 'MERCADO_LIVRE';
  if(h.includes('aliexpress'))return 'ALIEXPRESS';
  if(h.includes('shein'))return 'SHEIN';
  if(h.includes('magazineluiza')||h.includes('magalu'))return 'MAGALU';
  if(h.includes('kabum'))return 'KABUM';
  if(h.includes('americanas'))return 'AMERICANAS';
  if(h.includes('casasbahia'))return 'CASAS_BAHIA';
  if(h.includes('temu'))return 'TEMU';
  return 'Outro';
};

export default async function handler(req,res){
  try{
    const auth=String(req.headers.authorization||'');
    const match=auth.match(/^Bearer\\s+(rpb_ext_[A-Za-z0-9_-]{30,100})$/);
    if(!match)return res.status(401).json({ok:false,error:'Informe o token Android do Radar uma única vez nesta sessão.'});
    const tokenHash=await hash(match[1]);
    const token=(await db.query("SELECT id,account_id,label FROM extension_api_tokens WHERE token_hash=$1 AND revoked_at IS NULL LIMIT 1",[tokenHash])).rows[0];
    if(!token)return res.status(401).json({ok:false,error:'Token revogado ou inválido. Gere outro nas Configurações do Radar.'});
    if(token.label!=='Compartilhamento Android')return res.status(403).json({ok:false,error:'Use o token específico de Compartilhamento Android, separado da extensão Chrome.'});
    const raw=clean(req.body?.url,2000);
    let parsed;
    try{parsed=new URL(raw);}catch{return res.status(400).json({ok:false,error:'Link do produto inválido.'});}
    if(parsed.protocol!=='https:'||parsed.username||parsed.password||!hostAllowed(parsed.hostname))
      return res.status(400).json({ok:false,error:'Por segurança, use o link direto de uma loja compatível. Links encurtados precisam ser abertos no marketplace antes.'});
    const data=await browser.session(async page=>{
      await page.goto(parsed.toString(),{waitUntil:'domcontentloaded',timeout:18000});
      const finalUrl=await page.url();
      let final;
      try{final=new URL(finalUrl);}catch{return {error:'URL_FINAL_INVALIDA'};}
      if(final.protocol!=='https:'||!hostAllowed(final.hostname))return {error:'REDIRECT_FORA_DO_MARKETPLACE'};
      const meta=await page.evaluate(()=>{
        const get=(s,a='content')=>document.querySelector(s)?.getAttribute(a)||'';
        const clean=v=>String(v||'').replace(/\\s+/g,' ').trim();
        const jsonProducts=[];
        const walk=v=>{
          if(!v||jsonProducts.length>20)return;
          if(Array.isArray(v)){v.forEach(walk);return;}
          if(typeof v!=='object')return;
          const type=Array.isArray(v['@type'])?v['@type']:[v['@type']];
          if(type.includes('Product'))jsonProducts.push(v);
          Object.values(v).forEach(x=>{if(x&&typeof x==='object')walk(x);});
        };
        document.querySelectorAll('script[type="application/ld+json"]').forEach(s=>{try{walk(JSON.parse(s.textContent||'{}'));}catch{}});
        const p=jsonProducts[0]||{},offers=Array.isArray(p.offers)?p.offers[0]:(p.offers||{});
        const image=Array.isArray(p.image)?p.image[0]:p.image;
        const title=clean(p.name||get('meta[property="og:title"]')||get('meta[name="twitter:title"]')||document.querySelector('h1')?.textContent||document.title);
        const img=typeof image==='string'?image:(image?.url||'');
        const price=offers.price||offers.lowPrice||get('meta[property="product:price:amount"]')||get('meta[itemprop="price"]');
        const original=get('meta[property="product:original_price:amount"]')||get('meta[itemprop="highPrice"]');
        return {title,image:img||get('meta[property="og:image"]')||get('meta[name="twitter:image"]'),price:String(price||''),originalPrice:String(original||''),currency:offers.priceCurrency||get('meta[property="product:price:currency"]')||'BRL'};
      });
      return {url:finalUrl,host:final.hostname,...meta};
    });
    if(data.error)return res.status(422).json({ok:false,error:'Não foi possível confirmar a página final da loja.'});
    const imageUrl=(()=>{try{const u=new URL(data.image);return u.protocol==='https:'?u.toString():'';}catch{return '';}})();
    const price=String(data.price||'').replace(/[^0-9.,]/g,'');
    const originalPrice=String(data.originalPrice||'').replace(/[^0-9.,]/g,'');
    await db.query("UPDATE extension_api_tokens SET last_used_at=now() WHERE id=$1",[token.id]);
    return res.json({ok:true,source:marketplace(data.host),productUrl:data.url,title:clean(data.title,220),imageUrl, currentPrice:price, originalPrice, detected:{title:!!data.title,image:!!imageUrl,price:!!price}});
  }catch(error){
    console.error('extension share preview failed',String(error?.message||error).slice(0,120));
    return res.status(422).json({ok:false,error:'A loja não liberou os dados automáticos nesta tentativa. Você pode preencher apenas os campos que faltarem.'});
  }
}