const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const repo = path.resolve(__dirname, '..');
const prototype = path.join(repo, 'prototype');
const requireFromRepo = createRequire(path.join(repo, 'test-loader.cjs'));
const playwrightPath = process.env.WORKSPACE_NODE_MODULES
  ? path.join(process.env.WORKSPACE_NODE_MODULES, 'playwright')
  : 'playwright';
const { chromium } = requireFromRepo(playwrightPath);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
let server, browser, baseUrl;

before(async () => {
  server = http.createServer((req, res) => {
    const route = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    const file = path.resolve(prototype, `.${route === '/' ? '/index.html' : route}`);
    if (!file.startsWith(prototype + path.sep) && file !== path.join(prototype, 'index.html')) {
      res.writeHead(403).end('forbidden'); return;
    }
    fs.readFile(file, (error, bytes) => {
      if (error) { res.writeHead(404).end('not found'); return; }
      res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(bytes);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  browser = await chromium.launch({ headless: true, executablePath });
});

after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

test('dashboard renders demo boundary and internal modules navigate', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(baseUrl);
  await assert.doesNotReject(() => page.getByRole('heading', { name: 'Painel' }).waitFor());
  await page.getByText('Sem integrações conectadas').waitFor();
  await page.getByRole('button', { name: 'Gerar postagem' }).click();
  await page.getByRole('heading', { name: 'Gerar postagem' }).waitFor();
  assert.match(page.url(), /#postagem$/);
  await page.screenshot({ path: path.join(repo, 'screenshots', 'prototype-desktop.png'), fullPage: true });
  await page.close();
});

test('post generator validates URL and creates only a local draft', async () => {
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/#postagem`);
  await page.getByLabel('Nome do produto').fill('Produto de teste sintético');
  await page.getByLabel('Preço atual').fill('39,90');
  await page.getByLabel('Link do produto (opcional no modo manual)').fill('ftp://example.com/item/demo');
  await page.getByRole('button', { name: 'Gerar rascunho' }).click();
  await page.getByText('Informe uma URL HTTP ou HTTPS válida.').waitFor();
  await page.getByLabel('Link do produto (opcional no modo manual)').fill('https://example.com/item/demo');
  await page.getByRole('button', { name: 'Gerar rascunho' }).click();
  await page.getByText(/RASCUNHO LOCAL — não publicado/).waitFor();
  await page.getByRole('button', { name: 'Modo Fila' }).click();
  await page.getByText('Produto de teste sintético').waitFor();
  await page.getByRole('button', { name: 'Agendar localmente' }).click();
  await page.getByRole('heading', { name: 'Agendamentos' }).waitFor();
  await page.close();
});

test('template edit persists in this browser and preview interpolates placeholders', async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${baseUrl}/#modelos`);
  await page.getByLabel('Texto do modelo').fill('Teste: {produto} / {preco} / {cupom}');
  await page.getByRole('button', { name: 'Salvar neste navegador' }).click();
  await page.getByRole('button', { name: 'Pré-visualizar' }).click();
  await page.getByText('Teste: Produto de demonstração / R$ 89,90 / EXEMPLO').waitFor();
  await page.reload();
  await page.getByLabel('Texto do modelo').waitFor();
  assert.equal(await page.getByLabel('Texto do modelo').inputValue(), 'Teste: {produto} / {preco} / {cupom}');
  await context.close();
});

test('copier labels duplicates within session and does not claim affiliate conversion', async () => {
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/#copiador`);
  const input = page.getByLabel('Texto sintético da oferta');
  await input.fill('Exemplo local https://example.com/item/123');
  await page.getByRole('button', { name: 'Analisar texto' }).click();
  await page.getByText('AMOSTRA NOVA').waitFor();
  await page.getByRole('button', { name: 'Analisar texto' }).click();
  await page.getByText('DUPLICATA NESTA SESSÃO').waitFor();
  await page.getByText(/Sem consulta, conversão de afiliado, grupo ou envio/).waitFor();
  await page.close();
});

test('mobile menu opens, navigation works, and channels remain disconnected', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(baseUrl);
  const menu = page.getByRole('button', { name: 'Abrir menu' });
  await menu.click();
  assert.equal(await menu.getAttribute('aria-expanded'), 'true');
  await page.getByRole('button', { name: 'WhatsApp e Telegram' }).click();
  await page.getByRole('heading', { name: 'WhatsApp e Telegram' }).waitFor();
  await page.getByText('Desconectado', { exact: true }).first().waitFor();
  await page.screenshot({ path: path.join(repo, 'screenshots', 'prototype-mobile.png'), fullPage: true });
  const size = await page.locator('body').evaluate(el => ({ scroll: el.scrollWidth, client: el.clientWidth }));
  assert.ok(size.scroll <= size.client + 1, `horizontal overflow: ${JSON.stringify(size)}`);
  await page.close();
});
