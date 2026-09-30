import { storage } from 'hatchable';
export async function offerImage(row) {
  const key=row.imageStorageKey||row.image_storage_key;
  return key ? await storage.url(key) : row.imageUrl||row.image_url||'';
}
export async function hydrateImages(rows) {
  return Promise.all(rows.map(async row=>({...row,imageUrl:await offerImage(row)})));
}
