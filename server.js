import express from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { getDb } from 'hatchable';

// Import all API handlers
import dataHandler, { methods as dataMethods } from './api/data.js';
import suiteHandler, { methods as suiteMethods } from './api/suite.js';
import reportsHandler, { methods as reportsMethods } from './api/reports.js';
import promoHandler, { methods as promoMethods } from './api/ai/promo.js';
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

// Import all Page handlers
import indexPage from './pages/index.js';
import inicioPage from './pages/inicio.js';
import vitrinePage from './pages/vitrine.js';
import privacidadePage from './pages/privacidade.js';
import termosPage from './pages/termos.js';

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

// Body parsers with rawBody retention for webhooks
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// File upload handling via multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }
});

// Member session context
app.use((req, res, next) => {
  req.member = {
    id: 'admin_user',
    email: 'admin@radar-promo.com.br',
    display_name: 'Radar Admin',
    handle: 'admin'
  };
  next();
});

// Static assets and uploads
const publicDir = path.resolve(process.cwd(), 'public');
const uploadsDir = path.resolve(publicDir, 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });
app.use(express.static(publicDir));
app.use('/uploads', express.static(uploadsDir));

// Route wrapper helper
function route(handler, allowedMethods) {
  return async (req, res, next) => {
    if (allowedMethods && !allowedMethods.includes(req.method)) {
      return res.status(405).json({ error: 'Método não permitido.' });
    }
    try {
      await handler(req, res);
    } catch (err) {
      console.error(`Error on ${req.method} ${req.path}:`, err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message || 'Erro interno no servidor.' });
      }
    }
  };
}

// Register API Routes
app.all('/api/data', route(dataHandler, dataMethods));
app.all('/api/suite', route(suiteHandler, suiteMethods));
app.all('/api/reports', route(reportsHandler, reportsMethods));
app.all('/api/ai/promo', route(promoHandler, promoMethods));
app.all('/api/automation/simulate', route(simulateHandler, simulateMethods));
app.all('/api/jobs/hourly', route(hourlyHandler, hourlyMethods));
app.all('/api/jobs/telegram', route(telegramJobHandler, telegramJobMethods));
app.all('/api/links/convert', route(convertHandler, convertMethods));
app.all('/api/mercadolivre/callback', route(mlCallbackHandler, mlCallbackMethods));
app.all('/api/mercadolivre/products', route(mlProductsHandler, mlProductsMethods));
app.all('/api/n8n/bridge', route(n8nBridgeHandler, n8nBridgeMethods));
app.all('/api/n8n/pairing', route(n8nPairingHandler, n8nPairingMethods));
app.all('/api/public/storefront', route(storefrontHandler, storefrontMethods));
app.all('/api/telegram/test', route(telegramTestHandler, telegramTestMethods));
app.get('/api/r/:id', route(redirectHandler, redirectMethods));

app.post('/api/upload', upload.any(), async (req, res, next) => {
  if (req.files && Array.isArray(req.files)) {
    for (const f of req.files) {
      if (!f.contentType) f.contentType = f.mimetype;
    }
  }
  try {
    await uploadHandler(req, res);
  } catch (err) {
    next(err);
  }
});

// Register Pages
app.get('/', route(indexPage, ['GET']));
app.get('/inicio', route(inicioPage, ['GET']));
app.get('/vitrine', route(vitrinePage, ['GET']));
app.get('/privacidade', route(privacidadePage, ['GET']));
app.get('/termos', route(termosPage, ['GET']));

// Start server after ensuring database is ready
async function main() {
  try {
    await getDb();
    console.log('[db] Embedded database initialized and migrations applied.');
  } catch (err) {
    console.error('[db] Error initializing database:', err);
  }

  app.listen(PORT, HOST, () => {
    console.log(`[server] Radar Promo Brasil running at http://${HOST}:${PORT}`);
  });
}

main().catch(err => {
  console.error('[server] Fatal initialization error:', err);
  process.exit(1);
});
