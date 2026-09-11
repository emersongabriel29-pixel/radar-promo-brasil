import express from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { getDb } from 'hatchable';
import dataHandler, { methods as dataMethods } from './api/data.js';
import suiteHandler, { methods as suiteMethods } from './api/suite.js';
import reportsHandler, { methods as reportsMethods } from './api/reports.js';
import promoHandler, { methods as promoMethods } from './api/ai/promo.js';
import studioHandler, { methods as studioMethods } from './api/ai/studio.js';
import imageHandler, { methods as imageMethods } from './api/ai/image.js';
import growthHandler, { methods as growthMethods } from './api/growth.js';
import emailTestHandler, { methods as emailTestMethods } from './api/email/test.js';
import simulateHandler, { methods as simulateMethods } from './api/automation/simulate.js';
import hourlyHandler, { methods as hourlyMethods } from './api/jobs/hourly.js';
import telegramJobHandler, { methods as telegramJobMethods } from './api/jobs/telegram.js';
import convertHandler, { methods as convertMethods } from './api/links/convert.js';
import mlCallbackHandler, { methods as mlCallbackMethods } from './api/mercadolivre/callback.js';
import mlProductsHandler, { methods as mlProductsMethods } from './api/mercadolivre/products.js';
import n8nBridgeHandler, { methods as n8nBridgeMethods } from './api/n8n/bridge.js';
import n8nPairingHandler, { methods as n8nPairingMethods } from './api/n8n/pairing.js';
import storefrontHandler, { methods as storefrontMethods } from './api/public/storefront.js';
import redirectHandler, { methods as redirectMethods } from './api/r/[id].js';
import telegramTestHandler, { methods as telegramTestMethods } from './api/telegram/test.js';
import uploadHandler, { methods as uploadMethods } from './api/upload.js';
import radarOpportunitiesHandler from './api/radar/opportunities.js';
import radarAutopilotHandler from './api/radar/autopilot.js';
import radarPriceHandler from './api/radar/price.js';
import indexPage from './pages/index.js';
import inicioPage from './pages/inicio.js';
import vitrinePage from './pages/vitrine.js';
import privacidadePage from './pages/privacidade.js';
import termosPage from './pages/termos.js';

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const isProduction = process.env.NODE_ENV === 'production';
app.use(express.json({ limit: '10mb', verify: (req, res, buf) => { req.rawBody = buf.toString('utf8'); } }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });
app.use((req, res, next) => {
  if (!isProduction) { req.member = { id: process.env.STANDALONE_DEV_USER_ID || 'admin_user', email: process.env.STANDALONE_DEV_EMAIL || 'admin@radar-promo.local', display_name: process.env.STANDALONE_DEV_USER_NAME || 'Radar Admin', handle: process.env.STANDALONE_DEV_USER_HANDLE || 'admin' }; return next(); }
  const secret = process.env.STANDALONE_AUTH_SECRET, userId = process.env.STANDALONE_USER_ID;
  if (!secret || !userId) return res.status(503).json({ error: 'Autenticação standalone não configurada.' });
  if (String(req.headers.authorization || '') !== `Bearer ${secret}`) return res.status(401).json({ error: 'Não autorizado.' });
  req.member = { id: userId, email: process.env.STANDALONE_USER_EMAIL || '', display_name: process.env.STANDALONE_USER_NAME || 'Radar Admin', handle: process.env.STANDALONE_USER_HANDLE || 'admin' }; next();
});
const publicDir = path.resolve(process.cwd(), 'public'), uploadsDir = path.resolve(publicDir, 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true }); app.use(express.static(publicDir)); app.use('/uploads', express.static(uploadsDir));
function route(handler, allowedMethods) { return async (req, res) => { if (allowedMethods && !allowedMethods.includes(req.method)) return res.status(405).json({ error: 'Método não permitido.' }); try { await handler(req, res); } catch (err) { const correlationId = crypto.randomUUID(); console.error(`[server] ${correlationId} ${req.method} ${req.path}:`, err); if (!res.headersSent) res.status(500).json({ error: 'Erro interno no servidor.', correlationId }); } }; }
app.all('/api/data', route(dataHandler, dataMethods)); app.all('/api/suite', route(suiteHandler, suiteMethods)); app.all('/api/reports', route(reportsHandler, reportsMethods)); app.all('/api/ai/promo', route(promoHandler, promoMethods)); app.all('/api/ai/studio', route(studioHandler, studioMethods)); app.all('/api/ai/image', route(imageHandler, imageMethods)); app.all('/api/growth', route(growthHandler, growthMethods)); app.all('/api/email/test', route(emailTestHandler, emailTestMethods)); app.all('/api/automation/simulate', route(simulateHandler, simulateMethods)); app.all('/api/jobs/hourly', route(hourlyHandler, hourlyMethods)); app.all('/api/jobs/telegram', route(telegramJobHandler, telegramJobMethods)); app.all('/api/links/convert', route(convertHandler, convertMethods)); app.all('/api/mercadolivre/callback', route(mlCallbackHandler, mlCallbackMethods)); app.all('/api/mercadolivre/products', route(mlProductsHandler, mlProductsMethods)); app.all('/api/n8n/bridge', route(n8nBridgeHandler, n8nBridgeMethods)); app.all('/api/n8n/pairing', route(n8nPairingHandler, n8nPairingMethods)); app.all('/api/public/storefront', route(storefrontHandler, storefrontMethods)); app.all('/api/telegram/test', route(telegramTestHandler, telegramTestMethods));
app.all('/api/radar/opportunities', route(radarOpportunitiesHandler, ['GET'])); app.all('/api/radar/autopilot', route(radarAutopilotHandler, ['GET', 'POST'])); app.all('/api/radar/price', route(radarPriceHandler, ['GET', 'POST'])); app.get('/api/r/:id', route(redirectHandler, redirectMethods));
app.post('/api/upload', upload.any(), async (req, res, next) => { if (req.files && Array.isArray(req.files)) for (const f of req.files) if (!f.contentType) f.contentType = f.mimetype; try { await uploadHandler(req, res); } catch (err) { next(err); } });
app.get('/', route(indexPage, ['GET'])); app.get('/inicio', route(inicioPage, ['GET'])); app.get('/vitrine', route(vitrinePage, ['GET'])); app.get('/privacidade', route(privacidadePage, ['GET'])); app.get('/termos', route(termosPage, ['GET']));
async function main() { if (isProduction && (!process.env.STANDALONE_AUTH_SECRET || !process.env.STANDALONE_USER_ID)) throw new Error('Produção standalone exige STANDALONE_AUTH_SECRET e STANDALONE_USER_ID.'); await getDb(); console.log('[db] Embedded database initialized and migrations applied.'); app.listen(PORT, HOST, () => console.log(`[server] Radar Promo Brasil running at http://${HOST}:${PORT}`)); }
main().catch(err => { console.error('[server] Fatal initialization error:', err); process.exit(1); });
