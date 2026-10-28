(() => {
  if (window.__radarCaptureLoaded) return; window.__radarCaptureLoaded = true;
  const clean = v => String(v || "").replace(/\\s+/g," ").trim();
  const meta = (...sels) => { for (const s of sels) { const e=document.querySelector(s); const v=e?.content || ""; if(clean(v)) return clean(v); } return ""; };
  const txt = (...sels) => { for (const s of sels) { const e=document.querySelector(s); const v=e?.innerText || e?.textContent || ""; if(clean(v)) return clean(v); } return ""; };
  const platform = () => { const h=location.hostname; if(/mercadolivre|mercadolibre/.test(h)) return "Mercado Livre"; if(h.includes("amazon")) return "Amazon"; if(h.includes("temu")) return "Temu"; if(h.includes("shein")) return "SHEIN"; if(/magazineluiza|magalu/.test(h)) return "Magalu"; return "Outra"; };
  function productLd() { for(const s of document.querySelectorAll('script[type="application/ld+json"]')) { try { const q=[JSON.parse(s.textContent)]; while(q.length){const o=q.shift(); if(!o||typeof o!=="object")continue; if(Array.isArray(o)){q.push(...o);continue;} if(String(o["@type"]||"").toLowerCase()==="product")return o; if(o["@graph"])q.push(...(Array.isArray(o["@graph"])?o["@graph"]:[o["@graph"]])); }} catch(_){} } return {}; }
  function capture() {
    const ld=productLd(), offers=Array.isArray(ld.offers)?ld.offers[0]:(ld.offers||{});
    const title=meta('meta[property="og:title"]','meta[name="twitter:title"]') || txt('#productTitle','h1.ui-pdp-title','.ui-pdp-title','h1.product-intro__head-name','h1') || ld.name || "";
    const price=meta('meta[property="product:price:amount"]','meta[property="og:price:amount"]','meta[itemprop="price"]') || offers.price || txt('.andes-money-amount__fraction','.a-price .a-offscreen','[data-testid*="price"]','[class*="price"]');
    const image=meta('meta[property="og:image"]','meta[name="twitter:image"]') || (typeof ld.image==="string"?ld.image:Array.isArray(ld.image)?(typeof ld.image[0]==="string"?ld.image[0]:ld.image[0]?.url):ld.image?.url) || document.querySelector('#landingImage,img.ui-pdp-image,img[class*="product"]')?.src || "";
    const canonical=document.querySelector('link[rel="canonical"]')?.href || location.href;
    return {platform:platform(),title:clean(title).slice(0,500),price:clean(price),originalPrice:txt('.andes-money-amount--previous','s .a-offscreen','del','[class*="original-price"]'),currency:offers.priceCurrency||meta('meta[property="product:price:currency"]')||"BRL",imageUrl:image,productUrl:canonical,sourceUrl:location.href,capturedAt:new Date().toISOString(),sku:clean(ld.sku),brand:clean(typeof ld.brand==="string"?ld.brand:ld.brand?.name),captureMethod:"public_page_metadata_and_dom"};
  }
  chrome.runtime.onMessage.addListener((m,_s,reply)=>{if(m?.type==="RADAR_CAPTURE"){try{reply({ok:true,offer:capture()})}catch(e){reply({ok:false,error:String(e)})}} return true;});
})();