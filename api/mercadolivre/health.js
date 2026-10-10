import { db } from 'hatchable';
import { meliGet } from 'lib/direct-connectors.js';
export const access='member'; export const methods=['GET'];
export default async function(req,res){
  const a=(await db.query('SELECT id FROM accounts WHERE owner_member_id=$1',[String(req.member.id)])).rows[0];
  if(!a)return res.status(412).json({ok:false,error:'Conta não encontrada.'});
  const row=(await db.query("SELECT status,expires_at,(access_token_enc IS NOT NULL AND access_token_enc <> '') AS has_access_token,(refresh_token_enc IS NOT NULL AND refresh_token_enc <> '') AS has_refresh_token FROM marketplace_connections WHERE account_id=$1 AND marketplace='MERCADOLIVRE'",[a.id])).rows[0];
  if(!row)return res.status(412).json({ok:false,connected:false,error:'Mercado Livre não conectado.'});
  if(!row.has_access_token||!row.has_refresh_token)return res.status(412).json({ok:false,connected:row.status==='ACTIVE',hasAccessToken:!!row.has_access_token,hasRefreshToken:!!row.has_refresh_token,error:'Tokens da conexão incompletos.'});
  try{
    const r=await meliGet(a.id,'/users/me');
    if(r.status<200||r.status>=300){
      console.error('meli/health provider response',JSON.stringify({status:r.status,code:String(r.body?.error||r.body?.code||'').slice(0,80),message:String(r.body?.message||'').slice(0,120)}));
      return res.status(502).json({ok:false,connected:row.status==='ACTIVE',hasAccessToken:true,hasRefreshToken:true,apiReachable:false,providerStatus:r.status,error:'A conexão está salva, mas a API não confirmou a identidade da conta.'});
    }
    const fresh=(await db.query("SELECT expires_at,(refresh_token_enc IS NOT NULL AND refresh_token_enc <> '') AS has_refresh_token FROM marketplace_connections WHERE account_id=$1 AND marketplace='MERCADOLIVRE'",[a.id])).rows[0];
    return res.json({ok:true,connected:true,hasAccessToken:true,hasRefreshToken:!!fresh?.has_refresh_token,apiReachable:true,identityConfirmed:!!r.body?.id,expiresAt:fresh?.expires_at||row.expires_at});
  }catch(e){
    console.error('meli/health error',JSON.stringify({code:String(e?.code||'').slice(0,60),status:Number(e?.status)||0,message:String(e?.message||'').slice(0,120)}));
    return res.status(502).json({ok:false,connected:row.status==='ACTIVE',hasAccessToken:true,hasRefreshToken:true,apiReachable:false,error:'Não foi possível validar a conexão ou renovar o token.'});
  }
}