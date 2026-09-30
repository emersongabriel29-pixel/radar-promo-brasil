import crypto from 'node:crypto';

export function constantEqual(left, right) {
  const a = Buffer.from(String(left || '')), b = Buffer.from(String(right || ''));
  return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}
export function validateAuthConfiguration(production) {
  if (production && (String(process.env.STANDALONE_AUTH_SECRET || '').length < 32 || !process.env.STANDALONE_USER_ID)) throw new Error('Produção exige STANDALONE_AUTH_SECRET com pelo menos 32 caracteres e STANDALONE_USER_ID.');
}
function identity(production) {
  return { id: production ? process.env.STANDALONE_USER_ID : process.env.STANDALONE_DEV_USER_ID || 'admin_user', display_name: process.env.STANDALONE_USER_NAME || 'Radar Admin', email: process.env.STANDALONE_USER_EMAIL || '', role: 'admin' };
}
const sign = value => crypto.createHmac('sha256', process.env.STANDALONE_AUTH_SECRET || '').update(value).digest('base64url');
const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 8 * 60 * 60 * 1000 });
export function authenticate({ production }) {
  return (req, res, next) => {
    if (!production) { req.member = identity(false); return next(); }
    if (constantEqual(req.headers.authorization, `Bearer ${process.env.STANDALONE_AUTH_SECRET}`)) req.member = identity(true);
    else {
      const raw = (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith('radar_session='))?.slice(14) || '';
      const [payload, signature] = raw.split('.');
      if (payload && constantEqual(signature, sign(payload))) {
        try {
          const session = JSON.parse(Buffer.from(payload, 'base64url').toString());
          if (session.exp > Date.now() && session.uid === process.env.STANDALONE_USER_ID) { req.member = identity(true); req.sessionAuthenticated = true; }
        } catch {}
      }
    }
    if (req.sessionAuthenticated && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const origin = process.env.PUBLIC_APP_URL || `${req.protocol}://${req.get('host')}`;
      if (req.headers.origin !== origin) return res.status(403).json({ error: 'Origem da requisição inválida.' });
    }
    next();
  };
}
export function login(req, res) {
  if (process.env.NODE_ENV !== 'production') return res.json({ ok: true });
  if (!req.is('application/json')) return res.status(400).json({ error: 'Use uma requisição JSON.' });
  const origin = process.env.PUBLIC_APP_URL || `${req.protocol}://${req.get('host')}`;
  if (req.headers.origin && req.headers.origin !== origin) return res.status(403).json({ error: 'Origem inválida.' });
  if (!constantEqual(req.body?.password, process.env.STANDALONE_AUTH_SECRET)) return res.status(401).json({ error: 'Credencial inválida.' });
  const payload = Buffer.from(JSON.stringify({ uid: process.env.STANDALONE_USER_ID, exp: Date.now() + 8 * 60 * 60 * 1000, nonce: crypto.randomUUID() })).toString('base64url');
  res.cookie('radar_session', payload + '.' + sign(payload), cookieOptions());
  return res.json({ ok: true });
}
export function logout(req, res) { res.clearCookie('radar_session', cookieOptions()); return res.json({ ok: true }); }
export function loginPage(req, res) {
  if (req.member) return res.redirect('/');
  res.type('html').send(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Entrar · Radar Promo Brasil</title><link rel="stylesheet" href="/radar.css"></head><body class="login-body"><main class="login-card"><img src="/logo-radar-promo.svg" width="56" height="56" alt="Radar Promo Brasil"><h1>Acesse sua operação</h1><p>Entre para organizar ofertas, publicações e resultados.</p><form id="login-form"><label for="password">Senha de acesso</label><input id="password" class="input" type="password" autocomplete="current-password" required><p id="error" role="alert"></p><button class="btn" type="submit">Entrar no painel</button></form></main><script>document.getElementById('login-form').onsubmit=async function(e){e.preventDefault();var b=this.querySelector('button');b.disabled=true;document.getElementById('error').textContent='';try{var r=await fetch('/api/account/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:document.getElementById('password').value})}),j=await r.json();if(!r.ok)throw Error(j.error);location.href='/'}catch(e){document.getElementById('error').textContent=e.message}finally{b.disabled=false}};</script></body></html>`);
}
