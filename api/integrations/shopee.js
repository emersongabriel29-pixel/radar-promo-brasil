import { config, db } from 'hatchable';
import { normalizeShopeeSales, upsertAffiliateSales } from 'lib/affiliate-sales.js';
import { persistDiscoveryPage } from 'lib/affiliate-discovery.js';
import { normalizeShopeeDatafeedId } from 'lib/shopee-feed.js';
import { fingerprint, offerScore } from 'lib/automation.js';
import { classifyProduct } from 'lib/category-classifier.js';
import { isMedicationProduct } from 'lib/product-safety.js';
// API catalog items are not filtered by product category.
import { formatPromo } from 'lib/promo-message.js';

export const access = 'member';
export const methods = ['GET', 'POST'];

const API_URL = 'https://open-api.affiliate.shopee.com.br/graphql';
const clean = (value, max = 200) => String(value ?? '').trim().slice(0, max);
const discoveryCategories = new Set(['bebe-maternidade','casa-decoracao','cozinha-utensilios','beleza-cuidados','moda-feminina','moda-masculina','eletronicos-acessorios','informatica-celulares','pet-shop','ferramentas-utilidades']);
const fromB64 = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));
const hex = bytes => Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');

async function getAccount(member) {
  return (await db.query("SELECT id FROM accounts WHERE owner_member_id=$1 AND status='ACTIVE' LIMIT 1", [String(member.id)])).rows[0];
}

async function getCredentials(accountId) {
  const row = (await db.query(
    "SELECT credentials_enc,nonce,status FROM marketplace_api_credentials WHERE account_id=$1 AND marketplace='SHOPEE' LIMIT 1",
    [accountId]
  )).rows[0];
  if (!row) return null;
  let master = String(await config.get('API_CREDENTIALS_MASTER_KEY') || '');
  if (master.length < 32) master = String(await config.get('CONNECTOR_ENCRYPTION_KEY') || '');
  if (master.length < 32) throw Object.assign(new Error('Configure API_CREDENTIALS_MASTER_KEY ou CONNECTOR_ENCRYPTION_KEY nos segredos do projeto.'), { status: 412 });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(master + '|radar-marketplace-credentials|' + accountId + '|SHOPEE'));
  const key = await crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(row.nonce) }, key, fromB64(row.credentials_enc));
  return { credentials: JSON.parse(new TextDecoder().decode(plain)), status: row.status };
}

async function signedRequest(credentials, payload) {
  const appId = clean(credentials.appId, 200);
  const secret = clean(credentials.apiSecret, 4096);
  if (!appId || !secret) throw Object.assign(new Error('Cadastre App ID e App Secret emitidos pela Open API de Afiliados Shopee.'), { status: 412 });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const body = JSON.stringify(payload);
  const signature = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(appId + timestamp + body + secret)));
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      authorization: 'SHA256 Credential=' + appId + ', Timestamp=' + timestamp + ', Signature=' + signature
    },
    body,
    signal: AbortSignal.timeout(12000)
  });
  const raw = await response.text();
  let result;
  try { result = raw ? JSON.parse(raw) : {}; } catch { throw Object.assign(new Error('A API Shopee retornou uma resposta não JSON.'), { status: 502 }); }
  if (!response.ok || (Array.isArray(result.errors) && result.errors.length)) {
    const apiCode = clean(result?.errors?.[0]?.extensions?.code || result?.errors?.[0]?.extensions?.message || '', 60);
    const apiPath = Array.isArray(result?.errors?.[0]?.path) ? result.errors[0].path.join('.') : '';
    throw Object.assign(new Error('A Shopee recusou a operação (HTTP ' + response.status + (apiCode ? ', código ' + apiCode : '') + (apiPath ? ', campo ' + apiPath : '') + '). Detalhe: ' + clean(result?.errors?.[0]?.message || 'Confira permissões e parâmetros da Open API.', 220)), { status: 502 });
  }
  return result;
}

async function auditShopee(accountId, operation, status, returnedCount = 0, pageCount = 1, details = {}) {
  try { await db.query("INSERT INTO marketplace_api_audit(account_id,marketplace,operation,status,returned_count,page_count,details) VALUES($1,'SHOPEE',$2,$3,$4,$5,$6::jsonb)", [accountId, operation, status, Math.max(0, Number(returnedCount) || 0), Math.max(0, Number(pageCount) || 0), JSON.stringify({ readOnly: true, ...details })]); } catch (error) { console.warn('Shopee audit log failed:', String(error?.message || error).slice(0, 120)); }
}

function safeOfferRows(kind, result) {
  const root = result?.data?.[kind] || {};
  const nodes = Array.isArray(root.nodes) ? root.nodes : [];
  return {
    items: nodes.map(item => ({
      name: clean(item.productName || item.shopName || item.brandName || item.offerName, 300),
      itemId: clean(item.itemId, 80),
      shopId: clean(item.shopId, 80),
      url: typeof (item.offerLink || item.productLink) === 'string' && /^https:\/\//i.test(item.offerLink || item.productLink) ? String(item.offerLink || item.productLink).slice(0, 2000) : '',
      originalUrl: typeof (item.originalLink || item.productLink) === 'string' && /^https:\/\//i.test(item.originalLink || item.productLink) ? String(item.originalLink || item.productLink).slice(0, 2000) : '',
      price: item.priceMin == null ? null : Number(item.priceMin),
      maxPrice: item.priceMax == null ? null : Number(item.priceMax),
      discountRate: item.priceDiscountRate == null ? null : Number(item.priceDiscountRate),
      imageUrl: typeof item.imageUrl === 'string' && /^https:\/\//i.test(item.imageUrl) ? item.imageUrl.slice(0, 2000) : '',
      commissionRate: item.commissionRate == null ? null : Number(item.commissionRate),
      sellerCommissionRate: item.sellerCommissionRate == null ? null : Number(item.sellerCommissionRate),
      shopeeCommissionRate: item.shopeeCommissionRate == null ? null : Number(item.shopeeCommissionRate),
      estimatedCommission: item.commission == null ? null : Number(item.commission),
      sales: item.sales == null ? null : Number(item.sales),
      rating: item.ratingStar == null ? null : Number(item.ratingStar),
      shopName: clean(item.shopName, 200),
      shopType: item.shopType == null ? null : Number(item.shopType),
      offerType: item.offerType == null ? null : Number(item.offerType),
      categoryId: item.categoryId == null ? null : String(item.categoryId),
      productCatIds: Array.isArray(item.productCatIds) ? item.productCatIds.map(value => String(value)).filter(value => /^\d+$/.test(value)).slice(0, 3) : [],
      collectionId: item.collectionId == null ? null : String(item.collectionId),
      periodStartTime: item.periodStartTime == null ? null : Number(item.periodStartTime),
      periodEndTime: item.periodEndTime == null ? null : Number(item.periodEndTime),
      remainingBudget: item.remainingBudget == null ? null : Number(item.remainingBudget),
      sellerCommissionCoverageRatio: item.sellerCommCoveRatio == null ? null : Number(item.sellerCommCoveRatio)
    })),
    pageInfo: root.pageInfo ? {
      page: Number(root.pageInfo.page) || 1,
      limit: Number(root.pageInfo.limit) || nodes.length,
      hasNextPage: Boolean(root.pageInfo.hasNextPage),
      scrollId: clean(root.pageInfo.scrollId, 1000) || null
    } : null
  };
}

export default async function handler(req, res) {
  if (!req.member) return res.status(401).json({ error: 'Entre para acessar a integração Shopee.' });
  let auditAccountId = null;
  let auditOperation = '';
  try {
    const account = await getAccount(req.member);
    if (!account) return res.status(412).json({ error: 'Abra o painel uma vez para criar sua conta.' });
    if (req.method === 'GET') {
      const saved = await getCredentials(account.id);
      return res.json({
        provider: 'SHOPEE',
        status: saved?.status || 'NOT_CONFIGURED',
        capabilities: ['product_offers', 'shop_offers', 'shopee_campaign_offers', 'affiliate_short_links', 'batch_affiliate_links', 'conversion_reports', 'validated_reports', 'catalog_feeds'],
        readOnlyTest: true,
        publicationEnabled: false
      });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
    const saved = await getCredentials(account.id);
    if (!saved) return res.status(412).json({ error: 'Cadastre as credenciais da Shopee no painel antes de usar a API.' });
    const credentials = saved.credentials || {};
    const action = clean(req.body?.action, 40).toLowerCase();
    auditAccountId = account.id;
    auditOperation = action;
    let result;
    if (action === 'audit_history') {
      const items = (await db.query("SELECT operation,status,returned_count,total_available,page_count,checked_at,details FROM marketplace_api_audit WHERE account_id=$1 AND marketplace='SHOPEE' ORDER BY checked_at DESC LIMIT 30", [account.id])).rows;
      return res.json({ items, count: items.length, readOnly: true });
    }

    if (action === 'category_validation_status') {
      const rows = (await db.query(
        'SELECT category_id,category_name,full_name,category_level,validation_status,sample_count,matched_count,last_error,last_checked_at FROM shopee_category_api_validation WHERE account_id=$1 ORDER BY full_name',
        [account.id]
      )).rows;
      const summary = rows.reduce((out,row) => { out[row.validation_status]=(out[row.validation_status]||0)+1; return out; }, {});
      return res.json({ items: rows, summary, total: rows.length, readOnly: true });
    }

    if (action === 'category_validate_batch') {
      if (saved.status !== 'VALIDATED') return res.status(412).json({ error: 'Valide a credencial Shopee antes de testar categorias.' });
      const requested = Array.isArray(req.body?.categories) ? req.body.categories.slice(0,3) : [];
      if (!requested.length) return res.status(400).json({ error: 'Envie de 1 a 3 categorias do catálogo Seller Center.' });
      const query = 'query($sortType: Int, $page: Int, $limit: Int, $productCatId: Int) { productOfferV2(sortType: $sortType, page: $page, limit: $limit, productCatId: $productCatId) { nodes { itemId productName sales ratingStar productCatIds } pageInfo { page limit hasNextPage } } }';
      const results = [];
      for (let index=0; index<requested.length; index++) {
        const category = requested[index] || {};
        const categoryId = String(category.categoryId || '').trim();
        const categoryName = clean(category.name,180);
        const fullName = clean(category.fullName || category.name,500);
        const level = Math.min(10,Math.max(1,Math.floor(Number(category.level)||1)));
        if (!/^\d{1,12}$/.test(categoryId) || !categoryName) {
          results.push({ categoryId, status:'INVALID_INPUT', error:'ID ou nome de categoria inválido.' });
          continue;
        }
        try {
          const response = await signedRequest(credentials,{query,variables:{sortType:2,page:1,limit:10,productCatId:Number(categoryId)}});
          const root = response?.data?.productOfferV2 || {};
          const products = Array.isArray(root.nodes) ? root.nodes : [];
          const matched = products.filter(product => Array.isArray(product.productCatIds) && product.productCatIds.map(String).includes(categoryId)).length;
          const validationStatus = matched > 0 ? 'CONFIRMED' : 'ACCEPTED_EMPTY';
          await db.query(
            'INSERT INTO shopee_category_api_validation(account_id,category_id,category_name,full_name,category_level,validation_status,sample_count,matched_count,last_error,last_checked_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,\'\',now(),now()) ON CONFLICT(account_id,category_id) DO UPDATE SET category_name=EXCLUDED.category_name,full_name=EXCLUDED.full_name,category_level=EXCLUDED.category_level,validation_status=EXCLUDED.validation_status,sample_count=EXCLUDED.sample_count,matched_count=EXCLUDED.matched_count,last_error=\'\',last_checked_at=now(),updated_at=now()',
            [account.id,categoryId,categoryName,fullName,level,validationStatus,products.length,matched]
          );
          results.push({categoryId,name:categoryName,fullName,level,status:validationStatus,sampleCount:products.length,matchedCount:matched,hasNextPage:Boolean(root.pageInfo?.hasNextPage)});
        } catch (error) {
          const message = clean(error?.message || 'Falha na consulta.',220);
          const rateLimited = /429|rate.?limit|too many|10030/i.test(message);
          const rejected = /productCatId.*(invalid|not found|unsupported)|invalid.*productCatId/i.test(message);
          const validationStatus = rateLimited ? 'RATE_LIMITED' : rejected ? 'REJECTED' : 'ERROR';
          await db.query(
            'INSERT INTO shopee_category_api_validation(account_id,category_id,category_name,full_name,category_level,validation_status,sample_count,matched_count,last_error,last_checked_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,0,0,$7,now(),now()) ON CONFLICT(account_id,category_id) DO UPDATE SET category_name=EXCLUDED.category_name,full_name=EXCLUDED.full_name,category_level=EXCLUDED.category_level,validation_status=EXCLUDED.validation_status,last_error=EXCLUDED.last_error,last_checked_at=now(),updated_at=now()',
            [account.id,categoryId,categoryName,fullName,level,validationStatus,message]
          );
          results.push({categoryId,name:categoryName,status:validationStatus,error:message});
          if (rateLimited) break;
        }
      }
      const totals = results.reduce((out,row)=>{out[row.status]=(out[row.status]||0)+1;return out;},{});
      await auditShopee(account.id,'category_validate_batch',results.some(row=>row.status==='ERROR'||row.status==='RATE_LIMITED')?'PARTIAL':'OK',results.reduce((n,row)=>n+(row.matchedCount||0),0),results.length,{requested:requested.length,totals});
      return res.json({results,totals,processed:results.length,requested:requested.length,readOnly:true,publicationEnabled:false,note:'CONFIRMED exige ao menos um produto retornado cujo productCatIds contenha o ID testado. ACCEPTED_EMPTY significa que a API aceitou a consulta, mas a amostra não comprovou correspondência; não é confirmação de categoria ativa.'});
    }

    if (action === 'test') {
      const payload = {
        query: 'query { productOfferV2(keyword: "phone", sortType: 1, page: 1, limit: 1) { nodes { itemId shopId shopName shopType productName productLink offerLink imageUrl priceMin priceMax priceDiscountRate commissionRate sellerCommissionRate shopeeCommissionRate commission sales ratingStar periodStartTime periodEndTime } pageInfo { page limit hasNextPage } } }'
      };
      result = await signedRequest(credentials, payload);
      if (!result?.data?.productOfferV2 || result?.errors?.length) throw Object.assign(new Error('A API autenticou, mas a consulta de ofertas não retornou o formato esperado.'), { status: 502 });
      await db.query("UPDATE marketplace_api_credentials SET status='VALIDATED',last_checked_at=now(),last_error='',updated_at=now() WHERE account_id=$1 AND marketplace='SHOPEE'", [account.id]);
      await auditShopee(account.id, 'productOfferV2_auth_test', 'OK', Array.isArray(result.data.productOfferV2.nodes) ? result.data.productOfferV2.nodes.length : 0, 1, { validation: 'read_only' });
      return res.json({ ok: true, status: 'VALIDATED', test: 'read_only_product_offer', itemsReturned: Array.isArray(result.data.productOfferV2.nodes) ? result.data.productOfferV2.nodes.length : 0, publicationEnabled: false, note: 'Autenticação validada por consulta somente leitura. Nenhuma oferta foi publicada e nenhum link foi criado.' });
    }


    if (action === 'import_offers') {
      const kind = clean(req.body?.kind || 'product',20).toLowerCase();
      if (kind !== 'product') return res.status(400).json({error:'A importação automática aceita somente ofertas de produto com preço, imagem e link de afiliado.'});
      const keyword = clean(req.body?.keyword || 'ofertas',80).replace(/[\r\n]/g,' ').trim();
      const limit = Math.min(100,Math.max(1,Math.floor(Number(req.body?.limit)||30)));
      const page = Math.min(1000,Math.max(1,Math.floor(Number(req.body?.page)||1)));
      const query = 'query($keyword: String, $sortType: Int, $page: Int, $limit: Int) { productOfferV2(keyword: $keyword, sortType: $sortType, page: $page, limit: $limit) { nodes { itemId shopId shopName productName productLink offerLink imageUrl priceMin priceMax priceDiscountRate commissionRate sellerCommissionRate shopeeCommissionRate commission sales ratingStar } pageInfo { page limit hasNextPage } } }';
      result = await signedRequest(credentials,{query,variables:{keyword,sortType:5,page,limit}});
      const normalized = safeOfferRows('productOfferV2',result);
      const categories = (await db.query('SELECT id,name FROM categories WHERE account_id=$1 ORDER BY name',[account.id])).rows;
      const imported=[], skipped=[];
      for (const item of normalized.items) {
        const title=clean(item.name,220), productUrl=clean(item.originalUrl,2000), affiliateUrl=clean(item.url,2000), imageUrl=clean(item.imageUrl,1500);
        const currentPrice=Math.round(Number(item.price)*100), originalPrice=Math.round(Number(item.maxPrice)*100);
        let productHost='', affiliateHost='';
        try { const parsed=new URL(productUrl); if(parsed.protocol==='https:') productHost=parsed.hostname.toLowerCase(); } catch {}
        try { const parsed=new URL(affiliateUrl); if(parsed.protocol==='https:') affiliateHost=parsed.hostname.toLowerCase(); } catch {}
        let reason='';
        if(isMedicationProduct({title,productUrl})) reason='Medicamentos e produtos farmacêuticos são bloqueados pela política do Radar.';
        else if(!title||!item.itemId) reason='Produto sem título ou identificador.';
        else if(!(productHost==='shopee.com.br'||productHost.endsWith('.shopee.com.br'))) reason='Link original não pertence à Shopee Brasil.';
        else if(!(affiliateHost==='shope.ee'||affiliateHost.endsWith('.shopee.com.br'))) reason='Link de afiliado Shopee ausente ou inválido.';
        else if(!/^https:\/\//i.test(imageUrl)) reason='Imagem ausente.';
        else if(!Number.isSafeInteger(currentPrice)||currentPrice<=0||!Number.isSafeInteger(originalPrice)||originalPrice<=currentPrice) reason='Preço ou desconto verificável ausente.';
        // No internal category exclusion.
        if(reason){skipped.push({itemId:item.itemId,title,reason});continue;}
        const classification=classifyProduct({title});
        const category=categories.find(x=>x.name.toLowerCase()===String(classification.category||'').toLowerCase())||categories.find(x=>x.name.toLowerCase().includes('gerais'))||null;
        const fp=await fingerprint({source:'SHOPEE',externalId:item.itemId,productUrl,title,sellerId:item.shopId||item.merchantId||'',sellerName:item.shopName||'',currentPrice,originalPrice,variant:item.modelId||item.modelName||''});
        const discount=Math.round((originalPrice-currentPrice)*100/originalPrice);
        const score=offerScore({title,currentPrice,originalPrice});
        const promo=formatPromo({title,source:'SHOPEE',category:classification.category,currentPrice,originalPrice,affiliateUrl,imageUrl,productUrl});
        const savedOffer=await db.query(
          "INSERT INTO offers(id,account_id,title,source,original_price,current_price,category_id,affiliate_url,image_url,product_url,coupon_url,coupon_code,discount_percent,score,status,message,fingerprint,validation_status,imported_by,storefront_visible,subcategory,classification_tags,classification_confidence,classification_status,classification_reason,source_category) VALUES($1,$2,$3,'SHOPEE',$4,$5,$6,$7,$8,$9,NULL,NULL,$10,$11,'PENDING',$12,$13,'VALIDATED','SHOPEE_AFFILIATE_API',false,$14,$15::jsonb,$16,'REVIEW','Imported as draft; human review required',NULL) ON CONFLICT DO NOTHING RETURNING id",
          [crypto.randomUUID(),account.id,title,originalPrice,currentPrice,category?.id||null,affiliateUrl,imageUrl,productUrl,discount,score,promo.message,fp,classification.subcategory||null,JSON.stringify(classification.tags||[]),classification.confidence||0]
        );
        if(!savedOffer.rows.length){skipped.push({itemId:item.itemId,title,reason:'Produto duplicado.'});continue;}
        const offerId=savedOffer.rows[0].id;
        await db.query("INSERT INTO offer_price_history(id,account_id,offer_id,price,original_price,source_type,source_reference,verified_at) VALUES($1,$2,$3,$4,$5,'OFFICIAL_API',$6,now())",[crypto.randomUUID(),account.id,offerId,currentPrice,originalPrice,'SHOPEE:'+item.itemId]);
        imported.push({offerId,itemId:item.itemId,title,currentPrice:currentPrice/100,originalPrice:originalPrice/100,discountPercent:discount,status:'PENDING_REVIEW',priceVerified:true});
      }
      await db.query("UPDATE marketplace_api_credentials SET status='VALIDATED',last_checked_at=now(),last_error='',updated_at=now() WHERE account_id=$1 AND marketplace='SHOPEE'",[account.id]);
      return res.json({ok:true,action:'import_offers',imported:imported.length,skipped:skipped.length,items:imported,skippedItems:skipped,reviewRequired:true,autopilotTriggered:false,publicationTriggered:false,note:'Ofertas Shopee importadas como rascunhos com preço oficial e link de afiliado. A publicação depende de aprovação humana e das regras do canal.'});
    }
    if (action === 'category_catalog') {
      const page = Math.min(1000, Math.max(1, Math.floor(Number(req.body?.page) || 1)));
      const limit = Math.min(50, Math.max(1, Math.floor(Number(req.body?.limit) || 50)));
      const keyword = clean(req.body?.keyword || '', 80).replace(/[\\r\\n]/g, ' ').trim();
      const query = 'query($keyword: String, $sortType: Int, $page: Int, $limit: Int) { productOfferV2(keyword: $keyword, sortType: $sortType, page: $page, limit: $limit) { nodes { itemId productName shopId shopName sales ratingStar productCatIds } pageInfo { page limit hasNextPage } } }';
      const variables = { sortType: 2, page, limit, ...(keyword ? { keyword } : {}) };
      let categoryResult;
      try {
        categoryResult = await signedRequest(credentials, { query, variables });
      } catch (error) {
        const detail = String(error?.message || '');
        if (/productCatIds|Cannot query field|Unknown field/i.test(detail)) {
          return res.status(501).json({ code: 'SHOPEE_CATEGORY_IDS_UNAVAILABLE', error: 'A API brasileira recusou productCatIds nesta consulta. Não é possível declarar a árvore completa com a credencial atual.', detail: detail.slice(0, 220), readOnly: true });
        }
        throw error;
      }
      const root = categoryResult?.data?.productOfferV2 || {};
      const products = Array.isArray(root.nodes) ? root.nodes : [];
      const ids = new Map();
      for (const product of products) {
        for (const id of Array.isArray(product.productCatIds) ? product.productCatIds : []) {
          const value = String(id);
          if (!/^\d+$/.test(value)) continue;
          const current = ids.get(value) || { categoryId: value, productsObserved: 0 };
          current.productsObserved++;
          ids.set(value, current);
        }
      }
      const categories = [...ids.values()].sort((a,b) => Number(a.categoryId)-Number(b.categoryId));
      const shouldPersist = req.body?.persistDiscovery === true || req.body?.persistDiscovery === 'true';
      let discovery = null;
      if (shouldPersist && saved.status === 'VALIDATED') {
        discovery = await persistDiscoveryPage(db, { accountId: account.id, marketplace: 'SHOPEE', operation: 'productOfferV2_category_scan', kind: 'PRODUCT', items: products.map(item => ({ ...item, name: item.productName, externalId: item.itemId, sales: item.sales, rating: item.ratingStar })), cursorIn: String(page), cursorOut: root.pageInfo?.hasNextPage ? String(page+1) : null, sourceKeyword: keyword || '__category_catalog__' });
      }
      await auditShopee(account.id, 'productOfferV2_category_scan', 'OK', products.length, 1, { categoryIdsObserved: categories.length, persisted: Boolean(discovery) });
      return res.json({ report: 'shopee_category_id_discovery', categories, categoryIds: categories.map(item => item.categoryId), productsScanned: products.length, pageInfo: root.pageInfo || null, discovery, taxonomyComplete: false, note: 'IDs observados nos produtos retornados pela Open API de Afiliados. A API não forneceu nomes nem árvore completa nesta operação; use productCatId para consultar uma categoria cujo ID já foi identificado.', readOnly: true, publicationEnabled: false });
    }

    if (action === 'offers') {
      const kindMap = { product: 'productOfferV2', shop: 'shopOfferV2', shopee: 'shopeeOfferV2', brand: 'brandOfferV2' };
      const kind = kindMap[clean(req.body?.kind, 20).toLowerCase()];
      if (!kind) return res.status(400).json({ error: 'Escolha ofertas de produto, loja, campanha ou marca Shopee.' });
      if (kind === 'brandOfferV2') return res.status(501).json({ code: 'SHOPEE_BRAND_OFFERS_UNAVAILABLE', error: 'A Open API brasileira desta conexão não expõe brandOfferV2 e o endpoint brandOffer legado está descontinuado. A descoberta continua disponível por produto, loja e campanha.' });
      const keyword = clean(req.body?.keyword || 'phone', 80).replace(/[\r\n]/g, ' ').trim() || 'phone';
      // The documented offer endpoints support large pages. Keep the default useful for interactive use,
      // while allowing authorized callers to request up to 500 records per page.
      const limit = Math.min(500, Math.max(1, Math.floor(Number(req.body?.limit) || 50)));
      const page = Math.min(1000, Math.max(1, Math.floor(Number(req.body?.page) || 1)));
      const requestedSort = Math.floor(Number(req.body?.sortType) || (kind === 'productOfferV2' ? 5 : 2));
      const sortType = Math.min(5, Math.max(1, requestedSort));
      const variables = { keyword, sortType, page, limit };
      let query;
      if (kind === 'productOfferV2') {
        const productCatId = String(req.body?.productCatId || '').trim();
        const listType = Math.min(2, Math.max(0, Math.floor(Number(req.body?.listType) || 0)));
        const shopId = String(req.body?.shopId || '').trim();
        const itemId = String(req.body?.itemId || '').trim();
        const isAMSOffer = req.body?.isAMSOffer === true || req.body?.isAMSOffer === 'true';
        const isKeySeller = req.body?.isKeySeller === true || req.body?.isKeySeller === 'true';
        query = 'query($keyword: String, $listType: Int, $sortType: Int, $page: Int, $limit: Int, $shopId: Int64, $itemId: Int64, $productCatId: Int, $isAMSOffer: Boolean, $isKeySeller: Boolean) { productOfferV2(keyword: $keyword, listType: $listType, sortType: $sortType, page: $page, limit: $limit, shopId: $shopId, itemId: $itemId, productCatId: $productCatId, isAMSOffer: $isAMSOffer, isKeySeller: $isKeySeller) { nodes { itemId shopId shopName shopType productName productLink offerLink imageUrl priceMin priceMax priceDiscountRate commissionRate sellerCommissionRate shopeeCommissionRate commission sales ratingStar productCatIds periodStartTime periodEndTime } pageInfo { page limit hasNextPage } } }';
        variables.listType = listType;
        if (/^\d+$/.test(shopId)) variables.shopId = shopId;
        if (/^\d+$/.test(itemId)) variables.itemId = itemId;
        if (/^\d+$/.test(productCatId)) variables.productCatId = Number(productCatId);
        if (req.body?.isAMSOffer !== undefined && req.body?.isAMSOffer !== '') variables.isAMSOffer = isAMSOffer;
        if (req.body?.isKeySeller !== undefined && req.body?.isKeySeller !== '') variables.isKeySeller = isKeySeller;
      } else if (kind === 'shopOfferV2') {
        const shopType = Array.isArray(req.body?.shopType) ? req.body.shopType.map(Number).filter(n => [1,2,4].includes(n)) : [];
        const isKeySeller = req.body?.isKeySeller === true || req.body?.isKeySeller === 'true';
        query = 'query($keyword: String, $sortType: Int, $page: Int, $limit: Int, $shopType: [Int!], $isKeySeller: Boolean) { shopOfferV2(keyword: $keyword, sortType: $sortType, page: $page, limit: $limit, shopType: $shopType, isKeySeller: $isKeySeller) { nodes { shopName shopId offerLink commissionRate ratingStar shopType imageUrl remainingBudget sellerCommCoveRatio periodStartTime periodEndTime } pageInfo { page limit hasNextPage } } }';
        if (shopType.length) variables.shopType = shopType;
        if (req.body?.isKeySeller !== undefined && req.body?.isKeySeller !== '') variables.isKeySeller = isKeySeller;
      } else if (kind === 'brandOfferV2') {
        query = 'query($keyword: String, $sortType: Int, $page: Int, $limit: Int) { brandOfferV2(keyword: $keyword, sortType: $sortType, page: $page, limit: $limit) { nodes { brandId brandName commissionRate imageUrl offerLink originalLink periodStartTime periodEndTime } pageInfo { page limit hasNextPage } } }';
        variables.keyword = keyword;
        variables.sortType = sortType;
      } else {
        query = 'query($keyword: String, $sortType: Int, $page: Int, $limit: Int) { shopeeOfferV2(keyword: $keyword, sortType: $sortType, page: $page, limit: $limit) { nodes { offerName offerLink originalLink imageUrl commissionRate offerType categoryId collectionId periodStartTime periodEndTime } pageInfo { page limit hasNextPage } } }';
      }
      const shouldPersist=req.body?.persistDiscovery===true||req.body?.persistDiscovery==='true';
      const categorySlug=clean(req.body?.categorySlug,60);
      if(shouldPersist && categorySlug && !discoveryCategories.has(categorySlug))return res.status(400).json({error:'Categoria inválida para atribuição do catálogo.'});
      if(shouldPersist){
        if(saved.status!=='VALIDATED')return res.status(412).json({error:'Valide a credencial Shopee antes de persistir o catálogo.'});
        const discoveryKind=kind==='productOfferV2'?'PRODUCT':kind==='shopOfferV2'?'SHOP':kind==='brandOfferV2'?'BRAND':'CAMPAIGN';
        const maxPages=Math.min(5,Math.max(1,Math.floor(Number(req.body?.maxPages)||3)));
        let currentPage=page,pagesCompleted=0,hasNextPage=false,finalPageInfo=null;
        const allItems=[],discoveries=[];
        while(pagesCompleted<maxPages){
          const pageVariables={...variables,page:currentPage};
          const pageResult=await signedRequest(credentials,{query,variables:pageVariables});
          const pageNormalized=safeOfferRows(kind,pageResult);
          allItems.push(...pageNormalized.items);finalPageInfo=pageNormalized.pageInfo;
          hasNextPage=Boolean(finalPageInfo?.hasNextPage);
          discoveries.push(await persistDiscoveryPage(db,{accountId:account.id,marketplace:'SHOPEE',operation:kind,kind:discoveryKind,items:pageNormalized.items,cursorIn:String(currentPage),cursorOut:hasNextPage?String(currentPage+1):null,categorySlug:categorySlug||null,sourceKeyword:kind==='productOfferV2'&&variables.productCatId?'category_id:'+variables.productCatId:keyword}));
          pagesCompleted++;
          if(!hasNextPage)break;
          currentPage++;
        }
        await auditShopee(account.id, kind, 'OK', allItems.length, pagesCompleted, { persisted: true, categoryId: kind==='productOfferV2'?(variables.productCatId||null):null, nextPage: hasNextPage ? currentPage + 1 : null });
        return res.json({kind,items:allItems,pageInfo:{...finalPageInfo,page:currentPage,hasNextPage},discovery:discoveries,pagesCompleted,nextPage:hasNextPage?currentPage+1:null,readOnly:true,publicationEnabled:false});
      }
      result = await signedRequest(credentials, { query, variables });
      const normalized = safeOfferRows(kind, result);
      await auditShopee(account.id, kind, 'OK', normalized.items.length, 1, { persisted: false, page: normalized.pageInfo?.page || page });
      return res.json({ kind, ...normalized, readOnly: true, publicationEnabled: false });
    }

    if (action === 'batch_links') {
      const entries = Array.isArray(req.body?.items) ? req.body.items.slice(0, 20) : [];
      if (!entries.length) return res.status(400).json({ error: 'Envie uma lista de 1 a 20 URLs Shopee para gerar os links.' });
      const defaults = String(req.body?.subIds || '').split(',').map(value => clean(value, 50)).filter(value => /^[a-zA-Z0-9]+$/.test(value)).slice(0, 5);
      const output = [];
      for (const entry of entries) {
        const rawUrl = String(entry?.originUrl || entry?.url || '');
        let origin;
        try { origin = new URL(rawUrl); } catch { output.push({ originUrl: rawUrl.slice(0, 500), error: 'URL inválida.' }); continue; }
        if (origin.protocol !== 'https:' || !(origin.hostname === 'shopee.com.br' || origin.hostname.endsWith('.shopee.com.br'))) {
          output.push({ originUrl: rawUrl.slice(0, 500), error: 'A URL precisa pertencer a shopee.com.br.' }); continue;
        }
        const custom = Array.isArray(entry?.subIds) ? entry.subIds : defaults;
        const subIds = custom.map(value => clean(value, 50)).filter(value => /^[a-zA-Z0-9]+$/.test(value)).slice(0, 5);
        try {
          const query = 'mutation { generateShortLink(input: { originUrl: ' + JSON.stringify(origin.toString()) + ', subIds: ' + JSON.stringify(subIds) + ' }) { shortLink } }';
          const linkResult = await signedRequest(credentials, { query });
          const shortLink = linkResult?.data?.generateShortLink?.shortLink;
          if (typeof shortLink !== 'string' || !shortLink.startsWith('https://')) throw new Error('A Shopee não retornou um link válido.');
          output.push({ originUrl: origin.toString(), shortLink, subIds, created: true });
        } catch (error) {
          output.push({ originUrl: origin.toString(), error: String(error?.message || 'Falha ao gerar link.').slice(0, 220) });
        }
      }
      await auditShopee(account.id, 'generateShortLink_batch', 'OK', output.filter(item => item.created).length, 1, { requested: entries.length, failed: output.filter(item => !item.created).length, mutation: 'generateShortLink' });
      return res.json({ items: output, requested: entries.length, created: output.filter(item => item.created).length, failed: output.filter(item => !item.created).length, published: false, note: 'Geração em lote feita com chamadas individuais à mutation oficial generateShortLink; nenhum link foi publicado.' });
    }

    if (action === 'feeds') {
      const feedMode = clean(req.body?.feedMode, 10).toUpperCase();
      if (feedMode && !['FULL', 'DELTA'].includes(feedMode)) return res.status(400).json({ error: 'feedMode deve ser FULL ou DELTA.' });
      const query = 'query($feedMode: FeedMode) { listItemFeeds(feedMode: $feedMode) { feeds { datafeedId referenceId datafeedName description totalCount date feedMode } } }';
      result = await signedRequest(credentials, { query, variables: feedMode ? { feedMode } : {} });
      const root = result?.data?.listItemFeeds || {};
      await auditShopee(account.id, 'listItemFeeds', 'OK', Array.isArray(root.feeds) ? root.feeds.length : 0, 1, { feedMode: feedMode || 'ALL' });
      return res.json({ report: 'listItemFeeds', items: Array.isArray(root.feeds) ? root.feeds : [], readOnly: true });
    }

    if (action === 'feed_data') {
      const datafeedId = normalizeShopeeDatafeedId(req.body?.datafeedId);
      if (!datafeedId) return res.status(400).json({ error: 'Cole o datafeedId completo retornado por listItemFeeds (ID_FULL_YYYY-MM-DD ou ID_DELTA_YYYYMMDD).' });
      const offset = Math.min(1000000, Math.max(0, Math.floor(Number(req.body?.offset) || 0)));
      const limit = Math.min(500, Math.max(1, Math.floor(Number(req.body?.limit) || 100)));
      const query = 'query($datafeedId: String!, $offset: Int, $limit: Int) { getItemFeedData(datafeedId: $datafeedId, offset: $offset, limit: $limit) { rows { columns updateType } pageInfo { offset limit totalCount hasMore } } }';
      result = await signedRequest(credentials, { query, variables: { datafeedId, offset, limit } });
      const root = result?.data?.getItemFeedData || {};
      await auditShopee(account.id, 'getItemFeedData', 'OK', Array.isArray(root.rows) ? root.rows.length : 0, 1, { offset, limit, datafeedId });
      return res.json({ report: 'getItemFeedData', items: Array.isArray(root.rows) ? root.rows : [], pageInfo: root.pageInfo || null, readOnly: true });
    }

    if (action === 'create_link') {
      let origin;
      try { origin = new URL(String(req.body?.originUrl || '')); } catch { return res.status(400).json({ error: 'Informe uma URL de produto ou loja Shopee válida.' }); }
      if (origin.protocol !== 'https:' || !/(^|\.)shopee\.com\.br$/i.test(origin.hostname)) return res.status(400).json({ error: 'O link de origem precisa ser HTTPS e pertencer a shopee.com.br.' });
      const subIds = String(req.body?.subIds || '').split(',').map(value => clean(value, 50)).filter(Boolean).slice(0, 5);
      const escapedUrl = JSON.stringify(origin.toString());
      const escapedSubs = JSON.stringify(subIds);
      const query = 'mutation { generateShortLink(input: { originUrl: ' + escapedUrl + ', subIds: ' + escapedSubs + ' }) { shortLink } }';
      result = await signedRequest(credentials, { query });
      const shortLink = result?.data?.generateShortLink?.shortLink;
      if (typeof shortLink !== 'string' || !/^https:\/\//i.test(shortLink)) throw Object.assign(new Error('A Shopee não retornou um link de afiliado válido.'), { status: 502 });
      await auditShopee(account.id, 'generateShortLink', 'OK', 1, 1, { published: false });
      return res.json({ shortLink, created: true, published: false, note: 'Link criado pela API oficial, mas não foi publicado em nenhum canal.' });
    }

    if (action === 'conversions') {
      const now = Math.floor(Date.now() / 1000);
      const startInput = String(req.body?.startDate || '');
      const endInput = String(req.body?.endDate || '');
      const startDate = startInput ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(startInput) ? startInput + 'T00:00:00Z' : startInput) : new Date(Date.now() - 7 * 86400000);
      const endDate = endInput ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(endInput) ? endInput + 'T23:59:59Z' : endInput) : new Date();
      const start = Math.floor(startDate.getTime() / 1000);
      const end = Math.floor(endDate.getTime() / 1000);
      if (!Number.isFinite(start) || !Number.isFinite(end) || start <= 0 || end < start || end > now + 300 || end - start > 90 * 86400) return res.status(400).json({ error: 'Informe um período válido de até 90 dias, sem datas futuras.' });
      const limit = Math.min(100, Math.max(1, Math.floor(Number(req.body?.limit) || 20)));
      const scrollId = clean(req.body?.scrollId, 1000);
      const orderStatus = clean(req.body?.orderStatus, 20).toUpperCase();
      const buyerType = clean(req.body?.buyerType, 20).toUpperCase();
      const device = clean(req.body?.device, 10).toUpperCase();
      if (orderStatus && !['UNPAID','PENDING','COMPLETED','CANCELLED'].includes(orderStatus)) return res.status(400).json({ error: 'Status deve ser UNPAID, PENDING, COMPLETED ou CANCELLED.' });
      if (buyerType && !['NEW','EXISTING'].includes(buyerType)) return res.status(400).json({ error: 'Tipo de comprador deve ser NEW ou EXISTING.' });
      if (device && !['APP','WEB'].includes(device)) return res.status(400).json({ error: 'Dispositivo deve ser APP ou WEB.' });
      const syncRequested = req.body?.syncToLedger === true || req.body?.syncToLedger === 'true';
      const detailedQuery = 'query($start: Int64!, $end: Int64!, $limit: Int!, $scrollId: String, $orderStatus: DisplayOrderStatus, $buyerType: BuyerType, $device: DeviceType) { conversionReport(purchaseTimeStart: $start, purchaseTimeEnd: $end, orderStatus: $orderStatus, buyerType: $buyerType, device: $device, limit: $limit, scrollId: $scrollId) { nodes { conversionId clickTime purchaseTime totalCommission sellerCommission shopeeCommissionCapped buyerType device utmContent orders { orderId orderStatus items { itemId itemName shopName itemPrice qty itemTotalCommission } } } pageInfo { limit hasNextPage scrollId } } }';
      const summaryQuery = 'query($start: Int64!, $end: Int64!, $limit: Int!) { conversionReport(purchaseTimeStart: $start, purchaseTimeEnd: $end, limit: $limit) { nodes { conversionId } } }';
      const query = syncRequested ? detailedQuery : summaryQuery;
      const maxPages = Math.min(5, Math.max(1, Math.floor(Number(req.body?.maxPages) || 3)));
      let currentScrollId = clean(req.body?.scrollId, 1000), pagesCompleted = 0, hasMore = false;
      const conversionItems = [];
      while (pagesCompleted < maxPages) {
        const pageResult = await signedRequest(credentials, { query, variables: { start: String(start), end: String(end), limit, ...(currentScrollId ? { scrollId: currentScrollId } : {}), ...(orderStatus ? { orderStatus } : {}), ...(buyerType ? { buyerType } : {}), ...(device ? { device } : {}) } });
        const root = pageResult?.data?.conversionReport || {};
        const pageItems = Array.isArray(root.nodes) ? root.nodes : [];
        conversionItems.push(...pageItems); pagesCompleted++;
        hasMore = Boolean(root.pageInfo?.hasNextPage && root.pageInfo?.scrollId);
        currentScrollId = hasMore ? clean(root.pageInfo.scrollId, 1000) : '';
        if (!hasMore || !currentScrollId) break;
      }
      let ledgerSync = null;
      if (req.body?.syncToLedger === true || req.body?.syncToLedger === 'true') {
        if (saved.status !== 'VALIDATED') return res.status(412).json({ error: 'Valide a credencial Shopee antes de sincronizar pedidos.' });
        ledgerSync = await upsertAffiliateSales(db, account.id, 'SHOPEE', normalizeShopeeSales(conversionItems));
      }
      await auditShopee(account.id, 'conversionReport', 'OK', conversionItems.length, pagesCompleted, { startDate: startDate.toISOString(), endDate: endDate.toISOString(), ledgerSync: Boolean(ledgerSync) });
      return res.json({ report: 'conversionReport', items: conversionItems, pagesCompleted, startDate: startDate.toISOString(), endDate: endDate.toISOString(), pageInfo: { hasNextPage: hasMore, scrollId: hasMore ? currentScrollId : null }, readOnlySource: true, ledgerSync, nextScrollId: hasMore ? currentScrollId : null });

    }

    if (action === 'validated') {
      const validationId = String(req.body?.validationId || '').trim();
      if (!/^\d{1,18}$/.test(validationId)) return res.status(400).json({ error: 'Informe o Validation ID numérico exibido no relatório de pagamentos da Shopee.' });
      const limit = Math.min(100, Math.max(1, Math.floor(Number(req.body?.limit) || 20)));
      const scrollId = clean(req.body?.scrollId, 1000);
      const query = 'query($validationId: Int64!, $limit: Int!, $scrollId: String) { validatedReport(validationId: $validationId, limit: $limit, scrollId: $scrollId) { nodes { conversionId totalCommission netCommission } pageInfo { limit hasNextPage scrollId } } }';
      result = await signedRequest(credentials, { query, variables: { validationId, limit, ...(scrollId ? { scrollId } : {}) } });
      const root = result?.data?.validatedReport || {};
      await auditShopee(account.id, 'validatedReport', 'OK', Array.isArray(root.nodes) ? root.nodes.length : 0, 1, { validationId });
      return res.json({ report: 'validatedReport', items: Array.isArray(root.nodes) ? root.nodes : [], pageInfo: root.pageInfo || null, readOnly: true, nextScrollId: root.pageInfo?.hasNextPage ? (root.pageInfo.scrollId || null) : null });
    }

    return res.status(400).json({ error: 'Ação Shopee não suportada.' });
  } catch (error) {
    const status = Number(error?.status) || 502;
    if (auditAccountId && auditOperation && auditOperation !== 'audit_history') {
      const safeMessage = String(error?.message || 'Falha sem mensagem').replace(/(?:secret|token|signature|authorization)\s*[:=]\s*\S+/ig, '[redacted]').slice(0, 220);
      await auditShopee(auditAccountId, auditOperation, 'ERROR', 0, 1, { httpStatus: status, message: safeMessage });
    }
    if (req.body?.action === 'test') {
      try {
        const account = await getAccount(req.member);
        if (account) await db.query("UPDATE marketplace_api_credentials SET status='ERROR',last_checked_at=now(),last_error=$2,updated_at=now() WHERE account_id=$1 AND marketplace='SHOPEE'", [account.id, String(error?.message || 'Falha de validação').slice(0, 220)]);
      } catch {}
    }
    const message = String(error?.message || 'Falha sem mensagem').replace(/(?:secret|token|signature|authorization)\s*[:=]\s*\S+/ig, '[redacted]').slice(0, 260);
    const kind = /timeout|timed out|abort/i.test(message) ? 'timeout' :
      /não JSON|nao JSON/i.test(message) ? 'upstream_invalid_json' :
      /recusou a operação|recusou a operacao/i.test(message) ? 'provider_rejection' :
      /Cadastre|Configure/i.test(message) ? 'configuration' : 'request_failure';
    console.error('integrations/shopee', JSON.stringify({ name: String(error?.name || 'Error').slice(0, 60), status, kind, message }));
    return res.status(status >= 400 && status < 600 ? status : 502).json({ error: error?.message || 'Não foi possível acessar a API oficial da Shopee.' });
  }
}