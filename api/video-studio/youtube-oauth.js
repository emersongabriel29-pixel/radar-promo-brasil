import { config,db } from 'hatchable';
import { seal } from 'lib/direct-connectors.js';
export const access='public';
export const methods=['GET'];
const clean=(v,n=1000)=>String(v??'').trim().slice(0,n);
export default async function(req,res){
  const code=clean(req.query?.code,3000),state=clean(req.query?.state,200),oauthError=clean(req.query?.error,200);
  if(oauthError)return res.status(400).send('A autorização do YouTube foi cancelada. Volte ao Estúdio de Vídeos e tente novamente.');
  if(!code||!state)return res.status(400).send('Retorno OAuth inválido. Volte ao Estúdio de Vídeos e tente novamente.');
  const pending=(await db.query("SELECT account_id FROM youtube_oauth_states WHERE state=$1 AND created_at>now()-interval '10 minutes' LIMIT 1",[state])).rows[0];
  if(!pending)return res.status(400).send('A autorização expirou ou já foi utilizada. Volte ao Estúdio de Vídeos e conecte novamente.');
  await db.query('DELETE FROM youtube_oauth_states WHERE state=$1',[state]);
  const clientId=String(await config.get('YOUTUBE_CLIENT_ID')||''),clientSecret=String(await config.get('YOUTUBE_CLIENT_SECRET')||'');
  const redirect=String(await config.get('youtube_redirect_uri')||'https://radar-promo-brasil.hatchable.site/api/video-studio/youtube-oauth');
  if(!clientId||!clientSecret)return res.status(412).send('As credenciais OAuth do Google não estão configuradas no projeto.');
  try{
    const tokenResponse=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,client_id:clientId,client_secret:clientSecret,redirect_uri:redirect,grant_type:'authorization_code'}).toString(),signal:AbortSignal.timeout(20000)});
    const token=await tokenResponse.json().catch(()=>({}));
    if(!tokenResponse.ok||!token.access_token)throw new Error('O Google recusou a autorização OAuth (HTTP '+tokenResponse.status+'). Confira o redirect URI e as credenciais.');
    let channelId='',channelTitle='';
    const channelResponse=await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',{headers:{Authorization:'Bearer '+token.access_token},signal:AbortSignal.timeout(15000)});
    const channelData=await channelResponse.json().catch(()=>({}));
    if(channelResponse.ok&&channelData.items?.[0]){channelId=clean(channelData.items[0].id,100);channelTitle=clean(channelData.items[0].snippet?.title,200);}
    const old=(await db.query('SELECT refresh_token_enc FROM youtube_connections WHERE account_id=$1',[pending.account_id])).rows[0];
    const refreshEnc=token.refresh_token?await seal(token.refresh_token):old?.refresh_token_enc||'';
    if(!refreshEnc)throw new Error('O Google não retornou refresh token. Remova o acesso antigo na conta Google e conecte novamente com consentimento.');
    await db.query(`INSERT INTO youtube_connections(account_id,access_token_enc,refresh_token_enc,expires_at,channel_id,channel_title,scope,status,last_error)
      VALUES($1,$2,$3,$4,$5,$6,$7,'ACTIVE','')
      ON CONFLICT(account_id) DO UPDATE SET access_token_enc=EXCLUDED.access_token_enc,refresh_token_enc=EXCLUDED.refresh_token_enc,
      expires_at=EXCLUDED.expires_at,channel_id=EXCLUDED.channel_id,channel_title=EXCLUDED.channel_title,scope=EXCLUDED.scope,status='ACTIVE',last_error='',updated_at=now()`,
      [pending.account_id,await seal(token.access_token),refreshEnc,new Date(Date.now()+Math.max(60,Number(token.expires_in)||3600)*1000).toISOString(),channelId,channelTitle,clean(token.scope,1000)]);
    res.setHeader('Location','https://radar-promo-brasil.hatchable.site/estudio-videos?youtube=connected');
    return res.status(302).send('Canal do YouTube conectado. Você pode retornar ao Estúdio de Vídeos.');
  }catch(error){
    console.error('video-studio/youtube-oauth',String(error?.message||'OAUTH_ERROR').slice(0,180));
    return res.status(502).send(clean(error?.message,300)||'Não foi possível concluir a conexão com o YouTube.');
  }
}