export const access = 'public';
export const methods = ['GET'];

export default function (req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
  res.send(String.raw`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#081d3b">
  <title>Radar Promo Brasil | Encontre seu grupo</title>
  <meta name="description" content="Entre gratuitamente nos grupos do Radar Promo Brasil e acompanhe ofertas organizadas por categoria: Casa, Tecnologia, Moda, Pet, Baby e muito mais.">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Radar Promo Brasil — escolha seu grupo">
  <meta property="og:description" content="Ofertas e achadinhos organizados por interesse. Entre gratuitamente no Telegram.">
  <meta property="og:image" content="/logo-radar-promo.svg">
  <link rel="icon" href="/logo-radar-promo.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root{color-scheme:dark;--bg:#07172e;--panel:#102746;--line:#274361;--text:#f5f9ff;--muted:#b7c8dc;--blue:#3b82f6;--mint:#39d6a3}
    *{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(ellipse at 50% -10%,#174b7c 0,transparent 48%),linear-gradient(180deg,#07172e,#0a1d37 55%,#07172e);color:var(--text);font-family:Manrope,system-ui,-apple-system,sans-serif}
    a{color:inherit;text-decoration:none}.wrap{width:min(100% - 32px,560px);margin:0 auto;padding:38px 0 28px}
    .profile{text-align:center;padding:12px 8px 25px}.logo{width:88px;height:88px;object-fit:contain;border-radius:25px;box-shadow:0 12px 36px #0005}
    h1{font-size:clamp(25px,6vw,32px);line-height:1.12;letter-spacing:-.055em;margin:16px 0 9px;font-weight:900}
    .tagline{margin:0 auto;color:var(--muted);font-size:14px;line-height:1.65;max-width:410px}
    .proof{display:inline-flex;align-items:center;gap:7px;margin-top:15px;padding:7px 12px;border:1px solid #2d5874;border-radius:999px;color:#baf5df;font-size:11px;font-weight:800;letter-spacing:.02em;background:#103a3a66}
    .section-label{display:flex;align-items:center;gap:10px;margin:8px 2px 12px;color:#d9e8f8;font-size:11px;font-weight:900;letter-spacing:.13em;text-transform:uppercase}
    .section-label:after{content:"";height:1px;flex:1;background:linear-gradient(90deg,#345372,transparent)}
    .links{display:grid;gap:10px}.link{position:relative;display:flex;align-items:center;gap:13px;min-height:66px;padding:12px 15px;border:1px solid #2a4665;border-radius:16px;background:linear-gradient(110deg,#142f50,#102642);box-shadow:0 7px 20px #0002;transition:transform .16s,border-color .16s,background .16s}
    .link:hover,.link:focus-visible{transform:translateY(-2px);border-color:#5a9bea;background:linear-gradient(110deg,#1a3b63,#123050);outline:none}
    .link.primary{border-color:#3279b9;background:linear-gradient(110deg,#174b85,#155c70);box-shadow:0 10px 25px #06152a66}
    .emoji{display:grid;place-items:center;flex:0 0 42px;width:42px;height:42px;border-radius:13px;background:#ffffff12;font-size:23px}
    .copy{min-width:0;flex:1}.name{display:block;font-size:14px;font-weight:900;line-height:1.3}.hint{display:block;margin-top:4px;color:#b7c8dc;font-size:11px;line-height:1.35}
    .arrow{color:#8fb9e9;font-size:21px;font-weight:700;padding-left:4px}
    .note{margin:20px 4px 0;padding:13px 14px;border:1px solid #263f5b;border-radius:14px;color:#aebfd2;font-size:11px;line-height:1.6;background:#0b2039}
    footer{text-align:center;padding:22px 0 4px;color:#8298b2;font-size:11px;line-height:1.7}footer a{color:#b9d6f5;text-decoration:underline;text-underline-offset:3px}
    @media(min-width:600px){.wrap{padding-top:54px}.link{min-height:70px}.name{font-size:15px}}
    @media(prefers-reduced-motion:reduce){.link{transition:none}.link:hover{transform:none}}
  </style>
</head>
<body>
  <main class="wrap">
    <header class="profile">
      <img class="logo" src="/logo-radar-promo.svg" alt="Logo Radar Promo Brasil" width="88" height="88">
      <h1>Radar Promo Brasil</h1>
      <p class="tagline">Seu próximo achadinho pode estar aqui. Escolha os assuntos que mais combinam com você e entre gratuitamente nos nossos grupos.</p>
      <span class="proof"><span aria-hidden="true">✦</span> OFERTAS ORGANIZADAS POR NICHO</span>
    </header>

    <div class="section-label">Comece por aqui</div>
    <nav class="links" aria-label="Grupos do Radar Promo Brasil">
      <a class="link primary" href="https://t.me/radarpromobrasil1" target="_blank" rel="noopener noreferrer">
        <span class="emoji" aria-hidden="true">🔥</span><span class="copy"><span class="name">Ofertas gerais</span><span class="hint">Destaques e achadinhos variados</span></span><span class="arrow" aria-hidden="true">›</span>
      </a>
      <a class="link" href="https://t.me/RadarPromoBrasilCasaELar" target="_blank" rel="noopener noreferrer">
        <span class="emoji" aria-hidden="true">🏠</span><span class="copy"><span class="name">Casa &amp; Lar</span><span class="hint">Cozinha, sala, quarto, decoração e utilidades</span></span><span class="arrow" aria-hidden="true">›</span>
      </a>
      <a class="link" href="https://t.me/RadarPromoBrasilTechEletronicos" target="_blank" rel="noopener noreferrer">
        <span class="emoji" aria-hidden="true">📱</span><span class="copy"><span class="name">Tech &amp; Eletrônicos</span><span class="hint">Celulares, informática, acessórios e gadgets</span></span><span class="arrow" aria-hidden="true">›</span>
      </a>
      <a class="link" href="https://t.me/RadarPromoBrasilModaBeleza" target="_blank" rel="noopener noreferrer">
        <span class="emoji" aria-hidden="true">👗</span><span class="copy"><span class="name">Moda &amp; Beleza</span><span class="hint">Roupas, calçados, acessórios e cuidados pessoais</span></span><span class="arrow" aria-hidden="true">›</span>
      </a>
      <a class="link" href="https://t.me/radarpromobrasilautomotopecas" target="_blank" rel="noopener noreferrer">
        <span class="emoji" aria-hidden="true">🚗</span><span class="copy"><span class="name">Auto, Moto &amp; Peças</span><span class="hint">Acessórios, manutenção e equipamentos</span></span><span class="arrow" aria-hidden="true">›</span>
      </a>
      <a class="link" href="https://t.me/RadarPromoAchadinhosImportados" target="_blank" rel="noopener noreferrer">
        <span class="emoji" aria-hidden="true">🌎</span><span class="copy"><span class="name">Achadinhos Importados</span><span class="hint">Produtos e novidades de fora do Brasil</span></span><span class="arrow" aria-hidden="true">›</span>
      </a>
      <a class="link" href="https://t.me/+ntHnJ5FL4DhmOTdh" target="_blank" rel="noopener noreferrer">
        <span class="emoji" aria-hidden="true">🍼</span><span class="copy"><span class="name">Baby e Kids</span><span class="hint">Bebês, crianças, brinquedos e acessórios</span></span><span class="arrow" aria-hidden="true">›</span>
      </a>
      <a class="link" href="https://t.me/RadarPromoBrasilPet" target="_blank" rel="noopener noreferrer">
        <span class="emoji" aria-hidden="true">🐾</span><span class="copy"><span class="name">Pet</span><span class="hint">Cães, gatos, aves, peixes e outros pets</span></span><span class="arrow" aria-hidden="true">›</span>
      </a>
    </nav>

    <aside class="note">💡 Você pode entrar em mais de um grupo. Escolha os temas que fazem sentido para você e acompanhe as ofertas no Telegram. Preços e disponibilidade podem mudar conforme a loja.</aside>
    <footer>© Radar Promo Brasil<br>Alguns links de ofertas podem ser links de afiliado. <a href="/privacidade">Privacidade</a> · <a href="/termos">Termos</a></footer>
  </main>
</body>
</html>`);
}