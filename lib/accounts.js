import { db } from 'hatchable';
export const STORES=['AMAZON','SHOPEE','MERCADO_LIVRE','SHEIN','ALIEXPRESS','MAGALU','CASAS_BAHIA','HOTMART','KABUM','AMERICANAS','NATURA','AVON'];
const clean=(value,max=100)=>String(value??'').trim().slice(0,max);

export async function getOrCreateAccount(member) {
  const owner=clean(member?.id,200);
  if(!owner) throw new Error('Identidade ausente.');
  const name=clean(member.display_name||'Minha operação');
  const id=crypto.randomUUID();
  const slug=name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)+'-'+id.slice(0,8);
  const account=(await db.query('INSERT INTO accounts(id,owner_member_id,name,slug) VALUES($1,$2,$3,$4) ON CONFLICT(owner_member_id) DO UPDATE SET owner_member_id=EXCLUDED.owner_member_id RETURNING *',[id,owner,name,slug])).rows[0];
  await db.transaction([
    {sql:'INSERT INTO storefront_settings(account_id) VALUES($1) ON CONFLICT DO NOTHING',params:[account.id]},
    {sql:'INSERT INTO account_settings(account_id) VALUES($1) ON CONFLICT DO NOTHING',params:[account.id]},
    {sql:'INSERT INTO account_security_settings(account_id) VALUES($1) ON CONFLICT DO NOTHING',params:[account.id]},
    ...STORES.map(store=>({sql:'INSERT INTO marketplace_rules(id,account_id,marketplace) VALUES($1,$2,$3) ON CONFLICT(account_id,marketplace) DO NOTHING',params:[crypto.randomUUID(),account.id,store]}))
  ]);
  return account;
}

export async function starter(accountId) {
  const definitions=[['Ofertas gerais','🔥','#1769e0'],['Tecnologia','📱','#1967d2'],['Casa e cozinha','🏠','#0a8f66'],['Bebês e crianças','🧸','#d84f88'],['Moda e beleza','✨','#7c3aed'],['Pet','🐾','#c77a00'],['Produtos importados','🌍','#2563eb']];
  const params=[accountId];
  const values=definitions.map(definition=>{const start=params.length+1;params.push(crypto.randomUUID(),...definition);return `($${start},$${start+1},$${start+2},$${start+3})`;}).join(',');
  await db.transaction([
    {sql:'SELECT id FROM accounts WHERE id=$1 FOR UPDATE',params:[accountId]},
    {sql:`INSERT INTO categories(id,account_id,name,icon,color) SELECT v.id,$1,v.name,v.icon,v.color FROM (VALUES ${values}) AS v(id,name,icon,color) WHERE NOT EXISTS(SELECT 1 FROM categories WHERE account_id=$1) AND EXISTS(SELECT 1 FROM account_settings WHERE account_id=$1 AND starter_initialized=false)`,params},
    ...[['Achadinhos do Dia','Ofertas gerais'],['Tecnologia e Games','Tecnologia'],['Casa e Eletrodomésticos','Casa e cozinha'],['Ofertas para Bebês','Bebês e crianças'],['Produtos Importados','Produtos importados']].map(([name,category])=>({
      sql:"INSERT INTO promo_groups(id,account_id,name,category_id,status) SELECT $1,$2,$3,c.id,'PAUSED' FROM categories c WHERE c.account_id=$2 AND c.name=$4 AND NOT EXISTS(SELECT 1 FROM promo_groups WHERE account_id=$2 AND name=$3) AND EXISTS(SELECT 1 FROM account_settings WHERE account_id=$2 AND starter_initialized=false)",params:[crypto.randomUUID(),accountId,name,category]
    })),
    {sql:'UPDATE account_settings SET starter_initialized=true WHERE account_id=$1',params:[accountId]}
  ]);
}
