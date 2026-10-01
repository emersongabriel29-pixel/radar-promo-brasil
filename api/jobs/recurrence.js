import {runSchedule} from 'lib/recurrences.js';
export const access='scheduler';
export const methods=['POST'];
export default async function(req,res){
  const b=req.body||{};if(!b.accountId||!b.scheduleId||!b.runAt||!Number.isFinite(Date.parse(b.runAt)))return res.status(400).json({error:'Agendamento inválido.'});
  return res.json(await runSchedule(String(b.accountId),String(b.scheduleId),String(b.runAt)));
}
