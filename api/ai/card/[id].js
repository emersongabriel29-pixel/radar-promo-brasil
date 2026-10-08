import { db } from 'hatchable';

export const access='public';
export const methods=['GET'];
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export default async function(req,res){
  const id=String(req.params.id||'').slice(0,100),token=String(req.query.token||'').slice(0,100);
  const row=(await db.query("SELECT title,ratio FROM media_generation_jobs WHERE id=$1 AND render_token=$2 AND status='PENDING'",[id,token])).rows[0];
  if(!row)return res.status(404).send('Arte não encontrada.');
  const ratios=['1:1','3:4','4:3','9:16','16:9','21:9'];
  const ratio=ratios.includes(row.ratio)?row.ratio:'1:1';
  const ratioClass='ratio-'+ratio.replace(':','-');
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  return res.send(`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/ai-card.css"></head><body class="${ratioClass}"><main class="card"><div class="ring"></div><div class="brand">RADAR PROMO BRASIL</div><section><span class="tag">OFERTA EM DESTAQUE</span><h1 class="title">${esc(row.title)}</h1><div class="accent"></div></section><div class="foot">Confira as condições no link oficial</div></main></body></html>`);
}
