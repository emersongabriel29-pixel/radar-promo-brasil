import { config, db, scheduler } from 'hatchable';
import { fingerprint } from 'lib/automation.js';
import { directImageUrl, httpsUrl } from 'lib/validation.js';
// API catalog items are not filtered by product category.
import { formatPromo } from 'lib/promo-message.js';
import { classifyProduct } from 'lib/category-classifier.js';

export const access = 'scheduler';
export const methods = ['POST'];
const API_URL = 'https://open-api.affiliate.shopee.com.br/graphql';
const clean = (v, n=300) => String(v ?? '').trim().slice(0,n);
const fromB64 = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
const hex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2,'0')).join('');
const list = body => Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : Array.isArray(body?.items) ? body.items : [];

async function credentials(row) {
  // Match the canonical key priority used by the credential-saving endpoint.
  let master = String(await config.get('API_CREDENTIALS_MASTER_KEY') || '');
  if (master.length < 32) master = String(await config.get('CONNECTOR_ENCRYPTION_KEY') || '');
  if (master.length < 32) throw new Error('credential_key_missing');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(master+'|radar-marketplace-credentials|'+row.account_id+'|SHOPEE'));
  const key = await crypto.subtle.importKey('raw', digest, {name:'AES-GCM'}, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64(row.nonce)},key,fromB64(row.credentials_enc));
  return JSON.parse(new TextDecoder().decode(plain));
}
async function request(creds, query, variables) {
  const payload = {query, ...(variables ? {variables} : {})};
  const appId = clean(creds.appId,200), secret = clean(creds.apiSecret,4096);
  if (!appId || !secret) throw new Error('credentials_missing');
  const timestamp = String(Math.floor(Date.now()/1000)), body = JSON.stringify(payload);
  const signature = hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(appId+timestamp+body+secret)));
  const response = await fetch(API_URL,{method:'POST',headers:{'content-type':'application/json',accept:'application/json',authorization:'SHA256 Credential='+appId+', Timestamp='+timestamp+', Signature='+signature},body,signal:AbortSignal.timeout(12000)});
  const raw = await response.text(); let data;
  try { data = raw ? JSON.parse(raw) : {}; } catch { throw new Error('invalid_api_response'); }
  if (!response.ok || data.errors?.length) {
    const code = clean(data.errors?.[0]?.extensions?.code || '',60);
    throw new Error('shopee_api_'+(code || response.status));
  }
  return data;
}
async function createTrackedLink(creds, productUrl, itemId, category) {
  const itemTag = ('ITEM'+clean(itemId,36).replace(/[^a-z0-9]/gi,'')).slice(0,50);
  const categoryTag = ('CAT'+clean(category,30).replace(/[^a-z0-9]/gi,'')).slice(0,50);
  const subIds = ['RADAR',itemTag,categoryTag].filter((value,index,array)=>value.length>3&&array.indexOf(value)===index).slice(0,5);
  const query = 'mutation { generateShortLink(input: { originUrl: '+JSON.stringify(productUrl)+', subIds: '+JSON.stringify(subIds)+' }) { shortLink } }';
  const result = await request(creds,query);
  const shortLink = result?.data?.generateShortLink?.shortLink;
  if (typeof shortLink !== 'string' || !shortLink.startsWith('https://')) throw new Error('shopee_short_link_missing');
  return {shortLink,subIds};
}
export default async function handler(req,res) {
  const rows = (await db.query("SELECT account_id,credentials_enc,nonce FROM marketplace_api_credentials WHERE marketplace='SHOPEE' AND status='VALIDATED'")).rows;
  const totals = {accounts:rows.length,scanned:0,imported:0,duplicates:0,skipped:0,failed:0,autopilotRuns:0};
  for (const row of rows) {
    let importedForAccount = 0;
    try {
      const creds = await credentials(row);
      // Brazilian Portuguese purchase-intent terms. Three searches run every 30 minutes; rotate terms per run to avoid repeating the same calls twice per hour.
      const keywords = [
        'celular', 'smartphone', 'fone bluetooth',
        'smartwatch', 'notebook', 'monitor gamer',
        'teclado gamer', 'mouse gamer', 'ssd',
        'air fryer', 'cafeteira', 'liquidificador',
        'aspirador de pó', 'ventilador', 'purificador de água',
        'fralda bebê', 'carrinho de bebê', 'cadeirinha carro bebê',
        'brinquedo educativo', 'material escolar', 'mochila',
        'tênis masculino', 'tênis feminino', 'roupa fitness',
        'perfume feminino', 'perfume masculino', 'skincare',
        'organizador casa', 'utensílios cozinha', 'luminária',
        'ferramentas', 'furadeira', 'acessórios automotivos',
        'câmera segurança', 'power bank', 'carregador rápido'
      ];
      const slot = Math.floor(Date.now()/1800000);
      const selectedKeywords = [0,1,2].map(offset => keywords[(slot * 3 + offset) % keywords.length]);
      const query = 'query($keyword: String, $sortType: Int, $page: Int, $limit: Int) { productOfferV2(keyword: $keyword, sortType: $sortType, page: $page, limit: $limit) { nodes { itemId shopId productName productLink offerLink imageUrl priceMin priceMax priceDiscountRate commissionRate sales ratingStar } pageInfo { page limit hasNextPage } } }';
      const seen = new Set();
      const products = [];
      // Three categories per run; rotate pages every 90 minutes without extra pagination requests.
      const page = Math.floor(slot/3)%5+1;
      for (const keyword of selectedKeywords) {
        const data = await request(creds,query,{keyword,sortType:5,page,limit:50});
        const nodes = list(data.data?.productOfferV2?.nodes).slice(0,50);
        for (const product of nodes) {
          const key = clean(product.itemId,80) || clean(product.productLink,2000) || clean(product.productName,220);
          if (!key || seen.has(key)) continue;
          seen.add(key);
          products.push(product);
        }
      }
      totals.scanned += products.length;
      const cats = (await db.query('SELECT id,name FROM categories WHERE account_id=$1',[row.account_id])).rows;
      const candidates = [];
      for (const p of products) {
        const title = clean(p.productName,220);
        const productUrl = httpsUrl(p.productLink,2000) || '';
        const affiliateUrl = httpsUrl(p.offerLink,2000) || '';
        const imageUrl = directImageUrl(p.imageUrl) ? p.imageUrl : '';
        const price = Number(p.priceMin);
        const rateRaw = Number(p.priceDiscountRate);
        const discountRate = Number.isFinite(rateRaw) && rateRaw > 0 ? (rateRaw < 1 ? rateRaw : rateRaw/100) : 0;
        const currentPrice = Number.isFinite(price) && price>0 ? Math.round(price*100) : 0;
        const commission = Number(p.commissionRate);
        if (!title || !productUrl || !affiliateUrl || !imageUrl || !currentPrice || !Number.isFinite(commission) || commission<=0) { totals.skipped++; continue; }

        const sales = Math.max(0, Number(p.sales) || 0);
        const commissionPercent = commission <= 1 ? commission * 100 : commission;
        const ratingRaw = Number(p.ratingStar);
        const rating = Number.isFinite(ratingRaw) && ratingRaw > 0 ? (ratingRaw > 5 ? ratingRaw / 20 : ratingRaw) : null;
        // API discount is a marketing claim, not historical proof. Use it only as a ranking signal;
        // never synthesize an original price or publish an unverified percentage as confirmed savings.
        let score = 35;
        score += Math.min(20, discountRate * 40);
        score += Math.min(10, commissionPercent * 0.8);
        score += sales >= 1000 ? 15 : sales >= 100 ? 10 : sales >= 20 ? 5 : 0;
        score += rating === null ? -2 : rating >= 4.7 ? 8 : rating >= 4.4 ? 6 : rating >= 4.0 ? 3 : rating >= 3.5 ? 0 : -8;
        score += title.length >= 18 ? 3 : 0;
        score += productUrl && affiliateUrl && imageUrl ? 6 : 0;
        score = Math.max(0, Math.min(100, Math.round(score)));
        const reasons = [];
        if (discountRate > 0) reasons.push('desconto anunciado pela API (não confirmado por histórico)');
        if (commissionPercent > 0) reasons.push('comissão informada pela Shopee');
        if (sales >= 20) reasons.push('popularidade informada pela Shopee');
        if (rating !== null) reasons.push('avaliação Shopee: ' + rating.toFixed(1) + '/5');
        if (productUrl && affiliateUrl && imageUrl) reasons.push('link, link de afiliado e imagem presentes');
        const fp = await fingerprint({source:'SHOPEE',externalId:clean(p.itemId,80),productUrl,title});
        const classified = classifyProduct({title});
        const category = cats.find(c=>c.name.toLowerCase()===String(classified.category||'').toLowerCase()) || cats.find(c=>c.name.toLowerCase().includes('gerais'));
        candidates.push({p,title,productUrl,affiliateUrl,imageUrl,currentPrice,commissionPercent,discountRate,sales,score,reasons,fp,classified,category});
      }

      // Rank the full candidate batch first; the cap applies only after comparison and duplicate checks.
      candidates.sort((a,b) => b.score-a.score || b.sales-a.sales || b.commissionPercent-a.commissionPercent || a.currentPrice-b.currentPrice || a.title.localeCompare(b.title,'pt-BR'));
      for (const candidate of candidates) {
        if (importedForAccount >= 3) break;
        const {p,title,productUrl,affiliateUrl,imageUrl,currentPrice,score,fp,classified,category,reasons} = candidate;
        const exists = await db.query('SELECT id,current_price,original_price FROM offers WHERE account_id=$1 AND fingerprint=$2 LIMIT 1',[row.account_id,fp]);
        if (exists.rows.length) {
          const existing = exists.rows[0];
          if (imageUrl) {
            await db.query("UPDATE offers SET image_url=$1,updated_at=now() WHERE id=$2 AND account_id=$3 AND source='SHOPEE' AND status IN ('PENDING','APPROVED','PUBLISHED')",[imageUrl,existing.id,row.account_id]);
            await db.query("UPDATE publications SET image_url=$1 WHERE account_id=$2 AND offer_id=$3 AND status IN ('READY','RETRY')",[imageUrl,row.account_id,existing.id]);
          }
          if (Number(existing.current_price)===currentPrice && existing.original_price===null) {
            await db.query("INSERT INTO offer_price_history(id,account_id,offer_id,price,original_price,source_type,source_reference,verified_at) SELECT $1,$2,$3,$4,NULL,'OFFICIAL_API',$5,now() WHERE NOT EXISTS(SELECT 1 FROM offer_price_history WHERE account_id=$2 AND offer_id=$3 AND source_type='OFFICIAL_API' AND verified_at>now()-interval '24 hours' AND price=$4 AND original_price IS NULL)",[crypto.randomUUID(),row.account_id,existing.id,currentPrice,'SHOPEE:'+clean(p.itemId,80)]);
          }
          totals.duplicates++; continue;
        }
        let trackedAffiliateUrl = affiliateUrl;
        let subIdNote = 'sub_ids_generation_failed';
        try {
          const tracked = await createTrackedLink(creds,productUrl,p.itemId,category?.name||classified.category||'GERAIS');
          trackedAffiliateUrl = tracked.shortLink;
          subIdNote = 'shopee_sub_ids='+tracked.subIds.join(',');
        } catch (linkError) {
          console.error('shopee tracked link fallback',String(linkError?.message||'ERROR').slice(0,80));
        }
        // Do not fabricate an original price from the advertised discount. Until historical evidence exists,
        // store no original price and publish no unverified % OFF.
        const originalPrice = null;
        const discount = 0;
        const promo = formatPromo({title,source:'SHOPEE',category:category?.name||'',currentPrice,originalPrice:0,affiliateUrl:trackedAffiliateUrl,imageUrl});
        const offerId = crypto.randomUUID();
        const inserted = await db.query("INSERT INTO offers(id,account_id,title,source,original_price,current_price,category_id,affiliate_url,image_url,product_url,coupon_url,coupon_code,discount_percent,score,status,message,fingerprint,validation_status,imported_by,storefront_visible) VALUES($1,$2,$3,'SHOPEE',$4,$5,$6,$7,$8,$9,NULL,NULL,$10,$11,'APPROVED',$12,$13,'VALIDATED','AUTO',false) ON CONFLICT DO NOTHING RETURNING id",[offerId,row.account_id,title,originalPrice,currentPrice,category?.id||null,trackedAffiliateUrl,imageUrl,productUrl,discount,score,promo.message,fp]);
        if (!inserted.rows.length) { totals.duplicates++; continue; }
        try {
          await db.query("INSERT INTO offer_price_history(id,account_id,offer_id,price,original_price,source_type,source_reference,verified_at) VALUES($1,$2,$3,$4,$5,'OFFICIAL_API',$6,now())",[crypto.randomUUID(),row.account_id,offerId,currentPrice,originalPrice,'SHOPEE:'+clean(p.itemId,80)]);
          const scoreReason = 'radar_score='+score+'; '+reasons.join('; ')+'; '+subIdNote;
          await db.query('UPDATE offers SET subcategory=$1,classification_tags=$2::jsonb,classification_confidence=$3,classification_status=$4,classification_reason=$5,source_category=$6 WHERE id=$7 AND account_id=$8',[classified.subcategory,JSON.stringify(classified.tags||[]),classified.confidence||0,classified.needsReview?'REVIEW':'AUTO',(classified.reason||'official_shopee_api')+'; '+scoreReason,clean(p.shopId,80),offerId,row.account_id]);
          totals.imported++; importedForAccount++;
        } catch (e) {
          await db.query("UPDATE offers SET status='PENDING',validation_status='NEEDS_REVIEW' WHERE id=$1 AND account_id=$2",[offerId,row.account_id]);
          totals.failed++;
        }
      }
      await db.query("UPDATE marketplace_api_credentials SET last_checked_at=now(),last_error='',updated_at=now() WHERE account_id=$1 AND marketplace='SHOPEE'",[row.account_id]);
      if (importedForAccount) {
        try { await scheduler.now('/api/jobs/autopilot'); totals.autopilotRuns++; }
        catch (e) { console.error('shopee autopilot trigger failed',String(e?.code||e?.name||'ERROR').slice(0,60)); }
      }
    } catch (e) {
      totals.failed++;
      const code = String(e?.message||'').slice(0,100);
      await db.query("UPDATE marketplace_api_credentials SET last_error=$2,updated_at=now() WHERE account_id=$1 AND marketplace='SHOPEE'",[row.account_id,code]);
      console.error('shopee ingestion failed',code);
    }
  }
  return res.json({ok:totals.failed===0,...totals,note:'A importação e a fila são automáticas; somente produtos com preço/desconto, imagem, link de afiliado e comissão válidos entram no fluxo. Publicação depende das regras e destinos ativos da conta.'});
}