import express from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { getDb, startScheduler, stopScheduler } from './hatchable/index.js';
import { applySecurityHeaders, createRateLimiter, parseTrustProxyHops } from './lib/security.js';
import { authenticate, login, logout, loginPage, validateAuthConfiguration, constantEqual } from './server/standalone-auth.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';
const schedulerToken = crypto.randomBytes(32).toString('hex');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 2, parts: 3 } });

function sources(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? sources(full) : entry.name.endsWith('.js') ? [full] : [];
  });
}

export async function createApp() {
  validateAuthConfiguration(isProduction);
  const trustProxyHops = parseTrustProxyHops(process.env.TRUST_PROXY_HOPS);
  const app = express();
  app.disable('x-powered-by');
  if (trustProxyHops !== null) app.set('trust proxy', trustProxyHops);
  app.use((req, res, next) => { applySecurityHeaders(res, { production: isProduction, api: req.path.startsWith('/api') }); next(); });
  app.use(createRateLimiter({ windowMs: 60000, max: 180 }));
  app.use(express.json({ limit: '256kb', verify: (req, res, buffer) => { req.rawBody = buffer.toString('utf8'); } }));
  app.use(authenticate({ production: isProduction }));
  app.get('/login', loginPage);
  app.post('/api/account/login', createRateLimiter({ windowMs: 15 * 60000, max: 10 }), login);
  app.post('/api/account/logout', logout);
  app.get('/api/account/session', (req, res) => res.json({ authenticated: Boolean(req.member), member: req.member ? { id: req.member.id, displayName: req.member.display_name } : null }));
  app.get('/healthz', async (req, res) => {
    try { await (await getDb()).query('SELECT 1'); res.json({ ok: true }); }
    catch { res.status(503).json({ ok: false }); }
  });
  const publicDirectory = path.join(root, 'public');
  // Uploads são objetos privados. Nunca os exponha pelo static middleware.
  // O acesso passa pelas rotas /api/media/*, que aplicam isolamento por conta.
  app.use('/uploads', (req, res) => res.status(404).end());
  app.use(express.static(publicDirectory, { index: false, dotfiles: 'deny' }));
  for (const directory of ['api', 'pages']) {
    for (const source of sources(path.join(root, directory))) {
      const module = await import(pathToFileURL(source));
      if (typeof module.default !== 'function' || !['public', 'member', 'admin', 'scheduler'].includes(module.access)) throw new Error(`Rota sem contrato de acesso: ${source}`);
      const relative = path.relative(path.join(root, directory), source).replace(/\\/g, '/').replace(/\.js$/, '').replace(/\[([^\]]+)\]/g, ':$1');
      const route = directory === 'api' ? '/api/' + relative : relative === 'index' ? '/' : '/' + relative;
      const methods = module.methods || (directory === 'pages' ? ['GET'] : ['GET', 'POST']);
      const gate = (req, res, next) => {
        if (module.access === 'scheduler') {
          if (!constantEqual(req.headers['x-radar-scheduler'], schedulerToken)) return res.status(404).json({ error: 'Rota não encontrada.' });
        } else if (module.access !== 'public' && !req.member) {
          if (directory === 'pages') return res.redirect('/login');
          return res.status(401).json({ error: 'Entre para continuar.' });
        } else if (module.access === 'admin' && req.member?.role !== 'admin') return res.status(403).json({ error: 'Acesso restrito.' });
        if (!methods.includes(req.method)) return res.set('Allow', methods.join(', ')).status(405).json({ error: 'Método não permitido.' });
        next();
      };
      const handler = async (req, res, next) => { try { await module.default(req, res); } catch (error) { next(error); } };
      if (route === '/api/upload') app.all(route, gate, upload.single('file'), (req, res, next) => { req.files = req.file ? [{ ...req.file, contentType: req.file.mimetype }] : []; next(); }, handler);
      else app.all(route, gate, handler);
    }
  }
  app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof multer.MulterError || error.type === 'entity.too.large' || error.type === 'entity.parse.failed') return res.status(error.type === 'entity.too.large' ? 413 : 400).json({ error: 'Arquivo ou corpo da requisição inválido ou acima do limite.' });
    const correlationId = crypto.randomUUID();
    console.error('[server]', correlationId, req.method, req.path, error.code || error.name);
    res.status(500).json({ error: 'Erro interno no servidor.', correlationId });
  });
  return app;
}

async function main() {
  const app = await createApp();
  await getDb();
  const port = Number(process.env.PORT || 3000);
  const server = app.listen(port, process.env.HOST || '0.0.0.0', () => {
    console.log(`[server] Radar Promo Brasil listening on port ${port}`);
    if (process.env.STANDALONE_SCHEDULER_ENABLED !== 'false') startScheduler({ port, token: schedulerToken });
  });
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
    stopScheduler();
    server.close(async () => { await (await getDb()).close(); process.exit(0); });
    setTimeout(() => process.exit(1), 15000).unref();
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error('[server] Startup failed:', error.message, error.cause?.code || ''); process.exit(1); });
