import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOfferMessage, parseOfferMessageBatch } from '../lib/offer-message-parser.js';

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
  const result=parseOfferMessage('Fone Bluetooth JBL\nPor R$ 99,90',{urls:['https://www.amazon.com.br/dp/B0TEST?tag=radarpromo-20']});
  assert.equal(result.ok,true);
  assert.equal(result.marketplace,'AMAZON');
  assert.equal(result.affiliateLinkDetected,true);
  assert.ok(result.affiliateUrl.includes('amazon.com.br'));
});

test('não confia em URL oculta fora da lista de marketplaces permitidos',()=>{
  const result=parseOfferMessage('Fone Bluetooth JBL\nPor R$ 99,90',{urls:['https://evil.example/redirect?to=amazon']});
  assert.equal(result.ok,false);
  assert.equal(result.affiliateLinkDetected,false);
});

test('não interpreta percentual de desconto como preço quando a mensagem não informa valor',()=>{
  const result=parseOfferMessage('Fone Bluetooth JBL\n50% OFF\nhttps://www.amazon.com.br/dp/B0TEST?tag=radarpromo-20');
  assert.equal(result.ok,false);
  assert.equal(result.currentPrice,null);
  assert.equal(result.needsAffiliateLink,false);
});

test('não aceita URL HTTP como link de produto',()=>{
  const result=parseOfferMessage('Fone Bluetooth JBL\nPor R$ 99,90\nhttp://www.amazon.com.br/dp/B0TEST?tag=radarpromo-20');
  assert.equal(result.ok,false);
  assert.equal(result.marketplace,'');
});

test('identifica várias ofertas completas coladas em blocos separados',()=>{
  const result=parseOfferMessageBatch('Fone Bluetooth JBL\nPor R$ 99,90\nhttps://www.amazon.com.br/dp/B0TEST?tag=radarpromo-20\n\nAir Fryer 4L\nDe R$ 399,90\nPor R$ 249,90\nhttps://www.magazineluiza.com.br/p/123');
  assert.equal(result.multiple,true);
  assert.equal(result.items.length,2);
  assert.equal(result.items[0].title,'Fone Bluetooth JBL');
  assert.equal(result.items[1].marketplace,'MAGALU');
  assert.equal(result.items.every(item=>item.requiresManualReview),true);
});

test('mantém o fluxo unitário se o texto não contiver duas ofertas identificáveis',()=>{
  const text='Air Fryer 4L\n\nDe R$ 399,90\nPor R$ 249,90\nhttps://www.magazineluiza.com.br/p/123';
  const result=parseOfferMessageBatch(text);
  assert.equal(result.multiple,false);
  assert.equal(result.items.length,1);
  assert.equal(result.items[0].title,'Air Fryer 4L');
});

test('limita lote a dez blocos e informa quantos ficaram de fora',()=>{
  const text=Array.from({length:11},(_,index)=>`Produto ${index}\nPor R$ 2${index},90\nhttps://www.amazon.com.br/dp/B0TEST${index}?tag=radarpromo-20`).join('\n\n');
  const result=parseOfferMessageBatch(text);
  assert.equal(result.multiple,true);
  assert.equal(result.items.length,10);
  assert.equal(result.omitted,1);
});
