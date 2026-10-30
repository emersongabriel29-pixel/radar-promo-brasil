import { db } from 'hatchable';
import { formatPromo } from 'lib/promo-message.js';
// Gemini is intentionally deferred to the controlled enrichment queue.

export const access = 'public';
export const methods = ['POST'];

const clean=(v,n=1200)=>String(v??'').trim().slice(0,n);
const https=value=>{try{const u=new URL(String(value));return u.protocol==='https:'&&!u.username&&!u.password?u.toString():''}catch{return ''}};
const money=value=>{
  if(typeof value==='number')return Number.isFinite(value)?Math.round(value*100):0;
  let s=String(value??'').trim().replace(/[^\d,.-]/g,'');
  if(s.includes(',')&&s.includes('.'))s=s.lastIndexOf(',')>s.lastIndexOf('.')?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');
  else if(s.includes(','))s=s.replace(',','.');
  const n=Number(s);return Number.isFinite(n)?Math.round(n*100):0;
};
const hash=async value=>{
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('');
};
const uid=()=>crypto.randomUUID();
const allowedSources=new Set(['AMAZON','SHOPEE','MERCADO_LIVRE','SHEIN','ALIEXPRESS','MAGALU','TEMU','CASAS_BAHIA','HOTMART','KABUM','AMERICANAS','Outro']);
export default async function handler(req,res){
  try{
    const auth=String(req.headers.authorization||'');
    const match=auth.match(/^Bearer\s+(rpb_ext_[A-Za-z0-9_-]{30,100})$/);
    if(!match)return res.status(401).json({error:'Token da extensão ausente ou inválido.'});
    const tokenHash=await hash(match[1]);
    const token=(await db.query("SELECT id,account_id FROM extension_api_tokens WHERE token_hash=$1 AND revoked_at IS NULL LIMIT 1",[tokenHash])).rows[0];
    if(!token)return res.status(401).json({error:'Token revogado ou não reconhecido. Gere outro no painel do Radar.'});
    const recent=Number((await db.query("SELECT count(*)::int AS n FROM offers WHERE account_id=$1 AND imported_by='CHROME_EXTENSION' AND created_at>now()-interval '1 minute'",[token.account_id])).rows[0]?.n||0);
    if(recent>=30)return res.status(429).json({error:'Limite de 30 ofertas por minuto atingido.'});
    const b=req.body||{},title=clean(b.title,220),affiliate=https(b.affiliateUrl),image=https(b.imageUrl),product=https(b.productUrl||b.affiliateUrl);
    const current=money(b.currentPrice),original=b.originalPrice?money(b.originalPrice):null;
    const sourceRaw=clean(b.source,50)||'Outro',source=allowedSources.has(sourceRaw)?sourceRaw:'Outro';
    if(!title||!affiliate||!image||!product||!current||current<=0||original!==null&&(!Number.isSafeInteger(original)||original<current))
      return res.status(400).json({error:'Informe título, preço atual válido, link de afiliado HTTPS, produto HTTPS e imagem HTTPS.'});
    const fingerprint=await hash([source,title.toLowerCase(),product].join('|'));
    const existing=(await db.query("SELECT id FROM offers WHERE account_id=$1 AND fingerprint=$2 LIMIT 1",[token.account_id,fingerprint])).rows[0];
    if(existing)return res.status(409).json({error:'Esta oferta já está cadastrada.',id:existing.id,duplicate:true});
    const discount=original>current?Math.round((original-current)*100/original):0;
    const score=Math.max(35,Math.min(98,45+discount+8));
    const formatted=formatPromo({title,source,currentPrice:current,originalPrice:original||0,affiliateUrl:affiliate,imageUrl:image,productUrl:product});
    // Intake must remain deterministic and quota-free; Gemini enriches later in a controlled batch.
    const message=formatted.message;
    const id=uid();
    const inserted=await db.query("INSERT INTO offers(id,account_id,title,source,original_price,current_price,affiliate_url,image_url,product_url,discount_percent,score,status,message,fingerprint,validation_status,imported_by,storefront_visible,source_category,subcategory,classification_tags,classification_confidence,classification_status,classification_reason) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'PENDING',$12,$13,'PENDING','CHROME_EXTENSION',false,$14,$15,$16::jsonb,$17,'REVIEW',$18) ON CONFLICT DO NOTHING RETURNING id,created_at AS \"createdAt\"",
      [id,token.account_id,title,source,original,current,affiliate,image,product,discount,score,message,fingerprint,clean(b.sourceCategory,200)||source,null,'[]',0,'Aguardando enriquecimento automático com IA; oferta permanece pendente.']);
    if(!inserted.rows.length)return res.status(409).json({error:'Esta oferta já foi cadastrada.',duplicate:true});
    await db.query("UPDATE extension_api_tokens SET last_used_at=now() WHERE id=$1",[token.id]);
    return res.status(201).json({ok:true,offer:inserted.rows[0],status:'PENDING',message:'Oferta recebida no Radar como rascunho. Revise preço, link e imagem antes de aprovar ou publicar.'});
  }catch(error){
    console.error('extension-offers error',error?.message);
    return res.status(500).json({error:'Falha interna ao receber a oferta.'});
  }
}