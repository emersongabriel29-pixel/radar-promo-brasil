export const MARKETPLACE_ROTATION_LIMIT = 20;
export const MARKETPLACE_SOURCE_ORDER = ['ALIEXPRESS','SHOPEE','LOMADEE','AMAZON','MERCADOLIVRE','CASAS_BAHIA','MAGALU','RAKUTEN','SHEIN','TEMU'];

export function chooseMarketplaceSource({availableSources=[],lastSource='',consecutiveCount=0,limit=MARKETPLACE_ROTATION_LIMIT,sourceOrder=MARKETPLACE_SOURCE_ORDER}={}) {
  const available=[...new Set(availableSources.map(x=>String(x||'').trim().toUpperCase()).filter(Boolean))];
  if(!available.length)return null;
  const last=String(lastSource||'').trim().toUpperCase();
  if(last && Number(consecutiveCount||0)<limit && available.includes(last))return last;
  const alternatives=available.filter(source=>source!==last);
  const candidates=alternatives.length?alternatives:available;
  const lastIndex=sourceOrder.indexOf(last);
  const ordered=[...sourceOrder.slice(lastIndex+1),...sourceOrder.slice(0,lastIndex+1)];
  for(const source of ordered)if(candidates.includes(source))return source;
  return candidates.sort()[0];
}