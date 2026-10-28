const fs = require('node:fs');
const path = require('node:path');

const input = process.argv[2];
if (!input) throw new Error('Passe explicitamente o caminho do HTML anexado como primeiro argumento.');
const raw = fs.readFileSync(input, 'utf8');
const root = path.resolve(__dirname, '..');
const matchAll = (pattern, source = raw) => {
  const globalPattern = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
  return [...source.matchAll(globalPattern)];
};
const textOf = source => source.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();
const publicPath = value => {
  try { const u = new URL(value, 'https://www.cupomradaroficial.com'); return `${u.origin}${u.pathname}`; }
  catch { return '[invalid-url]'; }
};
const tagNames = matchAll(/<([a-z][a-z0-9:-]*)\b/gi).map(m => m[1].toLowerCase());
const title = textOf(matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/i)[0]?.[1] || '');
const anchors = matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi).map(m => {
  const href = matchAll(/\bhref\s*=\s*(["'])(.*?)\1/i, m[1])[0]?.[2];
  const label = textOf(m[2]).slice(0, 100);
  return { label, href: href ? publicPath(href) : '' };
}).filter(a => a.label || a.href);
const buttons = matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi).map(m => textOf(m[2]).slice(0, 100)).filter(Boolean);
const scripts = matchAll(/<script\b([^>]*)>/gi).map(m => {
  const src = matchAll(/\bsrc\s*=\s*(["'])(.*?)\1/i, m[1])[0]?.[2];
  return src ? publicPath(src) : '[inline]';
});
const stylesheets = matchAll(/<link\b([^>]*)>/gi).flatMap(m => {
  const rel = matchAll(/\brel\s*=\s*(["'])(.*?)\1/i, m[1])[0]?.[2] || '';
  const href = matchAll(/\bhref\s*=\s*(["'])(.*?)\1/i, m[1])[0]?.[2];
  return href && /stylesheet/i.test(rel) ? [publicPath(href)] : [];
});
const metaNames = matchAll(/<meta\b([^>]*)>/gi).map(m => matchAll(/\b(?:name|property)\s*=\s*(["'])(.*?)\1/i, m[1])[0]?.[2]).filter(Boolean);
const h = {};
const safeModuleHeadings = new Set(['Gerar Postagem', 'Modo Fila', 'Modo Copiador', 'Aulas']);
for (const level of ['h1', 'h2', 'h3']) h[level] = matchAll(new RegExp(`<${level}\\b[^>]*>([\\s\\S]*?)<\\/${level}>`, 'gi')).map(m => {
  const value = textOf(m[1]).slice(0, 120);
  return level === 'h3' && !safeModuleHeadings.has(value) ? '[PERSONAL DATA REDACTED]' : value;
}).filter(Boolean);

const report = {
  source: path.basename(input),
  bytes: Buffer.byteLength(raw),
  title,
  structure: {
    elementCount: tagNames.length,
    uniqueElements: [...new Set(tagNames)].sort(),
    anchors: anchors.length,
    buttons: tagNames.filter(tag => tag === 'button').length,
    forms: matchAll(/<form\b/gi).length,
    inputs: matchAll(/<input\b/gi).length,
    textareas: matchAll(/<textarea\b/gi).length,
    selects: matchAll(/<select\b/gi).length,
    images: matchAll(/<img\b/gi).length,
    iframes: matchAll(/<iframe\b/gi).length,
    scriptTags: scripts.length,
    stylesheetLinks: stylesheets.length,
    inlineStyleBlocks: matchAll(/<style\b/gi).length,
    inlineStyleAttributes: matchAll(/\bstyle\s*=/gi).length,
    ariaAttributes: matchAll(/\baria-[a-z-]+\s*=/gi).length,
    dataAttributes: matchAll(/\bdata-[a-z0-9_-]+\s*=/gi).length,
    inlineEventAttributes: matchAll(/\bon[a-z]+\s*=/gi).length
  },
  headings: h,
  links: anchors,
  buttons,
  scripts,
  stylesheets,
  metaNames,
  sensitivityScan: {
    credentialKeywordOccurrences: matchAll(/\b(?:access[_-]?token|refresh[_-]?token|authorization|set-cookie|cookie|api[_-]?key|sessionid)\b/gi).length,
    bearerCredentialPatterns: matchAll(/\bBearer\s+[A-Za-z0-9._~+\/-]{20,}/gi).length,
    emailLikeStrings: matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi).length,
    phoneLikeStrings: matchAll(/(?:\+?55\s*)?\(?\d{2}\)?[\s.-]*9?\d{4}[\s.-]*\d{4}/g).length,
    note: 'Only counts are retained; matched strings are not copied into this report.'
  },
  caveats: [
    'This is static HTML from a prior browser capture; it does not recreate runtime API responses or authenticated behavior.',
    'One script URL is injected by a local browser security product; its query string is omitted from this report.',
    'Paths and labels are sanitized to remove query strings, fragments, and URL user information.'
  ]
};
const output = path.join(root, 'html-capture-analysis.json');
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ output, bytes: report.bytes, title: report.title, structure: report.structure, sensitivityScan: report.sensitivityScan }, null, 2));
