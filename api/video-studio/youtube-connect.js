import { config,db } from 'hatchable';
export const access='member';
export const methods=['GET'];
export default async function(req,res){
  if(!req.member)return res.status(401).json({error:'Entre para conectar o canal do YouTube.'});
  const account=(await db.query("SELECT id FROM accounts WHERE owner_member_id=$1 AND status='ACTIVE' LIMIT 1",[String(req.member.id)])).rows[0];
  if(!account)return res.status(412).json({error:'Conta do Radar não inicializada.'});
  const clientId=String(await config.get('YOUTUBE_CLIENT_ID')||'');
  const redirect=String(await config.get('youtube_redirect_uri')||'https://radar-promo-brasil.hatchable.site/api/video-studio/youtube-oauth');
  if(!clientId)return res.status(412).json({error:'Configure YOUTUBE_CLIENT_ID e YOUTUBE_CLIENT_SECRET nas configurações do projeto antes de conectar o canal.'});
  const bytes=crypto.getRandomValues(new Uint8Array(32));let raw='';for(const b of bytes)raw+=String.fromCharCode(b);
  const state=btoa(raw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  await db.query("DELETE FROM youtube_oauth_states WHERE created_at<now()-interval '30 minutes'");
  await db.query('INSERT INTO youtube_oauth_states(state,account_id) VALUES($1,$2)',[state,account.id]);
  const params=new URLSearchParams({client_id:clientId,redirect_uri:redirect,response_type:'code',scope:'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',access_type:'offline',include_granted_scopes:'true',prompt:'consent',state});
  return res.json({ok:true,authorizationUrl:'https://accounts.google.com/o/oauth2/v2/auth?'+params.toString()});
}