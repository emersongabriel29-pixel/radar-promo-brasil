import { config, db as hatchableDb } from 'hatchable';
import { db as supabaseDb } from 'lib/supabase-db.js';

let cachedMode = false;
let cachedUntil = 0;
let modePromise = null;

async function useSupabase() {
  if (Date.now() < cachedUntil) return cachedMode;
  if (!modePromise) {
    modePromise = (async () => {
      const value = await config.get('SUPABASE_DB_ENABLED');
      cachedMode = value === true || String(value || '').trim().toLowerCase() === 'true';
      cachedUntil = Date.now() + 5000;
      return cachedMode;
    })();
  }
  try { return await modePromise; }
  finally { modePromise = null; }
}

export async function getDbProvider() {
  return (await useSupabase()) ? 'SUPABASE' : 'HATCHABLE';
}

// SUPABASE_DB_ENABLED defaults to false. The current Hatchable database stays
// active until data import, end-to-end tests, and an explicitly approved cutover.
export const db = Object.freeze({
  async query(sql, params = []) {
    if (await useSupabase()) return supabaseDb.query(sql, params);
    return hatchableDb.query(sql, params);
  },
  async transaction(operations = []) {
    if (await useSupabase()) return supabaseDb.transaction(operations);
    return hatchableDb.transaction(operations);
  }
});
