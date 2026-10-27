const normalize = value => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

// Union of Hatchable's production filter and the additional high-risk names
// covered by the GitHub branch. Match titles, descriptions, categories, tags and URLs.
const MEDICATION_TERMS = /\b(medicamento|medicamentos|remedio|remedios|farmaco|farmacos|farmaceutic[oa]s?|antibiotic[oa]s?|analgesic[oa]s?|anti inflamatorio|anti inflamatorios|anticoncepcional|anticoncepcionais|antidepressiv[oa]s?|ansiolitic[oa]s?|antialergic[oa]s?|antihistaminic[oa]s?|corticoide|corticoides|insulina|metformina|ivermectina|azitromicina|amoxicilina|dipirona|paracetamol|ibuprofeno|omeprazol|losartana|rivotril|clonazepam|fluoxetina|sertralina|venlafaxina|ozempic|wegovy|mounjaro|semaglutida|tirzepatida|receita medica|uso oral|comprimidos?|capsulas?|comprim|caps|cpr|cps|drageas?|xarope|suspensao oral|solucao oral|gotas orais|ampolas?|injetavel|mg ml|mcg ml|ui ml|\d+(?:[.,]\d+)?\s*(?:mg|mcg|ui))\b/;
const MEDICINE_NAMES = /\b(allegra|alivium|fluimucil|addera|ivermectina|ciproterona|etinilestradiol|paracetamol|dipirona|ibuprofeno|amoxicilina|azitromicina|omeprazol|losartana|metformina|sinvastatina|cetirizina|loratadina|prednisona|dexametasona|insulina|dorflex|neosaldina|aspirina|buscopan|nimesulida|diclofenaco|clonazepam|sertralina|fluoxetina|rivotril|anticoncepcional|ozempic|wegovy|mounjaro|semaglutida|tirzepatida)\b/;
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

export const PRODUCT_SAFETY_RULES_VERSION = '1.1.0';
