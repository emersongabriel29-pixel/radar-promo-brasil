const normalize = value => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

// Union of Hatchable's production filter and the additional high-risk names
// covered by the GitHub branch. Match titles, descriptions, categories, tags and URLs.
const MEDICATION_TERMS = /\b(medicamento|medicamentos|remedio|remedios|farmaco|farmacos|farmaceutic[oa]s?|antibiotic[oa]s?|analgesic[oa]s?|anti inflamatorio|anti inflamatorios|anticoncepcional|anticoncepcionais|antidepressiv[oa]s?|ansiolitic[oa]s?|antialergic[oa]s?|antihistaminic[oa]s?|antiacidos?|corticoide|corticoides|insulina|metformina|ivermectina|azitromicina|amoxicilina|dipirona|paracetamol|ibuprofeno|omeprazol|losartana|rivotril|clonazepam|fluoxetina|sertralina|venlafaxina|ozempic|wegovy|mounjaro|semaglutida|tirzepatida|receita medica|uso oral|comprimidos?|capsulas?|comprim|caps|cpr|cps|drageas?|xarope|suspensao oral|solucao oral|gotas orais|ampolas?|injetavel|mg ml|mcg ml|ui ml|\d+(?:[.,]\d+)?\s*(?:mg|mcg|ui))\b/;
const MEDICINE_NAMES = /\b(allegra|alivium|fluimucil|addera|allestra|adipept|naldecon|buscofem|novalgina|benegrip|neocopan|cimegripe|tylenol|advil|claritin|zyrtec|polaramine|desalex|fexofenadina|cetoprofeno|ivermectina|ciproterona|etinilestradiol|paracetamol|dipirona|ibuprofeno|amoxicilina|azitromicina|omeprazol|losartana|metformina|sinvastatina|cetirizina|loratadina|prednisona|dexametasona|insulina|dorflex|neosaldina|aspirina|buscopan|nimesulida|diclofenaco|clonazepam|sertralina|fluoxetina|rivotril|anticoncepcional|ozempic|wegovy|mounjaro|semaglutida|tirzepatida)\b/;
const ACCESSORY_TITLE = /\b(organizador|caixa organizadora|porta comprimidos|estojo|cortador de comprimidos|lembrete)\b/;
const SPECIFIC_MEDICATION_MARKERS = /\b(antibiotic[oa]s?|analgesic[oa]s?|anti inflamatorio|anticoncepcional|antidepressiv[oa]s?|ansiolitic[oa]s?|antialergic[oa]s?|antihistaminic[oa]s?|corticoide|insulina|metformina|ivermectina|azitromicina|amoxicilina|dipirona|paracetamol|ibuprofeno|omeprazol|losartana|clonazepam|fluoxetina|sertralina|venlafaxina|ozempic|wegovy|mounjaro|semaglutida|tirzepatida|\d+(?:[.,]\d+)?\s*(?:mg|mcg|ui)|xarope|suspensao oral|solucao oral|gotas orais|ampolas?|injetavel)\b/;

export function isMedicationProduct(input = {}) {
  const title = normalize(input.title ?? input.name ?? '');
  const text = normalize([
    input.title ?? input.name ?? '',
    input.description ?? '',
    input.sourceCategory ?? input.source_category ?? input.category ?? '',
    input.subcategory ?? '',
    input.tags ?? '',
    input.classification_tags ?? '',
    input.product_url ?? input.productUrl ?? input.url ?? ''
  ].join(' '));

  // Keep clearly non-medicinal organizers/accessories eligible, but never exempt
  // an item with a specific drug, dosage, pharmaceutical form or medicinal claim.
  if (ACCESSORY_TITLE.test(title) && !SPECIFIC_MEDICATION_MARKERS.test(text) && !MEDICINE_NAMES.test(text)) return false;
  return MEDICATION_TERMS.test(text) || MEDICINE_NAMES.test(text);
}

const ADULT_PRODUCT_TERMS = /\b(vibrador(?:es)?(?: intimo(?:s)?| sexual(?:is)?| recarregavel(?:is)?| deusa)|vibrador(?:es)?[^,]{0,80}(?:brinquedo|produtos? sexuais?)|massageador(?:es)? intimo(?:s)?|massageador(?:es)? sexual(?:is)?|sugador(?:es)? intimo(?:s)?|estimulador(?:es)? sexual(?:is)?|lubrificante(?:s)? intimo(?:s)?|gel lubrificante|lingerie sensual|fantasia sensual|body sensual|calcinha tailandesa|calcinha(?:s)?[^,]{0,50}(?:sensual|sexy|erotica|frases? picantes?)|camisola(?:s)?[^,]{0,50}(?:sensual|sexy|erotica)|fio dental[^,]{0,40}(?:sensual|sexy|erotica)|perolas? massageadoras?|anel massageador|brinquedo(?:s)? sexual(?:is)?|plug anal|consolo(?:s)?|anel peniano|bolas tailandesas|acessorio(?:s)? erotico(?:s)?|produto(?:s)? erotico(?:s)?|sex ?shop|sex toy|dildo(?:s)?|masturbador(?:es)?|bullet vibrador|bomba peniana|penis de borracha|fantasia erotica)\b/;
const CONTRACEPTIVE_ONLY_TERMS = /\b(preservativo(?:s)?|camisinha(?:s)?|condom(?:s)?|contraceptivo(?:s)?|anticoncepcional(?:is)?)\b/;

export function isAdultProduct(input = {}) {
  const text = normalize([
    input.title ?? input.name ?? '',
    input.description ?? '',
    input.sourceCategory ?? input.source_category ?? input.category ?? '',
    input.subcategory ?? '',
    input.tags ?? '',
    input.classification_tags ?? '',
    input.product_url ?? input.productUrl ?? input.url ?? ''
  ].join(' '));
  if (!ADULT_PRODUCT_TERMS.test(text)) return false;
  const title = normalize(input.title ?? input.name ?? '');
  if (CONTRACEPTIVE_ONLY_TERMS.test(title) && !ADULT_PRODUCT_TERMS.test(title)) return false;
  return true;
}

export const PRODUCT_SAFETY_RULES_VERSION = '1.3.0';
// Same deterministic medication policy for SQL claims of already queued offers.
// Only a trusted table alias is accepted; no caller-provided values enter SQL.
export function medicationProductSql(alias = 'o') {
  if (!/^[a-z_][a-z0-9_]*$/i.test(alias)) throw new Error('Alias SQL inválido.');
  const normalizeSql = expression => `trim(regexp_replace(translate(lower(${expression}), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn'), '[^a-z0-9]+', ' ', 'g'))`;
  const title=normalizeSql(`COALESCE(${alias}.title,'')`);
  const text=normalizeSql(`concat_ws(' ',${alias}.title,${alias}.source_category,${alias}.subcategory,${alias}.classification_tags::text,${alias}.product_url)`);
  const pattern = regex => "'"+regex.source.replace(/\\b/g,'\\y').replace(/'/g,"''")+"'";
  const medicines=`(${text} ~ ${pattern(MEDICATION_TERMS)} OR ${text} ~ ${pattern(MEDICINE_NAMES)})`;
  const accessory=`(${title} ~ ${pattern(ACCESSORY_TITLE)} AND ${text} !~ ${pattern(SPECIFIC_MEDICATION_MARKERS)} AND ${text} !~ ${pattern(MEDICINE_NAMES)})`;
  return `(${medicines} AND NOT ${accessory})`;
}
