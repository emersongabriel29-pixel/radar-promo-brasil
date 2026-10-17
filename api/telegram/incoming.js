import { config, db } from 'hatchable';
import { parseOfferMessage } from 'lib/offer-message-parser.js';
import { formatPromo } from 'lib/promo-message.js';
import { classifyProduct } from 'lib/category-classifier.js';
const clean=(v,n=500)=>String(v??'').trim().slice(0,n);
const uid=()=>crypto.randomUUID();
async function fingerprint(value){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,'0')).join('');}
export const access='public';
export const methods=['POST'];
export default async function(req,res){
 try{
  const secret=String(await config.get('TELEGRAM_WEBHOOK_SECRET')||'');
  if(secret.length<32)return res.status(503).json({ok:false,error:'Webhook Telegram ainda não configurado: defina TELEGRAM_WEBHOOK_SECRET (mínimo 32 caracteres) nos segredos do projeto.'});
  const supplied=String(req.headers['x-telegram-bot-api-secret-token']||'');
  if(!supplied||supplied.length!==secret.length)return res.status(401).json({ok:false,error:'Assinatura de webhook inválida.'});
  const a=new TextEncoder().encode(secret),b=new TextEncoder().encode(supplied);let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];if(diff!==0)return res.status(401).json({ok:false,error:'Assinatura de webhook inválida.'});
  const update=req.body||{},message=update.channel_post||update.message;
  if(!message||!message.chat?.id)return res.json({ok:true,ignored:true,reason:'Atualização sem mensagem de canal/grupo.'});
  const groupId=String(message.chat.id),text=String(message.text||message.caption||'').slice(0,12000);
  if(!text.trim())return res.json({ok:true,ignored:true,reason:'Mensagem sem texto/caption.'});
  const groups=(await db.query("SELECT id,account_id AS \"accountId\",name FROM promo_groups WHERE platform='TELEGRAM' AND status='ACTIVE' AND external_id=$1",[groupId])).rows;
  if(!groups.length)return res.json({ok:true,ignored:true,reason:'O canal/grupo não está cadastrado como destino Telegram ativo no Radar.'});
  if(groups.length>1)return res.status(409).json({ok:false,ignored:true,reason:'O destino Telegram está associado a mais de uma conta; importação bloqueada para evitar cruzamento de dados entre contas.'});
  const parsed=parseOfferMessage(text);
  if(!parsed.ok)return res.json({ok:true,ignored:true,reason:parsed.reason,parsed:{title:parsed.title,currentPrice:parsed.currentPrice,marketplace:parsed.marketplace}});
  let imported=0,duplicates=0,needsAffiliate=0;
  for(const group of groups){
   const fp=await fingerprint([group.accountId,parsed.marketplace,parsed.productUrl,parsed.title.toLowerCase(),parsed.currentPrice].join('|'));
   const existing=(await db.query('SELECT id FROM offers WHERE account_id=$1 AND fingerprint=$2 LIMIT 1',[group.accountId,fp])).rows[0];
   if(existing){duplicates++;continue;}
   const category=classifyProduct({title:parsed.title});
   const automatic=formatPromo({title:parsed.title,source:parsed.marketplace,currentPrice:parsed.currentPrice,originalPrice:parsed.originalPrice||0,affiliateUrl:parsed.affiliateUrl||parsed.productUrl,couponUrl:parsed.couponUrl,couponCode:parsed.couponCode});
   const result=await db.query("INSERT INTO offers(id,account_id,title,source,original_price,current_price,affiliate_url,product_url,coupon_url,coupon_code,discount_percent,score,status,message,fingerprint,validation_status,imported_by,storefront_visible,subcategory,classification_tags,classification_confidence,classification_status,classification_reason,source_category) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'PENDING',$13,$14,$15,'TELEGRAM_INCOMING',false,$16,$17::jsonb,$18,'REVIEW',$19,$20) ON CONFLICT DO NOTHING RETURNING id",[uid(),group.accountId,parsed.title,parsed.marketplace,parsed.originalPrice||null,parsed.currentPrice,parsed.affiliateUrl||parsed.productUrl,parsed.productUrl,parsed.couponUrl||null,parsed.couponCode||null,parsed.discountPercent,Math.max(35,Math.min(98,45+parsed.discountPercent)),automatic.message,fp,parsed.affiliateLinkDetected?'PENDING':'NEEDS_AFFILIATE_LINK',category.subcategory,JSON.stringify(category.tags||[]),category.confidence||0,parsed.affiliateLinkDetected?'awaiting_official_price_and_manual_review':'missing_verified_affiliate_link',parsed.marketplace]);
   if(result.rows.length){imported++;if(!parsed.affiliateLinkDetected)needsAffiliate++;}else duplicates++;
  }
  return res.json({ok:true,imported,duplicates,needsAffiliateLink:needsAffiliate,autoPublished:0,reviewRequired:true});
 }catch(error){return res.status(500).json({ok:false,error:'Falha ao processar a mensagem recebida.',detail:clean(error?.message,240)});}
}