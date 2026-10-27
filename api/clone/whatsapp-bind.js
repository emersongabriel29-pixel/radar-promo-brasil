import { db } from 'hatchable';
import { getOrCreateAccount } from 'lib/accounts.js';

export const access='member';
export const methods=['POST'];

const clean=(value,max=300)=>String(value??'').trim().slice(0,max);

export default async function(req,res){
  try{
    const account=await getOrCreateAccount(req.member);
    const monitorId=clean(req.body?.monitorId,100);
    const groupJid=clean(req.body?.groupJid,100);
    if(!monitorId||!/^\d{6,30}(?:-\d{4,25})?@g\.us$/.test(groupJid)){
      return res.status(400).json({ok:false,error:'Informe um monitor e o identificador do grupo WhatsApp no formato numérico terminado em @g.us.'});
    }
    const result=await db.query(
      "UPDATE monitors SET external_source_id=$3,status='PAUSED',last_error='Grupo vinculado; mantenha pausado até validar a conexão e a autorização.' WHERE id=$1 AND account_id=$2 AND source_type='WHATSAPP_GROUP' AND source_authorized=true AND source_url LIKE 'https://chat.whatsapp.com/%' RETURNING id,name,source_url AS \"sourceUrl\",external_source_id AS \"externalSourceId\",status",
      [monitorId,account.id,groupJid]
    );
    if(!result.rows.length)return res.status(404).json({ok:false,error:'Origem autorizada do WhatsApp não encontrada nesta conta. Cadastre o link de convite primeiro.'});
    return res.json({ok:true,source:result.rows[0],message:'Grupo vinculado, mas pausado. Ative somente após confirmar que o conector autorizado recebe mensagens deste grupo.'});
  }catch(error){
    return res.status(500).json({ok:false,error:'Não foi possível vincular o grupo WhatsApp.',detail:clean(error?.message,180)});
  }
}