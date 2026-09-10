import { db,email } from 'hatchable';

export const access='member';
export const methods=['POST'];
const clean=(v,n=500)=>String(v??'').trim().slice(0,n);

export default async function(req,res){
  if(!req.member)return res.status(401).json({error:'Não autorizado.'});
  const to=clean(req.body?.to,240);if(!/^\S+@\S+\.\S+$/.test(to)||req.body?.consent!==true)return res.status(400).json({error:'Informe um e-mail válido e confirme o consentimento.'});
  const a=(await db.query('SELECT id,name FROM accounts WHERE owner_member_id=$1',[String(req.member.id)])).rows[0];if(!a)return res.status(412).json({error:'Conta não configurada.'});
  try{
    const sent=await email.send({to,subject:'Teste de e-mail — Radar Promo Brasil',text:'Seu canal de e-mail está pronto para notificações transacionais. Nenhuma promoção foi enviada.',html:'<p>Seu canal de e-mail está pronto para <strong>notificações transacionais</strong>.</p><p>Nenhuma promoção foi enviada.</p>'});
    await db.query("INSERT INTO security_events(account_id,event_type,severity,details) VALUES($1,'EMAIL_TEST','INFO',$2)",[a.id,JSON.stringify({domain:to.split('@')[1]})]);
    return res.json({ok:true,messageId:sent.message_id||sent.ses_message_id||''});
  }catch(e){console.error('email/test',e);return res.status(502).json({error:'O e-mail não pôde ser enviado. Verifique limites e domínio no painel do projeto.'})}
}
