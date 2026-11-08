import test from 'node:test';
import assert from 'node:assert/strict';
import {assertAliExpressResponse} from '../lib/aliexpress-response.js';
const method='aliexpress.affiliate.product.query';
const response=resp_result=>({aliexpress_affiliate_product_query_response:{resp_result}});
test('HTTP 200 com erro de negócio não se transforma em catálogo vazio válido',()=>{
 assert.throws(()=>assertAliExpressResponse(response({resp_code:405,resp_msg:'supplier detail'}),method),e=>e.status===502&&e.code==='ALIEXPRESS_BUSINESS_ERROR'&&e.providerCode==='405'&&!e.message.includes('supplier detail'));
});
test('sucesso vazio e com produtos preserva a resposta original',()=>{
 for(const products of [[],[{product_id:123}]]){const data=response({resp_code:'200',result:{products}});assert.equal(assertAliExpressResponse(data,method),data);}
});
test('envelope ausente, método errado ou código ausente não autoriza validação',()=>{
 for(const data of [{},null,[],response({result:{}}),{other_response:{resp_result:{resp_code:200}}}])assert.throws(()=>assertAliExpressResponse(data,method),e=>e.code==='ALIEXPRESS_INVALID_RESPONSE');
});
test('erro TOP e resultado legado são diferenciados sem vazar mensagem do provedor',()=>{
 assert.throws(()=>assertAliExpressResponse({error_response:{code:15,msg:'private'}},method),e=>e.code==='ALIEXPRESS_API_ERROR'&&e.providerCode==='15'&&!e.message.includes('private'));
 const data={aliexpress_affiliate_product_query_response:{result:{products:[]}}};assert.equal(assertAliExpressResponse(data,method),data);
});
