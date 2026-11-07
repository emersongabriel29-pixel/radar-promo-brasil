import { db } from 'hatchable';
import { enqueueMatches } from 'lib/autopilot.js';
import { httpsUrl, directImageUrl } from 'lib/validation.js';
import { isMedicationProduct } from 'lib/product-safety.js';

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
    WHERE COALESCE(s.enabled,true)=true AND o.imported_by='CHROME_EXTENSION' AND o.status='PENDING'
      AND o.created_at>now()-interval '7 days'
      AND EXISTS (
        SELECT 1 FROM offer_price_history ph
        WHERE ph.account_id=o.account_id AND ph.offer_id=o.id
          AND ph.source_type='OFFICIAL_API' AND ph.verified_at IS NOT NULL
          AND ph.verified_at>now()-interval '24 hours'
          AND ph.price=o.current_price
          AND ph.original_price IS NOT DISTINCT FROM o.original_price
          AND ph.verified_at=(SELECT max(ph2.verified_at) FROM offer_price_history ph2
            WHERE ph2.account_id=ph.account_id AND ph2.offer_id=ph.offer_id
              AND ph2.source_type='OFFICIAL_API')
      )
    ORDER BY o.created_at ASC LIMIT 100
  `)).rows;

  const result={ok:true,scanned:rows.length,approved:0,blocked:0,queued:0,failed:0,accounts:0};
  if (!rows.length) return res.json({...result,idle:true,reason:'NO_VERIFIED_EXTENSION_OFFERS'});

  const eligible=[];
  for (const o of rows) {
    const current=Number(o.current_price), original=o.original_price==null?null:Number(o.original_price);
    let reason='';
    if(!String(o.title||'').trim()) reason='Título ausente';
    else if(!httpsUrl(o.affiliate_url)||!httpsUrl(o.product_url)) reason='Link do produto ou afiliado inválido';
    else if(!(o.image_storage_key||directImageUrl(o.image_url))) reason='Imagem inválida ou indisponível';
    else if(!Number.isSafeInteger(current)||current<=0||(original!==null&&(!Number.isSafeInteger(original)||original<current))) reason='Preço inválido';
    else if(isMedicationProduct({title:o.title,productUrl:o.product_url})) reason='Produto bloqueado pela política de segurança';
    else if(String(o.classification_reason||'').includes('LOW_COMMISSION')||String(o.classification_reason||'').includes('LOW_RATING')) reason='Critério comercial exige revisão humana';
    if(reason){result.blocked++;continue;}
    eligible.push({id:o.id,account_id:o.account_id,current_price:current,original_price:original});
  }

  // Approve the whole verified batch in one database statement instead of one UPDATE per offer.
  let approvedRows=[];
  if(eligible.length){
    const updated=await db.query(`
      UPDATE offers o SET status='APPROVED',validation_status='VALIDATED',
        classification_status=CASE WHEN o.classification_status='REVIEW' THEN 'AUTO' ELSE o.classification_status END,
        classification_reason='Aprovação automática após preço oficial confirmado e validações comerciais.',
        updated_at=now()
      FROM jsonb_to_recordset($1::jsonb) AS x(id text,account_id text,current_price numeric,original_price numeric)
      WHERE o.id=x.id AND o.account_id=x.account_id AND o.status='PENDING'
        AND o.current_price=x.current_price
        AND o.original_price IS NOT DISTINCT FROM x.original_price
        AND EXISTS (
          SELECT 1 FROM offer_price_history ph
          WHERE ph.account_id=o.account_id AND ph.offer_id=o.id
            AND ph.source_type='OFFICIAL_API' AND ph.verified_at>now()-interval '24 hours'
            AND ph.price=o.current_price AND ph.original_price IS NOT DISTINCT FROM o.original_price
            AND ph.verified_at=(SELECT max(ph2.verified_at) FROM offer_price_history ph2
              WHERE ph2.account_id=ph.account_id AND ph2.offer_id=ph.offer_id
                AND ph2.source_type='OFFICIAL_API')
        )
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