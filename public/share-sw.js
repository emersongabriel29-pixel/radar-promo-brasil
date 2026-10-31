self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
  const request=event.request;
  const url=new URL(request.url);
  if(request.method==='POST'&&url.origin===self.location.origin&&url.pathname==='/share-import.html'){
    event.respondWith((async()=>{
      const form=await request.formData();
      const query=new URLSearchParams();
      for(const key of ['title','text','url']){
        const value=form.get(key);
        if(typeof value==='string'&&value)query.set(key,value);
      }
      const destination=new URL('/share-import.html?'+query.toString(),url.origin);
      return Response.redirect(destination.href,303);
    })());
  }
});
