import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {applyMigrations} from '../hatchable/migrations.js';
import {BACKUP_TABLES} from '../lib/backups.js';

// Always uses an isolated in-memory database. No destination/production URL is accepted.
export async function verifyBackup(snapshot){
  if(snapshot.format!=='radar-account-backup'||snapshot.version!==1||snapshot.schemaVersion!==20||snapshot.portable||!snapshot.accountId||snapshot.restorePolicy!=='ISOLATED_DATABASE_ONLY')throw Error('Formato de backup não restaurável.');
  const tables=snapshot.tables;
  if(!tables||Object.keys(tables).some(t=>!BACKUP_TABLES.includes(t))||BACKUP_TABLES.some(t=>!Array.isArray(tables[t])))throw Error('Tabelas de backup inválidas.');
  for(const table of BACKUP_TABLES){
    if(tables[table].length!==snapshot.rowCounts[table])throw Error('Contagem divergente: '+table);
    for(const row of tables[table])if(row[table==='accounts'?'id':'account_id']!==snapshot.accountId)throw Error('Dados de outra conta no backup.');
  }
  if(tables.accounts.length!==1)throw Error('O backup precisa conter uma única conta.');
  for(const file of snapshot.files||[])if(createHash('sha256').update(Buffer.from(file.base64,'base64')).digest('hex')!==file.sha256)throw Error('Upload corrompido.');
  const isolated=new PGlite();
  try{
    await applyMigrations(isolated,path.resolve(fileURLToPath(new URL('../migrations/',import.meta.url))));
    await isolated.transaction(async tx=>{
      for(const table of BACKUP_TABLES){
        const metadata=(await tx.query('SELECT column_name,data_type FROM information_schema.columns WHERE table_schema=current_schema() AND table_name=$1',[table])).rows;
        const types=new Map(metadata.map(c=>[c.column_name,c.data_type]));
        for(const row of tables[table]){
          const keys=Object.keys(row);if(keys.some(k=>!types.has(k)))throw Error('Coluna desconhecida: '+table);
          const params=keys.map(k=>row[k]!==null&&(types.get(k)==='jsonb'||types.get(k)==='json')?JSON.stringify(row[k]):row[k]);
          await tx.query('INSERT INTO '+table+'('+keys.map(k=>'"'+k+'"').join(',')+') VALUES('+keys.map((_,i)=>'$'+(i+1)).join(',')+')',params);
        }
      }
    });
    const counts={};
    for(const table of BACKUP_TABLES){const column=table==='accounts'?'id':'account_id';counts[table]=Number((await isolated.query('SELECT count(*) AS n FROM '+table+' WHERE '+column+'=$1',[snapshot.accountId])).rows[0].n);}
    if(BACKUP_TABLES.some(t=>counts[t]!==snapshot.rowCounts[t]))throw Error('Contagens não coincidem após restauração.');
    return {restored:true,isolated:true,tables:BACKUP_TABLES.length,rows:Object.values(counts).reduce((a,b)=>a+b,0),uploads:(snapshot.files||[]).length,rowCounts:counts};
  }finally{await isolated.close();}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    if(!process.argv[2]||!process.argv[3])throw Error('Uso: node scripts/verify-backup.mjs arquivo.json SHA256_DO_PAINEL');
    const bytes=await fs.readFile(process.argv[2]);
    if(createHash('sha256').update(bytes).digest('hex')!==process.argv[3])throw Error('SHA-256 divergente.');
    console.log(JSON.stringify(await verifyBackup(JSON.parse(bytes.toString())),null,2));
  }catch(error){console.error(error.message);process.exitCode=1;}
}
