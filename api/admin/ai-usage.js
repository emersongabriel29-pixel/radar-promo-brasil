import { ai, db } from 'hatchable';
export const access='member';
export const methods=['GET'];
export default async function(req,res){
  const window=['24h','7d','30d','mtd'].includes(String(req.query?.window||''))?String(req.query.window):'7d';
  try{
    const [usage,control]=await Promise.all([
      ai.usage({window}),
      db.query("SELECT paused_until,reason FROM radar_ai_control WHERE id='global'")
    ]);
    delete usage.by_user_id;
    const pause=control.rows[0]||{};
    usage.gemini_control={paused:!!(pause.paused_until&&new Date(pause.paused_until).getTime()>Date.now()),paused_until:pause.paused_until||null,reason:pause.reason||null};
    return res.json(usage);
  }catch(error){
    console.error('admin/ai-usage',error?.name||'Error');
    return res.status(502).json({error:'Não foi possível consultar o consumo de IA.'});
  }
}