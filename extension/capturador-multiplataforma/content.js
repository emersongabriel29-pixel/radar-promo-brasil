(() => {
  if (window.__radarCaptureLoaded) return;
  window.__radarCaptureLoaded = true;
  const clean = v => String(v || "").replace(/\s+/g, " ").trim();
  const meta = (...sels) => {
    for (const s of sels) {
      const e = document.querySelector(s);
      const v = e?.content || e?.getAttribute?.("content") || "";
      if (clean(v)) return clean(v);
    }
    return "";
  };
  const txt = (...sels) => {
    for (const s of sels) {
      const e = document.querySelector(s);
      const v = e?.innerText || e?.textContent || "";
      if (clean(v)) return clean(v);
    }
    return "";
  };
  const platform = () => {
    const h = location.hostname.toLowerCase();
    if (/mercadolivre|mercadolibre/.test(h)) return "Mercado Livre";
    if (h.includes("amazon")) return "Amazon";
    if (h.includes("temu")) return "Temu";
    if (h.includes("shein")) return "SHEIN";
    if (/magazineluiza|magalu/.test(h)) return "Magalu";
    return "Outra";
  };
  function productLd() {
    for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const q = [JSON.parse(s.textContent)];
        while (q.length) {
          const o = q.shift();
          if (!o || typeof o !== "object") continue;
          if (Array.isArray(o)) { q.push(...o); continue; }
          const types = Array.isArray(o["@type"]) ? o["@type"] : [o["@type"]];
          if (types.some(t => String(t).toLowerCase() === "product")) return o;
          if (o["@graph"]) q.push(...(Array.isArray(o["@graph"]) ? o["@graph"] : [o["@graph"]]));
        }
      } catch (_) {}
    }
    return {};
  }
  function detectCategory(ld, title) {
    const direct = clean(ld.category || meta('meta[property="product:category"]', 'meta[name="category"]', 'meta[property="og:category"]'));
    if (direct) return direct.split(/[>/|]/).map(clean).filter(Boolean).slice(-2).join(" > ");
    const crumbs = [...document.querySelectorAll('nav[aria-label*="breadcrumb" i] a, [class*="breadcrumb" i] a, [itemtype*="BreadcrumbList"] [itemprop="name"]')]
      .map(e => clean(e.content || e.innerText || e.textContent)).filter(Boolean);
    if (crumbs.length) return [...new Set(crumbs)].slice(-2).join(" > ");
    const t = clean(title).normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase();
    const rules = [
      [/fralda|mamadeira|chupeta|carrinho de bebe|bebe conforto|infantil/, "Bebês e crianças"],
      [/iphone|smartphone|celular|notebook|laptop|tablet|monitor|computador|ssd|memoria ram|playstation|xbox|fone de ouvido|headset/, "Tecnologia"],
      [/air fryer|fritadeira|liquidificador|geladeira|fogao|microondas|cafeteira|panela|organizador|aspirador|ventilador/, "Casa e cozinha"],
      [/perfume|maquiagem|shampoo|hidratante|skincare|protetor solar|creme facial/, "Moda e beleza"],
      [/vestido|camiseta|camisa|calca|tenis|sapato|bolsa|jaqueta|moletom/, "Moda e beleza"],
      [/racao|coleira|areia sanitaria|brinquedo para gato|brinquedo para cachorro|petisco/, "Pet"],
      [/bicicleta|halter|barraca de camping|bola de futebol|tapete de yoga/, "Esporte e lazer"],
      [/cafe|chocolate|biscoito|azeite|suplemento alimentar/, "Alimentos e bebidas"]
    ];
    const match = rules.find(([pattern]) => pattern.test(t));
    return match ? match[1] : "";
  }
  function trackedUrl(value) {
    try {
      const u = new URL(value);
      const keys = [...u.searchParams.keys()].map(k => k.toLowerCase());
      const indicators = ["tag", "ascsubtag", "linkcode", "camp", "creative", "aff", "affiliate", "affiliateid", "partner", "partnerid", "tracking_id", "subid", "sub_id", "meli_campaign", "matt_tool", "matt_source", "matt_campaign"];
      return keys.some(k => indicators.some(i => k === i || k.startsWith(i))) ? u.href : "";
    } catch (_) { return ""; }
  }
  function detectSubId(value) {
    try {
      const u = new URL(value);
      for (const p of ["subid", "sub_id", "ascsubtag", "tracking_id", "matt_tool", "matt_source", "meli_campaign", "partner_id", "aff_id"]) {
        const v = u.searchParams.get(p);
        if (v) return v;
      }
    } catch (_) {}
    return "";
  }
  function capture() {
    const ld = productLd();
    const offers = Array.isArray(ld.offers) ? ld.offers[0] : (ld.offers || {});
    const title = meta('meta[property="og:title"]', 'meta[name="twitter:title"]') || txt('#productTitle', 'h1.ui-pdp-title', '.ui-pdp-title', 'h1.product-intro__head-name', 'h1') || ld.name || "";
    const price = meta('meta[property="product:price:amount"]', 'meta[property="og:price:amount"]', 'meta[itemprop="price"]') || offers.price || txt('.andes-money-amount__fraction', '.a-price .a-offscreen', '[data-testid*="price"]', '[class*="price"]');
    const image = meta('meta[property="og:image"]', 'meta[name="twitter:image"]') || (typeof ld.image === "string" ? ld.image : Array.isArray(ld.image) ? (typeof ld.image[0] === "string" ? ld.image[0] : ld.image[0]?.url) : ld.image?.url) || document.querySelector('#landingImage,img.ui-pdp-image,img[class*="product"]')?.src || "";
    const canonical = document.querySelector('link[rel="canonical"]')?.href || location.href;
    const affiliateUrl = trackedUrl(location.href) || trackedUrl(canonical);
    return {
      platform: platform(), title: clean(title).slice(0, 500), price: clean(price),
      originalPrice: txt('.andes-money-amount--previous', 's .a-offscreen', 'del', '[class*="original-price"]'),
      currency: offers.priceCurrency || meta('meta[property="product:price:currency"]') || "BRL",
      imageUrl: image, productUrl: canonical, sourceUrl: location.href, affiliateUrl,
      subId: detectSubId(location.href) || detectSubId(canonical), category: detectCategory(ld, title),
      capturedAt: new Date().toISOString(), sku: clean(ld.sku),
      brand: clean(typeof ld.brand === "string" ? ld.brand : ld.brand?.name),
      captureMethod: "public_page_metadata_and_dom"
    };
  }
  chrome.runtime.onMessage.addListener((m, _s, reply) => {
    if (m?.type === "RADAR_CAPTURE") {
      try { reply({ ok: true, offer: capture() }); }
      catch (e) { reply({ ok: false, error: String(e) }); }
    }
    return true;
  });
})();