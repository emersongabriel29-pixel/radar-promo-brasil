import { db,config } from 'hatchable';

export const access='member';
export const methods=['POST'];

async function derive(master,accountId){
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(master),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const bytes=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(accountId));
  return Array.from(new Uint8Array(bytes)).map(x=>x.toString(16).padStart(2,'0')).join('');
}

export default async function(req,res){
  if(!req.member)return res.status(401).json({error:'Não autorizado.'});
  try{
    const account=(await db.query('SELECT id FROM accounts WHERE owner_member_id=$1 AND status=$2',[String(req.member.id),'ACTIVE'])).rows[0];
    if(!account)return res.status(412).json({error:'Abra o painel para inicializar sua conta.'});
    const master=await config.get('N8N_WEBHOOK_SECRET');
    if(!master)return res.status(503).json({error:'Segredo principal do n8n ainda não configurado.'});
    return res.json({accountId:account.id,pairingSecret:await derive(master,account.id),algorithm:'HMAC-SHA256',warning:'Copie uma vez para a credencial segura do n8n. Não publique este valor.'});
  }catch{return res.status(503).json({error:'Integração n8n aguardando configuração segura.'})}
}
