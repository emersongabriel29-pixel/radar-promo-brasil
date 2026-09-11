import test from 'node:test';
import assert from 'node:assert/strict';
import { validateOffer,categoryHint,discount,fingerprint,message } from '../lib/automation.js';
import { validBotToken,buildTelegramCaption } from '../lib/telegram-core.js';
import { mediaRatio,isRateLimit,isSetupRequired,safePublicUrl } from '../lib/media.js';
import { formatPromo,resolveTemplate } from '../lib/promo-message.js';

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

test('fingerprint é estável e muda entre origens',async()=>{
  assert.equal(await fingerprint(valid),await fingerprint({...valid}));
  assert.notEqual(await fingerprint(valid),await fingerprint({...valid,source:'Amazon'}));
});

test('valida formato do token do Telegram sem armazená-lo em claro',()=>{
  assert.equal(validBotToken('123456789:AAExample_bot_token_1234567890'),true);
  assert.equal(validBotToken('token-incompleto'),false);
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

test('modelo automático reconhece importados e omite fatos ausentes',()=>{
  const ready=formatPromo({title:'Organizador',source:'AliExpress',currentPrice:5990,affiliateUrl:'https://pt.aliexpress.com/item/1',template:'AUTO'});
  assert.equal(resolveTemplate('AUTO','Produtos importados','AliExpress'),'IMPORTED');
  assert.equal(ready.template,'IMPORTED');
  assert.doesNotMatch(ready.message,/De:|OFF|cupom/i);
});

test('bloqueia link inseguro na mensagem',()=>{
  assert.throws(()=>formatPromo({title:'Produto',currentPrice:1000,affiliateUrl:'http://inseguro.example'}),/obrigatórios/);
});
