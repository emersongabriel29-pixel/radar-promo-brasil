import { db } from 'hatchable';

export const access='public';
export const methods=['GET'];
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export default async function(req,res){
  const id=String(req.params.id||'').slice(0,100),token=String(req.query.token||'').slice(0,100);
  const row=(await db.query("SELECT title,ratio FROM media_generation_jobs WHERE id=$1 AND render_token=$2 AND status='PENDING'",[id,token])).rows[0];
  if(!row)return res.status(404).send('Arte não encontrada.');
  const sizes={'1:1':[1200,1200],'3:4':[1200,1600],'4:3':[1600,1200],'9:16':[1080,1920],'16:9':[1920,1080],'21:9':[2100,900]},size=sizes[row.ratio]||sizes['1:1'];
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  return res.send(`<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;width:${size[0]}px;height:${size[1]}px;overflow:hidden;background:#0d1d31;color:#fff;font-family:Arial,sans-serif}.card{position:relative;width:100%;height:100%;padding:7.5%;display:flex;flex-direction:column;justify-content:space-between;background:radial-gradient(circle at 88% 10%,#23d6a055 0 18%,transparent 40%),linear-gradient(135deg,#10233b,#163d52 70%,#145449)}.ring{position:absolute;width:44%;aspect-ratio:1;border:92px solid #ff6a2a33;border-radius:50%;right:-15%;bottom:-14%}.brand{font-weight:800;letter-spacing:3px;font-size:30px}.tag{display:inline-block;background:#ff6a2a;color:#fff;border-radius:999px;padding:18px 30px;font-size:26px;font-weight:800}.title{font-size:76px;line-height:1.05;letter-spacing:-2px;max-width:960px;font-weight:900}.foot{font-size:30px;color:#c8d9e6}.accent{height:14px;width:220px;background:#18c98d;border-radius:20px;margin-top:34px}</style></head><body><main class="card"><div class="ring"></div><div class="brand">RADAR PROMO BRASIL</div><section><span class="tag">OFERTA EM DESTAQUE</span><h1 class="title">${esc(row.title)}</h1><div class="accent"></div></section><div class="foot">Confira as condições no link oficial</div></main></body></html>`);
}
