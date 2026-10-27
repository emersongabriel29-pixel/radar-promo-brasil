const normalize = value => String(value ?? '')
  .normalize('NFD')
  .replace(/[\\u0300-\\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

// Medication listings are excluded from affiliate ingestion, including products
// advertised as medicines by their title or URL. Keep matching conservative:
// ordinary personal-care products (e.g. shampoo, skincare) remain eligible.
const MEDICATION_TERMS = /\\b(medicamento|medicamentos|remedio|remedios|farmaco|farmacos|farmaceutic[oa]s?|antibiotic[oa]s?|antibioticos|analgesic[oa]s?|anti inflamatorio|anti inflamatorios|anticoncepcional|anticoncepcionais|antidepressiv[oa]s?|ansiolitic[oa]s?|antialergic[oa]s?|antihistaminic[oa]s?|corticoide|corticoides|insulina|metformina|ivermectina|azitromicina|amoxicilina|dipirona|paracetamol|ibuprofeno|omeprazol|losartana|rivotril|clonazepam|fluoxetina|sertralina|venlafaxina|ozempic|wegovy|mounjaro|semaglutida|tirzepatida|remedio controlado|receita medica|uso oral|comprimidos?|capsulas? medicinal)\\b/;

export function isMedicationProduct(input = {}) {
  const text = normalize([
    input.title ?? input.name ?? '',
    input.description ?? '',
    input.product_url ?? input.productUrl ?? input.url ?? ''
  ].join(' '));
  // Exempt clearly non-medicinal storage/accessory products even when their title
  // mentions what they store or organize.
  if (/\\b(organizador|caixa organizadora|porta comprimidos|estojo|cortador de comprimidos|lembrete)\\b/.test(text) && /\\b(medicamentos?|remedios?|comprimidos?)\\b/.test(text)) return false;
  return MEDICATION_TERMS.test(text);
}

export const PRODUCT_SAFETY_RULES_VERSION = '1.0.0';
