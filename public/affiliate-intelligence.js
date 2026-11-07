const $=id=>document.getElementById(id),num=v=>new Intl.NumberFormat('pt-BR').format(Number(v)||0),money=c=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format((Number(c)||0)/100),date=v=>v?new Date(v).toLocaleString('pt-BR'):'—',esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const continuations={};
const competitionCategories={
 'bebe-maternidade':{label:'Bebês e maternidade',terms:['roupa de bebê','acessórios maternidade','alimentação bebê','brinquedos bebê']},
 'casa-decoracao':{label:'Casa e decoração',terms:['organizador doméstico','decoração casa','iluminação decorativa','utilidades para casa']},
 'cozinha-utensilios':{label:'Cozinha e utensílios',terms:['utensílios de cozinha','organizador cozinha','panelas e acessórios','potes herméticos']},
 'beleza-cuidados':{label:'Beleza e cuidados pessoais',terms:['acessórios beleza','cuidados pessoais','maquiagem acessórios','skincare acessórios']},
 'moda-feminina':{label:'Moda feminina',terms:['vestido feminino','conjunto feminino','bolsa feminina','moda feminina básica']},
 'moda-masculina':{label:'Moda masculina',terms:['camiseta masculina','calça masculina','acessórios masculinos','moda masculina']},
 'eletronicos-acessorios':{label:'Eletrônicos e acessórios',terms:['acessórios eletrônicos','fone bluetooth','carregador rápido','luminária usb']},
 'informatica-celulares':{label:'Informática e celulares',terms:['acessórios celular','suporte celular','acessórios informática','capinha celular']},
 'pet-shop':{label:'Pet shop',terms:['acessórios para pets','brinquedos para cachorro','cama pet','comedouro pet']},
 'ferramentas-utilidades':{label:'Ferramentas e utilidades',terms:['ferramentas manuais','kit ferramentas','utilidades automotivas','acessórios manutenção']}
};
function applyCategory(){const slug=$('catalogCategory')?.value,c=competitionCategories[slug];if(!c)return;$('catalogKeyword').value=c.terms[0];$('categoryKeywords').textContent='Sugestões: '+c.terms.join(' · ');if($('compCategory'))$('compCategory').value=slug;if($('compSearchTerm'))$('compSearchTerm').value=c.terms[0];}
$('catalogCategory')?.addEventListener('change',applyCategory);
$('compCategory')?.addEventListener('change',()=>{const c=competitionCategories[$('compCategory').value];if(c)$('compSearchTerm').value=c.terms[0];});
if($('catalogCategory'))applyCategory();
async function load(){ $('status').textContent='Atualizando…';$('refresh').disabled=true;try{const r=await fetch('/api/affiliate/intelligence',{credentials:'same-origin',headers:{accept:'application/json'}}),d=await r.json();if(!r.ok)throw Error(d.error||'Falha ao carregar');$('offers').textContent=num(d.summary.approvedOffers);$('clicks').textContent=num(d.summary.clicks30d);$('orders').textContent=num(d.summary.orders30d);$('commission').textContent=money(d.summary.commissionCents30d);$('providers').innerHTML=d.marketplaces.map(x=>'<div class="provider"><div><b>'+esc(x.marketplace)+'</b><div class="small">'+esc(x.credential?.status||'SEM CREDENCIAL')+'</div></div><div class="small">'+num(x.offers.approved_offers)+' ofertas · '+num(x.clicks30d)+' cliques</div></div>').join('');$('catalog').innerHTML=d.discoveredCatalog.length?d.discoveredCatalog.map(x=>'<div class="provider"><b>'+esc(x.marketplace)+' · '+esc(x.kind)+'</b><span>'+num(x.records)+'</span></div>').join(''):'Nenhum catálogo persistido. Auditoria não equivale à importação completa.';$('audits').innerHTML=d.latestAudits.map(x=>'<tr><td>'+esc(x.marketplace)+'</td><td>'+esc(x.operation)+'</td><td><span class="pill">'+esc(x.status)+'</span></td><td>'+num(x.returned_count)+(x.total_available!=null?' / '+num(x.total_available):'')+'</td><td>'+num(x.page_count)+'</td><td>'+esc(date(x.checked_at))+'</td></tr>').join('')||'<tr><td colspan="6">Sem auditorias.</td></tr>';$('ranked').innerHTML=d.rankedOffers.slice(0,30).map(x=>'<tr><td><b>'+esc(x.title)+'</b><div class="small">'+money(x.currentPriceCents)+'</div></td><td>'+esc(x.marketplace)+'</td><td>'+num(x.score)+'/100<div class="small">'+esc(x.evidenceLevel)+'</div></td><td>'+num(x.clicks30d)+'</td><td>'+num(x.orders30d)+'</td><td>'+(x.conversionRate==null?'—':num(x.conversionRate)+'%')+'</td><td>'+money(x.commissionCents30d)+'</td></tr>').join('')||'<tr><td colspan="7">Sem ofertas.</td></tr>';$('status').textContent='Atualizado em '+date(d.generatedAt)+'. Rentabilidade líquida ainda não calculada.';}catch(e){$('status').textContent=e.message||'Erro ao carregar.';}finally{$('refresh').disabled=false;}}
async function loadAliExpressMetrics(){
 const status=$('aliexpressMetricsStatus');if(!status)return;status.textContent='Atualizando métricas AliExpress…';
 try{
  const response=await fetch('/api/affiliate/aliexpress-metrics',{credentials:'same-origin',headers:{accept:'application/json'}});
  const data=await response.json();if(!response.ok)throw Error(data.error||'Falha ao carregar métricas AliExpress.');
  const w=data.windows?.last24h||{},q=data.quality||{},dist=data.distribution||{},promos=data.promotions||{};
  $('aeApiCalls').textContent=num(w.api_calls);
  $('aeSeen').textContent=num(w.records_seen);
  $('aeCatalog').textContent=num(data.capture?.catalogTotal);
  $('aeSent').textContent=num(dist.sentLast24h);
  $('aeQueued').textContent=num((dist.publicationsByStatus||[]).filter(x=>['READY','DISPATCHING','RETRY','WAITING_CONFIRMATION'].includes(x.status)).reduce((n,x)=>n+Number(x.total||0),0));
  $('aeReview').textContent=num((q.offersByStatus||[]).filter(x=>x.status==='PENDING'&&['NEEDS_REVIEW','PENDING_REVIEW','PENDING'].includes(x.validation_status)).reduce((n,x)=>n+Number(x.total||0),0));
  $('aeKeywords').innerHTML=(data.capture?.topKeywords||[]).slice(0,10).map(x=>'<tr><td><b>'+esc(x.source_keyword)+'</b></td><td>'+num(x.products)+'</td><td>'+(x.avg_rating==null?'—':String(x.avg_rating).replace('.',',')+'%')+' <span class="small">('+num(x.rated_products||0)+' avaliados)</span></td><td>'+num(x.sales_signal)+'</td></tr>').join('')||'<tr><td colspan="4">Ainda não há histórico suficiente de palavras-chave.</td></tr>';
  $('aeCaptureStates').innerHTML=(data.capture?.catalogByStatus||[]).map(x=>'<tr><td>'+esc(x.processing_status)+'</td><td>'+num(x.total)+'</td></tr>').join('')||'<tr><td colspan="2">Sem produtos capturados.</td></tr>';
  $('aeOfferStates').innerHTML=(q.offersByStatus||[]).map(x=>'<tr><td>'+esc(x.status)+'</td><td>'+esc(x.validation_status)+'</td><td>'+num(x.total)+'</td><td>'+num(x.avg_score)+'/100</td></tr>').join('')||'<tr><td colspan="4">Sem ofertas AliExpress.</td></tr>';
  $('aePublicationStates').innerHTML=(dist.publicationsByStatus||[]).map(x=>'<tr><td>'+esc(x.status)+'</td><td>'+num(x.total)+'</td><td>'+num(x.sent_24h)+'</td></tr>').join('')||'<tr><td colspan="3">Sem publicações AliExpress.</td></tr>';
  const sku=q.skuDetailPermission||{};
  if(sku.status==='PERMISSION_REQUIRED')$('aeSkuPermission').textContent='⚠️ Variações (cor/tamanho/versão): permissão SKU Detail não liberada na App Key. A captura normal continua ativa; o Radar não repetirá chamadas negadas. Libere o escopo no portal AliExpress e execute a auditoria para reativar.';
  else if(sku.status==='ACTIVE')$('aeSkuPermission').textContent='Variações SKU habilitadas. '+num(q.productsWithChoices)+' produtos com opções e '+num(q.choiceOptionsCaptured)+' opções capturadas.';
  else $('aeSkuPermission').textContent='Permissão de consulta SKU ainda não testada. Produtos-base continuam sendo capturados normalmente.';
  status.textContent='Atualizado em '+date(data.generatedAt)+' · '+num(w.runs)+' execuções nas últimas 24h · '+num(w.api_calls)+' chamadas de API · '+num(w.records_upserted)+' registros persistidos. Catálogo de '+num(data.capture?.keywordCatalogSize)+' termos; '+num(data.capture?.keywordsTracked)+' já observados. Cupons: '+num(promos.coupons?.coupon_codes)+'; campanhas: '+num(promos.campaigns)+'.';
 }catch(error){status.textContent=error.message||'Não foi possível carregar as métricas AliExpress.';}
}
async function loadShopeeIntelligence(){
 const status=$('shopeeIntelligenceStatus');if(!status)return;status.textContent='Atualizando inteligência Shopee…';
 try{
  const response=await fetch('/api/affiliate/shopee-intelligence',{credentials:'same-origin',headers:{accept:'application/json'}});
  const data=await response.json();if(!response.ok)throw Error(data.error||'Falha ao consultar inteligência Shopee.');
  const s=data.summary||{};
  $('shopeeProducts').textContent=num(s.productsObserved);
  $('shopeeAverageSales').textContent=s.averageSales==null?'—':num(s.averageSales);
  $('shopeeMedianSales').textContent=s.medianSales==null?'—':num(s.medianSales);
  $('shopeeAverageRating').textContent=s.averageRating==null?'—':String(s.averageRating).replace('.',',')+'/5';
  const row=(x,second,third)=>'<tr><td><b>'+esc(x.title)+'</b>'+(x.isOfficialShop?'<div class="small">🏬 Loja oficial</div>':'')+'<div class="small">'+esc(x.category||'Sem categoria')+'</div></td><td>'+second+'</td><td>'+third+'</td></tr>';
  $('shopeeBestSellers').innerHTML=data.rankings.bestSellers.map(x=>row(x,num(x.sales),x.rating==null?'—':String(x.rating).replace('.',',')+'/5')).join('')||'<tr><td colspan="3">Sem dados de vendas.</td></tr>';
  $('shopeeBestRated').innerHTML=data.rankings.bestRated.map(x=>row(x,x.rating==null?'—':String(x.rating).replace('.',',')+'/5',x.sales==null?'—':num(x.sales))).join('')||'<tr><td colspan="3">Sem avaliações disponíveis.</td></tr>';
  $('shopeeOfficialStores').innerHTML=(data.rankings.officialStores||[]).map(x=>row(x,x.rating==null?'—':String(x.rating).replace('.',',')+'/5',x.sales==null?'—':num(x.sales))).join('')||'<tr><td colspan="3">Aguardando identificação de lojas oficiais pela API.</td></tr>';
  $('shopeeRising').innerHTML=data.rankings.rising.map(x=>row(x,(x.salesGrowth7dPercent>0?'+':'')+String(x.salesGrowth7dPercent).replace('.',',')+'%',x.sales==null?'—':num(x.sales))).join('')||'<tr><td colspan="3">Aguardando snapshots de pelo menos 7 dias.</td></tr>';
  $('shopeeBestOpportunities').innerHTML=data.rankings.bestOpportunities.map(x=>row(x,x.confidence+'% · '+x.score+'/100',x.sales==null?'—':num(x.sales))).join('')||'<tr><td colspan="3">Sem dados suficientes.</td></tr>';
  $('shopeeCategoryAverages').innerHTML=data.categoryAverages.map(x=>'<tr><td>'+esc(x.category)+'</td><td>'+num(x.products)+'</td><td>'+(x.averageSales==null?'—':num(x.averageSales))+'</td><td>'+(x.medianSales==null?'—':num(x.medianSales))+'</td><td>'+(x.averageRating==null?'—':String(x.averageRating).replace('.',',')+'/5')+'</td></tr>').join('')||'<tr><td colspan="5">Aguardando produtos categorizados.</td></tr>';
  status.textContent='Atualizado em '+date(data.generatedAt)+'. '+num(s.productsWithSales)+' produtos com vendas; '+num(s.productsWithRating)+' com nota média; '+num(s.officialShopProducts)+' identificados como Shopee Mall oficial. Reviews: quantidade não fornecida pela API. Pesos: nota 55%, vendas 30%, crescimento 15%. '+(s.snapshots?num(s.snapshots)+' snapshots armazenados.':'Snapshots serão acumulados nas próximas coletas.');
 }catch(error){status.textContent=error.message||'Não foi possível carregar os rankings.';}
}
$('refreshShopeeIntelligence')?.addEventListener('click',loadShopeeIntelligence);
$('refreshAliExpressMetrics')?.addEventListener('click',loadAliExpressMetrics);
const explorerFields=['productOfferV2','shopOfferV2','shopeeOfferV2','conversionReport','validatedReport','listItemFeeds','getItemFeedData','generateShortLink','generateBatchShortLink'];
let shopeeCategoryItems=[];
function renderShopeeCategories(){
 const select=$('shopeeCategorySelect'),filter=String($('shopeeCategorySearch')?.value||'').trim().toLocaleLowerCase('pt-BR');if(!select)return;
 const matches=shopeeCategoryItems.filter(x=>!filter||x.fullName.toLocaleLowerCase('pt-BR').includes(filter)||String(x.categoryId).includes(filter));
 select.innerHTML='<option value="">Selecione uma categoria ('+matches.length+')</option>'+matches.map(x=>'<option value="'+esc(x.categoryId)+'">'+esc(x.fullName)+' · ID '+esc(x.categoryId)+'</option>').join('');
}
async function loadShopeeCategories(){
 const button=$('loadShopeeCategories'),status=$('shopeeCategoryStatus');if(button)button.disabled=true;if(status)status.textContent='Consultando o catálogo Seller Center e percorrendo as páginas…';
 try{
  const response=await fetch('/api/shopee/categories?all=true&size=100',{credentials:'same-origin',headers:{accept:'application/json'}});
  const data=await response.json();if(!response.ok)throw Error(data.error||'Falha ao consultar o catálogo.');
  shopeeCategoryItems=Array.isArray(data.items)?data.items:[];
  renderShopeeCategories();
  $('shopeeCategoryCount').textContent=num(data.categories)+' categorias únicas';
  status.textContent=num(data.categories)+' categorias/subcategorias únicas extraídas de '+num(data.catalogEntries)+' entradas do Seller Center; '+num(data.totalCatalogEntries)+' entradas informadas pela Shopee; '+(data.complete?'catálogo completo.':'carga parcial — consulte novamente.');
  $('testShopeeCategory').disabled=!shopeeCategoryItems.length;
  $('validateShopeeCategoryBatch').disabled=!shopeeCategoryItems.length;
  await loadShopeeCategoryValidation();
  $('shopeeExplorerResult').textContent=JSON.stringify({source:data.source,categories:data.categories,catalogEntries:data.catalogEntries,totalCatalogEntries:data.totalCatalogEntries,pages:data.pages,complete:data.complete,idType:data.idType,note:data.note},null,2);
 }catch(error){status.textContent=error.message||'Falha ao carregar categorias Shopee.';}finally{if(button)button.disabled=false;}
}
$('loadShopeeCategories')?.addEventListener('click',loadShopeeCategories);
$('shopeeCategorySearch')?.addEventListener('input',renderShopeeCategories);
$('shopeeCategorySelect')?.addEventListener('change',event=>{const id=event.target.value;$('shopeeCategoryId').value=id;$('shopeeOperation').value='productOfferV2';updateShopeeExplorerFields();});
$('testShopeeCategory')?.addEventListener('click',async()=>{
 const id=String($('shopeeCategorySelect')?.value||'').trim(),status=$('shopeeCategoryStatus'),button=$('testShopeeCategory');
 if(!/^\d+$/.test(id)){status.textContent='Selecione uma categoria antes de testar.';return;}
 button.disabled=true;status.textContent='Testando productCatId '+id+' na Open API de Afiliados (somente leitura)…';
 try{
  const response=await fetch('/api/integrations/shopee',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify({action:'offers',kind:'product',productCatId:id,page:1,limit:1,sortType:2,listType:0})});
  const data=await response.json();$('shopeeExplorerResult').textContent=JSON.stringify({httpStatus:response.status,categoryId:id,...data},null,2);
  if(!response.ok)throw Error(data.error||'A API não aceitou o filtro.');
  const matched=(data.items||[]).filter(item=>Array.isArray(item.productCatIds)&&item.productCatIds.map(String).includes(id)).length;
  status.textContent=matched>0?'ID confirmado na API de afiliados: '+matched+' produto(s) da amostra retornaram o próprio ID '+id+' em productCatIds.':'A consulta GraphQL foi aceita, mas a amostra não comprovou produtos com o ID '+id+'. Resultado inconclusivo; não marque este ID como confirmado.';
 }catch(error){status.textContent='Falha na validação do ID '+id+': '+(error.message||'erro não identificado')+'. O ID continua no catálogo Seller Center, mas não será tratado como confirmado na API de afiliados.';}finally{button.disabled=false;}
});
let shopeeCategoryValidation={};
async function loadShopeeCategoryValidation(){
 try{
  const response=await fetch('/api/integrations/shopee',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify({action:'category_validation_status'})});
  const data=await response.json();if(!response.ok)throw Error(data.error||'Falha ao carregar validações.');
  shopeeCategoryValidation=Object.fromEntries((data.items||[]).map(row=>[String(row.category_id),row]));
  const summary=data.summary||{},confirmed=Number(summary.CONFIRMED)||0,empty=Number(summary.ACCEPTED_EMPTY)||0,rejected=Number(summary.REJECTED)||0,errors=(Number(summary.ERROR)||0)+(Number(summary.RATE_LIMITED)||0);
  $('shopeeCategoryValidationSummary').textContent=confirmed+' confirmadas · '+empty+' aceitas sem correspondência · '+rejected+' rejeitadas · '+errors+' pendentes/limite';
  $('shopeeCategoryValidationDetails').textContent='IDs testados: '+num(data.total||0)+'. Só CONFIRMED entra como categoria comprovada. ACCEPTED_EMPTY não comprova correspondência; erros e limites podem ser reprocessados.';
  updateShopeeCategoryBatchButton();
 }catch(error){$('shopeeCategoryValidationSummary').textContent='Validações indisponíveis';$('shopeeCategoryValidationDetails').textContent=error.message||'Não foi possível recuperar os resultados.';}
}
function shopeeCategoryAlreadySettled(item){
 const saved=shopeeCategoryValidation[String(item.categoryId)]||{},state=saved.validation_status;
 if(['CONFIRMED','ACCEPTED_EMPTY','REJECTED'].includes(state))return true;
 if(state==='RATE_LIMITED'&&saved.last_checked_at&&Date.now()-new Date(saved.last_checked_at).getTime()<15*60*1000)return true;
 return false;
}
function updateShopeeCategoryBatchButton(){
 const button=$('validateShopeeCategoryBatch');if(!button)return;
 const remaining=shopeeCategoryItems.filter(item=>!shopeeCategoryAlreadySettled(item));
 button.disabled=!remaining.length;
 button.textContent=remaining.length?'Validar próximo lote (até 3) · '+num(remaining.length)+' restantes':'Lote concluído · sem categorias pendentes';
}
async function validateNextShopeeCategoryBatch(){
 const button=$('validateShopeeCategoryBatch'),status=$('shopeeCategoryStatus');if(button.disabled)return;
 const batch=shopeeCategoryItems.filter(item=>!shopeeCategoryAlreadySettled(item)).slice(0,3);
 if(!batch.length){status.textContent='Não há categorias pendentes neste lote.';updateShopeeCategoryBatchButton();return;}
 button.disabled=true;status.textContent='Validando '+batch.length+' IDs na API de afiliados. Consultas somente leitura; sem publicação.';
 try{
  const response=await fetch('/api/integrations/shopee',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify({action:'category_validate_batch',categories:batch.map(item=>({categoryId:item.categoryId,name:item.name,fullName:item.fullName,level:item.level}))})});
  const data=await response.json();if(!response.ok)throw Error(data.error||'A API não concluiu o lote.');
  for(const row of data.results||[])shopeeCategoryValidation[String(row.categoryId)]={category_id:String(row.categoryId),validation_status:row.status,matched_count:row.matchedCount||0,sample_count:row.sampleCount||0,last_error:row.error||''};
  const counts=data.totals||{};
  status.textContent='Lote processado: '+(counts.CONFIRMED||0)+' confirmadas, '+(counts.ACCEPTED_EMPTY||0)+' aceitas sem correspondência, '+(counts.REJECTED||0)+' rejeitadas, '+((counts.ERROR||0)+(counts.RATE_LIMITED||0))+' erros/limites. '+(data.note||'');
  $('shopeeExplorerResult').textContent=JSON.stringify(data,null,2);
  await loadShopeeCategoryValidation();
  await loadShopeeAudit();
 }catch(error){status.textContent=error.message||'Falha ao validar categorias.';await loadShopeeCategoryValidation();}
 finally{updateShopeeCategoryBatchButton();}
}
$('validateShopeeCategoryBatch')?.addEventListener('click',validateNextShopeeCategoryBatch);
function updateShopeeExplorerFields(){const op=$('shopeeOperation')?.value;document.querySelectorAll('.explorer-field').forEach(el=>{const visible=(el.dataset.for||'').split(',').includes(op);el.hidden=!visible;});const persist=$('shopeePersist');if(persist)persist.checked=false;}
$('shopeeOperation')?.addEventListener('change',updateShopeeExplorerFields);updateShopeeExplorerFields();
function explorerValue(id){return String($(id)?.value||'').trim();}
async function runShopeeExplorer(){
 const op=explorerValue('shopeeOperation'),button=$('runShopeeExplorer'),status=$('shopeeExplorerStatus'),out=$('shopeeExplorerResult');
 if(!explorerFields.includes(op))return;
 const n=id=>Number(explorerValue(id)||0),payload={};
 if(['productOfferV2','shopOfferV2','shopeeOfferV2'].includes(op)){
  payload.action='offers';payload.kind=op==='productOfferV2'?'product':op==='shopOfferV2'?'shop':'shopee';
  payload.keyword=explorerValue('shopeeKeyword')||'ofertas';payload.page=Math.max(1,n('shopeePage')||1);payload.limit=Math.min(500,Math.max(1,n('shopeeLimit')||50));payload.sortType=n('shopeeSort')||2;
  if(op==='productOfferV2'){payload.listType=n('shopeeListType');if(/^\d+$/.test(explorerValue('shopeeCategoryId')))payload.productCatId=explorerValue('shopeeCategoryId');if(/^\d+$/.test(explorerValue('shopeeShopId')))payload.shopId=explorerValue('shopeeShopId');if(/^\d+$/.test(explorerValue('shopeeItemId')))payload.itemId=explorerValue('shopeeItemId');if($('shopeeAms').checked)payload.isAMSOffer=true;if($('shopeeKeySeller').checked)payload.isKeySeller=true;}
  if(op==='shopOfferV2'){const types=explorerValue('shopeeShopType');if(types)payload.shopType=types.split(',').map(Number);if($('shopeeKeySeller').checked)payload.isKeySeller=true;}
  if($('shopeePersist').checked){
   if(payload.productCatId&&shopeeCategoryValidation[String(payload.productCatId)]?.validation_status!=='CONFIRMED'){status.textContent='Para persistir uma coleta por categoria, primeiro confirme o ID na API usando a validação gradual. A consulta sem persistência continua disponível.';return;}
   payload.persistDiscovery=true;payload.maxPages=3;
  }
 }else if(op==='conversionReport'){
  payload.action='conversions';payload.limit=Math.min(100,Math.max(1,n('shopeeLimit')||50));payload.maxPages=1;payload.syncToLedger=false;
  if(explorerValue('shopeeStartDate'))payload.startDate=explorerValue('shopeeStartDate');if(explorerValue('shopeeEndDate'))payload.endDate=explorerValue('shopeeEndDate');if(explorerValue('shopeeScrollId'))payload.scrollId=explorerValue('shopeeScrollId');if(explorerValue('shopeeOrderStatus'))payload.orderStatus=explorerValue('shopeeOrderStatus');if(explorerValue('shopeeBuyerType'))payload.buyerType=explorerValue('shopeeBuyerType');if(explorerValue('shopeeDevice'))payload.device=explorerValue('shopeeDevice');
 }else if(op==='validatedReport'){
  payload.action='validated';payload.limit=Math.min(100,Math.max(1,n('shopeeLimit')||50));payload.validationId=explorerValue('shopeeValidationId');if(explorerValue('shopeeScrollId'))payload.scrollId=explorerValue('shopeeScrollId');
 }else if(op==='listItemFeeds'){payload.action='feeds';if(explorerValue('shopeeFeedMode'))payload.feedMode=explorerValue('shopeeFeedMode');}
 else if(op==='getItemFeedData'){payload.action='feed_data';payload.datafeedId=explorerValue('shopeeDatafeedId');payload.offset=Math.max(0,n('shopeeOffset'));payload.limit=Math.min(500,Math.max(1,n('shopeeLimit')||100));}
 else if(op==='generateShortLink'){payload.action='create_link';payload.originUrl=explorerValue('shopeeOriginUrl');payload.subIds=explorerValue('shopeeSubIds');}
 else if(op==='generateBatchShortLink'){const urls=explorerValue('shopeeBatchUrls').split(/\\r?\\n/).map(x=>x.trim()).filter(Boolean).slice(0,20);payload.action='batch_links';payload.subIds=explorerValue('shopeeSubIds');payload.items=urls.map(originUrl=>({originUrl}));}
 if(op==='validatedReport'&&!/^\d{1,18}$/.test(payload.validationId||'')){status.textContent='Informe um Validation ID numérico válido.';return;}
 if(op==='getItemFeedData'&&!payload.datafeedId){status.textContent='Informe o Datafeed ID retornado por listItemFeeds.';return;}
 if(op==='generateBatchShortLink'&&!payload.items.length){status.textContent='Informe pelo menos uma URL Shopee.';return;}
 if(op==='generateShortLink'&&!payload.originUrl){status.textContent='Informe a URL original Shopee.';return;}
 if(op==='conversionReport'&&payload.startDate&&payload.endDate&&payload.endDate<payload.startDate){status.textContent='A data final não pode ser anterior à inicial.';return;}
 const writes=op.startsWith('generate');if(writes&&!window.confirm(op==='generateShortLink'?'A Shopee vai criar um link de afiliado para a URL informada. Continuar?':'A Shopee vai criar links de afiliado para até 20 URLs. Continuar?'))return;
 button.disabled=true;status.textContent='Executando '+op+' na API Shopee…';out.textContent='Aguardando resposta…';
 try{const response=await fetch('/api/integrations/shopee',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify(payload)});const data=await response.json();out.textContent=JSON.stringify({httpStatus:response.status,operation:op,...data},null,2);if(!response.ok)throw Error(data.error||'A API Shopee recusou a operação.');status.textContent='Concluído: '+op+'. '+(data.items?.length??data.itemsReturned??0)+' registro(s) retornado(s). '+(data.publicationEnabled===false||data.published===false?'Nenhuma oferta foi publicada.':'');await load();await loadShopeeAudit();if(op==='productOfferV2'||op==='shopOfferV2'||op==='shopeeOfferV2')await loadCompetition();}catch(error){status.textContent=error.message||'Falha ao executar a operação.';}finally{button.disabled=false;}
}
async function loadShopeeAudit(){const body=$('shopeeAuditRows');if(!body)return;try{const r=await fetch('/api/integrations/shopee',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify({action:'audit_history'})});const d=await r.json();if(!r.ok)throw Error(d.error||'Falha ao carregar histórico');body.innerHTML=(d.items||[]).map(x=>'<tr><td>'+esc(x.operation)+'</td><td><span class="pill">'+esc(x.status)+'</span></td><td>'+num(x.returned_count)+'</td><td>'+num(x.page_count)+'</td><td>'+esc(date(x.checked_at))+'</td></tr>').join('')||'<tr><td colspan="5">Nenhuma execução registrada.</td></tr>';}catch(error){body.innerHTML='<tr><td colspan="5">'+esc(error.message)+'</td></tr>';}}
$('runShopeeExplorer')?.addEventListener('click',runShopeeExplorer);
$('refreshShopeeAudit')?.addEventListener('click',loadShopeeAudit);
$('clearShopeeExplorer')?.addEventListener('click',()=>{['shopeeKeyword','shopeeCategoryId','shopeeShopId','shopeeItemId','shopeeScrollId','shopeeValidationId','shopeeDatafeedId','shopeeOriginUrl','shopeeSubIds','shopeeBatchUrls','shopeeStartDate','shopeeEndDate'].forEach(id=>{if($(id))$(id).value='';});$('shopeePage').value='1';$('shopeeLimit').value='50';$('shopeeOffset').value='0';$('shopeePersist').checked=false;$('shopeeAms').checked=false;$('shopeeKeySeller').checked=false;$('shopeeExplorerResult').textContent='Parâmetros limpos.';$('shopeeExplorerStatus').textContent='Pronto para consultar.';});
loadShopeeAudit();
const operations={
 lomadee:{label:'Auditoria Lomadee',path:'/api/integrations/lomadee-explorer',body:{action:'audit'},confirm:'Consultar seis recursos Lomadee. A auditoria pode consumir até 12 chamadas, respeitando a cota reportada. Somente leitura; sem publicações.'},
 aliexpress:{label:'Auditoria AliExpress',path:'/api/integrations/aliexpress',body:{action:'audit'},confirm:'Executar auditoria somente leitura do AliExpress. Pode consumir até 11 chamadas e a API é legada/descontinuada na documentação. Continuar?'},
 'lomadee-catalog':{label:'Persistir catálogo Lomadee',path:'/api/integrations/lomadee-explorer',body:{action:'sync_catalog',startPage:1,maxPages:10},confirm:'Consultar e persistir até 10 páginas de produtos, marcas, canais e campanhas Lomadee. Pode consumir até 31 chamadas. Somente leitura; nenhuma oferta será criada/publicada.'},
 'aliexpress-products':{label:'Persistir produtos AliExpress',path:'/api/integrations/aliexpress',body:{action:'products',page:1,pageSize:50,maxPages:3,persistDiscovery:true},confirm:'Consultar e persistir até três páginas de 50 produtos AliExpress por lote. A continuação fica disponível no mesmo botão. API Affiliate legada; somente leitura e sem publicação.'},
 'aliexpress-campaigns':{label:'Persistir campanhas AliExpress',path:'/api/integrations/aliexpress',body:{action:'campaigns',persistDiscovery:true},confirm:'Consultar e persistir campanhas AliExpress. A API Affiliate é legada; somente leitura e sem publicação.'},
 'aliexpress-categories':{label:'Persistir categorias AliExpress',path:'/api/integrations/aliexpress',body:{action:'categories',persistDiscovery:true},confirm:'Consultar e persistir categorias AliExpress. A API Affiliate é legada; somente leitura e sem publicação.'},
 'shopee-products':{label:'Produtos Shopee',path:'/api/integrations/shopee',body:{action:'offers',kind:'product',page:1,limit:100,maxPages:3,persistDiscovery:true},confirm:'Consultar e persistir até três páginas de produtos Shopee por lote. A continuação fica disponível no mesmo botão. Somente leitura.'},
 'shopee-shops':{label:'Lojas Shopee',path:'/api/integrations/shopee',body:{action:'offers',kind:'shop',page:1,limit:100,maxPages:3,persistDiscovery:true},confirm:'Consultar e persistir até três páginas de lojas Shopee por lote. A continuação fica disponível no mesmo botão. Somente leitura.'},
 'shopee-campaigns':{label:'Campanhas Shopee',path:'/api/integrations/shopee',body:{action:'offers',kind:'shopee',page:1,limit:100,maxPages:3,persistDiscovery:true},confirm:'Consultar e persistir até três páginas de campanhas Shopee por lote. A continuação fica disponível no mesmo botão. Somente leitura.'},
 'shopee-feeds':{label:'Feeds Shopee',path:'/api/integrations/shopee',body:{action:'feeds'},confirm:'Consultar os feeds FULL e DELTA da Shopee (duas chamadas). Somente leitura.'},
 'shopee-conversions':{label:'Sincronizar conversões Shopee',path:'/api/integrations/shopee',body:{action:'conversions',limit:100,maxPages:3,syncToLedger:true},confirm:'Consultar até 100 conversões dos últimos sete dias e registrar pedidos/comissões no livro de vendas do Radar. Somente leitura na API; nenhum dado pessoal será armazenado.'},
 'lomadee-sales':{label:'Sincronizar pedidos Lomadee',path:'/api/integrations/lomadee',body:{action:'sync_orders',page:1,limit:100,maxPages:2},confirm:'A sincronização lê até 2 páginas por chamada e oferece continuação sem perder o período. Consultar pedidos dos últimos sete dias e registrar valores/comissões no Radar. A consulta oficial verificará se a credencial tem acesso a pedidos; validar produtos não comprova esse escopo. Nenhuma oferta será publicada.'},
 'aliexpress-sales':{label:'Sincronizar pedidos AliExpress',path:'/api/integrations/aliexpress',body:{action:'syncOrders',page:1,pageSize:50,maxPages:3},confirm:'Consultar a primeira página de pedidos AliExpress dos últimos sete dias e registrar valores/comissões no Radar. A API é legada; nenhuma oferta será publicada.'}
};
async function runOperation(key,button){const op=operations[key];if(!op)return;if(!window.confirm(op.confirm))return;const buttons=[...document.querySelectorAll('[data-op]')];buttons.forEach(b=>b.disabled=true);$('operationResult').textContent='Executando '+op.label+'…';try{let result;if(key==='shopee-feeds'){const full=await fetch(op.path,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({action:'feeds',feedMode:'FULL'})});const fullBody=await full.json();const delta=await fetch(op.path,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({action:'feeds',feedMode:'DELTA'})});const deltaBody=await delta.json();result={full:{httpStatus:full.status,...fullBody},delta:{httpStatus:delta.status,...deltaBody},readOnly:true};}else{const requestBody={...op.body,...(continuations[key]||{})};if(key==='shopee-products'){requestBody.keyword=String($('catalogKeyword')?.value||'').trim()||'ofertas';requestBody.categorySlug=String($('catalogCategory')?.value||'');}const pageValue=Math.max(1,Math.min(1000,Number($('catalogPage')?.value)||1));if(!continuations[key]&&Object.prototype.hasOwnProperty.call(requestBody,'page'))requestBody.page=pageValue;if(key==='lomadee-catalog')requestBody.startPage=pageValue;const response=await fetch(op.path,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(requestBody)});result={httpStatus:response.status,...await response.json()};if(!response.ok)throw Error(result.error||'A API recusou a operação.');if(key==='aliexpress-sales'&&result.nextPage)continuations[key]={page:result.nextPage,startTime:result.startTime,endTime:result.endTime};else if(key==='lomadee-sales'&&result.nextPage)continuations[key]={page:result.nextPage,from:result.from,to:result.to};else if(key==='shopee-conversions'&&result.nextScrollId)continuations[key]={scrollId:result.nextScrollId,startDate:result.startDate,endDate:result.endDate};else if(['aliexpress-products','shopee-products','shopee-shops','shopee-campaigns'].includes(key)&&result.nextPage)continuations[key]={page:result.nextPage};else delete continuations[key];const activeButton=document.querySelector('[data-op="'+key+'"]');if(activeButton)activeButton.textContent=continuations[key]?(op.label+' · Continuar'):(op.label);}$('operationResult').textContent=JSON.stringify(result,null,2);await load();await loadCompetition();await loadShopeeIntelligence();await loadAliExpressMetrics();}catch(error){$('operationResult').textContent=op.label+' — '+(error.message||'Falha na consulta.');}finally{buttons.forEach(b=>b.disabled=false);}}
document.addEventListener('click',event=>{const button=event.target.closest('[data-op]');if(button)runOperation(button.dataset.op,button);});
async function loadCompetition(){
 const status=$('competitionStatus'),body=$('competitionRows'),select=$('compProductSelect');if(!status||!body)return;
 status.textContent='Consultando observações…';
 try{
  const response=await fetch('/api/affiliate/competition',{credentials:'same-origin',headers:{accept:'application/json'}});
  const data=await response.json();if(!response.ok)throw Error(data.error||'Falha ao carregar concorrência.');
  const products=[...data.products].sort((a,b)=>(b.opportunityScore??-1)-(a.opportunityScore??-1));
  if(select){const current=select.value;select.innerHTML='<option value="">Escolher produto do catálogo Shopee…</option>'+products.map(x=>'<option value="'+esc(x.productId)+'">'+esc(x.title)+' · ID '+esc(x.productId)+'</option>').join('');if(products.some(x=>x.productId===current))select.value=current;}
  body.innerHTML=products.map(x=>{
   const statusLabel=x.competitionStatus==='NOT_OBSERVED'?'Não observado':x.competitionStatus==='STALE'?'Desatualizado':x.competitionStatus==='AGING'?'Revisar coleta':'Atual';
   const categoryLabel=competitionCategories[x.categorySlug]?.label||'Sem classificação';
   const growth=x.salesGrowthPercent==null?'—':(x.salesGrowthPercent>0?'+':'')+String(x.salesGrowthPercent).replace('.',',')+'%';
   const commission=x.commissionRate==null?'—':(x.commissionRate<=1?x.commissionRate*100:x.commissionRate).toFixed(1).replace('.',',')+'%';
   const link=/^https:\/\//i.test(x.productUrl||'')?'<a href="'+esc(x.productUrl)+'" target="_blank" rel="noopener noreferrer">Abrir produto</a>':'';
   return '<tr><td><b>'+esc(x.title)+'</b><div class="small">ID '+esc(x.productId)+' · '+link+'</div></td><td>'+esc(categoryLabel)+'<div class="small">'+esc(x.sourceKeyword||'')+'</div></td><td>'+money(x.priceCents)+'</td><td>'+num(x.sales)+'</td><td>'+commission+'</td><td>'+(x.creatorsPer50==null?'—':String(x.creatorsPer50).replace('.',','))+'</td><td>'+(x.videosPer50==null?'—':String(x.videosPer50).replace('.',','))+'</td><td>'+esc(statusLabel)+'</td><td><b>'+(x.opportunityScore==null?'Aguardando dados':num(x.opportunityScore)+'/100')+'</b></td><td>'+num(x.confidence)+'%</td><td>'+growth+'</td></tr>';
  }).join('')||'<tr><td colspan="11">Nenhum produto Shopee descoberto. Informe uma palavra-chave e use “Persistir produtos Shopee” na seção Explorador de recursos.</td></tr>';
 status.textContent=data.products.length+' produtos no radar. '+data.history.length+' observações registradas. '+data.limitations.join(' ');
 }catch(error){status.textContent=error.message||'Não foi possível carregar o radar de concorrência.';body.innerHTML='<tr><td colspan="7">Falha ao carregar.</td></tr>';}
}
$('competitionForm')?.addEventListener('submit',async event=>{
 event.preventDefault();const button=$('saveCompetition'),status=$('competitionStatus');button.disabled=true;status.textContent='Salvando observação…';
 try{
  const payload={productId:$('compProductId').value.trim(),title:$('compTitle').value.trim(),categorySlug:$('compCategory').value,searchTerm:$('compSearchTerm').value.trim(),resultsScanned:Number($('compSample').value),creatorsFound:Number($('compCreators').value),videosFound:Number($('compVideos').value),note:$('compNote').value.trim()};
  const response=await fetch('/api/affiliate/competition',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify(payload)});
  const data=await response.json();if(!response.ok)throw Error(data.error||'Não foi possível salvar.');
  status.textContent='Observação salva. '+data.note;
  $('competitionForm').reset();await loadCompetition();
 }catch(error){status.textContent=error.message||'Falha ao salvar observação.';}finally{button.disabled=false;}
});
$('compProductSelect')?.addEventListener('change',event=>{
 const selected=event.target.value;if(!selected)return;
 const option=event.target.selectedOptions[0],label=option?.textContent||'';
 $('compProductId').value=selected;
 $('compTitle').value=label.replace(/ · ID .*$/,'');
 if(!$('compSearchTerm').value)$('compSearchTerm').value=$('compTitle').value;
});
$('refresh').addEventListener('click',()=>{load();loadCompetition();loadShopeeIntelligence();loadAliExpressMetrics();});load();loadCompetition();loadShopeeIntelligence();loadAliExpressMetrics();