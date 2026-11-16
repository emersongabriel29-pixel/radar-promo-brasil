export async function publicFeedImages(rows,storage) {
  return Promise.all(rows.map(async row=>{
    const {imageStorageKey,image_storage_key,...offer}=row;
    const key=imageStorageKey||image_storage_key;
    let imageUrl=typeof row.imageUrl==='string' && /^https:\/\//i.test(row.imageUrl)?row.imageUrl:'';
    if(key) {
      try { imageUrl=await storage.url(key,{ttl:300}); }
      catch { /* Preserve the offer and use a verified original HTTPS URL when available. */ }
    }
    return {...offer,imageUrl};
  }));
}
