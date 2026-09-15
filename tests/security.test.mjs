import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { webhooks } from '../hatchable/index.js';
import { applySecurityHeaders, createRateLimiter, requestKey } from '../lib/security.js';

function sign(raw, secret) {
  return crypto.createHmac('sha256', secret).update(raw).digest('hex');
}

test('HMAC local aceita assinatura válida dentro da janela temporal', () => {
  const secret = 'test-secret';
  const timestamp = String(Math.floor(Date.now() / 1000));
  const raw = `${timestamp}.{"event":"ok"}`;
  const signature = sign(raw, secret);
  assert.equal(webhooks.verifyHmac({ raw, signature, secret, timestamp, tolerance: 300 }), true);
});

test('HMAC local rejeita assinatura inválida', () => {
  const secret = 'test-secret';
  const timestamp = String(Math.floor(Date.now() / 1000));
  const raw = `${timestamp}.{"event":"ok"}`;
  assert.equal(webhooks.verifyHmac({ raw, signature: '0'.repeat(64), secret, timestamp, tolerance: 300 }), false);
});

test('HMAC local rejeita timestamp expirado para impedir replay', () => {
  const secret = 'test-secret';
  const timestamp = String(Math.floor(Date.now() / 1000) - 301);
  const raw = `${timestamp}.{"event":"old"}`;
  const signature = sign(raw, secret);
  assert.equal(webhooks.verifyHmac({ raw, signature, secret, timestamp, tolerance: 300 }), false);
});


test('rate limit identifica conta e IP sem expor dados sensíveis', () => {
  assert.equal(requestKey({ member: { id: 'account-1' }, ip: '10.0.0.1' }), 'account-1|10.0.0.1');
  assert.equal(requestKey({ headers: { 'x-forwarded-for': '10.0.0.2, proxy' } }), '10.0.0.2');
});

test('rate limit bloqueia excesso e informa retry', () => {
  const limiter=createRateLimiter({windowMs:60_000,max:1});
  const responses=[];
  const make=(ip)=>({
    ip,
    headers:{},
  });
  const res=()=>({
    headers:{},
    setHeader(k,v){this.headers[k]=v},
    status(code){this.code=code;return this},
    json(body){this.body=body;return this}
  });
  let next=0;
  limiter(make('10.0.0.3'),res(),()=>next++);
  const blocked=res();
  limiter(make('10.0.0.3'),blocked,()=>next++);
  assert.equal(next,1);
  assert.equal(blocked.code,429);
  assert.ok(blocked.headers['Retry-After']);
  assert.equal(blocked.body.retryAfterSeconds>0,true);
});

test('cabeçalhos de segurança são aplicados', () => {
  const response={headers:{},setHeader(k,v){this.headers[k]=v}};
  applySecurityHeaders(response,{production:true});
  assert.equal(response.headers['X-Content-Type-Options'],'nosniff');
  assert.equal(response.headers['X-Frame-Options'],'SAMEORIGIN');
  assert.match(response.headers['Strict-Transport-Security'],/max-age=31536000/);
});
