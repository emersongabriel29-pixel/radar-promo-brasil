import {db,storage} from 'hatchable';
export const BACKUP_TABLES=['accounts','account_settings','account_security_settings','categories','marketplace_rules','promo_groups','whatsapp_connections','telegram_connections','storefront_settings','subscriptions','social_connections','monitors','queues','schedules','offers','offer_price_history','autopilot_rules','publications','click_events','lead_events','lead_costs','affiliate_sales','coupons','content_assets','growth_campaigns','marketplace_connections','account_integration_health','connector_credential_bindings','media_generation_jobs','social_autopilot_settings','social_posts','privacy_requests','security_events','messaging_compliance_events','activity_log','webhook_events'];
const MAX_BYTES=8*1024*1024;
export async function sha256(data){const bytes=await crypto.subtle.digest('SHA-256',data);return Array.from(new Uint8Array(bytes)).map(x=>x.toString(16).padStart(2,'0')).join('');}
function base64(data){let s='';for(const b of data)s+=String.fromCharCode(b);return btoa(s);}
export async function accountSnapshot(accountId,{portable=false,includeFiles=false}={}){
  const selects=BACKUP_TABLES.map(table=>`(SELECT COALESCE(jsonb_agg(to_jsonb(snapshot_row)),'[]'::jsonb) FROM (SELECT * FROM ${table} WHERE ${table==='accounts'?'id':'account_id'}=$1 LIMIT 10001) snapshot_row) AS ${table}`);
  const tables=(await db.query('SELECT '+selects.join(','),[accountId])).rows[0];
  if(!tables.accounts?.length)throw Object.assign(new Error('Conta não encontrada.'),{status:404});
  if(Object.values(tables).some(rows=>rows.length>10000))throw Object.assign(new Error('Volume acima do exportador da conta. Use a exportação completa da hospedagem.'),{status:413});
  const rowCounts=Object.fromEntries(Object.entries(tables).map(([k,v])=>[k,v.length]));
  if(portable){
    for(const rows of Object.values(tables))for(const row of rows)for(const key of Object.keys(row))if(/token|secret|verifier|password|credential/i.test(key))delete row[key];
    delete tables.connector_credential_bindings;
    for(const row of tables.webhook_events||[])delete row.response;
  }
  const files=[];
  if(includeFiles){
    const keys=new Set([...tables.offers,...tables.publications,...tables.social_posts].map(x=>x.image_storage_key).concat(tables.media_generation_jobs.map(x=>x.storage_key)).filter(Boolean));
    let bytes=0;
    for(const key of keys){
      const object=await storage.get(key),data=object.buffer instanceof Uint8Array?object.buffer:new Uint8Array(object.buffer);bytes+=data.byteLength;
      if(bytes>MAX_BYTES)throw Object.assign(new Error('Uploads acima de 8 MiB. Use a exportação completa da hospedagem.'),{status:413});
      files.push({key,contentType:object.contentType,sha256:await sha256(data),base64:base64(data)});
    }
  }
  return {format:'radar-account-backup',version:1,schemaVersion:20,scope:'ACCOUNT',accountId,createdAt:new Date().toISOString(),portable,rowCounts,tables,files,excluded:['platform identity','platform secrets','temporary OAuth states','scheduler tasks'],restorePolicy:'ISOLATED_DATABASE_ONLY'};
}
export async function createAccountBackup(accountId){
  const snapshot=await accountSnapshot(accountId,{includeFiles:true}),data=new TextEncoder().encode(JSON.stringify(snapshot));
  if(data.byteLength>16*1024*1024)throw Object.assign(new Error('Backup acima de 16 MiB. Use a exportação da hospedagem.'),{status:413});
  const id=crypto.randomUUID(),key='backups/'+accountId+'/'+id+'.json',hash=await sha256(data);
  await storage.put(key,data,'application/json');
  await db.query('INSERT INTO operational_backups(id,account_id,storage_key,sha256,bytes,row_counts) VALUES($1,$2,$3,$4,$5,$6)',[id,accountId,key,hash,data.byteLength,JSON.stringify(snapshot.rowCounts)]);
  await db.query("INSERT INTO security_events(account_id,event_type,severity,details) VALUES($1,'ACCOUNT_BACKUP_CREATED','INFO',$2)",[accountId,JSON.stringify({id,sha256:hash,bytes:data.byteLength})]);
  return {id,sha256:hash,bytes:data.byteLength,rowCounts:snapshot.rowCounts,downloadPath:'/api/backups?id='+encodeURIComponent(id)};
}
