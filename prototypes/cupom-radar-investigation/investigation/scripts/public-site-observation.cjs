const fs = require('node:fs/promises');
const path = require('node:path');
const { createRequire } = require('node:module');
const requireFromRepo = createRequire(path.join(__dirname, '..', 'test-loader.cjs'));
const playwrightRoot = process.env.WORKSPACE_NODE_MODULES
  ? path.join(process.env.WORKSPACE_NODE_MODULES, 'playwright')
  : 'playwright';
const { chromium } = requireFromRepo(playwrightRoot);

const root = path.resolve(__dirname, '..');
const screenshots = path.join(root, 'screenshots');
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const origin = 'https://www.cupomradaroficial.com';

function safePath(raw) {
  try {
    const url = new URL(raw, origin);
    return `${url.origin}${url.pathname}`;
  } catch { return '[invalid-url]'; }
}

async function observe(page, pathName, shotName, viewport) {
  await page.setViewportSize(viewport);
  const response = await page.goto(`${origin}${pathName}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(screenshots, shotName), fullPage: false });
  const summary = await page.evaluate(() => {
    const count = selector => document.querySelectorAll(selector).length;
    const cleanText = element => (element?.innerText || element?.textContent || '')
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[contact redacted]')
      .replace(/(?:\+?55\s*)?\(?\d{2}\)?[\s.-]*9?\d{4}[\s.-]*\d{4}/g, '[contact redacted]')
      .trim().replace(/\s+/g, ' ').slice(0, 100);
    const safeHref = element => {
      try {
        const url = new URL(element.href, location.href);
        if (url.protocol === 'mailto:' || url.protocol === 'tel:') return '[contact redacted]';
        return `${url.origin}${url.pathname}`;
      }
      catch { return ''; }
    };
    const elements = [...document.querySelectorAll('a[href]')].slice(0, 45).map(a => ({ label: cleanText(a), href: safeHref(a) }));
    const buttons = [...document.querySelectorAll('button,[role="button"]')].slice(0, 35).map(b => cleanText(b)).filter(Boolean);
    const headings = [...document.querySelectorAll('h1,h2,h3')].slice(0, 35).map(h => ({ level: h.tagName.toLowerCase(), text: cleanText(h) }));
    const externalStylesheets = [...document.querySelectorAll('link[rel~="stylesheet"]')].map(s => safeHref(s));
    const scripts = [...document.querySelectorAll('script[src]')].map(s => safeHref(s));
    const top = document.querySelector('main,header,section') || document.body;
    const style = getComputedStyle(top);
    return {
      title: document.title,
      headings,
      counts: { links: count('a[href]'), buttons: count('button,[role="button"]'), forms: count('form'), inputs: count('input'), textareas: count('textarea'), selects: count('select'), images: count('img'), videos: count('video'), iframes: count('iframe'), details: count('details') },
      navigationLabels: [...document.querySelectorAll('nav a, nav button, [role="navigation"] a')].map(cleanText).filter(Boolean).slice(0, 30),
      buttons,
      linkSample: elements,
      stylesheetPaths: externalStylesheets,
      scriptPaths: scripts,
      visual: { viewport: { width: innerWidth, height: innerHeight }, documentWidth: document.documentElement.scrollWidth, topFont: style.fontFamily, topBackground: style.backgroundColor, bodyBackground: getComputedStyle(document.body).backgroundColor }
    };
  });
  return { requestedPath: pathName, status: response?.status() ?? null, finalPath: safePath(page.url()), ...summary };
}

async function main() {
  await fs.mkdir(screenshots, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: chromePath, timeout: 30000 });
  const result = { capturedAt: new Date().toISOString(), tool: `Playwright ${requireFromRepo(path.join(playwrightRoot, 'package.json')).version}`, evidencePolicy: 'anonymous public-page inspection; query strings and fragments omitted; no storage or credentials captured', pages: {} };
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    let consoleErrors = 0;
    let requestFailures = 0;
    page.on('console', message => { if (message.type() === 'error') consoleErrors++; });
    page.on('requestfailed', () => { requestFailures++; });
    result.pages.homeDesktop = await observe(page, '/', 'reference-home-desktop.png', { width: 1440, height: 900 });
    result.pages.homeMobile = await observe(page, '/', 'reference-home-mobile.png', { width: 390, height: 844 });
    result.pages.faqDesktop = await observe(page, '/faq', 'reference-faq-desktop.png', { width: 1440, height: 900 });
    result.pages.faqMobile = await observe(page, '/faq', 'reference-faq-mobile.png', { width: 390, height: 844 });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${origin}/faq`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.getByRole('button', { name: /Buscar/ }).click();
    const search = page.getByPlaceholder('Buscar na Central de Ajuda…');
    await search.fill('WhatsApp');
    await page.waitForTimeout(350);
    result.interactions = {
      faqSearch: {
        query: 'WhatsApp',
        dialogVisible: await page.locator('[role="dialog"]').isVisible(),
        resultLabels: await page.locator('[role="option"],a[href*="/faq/"]').evaluateAll(items => items.map(item => (item.innerText || item.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 100)).filter(Boolean).slice(0, 8))
      }
    };
    await page.screenshot({ path: path.join(screenshots, 'reference-faq-search-whatsapp.png'), fullPage: false });
    const publishResponse = await page.goto(`${origin}/faq/publicar`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    result.interactions.publicarCategory = {
      status: publishResponse?.status() ?? null,
      finalPath: safePath(page.url()),
      heading: await page.locator('h1').first().textContent().then(value => (value || '').trim())
    };
    result.runtime = { consoleErrorCount: consoleErrors, requestFailureCount: requestFailures };
    await context.close();

    // Test only the public, unauthenticated gate. No credentials, cookies, or storage are reused.
    const cleanContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const dashboard = await cleanContext.newPage();
    const response = await dashboard.goto(`${origin}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await dashboard.waitForTimeout(700);
    result.pages.dashboardWithoutSession = {
      requestedPath: '/dashboard',
      status: response?.status() ?? null,
      finalPath: safePath(dashboard.url()),
      title: await dashboard.title(),
      headings: await dashboard.locator('h1,h2').allTextContents().then(values => values.map(v => v.trim()).filter(Boolean).slice(0, 8))
    };
    await cleanContext.close();
  } finally {
    await browser.close();
  }
  const out = path.join(root, 'public-site-observation.json');
  await fs.writeFile(out, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(`Saved sanitized public observation: ${out}`);
  console.log(JSON.stringify({ homeStatus: result.pages.homeDesktop.status, homeTitle: result.pages.homeDesktop.title, homeCounts: result.pages.homeDesktop.counts, faqStatus: result.pages.faqDesktop.status, faqCounts: result.pages.faqDesktop.counts, faqSearch: result.interactions.faqSearch, publicarCategory: result.interactions.publicarCategory, mobileHomeWidth: result.pages.homeMobile.visual, publicDashboard: result.pages.dashboardWithoutSession, screenshots: ['reference-home-desktop.png', 'reference-home-mobile.png', 'reference-faq-desktop.png', 'reference-faq-mobile.png', 'reference-faq-search-whatsapp.png'] }, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
