import { config, db } from 'hatchable';

export const access='member';
export const methods=['GET'];

const item=(key,label,ready,detail,action='')=>({key,label,status:ready?'READY':'ACTION_REQUIRED',ready,detail,action:ready?'':action});

export default async function(req,res){
  const account=(await db.query('SELECT id FROM accounts WHERE owner_member_id=$1',[String(req.member.id)])).rows[0];
  if(!account)return res.status(404).json({error:'Conta não encontrada.'});
  const a=account.id;
  const q=await Promise.all([
    db.query('SELECT count(*)::int AS n FROM categories WHERE account_id=$1',[a]),
    db.query("SELECT count(*)::int AS n FROM offers WHERE account_id=$1 AND status='APPROVED'",[a]),
    db.query("SELECT count(*)::int AS n FROM promo_groups WHERE account_id=$1 AND status='ACTIVE' AND NULLIF(trim(external_id),'') IS NOT NULL",[a]),
    db.query("SELECT count(*)::int AS n FROM queues WHERE account_id=$1 AND status='ACTIVE'",[a]),
    db.query("SELECT count(*)::int AS n FROM marketplace_rules WHERE account_id=$1 AND status='ACTIVE' AND NULLIF(trim(affiliate_tag),'') IS NOT NULL",[a]),
    db.query("SELECT count(*)::int AS n FROM telegram_connections WHERE account_id=$1 AND status='ACTIVE'",[a]),
    db.query("SELECT count(*)::int AS n FROM whatsapp_connections WHERE account_id=$1 AND status='ACTIVE' AND phone_number<>'' AND group_messaging_supported AND last_verified_at>now()-interval '24 hours' AND EXISTS(SELECT 1 FROM promo_groups g WHERE g.account_id=$1 AND g.status='ACTIVE' AND g.platform='WHATSAPP' AND verified_groups @> jsonb_build_array(g.external_id))",[a]),
    db.query("SELECT count(*)::int AS n FROM autopilot_rules WHERE account_id=$1 AND status='ACTIVE'",[a]),
    db.query('SELECT published FROM storefront_settings WHERE account_id=$1',[a]),
    db.query('SELECT incident_email AS email FROM account_security_settings WHERE account_id=$1',[a]),
    db.query('SELECT name,status,details,last_checked_at AS "lastCheckedAt" FROM account_integration_health WHERE account_id=$1 ORDER BY name',[a]),
    db.query("SELECT count(*)::int AS n FROM publications WHERE account_id=$1 AND status='PUBLISHED' AND NULLIF(external_message_id,'') IS NOT NULL AND published_at>now()-interval '30 days'",[a]),
    db.query("SELECT status,last_checked_at AS \"lastCheckedAt\" FROM marketplace_api_credentials WHERE account_id=$1 AND marketplace='AMAZON' LIMIT 1",[a])
  ]);
  const categories=q[0].rows[0].n,offers=q[1].rows[0].n,groups=q[2].rows[0].n,queues=q[3].rows[0].n;
  const marketplaces=q[4].rows[0].n,telegram=q[5].rows[0].n,whatsapp=q[6].rows[0].n,rules=q[7].rows[0].n;
  let telegramWebhookSecret='';
  try { telegramWebhookSecret=String(await config.get('TELEGRAM_WEBHOOK_SECRET')||''); } catch {}
  let runwayConfigured=false,geminiVideoConfigured=false;
  try { runwayConfigured=Boolean(await config.get('RUNWAY_API_KEY')); } catch {}
  try { geminiVideoConfigured=Boolean(await config.get('GEMINI_API_KEY')); } catch {}
  const telegramIngestionReady=telegram>0&&/^[A-Za-z0-9_-]{32,256}$/.test(telegramWebhookSecret);
  const amazonCredential=q[12].rows[0]||null;
  const amazonCreatorsReady=amazonCredential?.status==='VALIDATED';
  const storefront=Boolean(q[8].rows[0]?.published),incident=Boolean(q[9].rows[0]?.email);
  const health=Object.fromEntries(q[10].rows.map(x=>[x.name,x]));
  const aiReady=['TESTED','READY'].includes(health.ai?.status)&&Boolean(health.ai?.lastCheckedAt)&&Date.parse(health.ai.lastCheckedAt)>Date.now()-30*86400000;
  const deliveryProof=q[11].rows[0].n>0;
  const deliveryReady=telegram>0||whatsapp>0;
  const verifiedPriceCount=(await db.query("SELECT count(DISTINCT ph.offer_id)::int AS n FROM offer_price_history ph JOIN offers o ON o.id=ph.offer_id AND o.account_id=ph.account_id WHERE ph.account_id=$1 AND ph.source_type='OFFICIAL_API' AND ph.verified_at IS NOT NULL AND ph.verified_at>now()-interval '24 hours' AND ph.original_price IS NOT NULL AND ph.price=o.current_price AND ph.original_price=o.original_price AND ph.verified_at=(SELECT MAX(ph2.verified_at) FROM offer_price_history ph2 WHERE ph2.account_id=ph.account_id AND ph2.offer_id=ph.offer_id AND ph2.source_type='OFFICIAL_API')",[a])).rows[0].n;
  const autopilotReady=rules>0&&offers>0&&groups>0&&marketplaces>0&&deliveryReady&&verifiedPriceCount>0;
  const core=[
    item('database','Banco de dados',true,'Consultas desta conta concluídas nesta verificação.'),
    item('categories','Categorias',categories>0,categories+' categoria(s) cadastrada(s).','Cadastre ao menos uma categoria.'),
    item('offers','Ofertas aprovadas',offers>0,offers+' oferta(s) aprovada(s).','Aprove ao menos uma oferta real.'),
    item('groups','Destinos utilizáveis',groups>0,groups+' grupo(s) com ID oficial ativo.','Informe o ID oficial de um grupo ou canal.'),
    item('queues','Filas ativas',queues>0,queues+' fila(s) ativa(s).','Crie uma fila com horário e intervalo.'),
    item('autopilot','Piloto automático configurado',autopilotReady,autopilotReady?'Pré-requisitos cadastrados e '+verifiedPriceCount+' oferta(s) com preço oficial verificado nas últimas 24 horas.':'Faltam oferta, regra, marketplace, destino, conector ou preço oficial verificado nas últimas 24 horas ('+verifiedPriceCount+' oferta(s) confirmada(s)).','Conclua oferta, marketplace, destino e canal de entrega e confirme os preços por fonte oficial.'),
    item('deliveryProof','Entrega confirmada',deliveryProof,deliveryProof?'Entrega oficial registrada nos últimos 30 dias.':'Nenhuma confirmação oficial recente nesta conta.','Valide uma publicação autorizada no destino e registre seu identificador oficial.'),
    item('security','Contato de incidentes',incident,incident?'Contato configurado.':'Contato ainda não informado.','Informe um e-mail em Segurança.')
  ];
  const external=[
    item('ai','IA para conteúdo',aiReady,aiReady?'Provedor testado.':'Faça um teste no Estúdio de IA.','Abra o Estúdio e gere um conteúdo.'),
    item('runway','Geração de vídeo Runway',runwayConfigured,runwayConfigured?'Chave Runway configurada.':'Chave RUNWAY_API_KEY ausente.','Cadastre a chave da API Runway em Configurações do projeto → APIs.'),
    item('geminiVideo','Geração de vídeo Google Gemini',geminiVideoConfigured,geminiVideoConfigured?'Chave Gemini configurada.':'Chave GEMINI_API_KEY ausente.','Cadastre uma chave da Gemini API em Configurações do projeto → APIs. A geração de vídeo pode gerar cobrança.'),
    item('marketplaces','Regras de afiliado',marketplaces>0,marketplaces+' regra(s) de afiliado ativa(s); a conexão oficial com o marketplace é verificada separadamente.','Cadastre uma regra ativa de marketplace com tag de afiliado.'),
    item('telegram','Telegram (envio)',telegram>0,telegram+' bot(s) ativo(s) para os fluxos de envio.','Configure o token e conecte um bot.'),
    item('telegramIngestion','Importação recebida do Telegram',telegramIngestionReady,telegramIngestionReady?'Bot ativo e segredo do webhook configurado.':(telegram>0?'Bot ativo, mas o segredo TELEGRAM_WEBHOOK_SECRET está ausente ou inválido; o endpoint de entrada permanece bloqueado.':'Conecte um bot e configure TELEGRAM_WEBHOOK_SECRET.'),'Defina TELEGRAM_WEBHOOK_SECRET nos segredos do projeto com 32–256 caracteres (letras, números, hífen ou sublinhado) e configure o webhook.'),
    item('amazonCreators','Amazon Creators API',amazonCreatorsReady,amazonCreatorsReady?'Credenciais cadastradas e API validada em teste anterior.':(amazonCredential?'Credenciais cadastradas, mas ainda não validadas com sucesso.':'Credenciais da Amazon Creators API ainda não cadastradas.'),'Cadastre Credential ID, Credential Secret e Partner Tag aprovados e execute o teste somente leitura.'),
    item('whatsapp','WhatsApp/n8n',whatsapp>0,whatsapp+' número(s) validado(s) com acesso a destino ativo.','Pareie o conector, valide os números e os grupos e ative o revezamento.'),
    item('storefront','Vitrine pública',storefront,storefront?'Vitrine publicada.':'Vitrine ainda não publicada.','Publique a vitrine em Conta.')
  ];
  const coreReady=core.filter(x=>x.ready).length,externalReady=external.filter(x=>x.ready).length;
  return res.json({
    status:coreReady===core.length?'OPERATIONAL':'SETUP_REQUIRED',
    productionReady:coreReady===core.length,
    verificationScope:'ACCOUNT_CONFIGURATION_AND_RECENT_DELIVERY',
    internalPercent:Math.round(coreReady*100/core.length),
    operationalPercent:Math.round((coreReady+externalReady)*100/(core.length+external.length)),
    core,external,checkedAt:new Date().toISOString()
  });
}
