import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

let pgliteInstance = null;
let initPromise = null;

export async function getDb() {
  if (pgliteInstance) return pgliteInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const dataDir = path.resolve(process.cwd(), process.env.PGLITE_DATA_DIR || 'data/radar-promo');
    fs.mkdirSync(dataDir, { recursive: true });
    const instance = new PGlite(dataDir);
    const migrationsDir = path.resolve(process.cwd(), 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
      for (const file of files) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        try {
          await instance.exec(sql);
        } catch (err) {
          console.warn(`[hatchable db] Migration warning on ${file}:`, err.message);
        }
      }
    }
    pgliteInstance = instance;
    return instance;
  })();

  return initPromise;
}

export const db = {
  async query(sql, params = []) {
    const instance = await getDb();
    return instance.query(sql, params);
  }
};

export const config = {
  async get(key) {
    return process.env[key] || '';
  }
};

export const scheduler = {
  async now(endpoint) {
    const port = Number(process.env.PORT || 3000);
    fetch(`http://127.0.0.1:${port}${endpoint}`, { method: 'POST' }).catch(() => {});
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
      body: JSON.stringify({ from, to: [to], subject, text, html })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error('Email provider request failed');
    return { message_id: body.id || '' };
  }
};

export const ai = {
  async generateText({ purpose, model = 'gemini-3.8-flash', maxTokens = 120, system, prompt }) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    const { GoogleGenAI } = await import('@google/genai');
    const aiClient = new GoogleGenAI({ apiKey });
    const candidateModels = [...new Set([model, 'gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-flash-latest'])];

    let lastError = null;
    for (const candidate of candidateModels) {
      try {
        const response = await aiClient.models.generateContent({
          model: candidate,
          contents: prompt,
          config: {
            systemInstruction: system,
            maxOutputTokens: Math.max(500, maxTokens),
          }
        });
        const text = response.text ||
          response.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
        if (text) {
          return {
            text: text.trim(),
            model: candidate,
            usage: {}
          };
        }
      } catch (err) {
        lastError = err;
        console.warn(`[hatchable ai] Model ${candidate} unavailable; trying fallback model.`);
      }
    }
    throw lastError || new Error('Falha ao gerar texto com IA');
  }
};

export const storage = {
  async put(destPath, buffer, contentType) {
    const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
    const fullPath = path.join(uploadsDir, destPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, buffer);
    return `/uploads/${destPath}`;
  }
};

export const webhooks = {
  verifyHmac({ raw, signature, secret, algorithm = 'sha256', encoding = 'hex', timestamp, tolerance = 300 }) {
    try {
      if (timestamp !== undefined && timestamp !== null && timestamp !== '') {
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
