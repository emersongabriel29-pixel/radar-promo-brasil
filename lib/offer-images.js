export function offerImage(row,{publicAccess=false}={}) {
  const key=row.imageStorageKey||row.image_storage_key;
  if(!key)return row.imageUrl||row.image_url||'';
  const id=row.id||row.offerId||row.offer_id;
  return publicAccess ? (id ? '/api/public/media/offer/'+encodeURIComponent(String(id)) : '') : (id ? '/api/media/offer/'+encodeURIComponent(String(row.offerId||row.offer_id||id)) : '');
}
export async function hydrateImages(rows,options={}) {
  return Promise.all(rows.map(async row=>({...row,imageUrl:offerImage(row,options)})));
}
