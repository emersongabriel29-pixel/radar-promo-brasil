import { db } from 'hatchable';
import { seal } from 'lib/direct-connectors.js';
export const access='member';
export const methods=['POST'];
const BASE='https://radar-n8n.duckdns.org';
const REDIRECT='https://radar-promo-brasil.hatchable.site/api/n8n/mcp-callback';
export default async function(req,res){
 if(!req.member)return res.status(401).json({error:'Entre no Radar Promo Brasil.'});
 try{
  const account=(await db.query("SELECT id FROM accounts WHERE owner_member_id=$1 AND status='ACTIVE' LIMIT 1",[String(req.member.id)])).rows[0];
  if(!account)return res.status(412).json({error:'Abra o painel para inicializar sua conta.'});
  const mr=await fetch(BASE+'/.well-known/oauth-authorization-server',{headers:{accept:'application/json'},signal:AbortSignal.timeout(8000)});
  if(!mr.ok)throw new Error('Metadados OAuth do n8n indisponíveis.');
  const meta=await mr.json();
  const registrationUrl=new URL(meta.registration_endpoint||BASE+'/mcp-oauth/register',BASE);
  if(registrationUrl.origin!==BASE)throw new Error('Endpoint de cadastro OAuth fora do domínio n8n esperado.');
  const rr=await fetch(registrationUrl.toString(),{method:'POST',headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify({client_name:'Radar Promo Brasil',redirect_uris:[REDIRECT],grant_types:['authorization_code','refresh_token'],response_types:['code'],token_endpoint_auth_method:'client_secret_post',scope:'workflow:read workflow:execute execution:read'}),signal:AbortSignal.timeout(10000)});
  const client=await rr.json().catch(()=>({}));
  if(!rr.ok||!client.client_id)throw new Error(String(client.error_description||client.message||'Cadastro OAuth dinâmico recusado pelo n8n.').slice(0,180));
  const verifier=btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
  const challenge=btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');
  const state=crypto.randomUUID();
  await db.query("INSERT INTO marketplace_oauth_states(state,account_id,code_verifier_enc,expires_at) VALUES($1,$2,$3,now()+interval '10 minutes')",[state,account.id,await seal(JSON.stringify({verifier,clientId:client.client_id,clientSecret:client.client_secret||'',tokenEndpoint:meta.token_endpoint,authMethod:client.token_endpoint_auth_method||'client_secret_post'}))]);
  const authorizationUrl=new URL(meta.authorization_endpoint||BASE+'/mcp-oauth/authorize',BASE);
  if(authorizationUrl.origin!==BASE)throw new Error('Endpoint de autorização OAuth fora do domínio n8n esperado.');
  const url=authorizationUrl;url.search=new URLSearchParams({response_type:'code',client_id:client.client_id,redirect_uri:REDIRECT,state,scope:'workflow:read workflow:execute execution:read',code_challenge:challenge,code_challenge_method:'S256'}).toString();
  return res.json({ok:true,authorizationUrl:url.toString(),redirectUri:REDIRECT});
 }catch(e){return res.status(502).json({ok:false,error:String(e.message||'Falha ao iniciar OAuth.').slice(0,220)});}
}