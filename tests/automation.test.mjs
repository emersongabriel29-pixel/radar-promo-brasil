import test from 'node:test';
import assert from 'node:assert/strict';
import { validateOffer,categoryHint,discount,fingerprint,message } from '../lib/automation.js';
import { validBotToken,buildTelegramCaption } from '../lib/telegram-core.js';
import { telegramHtml } from '../lib/telegram.js';
import { mediaRatio,isRateLimit,isSetupRequired,safePublicUrl } from '../lib/media.js';
import { formatPromo,resolveTemplate } from '../lib/promo-message.js';
import { directImageUrl } from '../lib/validation.js';

const valid={title:'Air Fryer 4L',source:'Mercado Livre',currentPrice:299.9,originalPrice:399.9,imageUrl:'https://cdn.example.com/item.jpg',affiliateUrl:'https://mercadolivre.com.br/item',productUrl:'https://mercadolivre.com.br/item'};

test('aceita oferta completa e converte valores para centavos',()=>{
  const result=validateOffer(valid);
  assert.equal(result.ok,true);
  assert.equal(result.value.currentPrice,29990);
  assert.equal(result.value.originalPrice,39990);
});

test('rejeita imagem ou afiliado sem HTTPS',()=>{
  assert.equal(validateOffer({...valid,imageUrl:'http://example.com/a.jpg'}).ok,false);
  assert.equal(validateOffer({...valid,affiliateUrl:'javascript:alert(1)'}).ok,false);
});

test('distingue uma imagem direta de uma página de produto',()=>{
  assert.equal(directImageUrl('https://www.catran.com.br/perfumaria/produto.html?codbar=123'),'');
  assert.match(directImageUrl('https://cdn.example.com/product.png?size=800'),/^https:\/\//);
  assert.equal(directImageUrl('/uploads/products/account/item.webp'),'/uploads/products/account/item.webp');
});

test('classifica categorias conhecidas',()=>{
  assert.equal(categoryHint('Fralda para bebê'),'Bebês e crianças');
  assert.equal(categoryHint('Notebook Samsung'),'Tecnologia');
  assert.equal(categoryHint('Produto sem regra'),'Ofertas gerais');
});

test('calcula desconto e preserva somente dados fornecidos',()=>{
  const checked=validateOffer(valid).value;
  assert.equal(discount(checked.currentPrice,checked.originalPrice),25);
  const text=message(checked);
  assert.match(text,/Air Fryer 4L/);
  assert.match(text,/R\$\s299,90/);
  assert.match(text,/https:\/\/mercadolivre\.com\.br\/item/);
});

test('fingerprint deduplica identidade estável, separa origem e vendedor',async()=>{
  const stable={...valid,sellerId:'seller-1'};
  assert.equal(await fingerprint(stable),await fingerprint({...stable}));
  assert.equal(await fingerprint(stable),await fingerprint({...stable,currentPrice:199.9,originalPrice:299.9}),'mudança de preço deve atualizar a mesma oferta, não criar duplicata');
  assert.notEqual(await fingerprint(stable),await fingerprint({...stable,source:'Amazon'}));
  assert.notEqual(await fingerprint(stable),await fingerprint({...stable,sellerId:'seller-2'}));
  assert.equal(await fingerprint(valid),await fingerprint({...valid}));
  assert.notEqual(await fingerprint(valid),await fingerprint({...valid,affiliateUrl:'https://mercadolivre.com.br/another-item?tag=other'}));
});

test('valida formato do token do Telegram sem armazená-lo em claro',()=>{
  assert.equal(validBotToken('123456789:AAExample_bot_token_1234567890'),true);
  assert.equal(validBotToken('token-incompleto'),false);
});

test('formata negrito e tachado do Telegram sem deixar marcadores literais',()=>{
  const html=telegramHtml('*CHEGOU PROMOÇÃO!*\n*45% OFF*\nDe: ~R$ 45,14~\n*POR: R$ 24,75*');
  assert.match(html,/<b>CHEGOU PROMOÇÃO!<\/b>/);
  assert.match(html,/<b>45% OFF<\/b>/);
  assert.match(html,/<s>R\$ 45,14<\/s>/);
  assert.match(html,/<b>POR: R\$ 24,75<\/b>/);
  assert.doesNotMatch(html,/\*CHEGOU PROMOÇÃO!\*|\*45% OFF\*|~R\$ 45,14~/);
});

test('legenda do Telegram sempre preserva o link e respeita 1024 caracteres',()=>{
  const link='https://example.com/afiliado';
  const caption=buildTelegramCaption('Oferta '.repeat(300),link);
  assert.ok(caption.length<=1024);
  assert.match(caption,/https:\/\/example\.com\/afiliado$/);
});

test('normaliza formatos de mídia aceitos pelos provedores',()=>{
  assert.equal(mediaRatio('4:5','IMAGE'),'3:4');
  assert.equal(mediaRatio('9:16','VIDEO'),'720:1280');
  assert.equal(mediaRatio('valor-inválido','VIDEO'),'720:1280');
});

test('reconhece limite temporário e falta de configuração',()=>{
  assert.equal(isRateLimit({status:429,message:'Too many requests'}),true);
  assert.equal(isSetupRequired({code:'SetupRequired'}),true);
  assert.equal(isRateLimit(new Error('Falha comum')),false);
});

test('aceita somente URL pública HTTPS como entrada de mídia',()=>{
  assert.match(safePublicUrl('https://cdn.example.com/produto.png'),/^https:\/\//);
  assert.equal(safePublicUrl('http://example.com/inseguro.png'),'');
  assert.equal(safePublicUrl('javascript:alert(1)'),'');
});

test('monta mensagem completa sem inventar preço, desconto ou cupom',()=>{
  const ready=formatPromo({title:'Kit 3 Escovas',currentPrice:2699,originalPrice:2999,affiliateUrl:'https://s.shopee.com.br/oferta',couponCode:'FULL10',couponUrl:'https://s.shopee.com.br/cupom',template:'IMPACT'});
  assert.equal(ready.template,'IMPACT');
  assert.equal(ready.discountPercent,10);
  assert.match(ready.message,/~R\$\s29,99~/);
  assert.match(ready.message,/\*POR: R\$\s26,99\*/);
  assert.match(ready.message,/FULL10/);
  assert.match(ready.message,/https:\/\/s\.shopee\.com\.br\/oferta/);
});

test('modelo automático exige evidência de origem internacional e omite fatos ausentes',()=>{
  const marketplaceOnly=formatPromo({title:'Organizador',source:'AliExpress',currentPrice:5990,affiliateUrl:'https://pt.aliexpress.com/item/1',template:'AUTO'});
  assert.equal(resolveTemplate('AUTO','Produtos importados','AliExpress'),'IMPORTED');
  assert.equal(marketplaceOnly.template,'COMPLETE');
  const knownOrigin=formatPromo({title:'Organizador',source:'AliExpress',category:'Origem internacional',currentPrice:5990,affiliateUrl:'https://pt.aliexpress.com/item/1',template:'AUTO'});
  assert.equal(knownOrigin.template,'IMPORTED');
  assert.doesNotMatch(knownOrigin.message,/De:|OFF|cupom/i);
});

test('bloqueia link inseguro na mensagem',()=>{
  assert.throws(()=>formatPromo({title:'Produto',currentPrice:1000,affiliateUrl:'http://inseguro.example'}),/obrigatórios/);
});


// AliExpress review and source isolation are exercised against the real in-memory
// flow in aliexpress-review.test.mjs, rather than matching obsolete thresholds.
test('Telegram autopilot enfileira ofertas aprovadas em lote, sem teto artificial de 10 e com deduplicação', async () => {
  const { readFile } = await import('node:fs/promises');
  const autopilot = await readFile(new URL('../lib/autopilot.js', import.meta.url), 'utf8');
  assert.ok(autopilot.includes('jsonb_to_recordset'));
  assert.ok(autopilot.includes('NOT EXISTS(SELECT 1 FROM publications p WHERE p.account_id=$2 AND p.offer_id=x.offer_id AND p.group_id=x.group_id)'));
  assert.ok(autopilot.includes("candidate.category_id === 'cat-gerais'"));
  assert.ok(!autopilot.includes('maxPendingTelegram'));
});
test('Telegram tick dryRun returns before event persistence and performs no side effects', async () => {
  const { readFile } = await import('node:fs/promises');
  const tick = await readFile(new URL('../api/n8n/telegram-tick.js', import.meta.url), 'utf8');
  const dryRun = tick.indexOf('if (body.dryRun === true)');
  const eventPersistence = tick.indexOf('const event = await remember(eventKey, accountId)');
  assert.ok(dryRun >= 0 && eventPersistence > dryRun);
  assert.match(tick, /sideEffects: false, queuedAvailable:/);
  assert.match(tick, /if \(body\.dryRun !== true\)[\s\S]*enqueueMatches/);
});


test('AliExpress capability audit correctly recognizes numeric product IDs', async () => {
  const { readFile } = await import('node:fs/promises');
  const integration = await readFile(new URL('../api/integrations/aliexpress.js', import.meta.url), 'utf8');
  assert.match(integration, /hasProductId:items\.some\(x=>\/\^\\d\+\$\/\.test/);
});
