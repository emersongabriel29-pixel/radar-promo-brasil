import {request, message, offerIdentifier, communityPath} from './community-client.js';
const $ = id => document.getElementById(id);
const query = new URLSearchParams(location.search);
const section = ['account','offer','inbox'].includes(query.get('section')) ? query.get('section') : 'account';
let user = null, offerId, page = 1, mine = new Map(), myVote = 0, saved = false, editing = null, replying = null, busy = false;
const node = (tag, text) => {const e=document.createElement(tag);e.textContent=String(text ?? '');return e;};
const say = (text, error=false) => {$('status').textContent=text;$('status').dataset.error=String(error);};
const action = (text, fn) => {const b=node('button',text);b.type='button';b.onclick=()=>run(fn);return b;};
const date = value => {const d=new Date(value);return Number.isNaN(d.getTime())?'':d.toLocaleString('pt-BR');};
function loginLink() {
  $('login').href='/login?next='+encodeURIComponent(location.pathname+location.search);
  $('login').hidden=false;
}
function clearPrivate() {
  user=null;mine.clear();$('identity').textContent='';$('favorites').replaceChildren();$('notifications').replaceChildren();
  for (const id of ['account','inbox','voting','comment-form','logout']) $(id).hidden=true;
}
async function run(fn) {
  if (busy) return;
  busy=true;
  const controls=[...document.querySelectorAll('button')].map(b=>[b,b.disabled]);
  for (const [b] of controls) b.disabled=true;
  try {await fn();}
  catch(error) {if(error.status===401){clearPrivate();loginLink();}say(message(error),true);}
  finally {for (const [b,disabled] of controls) b.disabled=disabled;busy=false;}
}
function resetEditor() {
  editing=null;replying=null;$('body').value='';$('context').textContent='';$('cancel').hidden=true;$('send').textContent='Comentar';
}
async function loadComments(append=false) {
  const data=await request('/api/comments?offerId='+encodeURIComponent(offerId)+'&page='+page);
  if (user) {
    const own=await request('/api/comments/manage?offerId='+encodeURIComponent(offerId)+'&page='+page);
    if (!append) mine.clear();
    for (const c of own.comments) mine.set(c.id,c);
  }
  if (!append) $('comments').replaceChildren();
  for (const c of data.comments) {
    const li=node('li','');li.append(node('strong',c.displayName),node('p',c.body),node('small',date(c.createdAt)));
    const actions=node('div','');actions.className='actions';
    if (user && mine.has(c.id)) {
      actions.append(action('Editar',()=>{resetEditor();editing=c.id;$('body').value=c.body;$('context').textContent='Editando seu comentário';$('send').textContent='Salvar comentário';$('cancel').hidden=false;$('body').focus();}));
      actions.append(action('Excluir',async()=>{if(!confirm('Excluir este comentário?'))return;await request('/api/comments/manage',{method:'DELETE',body:{id:c.id}});resetEditor();page=1;await loadComments();say('Comentário excluído.');}));
    } else if (user) {
      actions.append(action('Responder',()=>{resetEditor();replying=c.id;$('context').textContent='Respondendo a '+c.displayName;$('cancel').hidden=false;$('body').focus();}));
    }
    li.append(actions);$('comments').append(li);
  }
  $('more').hidden=!data.hasMore;
  $('comments-status').textContent=$('comments').children.length?'':'Nenhum comentário nesta oferta.';
}
async function loadVotes() {
  const data=await request('/api/votes?offerId='+encodeURIComponent(offerId));myVote=data.myVote;
  $('score').textContent=`${data.score} pontos · ${data.total} votos`;
  $('up').setAttribute('aria-pressed',String(myVote===1));$('down').setAttribute('aria-pressed',String(myVote===-1));
}
async function loadSaved() {
  const data=await request('/api/favorites');saved=data.favorites.some(f=>f.offerId===offerId);
  $('favorite').setAttribute('aria-pressed',String(saved));$('favorite').textContent=saved?'Remover da conta':'Salvar na conta';
  return data.favorites;
}
async function loadInbox() {
  const data=await request('/api/notifications');$('enabled').checked=data.enabled;$('notifications').replaceChildren();
  for (const item of data.notifications) {
    const li=node('li','');li.append(node('strong',item.title),node('p',item.body),node('small',date(item.createdAt)));
    if(item.offerId){const link=node('a','Ver conversa');link.href=communityPath(item.offerId);li.append(node('p',''),link);}
    if(!item.readAt)li.append(action('Marcar como lida',async()=>{await request('/api/notifications',{method:'POST',body:{id:item.id}});await loadInbox();say('Aviso marcado como lido.');}));
    else li.append(node('p','Lida'));
    $('notifications').append(li);
  }
  if(!data.notifications.length)$('notifications').append(node('li','Nenhum aviso nesta conta.'));
}
async function load() {
  clearPrivate();$('comments').replaceChildren();$('login').hidden=true;$('offer').hidden=true;page=1;
  say('Conectando…');
  const auth=window.hatchable?.auth;
  if(!auth)throw new Error('AUTH_UNAVAILABLE');
  const session=await auth.getSession();user=session?.user||null;
  if(user)$('logout').hidden=false;else loginLink();
  $('heading').textContent={account:'Minha conta',offer:'Conversa da oferta',inbox:'Notificações'}[section];
  if(section==='offer') {
    offerId=offerIdentifier(query.get('offerId'));$('offer').hidden=false;
    const data=await request('/api/offers/'+encodeURIComponent(offerId));$('offer-title').textContent=data.offer.title;
    // The form appears only after loading the authenticated view successfully.
    await loadComments();
    if(user){await loadVotes();await loadSaved();$('voting').hidden=false;$('comment-form').hidden=false;}
  } else if(user && section==='account') {
    const account=await request('/api/account');$('account').hidden=false;$('identity').textContent=account.name||account.email||'Conta conectada';
    const favorites=await loadSaved();
    for(const f of favorites){const li=node('li','');const link=node('a','Abrir oferta salva');link.href=communityPath(f.offerId);li.append(link,node('p',date(f.createdAt)));$('favorites').append(li);}
    if(!favorites.length)$('favorites').append(node('li','Nenhuma oferta salva na conta.'));
  } else if(user && section==='inbox') {await loadInbox();$('inbox').hidden=false;}
  say(user?'Conta conectada.':'Entre para votar, comentar e receber avisos.');
}
$('retry').onclick=()=>run(load);
$('logout').onclick=()=>run(async()=>{await window.hatchable.auth.signOut();resetEditor();await load();});
$('cancel').onclick=resetEditor;
$('more').onclick=()=>run(async()=>{const next=page+1;page=next;try{await loadComments(true);}catch(e){page=next-1;throw e;}});
for(const [id,value] of [['up',1],['down',-1]]) $(id).onclick=()=>run(async()=>{await request('/api/votes',{method:'POST',body:{offerId,value}});await loadVotes();say('Voto salvo.');});
$('unvote').onclick=()=>run(async()=>{await request('/api/votes',{method:'DELETE',body:{offerId}});await loadVotes();say('Voto retirado.');});
$('favorite').onclick=()=>run(async()=>{await request('/api/favorites',{method:saved?'DELETE':'POST',body:{offerId}});await loadSaved();say(saved?'Oferta salva na conta.':'Oferta removida da conta.');});
$('comment-form').onsubmit=e=>{e.preventDefault();run(async()=>{
  const body=$('body').value.trim();if(!body){$('body').focus();say('Escreva um comentário.',true);return;}
  await request('/api/comments/manage',{method:editing?'PUT':'POST',body:editing?{id:editing,body}:{offerId,body,...(replying?{replyToId:replying}:{})}});
  resetEditor();page=1;await loadComments();say('Comentário salvo.');
});};
$('save-preference').onclick=()=>run(async()=>{await request('/api/notifications',{method:'PUT',body:{enabled:$('enabled').checked}});say('Preferência salva.');});
run(load);
