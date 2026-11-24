import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const base='https://radar-promo-ofertas.hatchable.site';
const root=new URL('../../independent/radar-promo-ofertas/public/',import.meta.url);
async function fixture(page,{signedIn=true,quota=false}={}) {
  const writes=[];let score=0,myVote=0,enabled=false;
  await page.addInitScript(({signedIn})=>{
    window.hatchable={auth:{getSession:async()=>signedIn?{user:{id:'alice'}}:null,signOut:async()=>{signedIn=false;}}};
  },{signedIn});
  await page.route(base+'/**',async route=>{
    const request=route.request(),url=new URL(request.url()),path=url.pathname;
    if(path.startsWith('/api/')) {
      if(quota)return route.fulfill({status:429,json:{code:'usage_limit'}});
      const body=request.postDataJSON();
      if(request.method()!=='GET')writes.push({path,method:request.method(),body});
      let data={ok:true};
      if(path==='/api/account')data={id:'alice',name:'Minha conta'};
      if(path.startsWith('/api/offers/'))data={offer:{id:'fixture',title:'Oferta do teste isolado'}};
      if(path==='/api/comments')data={comments:[{id:'comment-1',displayName:'Outra pessoa',body:'<img src=x onerror=alert(1)>',createdAt:'2026-11-17T12:00:00Z'}],hasMore:false};
      if(path==='/api/comments/manage'&&request.method()==='GET')data={comments:[]};
      if(path==='/api/favorites'&&request.method()==='GET')data={favorites:[]};
      if(path==='/api/votes'){
        if(request.method()==='POST'){myVote=body.value;score=body.value;}
        if(request.method()==='DELETE'){myVote=0;score=0;}
        data={score,myVote,total:myVote?1:0};
      }
      if(path==='/api/notifications'){
        if(request.method()==='PUT')enabled=body.enabled;
        data={enabled,pushConfigured:false,notifications:[]};
      }
      return route.fulfill({json:data});
    }
    const file=path==='/'?'community.html':path.slice(1);
    if(!['community.html','community-ui.js','community-client.js','community.css','theme.css'].includes(file))return route.abort();
    const contentType=file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html';
    const body=file==='theme.css'?'':readFileSync(new URL(file,root));
    return route.fulfill({body,contentType});
  });
  return writes;
}
test('signed-in conversation votes, replies and keeps untrusted text inert on mobile',async({page})=>{
  await page.setViewportSize({width:375,height:812});
  const writes=await fixture(page);
  await page.goto(base+'/community.html?section=offer&offerId=fixture');
  await expect(page.getByText('Conta conectada.',{exact:true})).toBeVisible();
  await expect(page.locator('#comments img')).toHaveCount(0);
  await page.getByRole('button',{name:'Vale a pena',exact:true}).click();
  await expect(page.locator('#up')).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Responder',exact:true}).click();
  await page.getByLabel('Seu comentário').fill('Resposta apenas no teste');
  await page.getByRole('button',{name:'Comentar',exact:true}).click();
  await expect(page.getByText('Comentário salvo.',{exact:true})).toBeVisible();
  expect(writes.find(w=>w.path==='/api/comments/manage').body.replyToId).toBe('comment-1');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('signed-out view offers login with a same-origin return path and no write controls',async({page})=>{
  await fixture(page,{signedIn:false});
  await page.goto(base+'/community.html?section=offer&offerId=fixture');
  await expect(page.locator('#login')).toHaveAttribute('href',/\/login\?next=%2Fcommunity/);
  await expect(page.locator('#comment-form')).toBeHidden();await expect(page.locator('#voting')).toBeHidden();
});
test('quota is displayed as an error and notification consent is saved explicitly',async({page})=>{
  await fixture(page,{quota:true});
  await page.goto(base+'/community.html?section=inbox');
  await expect(page.locator('#status')).toContainText('limitado');await expect(page.locator('#inbox')).toBeHidden();
  await page.unrouteAll();const writes=await fixture(page);
  await page.goto(base+'/community.html?section=inbox');
  await expect(page.getByText('Nenhum aviso nesta conta.')).toBeVisible();
  expect(writes).toHaveLength(0);
  await page.getByLabel('Receber avisos de respostas nesta conta').check();
  await page.getByRole('button',{name:'Salvar preferência'}).click();
  await expect(page.getByText('Preferência salva.',{exact:true})).toBeVisible();
  expect(writes[0].body).toEqual({enabled:true});
});
