import { config, db } from 'hatchable';
export const access = 'member';
export const methods = ['GET','POST','DELETE'];
const PROVIDERS = {
  OPENAI: { name: 'OpenAI', docs: 'https://platform.openai.com/api-keys' },
  GEMINI: { name: 'Google Gemini', docs: 'https://aistudio.google.com/app/apikey' },
  ANTHROPIC: { name: 'Anthropic Claude', docs: 'https://console.anthropic.com/settings/keys' },
  RUNWAY: { name: 'Runway', docs: 'https://dev.runwayml.com/' },
  META: { name: 'Meta / Facebook / Instagram', docs: 'https://developers.facebook.com/apps/' },
  MERCADO_LIVRE: { name: 'Mercado Livre', docs: 'https://developers.mercadolivre.com.br/' },
  LOMADEE: { name: 'Lomadee (API; integração pendente)', docs: 'https://github.com/lomadee/lomadee-sdk' },
  CUSTOM: { name: 'Outra API', docs: 'https://www.google.com/' }
};
const clean=(v,n=180)=>String(v??'').trim().slice(0,n);
const encBytes=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes)));
const decBytes=value=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
async function accountFor(member){return (await db.query('SELECT id FROM accounts WHERE owner_member_id=$1 AND status=\\'ACTIVE\\'',[String(member.id)])).rows[0]}
async function cipherKey(accountId){
  let master;
  try { master=await config.get('API_CREDENTIALS_MASTER_KEY'); } catch { master=''; }
  if(!master)throw Object.assign(new Error('Configure o segredo API_CREDENTIALS_MASTER_KEY em Configurações do projeto antes de cadastrar chaves. Use uma chave aleatória forte com pelo menos 32 caracteres; ela protege a criptografia das credenciais.'),{status:412});
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(master)+'|radar-promo-api-credentials|'+accountId));
  return crypto.subtle.importKey('raw',digest,{name:'AES-GCM'},false,['encrypt','decrypt']);
}
export default async function(req,res){
  if(!req.member)return res.status(401).json({error:'Não autorizado.'});
  try{
    const account=await accountFor(req.member);if(!account)return res.status(412).json({error:'Abra o painel uma vez para criar sua conta.'});
    if(req.method==='POST' && String(req.body?.action||'').toLowerCase()==='test') {
      const row=(await db.query('SELECT encrypted_key,nonce FROM account_api_credentials WHERE account_id=$1 AND provider=$2',[account.id,'LOMADEE'])).rows[0];
      if(!row)return res.status(404).json({ok:false,status:'ACTION_REQUIRED',error:'Cadastre primeiro a chave da Lomadee.'});
      const key=await cipherKey(account.id);
      let apiKey;
      try {
        const decrypted=await crypto.subtle.decrypt({name:'AES-GCM',iv:decBytes(row.nonce)},key,decBytes(row.encrypted_key));
        apiKey=new TextDecoder().decode(decrypted);
      } catch {
        return res.status(412).json({ok:false,status:'ACTION_REQUIRED',error:'Não foi possível descriptografar a credencial. Confira API_CREDENTIALS_MASTER_KEY.'});
      }
      let response;
      try {
        response=await fetch('https://dashboard-api.lomadee.com.br/api/contents?limit=1',{
          method:'GET',
          headers:{'x-auth-key':apiKey,accept:'application/json'},
          signal:AbortSignal.timeout(10000)
        });
      } catch(e) {
        const timeout=e?.name==='TimeoutError'||e?.name==='AbortError';
        return res.status(timeout?504:502).json({ok:false,status:'ACTION_REQUIRED',error:timeout?'A Lomadee não respondeu em até 10 segundos.':'Não foi possível alcançar a API da Lomadee.'});
      }
      if(response.status===401||response.status===403) {
        return res.status(422).json({ok:false,status:'ACTION_REQUIRED',httpStatus:response.status,error:'A Lomadee recusou a credencial ou a permissão para consultar conteúdos. Confirme a chave e o acesso à API no painel oficial.'});
      }
      if(response.status===429) {
        return res.status(429).json({ok:false,status:'ACTION_REQUIRED',httpStatus:429,error:'A Lomadee limitou as requisições. Aguarde e tente novamente; nenhum limite foi contornado.'});
      }
      if(!response.ok) {
        return res.status(502).json({ok:false,status:'ACTION_REQUIRED',httpStatus:response.status,error:'A API respondeu com erro. A integração não foi marcada como pronta.'});
      }
      let payload;
      try { payload=await response.json(); } catch {
        return res.status(502).json({ok:false,status:'ACTION_REQUIRED',error:'A API respondeu em formato inesperado; a integração não foi marcada como pronta.'});
      }
      return res.json({ok:true,status:'TESTED_READ_ONLY',httpStatus:response.status,provider:'LOMADEE',message:'Autenticação e consulta somente leitura responderam. Isso não confirma acesso a catálogo de produtos nem geração de links.',returnedItems:Array.isArray(payload?.data)?payload.data.length:Array.isArray(payload?.items)?payload.items.length:null});
    }
    if(req.method==='GET'){
      const rows=(await db.query('SELECT provider,label,docs_url AS "docsUrl",key_last4 AS "keyLast4",created_at AS "createdAt",updated_at AS "updatedAt" FROM account_api_credentials WHERE account_id=$1 ORDER BY provider',[account.id])).rows;
      return res.json({items:rows,providers:Object.entries(PROVIDERS).map(([id,p])=>({id,name:p.name,docsUrl:p.docs}))});
    }
    if(req.method==='POST'){
      const b=req.body||{},provider=clean(b.provider,40).toUpperCase(),label=clean(b.label,100),apiKey=String(b.apiKey||'').trim();
      if(!PROVIDERS[provider])return res.status(400).json({error:'Selecione um provedor válido.'});
      if(apiKey.length<8||apiKey.length>4096)return res.status(400).json({error:'Informe uma chave de API válida (8 a 4096 caracteres).'});
      if(provider==='CUSTOM'&&!label)return res.status(400).json({error:'Informe o nome da API personalizada.'});
      const key=await cipherKey(account.id),iv=crypto.getRandomValues(new Uint8Array(12));
      const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(apiKey));
      const meta=PROVIDERS[provider],id=crypto.randomUUID();
      await db.query(`INSERT INTO account_api_credentials(id,account_id,provider,label,docs_url,encrypted_key,nonce,key_last4) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(account_id,provider) DO UPDATE SET label=EXCLUDED.label,docs_url=EXCLUDED.docs_url,encrypted_key=EXCLUDED.encrypted_key,nonce=EXCLUDED.nonce,key_last4=EXCLUDED.key_last4,updated_at=now()`,[id,account.id,provider,label||meta.name,meta.docs,encBytes(encrypted),encBytes(iv),apiKey.slice(-4)]);
      return res.json({ok:true,provider,label:label||meta.name,keyLast4:apiKey.slice(-4),message:'Chave cadastrada e criptografada. Ela não será exibida novamente.'});
    }
    if(req.method==='DELETE'){
      const provider=clean(req.query?.provider||req.body?.provider,40).toUpperCase();
      if(!PROVIDERS[provider])return res.status(400).json({error:'Provedor inválido.'});
      const result=await db.query('DELETE FROM account_api_credentials WHERE account_id=$1 AND provider=$2 RETURNING provider',[account.id,provider]);
      return res.json({ok:true,deleted:result.rows.length>0});
    }
    return res.status(405).json({error:'Método não permitido.'});
  }catch(e){
    if(e.status)return res.status(e.status).json({error:e.message});
    console.error('integrations/apis',e?.name||'Error');
    return res.status(500).json({error:'Não foi possível processar o cadastro da API.'});
  }
}