const normalize = value => String(value ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const RULES = [
  { category: 'Sex shop', subcategories: [
    ['Vibradores e massageadores', /\b(vibrador|vibradores|massageador intimo|massageador pessoal|bullet|sugador clitoriano|sugador intimo)\b/],
    ['Lubrificantes e géis', /\b(lubrificante|lubrificantes|gel intimo|gel lubrificante|dessensibilizante)\b/],
    ['Preservativos e proteção', /\b(preservativo|preservativos|camisinha|camisinhas|anel peniano|barreira de latex)\b/],
    ['Lingerie sensual', /\b(lingerie sensual|calcinha comestivel|sutia sensual|fantasia erotica|fantasia sensual|body sensual)\b/],
    ['Acessórios íntimos', /\b(plug anal|plugs anais|consolo|consolos|bolas tailandesas|algema sensual|chicote|pompoarismo)\b/],
    ['Bem-estar íntimo', /\b(bem estar intimo|higiene intima|estimulador intimo|estimulador sexual|produto erotico|sex shop|sexshop|erotico|erotica)\b/]
  ] },
  { category: 'Bebês e crianças', subcategories: [['Cuidados infantis', /\b(fralda|bebe|mamadeira|chupeta|carrinho de bebe|cadeirinha infantil|infantil)\b/]] },
  { category: 'Tecnologia', subcategories: [
    ['Celulares e computadores', /\b(celular|smartphone|iphone|samsung|xiaomi|notebook|computador|tablet|monitor)\b/],
    ['Áudio e games', /\b(fone|headset|fone de ouvido|playstation|xbox|nintendo|videogame|controle gamer|caixa de som)\b/]
  ] },
  { category: 'Casa e cozinha', subcategories: [
    ['Eletrodomésticos', /\b(air fryer|fritadeira|liquidificador|geladeira|fogao|microondas|aspirador|cafeteira)\b/],
    ['Casa e organização', /\b(panela|cozinha|movel|cama|mesa|cadeira|organizadores|decoracao|ferramenta)\b/]
  ] },
  { category: 'Moda e beleza', subcategories: [
    ['Moda', /\b(vestido|camisa|calca|tenis|bolsa|sapato|jaqueta|roupa|lingerie)\b/],
    ['Beleza e cuidados pessoais', /\b(perfume|maquiagem|creme|shampoo|protetor solar|skincare|hidratante|secador de cabelo)\b/]
  ] },
  { category: 'Pet', subcategories: [['Produtos para pets', /\b(cachorro|gato|racao|coleira|areia sanitaria|brinquedo pet|petisco)\b/]] },
  { category: 'Esporte e lazer', subcategories: [['Esporte e atividades', /\b(bicicleta|halter|academia|yoga|camping|barraca|pesca|bola de futebol|tenis esportivo)\b/]] },
  { category: 'Alimentos e bebidas', subcategories: [['Alimentos', /\b(cafe|chocolate|suplemento alimentar|biscoito|azeite|alimento|bebida)\b/]] }
];

export function classifyProduct(input = {}) {
  const title = String(input.title ?? input.name ?? '').slice(0, 300);
  const description = String(input.description ?? '').slice(0, 1200);
  const sourceCategory = String(input.sourceCategory ?? input.source_category ?? input.category ?? '').slice(0, 200);
  const text = normalize([title, description, sourceCategory].join(' '));
  for (const rule of RULES) {
    for (const [subcategory, pattern] of rule.subcategories) {
      if (pattern.test(text)) {
        const tags = [normalize(rule.category).replace(/\s+/g, '-'), normalize(subcategory).replace(/\s+/g, '-')];
        return { category: rule.category, subcategory, tags, confidence: sourceCategory ? 0.96 : 0.88, needsReview: false, reason: 'keyword_match' };
      }
    }
  }
  return { category: 'Ofertas gerais', subcategory: 'A classificar', tags: ['ofertas-gerais'], confidence: 0.25, needsReview: true, reason: 'no_reliable_match' };
}

export function categoryHint(title, source = '') {
  // Marketplace/source name is intentionally not a category signal: otherwise every
  // product from AliExpress, Shopee or Amazon would be misclassified the same way.
  return classifyProduct({ title }).category;
}

export const CATEGORY_RULES_VERSION = '1.0.0';
