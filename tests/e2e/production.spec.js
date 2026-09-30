import {test,expect} from '@playwright/test';
import path from 'node:path';

async function ready(page){
  await page.route('https://fonts.googleapis.com/**',route=>route.abort());
  await page.route('https://fonts.gstatic.com/**',route=>route.abort());
  await page.goto('/');
  await expect(page.locator('#content .hero')).toBeVisible();
}
async function accessibility(page){
  await page.addScriptTag({path:path.resolve('node_modules/axe-core/axe.min.js')});
  const violations=await page.evaluate(async()=>{const results=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return results.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({html:n.html,target:n.target,summary:n.failureSummary}))}));});
  expect.soft(violations).toEqual([]);
}
test('sete áreas acessíveis, conteúdo preservado, modal por teclado e oferta com upload',async({page,request})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await ready(page);
 await expect(page.locator('#nav button')).toHaveCount(7);
 for(const name of ['Central','Radar','Ofertas','Publicações','Canais','Relatórios','Configurações']){
  await page.locator('#nav').getByRole('button',{name,exact:true}).click();await expect(page.locator('#title')).toHaveText(name);await accessibility(page);
 }
 await page.getByRole('button',{name:'Integrações',exact:true}).click();await expect(page.getByRole('heading',{name:'Prontidão da operação'})).toBeVisible();
 await page.locator('#nav').getByRole('button',{name:'Ofertas',exact:true}).click();
 await page.getByRole('button',{name:'Estúdio de IA',exact:true}).click();await expect(page.locator('[name=studioTitle]')).toBeVisible();await accessibility(page);
 await page.getByRole('button',{name:'Agente Radar Social',exact:true}).click();await expect(page.locator('[name=agentTopic]')).toBeVisible();
 await page.getByRole('button',{name:'Tráfego e redes sociais',exact:true}).click();await expect(page.locator('#content')).toContainText('Campanhas');
 const add=page.locator('.topactions').getByRole('button',{name:'+ Nova oferta',exact:true});await add.click();
 await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByLabel('Imagem do produto')).toBeFocused();await accessibility(page);
 await page.keyboard.press('Shift+Tab');await expect(page.getByRole('button',{name:'Fechar',exact:true})).toBeFocused();
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();await expect(add).toBeFocused();
 await add.click();await page.getByLabel('Imagem do produto').setInputFiles({name:'produto.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jMloAAAAASUVORK5CYII=','base64')});
 await page.getByLabel('Nome do produto').fill('Oferta auditada no navegador');await page.getByLabel('Preço atual',{exact:true}).fill('49.90');await page.getByLabel('Preço anterior',{exact:true}).fill('99.90');await page.getByLabel('Link oficial de afiliado').fill('https://amazon.com.br/dp/AUDIT?tag=audit');await page.getByLabel('Código do cupom').fill('REAL10');
 await page.getByRole('button',{name:'Salvar',exact:true}).click();await expect(page.getByRole('dialog')).not.toBeVisible();await expect(page.locator('#content')).toContainText('Oferta auditada no navegador');await accessibility(page);
 const data=await (await request.get('/api/data')).json();const offer=data.offers.find(o=>o.title==='Oferta auditada no navegador');expect(offer.currentPrice).toBe(4990);expect(offer.imageUrl).toMatch(/^\/uploads\/products\//);expect(offer.couponCode).toBe('REAL10');
 expect((await request.put('/api/data',{data:{entity:'offer',id:offer.id,status:'APPROVED'}})).status()).toBe(200);
 expect((await request.post('/api/radar/price',{data:{offerId:offer.id,price:5990}})).status()).toBe(201);
 expect((await request.post('/api/jobs/telegram',{data:{}})).status()).toBe(404);
 expect((await request.post('/api/data',{data:{entity:'queue',name:'Inválida',startTime:'99:99'}})).status()).toBe(400);
 expect(errors).toEqual([]);
 await page.screenshot({path:'test-results/dashboard-desktop.png',fullPage:true});
});
test('menu e layout em 375, 768, 880, 1024 e 1440; preferência por movimento reduzido',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const width of [375,768,880,1024,1440]){
  await page.setViewportSize({width,height:900});await ready(page);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  const menu=page.getByRole('button',{name:'Menu',exact:true});
  if(width<=900){await expect(menu).toBeVisible();await menu.click();await expect(menu).toHaveAttribute('aria-expanded','true');await expect(page.locator('#nav').getByRole('button',{name:'Central',exact:true})).toBeFocused();await page.keyboard.press('Escape');await expect(menu).toBeFocused();await menu.click();await page.locator('#nav').getByRole('button',{name:'Ofertas',exact:true}).click();await expect(menu).toHaveAttribute('aria-expanded','false');}
  else await expect(menu).not.toBeVisible();
  await accessibility(page);
  if(width===375)await page.screenshot({path:'test-results/dashboard-mobile.png',fullPage:true});
 }
});
