const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const RULES = [
 {category:'Sex shop', subcategories:[['Vibradores e massageadores',/\b(vibrador|vibradores|massageador intimo|massageador pessoal|sugador intimo)\b/],['Lubrificantes e géis',/\b(lubrificante|lubrificantes|gel intimo|gel lubrificante)\b/],['Preservativos e proteção',/\b(preservativo|preservativos|camisinha|camisinhas|anel peniano)\b/],['Lingerie sensual',/\b(lingerie sensual|fantasia erotica|fantasia sensual|body sensual)\b/],['Acessórios íntimos',/\b(plug anal|consolo|bolas tailandesas|algema sensual|pompoarismo)\b/],['Bem-estar íntimo',/\b(sex shop|sexshop|produto erotico|estimulador sexual|higiene intima)\b/]]},
 {category:'Bebês e crianças',subcategories:[['Cuidados infantis',/\b(fralda|bebe|mamadeira|chupeta|carrinho de bebe|infantil)\b/]]},
 {category:'Tecnologia',subcategories:[['Celulares e computadores',/\b(celular|smartphone|iphone|samsung|xiaomi|notebook|computador|tablet|monitor)\b/],['Áudio e games',/\b(fone|headset|fone de ouvido|playstation|xbox|nintendo|videogame|controle gamer|caixa de som)\b/]]},
 {category:'Casa e cozinha',subcategories:[['Eletrodomésticos',/\b(air fryer|fritadeira|liquidificador|geladeira|fogao|microondas|aspirador|cafeteira)\b/],['Casa e organização',/\b(panela|cozinha|movel|cama|mesa|cadeira|organizadores|decoracao|ferramenta)\b/]]},
 {category:'Moda e beleza',subcategories:[['Moda',/\b(vestido|camisa|calca|tenis|bolsa|sapato|jaqueta|roupa)\b/],['Beleza e cuidados pessoais',/\b(perfume|maquiagem|creme|shampoo|protetor solar|skincare|hidratante)\b/]]},
 {category:'Pet',subcategories:[['Produtos para pets',/\b(cachorro|gato|racao|coleira|areia sanitaria|brinquedo pet|petisco)\b/]]},
 {category:'Esporte e lazer',subcategories:[['Esporte e atividades',/\b(bicicleta|halter|academia|yoga|camping|barraca|pesca|bola de futebol)\b/]]},
 {category:'Alimentos e bebidas',subcategories:[['Alimentos',/\b(cafe|chocolate|biscoito|azeite|alimento|bebida)\b/]]}
];
export function classifyProduct(input = {}) {
 const text = normalize([input.title ?? input.name ?? '', input.description ?? '', input.sourceCategory ?? input.source_category ?? input.category ?? ''].join(' '));
 for (const rule of RULES) for (const [subcategory, pattern] of rule.subcategories) if (pattern.test(text)) return {category:rule.category,subcategory,tags:[normalize(rule.category).replace(/\s+/g,'-'),normalize(subcategory).replace(/\s+/g,'-')],confidence:input.sourceCategory||input.source_category||input.category?0.96:0.88,needsReview:false,reason:'keyword_match'};
 return {category:'Ofertas gerais',subcategory:'A classificar',tags:['ofertas-gerais'],confidence:0.25,needsReview:true,reason:'no_reliable_match'};
}
export function categoryHint(title, source = '') { return classifyProduct({title}).category; }
export const CATEGORY_RULES_VERSION = '1.0.0';