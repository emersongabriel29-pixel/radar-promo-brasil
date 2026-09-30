import crypto from 'node:crypto';
import fs from 'node:fs';
import { db } from './index.js';

let timer, running = false;
export const scheduler = {
  async now(route, options = {}) { return scheduler.at(new Date().toISOString(), route, options); },
  async at(when, route, options = {}) {
    if (!/^\/api\/jobs\/[a-z-]+$/.test(route) || !Number.isFinite(new Date(when).getTime())) throw new Error('Agendamento inválido.');
    const id = crypto.randomUUID();
    await db.query("INSERT INTO standalone_scheduled_jobs(id,route,payload,run_at,event_key) VALUES($1,$2,$3,$4,$5) ON CONFLICT(event_key) DO NOTHING", [id, route, JSON.stringify(options.payload || {}), new Date(when).toISOString(), options.eventKey || id]);
    return { id };
  }
};

export function stopScheduler() { clearInterval(timer); }
export function startScheduler({ port, token }) {
  const manifest = fs.readFileSync('hatchable.toml', 'utf8');
  const crons = [...manifest.matchAll(/\[\[cron\]\]\s*path\s*=\s*"([^"]+)"\s*schedule\s*=\s*"(\d+) \* \* \* \*"/g)].map(m => ({ route: m[1], minute: Number(m[2]) }));
  async function tick() {
    if (running) return;
    running = true;
    try {
      const now = new Date();
      for (const cron of crons) if (cron.minute === now.getUTCMinutes()) await scheduler.now(cron.route, { eventKey: `cron:${cron.route}:${now.toISOString().slice(0,16)}` });
      await db.query("UPDATE standalone_scheduled_jobs SET status='PENDING',run_at=now()+interval '1 minute' WHERE status='RUNNING' AND updated_at<now()-interval '5 minutes'");
      const tasks = (await db.query("SELECT id FROM standalone_scheduled_jobs WHERE status='PENDING' AND run_at<=now() ORDER BY run_at LIMIT 5")).rows;
      for (const task of tasks) {
        const job=(await db.query("UPDATE standalone_scheduled_jobs SET status='RUNNING',attempts=attempts+1,updated_at=now() WHERE id=$1 AND status='PENDING' RETURNING *",[task.id])).rows[0];
        if (!job) continue;
        try {
          const response = await fetch(`http://127.0.0.1:${port}${job.route}`, { method: 'POST', headers: { 'x-radar-scheduler': token, 'Content-Type': 'application/json' }, body: JSON.stringify(job.payload), signal: AbortSignal.timeout(120000) });
          if (!response.ok) throw new Error(`Job HTTP ${response.status}`);
          await db.query("UPDATE standalone_scheduled_jobs SET status='DONE',updated_at=now() WHERE id=$1", [job.id]);
        } catch {
          await db.query("UPDATE standalone_scheduled_jobs SET status=CASE WHEN attempts>=5 THEN 'FAILED' ELSE 'PENDING' END,run_at=now()+interval '1 minute',updated_at=now() WHERE id=$1", [job.id]);
        }
      }
    } catch (error) { console.error('[scheduler] Tick failed:', error.message); }
    finally { running = false; }
  }
  timer = setInterval(tick, 1000);
  timer.unref();
}
