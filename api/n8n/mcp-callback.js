import { db } from 'hatchable';
import { open, seal } from 'lib/direct-connectors.js';
export const access='public';
export const methods=['GET'];
const BASE='https://radar-n8n.duckdns.org';
const REDIRECT='https://radar-promo-brasil.hatchable.site/api/n8n/mcp-callback';
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function page(title,message,ok){return '<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width"><meta charset="utf-8"><title>'+esc(title)+'</title><body style="font:16px system-ui;background:#f4f7fb;padding:32px;color:#172b3b"><main style="max-width:620px;margin:8vh auto;background:white;border-radius:16px;padding:28px"><h1 style="color:'+(ok?'#087f5b':'#a33')+'">'+esc(title)+'</h1><p>'+esc(message)+'</p><p>Você pode fechar esta janela e voltar ao Radar Promo Brasil.</p></main></body></html>';}
export default async function(req,res){
 res.setHeader('Content-Type','text/html; charset=utf-8');
 try{
  const state=String(req.query.state||''),code=String(req.query.code||'');
  if(req.query.error)throw new Error('Autorização recusada no n8n. Volte ao Radar e tente novamente.');
  if(!state||!code)throw new Error('O n8n não retornou o código de autorização esperado.');
  const row=(await db.query('DELETE FROM marketplace_oauth_states WHERE state=$1 AND expires_at>now() RETURNING *',[state])).rows[0];
  if(!row)throw new Error('Estado OAuth expirado ou inválido. Inicie a conexão novamente.');
  const details=JSON.parse(await open(row.code_verifier_enc));
  const tokenUrl=new URL(details.tokenEndpoint||BASE+'/mcp-oauth/token');
  if(tokenUrl.origin!==BASE)throw new Error('Endpoint de token OAuth fora do domínio esperado.');
  const params={grant_type:'authorization_code',client_id:String(details.clientId),code,redirect_uri:REDIRECT,code_verifier:String(details.verifier)};
  if(details.clientSecret)params.client_secret=String(details.clientSecret);
  const response=await fetch(tokenUrl.toString(),{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded',accept:'application/json'},body:new URLSearchParams(params).toString(),signal:AbortSignal.timeout(12000)});
  const token=await response.json().catch(()=>({}));
  if(!response.ok||!token.access_token)throw new Error('O n8n recusou a troca do código OAuth (HTTP '+response.status+'). Confira a URL de retorno e tente novamente.');
  const refreshData={refreshToken:String(token.refresh_token||''),clientId:String(details.clientId),clientSecret:String(details.clientSecret||''),authMethod:String(details.authMethod||'client_secret_post')};
  await db.query("INSERT INTO marketplace_connections(id,account_id,marketplace,external_user_id,access_token_enc,refresh_token_enc,expires_at,status,last_error) VALUES($1,$2,'N8N_MCP','n8n MCP',$3,$4,$5,'ACTIVE','') ON CONFLICT(account_id,marketplace) DO UPDATE SET access_token_enc=EXCLUDED.access_token_enc,refresh_token_enc=EXCLUDED.refresh_token_enc,expires_at=EXCLUDED.expires_at,status='ACTIVE',last_error='',updated_at=now()",[crypto.randomUUID(),row.account_id,await seal(String(token.access_token)),await seal(JSON.stringify(refreshData)),new Date(Date.now()+Math.max(60,Number(token.expires_in)||3600)*1000).toISOString()]);
  return res.send(page('n8n conectado','A autorização OAuth foi concluída. Nenhum workflow foi executado e nenhuma mensagem foi publicada.',true));
 }catch(e){return res.status(400).send(page('Conexão não concluída',String(e.message||'Não foi possível concluir OAuth.').slice(0,220),false));}
}