export function apiError(status,code) { return Object.assign(new Error(code),{status,code}); }
export function identifier(value) {
  if(typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(value)) throw apiError(400,'INVALID_ID');
  return value;
}
export function requireIdentity(req) {
  if(!req.user || typeof req.user.id !== 'string' || !req.user.id) throw apiError(401,'LOGIN_REQUIRED');
  return req.user.id;
}
export function ensureSameOrigin(req) {
  const origin=req.headers?.origin;
  if(origin && origin !== 'https://radar-promo-ofertas.hatchable.site' && origin !== 'https://radar-promo-ofertas-draft.hatchable.site') throw apiError(403,'ORIGIN_NOT_ALLOWED');
}
export function bodyText(value) {
  if(typeof value !== 'string' || !value.trim() || value.trim().length>2000) throw apiError(400,'INVALID_COMMENT');
  return value.trim();
}
export async function favorites(db,req) {
  const user=requireIdentity(req);
  if(req.method==='GET') return {favorites:(await db.query('SELECT offer_id AS "offerId",created_at AS "createdAt" FROM rpo_favorites WHERE user_id=$1 ORDER BY created_at DESC,offer_id LIMIT 100',[user])).rows};
  ensureSameOrigin(req);
  const offer=identifier(req.body?.offerId);
  if(req.method==='POST') {await db.query('INSERT INTO rpo_favorites(user_id,offer_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[user,offer]);return {ok:true};}
  if(req.method==='DELETE') {await db.query('DELETE FROM rpo_favorites WHERE user_id=$1 AND offer_id=$2',[user,offer]);return {ok:true};}
  throw apiError(405,'METHOD_NOT_ALLOWED');
}
export async function comments(db,req) {
  const user=requireIdentity(req);
  if(req.method==='GET') {
    // Same public page, restricted to the authenticated author; never expose author IDs.
    const result=await publicComments(db,req);
    const ids=result.comments.map(c=>c.id);
    const own=await db.query('SELECT id::text FROM rpo_comments WHERE user_id=$1 AND id::text=ANY($2::text[])',[user,ids]);
    const owned=new Set(own.rows.map(r=>r.id));
    return {comments:result.comments.filter(c=>owned.has(c.id))};
  }
  ensureSameOrigin(req);
  if(req.method==='POST') {
    const offer=identifier(req.body?.offerId),body=bodyText(req.body?.body);
    const reply=req.body?.replyToId==null?null:identifier(req.body.replyToId);
    // Atomic bounded posting window; locks only the same app user.
    const results=await db.transaction([
      {sql:'SELECT pg_advisory_xact_lock(hashtext($1))',params:[user]},
      {sql:`WITH added AS (
        INSERT INTO rpo_comments(user_id,offer_id,display_name,body)
        SELECT $1,$2,$3,$4 WHERE (SELECT count(*) FROM rpo_comments WHERE user_id=$1 AND created_at>now()-interval '1 minute')<5
        RETURNING id,user_id,offer_id
      ), alerted AS (
        INSERT INTO rpo_notifications(user_id,offer_id,title,body,dedupe_key)
        SELECT original.user_id,added.offer_id,'Responderam ao seu comentário',left($4,180),'reply:'||added.id::text
        FROM added JOIN rpo_comments original ON original.id::text=$5 AND original.offer_id=added.offer_id
        JOIN rpo_notification_preferences pref ON pref.user_id=original.user_id AND pref.enabled=true
        WHERE original.user_id<>added.user_id AND original.status='visible'
        ON CONFLICT(user_id,dedupe_key) DO NOTHING RETURNING id
      ) SELECT id FROM added`,params:[user,offer,String(req.user.name||'Participante').slice(0,60),body,reply]}
    ]);
    const r=Array.isArray(results)?results[1]:results.results?.[1];
    if(!r?.rows?.length) throw apiError(429,'COMMENT_RATE_LIMIT');
    return {ok:true,id:r.rows[0].id};
  }
  const id=identifier(req.body?.id);
  if(req.method==='PUT') {
    const body=bodyText(req.body?.body);
    const r=await db.query("UPDATE rpo_comments SET body=$1,updated_at=now() WHERE id::text=$2 AND user_id=$3 AND status='visible' RETURNING id",[body,id,user]);
    if(!r.rows.length) throw apiError(404,'COMMENT_NOT_FOUND');
    return {ok:true};
  }
  if(req.method==='DELETE') {
    const r=await db.query("UPDATE rpo_comments SET status='deleted',body='[removido]',updated_at=now() WHERE id::text=$1 AND user_id=$2 RETURNING id",[id,user]);
    if(!r.rows.length) throw apiError(404,'COMMENT_NOT_FOUND');
    return {ok:true};
  }
  throw apiError(405,'METHOD_NOT_ALLOWED');
}
export async function notifications(db,req) {
  const user=requireIdentity(req);
  if(req.method==='GET') {
    const prefs=await db.query('SELECT enabled FROM rpo_notification_preferences WHERE user_id=$1',[user]);
    const rows=await db.query('SELECT id,offer_id AS "offerId",title,body,created_at AS "createdAt",read_at AS "readAt" FROM rpo_notifications WHERE user_id=$1 ORDER BY created_at DESC,id DESC LIMIT 100',[user]);
    return {enabled:prefs.rows[0]?.enabled===true,pushConfigured:false,notifications:rows.rows};
  }
  ensureSameOrigin(req);
  if(req.method==='PUT') {
    if(typeof req.body?.enabled!=='boolean') throw apiError(400,'INVALID_PREFERENCE');
    await db.query('INSERT INTO rpo_notification_preferences(user_id,enabled) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET enabled=excluded.enabled,updated_at=now()',[user,req.body.enabled]);
    return {ok:true};
  }
  if(req.method==='POST') {
    await db.query('UPDATE rpo_notifications SET read_at=coalesce(read_at,now()) WHERE user_id=$1 AND id::text=$2',[user,identifier(req.body?.id)]);
    return {ok:true};
  }
  throw apiError(405,'METHOD_NOT_ALLOWED');
}

export async function votes(db,req){
  const user=requireIdentity(req),offer=identifier(req.method==='GET'?req.query?.offerId:req.body?.offerId);
  if(req.method==='GET'){
    const total=(await db.query('SELECT coalesce(sum(value),0)::int AS score,count(*)::int AS total FROM rpo_votes WHERE offer_id=$1',[offer])).rows[0];
    const mine=(await db.query('SELECT value FROM rpo_votes WHERE user_id=$1 AND offer_id=$2',[user,offer])).rows[0];
    return {...total,myVote:mine?.value||0};
  }
  ensureSameOrigin(req);
  if(req.method==='DELETE'){await db.query('DELETE FROM rpo_votes WHERE user_id=$1 AND offer_id=$2',[user,offer]);return {ok:true};}
  if(req.method!=='POST')throw apiError(405,'METHOD_NOT_ALLOWED');
  if(req.body?.value!==1&&req.body?.value!==-1)throw apiError(400,'INVALID_VOTE');
  await db.query('INSERT INTO rpo_votes(user_id,offer_id,value) VALUES($1,$2,$3) ON CONFLICT(user_id,offer_id) DO UPDATE SET value=excluded.value,updated_at=now()',[user,offer,req.body.value]);
  return {ok:true};
}
export async function publicComments(db,req){
  const offer=identifier(req.query?.offerId);
  const page=Number(req.query?.page||1);
  if(!Number.isSafeInteger(page)||page<1||page>10000)throw apiError(400,'INVALID_PAGE');
  const rows=(await db.query("SELECT id,offer_id AS \"offerId\",display_name AS \"displayName\",body,created_at AS \"createdAt\",updated_at AS \"updatedAt\" FROM rpo_comments WHERE offer_id=$1 AND status='visible' ORDER BY created_at DESC,id DESC LIMIT 31 OFFSET $2",[offer,(page-1)*30])).rows;
  return {page,hasMore:rows.length>30,comments:rows.slice(0,30)};
}
