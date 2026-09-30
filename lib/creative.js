// Facts are appended from trusted form/database values, never copied from model output.
export function safeCreative(value,max=7000) {
  const text=String(value??'').trim().slice(0,max);
  return /R\$|\d\s*%|https?:\/\/|www\.|cupom|frete|estoque|garantia|menor pre[cç]o|[uú]ltimas unidades|s[oó] hoje|pre[cç]o\s*[:=]|\b\d+[.,]\d{2}\b/i.test(text)?'':text;
}
