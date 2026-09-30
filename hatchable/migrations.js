import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export async function applyMigrations(instance, directory) {
  await instance.exec('CREATE TABLE IF NOT EXISTS standalone_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())');
  for (const file of fs.readdirSync(directory).filter(f => f.endsWith('.sql')).sort()) {
    const sql = fs.readFileSync(path.join(directory, file), 'utf8');
    const checksum = crypto.createHash('sha256').update(sql).digest('hex');
    const applied = (await instance.query('SELECT checksum FROM standalone_migrations WHERE name=$1', [file])).rows[0];
    if (applied) {
      if (applied.checksum !== checksum) throw new Error(`A migração aplicada ${file} foi alterada. Restaure o arquivo e crie uma nova migração.`);
      continue;
    }
    try {
      await instance.transaction(async tx => {
        await tx.exec(sql);
        await tx.query('INSERT INTO standalone_migrations(name,checksum) VALUES($1,$2)', [file, checksum]);
      });
    } catch (cause) {
      throw new Error(`Falha na migração ${file}; alterações revertidas. Verifique o banco antes de iniciar.`, { cause });
    }
  }
}
