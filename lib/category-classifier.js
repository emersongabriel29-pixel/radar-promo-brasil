const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const SOURCE_RULES = [
  { category: 'Alimentos e bebidas', pattern: /\b(food|grocery|canned food|frozen products|vegetables|greens|meat|fruits|berries|bread|pastries|sausages|fish|sea food|nut|kernel|dried fruit|grain products|coffee|milk|eggs|ready meal|water|juices|drinks|tea|snacks|beverages)\b/ },
  { category: 'Moda e beleza', pattern: /\b(apparel|accessories|clothing|fashion|shoes|footwear|jewelry|watches|beauty|personal care|makeup|skincare|sportswears?)\b/ },
  { category: 'Bebês e crianças', pattern: /\b(mother|kids|baby|babies|infant|children|toys)\b/ },
  { category: 'Pet', pattern: /\b(pet products|pet supplies|dog|dogs|cat|cats|pet food)\b/ },
  { category: 'Tecnologia', pattern: /\b(consumer electronics|phones|telecommunications|computers|computer|tablets|audio|video|mobile phones|electronic components|security protection)\b/ },
  { category: 'Casa e cozinha', pattern: /\b(home|garden|home improvement|kitchen|household|furniture|lighting|bathroom|tools|hardware)\b/ },
  { category: 'Esporte e lazer', pattern: /\b(sports|outdoors|cycling|fitness|camping|fishing|sports entertainment)\b/ }
];

const RULES = [
  { category: 'Sex shop', subcategories: [
    ['Vibradores e massageadores', /\b(vibrador(?:es)? intimo(?:s)?|vibrador(?:es)? sexual(?:is)?|massageador(?:es)? intimo(?:s)?|massageador(?:es)? pessoal(?:is)?|sugador(?:es)? intimo(?:s)?)\b/],
    ['Lubrificantes e géis', /\b(lubrificante(?:s)? intimo(?:s)?|gel intimo|gel lubrificante|lubrificante sexual)\b/],
    ['Preservativos e proteção', /\b(preservativo(?:s)?|camisinha(?:s)?|anel peniano)\b/],
    ['Lingerie sensual', /\b(lingerie sensual|fantasia erotica|fantasia sensual|body sensual)\b/],
    ['Acessórios íntimos', /\b(plug anal|consolo|bolas tailandesas|algema sensual|pompoarismo)\b/],
    ['Bem-estar íntimo', /\b(sex shop|sexshop|produto erotico|estimulador sexual|bem estar intimo)\b/]
  ]},
  { category: 'Bebês e crianças', subcategories: [['Cuidados infantis', /\b(fralda(?:s)?|bebe|mamadeira|chupeta|carrinho de bebe|cadeirinha.*bebe|infantil|maternidade|brinquedo educativo)\b/]] },
  { category: 'Pet', subcategories: [['Produtos para pets', /\b(cachorro|cachorros|cao|caes|gato|gatos|racao|coleira|areia sanitaria|brinquedo pet|petisco|pet shop|comedouro|bebedouro pet)\b/]] },
  { category: 'Tecnologia', subcategories: [
    ['Celulares e computadores', /\b(celular|smartphone|iphone|samsung|xiaomi|notebook|computador|tablet|monitor|ssd|memoria ram|teclado|mouse|carregador|power bank|camera de seguranca)\b/],
    ['Áudio e games', /\b(fone|headset|fone de ouvido|playstation|xbox|nintendo|videogame|controle gamer|caixa de som|bluetooth)\b/]
  ]},
  { category: 'Casa e cozinha', subcategories: [
    ['Eletrodomésticos', /\b(air fryer|airfryer|fritadeira|liquidificador|geladeira|fogao|microondas|aspirador|cafeteira|ventilador|purificador|maquina de lavar)\b/],
    ['Casa e organização', /\b(panela|cozinha|movel|cama|mesa|cadeira|organizador|organizadores|decoracao|ferramenta|forma de silicone|utensilio|luminaria|forro de papel)\b/]
  ]},
  { category: 'Moda e beleza', subcategories: [
    ['Moda', /\b(vestido|camisa|calca|tenis|bolsa|sapato|jaqueta|roupa|camiseta|blusa|shorts|relogio|oculos de sol|joia|bijuteria)\b/],
    ['Beleza e cuidados pessoais', /\b(perfume|maquiagem|creme|shampoo|protetor solar|skincare|hidratante|cosmetico|barbeador|secador de cabelo)\b/]
  ]},
  { category: 'Esporte e lazer', subcategories: [['Esporte e atividades', /\b(bicicleta|halter|halteres|academia|yoga|camping|barraca|pesca|bola de futebol|bola esportiva|patins|skate|esteira|colchonete fitness)\b/]] },
  { category: 'Alimentos e bebidas', subcategories: [['Alimentos', /\b(cafe|chocolate|biscoito|azeite|alimento|bebida|cha|suplemento alimentar)\b/]] }
];

const PROVIDER_NAMES = new Set(['shopee', 'aliexpress', 'amazon', 'lomadee', 'awin', 'admitad', 'rakuten', 'magalu', 'temu', 'mercado livre', 'mercadolivre']);

export function classifyProduct(input = {}) {
  const title = normalize(input.title ?? input.name ?? '');
  const description = normalize(input.description ?? '');
  const sourceCategory = normalize(input.sourceCategory ?? input.source_category ?? input.category ?? '');
  const text = [title, description].filter(Boolean).join(' ');

  for (const rule of RULES) {
    for (const [subcategory, pattern] of rule.subcategories) {
      if (pattern.test(text)) return {
        category: rule.category, subcategory,
        tags: [normalize(rule.category).replace(/\s+/g, '-'), normalize(subcategory).replace(/\s+/g, '-')],
        confidence: sourceCategory && !PROVIDER_NAMES.has(sourceCategory) ? 0.94 : 0.86,
        needsReview: false, reason: 'keyword_match'
      };
    }
  }

  if (sourceCategory && !PROVIDER_NAMES.has(sourceCategory)) {
    for (const rule of SOURCE_RULES) if (rule.pattern.test(sourceCategory)) {
      return {
        category: rule.category, subcategory: 'Categoria da API de origem',
        tags: [normalize(rule.category).replace(/\s+/g, '-')],
        confidence: 0.92, needsReview: false, reason: 'source_category_match'
      };
    }
  }

  return { category: 'Ofertas gerais', subcategory: 'A classificar', tags: ['ofertas-gerais'], confidence: 0.25, needsReview: true, reason: 'no_reliable_match' };
}

export function categoryHint(title, source = '') { return classifyProduct({ title, sourceCategory: source }).category; }
export const CATEGORY_RULES_VERSION = '1.1.0';