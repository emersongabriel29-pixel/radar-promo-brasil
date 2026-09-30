import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { applyMigrations } from './migrations.js';

let pgliteInstance = null;
let initPromise = null;

export async function getDb() {
  if (pgliteInstance) return pgliteInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const memory = process.env.PGLITE_DATA_DIR === ':memory:';
    const dataDir = memory ? undefined : path.resolve(process.cwd(), process.env.PGLITE_DATA_DIR || 'data/radar-promo');
    if (dataDir) fs.mkdirSync(dataDir, { recursive: true });
    const instance = new PGlite(dataDir);
    const migrationsDir = path.resolve(process.cwd(), 'migrations');
    if (fs.existsSync(migrationsDir)) {
      try { await applyMigrations(instance, migrationsDir); }
      catch (error) { await instance.close(); throw error; }
    }
    pgliteInstance = instance;
    return instance;
  })();

  try { return await initPromise; } catch (error) { initPromise = null; throw error; }
}

export const db = {
  async query(sql, params = []) {
    const instance = await getDb();
    return instance.query(sql, params);
  },
  async transaction(statements) {
    const instance = await getDb();
    const results = await instance.transaction(async tx => {
      const output = [];
      for (const { sql, params = [] } of statements) output.push(await tx.query(sql, params));
      return output;
    });
    return { results };
  }
};

export const config = {
  async get(key) {
    const aliases={public_app_url:'PUBLIC_APP_URL',meli_redirect_uri:'MERCADOLIVRE_REDIRECT_URI',MELI_APP_ID:'MERCADOLIVRE_CLIENT_ID',MELI_CLIENT_SECRET:'MERCADOLIVRE_CLIENT_SECRET'};
    return process.env[key] || process.env[aliases[key]] || '';
  }
};

export { scheduler, startScheduler, stopScheduler } from './scheduler.js';

export const browser = {
  async screenshot(url, options = {}) {
    const { chromium } = await import('playwright');
    const base = process.env.PUBLIC_APP_URL || `http://127.0.0.1:${process.env.PORT || 3000}`;
    const target = new URL(url);
    if (target.origin !== new URL(base).origin || !target.pathname.startsWith('/api/ai/card/')) throw new Error('Renderização restrita às artes desta instalação.');
    const client = await chromium.launch({ headless: true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined });
    try {
      const page = await client.newPage({ viewport: { width: options.width || 1200, height: options.height || 1200 } });
      await page.route('**/*', route => new URL(route.request().url()).origin === target.origin ? route.continue() : route.abort());
      await page.goto(target.toString(), { waitUntil: 'networkidle', timeout: 30000 });
      return await page.screenshot({ fullPage: Boolean(options.fullPage) });
    } finally { await client.close(); }
  }
};

export const email = {
  async send({ to, subject, text = '', html = '' }) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!apiKey || !from) {
      throw new Error('Standalone email requires RESEND_API_KEY and EMAIL_FROM');
    }
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ from, to: [to], subject, text, html }),signal:AbortSignal.timeout(15000)
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error('Email provider request failed');
    return { message_id: body.id || '' };
  }
};

export const ai = {
  async generateText({ model = 'gemini', maxTokens = 120, system, prompt, signal }) {
    if(!String(model).startsWith('gemini'))throw Object.assign(new Error('Requested standalone text provider not configured'),{code:'SETUP_REQUIRED'});
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw Object.assign(new Error('GEMINI_API_KEY is not configured'), { code: 'SETUP_REQUIRED' });
    }
    const { GoogleGenAI } = await import('@google/genai');
    const aiClient = new GoogleGenAI({ apiKey });
    const candidateModels = [...new Set([process.env.GEMINI_TEXT_MODEL || (/^gemini-\d/.test(model) ? model : 'gemini-2.5-flash'), 'gemini-2.5-flash'])];

    let lastError = null;
    for (const candidate of candidateModels) {
      try {
        const response = await aiClient.models.generateContent({
          model: candidate,
          contents: prompt,
          config: {
            systemInstruction: system,
            maxOutputTokens: Math.max(500, maxTokens),
            abortSignal: signal,
          }
        });
        const text = response.text ||
          response.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
        if (text) {
          return {
            text: text.trim(),
            model: candidate,
            usage: response.usageMetadata || {},
            finishReason: response.candidates?.[0]?.finishReason === 'MAX_TOKENS' ? 'length' : 'stop'
          };
        }
      } catch (err) {
        lastError = err;
        console.warn(`[hatchable ai] Model ${candidate} unavailable; trying fallback model.`);
      }
    }
    throw lastError || new Error('Falha ao gerar texto com IA');
  },
  async generateImage() {
    throw Object.assign(new Error('Standalone image provider not configured'), { code: 'SETUP_REQUIRED' });
  }
};

export const storage = {
  async url(key) {
    const directory=path.resolve(process.cwd(),'public','uploads'),fullPath=path.resolve(directory,key);
    if(!fullPath.startsWith(directory+path.sep)||!fs.existsSync(fullPath))throw new Error('Arquivo não encontrado.');
    return `/uploads/${key}`;
  },
  async put(destPath, buffer, contentType) {
    const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
    const fullPath = path.resolve(uploadsDir, destPath);
    if (!fullPath.startsWith(uploadsDir + path.sep)) throw new Error('Caminho de arquivo inválido.');
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, buffer);
    fs.writeFileSync(fullPath + '.metadata.json', JSON.stringify({ contentType }));
    return `/uploads/${destPath}`;
  },
  async get(key) {
    const directory = path.resolve(process.cwd(), 'public', 'uploads');
    const fullPath = path.resolve(directory, key);
    if (!fullPath.startsWith(directory + path.sep)) throw new Error('Caminho de arquivo inválido.');
    const metadata = JSON.parse(fs.readFileSync(fullPath + '.metadata.json', 'utf8'));
    return { buffer: fs.readFileSync(fullPath), contentType: metadata.contentType };
  }
};

export const webhooks = {
  verifyHmac({ raw, signature, secret, algorithm = 'sha256', encoding = 'hex', timestamp, tolerance = 300 }) {
    try {
      if (timestamp === undefined || timestamp === null || timestamp === '') return false;
      {
        const parsed = Number(timestamp);
        if (!Number.isFinite(parsed)) return false;
        const tsMs = parsed > 1e12 ? parsed : parsed * 1000;
        if (Math.abs(Date.now() - tsMs) > Math.max(1, Number(tolerance) || 300) * 1000) return false;
      }
      const hmac = crypto.createHmac(algorithm, secret).update(raw).digest(encoding);
      const expected = Buffer.from(hmac);
      const received = Buffer.from(String(signature || ''));
      if (expected.length !== received.length) return false;
      return crypto.timingSafeEqual(expected, received);
    } catch {
      return false;
    }
  }
};

export const api = {
  mercadolivre: {
    async get(endpoint, { query = {} } = {}) {
      const url = new URL('https://api.mercadolibre.com' + endpoint);
      for (const [k, v] of Object.entries(query)) {
        url.searchParams.set(k, v);
      }
      const res = await fetch(url.toString());
      const body = await res.json().catch(() => null);
      return { status: res.status, body };
    }
  }
};
