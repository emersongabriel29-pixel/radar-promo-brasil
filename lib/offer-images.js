import { storage } from 'hatchable';
export function offerImage(row,{publicAccess=false}={}) {
  const key=row.imageStorageKey||row.image_storage_key;
  if(!key)return row.imageUrl||row.image_url||'';
  const id=row.offerId||row.offer_id||row.id;
  return publicAccess ? (id ? '/api/public/media/'+encodeURIComponent(String(id)) : '') : (id ? '/api/media/offer/'+encodeURIComponent(String(row.offerId||row.offer_id||id)) : '');
}
export async function hydrateImages(rows,options={}) {
  return Promise.all(rows.map(async row=>({...row,imageUrl:offerImage(row,options)})));
}

export async function cacheOfferImage(row, db) {
  const source=String(row.imageUrl||row.image_url||'').trim();
  const accountId=row.accountId||row.account_id;
  const offerId=row.offerId||row.offer_id;
  const publicationId=row.id;
  const existingKey=row.imageStorageKey||row.image_storage_key;
  if(existingKey){
    try{
      await storage.head(existingKey);
      return await storage.url(existingKey);
    }catch{}
  }
  if(!/^https:\/\//i.test(source))throw Object.assign(new Error('URL de imagem HTTPS inválida.'),{code:'MEDIA_URL_INVALID'});
  let parsed;
  try{parsed=new URL(source);}catch{throw Object.assign(new Error('URL de imagem inválida.'),{code:'MEDIA_URL_INVALID'});}
  if(parsed.username||parsed.password)throw Object.assign(new Error('URL de imagem inválida.'),{code:'MEDIA_URL_INVALID'});
  let response;
  try{response=await fetch(source,{signal:AbortSignal.timeout(10000),redirect:'follow'});}
  catch(error){throw Object.assign(new Error('Falha ao baixar imagem ('+String(error?.name||'FetchError').slice(0,40)+').'),{code:'MEDIA_FETCH_FAILED'});}
  if(response.status===404||response.status===410)throw Object.assign(new Error('Imagem do produto não encontrada (HTTP '+response.status+').'),{code:'MEDIA_IMAGE_NOT_FOUND'});
  if(!response.ok)throw Object.assign(new Error('Falha ao baixar imagem: HTTP '+response.status+'.'),{code:'MEDIA_FETCH_FAILED'});
  const type=String(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
  if(!/^image\/(jpeg|png|webp|gif)$/.test(type))throw Object.assign(new Error('A URL não retornou uma imagem compatível.'),{code:'MEDIA_TYPE_UNSUPPORTED'});
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(!bytes.byteLength||bytes.byteLength>8*1024*1024)throw Object.assign(new Error('A imagem está vazia ou excede 8 MB.'),{code:'MEDIA_SIZE_INVALID'});
  const ext=type==='image/jpeg'?'jpg':type.split('/')[1];
  const key='offer-images/'+String(accountId)+'/'+String(offerId)+'.'+ext;
  try{
    await storage.put(key,bytes,type);
    if(db&&accountId&&offerId){
      await db.query('UPDATE offers SET image_storage_key=$1,updated_at=now() WHERE id=$2 AND account_id=$3',[key,offerId,accountId]);
      if(publicationId)await db.query("UPDATE publications SET image_storage_key=$1 WHERE id=$2 AND account_id=$3 AND status IN ('READY','RETRY','DISPATCHING')",[key,publicationId,accountId]);
    }
  }catch(error){
    throw Object.assign(new Error('Falha ao armazenar imagem em cache ('+String(error?.name||'StorageError').slice(0,40)+').'),{code:'MEDIA_STORAGE_FAILED'});
  }
  try{return await storage.url(key);}catch(error){throw Object.assign(new Error('Falha ao gerar URL da imagem em cache.'),{code:'MEDIA_STORAGE_FAILED'});}
}