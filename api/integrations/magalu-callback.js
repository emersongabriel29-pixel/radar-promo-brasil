import { config, db } from 'hatchable';
import { seal } from 'lib/direct-connectors.js';
export const access='public';
export const methods=['GET'];
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function page(title,message,ok=false){return '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+'</title><style>body{font:16px system-ui;background:#f5f7fb;color:#172033;display:grid;place-items:center;min-height:100vh;margin:0}.box{background:white;padding:28px;border-radius:18px;max-width:520px;margin:18px;box-shadow:0 10px 40px #17203318}h1{font-size:24px;color:'+(ok?'#087f5b':'#b42318')+'}a{display:inline-block;margin-top:12px;color:#2458c7}</style><main class="box"><h1>'+esc(title)+'</h1><p>'+esc(message)+'</p><a href="https://radar-promo-brasil.hatchable.site">Voltar ao Radar Promo Brasil</a></main>'}
export default async function handler(req,res){
  res.setHeader('Content-Type','text/html; charset=utf-8');
  try{
    const state=String(req.query.state||''),code=String(req.query.code||''),oauthError=String(req.query.error||'');
    if(oauthError)throw new Error('A autorização foi recusada ou cancelada no ID Magalu.');
    if(!state||!code)throw new Error('A Magalu não retornou o código de autorização esperado.');
    const row=(await db.query("DELETE FROM marketplace_oauth_states WHERE state=$1 AND expires_at>now() RETURNING account_id,code_verifier_enc",[state])).rows[0];
    if(!row)throw new Error('Estado OAuth expirado ou inválido. Volte ao Radar e tente conectar novamente.');
    const clientId=String(await config.get('MAGALU_CLIENT_ID')||''),clientSecret=String(await config.get('MAGALU_CLIENT_SECRET')||'');
    const redirectUri=String(await config.get('magalu_redirect_uri')||'https://radar-promo-brasil.hatchable.site/api/integrations/magalu-callback');
    if(!clientId||!clientSecret)throw new Error('As credenciais OAuth do aplicativo Magalu não estão configuradas no servidor.');
    const response=await fetch('https://id.magalu.com/oauth/token',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({grant_type:'authorization_code',client_id:clientId,client_secret:clientSecret,redirect_uri:redirectUri,code}),signal:AbortSignal.timeout(15000)});
    const token=await response.json().catch(()=>({}));
    if(!response.ok||!token.access_token)throw new Error('O ID Magalu não aceitou a troca do código por token. Confira Client ID, Client Secret, URL de callback e permissões.');
    const expiry=new Date(Date.now()+Math.max(60,Number(token.expires_in)||7200)*1000).toISOString();
    await db.query("INSERT INTO marketplace_connections(id,account_id,marketplace,external_user_id,access_token_enc,refresh_token_enc,expires_at,status,last_error) VALUES($1,$2,'MAGALU','',$3,$4,$5,'ACTIVE','') ON CONFLICT(account_id,marketplace) DO UPDATE SET access_token_enc=EXCLUDED.access_token_enc,refresh_token_enc=EXCLUDED.refresh_token_enc,expires_at=EXCLUDED.expires_at,status='ACTIVE',last_error='',updated_at=now()",[crypto.randomUUID(),row.account_id,await seal(token.access_token),await seal(String(token.refresh_token||'')),expiry]);
    return res.send(page('Conta Magalu conectada','O consentimento OAuth foi concluído e os tokens foram armazenados criptografados. Isso confirma a autenticação da conta; os endpoints e escopos de produtos ainda precisam ser testados antes de ativar a coleta automática.',true));
  }catch(error){
    console.error('magalu oauth callback',JSON.stringify({name:String(error?.name||'Error').slice(0,60),message:String(error?.message||'').replace(/[\r\n]/g,' ').slice(0,160)}));
    return res.status(400).send(page('Não foi possível conectar a Magalu',error?.message||'Autorização não concluída.'));
  }
}