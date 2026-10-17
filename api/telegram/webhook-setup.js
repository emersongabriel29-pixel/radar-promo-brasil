import { config, db } from 'hatchable';
import { configuredBotToken } from 'lib/telegram.js';
export const access='member';
export const methods=['POST'];
export default async function(req,res){
 try{
  const secret=String(await config.get('TELEGRAM_WEBHOOK_SECRET')||'');
  if(!/^[A-Za-z0-9_-]{32,256}$/.test(secret))return res.status(412).json({ok:false,error:'Configure TELEGRAM_WEBHOOK_SECRET com 32–256 caracteres, usando apenas letras, números, hífen ou sublinhado.'});
  const account=(await db.query("SELECT id FROM accounts WHERE owner_member_id=$1 AND status='ACTIVE' LIMIT 1",[String(req.member.id)])).rows[0];
  if(!account)return res.status(412).json({ok:false,error:'Conta ativa não encontrada.'});
  const connections=(await db.query("SELECT id,secret_slot AS \"secretSlot\" FROM telegram_connections WHERE account_id=$1 AND status='ACTIVE' ORDER BY failure_count,priority,last_seen_at DESC NULLS LAST",[account.id])).rows;
  if(!connections.length)return res.status(412).json({ok:false,error:'Conecte e ative ao menos um bot Telegram antes de configurar o webhook.'});
  const origin=String(await config.get('public_app_url')||'https://radar-promo-brasil.hatchable.site').replace(/\/$/,'');
  const results=[];
  for(const connection of connections){
   try{
    const token=await configuredBotToken(connection.secretSlot,account.id);
    const response=await fetch('https://api.telegram.org/bot'+token+'/setWebhook',{method:'POST',headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify({url:origin+'/api/telegram/incoming',secret_token:secret,allowed_updates:['message','channel_post'],drop_pending_updates:false}),signal:AbortSignal.timeout(12000)});
    let data={};try{data=await response.json();}catch{}
    if(!response.ok||data.ok!==true)throw new Error('Telegram recusou setWebhook (HTTP '+response.status+').');
    await db.query("UPDATE telegram_connections SET last_seen_at=now(),failure_count=0,status='ACTIVE',updated_at=now() WHERE id=$1 AND account_id=$2",[connection.id,account.id]);
    results.push({connectionId:connection.id,ok:true});
   }catch(error){results.push({connectionId:connection.id,ok:false,error:String(error?.message||'Falha ao configurar webhook').slice(0,220)});}
  }
  const configured=results.filter(x=>x.ok).length;
  return res.status(configured?200:502).json({ok:configured>0,configured,total:results.length,webhookUrl:origin+'/api/telegram/incoming',results,note:'Somente o recebimento foi configurado. As ofertas entram como pendentes e não são publicadas automaticamente.'});
 }catch{return res.status(500).json({ok:false,error:'Não foi possível configurar o webhook Telegram.'});}
}