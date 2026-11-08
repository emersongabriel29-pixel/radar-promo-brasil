import { config, db } from 'hatchable';
import { fetchWithRetry } from 'lib/http-retry.js';
import { signAliExpressParams } from 'lib/afilimax-aliexpress-provider.js';
import { fingerprint, offerScore } from 'lib/automation.js';
import { classifyProduct } from 'lib/category-classifier.js';
import { isAdultProduct } from 'lib/product-safety.js';
import { selectDiverseCandidates } from 'lib/catalog-diversity.js';
import { formatPromo } from 'lib/promo-message.js';
import { directImageUrl, httpsUrl } from 'lib/validation.js';
import { cacheOfferImage } from 'lib/offer-images.js';
// API catalog items are not filtered by product category.

export const access = 'scheduler';
export const methods = ['POST'];

const API_URL = 'https://api-sg.aliexpress.com/sync';
const clean = (v, max = 500) => String(v ?? '').trim().slice(0, max);
const fromB64 = v => Uint8Array.from(atob(v), c => c.charCodeAt(0));
const fields = 'product_id,product_title,product_main_image_url,product_detail_url,promotion_link,target_sale_price,target_original_price,sale_price,discount,commission_rate,evaluate_rate,lastest_volume,first_level_category_id,second_level_category_id,shop_id,shop_url,promo_code_info,platform_product_type,hot_product_commission_rate,relevant_market_commission_rate';
const keywords = [
  'fone bluetooth','fone sem fio','fone gamer','headset','caixa de som bluetooth','smartwatch','relogio inteligente','pulseira inteligente','celular','smartphone','iphone','android','tablet','notebook','laptop','monitor','teclado mecanico','mouse gamer','webcam','impressora','ssd','memoria ram','placa de video','roteador wifi','camera de seguranca','camera ip','projetor','tv box','controle videogame','console jogos',
  'air fryer','fritadeira eletrica','cafeteira','maquina de cafe','liquidificador','batedeira','processador alimentos','panela eletrica','panela pressao','aspirador robo','aspirador de po','ventilador','ar condicionado','umidificador','purificador agua','bebedouro','geladeira','microondas','forno eletrico','maquina lavar','ferro passar','lava loucas',
  'organizador casa','organizador cozinha','organizador banheiro','armario','guarda roupa','sapateira','estante','prateleira','mesa escritorio','cadeira escritorio','sofa','colchao','travesseiro','jogo cama','cortina','tapete','luminaria','lampada led','decoracao','ferramentas','furadeira','parafusadeira','chave impacto','lavadora alta pressao','jardim','piscina','churrasqueira',
  'fralda bebe','lenço umedecido','carrinho bebe','cadeirinha carro','berco','mamadeira','chupeta','brinquedo educativo','lego','boneca','pelucia','material escolar','mochila escolar','lancheira',
  'perfume feminino','perfume masculino','maquiagem','skincare','protetor solar','secador cabelo','chapinha','modelador cabelo','barbeador','aparador pelos','escova secadora','shampoo','creme cabelo','bolsa feminina','carteira','oculos sol','relogio masculino','tenis feminino','tenis masculino','sandalia','chinelo','camiseta','vestido','jaqueta','moletom',
  'suplemento esportivo','whey protein','creatina','halter','kit academia','bicicleta','acessorios bicicleta','barraca camping','mochila trilha','pesca','bola futebol','pet shop','racao cachorro','racao gato','cama pet','brinquedo pet','coleira cachorro','areia gato',
  'carregador rapido','carregador usb c','cabo usb c','power bank','adaptador tomada','hub usb','suporte celular','pelicula celular','capinha celular','acessorios carro','camera veicular','pneu bicicleta','pecas automotivas','ferramenta automotiva','ofertas casa','ofertas tecnologia','ofertas beleza','ofertas infantil','ofertas esporte'
];
// Expanded long-tail catalog: broad enough for discovery, but queries rotate in small batches to protect API quota.
const keywordFamilies = {
  casa:['organizador de gaveta','organizador multiuso','prateleira adesiva','suporte banheiro','kit cozinha','utensilios cozinha','forma silicone','pote hermetico','lixeira cozinha','torneira gourmet','ducha banheiro','varal retratil','luz solar jardim','decoracao sala','quadros decorativos','roupa de cama casal','capa sofa','almofada decorativa','mesa dobravel','cadeira dobravel'],
  tecnologia:['fone bluetooth anc','fone tws barato','carregador gan','carregador sem fio','cabo tipo c reforcado','suporte notebook','base notebook cooler','mouse sem fio','teclado sem fio','monitor gamer','ssd nvme','memoria ddr4','memoria ddr5','mini pc','camera webcam full hd','microfone usb','ring light','tripé celular','controle bluetooth','projetor portatil'],
  beleza:['escova eletrica facial','massageador facial','organizador maquiagem','pincel maquiagem kit','necessaire feminina','secador profissional','modelador cachos','maquina cortar cabelo','aparador barba','espelho led','unha gel kit','esmalte gel','creme hidratante corporal','serum facial cosmetico','acessorios cabelo'],
  moda:['tenis casual','tenis corrida','sandalia feminina','bolsa transversal','mochila notebook','carteira masculina','relogio feminino','oculos de sol uv','camiseta algodao','calca jeans','legging feminina','jaqueta corta vento','roupa academia','meia esportiva','cinto masculino'],
  infantil:['brinquedo montessori','brinquedo sensorial','livro infantil','quebra cabeca infantil','blocos montar','tapete infantil','organizador brinquedos','mochila infantil','roupa bebe','body bebe','babador silicone','copo transicao','prato silicone bebe','luminaria infantil'],
  pet:['comedouro automatico pet','bebedouro pet','fonte agua gato','arranhador gato','brinquedo interativo pet','cama cachorro','coleira peitoral','guia cachorro','escova tira pelos','tapete higienico pet','caixa transporte pet'],
  esporte:['garrafa termica','mala academia','luva musculacao','corda pular','tapete yoga','elastico resistencia','suporte bicicleta','luz bicicleta','capacete ciclismo','bolsa corrida','acessorio camping','lanterna recarregavel'],
  automotivo:['suporte celular carro','camera veicular dashcam','compressor portatil carro','aspirador automotivo','organizador porta malas','carregador veicular usb','luz led automotiva','capa banco carro','tapete automotivo','ferramenta carro'],
  utilidades:['mini impressora termica','etiquetadora portatil','balanca digital cozinha','medidor laser','trena digital','lanterna led','fita led rgb','tomada inteligente','sensor presenca','fechadura digital','camera wifi externa','repetidor wifi'],
  blackfriday:['black friday','ofertas black friday','promocao black friday','desconto black friday','esquenta black friday','black friday tecnologia','black friday casa','black friday beleza','black friday moda','black friday infantil','black friday eletrodomesticos','oferta relampago','super oferta','super ofertas','mega oferta','menor preco','desconto imperdivel','liquidacao','queima de estoque','oferta do dia'],
  choice:['aliexpress choice','choice ofertas','choice promocao','choice frete gratis','choice casa','choice tecnologia','choice beleza','choice acessorios','choice mais vendidos','produtos choice','ofertas choice'],
  combos:['combo de ofertas','kit promocional','combo kit','kit 2 pecas','kit 3 pecas','leve 2 pague 1','leve 3 pague 2','comprar em kit','conjunto promocional','combo acessorios','kit ferramentas','kit cozinha','kit organizacao','kit beleza','kit infantil','kit pet','kit escritorio'],
  marcas:['xiaomi','baseus','ugreen','anker','soundcore','jbl','lenovo','logitech','samsung acessorios','motorola acessorios','philips','mondial','oster','electrolux','black decker','dewalt','bosch ferramentas','essager','orico','redragon','kingston','sandisk','tp link','tapo','havit','haylou','qcy','edifier','tribit','choetech'],
  brasil:['do brasil','produto nacional','envio do brasil','estoque no brasil','pronta entrega brasil','entrega nacional','vendedor brasileiro','loja brasileira','produto com envio nacional','ofertas brasil','promocao brasil','oferta nacional','marketplace brasil','frete nacional']
};
const expandedKeywords = [...new Set([...keywords, ...Object.values(keywordFamilies).flat()])];
function safeAliExpressAffiliateUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    const host = url.hostname.toLowerCase();
    const trusted = host === 'aliexpress.com' || host.endsWith('.aliexpress.com') || host === 'aliexpress.us' || host.endsWith('.aliexpress.us');
    if (!trusted || !['http:','https:'].includes(url.protocol) || url.username || url.password) return '';
    // TOP examples still return http://s.click.aliexpress.com; upgrade only trusted AliExpress hosts.
    url.protocol = 'https:';
    return httpsUrl(url.toString(), 2000);
  } catch { return ''; }
}

async function decryptCredentials(row) {
  let master = String(await config.get('API_CREDENTIALS_MASTER_KEY') || '');
  if (master.length < 32) master = String(await config.get('CONNECTOR_ENCRYPTION_KEY') || '');
  if (master.length < 32) throw new Error('credential_key_missing');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(master + '|radar-marketplace-credentials|' + row.account_id + '|ALIEXPRESS'));
  const key = await crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(row.nonce) }, key, fromB64(row.credentials_enc));
  return JSON.parse(new TextDecoder().decode(plain));
}

async function requestProducts(credentials, keyword, pageNo = 1) {
  const appKey = clean(credentials.appId, 200);
  const secret = clean(credentials.apiSecret, 4096);
  const trackingId = clean(credentials.trackingId, 200);
  if (!appKey || !secret || !trackingId) throw new Error('credentials_missing');
  if (credentials.legacyApiAcknowledged !== 'true') throw new Error('legacy_api_acknowledgement_required');

  const date = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const params = {
    app_key: appKey,
    format: 'json',
    method: 'aliexpress.affiliate.product.query',
    sign_method: 'sha256',
    timestamp: date.toISOString().slice(0, 19).replace('T', ' '),
    v: '2.0',
    fields,
    keywords: clean(keyword, 120),
    page_no: String(pageNo),
    page_size: '20',
    sort: 'SALE_PRICE_ASC',
    tracking_id: trackingId,
    target_currency: 'BRL',
    target_language: 'PT',
    ship_to_country: 'BR'
  };
  params.sign = await signAliExpressParams(params, secret);
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && String(value) !== '') body.set(key, String(value));
  const response = await fetchWithRetry(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8', accept: 'application/json' },
    body: body.toString(),
    signal: AbortSignal.timeout(12000)
  });
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : {}; } catch { throw new Error('aliexpress_invalid_json'); }
  if (!response.ok) throw new Error('aliexpress_http_' + response.status);
  if (data?.error_response) {
    const e = data.error_response;
    throw new Error('aliexpress_rejected_' + clean(e.code || e.sub_code || 'API_ERROR', 60));
  }
  const root = data?.aliexpress_affiliate_product_query_response || Object.values(data).find(v => v && typeof v === 'object' && v.resp_result);
  const result = root?.resp_result?.result || root?.resp_result || root || data;
  const records = findProducts(result);
  // This function is the standard product-query operation; no `method` variable exists in this scope.
  return records.slice(0, 20);
}

async function requestAffiliateLink(credentials, productUrl) {
  const appKey = clean(credentials.appId, 200);
  const secret = clean(credentials.apiSecret, 4096);
  const trackingId = clean(credentials.trackingId, 200);
  if (!appKey || !secret || !trackingId) throw new Error('credentials_missing');
  if (credentials.legacyApiAcknowledged !== 'true') throw new Error('legacy_api_acknowledgement_required');
  const date = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const params = {
    app_key: appKey, format: 'json', method: 'aliexpress.affiliate.link.generate',
    sign_method: 'sha256', timestamp: date.toISOString().slice(0, 19).replace('T', ' '),
    v: '2.0', promotion_link_type: '0', source_values: (Array.isArray(productUrl) ? productUrl : [productUrl]).filter(Boolean).join(','), tracking_id: trackingId
  };
  params.sign = await signAliExpressParams(params, secret);
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) body.set(key, String(value));
  const response = await fetchWithRetry(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8', accept: 'application/json' },
    body: body.toString(),
    signal: AbortSignal.timeout(12000)
  });
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : {}; } catch { throw new Error('aliexpress_invalid_json'); }
  if (!response.ok) throw new Error('aliexpress_http_' + response.status);
  if (data?.error_response) {
    const e = data.error_response;
    throw new Error('aliexpress_rejected_' + clean(e.code || e.sub_code || 'API_ERROR', 60));
  }
  const textLinks = [];
  const walk = (value, depth = 0) => {
    if (!value || depth > 6) return;
    if (Array.isArray(value)) { for (const item of value) walk(item, depth + 1); return; }
    if (typeof value === 'object') {
      for (const [key, item] of Object.entries(value)) {
        if (/promotion_link|promotionLink|tracking_url/i.test(key) && typeof item === 'string') textLinks.push(item);
        else if (item && typeof item === 'object') walk(item, depth + 1);
      }
    }
  };
  walk(data);
  const links = textLinks.map(safeAliExpressAffiliateUrl).filter(Boolean);
  return Array.isArray(productUrl) ? links : (links[0] || '');
}

async function requestSkuDetails(credentials, productId) {
  const appKey = clean(credentials.appId, 200);
  const secret = clean(credentials.apiSecret, 4096);
  const trackingId = clean(credentials.trackingId, 200);
  const id = clean(productId, 30);
  if (!appKey || !secret || !trackingId) throw new Error('credentials_missing');
  if (credentials.legacyApiAcknowledged !== 'true') throw new Error('legacy_api_acknowledgement_required');
  if (!/^\d{1,30}$/.test(id)) throw new Error('sku_detail_product_id_missing');
  const date = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const method = 'aliexpress.affiliate.product.sku.detail.get';
  const params = { app_key:appKey,format:'json',method,sign_method:'sha256',timestamp:date.toISOString().slice(0,19).replace('T',' '),v:'2.0',product_id:id,ship_to_country:'BR',target_currency:'BRL',target_language:'PT',need_deliver_info:'No',tracking_id:trackingId };
  params.sign = await signAliExpressParams(params, secret);
  const body = new URLSearchParams();
  for (const [key,value] of Object.entries(params)) body.set(key,String(value));
  const response = await fetchWithRetry(API_URL,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded;charset=UTF-8',accept:'application/json'},body:body.toString(),signal:AbortSignal.timeout(12000)});
  const raw = await response.text();
  let data; try { data = raw ? JSON.parse(raw) : {}; } catch { throw new Error('aliexpress_sku_detail_invalid_json'); }
  if (!response.ok) throw new Error('aliexpress_sku_detail_http_'+response.status);
  if (data?.error_response) { const e=data.error_response; throw new Error('aliexpress_sku_detail_rejected_'+clean(e.code||e.sub_code||'API_ERROR',60)); }
  const root=data?.[method.replaceAll('.','_')+'_response']||Object.values(data).find(v=>v&&typeof v==='object'&&v.resp_result);
  const result=root?.resp_result?.result||root?.resp_result||root||data;
  return findProducts(result).slice(0,20);
}

async function requestAdvanced(credentials, method, keyword, productId = '') {
  const appKey = clean(credentials.appId, 200);
  const secret = clean(credentials.apiSecret, 4096);
  const trackingId = clean(credentials.trackingId, 200);
  if (!appKey || !secret || !trackingId) throw new Error('credentials_missing');
  if (credentials.legacyApiAcknowledged !== 'true') throw new Error('legacy_api_acknowledgement_required');
  const date = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const params = {
    app_key: appKey, format: 'json', method, sign_method: 'sha256',
    timestamp: date.toISOString().slice(0, 19).replace('T', ' '), v: '2.0',
    fields, page_no: '1', tracking_id: trackingId,
    target_currency: 'BRL', target_language: 'PT', ship_to_country: 'BR'
  };
  if (method === 'aliexpress.affiliate.product.smartmatch') {
    const id = clean(productId, 30);
    if (!/^\d{1,30}$/.test(id)) throw new Error('smartmatch_product_id_missing');
    params.product_id = id;
    params.keywords = clean(keyword, 120);
    params.country = 'BR';
    params.device = 'PC';
    params.device_id = 'radar-promo-brasil';
    delete params.ship_to_country;
  } else if (method === 'aliexpress.affiliate.hotproduct.query') {
    params.page_size = '20';
  } else if (method === 'aliexpress.affiliate.category.get') {
    params.fields = 'category_id,parent_category_id,category_name';
    delete params.page_no;
    delete params.tracking_id;
    delete params.target_currency;
    delete params.target_language;
    delete params.ship_to_country;
  } else if (method === 'aliexpress.affiliate.featuredpromo.get') {
    params.fields = 'promo_name,promo_desc,product_num,commission_rate,sale_price'; delete params.page_no; delete params.tracking_id; delete params.ship_to_country;
  } else if (method === 'aliexpress.affiliate.featuredpromo.products.get') {
    params.promotion_name = clean(keyword,180); params.page_size = '50'; params.country = 'BR'; params.sort = 'volumeDesc'; params.fields = 'product_id,product_title,product_main_image_url,product_detail_url,promotion_link,target_sale_price,target_original_price,sale_price,discount,commission_rate,evaluate_rate,lastest_volume,first_level_category_id,second_level_category_id,shop_id,shop_url,promo_code_info,platform_product_type,hot_product_commission_rate,relevant_market_commission_rate'; delete params.ship_to_country;
  } else if (method === 'aliexpress.affiliate.hotproduct.download') {
    params.category_id = clean(keyword,80); params.country = 'BR'; params.locale_site = 'global'; params.page_size = '50'; delete params.ship_to_country;
  } else if (method === 'aliexpress.affiliate.productdetail.get') {
    const ids = clean(productId, 700).split(',').map(x => x.trim()).filter(x => /^\d{1,30}$/.test(x)).slice(0, 20);
    if (!ids.length) throw new Error('productdetail_product_ids_missing');
    params.product_ids = ids.join(',');
    delete params.page_no;
  } else {
    throw new Error('unsupported_advanced_method');
  }
  params.sign = await signAliExpressParams(params, secret);
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && String(value) !== '') body.set(key, String(value));
  const response = await fetchWithRetry(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8', accept: 'application/json' },
    body: body.toString(),
    signal: AbortSignal.timeout(12000)
  });
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : {}; } catch { throw new Error('aliexpress_invalid_json'); }
  if (!response.ok) throw new Error('aliexpress_http_' + response.status);
  if (data?.error_response) {
    const e = data.error_response;
    throw new Error('aliexpress_rejected_' + clean(e.code || e.sub_code || 'API_ERROR', 60));
  }
  const root = data?.[method.replaceAll('.', '_') + '_response'] || Object.values(data).find(v => v && typeof v === 'object' && v.resp_result);
  const result = root?.resp_result?.result || root?.resp_result || root || data;
  if (method === 'aliexpress.affiliate.featuredpromo.get') {
    // TOP returns promos as an object containing promo[], not always as a direct array.
    const container = result?.promos || result?.promo || result?.promotions || result?.promotion || result?.promotion_list || [];
    const promos = Array.isArray(container) ? container : (Array.isArray(container?.promo) ? container.promo : (container?.promo && typeof container.promo === 'object' ? [container.promo] : (container && typeof container === 'object' && (container.promo_name || container.promotion_name || container.name) ? [container] : [])));
    return promos.slice(0,50);
  }
  return findProducts(result).slice(0, 50);
}

function findProducts(value, depth = 0) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object' || depth > 6) return [];
  for (const key of ['products', 'product', 'product_list', 'categories', 'category', 'category_list', 'items', 'data', 'sku_info_list', 'skuInfoList', 'sku_list', 'skuList', 'skus', 'sku_details', 'skuDetails']) {
    const child = value[key];
    if (Array.isArray(child)) return child;
    if (child && typeof child === 'object') {
      const found = findProducts(child, depth + 1);
      if (found.length) return found;
    }
  }
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') {
      const found = findProducts(child, depth + 1);
      if (found.length) return found;
    }
  }
  return [];
}

function percent(value) {
  const n = Number.parseFloat(String(value ?? '').replace('%', '').replace(',', '.'));
  return Number.isFinite(n) ? (n > 0 && n <= 1 ? n * 100 : n) : null;
}

function ratingPercent(value) {
  const raw = String(value ?? '').trim();
  const n = Number.parseFloat(raw.replace('%', '').replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return null;
  // AliExpress fields may be a 0-5 score or a percentage depending on API version.
  if (!raw.includes('%') && n <= 5) return Math.round(n * 20);
  return n <= 100 ? n : null;
}

function findPromoCodeInfo(value, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 6) return null;
  if (!Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (/^promo_?code_?info$/i.test(key) && child && typeof child === 'object' && !Array.isArray(child)) return child;
    }
    for (const child of Object.values(value)) {
      const found = findPromoCodeInfo(child, depth + 1);
      if (found) return found;
    }
  } else {
    for (const child of value) {
      const found = findPromoCodeInfo(child, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function promoCodeFieldPaths(value, path = '', depth = 0, found = []) {
  if (!value || typeof value !== 'object' || depth > 6 || found.length >= 10) return found;
  for (const [key, child] of Object.entries(value)) {
    const next = path ? path + '.' + key : key;
    if (/promo.?code.?info/i.test(key)) found.push(next.slice(0,180));
    else if (child && typeof child === 'object') promoCodeFieldPaths(child, next, depth + 1, found);
  }
  return found;
}

function normalize(p) {
  const parsePrice = value => { let s=String(value ?? '').replace(/[^0-9,.-]/g,''); if(s.includes(',')&&s.includes('.')) s=s.lastIndexOf(',')>s.lastIndexOf('.')?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,''); else s=s.replace(',','.'); const n=Number(s); return Number.isFinite(n)?n:0; };
  const price = parsePrice(p.target_sale_price ?? p.app_sale_price ?? p.sale_price ?? '');
  const original = parsePrice(p.target_original_price ?? p.original_price ?? '');
  const choiceSource = p.sku_info_list || p.skuInfoList || p.sku_info || p.skuInfo || p.sku_list || p.skuList || p.variants || p.skus || p.product_sku || p.productSku || p.product_props || p.productProps || p.attributes || p.specs || null;
  const choiceList = Array.isArray(choiceSource) ? choiceSource : (choiceSource?.sku_info || choiceSource?.sku_list || choiceSource?.skus || choiceSource?.sku || []);
  const choicePrices = (Array.isArray(choiceList)?choiceList:[]).map(x=>parsePrice(x.sku_price??x.sale_price??x.price??x.target_sale_price)).filter(x=>x>0);
  const choicePriceRange = choicePrices.length ? { min:Math.min(...choicePrices), max:Math.max(...choicePrices), currency:clean(choiceList[0]?.currency||choiceList[0]?.currency_code||'BRL',8) } : null;
  // Fingerprint only a stable selected SKU/model ID; never hash the whole choice list or changing variant prices.
  const variant = clean(p.sku_id || p.skuId || p.model_id || p.modelId || '', 200);
  return {
    id: clean(p.product_id || p.productId, 100),
    title: clean(p.product_title || p.productTitle || p.title, 220),
    productUrl: httpsUrl(p.product_detail_url || p.productDetailUrl),
    affiliateUrl: safeAliExpressAffiliateUrl(p.promotion_link || p.promotionLink || p.promotion_link_url),
    imageUrl: directImageUrl(p.product_main_image_url || p.productMainImageUrl) ? (p.product_main_image_url || p.productMainImageUrl) : '',
    currentPrice: Number.isFinite(price) && price > 0 ? Math.round(price * 100) : 0,
    originalPrice: Number.isFinite(original) && original > 0 ? Math.round(original * 100) : (Number.isFinite(price) && price > 0 ? Math.round(price * 100) : 0),
    commission: percent(p.commission_rate ?? p.commision_rate),
    rating: ratingPercent(p.evaluate_rate ?? p.evaluateRate),
    sales: Math.max(0, Number(p.lastest_volume ?? p.lastestVolume) || 0),
    categoryId: clean(p.second_level_category_id || p.first_level_category_id, 80),
    firstLevelCategoryId: clean(p.first_level_category_id, 80),
    shopId: clean(p.shop_id || p.shopId, 80),
    shopUrl: clean(p.shop_url, 1000),
    originCountry: clean(p.ship_from_country || p.shipFromCountry || p.ship_from || p.shipFrom || p.origin_country || p.originCountry || p.country_of_origin || p.countryOfOrigin || '', 80).toUpperCase(),
    variant,
    choices: choiceSource,
    choicePriceRange,
    promoCodeInfo: findPromoCodeInfo(p),
    discoveryKind: clean(p._radar_discovery_kind || 'KEYWORD',60),
    discoverySources: Array.isArray(p._radar_discovery_sources) ? p._radar_discovery_sources : [clean(p._radar_discovery_kind || 'KEYWORD',60)],
    campaignName: clean(p._radar_discovery_kind === 'FEATURED_CAMPAIGN' ? (p._radar_source_keyword || '') : '',120),
    hotCommission: percent(p.hot_product_commission_rate),
    relevantCommission: percent(p.relevant_market_commission_rate),
    platformProductType: clean(p.platform_product_type || '',60)
  };
}

function validPromoCode(info) {
  if (!info || typeof info !== 'object') return null;
  const code = clean(info.promo_code || info.promoCode || '',80);
  const url = safeAliExpressAffiliateUrl(info.code_promotionurl || info.codePromotionUrl || '');
  const end = clean(info.code_availabletime_end || info.codeAvailabletimeEnd || '',40);
  const start = clean(info.code_availabletime_start || info.codeAvailabletimeStart || '',40);
  const parse = value => { const d = Date.parse(String(value).replace(' ','T') + (String(value).includes('Z') ? '' : 'Z')); return Number.isFinite(d) ? d : null; };
  const endMs = parse(end), startMs = parse(start);
  if (!code || !url || !endMs || endMs < Date.now() || (startMs && startMs > Date.now())) return null;
  const quantity = Number(info.code_quantity ?? info.codeQuantity);
  if (Number.isFinite(quantity) && quantity <= 0) return null;
  return { code, url, value: clean(info.code_value || info.codeValue || '',120), minSpend: clean(info.code_mini_spend || info.codeMiniSpend || '',40), start, end, quantity: Number.isFinite(quantity) ? quantity : null };
}

function rankAliExpressProduct(p) {
  const discount = p.originalPrice > p.currentPrice && p.originalPrice > 0 ? Math.min(100, (p.originalPrice - p.currentPrice) * 100 / p.originalPrice) : 0;
  const rating = p.rating === null || p.rating === undefined ? 55 : Math.max(0, Math.min(100, p.rating));
  const sales = p.sales > 0 ? Math.min(100, Math.log10(p.sales + 1) * 25) : 35;
  const commission = p.commission === null || p.commission === undefined ? 50 : Math.min(100, p.commission * 10);
  const completeness = (p.id ? 20 : 0) + (p.title ? 20 : 0) + (p.productUrl ? 20 : 0) + (p.imageUrl ? 20 : 0) + (p.affiliateUrl ? 20 : 0);
  const choices = p.choices ? 100 : 50;
  return Math.round(rating * 0.28 + sales * 0.22 + commission * 0.16 + discount * 0.18 + completeness * 0.11 + choices * 0.05);
}

function promoTemplateFor(product) {
  const origin = clean(product?.originCountry || '', 80).toUpperCase();
  if (/^(BR|BRAZIL|BRASIL|BRA)$/.test(origin)) return 'CLEAN';
  if (origin && !/^(BR|BRAZIL|BRASIL|BRA)$/.test(origin)) return 'IMPORTED';
  return 'COMPLETE';
}

function withChoiceNote(message, product) {
  const range = product.choicePriceRange;
  if (range && range.max > range.min * 1.05) return String(message || '') + '\n\n⚠️ O preço pode variar conforme cor, tamanho ou versão escolhida. Confira a opção selecionada antes de comprar.';
  return message;
}

function isAliExpressUrl(value) {
  try {
    const u = new URL(String(value || ''));
    const host = u.hostname.toLowerCase();
    return u.protocol === 'https:' && !u.username && !u.password &&
      (host === 'aliexpress.com' || host.endsWith('.aliexpress.com') || host === 'aliexpress.us' || host.endsWith('.aliexpress.us'));
  } catch { return false; }
}

export default async function handler(req, res) {
  const dryRun = req.body?.dryRun === true || String(req.body?.dryRun ?? req.query?.dryRun ?? '').toLowerCase() === 'true';
  const rows = (await db.query("SELECT account_id,credentials_enc,nonce FROM marketplace_api_credentials WHERE marketplace='ALIEXPRESS' AND status='VALIDATED'")).rows;
  const totals = { ok: true, accounts: rows.length, scanned: 0, captured: 0, discoveryUpserted: 0, needsEnrichment: 0, choiceProducts: 0, choiceOptions: 0, skuDetailCalls: 0, skuOptionsFound: 0, skuPermissionRequired: false, apiCalls: 0, keywordCatalogSize: expandedKeywords.length, deferredForAffiliateLink: 0, imported: 0, duplicates: 0, skipped: 0, safetyBlocked: 0, providerRestricted: 0, selected: 0, failed: 0, autopilotRuns: 0, preview: [], rejectedBy: { missingId: 0, missingTitle: 0, invalidProductUrl: 0, missingAffiliateLink: 0, missingImage: 0, invalidPrice: 0, noVerifiedDiscount: 0, safetyFilter: 0, adultPolicy: 0, discountBelowThreshold: 0 }, qualitySignals: { missingCommission: 0, lowCommission: 0, missingRating: 0, lowRating: 0 } };
  for (const row of rows) {
    let accountImported = 0;
    try {
      const credentials = await decryptCredentials(row);
      const discoveryRunId = crypto.randomUUID();
      const discoveryStartedAt = new Date();
      let apiCalls = 0;
      let apiFailures = 0;
      const slot = Math.floor(Date.now() / 3600000);
      const selected = [0, 1, 2].map(offset => expandedKeywords[(slot * 3 + offset) % expandedKeywords.length]);
      const seen = new Set();
      const products = [];
      const collect = (list, sourceKeyword, discoveryKind = 'KEYWORD') => {
        for (const item of list || []) {
          const p = { ...item, _radar_source_keyword: clean(sourceKeyword, 120), _radar_discovery_kind: discoveryKind, _radar_discovery_sources: [discoveryKind], _radar_coupon_field_paths: promoCodeFieldPaths(item) };
          const id = clean(p.product_id || p.productId, 100);
          if (!id) continue;
          if (!seen.has(id)) { seen.add(id); products.push(p); }
          else {
            const existing = products.find(x => clean(x.product_id || x.productId,100) === id);
            if (!existing) continue;
            const sources = new Set([...(existing._radar_discovery_sources || [existing._radar_discovery_kind || 'KEYWORD']), discoveryKind]);
            existing._radar_discovery_sources = [...sources];
            if (discoveryKind === 'FEATURED_CAMPAIGN') {
              existing._radar_discovery_kind = 'FEATURED_CAMPAIGN';
              existing._radar_source_keyword = clean(sourceKeyword,120);
            }
            if (!existing.promo_code_info && p.promo_code_info) existing.promo_code_info = p.promo_code_info;
            if (!existing.promoCodeInfo && p.promoCodeInfo) existing.promoCodeInfo = p.promoCodeInfo;
          }
        }
      };
      for (const keyword of selected) {
        try {
          const pageNo = (slot % 10) + 1;
          apiCalls++;
          collect(await requestProducts(credentials, keyword, pageNo), keyword, 'KEYWORD');
        } catch (error) {
          apiFailures++;
          console.error('aliexpress search failed', JSON.stringify({ keyword, code: clean(error?.message || 'ERROR', 80) }));
        }
      }
      // Category names are read from the official category endpoint so numeric IDs are never mistaken for labels.
      const categoryNames = new Map();
      try {
        apiCalls++;
        const sourceCategories = await requestAdvanced(credentials, 'aliexpress.affiliate.category.get', selected[0] || '');
        for (const sourceCategory of sourceCategories) {
          const id = clean(sourceCategory.category_id || sourceCategory.categoryId || sourceCategory.id, 80);
          const name = clean(sourceCategory.category_name || sourceCategory.categoryName || sourceCategory.name, 160);
          if (id && name) categoryNames.set(id, name);
        }
      } catch (error) {
        apiFailures++;
        console.error('aliexpress category catalog unavailable', clean(error?.message || 'CATEGORY_LOOKUP_FAILED', 80));
      }
      // Keep discovery bounded to three keyword searches, one category lookup and Hot Products.
      const advancedKeyword = selected[0] || 'ofertas';
      // The official TOP docs label Affiliate API as deprecated. SmartMatch is
      // currently rejected with MissingParameter despite the documented device_id.
      // Avoid burning calls on this legacy endpoint; keep Hot Products + standard search.
      for (const [method, label] of [
        ['aliexpress.affiliate.hotproduct.query', 'hotproducts']
      ]) {
        try {
          if (method === 'aliexpress.affiliate.product.smartmatch' && !products.length) throw new Error('smartmatch_skipped_no_seed_product');
          apiCalls++;
          collect(await requestAdvanced(credentials, method, advancedKeyword, products.length ? (products[0].product_id || products[0].productId || '') : ''), advancedKeyword, label.toUpperCase());
        } catch (error) {
          apiFailures++;
          // Advanced methods can be unavailable on an approved app; standard search
          // remains the fallback and the failure is logged without exposing secrets.
          console.error('aliexpress advanced discovery failed', JSON.stringify({ method: label, code: clean(error?.message || 'ERROR', 80) }));
        }
      }
      // Featured campaign catalogs: fixed shelves plus current themed promotions. Keep one campaign product page per run to protect API quota.
      let featuredCampaigns = [];
      try {
        apiCalls++;
        featuredCampaigns = await requestAdvanced(credentials,'aliexpress.affiliate.featuredpromo.get','');
        for (const campaign of featuredCampaigns) {
          const name = clean(campaign.promo_name || campaign.promotion_name || campaign.name || '',180);
          if (!name) continue;
          await db.query(`INSERT INTO affiliate_discovery_items(id,account_id,marketplace,kind,external_id,title,campaign_id,raw_data,first_seen_at,last_seen_at,last_run_id)
            VALUES(gen_random_uuid()::text,$1,'ALIEXPRESS','CAMPAIGN',$2,$2,$2,$3::jsonb,now(),now(),$4)
            ON CONFLICT(account_id,marketplace,kind,external_id) DO UPDATE SET title=EXCLUDED.title,raw_data=EXCLUDED.raw_data,last_seen_at=now(),last_run_id=EXCLUDED.last_run_id`,
            [row.account_id,name,JSON.stringify(campaign),discoveryRunId]);
        }
      } catch (error) { apiFailures++; console.error('aliexpress featured campaigns unavailable',clean(error?.message||'CAMPAIGN_LIST_FAILED',100)); }
      const campaignNames = featuredCampaigns.map(x=>clean(x.promo_name||x.promotion_name||x.name||'',180)).filter(Boolean);
      const fixedShelves = ['Hot Product','New Arrival','Best Seller','weeklydeals'];
      const campaignToFetch = campaignNames.length ? campaignNames[slot % campaignNames.length] : fixedShelves[(slot % fixedShelves.length)];
      try {
        apiCalls++;
        collect(await requestAdvanced(credentials,'aliexpress.affiliate.featuredpromo.products.get',campaignToFetch),campaignToFetch,'FEATURED_CAMPAIGN');
      } catch (error) { apiFailures++; console.error('aliexpress featured campaign products unavailable',clean(error?.message||'CAMPAIGN_PRODUCTS_FAILED',100)); }
      const firstCategoryId = categoryNames.keys().next().value;
      if (firstCategoryId) {
        try { apiCalls++; collect(await requestAdvanced(credentials,'aliexpress.affiliate.hotproduct.download',firstCategoryId), 'HOT_DOWNLOAD:'+firstCategoryId,'HOTPRODUCT_DOWNLOAD'); }
        catch (error) { apiFailures++; console.error('aliexpress hot product download unavailable',clean(error?.message||'HOT_DOWNLOAD_FAILED',100)); }
      }
      // Retry older captured candidates so missing affiliate links/images/prices are not abandoned after the first search.
      const backlogRows = (await db.query("SELECT external_id,raw_data,source_keyword FROM affiliate_discovery_items WHERE account_id=$1 AND marketplace='ALIEXPRESS' AND kind='PRODUCT' AND processing_status IN ('NEEDS_ENRICHMENT','CAPTURED','DISCOVERED') AND NULLIF(product_url,'') IS NOT NULL ORDER BY first_seen_at ASC LIMIT 20", [row.account_id])).rows;
      for (const item of backlogRows) {
        const raw = item.raw_data && typeof item.raw_data === 'object' ? item.raw_data : {};
        if (clean(raw.product_id || raw.productId || item.external_id,100) && !seen.has(item.external_id)) {
          collect([{ ...raw, product_id: raw.product_id || raw.productId || item.external_id }], item.source_keyword || raw._radar_source_keyword || '', raw._radar_discovery_kind === 'FEATURED_CAMPAIGN' ? 'FEATURED_CAMPAIGN' : 'BACKLOG_RETRY');
          totals.backlogRetried = (totals.backlogRetried || 0) + 1;
        }
      }
      // Keep product-detail quota health separate from SKU permission health.
      const enrichmentHealth = (await db.query("SELECT name,status,last_checked_at FROM account_integration_health WHERE account_id=$1 AND name IN ('ALIEXPRESS_SKU_DETAIL','ALIEXPRESS_PRODUCT_DETAIL')", [row.account_id])).rows;
      const skuHealth = enrichmentHealth.find(x => x.name === 'ALIEXPRESS_SKU_DETAIL');
      const productDetailHealth = enrichmentHealth.find(x => x.name === 'ALIEXPRESS_PRODUCT_DETAIL');
      let optionalEnrichmentCoolingDown = productDetailHealth?.status === 'API_CALL_LIMIT' && productDetailHealth.last_checked_at && (Date.now() - new Date(productDetailHealth.last_checked_at).getTime()) < 6 * 60 * 60 * 1000;
      // Enrich the strongest candidates with official product details and a separate SKU-details call for real colour/size/storage choices.
      const detailIds = products.map(raw => normalize(raw)).sort((a,b) => rankAliExpressProduct(b)-rankAliExpressProduct(a)).slice(0,10).map(p => p.id).filter(Boolean);
      if (detailIds.length && !optionalEnrichmentCoolingDown && productDetailHealth?.status !== 'PERMISSION_REQUIRED') {
        try {
          apiCalls++;
          const detailItems = await requestAdvanced(credentials, 'aliexpress.affiliate.productdetail.get', '', detailIds.join(','));
          const detailById = new Map(detailItems.map(x => [clean(x.product_id || x.productId,100), x]).filter(x => x[0]));
          for (let i=0;i<products.length;i++) {
            const id=clean(products[i].product_id || products[i].productId,100), detail=detailById.get(id);
            if (detail) products[i] = { ...products[i], ...detail, _radar_source_keyword: products[i]._radar_source_keyword, _radar_discovery_kind: (products[i]._radar_discovery_kind === 'FEATURED_CAMPAIGN' ? 'FEATURED_CAMPAIGN' : 'PRODUCT_DETAIL_ENRICHED') };
          }
          await db.query("INSERT INTO account_integration_health(account_id,name,status,details,last_checked_at) VALUES($1,'ALIEXPRESS_PRODUCT_DETAIL','ACTIVE',$2,now()) ON CONFLICT(name,account_id) DO UPDATE SET status='ACTIVE',details=EXCLUDED.details,last_checked_at=now()", [row.account_id, 'Consulta de detalhes de produto concluída com sucesso.']);
        } catch (error) {
          apiFailures++;
          const detailError = clean(error?.message || 'PRODUCT_DETAIL_FAILED', 100);
          if (/ApiCallLimit|CallLimit|rate.?limit/i.test(detailError)) {
            await db.query("INSERT INTO account_integration_health(account_id,name,status,details,last_checked_at) VALUES($1,'ALIEXPRESS_PRODUCT_DETAIL','API_CALL_LIMIT',$2,now()) ON CONFLICT(name,account_id) DO UPDATE SET status='API_CALL_LIMIT',details=EXCLUDED.details,last_checked_at=now()", [row.account_id, 'Limite de chamadas da API; enriquecimento opcional suspenso por 6 horas.']);
            optionalEnrichmentCoolingDown = true;
          } else if (/InsufficientPermission|insufficient permission|permission/i.test(detailError)) {
            await db.query("INSERT INTO account_integration_health(account_id,name,status,details,last_checked_at) VALUES($1,'ALIEXPRESS_PRODUCT_DETAIL','PERMISSION_REQUIRED',$2,now()) ON CONFLICT(name,account_id) DO UPDATE SET status='PERMISSION_REQUIRED',details=EXCLUDED.details,last_checked_at=now()", [row.account_id, detailError]);
          }
          console.error('aliexpress product detail enrichment unavailable', detailError);
        }
      }
      const skuTarget = products.map(raw=>normalize(raw)).sort((a,b)=>rankAliExpressProduct(b)-rankAliExpressProduct(a))[0];
      if (skuTarget?.id && !optionalEnrichmentCoolingDown && skuHealth?.status !== 'PERMISSION_REQUIRED') {
        try {
          apiCalls++;
          const skuOptions = await requestSkuDetails(credentials, skuTarget.id);
          const productIndex = products.findIndex(raw=>clean(raw.product_id||raw.productId,100)===skuTarget.id);
          if (productIndex>=0 && skuOptions.length) products[productIndex] = { ...products[productIndex], sku_info_list:skuOptions, _radar_sku_detail_status:'AVAILABLE' };
          totals.skuDetailCalls = (totals.skuDetailCalls||0)+1;
          totals.skuOptionsFound = (totals.skuOptionsFound||0)+skuOptions.length;
          await db.query("INSERT INTO account_integration_health(account_id,name,status,details,last_checked_at) VALUES($1,'ALIEXPRESS_SKU_DETAIL','ACTIVE',$2,now()) ON CONFLICT(name,account_id) DO UPDATE SET status='ACTIVE',details=EXCLUDED.details,last_checked_at=now()", [row.account_id,'Consulta de variações SKU autorizada; último produto '+skuTarget.id]);
        } catch (error) {
          apiFailures++;
          const message = clean(error?.message||'SKU_DETAIL_FAILED',160);
          if (/InsufficientPermission|insufficient permission|permission/i.test(message)) {
            totals.skuPermissionRequired = true;
            await db.query("INSERT INTO account_integration_health(account_id,name,status,details,last_checked_at) VALUES($1,'ALIEXPRESS_SKU_DETAIL','PERMISSION_REQUIRED',$2,now()) ON CONFLICT(name,account_id) DO UPDATE SET status='PERMISSION_REQUIRED',details=EXCLUDED.details,last_checked_at=now()", [row.account_id,message]);
          }
          console.error('aliexpress SKU choices unavailable', message);
        }
      } else if (skuHealth?.status === 'PERMISSION_REQUIRED') {
        totals.skuPermissionRequired = true;
      }
      totals.scanned += products.length;
      // Persist every discovered product before publication-quality checks. Missing links/images/prices stay in the discovery inbox for enrichment instead of disappearing.
      let discoveryUpserted = 0;
      if (products.length && !dryRun) {
        const discoveryRows = products.map(raw => {
          const p = normalize(raw);
          raw._radar_coupon = validPromoCode(p.promoCodeInfo);
          const providerRestricted = isAdultProduct({ title: p.title, productUrl: p.productUrl });
          const needsEnrichment = !p.id || !p.title || !p.productUrl || !p.currentPrice || !p.affiliateUrl;
          const choices = p.choices;
          const choiceList = Array.isArray(choices) ? choices : (choices?.sku_info || choices?.sku_info_list || choices?.sku_list || choices?.skus || []);
          const choiceCount = Array.isArray(choiceList) ? choiceList.length : (choices && typeof choices === 'object' ? Object.keys(choices).length : 0);
          if (choiceCount) { totals.choiceProducts = (totals.choiceProducts || 0) + 1; totals.choiceOptions = (totals.choiceOptions || 0) + choiceCount; }
          if (needsEnrichment) totals.needsEnrichment = (totals.needsEnrichment || 0) + 1;
          return {
            external_id: p.id, title: p.title, brand_name: clean(raw.brand_name || raw.brandName || raw.brand || '', 160),
            product_url: p.productUrl, affiliate_url: p.affiliateUrl, image_url: p.imageUrl,
            price_cents: p.currentPrice || 0, commission_rate: p.commission, rating: p.rating,
            sales_count: p.sales, available: true, category_slug: p.categoryId,
            source_keyword: clean(raw._radar_source_keyword || '', 120),
            processing_status: providerRestricted ? 'PROVIDER_RESTRICTED' : (needsEnrichment ? 'NEEDS_ENRICHMENT' : 'CAPTURED'),
            raw_data: { ...raw, _radar_normalized_choices: choices || null, _radar_choice_count: choiceCount }
          };
        }).filter(x => x.external_id);
        if (discoveryRows.length) {
          const saved = await db.query(
            `INSERT INTO affiliate_discovery_items
              (id,account_id,marketplace,kind,external_id,title,brand_name,product_url,affiliate_url,image_url,price_cents,commission_rate,rating,sales_count,available,raw_data,first_seen_at,last_seen_at,last_run_id,category_slug,source_keyword,processing_status)
             SELECT gen_random_uuid()::text,$1,'ALIEXPRESS','PRODUCT',x.external_id,x.title,x.brand_name,x.product_url,x.affiliate_url,x.image_url,x.price_cents,x.commission_rate,x.rating,x.sales_count,x.available,x.raw_data,now(),now(),$2,x.category_slug,x.source_keyword,x.processing_status
             FROM jsonb_to_recordset($3::jsonb) AS x(external_id text,title text,brand_name text,product_url text,affiliate_url text,image_url text,price_cents bigint,commission_rate numeric,rating numeric,sales_count bigint,available boolean,raw_data jsonb,category_slug text,source_keyword text,processing_status text)
             ON CONFLICT (account_id,marketplace,kind,external_id) DO UPDATE SET
               title=COALESCE(NULLIF(EXCLUDED.title,''),affiliate_discovery_items.title),
               brand_name=COALESCE(NULLIF(EXCLUDED.brand_name,''),affiliate_discovery_items.brand_name),
               product_url=COALESCE(NULLIF(EXCLUDED.product_url,''),affiliate_discovery_items.product_url),
               affiliate_url=COALESCE(NULLIF(EXCLUDED.affiliate_url,''),affiliate_discovery_items.affiliate_url),
               image_url=COALESCE(NULLIF(EXCLUDED.image_url,''),affiliate_discovery_items.image_url),
               price_cents=CASE WHEN EXCLUDED.price_cents>0 THEN EXCLUDED.price_cents ELSE affiliate_discovery_items.price_cents END,
               commission_rate=COALESCE(EXCLUDED.commission_rate,affiliate_discovery_items.commission_rate),
               rating=COALESCE(EXCLUDED.rating,affiliate_discovery_items.rating),
               sales_count=GREATEST(EXCLUDED.sales_count,affiliate_discovery_items.sales_count),
               raw_data=EXCLUDED.raw_data,source_keyword=EXCLUDED.source_keyword,last_seen_at=now(),
               processing_status=CASE WHEN affiliate_discovery_items.processing_status IN ('PUBLISHED','LINKED','PROCESSED') THEN affiliate_discovery_items.processing_status ELSE EXCLUDED.processing_status END
             RETURNING id`,
            [row.account_id, crypto.randomUUID(), JSON.stringify(discoveryRows)]
          );
          discoveryUpserted = saved.rows.length;
          totals.discoveryUpserted = (totals.discoveryUpserted || 0) + discoveryUpserted;
          totals.captured = (totals.captured || 0) + discoveryRows.length;
        }
      }
      const safeProducts = products.filter(raw => {
        const normalized = normalize(raw);
        normalized.sourceCategory = categoryNames.get(normalized.categoryId) || categoryNames.get(normalized.firstLevelCategoryId) || '';
        if (isAdultProduct({ title: normalized.title, productUrl: normalized.productUrl, sourceCategory: normalized.sourceCategory })) {
          totals.rejectedBy.adultPolicy++;
          totals.providerRestricted = (totals.providerRestricted || 0) + 1;
          totals.skipped++;
          return false;
        }
        return true;
      });
      // Generate affiliate links for the highest-ranked products first; every other result remains in the discovery catalog.
      safeProducts.sort((a,b) => {
        const score = raw => { const p = normalize(raw); return rankAliExpressProduct(p) + (p.discoveryKind === 'FEATURED_CAMPAIGN' ? 14 : 0) + (validPromoCode(p.promoCodeInfo) ? 24 : 0); };
        return score(b) - score(a);
      });
      totals.deferredForAffiliateLink += Math.max(0, safeProducts.length - 8);
      const categories = (await db.query('SELECT id,name FROM categories WHERE account_id=$1', [row.account_id])).rows;
      const candidates = [];
      const productUrls = safeProducts.slice(0, 8).map(raw => httpsUrl(raw.product_detail_url || raw.productDetailUrl)).filter(url => url && isAliExpressUrl(url));
      let generatedLinks = [];
      // The AliExpress link API may return only part of a large source_values batch.
      // Use small batches and preserve the response order for deterministic mapping.
      if (!dryRun) {
        for (let offset = 0; offset < productUrls.length; offset += 5) {
          const batch = productUrls.slice(offset, offset + 5);
          try {
            apiCalls++;
            const batchLinks = await requestAffiliateLink(credentials, batch);
            for (let i = 0; i < batch.length; i++) generatedLinks[offset + i] = batchLinks[i] || '';
          } catch (error) {
            apiFailures++;
            for (let i = 0; i < batch.length; i++) generatedLinks[offset + i] = '';
            console.error('aliexpress batch short-link generation failed', clean(error?.message || 'ERROR', 80));
          }
        }
      }
      for (const raw of safeProducts.slice(0, 8)) {
        const p = normalize(raw);
        p.coupon = validPromoCode(p.promoCodeInfo);
        p.sourceCategory = categoryNames.get(p.categoryId) || categoryNames.get(p.firstLevelCategoryId) || '';
        const sourceUrl = httpsUrl(raw.product_detail_url || raw.productDetailUrl);
        const sourceIndex = productUrls.indexOf(sourceUrl);
        const generated = sourceIndex >= 0 ? safeAliExpressAffiliateUrl(generatedLinks[sourceIndex]) : '';
        // Prefer the official generated link; fall back only to a trusted AliExpress promotion URL.
        p.affiliateUrl = dryRun ? (p.affiliateUrl && p.affiliateUrl.length <= 300 ? p.affiliateUrl : '') : (generated && generated.length <= 300 ? generated : (p.affiliateUrl && p.affiliateUrl.length <= 300 ? p.affiliateUrl : ''));
        let reason = '';
        if (!p.id) reason = 'missingId';
        else if (!p.title) reason = 'missingTitle';
        else if (!p.productUrl || !isAliExpressUrl(p.productUrl)) reason = 'invalidProductUrl';
        else if (!p.currentPrice || p.currentPrice <= 0) reason = 'invalidPrice';
        else if (!p.affiliateUrl) reason = 'missingAffiliateLink';
        // Products without a verified discount remain discoverable; they are ranked below discounted offers.
        // No internal category exclusion.
        if (reason) { totals.skipped++; totals.rejectedBy[reason]++; continue; }
        const discount = p.originalPrice > p.currentPrice ? Math.round((p.originalPrice - p.currentPrice) * 100 / p.originalPrice) : 0;
        // Missing commission/rating data no longer discards otherwise valid offers.
        // Known values are used for ranking; known low commission/rating are flagged for review.
        if (p.commission === null) totals.qualitySignals.missingCommission++;
        else if (p.commission < 3) totals.qualitySignals.lowCommission++;
        if (p.rating === null) totals.qualitySignals.missingRating++;
        else if (p.rating < 90) totals.qualitySignals.lowRating++;
        const classified = classifyProduct({ title: p.title, sourceCategory: p.sourceCategory });
        const category = categories.find(c => c.name.toLowerCase() === String(classified.category || '').toLowerCase()) ||
          categories.find(c => c.name.toLowerCase().includes('gerais')) || null;
        const fp = await fingerprint({ source: 'ALIEXPRESS', externalId: p.id, productUrl: p.productUrl, title: p.title, sellerId:p.shopId||p.sellerId||p.storeId||'', sellerName:p.shopName||p.sellerName||'', currentPrice:p.currentPrice, originalPrice:p.originalPrice, variant:p.variant||p.sku||'' });
        const qualityFlags = [];
        if (p.commission !== null && p.commission < 3) qualityFlags.push('LOW_COMMISSION');
        if (p.rating !== null && p.rating < 90) qualityFlags.push('LOW_RATING');
        if (p.choicePriceRange && p.choicePriceRange.max > p.choicePriceRange.min * 1.05) qualityFlags.push('VARIANT_PRICE_RANGE');
        candidates.push({ ...p, qualityFlags, discount, classified, category, fp, id:p.id, merchantId:p.shopId, score: rankAliExpressProduct(p) });
      }
      candidates.sort((a, b) => b.score - a.score || b.sales - a.sales || (b.rating || 0) - (a.rating || 0) || (b.commission || 0) - (a.commission || 0) || a.currentPrice - b.currentPrice);
      const selectedCandidates = selectDiverseCandidates(candidates,{limit:8,perCategory:8,perMerchant:8,fillPerCategory:8,fillPerMerchant:8});
      totals.selected += selectedCandidates.length;
      totals.apiCalls += apiCalls;
      totals.apiFailures = (totals.apiFailures || 0) + apiFailures;
      if (dryRun) {
        totals.preview.push(...selectedCandidates.slice(0, 8).map(p => ({productId:p.id,title:p.title,category:p.classified.category,subcategory:p.classified.subcategory,confidence:p.classified.confidence,sourceCategory:p.sourceCategory||null,price:p.currentPrice/100,discountPercent:p.discount,shopId:p.shopId||null})));
        continue;
      }
      // Persist capture telemetry before offer writes, so a later DB quota error does not erase the run's discovery metrics.
      await db.query("INSERT INTO affiliate_discovery_runs(id,account_id,marketplace,operation,status,cursor_in,cursor_out,pages_completed,records_seen,records_upserted,started_at,finished_at,last_error,created_at,updated_at) VALUES($1,$2,'ALIEXPRESS',$3,$4,$5,$6,$7,$8,$9,$10,now(),$11,now(),now())", [discoveryRunId,row.account_id,'KEYWORD_SEARCH+HOTPRODUCT+FEATURED_CAMPAIGNS+CAMPAIGN_PRODUCTS+HOTPRODUCT_DOWNLOAD+PRODUCT_DETAIL'+(totals.skuDetailCalls?'+SKU_DETAIL':'')+'+AFFILIATE_LINK;api_calls='+apiCalls,apiFailures ? 'PARTIAL' : 'SUCCESS',selected.join(' | '),String((slot % 10)+1),apiCalls,products.length,discoveryUpserted,discoveryStartedAt,apiFailures ? apiFailures+' API call(s) failed' : '']);
      // Bound database work per scheduled run so duplicate refreshes stay below the project query quota.
      for (const p of selectedCandidates) {
        const exists = await db.query('SELECT id,current_price,original_price FROM offers WHERE account_id=$1 AND fingerprint=$2 LIMIT 1', [row.account_id, p.fp]);
        if (exists.rows.length) {
          const existing = exists.rows[0];
          const refreshedPromo = formatPromo({ title: p.title, source: 'ALIEXPRESS', template: promoTemplateFor(p), category: p.category?.name || p.classified.category || '', currentPrice: p.currentPrice, originalPrice: p.originalPrice, affiliateUrl: p.affiliateUrl, imageUrl: p.imageUrl, productUrl: p.productUrl });
          refreshedPromo.message = withChoiceNote(refreshedPromo.message,p);
          if (p.discoveryKind === 'FEATURED_CAMPAIGN' && p.campaignName) refreshedPromo.message += `\n\n🔥 CAMPANHA ALIEXPRESS: ${p.campaignName}`;
          if (p.coupon) refreshedPromo.message += `\n\n🎟️ CUPOM: ${p.coupon.code}\n${p.coupon.value}${p.coupon.minSpend ? ' | Mínimo: '+p.coupon.minSpend : ''}\nVálido até: ${p.coupon.end}`;
          await db.query("UPDATE offers SET affiliate_url=$1,message=$2,current_price=$3,original_price=$4,discount_percent=$5,coupon_code=$11,coupon_url=$12,score=$6,radar_score=$6,radar_reasons=$7,image_url=COALESCE($8,image_url),updated_at=now() WHERE id=$9 AND account_id=$10 AND source='ALIEXPRESS' AND NULLIF($1,'') IS NOT NULL AND length($1)<=300", [p.affiliateUrl, refreshedPromo.message, p.currentPrice, p.originalPrice, p.discount, p.score, JSON.stringify({rating:p.rating,sales:p.sales,commission:p.commission,discount:p.discount,choices:!!p.choices}), p.imageUrl || null, existing.id, row.account_id, p.coupon?.code || null, p.coupon?.url || null]);
          await db.query("UPDATE publications SET message=$3,image_url=COALESCE($4,image_url) WHERE account_id=$1 AND offer_id=$2 AND status IN ('READY','RETRY','SCHEDULED')", [row.account_id, existing.id, refreshedPromo.message, p.imageUrl || null]);
          await db.query("INSERT INTO offer_price_history(id,account_id,offer_id,price,original_price,source_type,source_reference,verified_at) SELECT $1,$2,$3,$4,$5,'OFFICIAL_API',$6,now() WHERE NOT EXISTS(SELECT 1 FROM offer_price_history WHERE account_id=$2 AND offer_id=$3 AND source_type='OFFICIAL_API' AND verified_at>now()-interval '24 hours' AND price=$4 AND original_price=$5)", [crypto.randomUUID(), row.account_id, existing.id, p.currentPrice, p.originalPrice, 'ALIEXPRESS:' + p.id]);
          if (!p.classified.needsReview && p.classified.confidence >= 0.8) {
            await db.query('UPDATE offers SET category_id=COALESCE($1,category_id),subcategory=$2,classification_tags=$3::jsonb,classification_confidence=$4,classification_status=\'AUTO\',classification_reason=$5,source_category=$6,updated_at=now() WHERE id=$7 AND account_id=$8 AND source=\'ALIEXPRESS\'', [p.category?.id || null, p.classified.subcategory, JSON.stringify(p.classified.tags || []), p.classified.confidence, p.classified.reason, p.sourceCategory || null, existing.id, row.account_id]);
          }

          // Recover only failures whose specific cause is now fixed by this official refresh.
          const recoverable = await db.query("SELECT id FROM publications WHERE account_id=$1 AND offer_id=$2 AND status IN ('FAILED','RETRY') AND external_message_id IS NULL AND (error_message ILIKE '%preço oficial desatualizado%' OR error_message ILIKE '%nova validação oficial do preço%' OR error_message ILIKE '%imagem do produto não encontrada%')", [row.account_id, existing.id]);
          if (recoverable.rows.length && p.imageUrl) {
            try {
              await cacheOfferImage({ imageUrl: p.imageUrl, accountId: row.account_id, offerId: existing.id }, db);
              await db.query("UPDATE publications SET image_storage_key=(SELECT image_storage_key FROM offers WHERE id=$2 AND account_id=$1),image_url=$3 WHERE account_id=$1 AND offer_id=$2 AND status IN ('FAILED','RETRY')", [row.account_id, existing.id, p.imageUrl]);
              await db.query("UPDATE publications SET status='RETRY',attempts=0,error_message=NULL,next_attempt_at=now(),dispatch_token=NULL,telegram_connection_id=NULL WHERE account_id=$1 AND offer_id=$2 AND status IN ('FAILED','RETRY') AND external_message_id IS NULL AND (error_message ILIKE '%preço oficial desatualizado%' OR error_message ILIKE '%nova validação oficial do preço%' OR error_message ILIKE '%imagem do produto não encontrada%')", [row.account_id, existing.id]);
            } catch (imageError) {
              console.error('aliexpress recovery image check failed', JSON.stringify({ productId: p.id, code: clean(imageError?.code || imageError?.name || 'IMAGE_REFRESH_FAILED', 80) }));
            }
          }
          await db.query("UPDATE affiliate_discovery_items SET offer_id=$1,processing_status='LINKED',processed_at=now(),processing_error='' WHERE account_id=$2 AND marketplace='ALIEXPRESS' AND kind='PRODUCT' AND external_id=$3", [existing.id,row.account_id,p.id]);
          totals.duplicates++; continue;
        }
        const promo = formatPromo({ title: p.title, source: 'ALIEXPRESS', template: promoTemplateFor(p), category: p.category?.name || p.classified.category || '', currentPrice: p.currentPrice, originalPrice: p.originalPrice, affiliateUrl: p.affiliateUrl, imageUrl: p.imageUrl, productUrl: p.productUrl });
        promo.message = withChoiceNote(promo.message,p);
        if (p.discoveryKind === 'FEATURED_CAMPAIGN' && p.campaignName) promo.message += `\n\n🔥 CAMPANHA ALIEXPRESS: ${p.campaignName}`;
        if (p.coupon) promo.message += `\n\n🎟️ CUPOM: ${p.coupon.code}\n${p.coupon.value}${p.coupon.minSpend ? ' | Mínimo: '+p.coupon.minSpend : ''}\nVálido até: ${p.coupon.end}`;
        const offerId = crypto.randomUUID();
        const inserted = await db.query(
          "INSERT INTO offers(id,account_id,title,source,original_price,current_price,category_id,affiliate_url,image_url,product_url,coupon_url,coupon_code,discount_percent,score,status,message,fingerprint,validation_status,imported_by,storefront_visible,subcategory,classification_tags,classification_confidence,classification_status,classification_reason,source_category) VALUES($1,$2,$3,'ALIEXPRESS',$4,$5,$6,$7,$8,$9,$20,$21,$10,$11,'PENDING',$12,$13,'PENDING','ALIEXPRESS_AUTO',false,$14,$15::jsonb,$16,$18,$17,$19) ON CONFLICT DO NOTHING RETURNING id",
          [offerId, row.account_id, p.title, p.originalPrice, p.currentPrice, p.category?.id || null, p.affiliateUrl, p.imageUrl, p.productUrl, p.discount, p.score, promo.message, p.fp, p.classified.subcategory || null, JSON.stringify(p.classified.tags || []), p.classified.confidence || 0, p.qualityFlags.length ? p.qualityFlags.join('|') : 'Importação automática via API oficial; preço, desconto, link e imagem presentes.', p.qualityFlags.length ? 'REVIEW' : 'AUTO', p.sourceCategory || null, p.coupon?.url || null, p.coupon?.code || null]
        );
        if (!inserted.rows.length) { totals.duplicates++; continue; }
        try {
          await db.query("UPDATE offers SET radar_score=$1,radar_reasons=$2,updated_at=now() WHERE id=$3 AND account_id=$4 AND source='ALIEXPRESS'", [p.score, JSON.stringify({rating:p.rating,sales:p.sales,commission:p.commission,discount:p.discount,choices:!!p.choices}), offerId, row.account_id]);
          await db.query("INSERT INTO offer_price_history(id,account_id,offer_id,price,original_price,source_type,source_reference,verified_at) VALUES($1,$2,$3,$4,$5,'OFFICIAL_API',$6,now())", [crypto.randomUUID(), row.account_id, offerId, p.currentPrice, p.originalPrice, 'ALIEXPRESS:' + p.id]);
          await db.query("UPDATE offers SET status='PENDING',validation_status='PENDING_REVIEW',classification_status=$3,classification_reason=$4,updated_at=now() WHERE id=$1 AND account_id=$2 AND status='PENDING'", [offerId, row.account_id, p.qualityFlags.length ? 'REVIEW' : 'AUTO', p.qualityFlags.length ? p.qualityFlags.join('|') : 'Importação automática via API oficial; aguardando validação de requisitos.']);
          await db.query("UPDATE affiliate_discovery_items SET offer_id=$1,processing_status='LINKED',processed_at=now(),processing_error='' WHERE account_id=$2 AND marketplace='ALIEXPRESS' AND kind='PRODUCT' AND external_id=$3", [offerId,row.account_id,p.id]);
          totals.imported++;
          accountImported++;
        } catch (error) {
          await db.query("UPDATE offers SET status='PENDING',validation_status='PENDING_REVIEW',classification_status='REVIEW',classification_reason=$3,updated_at=now() WHERE id=$1 AND account_id=$2", [offerId, row.account_id, 'Falha ao registrar histórico de preço oficial; exige revisão.']);
          totals.failed++;
        }
      }
      await db.query("UPDATE marketplace_api_credentials SET last_checked_at=now(),last_error='',updated_at=now() WHERE account_id=$1 AND marketplace='ALIEXPRESS'", [row.account_id]);
      // The review gate auto-approves only offers that pass every hard requirement; low known commission/rating stays for human review.
    } catch (error) {
      totals.failed++;
      const code = clean(error?.message || 'ERROR', 100);
      await db.query("UPDATE marketplace_api_credentials SET last_error=$2,updated_at=now() WHERE account_id=$1 AND marketplace='ALIEXPRESS'", [row.account_id, code]);
      console.error('aliexpress ingestion failed', code);
    }
  }
  if (totals.imported > 0) {
    // The review worker has its own hourly cron; avoid spending a one-shot scheduler slot.
    totals.reviewTriggered = false;
    totals.reviewScheduledByCron = true;
  }
  totals.ok = totals.failed === 0 && !totals.reviewTriggerError;
  return res.json({ ...totals, dryRun, discovery: { standardKeywordSearches: 3, keywordCatalogSize: expandedKeywords.length, advancedMethodsAttempted: ['hotProducts','featuredCampaigns','featuredCampaignProducts','hotProductDownload','categoryCatalog'], smartmatchSkipped: 'LEGACY_AFFILIATE_API_DEPRECATED_AND_PROVIDER_REJECTED', maxDiscoveryCallsPerAccount: 13, affiliateLinkGenerationCap: 2, skuDetailCallsPerRun: 1, maxOffersProcessedPerRun: 8, productDetailEnrichment: 'top_10_candidates_when_permitted', categoryCatalogRead: true, rotatingSearchPages: 10, allDiscoveredProductsPersisted: true, choiceMetadataPreservedInRawData: true, priorityScore: 'rating+sales+commission+discount+completeness+choices', skuDetailMethod: 'aliexpress.affiliate.product.sku.detail.get', skuDetailCallsPerRun: 1 }, publicationEnabled: !dryRun, humanReviewRequired: 'ONLY_FAILED_REQUIREMENTS_OR_LOW_KNOWN_QUALITY', note: dryRun ? 'Prévia somente leitura: nenhum link foi gerado, nenhuma oferta foi gravada e nenhuma publicação foi acionada.' : 'Ofertas que passam os requisitos serão aprovadas e enviadas ao fluxo automático; as que falham requisitos ou têm comissão/avaliação conhecida abaixo do limite ficam para revisão humana.' });
}