import { db } from 'hatchable';

export async function checkGeminiCooldown(){
  const row=(await db.query("SELECT paused_until,reason FROM radar_ai_control WHERE id='global'")).rows[0];
  if(row?.paused_until && new Date(row.paused_until).getTime()>Date.now())return row;
  return null;
}

export async function registerGeminiQuotaError(){
  await db.query("INSERT INTO radar_ai_control(id,paused_until,reason) VALUES('global',now()+interval '6 hours','gemini_quota_429') ON CONFLICT(id) DO UPDATE SET paused_until=GREATEST(COALESCE(radar_ai_control.paused_until,now()),now()+interval '6 hours'),reason='gemini_quota_429',updated_at=now()");
}

export async function reserveGeminiSlot({maxWaitMs=12000}={}){
  const row=(await db.query(`INSERT INTO radar_gemini_throttle(id,next_slot_at)
    VALUES('global',now()+interval '4 seconds')
    ON CONFLICT(id) DO UPDATE SET
      next_slot_at=GREATEST(radar_gemini_throttle.next_slot_at,now())+interval '4 seconds',
      updated_at=now()
    RETURNING next_slot_at - interval '4 seconds' AS reserved_at`)).rows[0];
  const waitMs=Math.max(0,new Date(row.reserved_at).getTime()-Date.now());
  if(waitMs>maxWaitMs)throw Object.assign(new Error('Gemini temporariamente ocupado para respeitar o limite seguro de chamadas.'),{code:'GEMINI_THROTTLED',retryAfter:Math.ceil(waitMs/1000)});
  if(waitMs>0)await new Promise(resolve=>setTimeout(resolve,waitMs));
  const cooldown=await checkGeminiCooldown();
  if(cooldown)throw Object.assign(new Error('Gemini em pausa temporária após resposta de cota.'),{code:'GEMINI_COOLDOWN',retryAfter:cooldown.paused_until});
  return {waitMs};
}