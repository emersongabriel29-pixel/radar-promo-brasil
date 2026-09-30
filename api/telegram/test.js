import { db } from 'hatchable';
import { configuredBotToken,telegramCall } from 'lib/telegram.js';
import {httpsUrl} from 'lib/validation.js';
export const access='member';
export const methods=['POST'];
async function account(member){return (await db.query('SELECT id FROM accounts WHERE owner_member_id=$1',[String(member.id)])).rows[0]}
function safeImageUrl(value){
  const fallback='https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1080&q=85';
  if(!value)return fallback;
  return httpsUrl(value,1500)||fallback;
}
export default async function(req,res){
  try{
    const a=await account(req.member),groupId=String(req.body?.groupId||''),mode=String(req.body?.mode||'CONNECTION').toUpperCase();
    if(!a)return res.status(404).json({error:'Conta não encontrada.'});
    const group=(await db.query("SELECT external_id AS \"externalId\",name FROM promo_groups WHERE id=$1 AND account_id=$2 AND platform='TELEGRAM'",[groupId,a.id])).rows[0];
    if(!group?.externalId)return res.status(400).json({error:'Informe o ID do grupo ou canal do Telegram.'});
    const connection=(await db.query("SELECT id,secret_slot AS \"secretSlot\" FROM telegram_connections WHERE account_id=$1 AND status='ACTIVE' ORDER BY failure_count,priority LIMIT 1",[a.id])).rows[0];
    if(!connection)return res.status(412).json({error:'Conecte e ative um bot do Telegram primeiro.'});
    const token=await configuredBotToken(connection.secretSlot,a.id);
    if(mode==='PROMOTION'){
      await telegramCall(token,'sendPhoto',{
        chat_id:group.externalId,
        photo:safeImageUrl(req.body?.imageUrl),
        parse_mode:'HTML',
        caption:'🧪 <b>PROMOÇÃO DE TESTE</b>\n\n🔥 Oferta demonstrativa do Radar Promo Brasil\n🛍️ Produto: Air fryer moderna\n💰 Preço: R$ 99,90\n🎟️ Cupom: TESTE10\n\n✅ Imagem, texto, preço, cupom e botão enviados corretamente.\n⚠️ Esta publicação é apenas um teste e não representa uma oferta real.',
        reply_markup:{inline_keyboard:[[{text:'Abrir Radar Promo Brasil',url:'https://radar-promo-brasil.hatchable.site'}]]}
      });
    }else{
      await telegramCall(token,'sendMessage',{chat_id:group.externalId,text:'✅ Radar Promo Brasil conectado a este destino.'});
    }
    await db.query('UPDATE telegram_connections SET last_seen_at=now(),failure_count=0 WHERE id=$1 AND account_id=$2',[connection.id,a.id]);
    return res.json({ok:true,mode,withImage:mode==='PROMOTION'});
  }catch(e){return res.status(400).json({error:String(e?.message||'Falha no teste do Telegram').slice(0,300)})}
}