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
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await ready(page);await page.screenshot({path:'test-results/dashboard-home.png',fullPage:true});
 await expect(page.locator('#nav button')).toHaveCount(7);
 for(const heading of ['Operação','Análise','Gestão'])await expect(page.locator('#nav').getByRole('heading',{name:heading,exact:true})).toBeVisible();
 for(const [name,title] of [['Central','Central'],['Radar','Radar'],['Ofertas','Ofertas'],['Publicações','Publicações'],['Canais','Canais'],['Relatórios','Relatórios'],['Configurações','Configurações']]){
  await page.locator('#nav').getByRole('button',{name,exact:true}).click();await expect(page.locator('#title')).toHaveText(title);await accessibility(page);
 }
 for(const [area,items] of [['Radar',['Monitoramento 24h','Modo clone','Criação rápida']],['Publicações',['Filas e agendamento']],['Canais',['Grupos e canais','Gestão de leads']],['Configurações',['Segurança e LGPD','Integrações','Conta, vitrine e planos']]]){
  await page.locator('#nav').getByRole('button',{name:area,exact:true}).click();
  for(const item of items){const tab=page.getByRole('button',{name:item,exact:true});await expect(tab).toBeVisible();await tab.click();await expect(tab).toHaveClass(/\bon\b/);await expect(page.locator('#group-panel')).toBeVisible();}
 }
 await page.locator('#nav').getByRole('button',{name:'Ofertas',exact:true}).click();await expect(page.locator('#global-create-offer')).toBeHidden();await expect(page.locator('#group-panel').getByRole('button',{name:'+ Nova oferta',exact:true})).toBeVisible();await page.screenshot({path:'test-results/offers-workspace.png',fullPage:true});
 for(const item of ['Ofertas e cupons','Curador de ofertas']){const tab=page.getByRole('button',{name:item,exact:true});await expect(tab).toBeVisible();await tab.click();await expect(tab).toHaveClass(/\bon\b/);await expect(page.locator('#group-panel')).toBeVisible();}
 const iaCategory=page.locator('.offers-category.category-ai');await iaCategory.click();await expect(iaCategory).toHaveAttribute('aria-pressed','true');await expect(page.locator('#global-create-offer')).toBeVisible();await expect(page.getByRole('link',{name:/Radar Vídeo IA/})).toHaveAttribute('href','/radar-video-ia');await page.getByRole('link',{name:/Radar Vídeo IA/}).click();await expect(page.getByRole('heading',{name:'Radar Vídeo IA'})).toBeVisible();await expect(page.getByLabel('Como gerar o roteiro')).toBeVisible();await expect(page.getByLabel('Como gerar o roteiro')).toHaveValue('local');await expect(page.getByRole('link',{name:/Voltar para Ofertas e IA/})).toHaveAttribute('href','/#studio');await page.screenshot({path:'test-results/radar-video-ia.png',fullPage:true});await page.getByRole('link',{name:/Voltar para Ofertas e IA/}).click();await expect(page.locator('[name=studioTitle]')).toBeVisible();
 const motherTab=page.getByRole('button',{name:'IA Central',exact:true});await motherTab.click();await expect(page.getByLabel('Objetivo da análise')).toBeVisible();await page.getByLabel('Objetivo da análise').fill('Priorizar segurança e confiabilidade');await page.getByLabel('Modelo de IA').selectOption('gemini');await page.route('**/api/ai/orchestrator',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,model:'gemini',summary:'Plano de auditoria seguro',recommendations:[{area:'SEGURANCA',priority:'HIGH',title:'Revisar acessos',reason:'Há integrações pendentes.',steps:['Conferir permissões'],requiresApproval:true}],notice:'Plano consultivo; nenhuma alteração executada.'})}));await page.getByRole('button',{name:'Analisar panorama e preparar plano',exact:true}).click();await expect(page.locator('#motherPlanResult')).toContainText('Revisar acessos');await expect(page.locator('#motherPlanStatus')).toContainText('Revise antes de executar');await accessibility(page);await page.screenshot({path:'test-results/ia-central-plan.png',fullPage:true});await page.unroute('**/api/ai/orchestrator');
 const studioTab=page.getByRole('button',{name:'Estúdio de IA',exact:true});await expect(studioTab).toBeVisible();await studioTab.click();await expect(page.locator('[name=studioTitle]')).toBeVisible();
 const socialCategory=page.locator('.offers-category.category-social');await socialCategory.click();await expect(socialCategory).toHaveAttribute('aria-pressed','true');
 for(const item of ['Tráfego e redes sociais','Agente Radar Social']){const tab=page.getByRole('button',{name:item,exact:true});await expect(tab).toBeVisible();await tab.click();await expect(tab).toHaveClass(/\bon\b/);await expect(page.locator('#group-panel')).toBeVisible();}
 await page.locator('#nav').getByRole('button',{name:'Configurações',exact:true}).click();await page.getByRole('button',{name:'Integrações',exact:true}).click();await expect(page.getByRole('heading',{name:'Prontidão da operação'})).toBeVisible();
 await page.locator('#nav').getByRole('button',{name:'Radar',exact:true}).click();await page.getByRole('button',{name:'Modo clone',exact:true}).click();
 await page.route('**/api/messages/parse-preview',route=>{const body=route.request().postDataJSON();const result=body.text.includes('\n\n')?{ok:true,multiple:true,items:[{ok:true,title:'Fone de teste',currentPrice:4990,originalPrice:9990,productUrl:'https://amazon.com.br/dp/B000TEST',affiliateUrl:'https://amazon.com.br/dp/B000TEST?tag=radar',marketplace:'AMAZON',affiliateLinkDetected:true,couponCode:'RADAR10',couponUrl:'https://amazon.com.br/cupom/RADAR10',sourceText:'Fone de teste por R$ 49,90'},{ok:true,title:'Air Fryer teste',currentPrice:24990,originalPrice:39990,productUrl:'https://www.magazineluiza.com.br/p/123',affiliateUrl:'',marketplace:'MAGALU',affiliateLinkDetected:false,couponCode:'',couponUrl:'',sourceText:'Air Fryer teste por R$ 249,90'}]}:{ok:true,title:'Fone de teste',currentPrice:4990,originalPrice:9990,productUrl:'https://amazon.com.br/dp/B000TEST',affiliateUrl:'https://amazon.com.br/dp/B000TEST?tag=radar',marketplace:'AMAZON',couponCode:'RADAR10',couponUrl:'https://amazon.com.br/cupom/RADAR10'};return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)});});
 await page.getByLabel('Mensagem ou lote copiado').fill('Fone de teste por R$ 49,90');await page.getByRole('button',{name:'Analisar oferta(s)',exact:true}).click();
 await expect(page.getByLabel('Produto',{exact:true})).toHaveValue('Fone de teste');await page.getByLabel('Produto',{exact:true}).fill('Fone revisado');await page.getByRole('button',{name:'Continuar para cadastro',exact:true}).click();
 await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByLabel('Nome do produto')).toHaveValue('Fone revisado');await page.keyboard.press('Escape');
 await page.getByLabel('Mensagem ou lote copiado').fill('Fone de teste\nPor R$ 49,90\nhttps://amazon.com.br/dp/B000TEST?tag=radar\n\nAir Fryer teste\nDe R$ 399,90\nPor R$ 249,90\nhttps://www.magazineluiza.com.br/p/123');await page.getByRole('button',{name:'Analisar oferta(s)',exact:true}).click();
 await expect(page.locator('#copierResult')).toContainText('2 item(ns) encontrado(s)');await expect(page.getByRole('button',{name:'Revisar este item'})).toHaveCount(2);await accessibility(page);
 await page.getByRole('button',{name:'Revisar este item'}).first().click();await expect(page.getByLabel('Produto',{exact:true})).toHaveValue('Fone de teste');await page.getByRole('button',{name:'Voltar à lista de itens'}).click();
 await page.getByRole('button',{name:'Revisar este item'}).nth(1).click();await expect(page.getByLabel('Link de afiliado confirmado')).toHaveValue('');await page.getByRole('button',{name:'Continuar para cadastro'}).click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByLabel('Nome do produto')).toHaveValue('Air Fryer teste');await page.keyboard.press('Escape');await page.unroute('**/api/messages/parse-preview');
 await page.locator('#nav').getByRole('button',{name:'Ofertas',exact:true}).click();await page.locator('.offers-category.category-ai').click();
 await page.getByRole('button',{name:'Estúdio de IA',exact:true}).click();await expect(page.locator('[name=studioTitle]')).toBeVisible();await accessibility(page);
 await page.locator('.offers-category.category-social').click();await page.getByRole('button',{name:'Agente Radar Social',exact:true}).click();await expect(page.locator('[name=agentTopic]')).toBeVisible();
 await page.getByRole('button',{name:'Tráfego e redes sociais',exact:true}).click();await expect(page.locator('#content')).toContainText('Campanhas');
 const add=page.locator('.topactions').getByRole('button',{name:'+ Nova oferta',exact:true});await add.click();
 await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByLabel('Imagem do produto')).toBeFocused();await accessibility(page);
 await page.keyboard.press('Shift+Tab');await expect(page.getByRole('button',{name:'Fechar',exact:true})).toBeFocused();
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();await expect(add).toBeFocused();
 await add.click();await page.getByLabel('Imagem do produto').setInputFiles({name:'produto.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jMloAAAAASUVORK5CYII=','base64')});
 await page.getByLabel('Nome do produto').fill('Oferta auditada no navegador');await page.getByLabel('Preço atual',{exact:true}).fill('49.90');await page.getByLabel('Preço anterior',{exact:true}).fill('99.90');await page.getByLabel('Link oficial de afiliado',{exact:true}).fill('https://amazon.com.br/dp/AUDIT?tag=audit');await page.getByLabel('Código do cupom').fill('REAL10');
 await page.getByLabel('Confirmo que revisei os dados').check();await page.getByRole('button',{name:'Salvar',exact:true}).click();await expect(page.getByRole('dialog')).not.toBeVisible();await expect(page.locator('#content')).toContainText('Oferta auditada no navegador');await accessibility(page);
 const data=await (await request.get('/api/data')).json();const offer=data.offers.find(o=>o.title==='Oferta auditada no navegador');expect(offer.currentPrice).toBe(4990);expect(offer.imageUrl).toMatch(/^\/api\/media\/offer\//);expect(offer.couponCode).toBe('REAL10');
 expect((await request.put('/api/data',{data:{entity:'offer',id:offer.id,status:'APPROVED'}})).status()).toBe(200);
 const priceObservation=await request.post('/api/radar/price',{data:{offerId:offer.id,price:5990}});expect(priceObservation.status()).toBe(202);expect((await priceObservation.json()).status).toBe('UNVERIFIED');
 expect((await request.post('/api/jobs/telegram',{data:{}})).status()).toBe(404);
 expect((await request.post('/api/data',{data:{entity:'queue',name:'Inválida',startTime:'99:99'}})).status()).toBe(400);
 expect((await request.delete('/api/data?entity=offer&id='+encodeURIComponent(offer.id))).status()).toBe(200);
 expect(errors).toEqual([]);
 await page.screenshot({path:'test-results/dashboard-desktop.png',fullPage:true});
});
test('menu e layout em 375, 714, 768, 880, 1024 e 1440; preferência por movimento reduzido',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const width of [375,714,768,880,1024,1440]){
  await page.setViewportSize({width,height:900});await ready(page);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  const menu=page.getByRole('button',{name:'Menu',exact:true});
  if(width<=900){await expect(menu).toBeVisible();await menu.click();await expect(menu).toHaveAttribute('aria-expanded','true');await expect(page.locator('#nav').getByRole('button',{name:'Central',exact:true})).toBeFocused();if(width===375)await page.screenshot({path:'test-results/menu-mobile.png'});await page.keyboard.press('Escape');await expect(menu).toBeFocused();await menu.click();await page.locator('#nav').getByRole('button',{name:'Ofertas',exact:true}).click();await expect(menu).toHaveAttribute('aria-expanded','false');const actionPosition=await page.locator('.topactions').evaluate(element=>getComputedStyle(element).position);expect(actionPosition).toBe('static');const contentStart=await page.locator('#content').evaluate(element=>element.getBoundingClientRect().top);const actionsEnd=await page.locator('.topactions').evaluate(element=>element.getBoundingClientRect().bottom);expect(actionsEnd).toBeLessThanOrEqual(contentStart+1);if(width===375||width===714){await expect(page.locator('.offers-category')).toHaveCount(3);await page.screenshot({path:`test-results/offers-workspace-${width}.png`,fullPage:true});}}
  else await expect(menu).not.toBeVisible();
  await accessibility(page);
  if(width===375)await page.screenshot({path:'test-results/dashboard-mobile.png',fullPage:true});
 }
});
test('cinco WhatsApps, limite, controles de revezamento e fluxos operacionais acessíveis',async({page,request})=>{
 await ready(page);await page.locator('#nav').getByRole('button',{name:'Configurações',exact:true}).click();
 await page.getByRole('button',{name:'Conta, vitrine e planos',exact:true}).click();
 await page.getByRole('button',{name:'Parear conector',exact:true}).click();
 await expect(page.locator('#toast')).toContainText('Segredo principal do n8n ainda não configurado');
 for(let i=1;i<=5;i++){
  await page.getByRole('button',{name:/Adicionar número/}).click();
  await page.getByLabel('Nome da conexão',{exact:true}).fill('WhatsApp teste '+i);
  await page.getByLabel('Número do WhatsApp com DDI').fill('+551199999100'+i);
  await page.getByLabel('Identificação no conector').fill('browser-instance-'+i);
  if(i===1)await accessibility(page);
  await page.getByRole('button',{name:'Salvar',exact:true}).click();await expect(page.getByRole('dialog')).not.toBeVisible();
 }
 await expect(page.locator('#content')).toContainText('5 de 5 números');
 await expect(page.getByRole('button',{name:/Adicionar número/})).toHaveCount(0);
 expect((await request.post('/api/suite',{data:{entity:'connection',name:'Sexto',phoneNumber:'+5511999991006',externalId:'instance-6'}})).status()).toBe(409);
 await page.getByRole('button',{name:'Usar prioridade',exact:true}).click();await expect(page.locator('#content')).toContainText('Seleção por prioridade');
 await page.getByRole('button',{name:'Ativar revezamento',exact:true}).click();await expect(page.locator('#content')).toContainText('Revezamento automático ativo');
 await page.getByRole('button',{name:'Ativar WhatsApp teste 1',exact:true}).click();await expect(page.locator('#toast')).toContainText('conector deve confirmar');
 await page.getByRole('button',{name:'Editar WhatsApp teste 1',exact:true}).click();await page.getByLabel('Número do WhatsApp com DDI').fill('invalid');
 await page.getByRole('button',{name:'Salvar',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByLabel('Número do WhatsApp com DDI')).toHaveValue('invalid');await expect(page.locator('#connectionError')).toBeFocused();await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Remover WhatsApp teste 5',exact:true}).click();await expect(page.locator('#content')).toContainText('4 de 5 números');
 await page.setViewportSize({width:375,height:900});await expect(page.locator('#content')).toContainText('4 de 5 números');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await accessibility(page);
 await page.screenshot({path:'test-results/whatsapp-rotation-mobile.png',fullPage:true});
 await page.setViewportSize({width:1440,height:900});await page.locator('#nav').getByRole('button',{name:'Radar',exact:true}).click();await page.getByRole('button',{name:'+ Nova fonte',exact:true}).click();
 await page.getByLabel('Nome da fonte').fill('Feed autorizado');await page.getByLabel('Tipo',{exact:true}).selectOption('FEED');await page.getByLabel('Origem HTTPS').fill('https://example.com/feed');await page.getByLabel('Autorização da origem').selectOption('true');await accessibility(page);
 await page.getByRole('button',{name:'Salvar',exact:true}).click();await expect(page.getByRole('dialog')).not.toBeVisible();
 await page.locator('#nav').getByRole('button',{name:'Publicações',exact:true}).click();await page.getByRole('button',{name:'+ Nova recorrência',exact:true}).click();await expect(page.getByLabel('Data (uma vez)')).toBeVisible();await accessibility(page);await page.keyboard.press('Escape');
 await page.locator('#nav').getByRole('button',{name:'Configurações',exact:true}).click();await page.getByRole('button',{name:'Segurança e LGPD',exact:true}).click();
 await page.getByRole('button',{name:'Criar backup',exact:true}).click();await expect(page.getByRole('button',{name:'Baixar backup',exact:true})).toBeVisible();
 const backup=(await (await request.get('/api/backups')).json()).backups[0];const file=await request.get('/api/backups?id='+backup.id);expect(file.status()).toBe(200);expect((await file.json()).format).toBe('radar-account-backup');expect(file.headers()['cache-control']).toBe('no-store');
 await accessibility(page);
});
