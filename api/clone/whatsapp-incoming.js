import { config, db } from 'hatchable';
import { parseOfferMessage } from 'lib/offer-message-parser.js';
import { formatPromo } from 'lib/promo-message.js';
import { classifyProduct } from 'lib/category-classifier.js';

export const access='public';
export const methods=['POST'];

const clean=(v,n=500)=>String(v??'').trim().slice(0,n);
const uid=()=>crypto.randomUUID();
async function fingerprint(value){
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
function equalSecret(a,b){
  if(!a||!b||a.length!==b.length)return false;
  let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
}
function evolutionMessageText(message){
  const m=message||{};
  return String(m.conversation||m.extendedTextMessage?.text||m.imageMessage?.caption||m.videoMessage?.caption||m.documentMessage?.caption||m.documentWithCaptionMessage?.message?.documentMessage?.caption||'').slice(0,12000);
}

export default async function(req,res){
  try{
    const secret=String(await config.get('WHATSAPP_CLONE_WEBHOOK_SECRET')||'');
    if(secret.length<32)return res.status(503).json({ok:false,error:'Conector de clone WhatsApp não configurado: defina WHATSAPP_CLONE_WEBHOOK_SECRET com pelo menos 32 caracteres nos segredos do projeto.'});
    const supplied=String(req.headers['x-rpb-whatsapp-secret']||'');
    if(!equalSecret(secret,supplied))return res.status(401).json({ok:false,error:'Autenticação do conector inválida.'});

    const body=req.body||{};
    const event=String(body.event||body.type||'').toLowerCase().replace(/_/g,'.');
    const openWa=event==='message.received';
    if(event&&!openWa&&!['messages.upsert','messages.upsert.message','message'].includes(event))return res.json({ok:true,ignored:true,reason:'Evento não é uma nova mensagem.'});

    const data=body.data||body;
    const key=data.key||{};
    // Evolution API sends key.remoteJid + key.id + message object.
    // OpenWA sends data.chatId, data.id/idempotencyKey, data.body and data.isGroup.
    const groupJid=String(openWa?(data.chatId||(data.isGroup===true?data.from:'')):(key.remoteJid||data.remoteJid||''));
    if(!groupJid.endsWith('@g.us'))return res.json({ok:true,ignored:true,reason:'Mensagem não pertence a um grupo WhatsApp.'});
    if(key.fromMe===true||data.fromMe===true)return res.json({ok:true,ignored:true,reason:'Mensagem enviada pela própria conta.'});
    const text=(openWa?String(data.body||data.caption||'').slice(0,12000):evolutionMessageText(data.message||{})).trim();
    if(!text)return res.json({ok:true,ignored:true,reason:'Mensagem sem texto ou legenda.'});

    const monitors=(await db.query(
      "SELECT id,account_id AS \"accountId\",name FROM monitors WHERE source_type='WHATSAPP_GROUP' AND source_authorized=true AND status='ACTIVE' AND external_source_id=$1 ORDER BY created_at DESC LIMIT 2",
      [groupJid]
    )).rows;
    if(!monitors.length)return res.json({ok:true,ignored:true,reason:'Grupo não está vinculado a uma origem WhatsApp autorizada e ativa no Radar.'});
    if(monitors.length>1)return res.status(409).json({ok:false,error:'Grupo associado a mais de uma origem. Importação bloqueada para evitar mistura entre contas.'});

    const messageId=clean((openWa?(data.idempotencyKey||data.id||body.id):(key.id||data.id||body.id)),180);
    if(!messageId)return res.status(400).json({ok:false,error:'Mensagem sem identificador para deduplicação.'});
    const accountId=monitors[0].accountId;
    const eventKey=groupJid+':'+messageId;
    const claimed=await db.query(
      "INSERT INTO webhook_events(provider,event_key,action,account_id,status) VALUES('evolution_whatsapp',$1,'clone_incoming',$2,'PROCESSING') ON CONFLICT(provider,event_key) DO NOTHING RETURNING id",
      [eventKey,accountId]
    );
    if(!claimed.rows.length)return res.json({ok:true,duplicate:true,imported:0,autoPublished:0});

    try{
      const parsed=parseOfferMessage(text);
      if(!parsed.ok){
        await db.query("UPDATE webhook_events SET status='PROCESSED',item_count=0,response=$3::jsonb,processed_at=now(),updated_at=now() WHERE provider='evolution_whatsapp' AND event_key=$1 AND account_id=$2",[eventKey,accountId,JSON.stringify({ignored:true,reason:parsed.reason})]);
        return res.json({ok:true,imported:0,autoPublished:0,reviewRequired:true,reason:parsed.reason});
      }
      const fp=await fingerprint([accountId,parsed.marketplace,parsed.productUrl,parsed.title.toLowerCase(),parsed.currentPrice].join('|'));
      const existing=(await db.query('SELECT id FROM offers WHERE account_id=$1 AND fingerprint=$2 LIMIT 1',[accountId,fp])).rows[0];
      if(existing){
        await db.query("UPDATE webhook_events SET status='PROCESSED',item_count=0,response=$3::jsonb,processed_at=now(),updated_at=now() WHERE provider='evolution_whatsapp' AND event_key=$1 AND account_id=$2",[eventKey,accountId,JSON.stringify({duplicate:true})]);
        return res.json({ok:true,imported:0,duplicates:1,autoPublished:0});
      }
      const category=classifyProduct({title:parsed.title});
      const promo=formatPromo({title:parsed.title,source:parsed.marketplace,currentPrice:parsed.currentPrice,originalPrice:parsed.originalPrice||0,affiliateUrl:parsed.affiliateUrl||parsed.productUrl,couponUrl:parsed.couponUrl,couponCode:parsed.couponCode});
      const inserted=await db.query(
        "INSERT INTO offers(id,account_id,title,source,original_price,current_price,affiliate_url,product_url,coupon_url,coupon_code,discount_percent,score,status,message,fingerprint,validation_status,imported_by,storefront_visible,subcategory,classification_tags,classification_confidence,classification_status,classification_reason,source_category) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'PENDING',$13,$14,$15,'WHATSAPP_CLONE_INCOMING',false,$16,$17::jsonb,$18,'REVIEW',$19,$20) ON CONFLICT DO NOTHING RETURNING id",
        [uid(),accountId,parsed.title,parsed.marketplace,parsed.originalPrice||null,parsed.currentPrice,parsed.affiliateUrl||parsed.productUrl,parsed.productUrl,parsed.couponUrl||null,parsed.couponCode||null,parsed.discountPercent,Math.max(35,Math.min(98,45+parsed.discountPercent)),promo.message,fp,parsed.affiliateLinkDetected?'PENDING':'NEEDS_AFFILIATE_LINK',category.subcategory,JSON.stringify(category.tags||[]),category.confidence||0,parsed.affiliateLinkDetected?'awaiting_official_price_and_manual_review':'missing_verified_affiliate_link',parsed.marketplace]
      );
      if(inserted.rows.length){
        await db.query("UPDATE monitors SET captured_count=captured_count+1,last_run_at=now(),last_error='' WHERE id=$1 AND account_id=$2",[monitors[0].id,accountId]);
        await db.query("UPDATE webhook_events SET status='PROCESSED',item_count=1,response=$3::jsonb,processed_at=now(),updated_at=now() WHERE provider='evolution_whatsapp' AND event_key=$1 AND account_id=$2",[eventKey,accountId,JSON.stringify({imported:1,autoPublished:0})]);
        return res.json({ok:true,imported:1,autoPublished:0,reviewRequired:true,offerId:inserted.rows[0].id});
      }
      await db.query("UPDATE webhook_events SET status='PROCESSED',item_count=0,response=$3::jsonb,processed_at=now(),updated_at=now() WHERE provider='evolution_whatsapp' AND event_key=$1 AND account_id=$2",[eventKey,accountId,JSON.stringify({duplicates:1})]);
      return res.json({ok:true,imported:0,duplicates:1,autoPublished:0});
    }catch(error){
      await db.query("UPDATE webhook_events SET status='FAILED',error_message=$3,updated_at=now() WHERE provider='evolution_whatsapp' AND event_key=$1 AND account_id=$2",[eventKey,accountId,clean(error?.message,300)]);
      throw error;
    }
  }catch(error){
    return res.status(500).json({ok:false,error:'Falha ao processar mensagem recebida do conector WhatsApp.',detail:clean(error?.message,180)});
  }
}