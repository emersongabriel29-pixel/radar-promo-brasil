export const access='member';
export const methods=['GET'];
export default function(req,res){res.setHeader('Content-Type','text/html; charset=utf-8');res.send(String.raw`<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Radar Promo Brasil</title>
    <meta
      name="description"
      content="Central inteligente de automação para afiliados"
    />
    <meta name="theme-color" content="#101b2c" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@400;500;600;700;800&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="/radar.css" />
  </head>
  <body><a class="skip-link" href="#content">Ir para o conteúdo</a>
    <div class="app">
      <aside class="side" id="side">
        <div class="brand">
          <div class="mark">
            <img src="/logo-radar-promo.svg" alt="Radar Promo Brasil" />
          </div>
          <div>
            <b>Radar Promo Brasil</b><small>Operação de afiliados</small>
          </div>
        </div>
        <nav class="nav" id="nav" aria-label="Navegação principal"></nav>
        <div class="sidefoot">
          <b>Automação protegida</b>
          <p>Imagem, mensagem e link são validados antes de entrar na fila.</p>
        </div>
      </aside>
      <div class="shade" id="shade" onclick="menu(false)"></div>
      <main class="main" id="main">
        <header class="top">
          <div style="display: flex; gap: 10px; align-items: center">
            <button class="btn secondary menu" aria-controls="side" aria-expanded="false" onclick="menu(true)">
              Menu
            </button>
            <div>
              <div class="eyebrow">Radar Promo Brasil</div>
              <h1 id="title">Central de operação</h1>
            </div>
          </div>
          <div class="topactions">
            <button class="btn secondary" onclick="show('integrations')">
              Conexões</button
            ><button class="btn" onclick="openOffer()">+ Nova oferta</button>
          </div>
        </header>
        <div class="content" id="content" tabindex="-1">
          <div class="empty">Carregando sua operação...</div>
        </div>
      </main>
    </div>
    <div class="modal" id="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle" aria-describedby="modalHint" aria-hidden="true">
      <div class="dialog">
        <div class="sectionhead" style="margin-top: 0">
          <div>
            <h2 id="modalTitle"></h2>
            <p id="modalHint"></p>
          </div>
          <button class="btn secondary" onclick="closeModal()">Fechar</button>
        </div>
        <form class="form" id="form"></form>
      </div>
    </div>
    <div class="toast" id="toast" role="status" aria-live="polite"></div>
    <script src="/radar.js?v=whatsapp-20261001" defer></script>
  </body>
</html>
`);}
