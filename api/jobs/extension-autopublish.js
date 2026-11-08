import { db } from 'hatchable';
import { enqueueMatches } from 'lib/autopilot.js';
import { httpsUrl } from 'lib/validation.js';

export const access = 'scheduler';
export const methods = ['POST'];

export default async function handler(req, res) {
  const rows = (await db.query(`
    SELECT o.id,o.account_id,o.title,o.source,o.current_price,o.original_price,
      o.affiliate_url,o.image_url,o.product_url,o.image_storage_key,o.classification_status,
      o.classification_reason,o.status
    FROM offers o
    LEFT JOIN extension_autopublish_settings s ON s.account_id=o.account_id
    JOIN accounts a ON a.id=o.account_id AND a.status='ACTIVE'
    WHERE COALESCE(s.enabled,false)=true AND o.imported_by='CHROME_EXTENSION' AND o.status='PENDING'
      AND NULLIF(trim(o.title),'') IS NOT NULL AND o.current_price>0
      AND NULLIF(trim(o.affiliate_url),'') LIKE 'https://%'
    ORDER BY o.created_at ASC LIMIT 100
  `)).rows;

  const result={ok:true,scanned:rows.length,approved:0,blocked:0,deferred:0,queued:0,failed:0,accounts:0};
  if (!rows.length) return res.json({...result,idle:true,reason:'NO_VERIFIED_EXTENSION_OFFERS'});

  const eligible=[];
  for (const o of rows) {
    const current=Number(o.current_price), original=o.original_price==null?null:Number(o.original_price);
    let reason='';
    if(!String(o.title||'').trim()) reason='MISSING_TITLE';
    else if(!httpsUrl(o.affiliate_url)) reason='MISSING_VALID_AFFILIATE_LINK';
    else if(!Number.isSafeInteger(current)||current<=0) reason='MISSING_VERIFIABLE_PRICE';
    if(reason){result.deferred++;continue;}
    eligible.push({id:o.id,account_id:o.account_id,current_price:current,original_price:original});
  }

  // Approve the whole verified batch in one database statement instead of one UPDATE per offer.
  let approvedRows=[];
  if(eligible.length){
    const updated=await db.query(`
      UPDATE offers o SET status='APPROVED',validation_status='VALIDATED',
        classification_reason=COALESCE(classification_reason,'Fluxo Master: identidade, preço atual e link afiliado válidos.'),
        updated_at=now()
      FROM jsonb_to_recordset($1::jsonb) AS x(id text,account_id text,current_price numeric,original_price numeric)
      WHERE o.id=x.id AND o.account_id=x.account_id AND o.status='PENDING'
        AND o.current_price=x.current_price
        AND NULLIF(trim(o.affiliate_url),'') LIKE 'https://%'
      RETURNING o.id,o.account_id
    `,[JSON.stringify(eligible)]);
    approvedRows=updated.rows||[];
  }

  result.approved=approvedRows.length;
  const readyAccounts=[...new Set(approvedRows.map(o=>o.account_id))];
  result.accounts=readyAccounts.length;
  for(const accountId of readyAccounts){
    try{
      const queued=await enqueueMatches(accountId,'',{source:''});
      result.queued+=queued.queued||0;
    }catch(error){
      result.failed++;
      console.error('extension autopublish queue failed',String(error?.code||error?.name||'ERROR').slice(0,60));
    }
  }
  result.ok=result.failed===0;
  return res.json(result);
}