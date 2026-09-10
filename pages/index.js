import fs from 'node:fs';
import path from 'node:path';

export const access = 'member';

const htmlPath = path.resolve(process.cwd(), 'pages', 'index.html');
let cachedHtml = null;

export default async function handler(req, res) {
  if (!cachedHtml || process.env.NODE_ENV !== 'production') {
    cachedHtml = fs.readFileSync(htmlPath, 'utf8');
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(cachedHtml);
}
