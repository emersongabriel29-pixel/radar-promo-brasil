import { config, db } from 'hatchable';
import { seal } from 'lib/direct-connectors.js';
export const access = 'member';
export const methods = ['GET'];
const accountFor = async member => (await db.query("SELECT id FROM accounts WHERE owner_member_id=$1 AND status='ACTIVE' LIMIT 1",[String(member.id)])).rows[0];
export default async function handler(req,res){
  if(!req.member)return res.status(401).json({error:'Entre no Radar para conectar sua conta Magalu.'});
  try{
    const account=await accountFor(req.member);
    if(!account)return res.status(412).json({error:'Abra o painel uma vez para criar sua conta.'});
    const clientId=String(await config.get('MAGALU_CLIENT_ID')||'');
    const clientSecret=String(await config.get('MAGALU_CLIENT_SECRET')||'');
    const redirectUri=String(await config.get('magalu_redirect_uri')||'https://radar-promo-brasil.hatchable.site/api/integrations/magalu-callback');
    if(!clientId||!clientSecret)return res.status(412).json({error:'Para conectar a conta Magalu, configure MAGALU_CLIENT_ID e MAGALU_CLIENT_SECRET nos segredos do projeto ID Magalu. As três chaves API Key cadastradas não substituem as credenciais OAuth do aplicativo.'});
    const state=crypto.randomUUID();
    await db.query("INSERT INTO marketplace_oauth_states(state,account_id,code_verifier_enc,expires_at) VALUES($1,$2,$3,now()+interval '10 minutes')",[state,account.id,await seal('MAGALU_OAUTH_V1')]);
    const scope=String(await config.get('MAGALU_SCOPES')||'open:portfolio-skus-seller:read open:portfolio-prices-seller:read open:portfolio-stocks-seller:read');
    const url='https://id.magalu.com/login?'+new URLSearchParams({client_id:clientId,redirect_uri:redirectUri,scope,response_type:'code',choose_tenants:'true',state}).toString();
    return res.json({ok:true,authorizationUrl:url,redirectUri});
  }catch(error){
    console.error('magalu connect start',JSON.stringify({name:String(error?.name||'Error').slice(0,60)}));
    return res.status(500).json({error:'Não foi possível iniciar a conexão segura com a Magalu.'});
  }
}