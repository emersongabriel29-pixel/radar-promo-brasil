import { db } from 'hatchable';

export const access='member';
export const methods=['GET'];

const item=(key,label,ready,detail,action='')=>({key,label,status:ready?'READY':'ACTION_REQUIRED',ready,detail,action});

export default async function(req,res){
  const account=(await db.query('SELECT id FROM accounts WHERE owner_member_id=$1',[String(req.member.id)])).rows[0];
  if(!account)return res.status(404).json({error:'Conta não encontrada.'});
  const a=account.id;
  const q=await Promise.all([
    db.query('SELECT count(*)::int AS n FROM categories WHERE account_id=$1',[a]),
    db.query('SELECT count(*)::int AS n FROM promo_groups WHERE account_id=$1 AND status=\'ACTIVE\'',[a]),
    db.query('SELECT count(*)::int AS n FROM marketplace_rules WHERE account_id=$1 AND status=\'ACTIVE\' AND affiliate_tag<>\'\'',[a]),
    db.query('SELECT count(*)::int AS n FROM telegram_connections WHERE account_id=$1 AND status=\'ACTIVE\'',[a]),
    db.query('SELECT count(*)::int AS n FROM whatsapp_connections WHERE account_id=$1 AND status=\'ACTIVE\'',[a]),
    db.query("SELECT count(*)::int AS n FROM autopilot_rules WHERE account_id=$1 AND status='ACTIVE'",[a]),
    db.query('SELECT published FROM storefront_settings WHERE account_id=$1',[a]),
    db.query('SELECT incident_email AS email FROM account_security_settings WHERE account_id=$1',[a]),
    db.query('SELECT name,status,details,last_checked_at AS "lastCheckedAt" FROM integration_health ORDER BY name')
  ]);
  const categories=q[0].rows[0].n,groups=q[1].rows[0].n,marketplaces=q[2].rows[0].n,telegram=q[3].rows[0].n,whatsapp=q[4].rows[0].n,rules=q[5].rows[0].n;
  const storefront=Boolean(q[6].rows[0]?.published),incident=Boolean(q[7].rows[0]?.email);
  const health=Object.fromEntries(q[8].rows.map(x=>[x.name,x]));
  const aiReady=['ACTIVE','TESTED','READY'].includes(health.ai?.status);
  const core=[
    item('database','Banco e isolamento por conta',true,'Estrutura multi-conta e migrações aplicadas.'),
    item('radar','Radar e histórico de preços',true,'Score, oportunidades e histórico disponíveis.'),
    item('categories','Categorias',categories>0,categories+' categoria(s) cadastrada(s).','Cadastre ao menos uma categoria.'),
    item('groups','Grupos de destino',groups>0,groups+' grupo(s) ativo(s).','Ative ao menos um grupo.'),
    item('autopilot','Autopilot',rules>0,rules+' regra(s) ativa(s).','Crie uma regra no Radar.'),
    item('security','Contato de incidentes',incident,incident?'Contato configurado.':'Contato ainda não informado.','Informe um e-mail em Segurança.')
  ];
  const external=[
    item('ai','IA para conteúdo',aiReady,aiReady?'Provedor testado.':'Faça um teste no Estúdio de IA.','Abra o Estúdio e gere um conteúdo.'),
    item('marketplaces','Afiliados e marketplaces',marketplaces>0,marketplaces+' marketplace(s) validado(s).','Cadastre sua identificação oficial de afiliado.'),
    item('telegram','Telegram',telegram>0,telegram+' bot(s) ativo(s).','Configure o token e conecte um bot.'),
    item('whatsapp','WhatsApp/n8n',whatsapp>0,whatsapp+' conexão(ões) ativa(s).','Configure o webhook n8n e ative a conexão.'),
    item('storefront','Vitrine pública',storefront,storefront?'Vitrine publicada.':'Vitrine ainda não publicada.','Publique a vitrine em Conta.')
  ];
  const coreReady=core.filter(x=>x.ready).length,externalReady=external.filter(x=>x.ready).length;
  return res.json({
    status:coreReady===core.length&&externalReady===external.length?'OPERATIONAL':'SETUP_REQUIRED',
    internalPercent:Math.round(coreReady*100/core.length),
    operationalPercent:Math.round((coreReady+externalReady)*100/(core.length+external.length)),
    core,external,checkedAt:new Date().toISOString()
  });
}