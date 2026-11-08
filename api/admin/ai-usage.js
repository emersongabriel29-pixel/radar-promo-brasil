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
    const [control,events]=await Promise.all([
      db.query("SELECT paused_until,reason FROM radar_ai_control WHERE id='global'"),
      db.query("SELECT model,purpose,status,input_tokens,output_tokens,total_tokens,cached_tokens,duration_ms,created_at FROM radar_gemini_usage WHERE created_at >= CASE $1::text WHEN '24h' THEN now()-interval '24 hours' WHEN '7d' THEN now()-interval '7 days' WHEN '30d' THEN now()-interval '30 days' ELSE date_trunc('month',now()) END ORDER BY created_at ASC LIMIT 5000",[window])
    ]);
    const rows=events.rows||[];
    const totals={calls:0,events:rows.length,successful_calls:0,error_calls:0,throttled_calls:0,input_tokens:0,output_tokens:0,total_tokens:0,cached_tokens:0,duration_ms:0};
    const models=new Map(),purposes=new Map(),buckets=new Map();
    const bucketType=window==='24h'?'hour':'day';
    for(const row of rows){
      const status=String(row.status||'');
      if(status==='THROTTLED'){totals.throttled_calls++;continue;}
      totals.calls++;
      if(status==='SUCCESS')totals.successful_calls++;
      else if(status==='ERROR')totals.error_calls++;
      for(const field of ['input_tokens','output_tokens','total_tokens','cached_tokens','duration_ms'])totals[field]+=Number(row[field])||0;
      const model=String(row.model||'unknown'),purpose=String(row.purpose||'unspecified');
      for(const [map,key] of [[models,model],[purposes,purpose]]){
        if(!map.has(key))map.set(key,{model:key,purpose:key,calls:0,errors:0,input_tokens:0,output_tokens:0});
        const item=map.get(key);item.calls++;if(status==='ERROR')item.errors++;
        item.input_tokens+=Number(row.input_tokens)||0;item.output_tokens+=Number(row.output_tokens)||0;
      }
      const date=new Date(row.created_at);
      const bucket=bucketType==='hour'?date.toISOString().slice(0,13)+':00:00Z':date.toISOString().slice(0,10);
      if(!buckets.has(bucket))buckets.set(bucket,{bucket,calls:0,errors:0,input_tokens:0,output_tokens:0});
      const point=buckets.get(bucket);point.calls++;if(status==='ERROR')point.errors++;
      point.input_tokens+=Number(row.input_tokens)||0;point.output_tokens+=Number(row.output_tokens)||0;
    }
    const pause=control.rows[0]||{};
    const geminiControl={paused:!!(pause.paused_until&&new Date(pause.paused_until).getTime()>Date.now()),paused_until:pause.paused_until||null,reason:pause.reason||null,requests_per_minute_target:15};
    const byModel=Array.from(models.values()).map(x=>({model:x.model,calls:x.calls,errors:x.errors,input_tokens:x.input_tokens,output_tokens:x.output_tokens})).sort((a,b)=>b.calls-a.calls).slice(0,20);
    const byPurpose=Array.from(purposes.values()).map(x=>({purpose:x.purpose,calls:x.calls,errors:x.errors,input_tokens:x.input_tokens,output_tokens:x.output_tokens})).sort((a,b)=>b.calls-a.calls).slice(0,30);
    return res.json({
      ...platformUsage,
      gemini_control:geminiControl,
      platform_usage_available:platformUsageAvailable,
      gemini:{
        provider:'Google Gemini API',
        window,
        totals,
        series:Array.from(buckets.values()),
        by_model:byModel,
        by_purpose:byPurpose,
        control:geminiControl,
        truncated:rows.length===5000,
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