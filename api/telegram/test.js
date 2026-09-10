import { db } from 'hatchable';
import { configuredBotToken,telegramCall } from 'lib/telegram.js';
export const access='member';
export const methods=['POST'];
async function account(member){return (await db.query('SELECT id FROM accounts WHERE owner_member_id=$1',[String(member.id)])).rows[0]}
export default async function(req,res){
  try{
    const a=await account(req.member),groupId=String(req.body?.groupId||'');
    if(!a)return res.status(404).json({error:'Conta não encontrada.'});
    const group=(await db.query("SELECT external_id AS \"externalId\",name FROM promo_groups WHERE id=$1 AND account_id=$2 AND platform='TELEGRAM'",[groupId,a.id])).rows[0];
    if(!group?.externalId)return res.status(400).json({error:'Informe o ID do grupo ou canal do Telegram.'});
    const connection=(await db.query("SELECT id,secret_slot AS \"secretSlot\" FROM telegram_connections WHERE account_id=$1 AND status='ACTIVE' ORDER BY failure_count,priority LIMIT 1",[a.id])).rows[0];
    if(!connection)return res.status(412).json({error:'Conecte e ative um bot do Telegram primeiro.'});
    const token=await configuredBotToken(connection.secretSlot);
    await telegramCall(token,'sendMessage',{chat_id:group.externalId,text:'✅ Radar Promo Brasil conectado a este destino.'});
    await db.query('UPDATE telegram_connections SET last_seen_at=now(),failure_count=0 WHERE id=$1 AND account_id=$2',[connection.id,a.id]);
    return res.json({ok:true});
  }catch(e){return res.status(400).json({error:String(e?.message||'Falha no teste do Telegram').slice(0,300)})}
}
