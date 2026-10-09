import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { webhooks } from '../hatchable/index.js';
import { applySecurityHeaders, createRateLimiter, parseTrustProxyHops, requestKey } from '../lib/security.js';
import { loginPage } from '../server/standalone-auth.js';

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


test('rate limit usa IP confiável e não aceita X-Forwarded-For sem proxy confiável', () => {
  assert.equal(requestKey({ member: { id: 'account-1' }, ip: '10.0.0.1' }), 'account-1|10.0.0.1');
  assert.equal(requestKey({ headers: { 'x-forwarded-for': '10.0.0.2, proxy' } }), 'unknown');
  assert.equal(requestKey({ headers: { 'x-forwarded-for': '10.0.0.2' }, socket: { remoteAddress: '203.0.113.7' } }), '203.0.113.7');
});

test('rate limit bloqueia excesso e informa retry', () => {
  const limiter=createRateLimiter({windowMs:60_000,max:1});
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
  applySecurityHeaders(response,{production:true,api:true});
  assert.equal(response.headers['X-Content-Type-Options'],'nosniff');
  assert.equal(response.headers['X-Frame-Options'],'SAMEORIGIN');
  assert.match(response.headers['Strict-Transport-Security'],/max-age=31536000/);
  assert.match(response.headers['Content-Security-Policy'],/default-src 'self'/);
  assert.match(response.headers['Content-Security-Policy'],/script-src 'self'/);
  assert.match(response.headers['Content-Security-Policy'],/script-src-attr 'none'/);
  assert.doesNotMatch(response.headers['Content-Security-Policy'],/script-src[^;]*unsafe-inline/);
  assert.equal(response.headers['Content-Security-Policy'].includes("connect-src 'self'"),true);
  assert.match(response.headers['Content-Security-Policy'],/style-src-attr 'none'/);
});

test('arte de promoção usa CSS externo compatível com a CSP restritiva', () => {
  const route=fs.readFileSync(new URL('../api/ai/card/[id].js',import.meta.url),'utf8');
  const css=fs.readFileSync(new URL('../public/ai-card.css',import.meta.url),'utf8');
  assert.equal(route.includes('<style'),false);
  assert.equal(route.includes('href="/ai-card.css"'),true);
  assert.equal(route.includes('class="${ratioClass}"'),true);
  for(const ratio of ['1-1','3-4','4-3','9-16','16-9','21-9'])assert.equal(css.includes(`body.ratio-${ratio}{`),true);
});


test('página pública respeita a CSP sem estilos, scripts ou handlers inline', () => {
  const page = fs.readFileSync(new URL('../pages/inicio.js', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('../public/inicio.css', import.meta.url), 'utf8');
  const js = fs.readFileSync(new URL('../public/inicio.js', import.meta.url), 'utf8');
  assert.equal(page.includes('<style>'), false);
  assert.equal(page.includes('<script>'), false);
  assert.equal(/\son[a-z]+\s*=/i.test(page), false);
  assert.ok(page.includes('href="/inicio.css"'));
  assert.ok(page.includes('src="/inicio.js"'));
  assert.ok(css.includes('.cookie.on'));
  assert.ok(js.includes('data-cookie-choice'));
});

test('páginas públicas usam assets externos compatíveis com a CSP', () => {
  const pages = ['privacidade', 'termos', 'vitrine'];
  for (const name of pages) {
    const page = fs.readFileSync(new URL(`../pages/${name}.js`, import.meta.url), 'utf8');
    assert.equal(/<style\b/i.test(page), false, `${name}: não deve conter style inline`);
    assert.equal(/<script(?![^>]*\bsrc=)[^>]*>/i.test(page), false, `${name}: não deve conter script inline`);
    assert.equal(/\son[a-z]+\s*=/i.test(page), false, `${name}: não deve conter handlers inline`);
  }
  const privacy = fs.readFileSync(new URL('../pages/privacidade.js', import.meta.url), 'utf8');
  const terms = fs.readFileSync(new URL('../pages/termos.js', import.meta.url), 'utf8');
  const storefront = fs.readFileSync(new URL('../pages/vitrine.js', import.meta.url), 'utf8');
  const storefrontJs = fs.readFileSync(new URL('../public/vitrine.js', import.meta.url), 'utf8');
  assert.ok(privacy.includes('href="/legal.css"'));
  assert.ok(terms.includes('href="/legal.css"'));
  assert.ok(storefront.includes('href="/vitrine.css"'));
  assert.ok(storefront.includes('src="/vitrine.js"'));
  assert.ok(storefrontJs.includes('replaceChildren'));
  assert.ok(storefrontJs.includes("protocol"));
});

test('CSP não habilita unsafe-inline em scripts ou estilos', () => {
  const response = { headers: {}, setHeader(key, value) { this.headers[key] = value; } };
  applySecurityHeaders(response, { production: true });
  const csp = response.headers['Content-Security-Policy'];
  assert.doesNotMatch(csp, /script-src[^;]*unsafe-inline/i);
  assert.doesNotMatch(csp, /style-src[^;]*unsafe-inline/i);
});


test('painel principal não usa atributos de evento inline bloqueados pela CSP', () => {
  const radar = fs.readFileSync(new URL('../public/radar.js', import.meta.url), 'utf8');
  assert.doesNotMatch(radar, /\\s(?:onchange|onclick|oninput|onsubmit)\\s*=\\s*["']/i);
  assert.ok(radar.includes('data-change="changeReportDays"'));
  assert.ok(radar.includes("addEventListener('change'"));
});

test('página de login é compatível com CSP e usa JavaScript externo', () => {
  let html = '';
  const response = {
    type() { return this; },
    send(value) { html = value; return this; },
    redirect() { throw new Error('Login inesperadamente redirecionado.'); }
  };
  loginPage({ member: null }, response);
  const js = fs.readFileSync(new URL('../public/login.js', import.meta.url), 'utf8');
  assert.equal(html.includes('<script>'), false);
  assert.ok(html.includes('<script src="/login.js" defer></script>'));
  assert.ok(js.includes("addEventListener('submit'"));
  assert.ok(js.includes("fetch('/api/account/login'"));
});


test('configuração do proxy confiável aceita somente quantidade explícita e segura de saltos', () => {
  assert.equal(parseTrustProxyHops(undefined), null);
  assert.equal(parseTrustProxyHops(''), null);
  assert.equal(parseTrustProxyHops('0'), 0);
  assert.equal(parseTrustProxyHops('2'), 2);
  for (const invalid of ['-1', '1.5', 'NaN', 'Infinity', '1; loopback', '9007199254740992']) {
    assert.throws(() => parseTrustProxyHops(invalid), /TRUST_PROXY_HOPS/);
  }
});
