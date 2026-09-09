import test from 'node:test';
import assert from 'node:assert/strict';
import { validateOffer,categoryHint,discount,fingerprint,message } from '../lib/automation.js';

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
