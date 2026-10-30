import { isMedicationProduct } from './product-safety.js';

const normalize = value => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

export const normalizeLomadeeCategory = normalize;
const hasToken = (text, token) => (' ' + text + ' ').includes(' ' + normalize(token) + ' ');

const RULES = [
  { category: 'Sex shop', subcategory: 'Bem-estar íntimo', tokens: ['sex shop','sexshop','vibrador','vibradores','masturbador','masturbadores','anel peniano','estimulador intimo','estimulador sexual','plug anal','lubrificante intimo','preservativo','camisinha','fantasia sensual','boneca inflavel','lingerie sensual'] },
  { category: 'Bebês e crianças', subcategory: 'Bebês, brinquedos e infantil', tokens: ['bebe','bebes','infantil','crianca','criancas','fralda','chupeta','mamadeira','carrinho de bebe','berco','cadeirinha infantil','brinquedo','boneca','boneco','lego','massinha','baby','kids'] },
  { category: 'Pet', subcategory: 'Produtos para animais', tokens: ['pet','racao','cachorro','cachorros','gato','gatos','areia higienica','coleira','arranhador','comedouro','bebedouro pet','tapete higienico'] },
  { category: 'Tecnologia', subcategory: 'Eletrônicos e informática', tokens: ['celular','smartphone','iphone','notebook','laptop','computador','monitor','smart tv','televisao','tablet','fone','headset','teclado','mouse','impressora','roteador','camera digital','webcam','smartwatch','videogame','console','ssd','memoria ram','placa de video','carregador usb','electronics'] },
  { category: 'Esporte e lazer', subcategory: 'Esportes, fitness e lazer', tokens: ['esporte','futebol','bicicleta','bike','academia','musculacao','halter','halteres','anilha','bola','whey','creatina','suplemento','suplementos','proteina','colchonete','esteira','barraca camping','pesca','camping','fitness','sport'] },
  { category: 'Alimentos e bebidas', subcategory: 'Alimentos e bebidas', tokens: ['alimento','alimentos','bebida','bebidas','cafe','cha','chocolate','doce','doces','biscoito','bolacha','azeite','tempero','suco','agua mineral','food','grocery'] },
  { category: 'Casa e cozinha', subcategory: 'Móveis, cozinha e utilidades', tokens: ['armario','armarios','cozinha','sofa','mesa','cadeira','cama','colchao','guarda roupa','rack','estante','geladeira','fogao','microondas','air fryer','liquidificador','cafeteira','panela','panelas','talher','utensilio','decoracao','luminaria','ventilador','aspirador','maquina de lavar','torneira','furadeira','parafuso','abracadeira','ferramenta','ferramentas','lavanderia','cortina','tapete','almofada','puff','poltrona','lareira','jardim','piscina','ar condicionado','home','kitchen','furniture'] },
  { category: 'Moda e beleza', subcategory: 'Roupas, acessórios e cuidados pessoais', tokens: ['roupa','camiseta','cueca','calcinha','lingerie','vestido','calca','bermuda','saia','blusa','camisa','meia','tenis','sapato','sandalia','bolsa','mochila','perfume','maquiagem','skincare','cosmetico','cabelo','shampoo','condicionador','creme hidratante','relogio','oculos','bijuteria','joia','absorvente','protetor diario','higiene pessoal','fashion','clothing','beauty'] }
];

function productFields(product = {}) {
  const option = (Array.isArray(product.options) ? product.options : []).find(item => item?.available) || product.options?.[0] || {};
  const sourceCategories = [
    ...(Array.isArray(product.categories) ? product.categories : []),
    ...(Array.isArray(option.categories) ? option.categories : [])
  ].map(value => String(value ?? '').trim()).filter(Boolean).slice(0, 10);
  const title = String(option.name || product.name || '').trim().slice(0, 220);
  return {
    option, title, sourceCategories,
    primaryText: normalize([title, ...sourceCategories].filter(Boolean).join(' ')),
    urlText: normalize(product.url)
  };
}

export function classifyLomadeeProduct(product = {}) {
  const { option, title, sourceCategories, primaryText, urlText } = productFields(product);
  const blocked = isMedicationProduct({
    title,
    description: [product.description, option.description].filter(Boolean).join(' '),
    sourceCategory: sourceCategories.join(' '),
    product_url: product.url
  });
  if (blocked) {
    return { blocked: true, category: 'Ofertas gerais', subcategory: 'Bloqueado por segurança', tags: ['lomadee', 'medicamento-bloqueado'], confidence: 1, rule: 'medication-safety' };
  }

  // For short variation names (flavors/colors), the URL slug may identify the actual product
  // more reliably than the variation label. Single-character titles remain unclassified.
  if (title.length >= 6 && title.length <= 24) {
    for (const rule of RULES) {
      if (rule.tokens.some(token => hasToken(urlText, token))) {
        return {
          blocked: false, category: rule.category, subcategory: rule.subcategory,
          tags: ['lomadee', normalize(rule.category).replace(/\s+/g, '-'), normalize(rule.subcategory).replace(/\s+/g, '-')],
          confidence: 0.72, rule: 'short-title-url-slug'
        };
      }
    }
  }

  for (const rule of RULES) {
    if (rule.tokens.some(token => hasToken(primaryText, token))) {
      return {
        blocked: false, category: rule.category, subcategory: rule.subcategory,
        tags: ['lomadee', normalize(rule.category).replace(/\s+/g, '-'), normalize(rule.subcategory).replace(/\s+/g, '-')],
        confidence: 0.92, rule: 'title-and-source-category'
      };
    }
  }

  return { blocked: false, category: 'Ofertas gerais', subcategory: 'A classificar', tags: ['lomadee', 'a-classificar'], confidence: 0.35, rule: 'fallback-review' };
}

export function selectDiverseLomadeeProducts(candidates, options = {}) {
  const maxItems = Math.max(1, Math.min(30, Number(options.maxItems) || 12));
  const maxPerOrganization = Math.max(1, Math.min(10, Number(options.maxPerOrganization) || 2));
  const maxPerCategory = Math.max(1, Math.min(10, Number(options.maxPerCategory) || 4));
  const seen = new Set();
  const orgCounts = new Map();
  const categoryCounts = new Map();
  const selected = [];

  for (const candidate of Array.isArray(candidates) ? candidates : []) {
    const product = candidate?.product || {};
    const key = String(product.id || product._id || candidate?.productUrl || product.url || '').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const organization = String(product.organizationId || candidate?.organizationId || 'unknown');
    const category = String(candidate?.classification?.category || 'Ofertas gerais');
    if ((orgCounts.get(organization) || 0) >= maxPerOrganization) continue;
    if ((categoryCounts.get(category) || 0) >= maxPerCategory) continue;

    selected.push(candidate);
    orgCounts.set(organization, (orgCounts.get(organization) || 0) + 1);
    categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    if (selected.length >= maxItems) break;
  }
  return selected;
}

export const LOMADEE_CATALOG_POLICY = Object.freeze({
  pagesPerRun: 5,
  pageStride: 5,
  maxImportsPerRun: 12,
  maxPerOrganization: 2,
  maxPerCategory: 4,
  version: '1.0.3'
});