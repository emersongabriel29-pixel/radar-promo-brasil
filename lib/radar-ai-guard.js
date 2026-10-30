import { db } from 'hatchable';

export async function checkGeminiCooldown(){
  const row=(await db.query("SELECT paused_until,reason FROM radar_ai_control WHERE id='global'")).rows[0];
  if(row?.paused_until && new Date(row.paused_until).getTime()>Date.now())return row;
  return null;
}
export async function registerGeminiQuotaError(){
  await db.query("INSERT INTO radar_ai_control(id,paused_until,reason) VALUES('global',now()+interval '6 hours','gemini_quota_429') ON CONFLICT(id) DO UPDATE SET paused_until=GREATEST(COALESCE(radar_ai_control.paused_until,now()),now()+interval '6 hours'),reason='gemini_quota_429',updated_at=now()");
}