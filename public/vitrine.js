const slug = new URLSearchParams(window.location.search).get('loja') || '';
const grid = document.getElementById('grid');
const title = document.getElementById('title');
const description = document.getElementById('desc');

function money(value) {
  return (Number(value || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function safeUrl(value, protocols = ['https:']) {
  try {
    const url = new URL(String(value || ''), window.location.origin);
    return protocols.includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function showEmpty(message) {
  const empty = document.createElement('div');
  empty.className = 'empty';
  empty.textContent = message;
  grid.replaceChildren(empty);
}

function renderOffer(offer) {
  const card = document.createElement('article');
  card.className = 'card';

  const imageUrl = safeUrl(offer.imageUrl, ['https:', 'http:']);
  if (imageUrl) {
    const image = document.createElement('img');
    image.src = imageUrl;
    image.alt = '';
    image.loading = 'lazy';
    image.referrerPolicy = 'no-referrer';
    card.append(image);
  }

  const body = document.createElement('div');
  body.className = 'body';
  const source = document.createElement('div');
  source.className = 'source';
  source.textContent = String(offer.source || '');
  const heading = document.createElement('h2');
  heading.textContent = String(offer.title || 'Oferta');
  const price = document.createElement('div');
  price.className = 'price';
  price.textContent = money(offer.currentPrice);
  body.append(source, heading, price);

  if (Number(offer.originalPrice) > 0) {
    const oldPrice = document.createElement('div');
    oldPrice.className = 'old';
    oldPrice.textContent = money(offer.originalPrice);
    body.append(oldPrice);
  }

  const affiliateUrl = safeUrl(offer.affiliateUrl);
  if (affiliateUrl) {
    const link = document.createElement('a');
    link.className = 'btn';
    link.href = affiliateUrl;
    link.target = '_blank';
    link.rel = 'sponsored noopener noreferrer';
    link.textContent = 'Ver oferta';
    body.append(link);
  }

  card.append(body);
  return card;
}

fetch('/api/public/storefront?slug=' + encodeURIComponent(slug), { headers: { Accept: 'application/json' } })
  .then(async response => {
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Não foi possível carregar a vitrine.');
    if (!data.store || !Array.isArray(data.offers)) throw new Error('Resposta da vitrine inválida.');
    title.textContent = String(data.store.title || 'Vitrine de ofertas');
    description.textContent = String(data.store.description || '');
    if (!data.offers.length) {
      showEmpty('Nenhuma oferta publicada.');
      return;
    }
    grid.replaceChildren(...data.offers.map(renderOffer));
  })
  .catch(() => showEmpty('Não foi possível carregar as ofertas. Tente novamente mais tarde.'));