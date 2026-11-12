import {db} from 'hatchable';
export const access='member';
export const methods=['GET'];
export default async function(req,res){
 const account=(await db.query('SELECT id FROM accounts WHERE owner_member_id=$1',[String(req.member.id)])).rows[0];
 if(!account)return res.status(412).json({error:'Conta não encontrada.'});
 const id=String(req.query?.id||'');
 const batches=(await db.query(`SELECT id,event_id AS "eventId",state,cursor,jsonb_array_length(payload->'offers') AS total,inserted_count AS inserted,duplicate_count AS duplicates,rejected,last_error AS "lastError",next_attempt_at AS "nextAttemptAt",updated_at AS "updatedAt" FROM ingestion_batches WHERE account_id=$1 AND ($2='' OR id=$2) ORDER BY created_at DESC LIMIT 20`,[account.id,id])).rows;
 if(id&&!batches.length)return res.status(404).json({error:'Lote não encontrado.'});
 return res.json({batches});
}
