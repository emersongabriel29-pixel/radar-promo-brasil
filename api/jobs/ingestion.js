import {db} from 'hatchable';
import {processIngestionBatch} from 'lib/ingestion.js';
export const access='scheduler';
export const methods=['POST'];
export default async function(req,res){
 const rows=(await db.query("SELECT id,account_id FROM ingestion_batches WHERE (state IN ('PENDING','WAITING_CAPACITY','RETRY') AND next_attempt_at<=now()) OR (state='PROCESSING' AND lease_until<now()) ORDER BY next_attempt_at,created_at LIMIT 2")).rows;
 const deadline=Date.now()+45000;
 const result={processed:0,completed:0,pending:0,failed:0,inserted:0,duplicates:0};
 for(const row of rows){if(Date.now()>deadline-1000)break;try{const done=await processIngestionBatch(row.id,row.account_id,{maxItems:25,budgetMs:Math.min(20000,deadline-Date.now())});result.processed++;result.completed+=done.complete?1:0;result.pending+=done.pending?1:0;result.inserted+=done.inserted;result.duplicates+=done.duplicates;}catch{result.failed++;}}
 return res.json({ok:result.failed===0,...result});
}
