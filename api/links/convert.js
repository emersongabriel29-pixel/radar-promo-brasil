import { db } from 'hatchable';

export const access='member';
export const methods=['POST'];
const safe=v=>String(v??'').trim().slice(0,1200);

function identify(host){
  if(/(^|\.)amazon\.com\.br$/.test(host))return 'AMAZON';
  if(/(^|\.)shopee\.com\.br$/.test(host))return 'SHOPEE';
  if(/(^|\.)(mercadolivre\.com\.br|mercadolivre\.com)$/.test(host))return 'MERCADO_LIVRE';
  return null;
}

export default async function(req,res){
  if(!req.member)return res.status(401).json({error:'Entre para continuar.'});
  try{
    const original=new URL(safe(req.body?.url));
    if(original.protocol!=='https:')return res.status(400).json({error:'Use um link HTTPS.'});
    const marketplace=identify(original.hostname.toLowerCase());
    if(!marketplace)return res.status(400).json({error:'Link não reconhecido. Use Amazon, Shopee ou Mercado Livre.'});
    const a=(await db.query('SELECT id FROM accounts WHERE owner_member_id=$1',[String(req.member.id)])).rows[0];
    if(!a)return res.status(412).json({error:'Abra as configurações da conta primeiro.'});
    const rule=(await db.query('SELECT * FROM marketplace_rules WHERE account_id=$1 AND marketplace=$2',[a.id,marketplace])).rows[0];
    if(!rule||rule.status!=='ACTIVE')return res.status(412).json({error:'Configure e valide a integração oficial desta loja antes de converter.',marketplace});
    const group=safe(req.body?.group||'geral').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,60),subid=rule.subid_template.replace('{group}',group);
    if(marketplace==='AMAZON')original.searchParams.set('tag',rule.affiliate_tag);
    else if(marketplace==='SHOPEE')original.searchParams.set('sub_id',subid);
    else original.searchParams.set('matt_tool',rule.affiliate_tag||subid);
    return res.json({ok:true,marketplace,affiliateUrl:original.toString(),subid,warning:'O crédito da comissão depende da validação oficial da loja.'});
  }catch{return res.status(400).json({error:'Link inválido.'})}
}
