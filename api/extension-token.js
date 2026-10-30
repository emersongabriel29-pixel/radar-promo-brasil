import { db } from 'hatchable';

export const access = 'member';
export const methods = ['GET','POST','DELETE'];

const b64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const hash = async value => {
  const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('');
};
async function accountFor(member){
  return (await db.query("SELECT id FROM accounts WHERE owner_member_id=$1 AND status='ACTIVE' LIMIT 1",[String(member.id)])).rows[0];
}
export default async function handler(req,res){
  if(!req.member)return res.status(401).json({error:'Entre no Radar para gerenciar o token da extensão.'});
  try{
    const account=await accountFor(req.member);
    if(!account)return res.status(412).json({error:'Abra o painel do Radar para criar sua conta.'});
    if(req.method==='GET'){
      const row=(await db.query("SELECT token_last4 AS \"last4\",created_at AS \"createdAt\",last_used_at AS \"lastUsedAt\" FROM extension_api_tokens WHERE account_id=$1 AND revoked_at IS NULL ORDER BY created_at DESC LIMIT 1",[account.id])).rows[0];
      return res.json({configured:!!row,token:row||null,endpoint:'https://radar-promo-brasil.hatchable.site/api/extension-offers'});
    }
    if(req.method==='DELETE'){
      await db.query("UPDATE extension_api_tokens SET revoked_at=now() WHERE account_id=$1 AND revoked_at IS NULL",[account.id]);
      return res.json({ok:true,revoked:true});
    }
    const token='rpb_ext_'+b64url(crypto.getRandomValues(new Uint8Array(32)));
    const tokenHash=await hash(token),id=crypto.randomUUID(),last4=token.slice(-4);
    await db.query("UPDATE extension_api_tokens SET revoked_at=now() WHERE account_id=$1 AND revoked_at IS NULL",[account.id]);
    await db.query("INSERT INTO extension_api_tokens(id,account_id,token_hash,token_last4) VALUES($1,$2,$3,$4)",[id,account.id,tokenHash,last4]);
    return res.status(201).json({ok:true,token,endpoint:'https://radar-promo-brasil.hatchable.site/api/extension-offers',message:'Copie o token agora. Ele não será exibido novamente.'});
  }catch(error){
    console.error('extension-token error',error?.message);
    return res.status(500).json({error:'Não foi possível gerenciar o token da extensão.'});
  }
}