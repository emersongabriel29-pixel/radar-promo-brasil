import { ai, db } from 'hatchable';

export const access='member';
export const methods=['GET'];

export default async function(req,res){
  const window=['24h','7d','30d','mtd'].includes(String(req.query?.window||''))?String(req.query.window):'7d';
  let platformUsage={totals:{calls:0,cost_usd:null,input_tokens:0,output_tokens:0,cache_read_tokens:0,unpriced_calls:0},series:[],by_model:[],by_purpose:[],cost_is_complete:false};
  let platformUsageAvailable=true;
  try{
    const usage=await ai.usage({window});
    if(usage&&typeof usage==='object')platformUsage=usage;
    if(platformUsage.by_user_id)delete platformUsage.by_user_id;
  }catch(error){
    platformUsageAvailable=false;
    console.warn('admin/ai-usage-platform-unavailable',error?.name||'Error');
  }
  try{
    const filter="created_at >= CASE $1::text WHEN '24h' THEN now()-interval '24 hours' WHEN '7d' THEN now()-interval '7 days' WHEN '30d' THEN now()-interval '30 days' ELSE date_trunc('month',now()) END";
    const params=[window];
    const [control,totals,series,byModel,byPurpose]=await Promise.all([
      db.query("SELECT paused_until,reason FROM radar_ai_control WHERE id='global'"),
      db.query("SELECT count(*)::int AS calls,count(*) FILTER(WHERE status='SUCCESS')::int AS successful_calls,count(*) FILTER(WHERE status='ERROR')::int AS error_calls,count(*) FILTER(WHERE status='THROTTLED')::int AS throttled_calls,COALESCE(sum(input_tokens),0)::bigint AS input_tokens,COALESCE(sum(output_tokens),0)::bigint AS output_tokens,COALESCE(sum(total_tokens),0)::bigint AS total_tokens,COALESCE(sum(cached_tokens),0)::bigint AS cached_tokens,COALESCE(sum(duration_ms),0)::bigint AS duration_ms FROM radar_gemini_usage WHERE "+filter,params),
      db.query("SELECT date_trunc(CASE WHEN $1::text='24h' THEN 'hour' ELSE 'day' END,created_at) AS bucket,count(*)::int AS calls,count(*) FILTER(WHERE status='ERROR')::int AS errors,COALESCE(sum(input_tokens),0)::bigint AS input_tokens,COALESCE(sum(output_tokens),0)::bigint AS output_tokens FROM radar_gemini_usage WHERE "+filter+" GROUP BY 1 ORDER BY 1",params),
      db.query("SELECT model,count(*)::int AS calls,count(*) FILTER(WHERE status='ERROR')::int AS errors,COALESCE(sum(input_tokens),0)::bigint AS input_tokens,COALESCE(sum(output_tokens),0)::bigint AS output_tokens FROM radar_gemini_usage WHERE "+filter+" GROUP BY model ORDER BY calls DESC LIMIT 20",params),
      db.query("SELECT purpose,count(*)::int AS calls,count(*) FILTER(WHERE status='ERROR')::int AS errors,COALESCE(sum(input_tokens),0)::bigint AS input_tokens,COALESCE(sum(output_tokens),0)::bigint AS output_tokens FROM radar_gemini_usage WHERE "+filter+" GROUP BY purpose ORDER BY calls DESC LIMIT 30",params)
    ]);
    const pause=control.rows[0]||{};
    const geminiControl={paused:!!(pause.paused_until&&new Date(pause.paused_until).getTime()>Date.now()),paused_until:pause.paused_until||null,reason:pause.reason||null,requests_per_minute_target:15};
    return res.json({
      ...platformUsage,
      gemini_control:geminiControl,
      platform_usage_available:platformUsageAvailable,
      gemini:{
        provider:'Google Gemini API',
        window,
        totals:totals.rows[0]||{},
        series:series.rows||[],
        by_model:byModel.rows||[],
        by_purpose:byPurpose.rows||[],
        control:geminiControl,
        cost_usd:null,
        cost_is_calculated:false,
        cost_note:'O ledger registra tokens e chamadas. O custo em USD não é estimado sem tabela de preços confirmada para o modelo e a modalidade.'
      }
    });
  }catch(error){
    console.error('admin/ai-usage-gemini',error?.name||'Error');
    return res.status(502).json({error:'Não foi possível consultar o ledger do Gemini. Confira se a migração de governança foi aplicada.'});
  }
}