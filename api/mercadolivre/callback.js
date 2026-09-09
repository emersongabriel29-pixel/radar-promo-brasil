export const access = "public";
export const methods = ["GET"];
const esc=s=>String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export default async function(req,res){
  const ok=Boolean(req.query.code);
  res.setHeader("Content-Type","text/html; charset=utf-8");
  return res.send("<!doctype html><html lang='pt-BR'><meta name='viewport' content='width=device-width'><title>Mercado Livre • Radar Promo Brasil</title><style>body{font-family:system-ui;background:#f6f5fb;margin:0;display:grid;place-items:center;min-height:100vh;color:#201d3b}.box{max-width:540px;background:white;border:1px solid #ddd7fa;border-radius:24px;padding:34px;box-shadow:0 20px 60px #2f27691a}.mark{font-size:34px}h1{margin:12px 0 8px}p{color:#68627b;line-height:1.6}.status{background:"+(ok?"#ecfdf3":"#fff8e6")+";padding:12px;border-radius:12px;color:#40395b}</style><div class='box'><div class='mark'>🛍️</div><h1>Radar Promo Brasil</h1><p class='status'>"+(ok?"Autorização recebida. Volte ao painel para concluir a integração.":"Callback ativo. Use esta URL na configuração OAuth do Mercado Livre.")+"</p>"+(req.query.error?"<p>Retorno: "+esc(req.query.error)+"</p>":"")+"</div></html>");
}
