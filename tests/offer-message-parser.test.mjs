import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOfferMessage } from '../lib/offer-message-parser.js';

test('interpreta oferta brasileira com preço anterior, preço atual e tag Amazon',()=>{
  const result=parseOfferMessage('🔥 Fone Bluetooth JBL\nDe: R$ 199,90\nPor: R$ 99,90\n50% OFF\nhttps://www.amazon.com.br/dp/B0TEST?tag=radarpromo-20');
  assert.equal(result.ok,true);
  assert.equal(result.title,'Fone Bluetooth JBL');
  assert.equal(result.currentPrice,9990);
  assert.equal(result.originalPrice,19990);
  assert.equal(result.marketplace,'AMAZON');
  assert.equal(result.affiliateLinkDetected,true);
  assert.equal(result.discountPercent,50);
});

test('não declara link comum de produto como link de afiliado',()=>{
  const result=parseOfferMessage('Air Fryer 4L\nPor R$ 249,90\nhttps://www.aliexpress.com/item/100500123456.html');
  assert.equal(result.ok,true);
  assert.equal(result.affiliateLinkDetected,false);
  assert.equal(result.needsAffiliateLink,true);
  assert.equal(result.affiliateUrl,'');
});

test('ignora domínio arbitrário mesmo que a mensagem tenha preço',()=>{
  const result=parseOfferMessage('Fone sem fio\nR$ 49,90\nhttps://example.com/item/1');
  assert.equal(result.ok,false);
  assert.equal(result.marketplace,'');
});

test('recusa mensagem vazia',()=>{
  assert.equal(parseOfferMessage('   ').ok,false);
});


test('reconhece link de produto escondido em entidade text_link do Telegram',()=>{
  const result=parseOfferMessage('Fone Bluetooth JBL\\nPor R$ 99,90',{urls:['https://www.amazon.com.br/dp/B0TEST?tag=radarpromo-20']});
  assert.equal(result.ok,true);
  assert.equal(result.marketplace,'AMAZON');
  assert.equal(result.affiliateLinkDetected,true);
  assert.match(result.affiliateUrl,/amazon\\.com\\.br/);
});

test('não confia em URL oculta fora da lista de marketplaces permitidos',()=>{
  const result=parseOfferMessage('Fone Bluetooth JBL\\nPor R$ 99,90',{urls:['https://evil.example/redirect?to=amazon']});
  assert.equal(result.ok,false);
  assert.equal(result.affiliateLinkDetected,false);
});
