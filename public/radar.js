var lastMeliInspection = null;
var D = {
    categories: [],
    groups: [],
    offers: [],
    publications: [],
    monitors: [],
    queues: [],
    schedules: [],
    leadStats: [],
    activity: [],
    integrations: [],
    automation: {},
    suite: {
      marketplaces: [],
      connections: [],
      telegramConnections: [],
      storefront: {},
      account: {},
    },
    growth: {
      coupons: [],
      campaigns: [],
      connections: [],
      assets: [],
      mediaJobs: [],
      checks: [],
      privacyRequests: [],
      securityEvents: [],
      security: {},
    },
    social: {
      settings: {
        status: "PAUSED",
        channels: ["INSTAGRAM", "FACEBOOK"],
        requireApproval: true,
        minScore: 70,
        maxPostsPerDay: 6,
        intervalMinutes: 60,
        startTime: "08:00",
        endTime: "22:00",
      },
      posts: [],
      counts: {},
      connections: [],
    },
    compliance: {
      summary: { attempts: 0, allowed: 0, blocked: 0, complianceRate: null },
      byChannel: [],
      recent: [],
      excluded: {},
    },
    reportsData: {
      summary: {},
      byCategory: [],
      byGroup: [],
      byPlatform: [],
      byChannel: [],
      daily: [],
      topOffers: [],
      delivery: [],
    },
  },
  current = "dashboard",
  selected = null,
  reportDays = 30;
var NAV = [
  ["dashboard", "Central", "DB"],
  ["radar", "Radar", "RD"],
  ["offers", "Ofertas", "OF"],
  ["publishing", "Publicações", "PB"],
  ["channels", "Canais", "CN"],
  ["reports", "Relatórios", "BI"],
  ["settings", "Configurações", "CT"],
];
var GROUPS = {
  radar: [
    ["monitoring", "Monitoramento 24h", "24", "monitoring"],
    ["clone", "Modo clone", "CL", "cloneView"],
    ["quick", "Criação rápida", "60", "quick"],
  ],
  offers: [
    ["offers", "Ofertas e cupons", "OF", "offers"],
    ["studio", "Estúdio de IA", "AI", "studio"],
    ["growth", "Tráfego e redes sociais", "AD", "growth"],
    ["socialagent", "Agente Radar Social", "RS", "socialAgent"],
  ],
  publishing: [["queues", "Filas e agendamento", "FQ", "queues"]],
  channels: [
    ["groups", "Grupos e canais", "GR", "groups"],
    ["leads", "Gestão de leads", "LD", "leads"],
  ],
  settings: [
    ["security", "Segurança e LGPD", "SX", "security"],
    ["integrations", "Integrações", "IN", "integrations"],
    ["account", "Conta, vitrine e planos", "CT", "accountView"],
  ],
};
var LABEL = {
  PENDING: "Pendente",
  APPROVED: "Aprovada",
  REJECTED: "Ignorada",
  DRAFT: "Revisão",
  READY: "Pronta",
  SCHEDULED: "Agendada",
  PUBLISHING: "Publicando",
  PUBLISHED: "Publicada",
  BLOCKED: "Aguardando conexão",
  RETRY: "Nova tentativa",
  FAILED: "Falhou",
  ACTIVE: "Ativo",
  PAUSED: "Pausado",
};
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c];
  });
}
function brl(v) {
  return v == null
    ? "—"
    : (v / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function cat(id) {
  return D.categories.find(function (x) {
    return x.id === id;
  });
}
function grp(id) {
  return D.groups.find(function (x) {
    return x.id === id;
  });
}
function off(id) {
  return D.offers.find(function (x) {
    return x.id === id;
  });
}
function groupPage(key) {
  var items = GROUPS[key] || [],
    active = items.find(function(x){return x[0]===selectedGroups[key]}) || items[0],
    tabs = items
      .map(function (n) {
        return (
          '<button class="group-tab ' +
          (n === active ? "on" : "") +
          '" data-action="switchGroup(\'' +
          key +
          "','" +
          n[0] +
          '\')"><span class="ico" aria-hidden="true">' +
          n[2] +
          "</span>" +
          n[1] +
          "</button>"
        );
      })
      .join("");
  return (
    '<div class="group-tabs">' +
    tabs +
    '</div><div class="group-panel" id="group-panel">' +
    window[active[3]]() +
    "</div>"
  );
}
function switchGroup(key, id) {
  var item = (GROUPS[key] || []).find(function (n) {
    return n[0] === id;
  });
  if (!item) return;
  selectedGroups[key]=id;
  history.replaceState(null,'','#'+id);
  document.querySelectorAll(".group-tab").forEach(function (b) {
    b.classList.toggle("on", b.textContent.trim().includes(item[1]));
  });
  document.getElementById("group-panel").innerHTML = window[item[3]]();
  if(key==="settings"&&id==="integrations"){loadApiCredentials();loadMarketplaceStatus();}
}
async function call(method, body, query) {
  var r = await fetch("/api/data" + (query || ""), {
      method: method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    }),
    b = await r.json();
  if (!r.ok) throw Error(b.error || "Não foi possível concluir");
  await load();
  return b;
}
async function suiteCall(method, body, query) {
  var r = await fetch("/api/suite" + (query || ""), {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }),
    b = await r.json();
  if (!r.ok) throw Error(b.error || "Não foi possível concluir");
  D.suite = b;
  render();
  return b;
}
async function growthCall(method, body, query) {
  var r = await fetch("/api/growth" + (query || ""), {
      method: method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    }),
    b = await r.json();
  if (!r.ok) throw Error(b.error || "Não foi possível concluir");
  D.growth = b;
  render();
  return b;
}
async function socialCall(method, body, query) {
  var r = await fetch("/api/social/autopilot" + (query || ""), {
      method: method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    }),
    b = await r.json();
  if (!r.ok) throw Error(b.error || "Não foi possível concluir");
  D.social = b;
  render();
  return b;
}
function section(t, p, button, action) {
  return (
    '<div class="sectionhead"><div><h2>' +
    t +
    "</h2><p>" +
    p +
    "</p></div>" +
    (button
      ? '<button class="btn" data-action="' + action + '">' + button + "</button>"
      : "") +
    "</div>"
  );
}
function empty(t) {
  return (
    '<div class="empty"><b>' +
    t +
    "</b><p>Use o botão acima para configurar.</p></div>"
  );
}
function thumb(o) {
  return o.imageUrl
    ? '<img class="thumb" src="' +
        esc(o.imageUrl) +
        '" alt="Imagem do produto">'
    : '<div class="thumb"></div>';
}
function offerRow(o) {
  var c = cat(o.categoryId);
  return (
    '<div class="row">' +
    thumb(o) +
    '<div class="grow"><b>' +
    esc(o.title) +
    '</b><div class="muted">' +
    esc(o.source) +
    " · " +
    (c ? c.icon + " " + esc(c.name) : "Sem categoria") +
    ' · <span class="pill ' +
    (o.status === "APPROVED" ? "live" : "") +
    '">' +
    (LABEL[o.status] || o.status) +
    '</span></div><div class="price">' +
    brl(o.currentPrice) +
    (o.originalPrice
      ? ' <del class="muted">' + brl(o.originalPrice) + "</del>"
      : "") +
    (o.discountPercent ? " · " + o.discountPercent + "% OFF" : "") +
    '</div></div><div class="actions">' +
    (o.status === "PENDING"
      ? "<button class=\"btn green\" data-action=\"status('offer','" +
        o.id +
        "','APPROVED')\">Aprovar</button>"
      : "") +
    '<button class="btn dark" data-action="prepare(\'' +
    o.id +
    "')\">Preparar envio</button><button class=\"btn danger\" data-action=\"removeItem('offer','" +
    o.id +
    "')\">Excluir</button></div></div>"
  );
}
function dashboard() {
  var clicks = D.publications.reduce(function (s, p) {
      return s + Number(p.clicks || 0);
    }, 0),
    active = D.monitors.filter(function (x) {
      return x.status === "ACTIVE";
    }).length,
    ready = D.publications.filter(function (x) {
      return x.status === "READY" || x.status === "SCHEDULED";
    }).length,
    usableGroups = D.groups.filter(function (g) {
      return g.status === "ACTIVE" && String(g.externalId || "").trim();
    }).length,
    validatedMarketplaces = (D.suite.marketplaces || []).filter(function (x) {
      return x.status === "ACTIVE" && String(x.affiliateTag || "").trim();
    }).length,
    activeConnections =
      (D.suite.connections || []).filter(function (x) {
        return x.status === "ACTIVE";
      }).length +
      (D.suite.telegramConnections || []).filter(function (x) {
        return x.status === "ACTIVE";
      }).length,
    operationOn =
      active > 0 &&
      usableGroups > 0 &&
      validatedMarketplaces > 0 &&
      activeConnections > 0;
  return (
    '<section class="hero"><div><div class="eyebrow eyebrow-highlight">RESUMO DA OPERAÇÃO</div><h2>Ofertas, canais e envios em um só lugar.</h2><p>Acompanhe as fontes, revise ofertas e confira a fila antes de publicar. Links e requisitos do canal são verificados antes do envio.</p><div class="actions"><button type=\"button\" id=\"create-promotion\" class=\"btn\" data-action=\"show(\'quick\')\">Criar promoção</button><button type="button" id="configure-monitor" class="btn secondary" data-action="show(\'monitoring\')">Configurar monitor</button></div></div><div class="pulsebox"><div class="pulse"><span>Motor de automação</span><i class="dot"></i></div><strong>' +
    (operationOn ? "24/7 ativo" : "Em configuração") +
    "</strong><small>" +
    active +
    " monitor(es) · " +
    usableGroups +
    " destino(s) utilizável(is) · " +
    ready +
    ' item(ns) na fila</small></div></section><div class="metrics">' +
    metric("Ofertas capturadas", D.offers.length, "total no radar") +
    metric("Destinos utilizáveis", usableGroups, "ativos e com ID oficial") +
    metric("Envios na fila", ready, "prontos ou agendados") +
    metric("Cliques rastreados", clicks, "links publicados") +
    "</div>" +
    section(
      "Fluxo de trabalho",
      "Escolha como capturar, preparar e distribuir ofertas.",
    ) +
    '<div class="grid modes">' +
    mode(
      "MODO 01",
      "Monitoramento inteligente",
      "Captura e valida ofertas; só distribui quando a origem, o link de afiliado e o destino estão confirmados.",
      "monitoring",
    ) +
    mode(
      "MODO 02",
      "Clone fiel",
      "Preserva texto e imagem; substitui somente links e cupons.",
      "clone",
    ) +
    mode(
      "MODO 03",
      "Sob demanda",
      "Cole um link e prepare a oferta em poucos segundos.",
      "quick",
    ) +
    mode(
      "MODO 04",
      "Filas programadas",
      "Horários, intervalos e recorrências por nicho.",
      "queues",
    ) +
    '</div><div class="grid two">' +
    recent() +
    "<div>" +
    section("Atividade recente", "O que o sistema executou.") +
    '<div class="card"><ul class="activity">' +
    (D.activity.length
      ? D.activity
          .slice(0, 7)
          .map(function (a) {
            return (
              '<li><i class="a-dot"></i><div><b>' +
              esc(a.title) +
              '</b><div class="muted">' +
              esc(a.details) +
              "</div></div><time>" +
              new Date(a.createdAt).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              }) +
              "</time></li>"
            );
          })
          .join("")
      : '<li><i class="a-dot"></i><div><b>Sistema pronto</b><div class="muted">Configure as integrações para iniciar.</div></div></li>') +
    "</ul></div></div></div>"
  );
}
function metric(a, b, c) {
  return (
    '<div class="metric"><label>' +
    a +
    "</label><b>" +
    b +
    "</b><small>" +
    c +
    "</small></div>"
  );
}
function modeReady(target) {
  var groups = D.groups.some(function (g) {
      return g.status === "ACTIVE" && String(g.externalId || "").trim();
    }),
    stores = (D.suite.marketplaces || []).some(function (x) {
      return x.status === "ACTIVE" && String(x.affiliateTag || "").trim();
    }),
    delivery =
      (D.suite.connections || []).some(function (x) {
        return x.status === "ACTIVE";
      }) ||
      (D.suite.telegramConnections || []).some(function (x) {
        return x.status === "ACTIVE";
      }),
    monitors = D.monitors.some(function (x) {
      return x.status === "ACTIVE";
    }),
    queues = D.queues.some(function (x) {
      return x.status === "ACTIVE";
    });
  if (target === "quick") return stores;
  if (target === "queues") return queues && groups;
  if (target === "monitoring" || target === "clone")
    return monitors && stores && groups && delivery;
  return false;
}
function mode(code, title, text, target) {
  var ready = modeReady(target);
  return (
    '<div class="card mode"><div class="code">' +
    code +
    "</div><h3>" +
    title +
    "</h3><p>" +
    text +
    '</p><div class="state"><b class="' +
    (ready ? "" : "muted") +
    '">' +
    (ready ? "Configurado" : "Configuração necessária") +
    '</b><button class="btn secondary" data-action="show(\'' +
    target +
    "')\">Abrir</button></div></div>"
  );
}
function recent() {
  return (
    "<div>" +
    section(
      "Ofertas recentes",
      "Prioridade maior primeiro.",
      "Ver todas",
      "show('offers')",
    ) +
    '<div class="list">' +
    (D.offers.length
      ? D.offers.slice(0, 4).map(offerRow).join("")
      : empty("Nenhuma oferta cadastrada")) +
    "</div></div>"
  );
}
function monitoring() {
  return (
    section(
      "Fontes e regras de monitoramento",
      "Cadastre fontes autorizadas. A captura automática só fica ativa quando o conector da origem estiver validado.",
      "+ Nova fonte",
      "openMonitor()",
    ) +
    '<div class=\"card\"><div class=\"steps\">' +
    [
      "Recebe do conector",
      "Detecta produto",
      "Valida oferta",
      "Valida link afiliado",
      "Direciona ao grupo",
    ]
      .map(function (x, i) {
        return (
          '<div class=\"step\"><i>0' + (i + 1) + "</i><b>" + x + "</b></div>"
        );
      })
      .join("") +
    '</div><div class=\"callout\" class=\"csp-margin-top-15px\">Cadastrar uma fonte não autoriza leitura automática do WhatsApp, de redes sociais ou de marketplaces. É necessário um conector oficial e credenciais válidas.</div></div>' +
    section(
      "Fontes cadastradas",
      "Mantenha a origem pausada até validar o conector.",
    ) +
    '<div class=\"list\">' +
    (D.monitors.length
      ? D.monitors
          .map(function (m) {
            var c = cat(m.categoryId);
            return (
              '<div class=\"row\"><div class=\"intlogo\">CN</div><div class=\"grow\"><b>' +
              esc(m.name) +
              '</b><div class=\"muted\">' +
              esc(m.sourceType) +
              " · " +
              (c ? esc(c.name) : "Todas as categorias") +
              " · " +
              m.capturedCount +
              ' capturas reais</div>' + (m.lastError ? '<p class="muted" role="status">' + esc(m.lastError) + '</p>' : '') + '</div><span class=\"pill ' +
              (m.status === "ACTIVE" ? "live" : "warn") +
              '\">' +
              LABEL[m.status] +
              "</span>" +
              (m.status === "ACTIVE"
                ? "<button class=\"btn secondary\" data-action=\"status('monitor','" +
                  m.id +
                  "','PAUSED')\">Pausar</button>"
                : '<button class="btn secondary" data-action="status(\'monitor\',\''+m.id+'\',\'ACTIVE\')">Ativar</button>') +
              (m.status==='ACTIVE' && ['FEED','MARKETPLACE'].includes(m.sourceType) ? '<button class="btn secondary" data-action="captureMonitor(\''+m.id+'\',this)">Capturar agora</button>' : '') +
              "</div>"
            );
          })
          .join("")
      : empty("Nenhuma fonte cadastrada")) +
    "</div>"
  );
}
function cloneView() {
  return (
    section(
      "Modo clone",
      "Preserva o conteúdo e envia para revisão quando não consegue validar o link de afiliado.",
    ) +
    '<div class="grid two"><div class="card"><h3>Fluxo protegido</h3><div class="steps">' +
    ["Captura", "Identifica links", "Converte", "Mantém mídia", "Enfileira"]
      .map(function (x, i) {
        return (
          '<div class="step"><i>0' + (i + 1) + "</i><b>" + x + "</b></div>"
        );
      })
      .join("") +
    '</div><div class="callout csp-margin-top-15px" >Mensagens com vários produtos ficam para revisão. O sistema não altera preço, cupom ou frete sem confirmação da fonte.</div></div><div class="card"><h3>Regras do clone</h3><p class="muted">✓ Preservar formatação e imagem<br>✓ Substituir somente links com conversão oficial validada<br>✓ Preservar links de cupom confirmados<br>✓ Bloquear duplicações<br>✓ Enviar à categoria compatível</p><button class="btn" data-action="openMonitor()">Adicionar origem</button></div></div>'
  );
}
function quick() {
  return (
    section(
      "Criação rápida",
      "Converta um link configurado ou cadastre uma oferta completa.",
      "+ Cadastrar oferta",
      "openOffer()",
    ) +
    '<div class="grid two"><div class="card"><h3>Analisador de links</h3><p class="muted">No Mercado Livre, identifica o produto e consulta preço/estoque quando a API permite. Links de afiliado devem vir do gerador oficial; o Radar não inventa rastreamento.</p><div class="field"><label>Link do produto ou link oficial de afiliado</label><input class="input" id="convertUrl" type="url" placeholder="https://meli.la/... ou URL do produto"></div><div class="field csp-margin-top-10px" ><label>Identificação do grupo</label><input class="input" id="convertGroup" value="geral"></div><button class="btn csp-margin-top-12px"  data-action="convertLink()">Analisar link</button><div id="convertResult" class="callout csp-hidden csp-margin-top-12px"></div></div><div class="card"><div class="steps">' +
    [
      "Cole o link",
      "Confira o produto",
      "IA cria o texto",
      "Escolha os grupos",
      "Envie ou agende",
    ]
      .map(function (x, i) {
        return (
          '<div class="step"><i>0' + (i + 1) + "</i><b>" + x + "</b></div>"
        );
      })
      .join("") +
    "</div></div></div>" +
    '<div class="card csp-margin-top-16px"><h3>Descobrir produtos no Mercado Livre</h3><p class="muted">A busca geral de anúncios está retornando 403 nesta conexão. O Radar usa o catálogo para descobrir produtos, mas catálogo não confirma preço, estoque nem anúncio comprável. Escolha um anúncio individual, confira preço e disponibilidade e gere o link comissionado no <a href="https://www.mercadolivre.com.br/l/afiliados-gerar-link" target="_blank" rel="noopener noreferrer">portal oficial de afiliados ↗</a>. Como alternativa, cadastre os dados conferidos em <b>Central de ofertas → Nova oferta</b>; a API não preencherá preço/estoque quando não conseguir confirmá-los.</p><div class="field"><label for="marketSearchQuery">Produto para pesquisar</label><input class="input" id="marketSearchQuery" placeholder="Ex.: fone bluetooth, fralda, air fryer" maxlength="120"></div><button class="btn csp-margin-top-12px" data-action="searchMercadoLivreProducts(this)">Buscar no catálogo</button><div id="marketSearchResults" class="list csp-margin-top-12px"></div></div>' +
    recent()
  );
}
function queues() {
  return (
    section(
      "Filas e agendamentos",
      "Defina janelas e intervalos das publicações. Recorrências seguem o fuso da conta e usam os números ativos no revezamento.",
      "+ Nova fila",
      "openQueue()",
    ) +
    '<div class="grid two"><div><div class="list">' +
    (D.queues.length
      ? D.queues
          .map(function (q) {
            var c = cat(q.categoryId);
            return (
              '<div class="row"><div class="intlogo">FQ</div><div class="grow"><b>' +
              esc(q.name) +
              '</b><div class="muted">' +
              (c ? esc(c.name) : "Geral") +
              " · " +
              q.startTime +
              "–" +
              q.endTime +
              " · intervalo " +
              q.intervalMinutes +
              ' min</div></div><span class="pill live">' +
              LABEL[q.status] +
              "</span></div>"
            );
          })
          .join("")
      : empty("Nenhuma fila criada")) +
    '</div></div><div><div class="sectionhead sectionhead-flush"><div><h2>Mensagens recorrentes</h2><p>Ative após validar o destino e o conector.</p></div><button class=\"btn secondary\" data-action=\"openSchedule()\">+ Nova recorrência</button></div><div class="list">' +
    (D.schedules.length
      ? D.schedules
          .map(function (s) {
            return (
              '<div class="row"><div class="grow"><b>' +
              esc(s.name) +
              '</b><div class="muted">' +
              s.recurrence +
              " às " +
              s.sendTime +
              (s.recurrence === 'WEEKLY' ? ' · '+['domingo','segunda','terça','quarta','quinta','sexta','sábado'][s.weekday] : '') +
              (s.onceDate ? ' · '+esc(s.onceDate) : '') +
              (s.nextRunAt ? '<br>Próxima: '+esc(new Date(s.nextRunAt).toLocaleString('pt-BR')) : '') +
              (s.lastError ? '<br>'+esc(s.lastError) : '') +
              '</div></div><span class="pill '+(s.status==='ACTIVE'?'live':'warn')+'">' +
              esc(LABEL[s.status] || s.status) +
              '</span><button class="btn secondary" data-action="status(\'schedule\',\''+s.id+'\',\''+(s.status==='ACTIVE'?'PAUSED':'ACTIVE')+'\')">'+(s.status==='ACTIVE'?'Pausar':'Ativar')+'</button></div>'
            );
          })
          .join("")
      : empty("Nenhuma recorrência")) +
    "</div></div></div>" +
    section("Publicações", "Imagem, texto e link seguem no mesmo envio.") +
    '<div class="list">' +
    (D.publications.length
      ? D.publications.map(publicationRow).join("")
      : empty("Fila vazia")) +
    "</div>"
  );
}
function publicationRow(p) {
  var o = off(p.offerId),
    g = grp(p.groupId);
  return (
    '<div class="row">' +
    (o ? thumb(o) : "") +
    '<div class="grow"><b>' +
    esc(o ? o.title : p.contentType === "MESSAGE" ? "Mensagem recorrente" : "Oferta removida") +
    '</b><div class="muted">' +
    esc(g ? g.name : "Grupo removido") +
    " · " +
    esc(g?.platform || "WHATSAPP") +
    " · " +
    (LABEL[p.status] || p.status) +
    " · " +
    p.mode +
    " · " +
    p.clicks +
    ' cliques</div></div><div class="actions"><button class="btn" ' +
    (p.status === "PUBLISHED" ? "disabled" : "") +
    " data-action=\"share('" +
    p.id +
    "')\">Compartilhar</button><button class=\"btn danger\" data-action=\"removeItem('publication','" +
    p.id +
    "')\">Excluir</button></div></div>"
  );
}
function offers() {
  return (
    section(
      "Central de ofertas",
      "Produtos encontrados, aprovados e publicados.",
      "+ Nova oferta",
      "openOffer()",
    ) +
    '<div class="list">' +
    (D.offers.length
      ? D.offers.map(offerRow).join("")
      : empty("Nenhuma oferta")) +
    "</div>" +
    section(
      "Modelos de mensagens",
      "Formatos prontos inspirados nos exemplos enviados. Preços, descontos e cupons só aparecem quando informados.",
    ) +
    '<div class="grid three">' +
    messageExample(
      "🤯 Impactante",
      "🤯 *OLHA ESSE PREÇO!*\n🔥 Achadinho com preço especial\n\n💗 Kit 3 Escovas de Cabelo\n🏷️ *10% OFF*\nDe: ~R$ 29,99~\n*POR: R$ 26,99* ✅\n\n🔗 *COMPRE AQUI* 👇",
    ) +
    messageExample(
      "🚨 Oferta completa",
      "🚨 *CHEGOU PROMOÇÃO!*\n🛍️ Oferta encontrada para você\n\n💗 Cadeira para Auto\n🏷️ *46% OFF*\nDe: ~R$ 999,90~\n*POR: R$ 539,12* ✅\n\n🔗 *COMPRE AQUI* 👇",
    ) +
    messageExample(
      "🌍 Produtos importados",
      "🌍 *ACHADINHO IMPORTADO!*\n📦 Produto importado em oferta\n\n💗 Produto selecionado\nDe: ~R$ 89,90~\n*POR: R$ 59,90* ✅\n\n🔗 *COMPRE AQUI* 👇",
    ) +
    "</div>"
  );
}
function messageExample(title, text) {
  return (
    '<div class="card"><h3>' +
    title +
    '</h3><div class="callout csp-white-space-pre-wrap" >' +
    esc(text) +
    "</div></div>"
  );
}
function groups() {
  return (
    section(
      "Grupos e canais por categoria",
      "Somente destinos ativos e com ID oficial entram nas filas.",
      "+ Novo destino",
      "openGroup()",
    ) +
    '<div class=\"tablewrap\"><table class=\"table\"><thead><tr><th>Grupo/canal</th><th>Plataforma</th><th>Categoria</th><th>Membros</th><th>Status</th><th>Ação</th></tr></thead><tbody>' +
    D.groups
      .map(function (g) {
        var c = cat(g.categoryId),
          lot = Math.round(
            (Number(g.members || 0) * 100) / Number(g.capacity || 1024),
          ),
          hasId = Boolean(String(g.externalId || "").trim());
        return (
          "<tr><td><b>" +
          esc(g.name) +
          '</b><svg class=\"csp-capacity-bar\" viewBox=\"0 0 100 8\" preserveAspectRatio=\"none\" role=\"img\" aria-label=\"' + Math.min(100, lot) + '% de capacidade\"><rect class=\"csp-capacity-fill\" x=\"0\" y=\"0\" width=\"' + Math.min(100, lot) + '\" height=\"8\" rx=\"4\"></rect></svg><small class=\"muted\">' +
          esc(g.externalId || "ID de destino pendente") +
          '</small><div class="muted">' +
          (g.platform === "TELEGRAM" ? "Telegram" : ({ GROUP: "Grupo", CHANNEL: "Canal", COMMUNITY: "Comunidade" }[g.destinationType] || "Grupo")) +
          '</div></td><td><span class=\"pill ' +
          (g.platform === "TELEGRAM" ? "live" : "") +
          '\">' +
          esc(g.platform || "WHATSAPP") +
          "</span></td><td>" +
          (c ? c.icon + " " + esc(c.name) : "Geral") +
          "</td><td>" +
          g.members +
          " / " +
          g.capacity +
          '</td><td><span class=\"pill ' +
          (g.status === "ACTIVE" && hasId ? "live" : "warn") +
          '\">' +
          (hasId ? LABEL[g.status] : "Configuração pendente") +
          '</span></td><td><div class=\"actions\"><button class=\"btn secondary\" data-action=\"openGroup(\'' +
          g.id +
          "')\">Configurar</button>" +
          (hasId
            ? "<button class=\"btn secondary\" data-action=\"status('group','" +
              g.id +
              "','" +
              (g.status === "ACTIVE" ? "PAUSED" : "ACTIVE") +
              "')\">" +
              (g.status === "ACTIVE" ? "Pausar" : "Ativar") +
              "</button>"
            : "") +
          (g.platform === "TELEGRAM" && hasId
            ? '<button class=\"btn dark\" data-action=\"testTelegram(\'' +
              g.id +
              "')\">Testar</button>"
            : "") +
          "</div></td></tr>"
        );
      })
      .join("") +
    "</tbody></table></div>"
  );
}
function leads() {
  var unique = D.leadStats.reduce(function (s, x) {
      return s + Number(x.unique_leads || 0);
    }, 0),
    joined = D.leadStats.reduce(function (s, x) {
      return s + Number(x.joined || 0);
    }, 0),
    left = D.leadStats.reduce(function (s, x) {
      return s + Number(x.left || 0);
    }, 0),
    members = D.groups.reduce(function (s, g) {
      return s + Number(g.members || 0);
    }, 0);
  return (
    section(
      "Gestão de leads",
      "Retenção, lotação e desempenho real por grupo.",
    ) +
    '<div class="leadhero">' +
    metric("Leads ativos", members, "membros informados") +
    metric("Leads únicos 30d", unique, "sem duplicidade") +
    metric("Entradas 30d", joined, "novos participantes") +
    metric("Saídas 30d", left, "acompanhar retenção") +
    "</div>" +
    section("Raio-X dos grupos", "Capacidade e movimentação.") +
    '<div class="grid three">' +
    D.groups
      .map(function (g) {
        var fill = Math.round(
          (Number(g.members || 0) * 100) / Number(g.capacity || 1024),
        );
        return (
          '<div class="card leadmetric"><span class="muted">' +
          esc(g.name) +
          "</span><b>" +
          fill +
          '%</b><svg class="csp-capacity-bar" viewBox="0 0 100 8" preserveAspectRatio="none" role="img" aria-label="' +
          Math.min(100, fill) +
          '% de capacidade"><rect class="csp-capacity-fill" x="0" y="0" width="' +
          Math.min(100, fill) +
          '" height="8" rx="4"></rect></svg><div class="muted">' +
          g.members +
          " membros · " +
          Math.max(0, g.capacity - g.members) +
          " vagas</div>" +
          (fill >= 90
            ? '<div class="callout csp-margin-top-10px" >Grupo próximo da lotação.</div>'
            : "") +
          "</div>"
        );
      })
      .join("") +
    "</div>"
  );
}
function reportTable(items, label) {
  return (
    '<div class="tablewrap"><table class="table"><thead><tr><th>' +
    label +
    "</th><th>Links</th><th>Cliques</th><th>Vendas</th><th>Conversão</th><th>Comissão</th></tr></thead><tbody>" +
    (items.length
      ? items
          .map(function (x) {
            var clicks = Number(x.clicks || 0),
              sales = Number(x.sales || 0);
            return (
              "<tr><td><b>" +
              esc(x.name || x.title || "—") +
              "</b></td><td>" +
              Number(x.shared || 0) +
              "</td><td>" +
              clicks +
              "</td><td>" +
              sales +
              "</td><td>" +
              (clicks ? ((sales * 100) / clicks).toFixed(1) : "0,0") +
              "%</td><td>" +
              brl(x.commission || 0) +
              "</td></tr>"
            );
          })
          .join("")
      : '<tr><td colspan="6">Sem dados no período.</td></tr>') +
    "</tbody></table></div>"
  );
}
function reports() {
  var r = D.reportsData || {},
    s = r.summary || {},
    max = Math.max(
      1,
      ...(r.daily || []).map(function (x) {
        return Number(x.clicks || 0);
      }),
    );
  return (
    '<div class="sectionhead"><div><h2>Relatórios</h2><p>Resultados reais por período, categoria, grupo, canal e marketplace.</p></div><div class="toolbar"><select class="input" data-change="changeReportDays"><option value="7" ' +
    (reportDays === 7 ? "selected" : "") +
    '>7 dias</option><option value="30" ' +
    (reportDays === 30 ? "selected" : "") +
    '>30 dias</option><option value="90" ' +
    (reportDays === 90 ? "selected" : "") +
    '>90 dias</option><option value="365" ' +
    (reportDays === 365 ? "selected" : "") +
    '>12 meses</option></select><button class="btn" data-action="openSale()">+ Registrar venda</button></div></div><div class="metrics">' +
    metric("Links compartilhados", s.shared || 0, "publicações concluídas") +
    metric("Cliques", s.clicks || 0, "eventos rastreados") +
    metric("Vendas", s.sales || 0, "pedidos não cancelados") +
    metric("Comissões", brl(s.commission || 0), "valor importado") +
    '</div><div class="metrics">' +
    metric("Receita gerada", brl(s.revenue || 0), "valor dos pedidos") +
    metric("Conversão", (s.conversionRate || 0) + "%", "vendas por clique") +
    metric("Ticket médio", brl(s.averageTicket || 0), "por venda") +
    metric("Comissão média", brl(s.averageCommission || 0), "por venda") +
    '</div><div class="callout">Vendas e comissões são importadas dos relatórios oficiais ou registradas manualmente. O sistema não estima valores.</div>' +
    section(
      "Evolução diária",
      "Cliques registrados nos últimos " + reportDays + " dias.",
    ) +
    '<div class="card csp-chart-bars">' +
    (r.daily || [])
      .map(function (x) {
        var h = Math.max(4, Math.round((Number(x.clicks || 0) * 120) / max));
        return (
          '<div title="' +
          esc(x.day) +
          " · " +
          x.clicks +
          ' cliques" class="csp-chart-bar-label"><svg class="csp-daily-bar" viewBox="0 0 10 120" preserveAspectRatio="none" aria-hidden="true"><rect class="csp-daily-bar-fill" x="0" y="' +
          (120 - h) +
          '" width="10" height="' +
          h +
          '" rx="1"></rect></svg><small class="muted">' +
          String(x.day).slice(8, 10) +
          "</small></div>"
        );
      })
      .join("") +
    "</div>" +
    section("Por canal de envio", "Compare WhatsApp e Telegram.") +
    reportTable(r.byChannel || [], "Canal") +
    section("Por marketplace", "Amazon, Shopee e Mercado Livre.") +
    reportTable(r.byPlatform || [], "Marketplace") +
    section("Por categoria", "Descubra os nichos com mais retorno.") +
    reportTable(r.byCategory || [], "Categoria") +
    section("Por grupo", "Compare cliques, vendas e comissão.") +
    reportTable(r.byGroup || [], "Grupo") +
    section("Melhores ofertas", "Ranking por comissão e cliques.") +
    reportTable(r.topOffers || [], "Oferta") +
    section("Saúde dos envios", "Situação das publicações no período.") +
    '<div class="grid three">' +
    (r.delivery || [])
      .map(function (x) {
        return (
          '<div class="card"><span class="pill">' +
          esc(x.status) +
          '</span><b class="csp-stat-total">' +
          x.total +
          "</b></div>"
        );
      })
      .join("") +
    "</div>"
  );
}
function integrations() {
  return (
    section(
      "Integrações",
      "Conecte cada serviço para ativar a automação completa.",
    ) +
    '<div class="grid two"><div class="card">' +
    integration(
      "ML",
      "Mercado Livre",
      "Produtos e OAuth preparados; teste real depende da credencial.",
      "Preparado",
      "connectMercadoLivre()",
    ) +
    integration(
      "SH",
      "Shopee Afiliados",
      "Cadastro seguro das credenciais oficiais; conexão fica pendente até validação da API.",
      "Conectar conta",
      "openMarketplaceSetup('SHOPEE')",
    ) +
    integration(
      "AMZ",
      "Amazon Associados",
      "Tag de associado e credenciais oficiais da API, quando habilitadas na conta.",
      "Conectar conta",
      "openMarketplaceSetup('AMAZON')",
    ) +
    integration(
      "ALI",
      "AliExpress Portals",
      "Preparar App/API e tracking ID fornecidos no portal oficial.",
      "Conectar conta",
      "openMarketplaceSetup('ALIEXPRESS')",
    ) +
    integration(
      "SHN",
      "SHEIN Afiliados",
      "Importar link criado no Centro de Afiliados; API pública automática não confirmada.",
      "Preparar oferta manual",
      "openMarketplaceSetup('SHEIN')",
    ) +
    integration(
      "MAG",
      "Magalu · Conta seller (OAuth)",
      "Conecte sua conta pelo consentimento oficial do ID Magalu. O cadastro das três chaves API não substitui o Client ID/Client Secret OAuth; links de afiliado continuam separados.",
      "Conectar conta",
      "connectMagaluAccount()"
    ) +
    integration(
      "CB",
      "Casas Bahia",
      "Cadastro genérico de credenciais apenas; conector e teste oficial ainda não implementados.",
      "Cadastrar dados · pendente",
      "openMarketplaceSetup('CASAS_BAHIA')",
    ) +
    integration(
      "HOT",
      "Hotmart",
      "Cadastro genérico preparado; fluxo de API específico ainda precisa ser implementado e validado.",
      "Cadastrar dados · pendente",
      "openMarketplaceSetup('HOTMART')",
    ) +
    integration(
      "KB",
      "KaBuM!",
      "Cadastro genérico preparado; API oficial e fluxo de afiliados ainda não validados.",
      "Cadastrar dados · pendente",
      "openMarketplaceSetup('KABUM')",
    ) +
    integration(
      "AME",
      "Americanas",
      "Cadastro genérico de credenciais apenas; conector e teste oficial ainda não implementados.",
      "Cadastrar dados · pendente",
      "openMarketplaceSetup('AMERICANAS')",
    ) +
    integration(
      "LOM",
      "Lomadee",
      "Receber credencial; disponibilidade e API precisam ser confirmadas antes de ativar.",
      "Conectar conta",
      "openMarketplaceSetup('LOMADEE')",
    ) +
    integration(
      "AWIN",
      "Awin Afiliados",
      "Consultar programas aprovados e feeds de produtos pela API oficial.",
      "Conectar conta",
      "openMarketplaceSetup('AWIN')",
    ) +
    integration(
      "RAK",
      "Rakuten Advertising",
      "Pesquisar produtos e gerar deeplinks rastreáveis com SubID.",
      "Conectar conta",
      "openMarketplaceSetup('RAKUTEN')",
    ) +
    integration(
      "ADM",
      "Admitad",
      "Consultar programas afiliados e gerar deeplinks com SubIDs e renovação de token.",
      "Conectar conta",
      "openMarketplaceSetup('ADMITAD')",
    ) +
    integration(
      "WA",
      "WhatsApp",
      "Envio com imagem via ponte segura com n8n.",
      "Configurar",
    ) +
    integration(
      "TG",
      "Telegram",
      "Bot oficial envia imagem, texto, botão e link.",
      "Disponível",
    ) +
    integration(
      "META",
      "Facebook e Instagram",
      "Publicação oficial aguarda autorização OAuth da conta profissional.",
      "Conectar",
    ) +
    integration(
      "MAIL",
      "Gmail e Outlook",
      "Entrega transacional já funciona; remetente próprio exige domínio ou OAuth.",
      "Disponível",
    ) +
    integration(
      "GEM",
      "Google Gemini",
      "Textos, anúncios, cupons, legendas, carrosséis e roteiros testados.",
      "Testado",
    ) +
    integration(
      "GPT",
      "OpenAI e Claude",
      "Conectores prontos; cada provedor exige sua própria chave.",
      "Credencial",
    ) +
    integration(
      "IMG",
      "IA de imagem",
      "Provedor principal + Runway + cartão promocional automático em caso de limite.",
      "Disponível",
    ) +
    integration(
      "VID",
      "IA de vídeo",
      "Fila real de renderização Runway, consulta de estado e armazenamento protegido.",
      "Disponível",
    ) +
    '</div><div class="card"><h3>Teste interno do fluxo</h3><p class="muted">Valida produto, preço, imagem e link; classifica a categoria, escolhe grupos e monta a mensagem sem envio externo.</p><button class="btn dark" data-action="runSimulation()">Executar teste seguro</button><div id="simulationResult" class="callout csp-margin-top-12px csp-hidden"></div><h3 class="csp-margin-top-22px" >Estados reais</h3><p class="muted">Testado: executado com sucesso neste projeto.<br>Disponível: código executável no projeto.<br>Preparado: telas e banco prontos, credencial/API pendente.<br>Credencial: depende de autorização do provedor.<br>Parcial: há recurso seguro alternativo, mas não acesso total à conta externa.</p><div class="callout">Nenhuma integração externa é marcada como ativa sem teste real da autorização do titular.</div></div></div>'
  );
}
function integration(code, name, desc, state, action) {
  var needsSetup=['Cadastrar chaves','Cadastrar chaves API seller','Cadastrar dados · pendente','Preparar oferta manual','Importar link'].indexOf(state)!==-1;
  var initialStatus=needsSetup?'Não configurada':state;
  var actionLabel=action==='connectMercadoLivre()'?'Conectar conta':
    code==='MAG'?'Conectar conta seller':
    code==='SHN'?'Importar link oficial':
    action&&action.indexOf('openMarketplaceSetup(')===0?'Conectar conta':
    action?'Abrir configuração':'';
  return (
    '<div class="integration" data-integration-code="'+esc(code)+'"><div class="intlogo">' +
    code +
    '</div><div class="grow"><b>' +
    name +
    '</b><div class="muted">' +
    desc +
    '</div>' +
    (action ? '<button type="button" class="btn secondary csp-margin-top-10px" data-action="' + action + '">' + actionLabel + '</button>' : '') +
    '</div><span class="pill ' +
    (initialStatus === "Testado" || initialStatus === "Disponível" ? "live" : "warn") +
    '">' +
    initialStatus +
    "</span></div>"
  );
}
function studio() {
  var assets = D.growth.assets || [],
    jobs = D.growth.mediaJobs || [];
  return (
    section(
      "Estúdio de IA multimodelo",
      "Gere textos, anúncios, cupons, imagens e vídeos reais com fatos validados.",
    ) +
    '<div class="grid two"><div class="card"><div class="formgrid">' +
    select(
      "Conteúdo",
      "studioType",
      '<option value="PROMO_TEXT">Texto promocional</option><option value="COUPON_TEXT">Texto de cupom</option><option value="INSTAGRAM_CAPTION">Legenda Instagram</option><option value="FACEBOOK_POST">Post Facebook</option><option value="AD_COPY">Anúncios</option><option value="VIDEO_SCRIPT">Roteiro de vídeo</option><option value="CAROUSEL">Carrossel</option>',
    ) +
    select(
      "Modelo",
      "studioModel",
      '<option value="gemini">Google Gemini — ativo</option><option value="gpt-mini">OpenAI rápido</option><option value="gpt">OpenAI avançado</option><option value="haiku">Claude rápido</option><option value="sonnet">Claude avançado</option>',
    ) +
    "</div>" +
    field(
      "Produto ou tema",
      "studioTitle",
      "text",
      'placeholder="Ex.: Air Fryer 4L"',
    ) +
    '<div class="formgrid">' +
    field("Preço confirmado", "studioPrice", "text", 'placeholder="299,90"') +
    field("Cupom confirmado", "studioCoupon", "text", 'placeholder="CASA20"') +
    "</div>" +
    field(
      "Link oficial de afiliado",
      "studioLink",
      "url",
      'placeholder="https://..."',
    ) +
    '<div class="formgrid">' +
    field(
      "Público",
      "studioAudience",
      "text",
      'placeholder="Famílias e casa"',
    ) +
    field(
      "Tom",
      "studioTone",
      "text",
      'value="chamativo, confiável e direto"',
    ) +
    "</div>" +
    select(
      "Formato da arte",
      "studioAspect",
      '<option value="1:1">Feed quadrado</option><option value="4:5">Feed vertical</option><option value="9:16">Stories e Reels</option><option value="16:9">Facebook e YouTube</option>',
    ) +
    '<div class="actions"><button class="btn" data-action="generateStudioText()">Gerar conteúdo</button><button class="btn dark" data-action="generateStudioImage()">Gerar arte</button><button class="btn green" data-action="generateStudioVideo()">Renderizar vídeo</button></div><div id="studioResult" class="callout csp-hidden csp-margin-top-14px csp-white-space-pre-wrap"></div></div><div class="card"><h3>Continuidade automática</h3><p class="muted">Imagem tenta o provedor principal, depois o Runway e, se ambos estiverem ocupados, entrega um cartão promocional seguro. Vídeos são enviados a uma fila real de renderização e armazenados na conta.</p><div class="steps csp-grid-template-columns-1fr-1fr" >' +
    [
      "Copy validada",
      "Imagem com fallback",
      "Vídeo assíncrono",
      "Arquivo protegido",
    ]
      .map(function (x, i) {
        return (
          '<div class="step"><i>AI' + (i + 1) + "</i><b>" + x + "</b></div>"
        );
      })
      .join("") +
    "</div></div></div>" +
    section("Fila de mídia", "Acompanhe imagens e vídeos em processamento.") +
    '<div class="grid three">' +
    (jobs.length
      ? jobs
          .slice(0, 9)
          .map(function (x) {
            return (
              '<div class="card"><span class="pill ' +
              (x.status === "COMPLETED" || x.status === "FALLBACK_COMPLETED"
                ? "live"
                : x.status === "FAILED"
                  ? ""
                  : "warn") +
              '">' +
              esc(x.status) +
              "</span><h3>" +
              esc(x.title) +
              '</h3><div class="muted">' +
              esc(x.kind) +
              " · " +
              esc(x.provider || "aguardando") +
              "</div>" +
              (x.outputUrl
                ? '<a class="btn secondary csp-margin-top-12px" target="_blank" href="' +
                  esc(x.outputUrl) +
                  '" >Abrir arquivo</a>'
                : "") +
              (x.lastError
                ? '<div class="muted">' + esc(x.lastError) + "</div>"
                : "") +
              "</div>"
            );
          })
          .join("")
      : empty("Nenhuma mídia na fila")) +
    "</div>" +
    section("Biblioteca de conteúdo", "Últimos textos e mídias gerados.") +
    '<div class="grid three">' +
    (assets.length
      ? assets
          .slice(0, 12)
          .map(function (x) {
            var media = x.assetUrl
              ? x.kind === "VIDEO"
                ? '<video controls src="' +
                  esc(x.assetUrl) +
                  '" class="csp-media-video"></video>'
                : '<img src="' +
                  esc(x.assetUrl) +
                  '" alt="Arte gerada" class="csp-media-image">'
              : "";
            return (
              '<div class="card">' +
              media +
              '<span class="pill">' +
              esc(x.kind) +
              '</span><div class="muted csp-prewrap-scroll-180">' +
              esc(x.content || "Mídia para " + x.channel) +
              "</div></div>"
            );
          })
          .join("")
      : empty("Nenhum conteúdo gerado")) +
    "</div>"
  );
}
function growth() {
  var g = D.growth || {},
    connections = g.connections || [],
    campaigns = g.campaigns || [],
    coupons = g.coupons || [];
  return (
    section(
      "Tráfego, cupons e redes sociais",
      "Organize campanhas e prepare as conexões oficiais.",
      "+ Nova campanha",
      "openCampaign()",
    ) +
    '<div class="metrics">' +
    metric("Campanhas", campaigns.length, "com UTM e orçamento") +
    metric(
      "Cupons ativos",
      coupons.filter(function (x) {
        return x.status === "ACTIVE";
      }).length,
      "códigos cadastrados",
    ) +
    metric("Canais preparados", connections.length, "Meta e e-mail") +
    metric("Conteúdos IA", (g.assets || []).length, "biblioteca recente") +
    '</div><div class="grid two"><div class="card"><div class="sectionhead sectionhead-flush"><div><h2>Cupons</h2><p>Código, validade e link oficial.</p></div><button class="btn" data-action="openCoupon()">+ Cupom</button></div>' +
    (coupons.length
      ? coupons
          .map(function (x) {
            return (
              '<div class="integration"><div class="intlogo">%</div><div class="grow"><b>' +
              esc(x.code) +
              " · " +
              esc(x.title) +
              '</b><div class="muted">' +
              esc(x.marketplace) +
              " · " +
              esc(x.discountText || "condição informada pela loja") +
              '</div></div><span class="pill live">' +
              esc(x.status) +
              "</span></div>"
            );
          })
          .join("")
      : empty("Nenhum cupom cadastrado")) +
    '</div><div class="card"><h3>Facebook, Instagram e e-mail</h3>' +
    ["INSTAGRAM", "FACEBOOK", "GMAIL", "OUTLOOK"]
      .map(function (n) {
        var x = connections.find(function (c) {
          return c.network === n;
        });
        return (
          '<div class="integration"><div class="intlogo">' +
          n.slice(0, 2) +
          '</div><div class="grow"><b>' +
          n +
          '</b><div class="muted">' +
          (x
            ? esc(x.displayName || "Identificação salva")
            : "OAuth/credencial ainda não cadastrada") +
          '</div></div><span class="pill ' +
          (x && x.status === "ACTIVE" ? "live" : "warn") +
          '">' +
          esc(x ? x.status : "PREPARADO") +
          '</span><button class="btn secondary" data-action="openSocial(\'' +
          n +
          "')\">Configurar</button></div>"
        );
      })
      .join("") +
    '<div class="callout">Publicação automática real no Instagram/Facebook exige conta profissional, aplicativo Meta, permissões e aprovação. Gmail/Outlook podem receber testes; envio como sua caixa exige OAuth próprio.</div><button class="btn secondary csp-margin-top-12px"  data-action="openEmailTest()">Testar entrega por e-mail</button></div></div>' +
    section(
      "Campanhas e Ads",
      "Planejamento com UTM; ativação nas plataformas depende das credenciais oficiais.",
    ) +
    '<div class="tablewrap"><table class="table"><thead><tr><th>Campanha</th><th>Canal</th><th>Objetivo</th><th>Orçamento/dia</th><th>UTM</th><th>Status</th></tr></thead><tbody>' +
    (campaigns.length
      ? campaigns
          .map(function (x) {
            return (
              "<tr><td><b>" +
              esc(x.name) +
              "</b></td><td>" +
              esc(x.platform) +
              "</td><td>" +
              esc(x.objective) +
              "</td><td>" +
              brl(x.dailyBudget) +
              "</td><td>" +
              esc(x.utmSource) +
              " / " +
              esc(x.utmCampaign) +
              '</td><td><span class="pill">' +
              esc(x.status) +
              "</span></td></tr>"
            );
          })
          .join("")
      : '<tr><td colspan="6">Nenhuma campanha.</td></tr>') +
    "</tbody></table></div>"
  );
}
function socialAgent() {
  var so = D.social || {},
    s = so.settings || {},
    p = so.posts || [],
    c = so.counts || {},
    channels = s.channels || [],
    connections = so.connections || [];
  function connection(n) {
    return (
      connections.find(function (x) {
        return x.network === n;
      }) || { status: "PENDING" }
    );
  }
  function postRow(x) {
    return (
      '<div class="row"><img class="thumb" src="' +
      esc(x.imageUrl) +
      '" alt="Imagem da oferta"><div class="grow"><b>' +
      esc(x.title) +
      '</b><div class="muted">' +
      esc(x.channel) +
      ' · <span class="pill ' +
      (x.status === "PUBLISHED"
        ? "live"
        : x.status === "BLOCKED" || x.status === "FAILED"
          ? "warn"
          : "") +
      '">' +
      esc(LABEL[x.status] || x.status) +
      "</span> · " +
      Number(x.clicks || 0) +
      ' cliques</div><div class="muted csp-prewrap-scroll-92">' +
      esc(x.message) +
      "</div>" +
      (x.lastError
        ? '<div class="muted csp-color-b72e2e" >' +
          esc(x.lastError) +
          "</div>"
        : "") +
      '</div><div class="actions">' +
      (x.status === "DRAFT"
        ? '<button class="btn green" data-action="approveSocialPost(\'' +
          x.id +
          "')\">Aprovar</button>"
        : "") +
      (["FAILED", "BLOCKED"].includes(x.status)
        ? '<button class="btn secondary" data-action="retrySocialPost(\'' +
          x.id +
          "')\">Tentar novamente</button>"
        : "") +
      (x.status !== "PUBLISHED"
        ? '<button class="btn danger" data-action="removeSocialPost(\'' +
          x.id +
          "')\">Excluir</button>"
        : "") +
      "</div></div>"
    );
  }
  return (
    section(
      "Radar Social",
      "A IA prepara mensagens factuais, agenda e publica links rastreáveis nos canais autorizados.",
    ) +
    '<div class="metrics">' +
    metric(
      "Piloto",
      LABEL[s.status] || s.status || "Pausado",
      "execução automática a cada hora",
    ) +
    metric("Em revisão", c.DRAFT || 0, "aprovação opcional") +
    metric(
      "Na fila",
      Number(c.READY || 0) + Number(c.SCHEDULED || 0) + Number(c.RETRY || 0),
      "prontas para publicar",
    ) +
    metric("Publicadas", c.PUBLISHED || 0, "com cliques rastreados") +
    '</div><div class="grid two"><div class="card"><h3>Piloto Automático Social</h3><div class="formgrid">' +
    select(
      "Estado",
      "socialStatus",
      '<option value="ACTIVE" ' +
        (s.status === "ACTIVE" ? "selected" : "") +
        '>Ativo</option><option value="PAUSED" ' +
        (s.status !== "ACTIVE" ? "selected" : "") +
        ">Pausado</option>",
    ) +
    select(
      "Revisão humana",
      "socialApproval",
      '<option value="true" ' +
        (s.requireApproval !== false ? "selected" : "") +
        '>Exigir aprovação</option><option value="false" ' +
        (s.requireApproval === false ? "selected" : "") +
        ">Publicar automaticamente</option>",
    ) +
    '</div><div class="formgrid">' +
    select(
      "Redes",
      "socialChannels",
      '<option value="BOTH" ' +
        (channels.length === 2 ? "selected" : "") +
        '>Instagram e Facebook</option><option value="INSTAGRAM" ' +
        (channels.length === 1 && channels[0] === "INSTAGRAM"
          ? "selected"
          : "") +
        '>Somente Instagram</option><option value="FACEBOOK" ' +
        (channels.length === 1 && channels[0] === "FACEBOOK"
          ? "selected"
          : "") +
        ">Somente Facebook</option>",
    ) +
    field(
      "Nota mínima da oferta",
      "socialMinScore",
      "number",
      'min="0" max="100" value="' + esc(s.minScore || 70) + '"',
    ) +
    '</div><div class="formgrid">' +
    field(
      "Máximo por dia",
      "socialMax",
      "number",
      'min="1" max="50" value="' + esc(s.maxPostsPerDay || 6) + '"',
    ) +
    field(
      "Intervalo em minutos",
      "socialInterval",
      "number",
      'min="15" max="1440" value="' + esc(s.intervalMinutes || 60) + '"',
    ) +
    '</div><div class="formgrid">' +
    field(
      "Início",
      "socialStart",
      "time",
      'value="' + esc(s.startTime || "08:00") + '"',
    ) +
    field(
      "Término",
      "socialEnd",
      "time",
      'value="' + esc(s.endTime || "22:00") + '"',
    ) +
    '</div><div class="actions"><button class="btn" data-action="saveSocialSettings()">Salvar e ativar</button><button class="btn secondary" data-action="generateSocialQueue()">Gerar mensagens agora</button><button class="btn dark" data-action="runSocialQueue()">Executar fila</button></div><div class="callout csp-margin-top-14px" >A IA não inventa preço, desconto, cupom, frete ou urgência. Cada link aponta para o rastreador do Radar e depois redireciona ao link de afiliado cadastrado.</div></div><div class="card"><h3>Conexões oficiais Meta</h3>' +
    ["INSTAGRAM", "FACEBOOK"]
      .map(function (n) {
        var x = connection(n);
        return (
          '<div class="integration"><div class="intlogo">' +
          n.slice(0, 2) +
          '</div><div class="grow"><b>' +
          n +
          '</b><div class="muted">' +
          esc(x.displayName || "Página/conta ainda não autorizada") +
          (x.lastError ? " · " + esc(x.lastError) : "") +
          '</div></div><span class="pill ' +
          (x.status === "ACTIVE" ? "live" : "warn") +
          '">' +
          esc(x.status || "PENDING") +
          "</span></div>"
        );
      })
      .join("") +
    '<button class="btn secondary" data-action="testMetaConnection()">Testar autorização Meta</button><h3 class="csp-margin-top-22px" >Agente especialista</h3><div class="formgrid">' +
    select(
      "Tarefa",
      "agentTask",
      '<option value="PROFILE_KIT">Criar perfil profissional</option><option value="CONTENT_PLAN">Calendário de conteúdo</option><option value="POST_PACKAGE">Pacote Feed, Stories e Reels</option><option value="ADS_STRATEGY">Estratégia de anúncios</option><option value="DESIGN_BRIEF">Briefing de design</option><option value="GROWTH_AUDIT">Auditoria de crescimento</option>',
    ) +
    select(
      "Canal",
      "agentChannel",
      '<option value="BOTH">Instagram e Facebook</option><option value="INSTAGRAM">Instagram</option><option value="FACEBOOK">Facebook</option><option value="META">Meta Ads</option>',
    ) +
    "</div>" +
    field(
      "Produto, campanha ou tema",
      "agentTopic",
      "text",
      'value="Radar Promo Brasil — ofertas e cupons"',
    ) +
    '<div class="formgrid">' +
    field(
      "Objetivo",
      "agentGoal",
      "text",
      'value="aumentar cliques qualificados e vendas"',
    ) +
    field(
      "Público",
      "agentAudience",
      "text",
      'value="pessoas que procuram promoções confiáveis no Brasil"',
    ) +
    '</div><button class="btn" data-action="runSocialAgent()">Executar agente</button><div id="agentResult" class="callout csp-hidden csp-margin-top-14px csp-white-space-pre-wrap"></div></div></div>' +
    section(
      "Fila de posts",
      "Cada postagem mostra rede, estado, texto e rastreamento.",
    ) +
    '<div class="list">' +
    (p.length
      ? p.map(postRow).join("")
      : empty("Nenhuma postagem social gerada")) +
    "</div>"
  );
}
function compliancePanel() {
  var r = D.compliance || {},
    s = r.summary || {},
    channels = r.byChannel || [],
    recent = r.recent || [],
    excluded = r.excluded || {};
  return (
    section(
      "Conformidade da janela de mensagens",
      "Monitoramento próprio do Radar para Instagram, Messenger e WhatsApp nos últimos 7 dias.",
    ) +
    '<div class="metrics">' +
    metric(
      "Conformidade",
      (s.complianceRate == null ? 100 : s.complianceRate) + "%",
      "tentativas permitidas",
    ) +
    metric("Tentativas", s.attempts || 0, "mensagens individuais avaliadas") +
    metric("Bloqueadas", s.blocked || 0, "impedidas antes do envio") +
    metric("Permitidas", s.allowed || 0, "dentro das regras") +
    '</div><div class="grid three">' +
    channels
      .map(function (x) {
        return (
          '<div class="card"><span class="pill ' +
          (x.status === "COMPLIANT" ? "live" : "warn") +
          '">' +
          (x.status === "COMPLIANT" ? "EM CONFORMIDADE" : "ATENÇÃO") +
          "</span><h3>" +
          esc(x.channel) +
          '</h3><p class="muted">' +
          x.attempts +
          " tentativa(s) · " +
          x.blocked +
          " bloqueada(s)</p></div>"
        );
      })
      .join("") +
    '</div><div class="callout csp-margin-top-14px" ><b>Importante:</b> mensagens promocionais automáticas individuais são bloqueadas fora da janela de 24 horas, salvo mecanismo oficial compatível e consentimento registrado. ' +
    Number(excluded.publicPosts || 0) +
    " post(s) público(s) e " +
    Number(excluded.groupPosts || 0) +
    " envio(s) em grupo foram excluídos deste cálculo porque não são DMs individuais.</div>" +
    section(
      "Ocorrências recentes",
      "Motivo, canal e decisão de cada tentativa.",
    ) +
    '<div class="tablewrap"><table class="table"><thead><tr><th>Data</th><th>Canal</th><th>Tipo</th><th>Decisão</th><th>Motivo</th></tr></thead><tbody>' +
    (recent.length
      ? recent
          .map(function (x) {
            return (
              "<tr><td>" +
              new Date(x.createdAt).toLocaleString("pt-BR") +
              "</td><td>" +
              esc(x.channel) +
              "</td><td>" +
              esc(x.eventType) +
              '</td><td><span class="pill ' +
              (x.decision === "ALLOWED" ? "live" : "warn") +
              '">' +
              esc(x.decision) +
              "</span></td><td>" +
              esc(x.reason) +
              "</td></tr>"
            );
          })
          .join("")
      : '<tr><td colspan="5">Boas! Nenhum envio incompatível foi tentado nos últimos 7 dias.</td></tr>') +
    "</tbody></table></div>"
  );
}
function security() {
  var g = D.growth || {},
    s = g.security || {};
  return (
    compliancePanel() +
    section(
      "Segurança de dados e LGPD",
      "Controles técnicos e registro de solicitações. Não substitui auditoria jurídica ou teste de invasão independente.",
      "Configurar",
      "openSecurity()",
    ) +
    '<div class="grid three">' +
    (g.checks || [])
      .map(function (x) {
        return (
          '<div class="card"><span class="pill ' +
          (x.status === "ACTIVE" ? "live" : "warn") +
          '">' +
          esc(x.status) +
          "</span><h3>" +
          esc(x.name) +
          '</h3><p class="muted">' +
          esc(x.detail) +
          "</p></div>"
        );
      })
      .join("") +
    '</div><div class="grid two">' +
    section(
      "Direitos do titular",
      "Acesso, correção, exclusão, portabilidade e revogação.",
      "Nova solicitação",
      "openPrivacyRequest()",
    ) +
    '<div></div><div class="card"><h3>Política operacional</h3><p class="muted">Retenção: ' +
    esc(s.retentionDays || 365) +
    " dias · limpeza " + (s.retentionEnabled ? "ativada" : "desativada") + "<br>Consentimento para marketing: " +
    (s.marketingConsentRequired === false ? "opcional" : "obrigatório") +
    "<br>Exportação de dados: " +
    (s.dataExportEnabled === false ? "desativada" : "permitida") +
    "<br>Incidentes: " +
    esc(s.incidentEmail || "e-mail não configurado") +
    '</p></div><div class="card"><h3>Solicitações recentes</h3>' +
    ((g.privacyRequests || []).length
      ? (g.privacyRequests || [])
          .slice(0, 8)
          .map(function (x) {
            return (
              '<div class="integration"><div class="grow"><b>' +
              esc(x.requestType) +
              '</b><div class="muted">' +
              esc(x.requesterEmail) +
              '</div></div><span class="pill warn">' +
              esc(x.status) +
              '</span>' + (x.status==='DONE' ? '' : '<button class="btn secondary" data-action="openPrivacyProcess(\''+x.id+'\')">'+(x.identityVerifiedAt?'Processar':'Verificar identidade')+'</button>') + '</div>'
            );
          })
          .join("")
      : '<p class="muted">Nenhuma solicitação registrada.</p>') +
    "</div></div>" +
    '<div class="card"><h3>Exportação e backup da conta</h3><p class="muted">Portabilidade sem credenciais. Backup privado inclui registros e uploads; restauração é verificada em banco isolado.</p><div class="actions"><button class="btn secondary" data-action="downloadPrivate(\'/api/privacy\',\'radar-portabilidade.json\')">Exportar meus dados</button><button class="btn" data-action="createBackup(this)">Criar backup</button><button class="btn secondary" data-action="listBackups(this)">Ver backups</button><button class="btn secondary" data-action="previewRetention()">Prévia da limpeza</button></div><div id="backupList" class="list csp-margin-top-12px" ></div></div>' +
    section(
      "Eventos de segurança",
      "Trilha de auditoria sem expor tokens ou conteúdo sensível.",
    ) +
    '<div class="card"><ul class="activity">' +
    ((g.securityEvents || []).length
      ? (g.securityEvents || [])
          .map(function (x) {
            return (
              '<li><i class="a-dot"></i><div><b>' +
              esc(x.eventType) +
              '</b><div class="muted">Severidade ' +
              esc(x.severity) +
              "</div></div><time>" +
              new Date(x.createdAt).toLocaleDateString("pt-BR") +
              "</time></li>"
            );
          })
          .join("")
      : '<li><i class="a-dot"></i><div><b>Nenhum incidente registrado</b></div></li>') +
    "</ul></div>"
  );
}
function accountView() {
  var s = D.suite || {},
    a = s.account || {},
    sf = s.storefront || {},
    stores = s.marketplaces || [],
    con = s.connections || [],
    tg = s.telegramConnections || [];
  return (
    section(
      "Conta, vitrine e conexões",
      "Configurações separadas para a sua operação.",
    ) +
    '<div class="metrics">' +
    metric("Plano", a.plan || "TRIAL", "teste de 7 dias") +
    metric("WhatsApps", con.length, "números cadastrados") +
    metric("Telegram", tg.length, "bots conectados") +
    metric(
      "Marketplaces",
      stores.filter(function (x) {
        return x.status === "ACTIVE";
      }).length +
        " / " +
        stores.length,
      "integrações validadas",
    ) +
    '</div><div class="grid two"><div class="card"><h3>Marketplaces e SubIDs</h3>' +
    stores
      .map(function (x) {
        return (
          '<div class="integration"><div class="intlogo">' +
          (x.marketplace === "MERCADO_LIVRE"
            ? "ML"
            : x.marketplace.slice(0, 3)) +
          '</div><div class="grow"><b>' +
          esc(x.marketplace.replaceAll("_", " ")) +
          '</b><div class="muted">' +
          (x.affiliateTag
            ? "Identificação cadastrada"
            : "Aguardando identificação oficial") +
          " · " +
          esc(x.status) +
          '</div></div><button class="btn secondary" data-action="openMarketplace(\'' +
          x.marketplace +
          "')\">Configurar</button></div>"
        );
      })
      .join("") +
    '<h3 class="csp-margin-top-22px" >Vitrine pública</h3><div class="callout">/vitrine?loja=' +
    esc(a.slug || "") +
    '</div><button class="btn csp-margin-top-12px"  data-action="openStorefront()">Editar vitrine</button> <a class="btn secondary" target="_blank" href="/vitrine?loja=' +
    encodeURIComponent(a.slug || "") +
    '">Visualizar</a></div><div class="card"><h3>Conexões WhatsApp</h3>' +
    whatsappConnectionsMarkup() +
    '<h3 class="csp-margin-top-24px" >Bots do Telegram</h3>' +
    (tg.length
      ? tg
          .map(function (x) {
            return (
              '<div class="integration"><div class="intlogo">TG</div><div class="grow"><b>' +
              esc(x.name) +
              '</b><div class="muted">@' +
              esc(x.botUsername || "bot") +
              " · " +
              esc(x.status) +
              " · prioridade " +
              x.priority +
              '</div></div><button class="btn secondary" data-action="toggleTelegram(\'' +
              x.id +
              "','" +
              (x.status === "ACTIVE" ? "PAUSED" : "ACTIVE") +
              "')\">" +
              (x.status === "ACTIVE" ? "Pausar" : "Ativar") +
              "</button></div>"
            );
          })
          .join("")
      : empty("Nenhum bot conectado")) +
    '<button class="btn csp-margin-top-12px"  data-action="openTelegramConnection()">+ Conectar bot</button></div></div><div class="callout csp-margin-top-14px" >O bot do Telegram precisa ser administrador do grupo ou canal. Credenciais nunca aparecem novamente na tela.</div>'
  );
}
function render() {
  nav();
  var f = {
    dashboard: dashboard,
    radar: function () {
      return groupPage("radar");
    },
    offers: function(){return groupPage("offers");},
    publishing: function () {
      return groupPage("publishing");
    },
    channels: function () {
      return groupPage("channels");
    },
    content: function () {
      return groupPage("content");
    },
    reports: reports,
    settings: function () {
      return groupPage("settings");
    },
    quick: quick,
    monitoring: monitoring,
  };
  document.getElementById("content").innerHTML =
    '<section class="view on">' + f[current]() + "</section>";
  loadMarketplaceStatus();
}
function catOpts() {
  return D.categories
    .map(function (c) {
      return (
        '<option value="' +
        c.id +
        '">' +
        c.icon +
        " " +
        esc(c.name) +
        "</option>"
      );
    })
    .join("");
}
function groupOpts() {
  return D.groups
    .filter(function (g) {
      return g.status === "ACTIVE";
    })
    .map(function (g) {
      return '<option value="' + g.id + '">' + esc(g.name) + "</option>";
    })
    .join("");
}
function studioData() {
  return {
    type: document.querySelector('[name="studioType"]').value,
    model: document.querySelector('[name="studioModel"]').value,
    title: document.querySelector('[name="studioTitle"]').value,
    price: document.querySelector('[name="studioPrice"]').value,
    coupon: document.querySelector('[name="studioCoupon"]').value,
    link: document.querySelector('[name="studioLink"]').value,
    audience: document.querySelector('[name="studioAudience"]').value,
    tone: document.querySelector('[name="studioTone"]').value,
    aspect: document.querySelector('[name="studioAspect"]').value,
  };
}
async function runSocialAgent() {
  var box = document.getElementById("agentResult");
  box.classList.remove("csp-hidden");
  box.textContent = "Radar Social está preparando a estratégia...";
  var body = {
    task: document.querySelector('[name="agentTask"]').value,
    channel: document.querySelector('[name="agentChannel"]').value,
    topic: document.querySelector('[name="agentTopic"]').value,
    goal: document.querySelector('[name="agentGoal"]').value,
    audience: document.querySelector('[name="agentAudience"]').value,
  };
  try {
    var r = await fetch("/api/agents/social-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
      b = await r.json();
    if (!r.ok) throw Error(b.error);
    box.textContent = (b.notice ? b.notice + "\n\n" : "") + b.content;
    toast("Estratégia criada e salva na biblioteca");
  } catch (e) {
    box.textContent = e.message;
  }
}
async function saveSocialSettings() {
  try {
    var channel = document.querySelector('[name="socialChannels"]').value,
      channels = channel === "BOTH" ? ["INSTAGRAM", "FACEBOOK"] : [channel];
    await socialCall("PUT", {
      action: "SETTINGS",
      status: document.querySelector('[name="socialStatus"]').value,
      autoGenerate: true,
      requireApproval:
        document.querySelector('[name="socialApproval"]').value === "true",
      channels: channels,
      minScore: Number(document.querySelector('[name="socialMinScore"]').value),
      maxPostsPerDay: Number(
        document.querySelector('[name="socialMax"]').value,
      ),
      intervalMinutes: Number(
        document.querySelector('[name="socialInterval"]').value,
      ),
      startTime: document.querySelector('[name="socialStart"]').value,
      endTime: document.querySelector('[name="socialEnd"]').value,
    });
    show("socialagent");
    toast("Piloto automático atualizado");
  } catch (e) {
    toast(e.message);
  }
}
async function generateSocialQueue() {
  try {
    var b = await socialCall("POST", { action: "GENERATE", limit: 6 });
    show("socialagent");
    toast(
      b.generated
        ? b.generated + " mensagem(ns) criada(s)"
        : "Nenhuma oferta elegível nova",
    );
  } catch (e) {
    toast(e.message);
  }
}
async function runSocialQueue() {
  try {
    var b = await socialCall("POST", { action: "RUN" });
    show("socialagent");
    toast(
      b.published
        ? b.published + " post(s) publicado(s)"
        : b.blocked
          ? "Fila pronta; falta autorizar a Meta"
          : "Fila processada",
    );
  } catch (e) {
    toast(e.message);
  }
}
async function testMetaConnection() {
  try {
    var b = await socialCall("POST", { action: "TEST_META" });
    show("socialagent");
    toast(
      b.ok
        ? "Meta autorizada e validada"
        : b.error || "Autorização Meta incompleta",
    );
  } catch (e) {
    toast(e.message);
  }
}
async function approveSocialPost(id) {
  try {
    await socialCall("PUT", { action: "APPROVE", id: id });
    show("socialagent");
    toast("Post aprovado e enviado à fila");
  } catch (e) {
    toast(e.message);
  }
}
async function retrySocialPost(id) {
  try {
    await socialCall("PUT", { action: "RETRY", id: id });
    show("socialagent");
    toast("Nova tentativa agendada");
  } catch (e) {
    toast(e.message);
  }
}
async function removeSocialPost(id) {
  if (!confirm("Excluir esta postagem da fila?")) return;
  try {
    await socialCall("DELETE", null, "?id=" + encodeURIComponent(id));
    show("socialagent");
    toast("Postagem removida");
  } catch (e) {
    toast(e.message);
  }
}
async function generateStudioText() {
  var box = document.getElementById("studioResult");
  box.classList.remove("csp-hidden");
  box.textContent = "A IA está criando e validando o conteúdo...";
  try {
    var r = await fetch("/api/ai/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studioData()),
      }),
      b = await r.json();
    if (!r.ok) throw Error(b.error);
    box.textContent = (b.notice ? b.notice + "\n\n" : "") + b.content;
    await load();
    show("studio");
    toast("Conteúdo salvo na biblioteca");
  } catch (e) {
    box.textContent = e.message;
  }
}
async function generateStudioImage() {
  var x = studioData(),
    box = document.getElementById("studioResult");
  if (!x.title) return toast("Informe o produto ou tema.");
  box.classList.remove("csp-hidden");
  box.textContent =
    "Gerando arte. Se o provedor estiver ocupado, o fallback será usado automaticamente...";
  try {
    var r = await fetch("/api/ai/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: x.title,
          style: x.tone,
          aspect: x.aspect,
          channel: "INSTAGRAM",
        }),
      }),
      b = await r.json();
    if (!r.ok) throw Error(b.error);
    if (r.status === 202) {
      box.textContent = b.notice || "Arte em processamento.";
      await pollMedia(b.jobId, box);
      return;
    }
    box.innerHTML =
      "<b>Arte criada e salva</b>" +
      (b.notice ? "<br>" + esc(b.notice) : "") +
      '<br><img src="' +
      esc(b.url) +
      '" alt="Arte gerada" class="csp-generated-image">';
    await load();
    show("studio");
    toast(b.fallback ? "Arte alternativa criada" : "Arte salva na biblioteca");
  } catch (e) {
    box.textContent = e.message;
  }
}
async function generateStudioVideo() {
  var x = studioData(),
    box = document.getElementById("studioResult");
  if (!x.title) return toast("Informe o produto ou tema.");
  box.classList.remove("csp-hidden");
  box.textContent = "Iniciando renderização real do vídeo...";
  try {
    var r = await fetch("/api/ai/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "VIDEO",
          title: x.title,
          prompt:
            "Vídeo publicitário vertical, movimento suave, visual premium e confiável sobre " +
            x.title +
            ". Sem preço, cupom, logotipo ou texto inventado. Final com espaço limpo para CTA.",
          ratio: x.aspect === "16:9" ? "16:9" : "9:16",
          duration: 5,
          style: x.tone,
        }),
      }),
      b = await r.json();
    if (!r.ok) throw Error(b.error);
    box.textContent = b.message;
    await load();
    show("studio");
    toast("Vídeo enviado para renderização");
    await pollMedia(b.jobId, box);
  } catch (e) {
    box.textContent = e.message;
  }
}
async function pollMedia(id, box) {
  for (var i = 0; i < 20; i++) {
    await new Promise(function (ok) {
      setTimeout(ok, 6000);
    });
    try {
      var r = await fetch("/api/ai/media?id=" + encodeURIComponent(id)),
        b = await r.json();
      if (!r.ok) throw Error(b.error);
      if (b.status === "COMPLETED" || b.status === "FALLBACK_COMPLETED") {
        box.innerHTML =
          '<b>Mídia concluída e armazenada</b><br><a class="btn secondary csp-margin-top-10px" target="_blank" href="' +
          esc(b.url) +
          '" >Abrir arquivo</a>';
        await load();
        show("studio");
        return;
      }
      if (b.status === "FAILED") {
        box.textContent =
          "A renderização falhou: " + (b.lastError || "erro do provedor");
        await load();
        return;
      }
      box.textContent =
        "Renderização em andamento · tentativa " + (i + 1) + "/20";
    } catch (e) {
      box.textContent = e.message;
      return;
    }
  }
  box.textContent =
    "A renderização continua em segundo plano. Consulte a fila de mídia em alguns minutos.";
}
function openCoupon() {
  openModal(
    "Cadastrar cupom",
    "Registre somente cupons confirmados pela loja.",
    select("Marketplace", "marketplace", storeOptions()) +
      field("Código", "code", "text", 'required placeholder="OFERTA20"') +
      field(
        "Título",
        "title",
        "text",
        'required placeholder="Cupom para produtos selecionados"',
      ) +
      field(
        "Condição confirmada",
        "discountText",
        "text",
        'placeholder="20% em itens selecionados"',
      ) +
      field(
        "Link oficial do cupom",
        "url",
        "url",
        'placeholder="https://..."',
      ) +
      '<div class="formgrid">' +
      field("Início", "startsAt", "datetime-local") +
      field("Fim", "endsAt", "datetime-local") +
      "</div>",
    async function (e) {
      e.preventDefault();
      try {
        await growthCall(
          "POST",
          Object.assign(
            { entity: "coupon" },
            Object.fromEntries(new FormData(e.target)),
          ),
        );
        closeModal();
        show("growth");
        toast("Cupom salvo");
      } catch (err) {
        toast(err.message);
      }
    },
  );
}
function openCampaign() {
  openModal(
    "Nova campanha",
    "Organize orçamento e UTMs antes de ativar o anúncio no provedor.",
    field("Nome", "name", "text", "required") +
      select(
        "Canal",
        "platform",
        '<option value="META_ADS">Meta Ads</option><option value="GOOGLE_ADS">Google Ads</option><option value="TIKTOK_ADS">TikTok Ads</option><option value="INSTAGRAM">Instagram orgânico</option><option value="FACEBOOK">Facebook orgânico</option><option value="EMAIL">E-mail</option><option value="ORGANIC">Outros orgânicos</option>',
      ) +
      '<div class="formgrid">' +
      select(
        "Objetivo",
        "objective",
        '<option value="CLICKS">Cliques</option><option value="LEADS">Leads</option><option value="SALES">Vendas</option>',
      ) +
      field(
        "Orçamento diário",
        "dailyBudget",
        "number",
        'step=".01" min="0" value="0"',
      ) +
      '</div><div class="formgrid">' +
      field("utm_source", "utmSource", "text", 'placeholder="instagram"') +
      field("utm_medium", "utmMedium", "text", 'placeholder="cpc"') +
      "</div>" +
      field(
        "utm_campaign",
        "utmCampaign",
        "text",
        'placeholder="black-friday"',
      ),
    async function (e) {
      e.preventDefault();
      try {
        await growthCall(
          "POST",
          Object.assign(
            { entity: "campaign" },
            Object.fromEntries(new FormData(e.target)),
          ),
        );
        closeModal();
        show("growth");
        toast("Campanha criada em rascunho");
      } catch (err) {
        toast(err.message);
      }
    },
  );
}
function openSocial(network) {
  openModal(
    "Preparar " + network,
    "Não cole senha ou token aqui. O estado só será ativado após OAuth e teste real.",
    field("Nome da conta ou página", "displayName", "text", "required") +
      field(
        "ID público, se disponível",
        "externalId",
        "text",
        'placeholder="ID da página/conta"',
      ),
    async function (e) {
      e.preventDefault();
      try {
        await growthCall(
          "POST",
          Object.assign(
            { entity: "connection", network: network },
            Object.fromEntries(new FormData(e.target)),
          ),
        );
        closeModal();
        show("growth");
        toast("Conexão preparada; autorização ainda pendente");
      } catch (err) {
        toast(err.message);
      }
    },
  );
}
function openEmailTest() {
  openModal(
    "Teste de entrega",
    "Envia uma mensagem transacional, sem promoção.",
    field("Destino Gmail, Outlook ou outro", "to", "email", "required") +
      select(
        "Consentimento",
        "consent",
        '<option value="true">Confirmo que posso receber este teste</option><option value="false">Não autorizado</option>',
      ),
    async function (e) {
      e.preventDefault();
      try {
        var x = Object.fromEntries(new FormData(e.target));
        x.consent = x.consent === "true";
        var r = await fetch("/api/email/test", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(x),
          }),
          b = await r.json();
        if (!r.ok) throw Error(b.error);
        closeModal();
        toast("E-mail de teste enviado");
      } catch (err) {
        toast(err.message);
      }
    },
  );
}
function openSecurity() {
  var s = D.growth.security || {};
  openModal(
    "Política de segurança",
    "A limpeza remove apenas eventos de contatos e mensagens antigos. Histórico financeiro e auditoria são preservados.",
    field(
      "Retenção em dias",
      "retentionDays",
      "number",
      'min="30" max="1825" value="' +
        esc(s.retentionDays || 365) +
        '" required',
    ) +
      field(
        "E-mail para incidentes",
        "incidentEmail",
        "email",
        'value="' + esc(s.incidentEmail || "") + '"',
      ) +
      select(
        "Consentimento de marketing",
        "marketingConsentRequired",
        '<option value="true" '+(s.marketingConsentRequired!==false?'selected':'')+'>Obrigatório</option><option value="false" '+(s.marketingConsentRequired===false?'selected':'')+'>Opcional</option>',
      ) +
      select('Limpeza automática dos eventos antigos', 'retentionEnabled', '<option value="false" '+(!s.retentionEnabled?'selected':'')+'>Desativada</option><option value="true" '+(s.retentionEnabled?'selected':'')+'>Ativada</option>') +
      select(
        "Exportação de dados",
        "dataExportEnabled",
        '<option value="true" '+(s.dataExportEnabled!==false?'selected':'')+'>Permitida</option><option value="false" '+(s.dataExportEnabled===false?'selected':'')+'>Desativada</option>',
      ),
    async function (e) {
      e.preventDefault();
      try {
        var x = Object.fromEntries(new FormData(e.target));
        x.marketingConsentRequired = x.marketingConsentRequired === "true";
        x.dataExportEnabled = x.dataExportEnabled === "true";
        x.retentionEnabled = x.retentionEnabled === 'true';
        await growthCall("PUT", Object.assign({ entity: "security" }, x));
        closeModal();
        show("security");
        toast("Política atualizada e auditada");
      } catch (err) {
        toast(err.message);
      }
    },
  );
}
function openPrivacyRequest() {
  openModal(
    "Solicitação LGPD",
    "Registre o pedido do titular e acompanhe o atendimento.",
    select(
      "Tipo",
      "requestType",
      '<option value="ACCESS">Acesso</option><option value="CORRECTION">Correção</option><option value="DELETION">Exclusão</option><option value="PORTABILITY">Portabilidade</option><option value="REVOCATION">Revogação</option>',
    ) +
      field("E-mail do titular", "requesterEmail", "email", "required") +
      '<div class="field"><label>Observações</label><textarea class="input" name="notes" rows="4"></textarea></div>',
    async function (e) {
      e.preventDefault();
      try {
        await growthCall(
          "POST",
          Object.assign(
            { entity: "privacyRequest" },
            Object.fromEntries(new FormData(e.target)),
          ),
        );
        closeModal();
        show("security");
        toast("Solicitação registrada");
      } catch (err) {
        toast(err.message);
      }
    },
  );
}
function storeOptions() {
  return (D.suite.marketplaces || [])
    .map(function (x) {
      return (
        '<option value="' +
        x.marketplace +
        '">' +
        esc(x.marketplace.replaceAll("_", " ")) +
        "</option>"
      );
    })
    .join("");
}
function openOffer() {
  openModal(
    "Nova oferta",
    "A imagem será enviada junto com texto, cupom e link.",
    field(
      "Imagem do produto",
      "image",
      "file",
      'accept="image/jpeg,image/png,image/webp" required',
    ) +
      field("Nome do produto", "title", "text", "required") +
      '<div class="formgrid">' +
      select("Loja", "source", storeOptions()) +
      select("Categoria", "categoryId", catOpts()) +
      '</div><div class="formgrid">' +
      field(
        "Preço atual",
        "currentPrice",
        "number",
        'step=".01" min=".01" required',
      ) +
      field("Preço anterior", "originalPrice", "number", 'step=".01" min="0"') +
      "</div>" +
      field("Link original", "productUrl", "url", 'placeholder="https://..."') +
      field(
        "Link oficial de afiliado",
        "affiliateUrl",
        "url",
        'required placeholder="https://..."',
      ) +
      '<div class="formgrid">' +
      field("Código do cupom", "couponCode", "text", 'placeholder="CASA20"') +
      field("Link do cupom", "couponUrl", "url", 'placeholder="https://..."') +
      "</div>" +
      select(
        "Modelo da mensagem",
        "messageTemplate",
        '<option value="AUTO">Automático pela categoria</option><option value="IMPACT">Impactante</option><option value="COMPLETE">Oferta completa</option><option value="BABY">Bebês e família</option><option value="IMPORTED">Produtos importados</option><option value="CLEAN">Direto e limpo</option>',
      ) +
      '<div class="field"><div class="csp-field-heading"><label>Mensagem da promoção</label><div class="actions"><button type="button" class="btn secondary" data-action="previewMessage()">Montar modelo</button><button type="button" class="btn secondary" data-action="generateAI()">Melhorar com IA</button></div></div><textarea class="input" name="message" rows="12" placeholder="Clique em Montar modelo ou Melhorar com IA."></textarea></div>',
    async function (e) {
      e.preventDefault();
      try {
        var fd = new FormData(e.target),
          up = new FormData();
        up.append("file", fd.get("image"));
        var ur = await fetch("/api/upload", { method: "POST", body: up }),
          ub = await ur.json();
        if (!ur.ok) throw Error(ub.error);
        var x = Object.fromEntries(fd);
        delete x.image;
        await call(
          "POST",
          Object.assign({ entity: "offer", imageUrl: ub.url, imageKey: ub.key }, x),
        );
        closeModal();
        show("offers");
        toast("Oferta validada e salva");
      } catch (err) {
        toast(err.message);
      }
    },
  );
}

function changeReportDays(v) {
  reportDays = Number(v) || 30;
  load();
}
function openSale() {
  openModal(
    "Registrar venda",
    "Use os dados do relatório oficial do marketplace.",
    field(
      "ID do pedido",
      "externalId",
      "text",
      'required placeholder="Identificação oficial"',
    ) +
      select("Plataforma", "marketplace", storeOptions()) +
      select(
        "Oferta",
        "offerId",
        '<option value="">Não identificada</option>' +
          D.offers
            .map(function (o) {
              return (
                '<option value="' + o.id + '">' + esc(o.title) + "</option>"
              );
            })
            .join(""),
      ) +
      select(
        "Grupo",
        "groupId",
        '<option value="">Não identificado</option>' +
          D.groups
            .map(function (g) {
              return (
                '<option value="' + g.id + '">' + esc(g.name) + "</option>"
              );
            })
            .join(""),
      ) +
      '<div class="formgrid">' +
      field(
        "Valor da venda",
        "gross",
        "number",
        'step=".01" min="0" required',
      ) +
      field("Comissão", "commission", "number", 'step=".01" min="0" required') +
      "</div>" +
      field(
        "SubID ou etiqueta",
        "subid",
        "text",
        'placeholder="Identificação do grupo"',
      ) +
      field("Data da venda", "orderedAt", "datetime-local", "required") +
      select(
        "Status",
        "status",
        '<option value="PENDING">Pendente</option><option value="APPROVED">Aprovada</option><option value="PAID">Paga</option><option value="CANCELLED">Cancelada</option>',
      ),
    async function (e) {
      e.preventDefault();
      try {
        var r = await fetch("/api/reports", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(Object.fromEntries(new FormData(e.target))),
          }),
          b = await r.json();
        if (!r.ok) throw Error(b.error);
        closeModal();
        await load();
        show("reports");
        toast("Venda registrada");
      } catch (err) {
        toast(err.message);
      }
    },
  );
}

function offerMessageData() {
  var f = document.getElementById("form"),
    category =
      f.elements.categoryId && f.elements.categoryId.selectedOptions[0]
        ? f.elements.categoryId.selectedOptions[0].textContent
        : "";
  return {
    title: f.elements.title.value,
    currentPrice: f.elements.currentPrice.value,
    originalPrice: f.elements.originalPrice.value,
    source: f.elements.source.value,
    store: f.elements.source.value,
    category: category,
    affiliateUrl: f.elements.affiliateUrl.value,
    link: f.elements.affiliateUrl.value,
    couponCode: f.elements.couponCode.value,
    couponUrl: f.elements.couponUrl.value,
    template: f.elements.messageTemplate.value,
  };
}
async function previewMessage() {
  var f = document.getElementById("form"),
    x = offerMessageData();
  if (!x.title || !x.currentPrice || !x.affiliateUrl)
    return toast("Preencha produto, preço e link de afiliado.");
  try {
    var r = await fetch("/api/messages/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(x),
      }),
      b = await r.json();
    if (!r.ok) throw Error(b.error);
    f.elements.message.value = b.message;
    toast("Modelo " + b.templateName + " montado e validado");
  } catch (e) {
    toast(e.message);
  }
}
async function generateAI() {
  var f = document.getElementById("form"),
    x = offerMessageData();
  if (!x.title || !x.currentPrice || !x.affiliateUrl)
    return toast("Preencha produto, preço e link de afiliado.");
  try {
    toast("A IA está preparando a chamada...");
    var r = await fetch("/api/ai/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: x.title,
          price: x.currentPrice,
          originalPrice: x.originalPrice,
          store: x.store,
          link: x.link,
          couponCode: x.couponCode,
          couponUrl: x.couponUrl,
          template: x.template,
        }),
      }),
      b = await r.json();
    if (!r.ok) throw Error(b.error);
    f.elements.message.value = b.message;
    toast(
      b.aiUsed === false
        ? "Mensagem automática validada"
        : "Mensagem melhorada e validada pela IA",
    );
  } catch (e) {
    toast(e.message);
  }
}
async function runSimulation() {
  var box = document.getElementById("simulationResult");
  box.classList.remove("csp-hidden");
  box.textContent = "Executando validação...";
  try {
    var r = await fetch("/api/automation/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Air Fryer 4L de demonstração",
          source: "Mercado Livre",
          currentPrice: 299.9,
          originalPrice: 399.9,
          imageUrl: "https://example.com/produto.jpg",
          affiliateUrl: "https://example.com/afiliado",
          productUrl: "https://example.com/produto",
        }),
      }),
      b = await r.json();
    if (!r.ok) throw Error((b.errors || [b.error]).join(", "));
    box.innerHTML =
      "<b>Teste aprovado</b><br>Categoria: " +
      esc(b.category ? b.category.name : "Geral") +
      " · Nota: " +
      b.score +
      "<br>Grupos compatíveis: " +
      b.groups.length +
      "<br>Pacote contém imagem, mensagem e link.";
  } catch (e) {
    box.textContent = "Falha: " + e.message;
  }
}
async function convertLink() {
  var box = document.getElementById("convertResult");
  box.classList.remove("csp-hidden");
  box.textContent = "Analisando o link e verificando os dados disponíveis...";
  var input = document.getElementById("convertUrl").value.trim();
  try {
    var host = "";
    try { host = new URL(input).hostname.toLowerCase(); } catch {}
    if (["mercadolivre.com.br","www.mercadolivre.com.br","produto.mercadolivre.com.br","mercadolivre.com","www.mercadolivre.com","mercadolibre.com","www.mercadolibre.com","mercadolibre.com.br","www.mercadolibre.com.br","meli.la"].indexOf(host) >= 0) {
      var inspected = await fetch("/api/mercadolivre/parse-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: input })
      });
      var product = await inspected.json();
      if (!inspected.ok) throw Error(product.error || "Não foi possível analisar o link.");
      lastMeliInspection = product;
      var priceText = product.price != null
        ? Number(product.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : "Preço não confirmado pela API";
      var stockText = product.availableQuantity == null ? "Estoque não confirmado" : (product.availableQuantity > 0 ? product.availableQuantity + " em estoque informado pela API" : "Sem estoque informado");
      var productAnchor = product.productUrl
        ? '<a target="_blank" rel="noopener noreferrer" href="' + esc(product.productUrl) + '">Abrir página do produto ↗</a>'
        : "";
      var affiliate = product.affiliateLinkCandidate
        ? '<p><b>Link recebido:</b> <a target="_blank" rel="noopener noreferrer" href="' + esc(product.affiliateLinkCandidate) + '">' + esc(product.affiliateLinkCandidate) + '</a><br><small>Preservado como recebido; comissão ainda não verificada.</small></p>'
        : "";
      var checks = '<ul><li>' + (product.dataChecks?.realPriceConfirmed ? 'Preço real confirmado' : 'Preço pendente de confirmação') + '</li><li>' + (product.dataChecks?.imageAvailable ? 'Imagem disponível' : 'Imagem não confirmada') + '</li><li>' + (product.dataChecks?.itemIdConfirmed ? 'Anúncio identificado' : 'Anúncio individual não identificado') + '</li></ul>';
      box.innerHTML = '<b>Análise do Mercado Livre · ' + esc(product.kind) + '</b>' +
        (product.title ? '<h3>' + esc(product.title) + '</h3>' : '<p>O destino foi reconhecido, mas a API não retornou o nome do produto.</p>') +
        '<p><b>Preço:</b> ' + esc(priceText) + '<br><b>Disponibilidade:</b> ' + esc(stockText) + '</p>' +
        productAnchor + checks + affiliate +
        '<p><b>Próximo passo:</b> ' + esc(product.nextStep || product.resolutionNote || 'Confira os dados antes de cadastrar.') + '</p>' +
        '<p><a target="_blank" rel="noopener noreferrer" href="https://www.mercadolivre.com.br/l/afiliados-gere-seus-links">Abrir Gerador oficial de links de afiliado ↗</a></p>' +
        (product.canPrepareDraft ? '<button type="button" class="btn csp-margin-top-12px" data-action="openMeliOfferForm()">Preparar oferta para revisão</button>' : '') +
        '<small>Publicação automática bloqueada até confirmar preço, estoque, produto e rastreamento de afiliado.</small>';
      return;
    }
    var r = await fetch("/api/links/convert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: input, group: document.getElementById("convertGroup").value })
    });
    var b = await r.json();
    if (!r.ok) throw Error(b.error);
    box.innerHTML = "<b>" + esc(b.marketplace) + '</b><br><a target="_blank" rel="noopener noreferrer" href="' + esc(b.affiliateUrl) + '">' + esc(b.affiliateUrl) + "</a><br><small>" + esc(b.warning) + "</small>";
  } catch (e) {
    box.textContent = e.message;
  }
}
async function searchMercadoLivreProducts(button) {
  var input = document.getElementById("marketSearchQuery");
  var target = document.getElementById("marketSearchResults");
  if (!input || !target) return;
  var q = input.value.trim();
  if (!q) { target.textContent = "Digite o nome do produto que deseja buscar."; return; }
  if (button) button.disabled = true;
  target.innerHTML = '<div class="empty">Consultando a API do Mercado Livre...</div>';
  try {
    var response = await fetch("/api/mercadolivre/products?q=" + encodeURIComponent(q));
    var data = await response.json();
    if (!response.ok) throw Error(data.error || "Não foi possível buscar produtos.");
    target.innerHTML = (data.results || []).length ? (data.results || []).slice(0, 12).map(function(item) {
      var price = item.price != null ? Number(item.price).toLocaleString("pt-BR", {style:"currency",currency:"BRL"}) : "Preço não confirmado";
      var stock = item.availableQuantity == null ? "Estoque não confirmado" : (item.availableQuantity > 0 ? "Estoque informado: " + item.availableQuantity : "Sem estoque");
      var image = item.imageUrl ? '<img class="thumb" src="' + esc(item.imageUrl) + '" alt="Imagem do produto">' : '<div class="thumb"></div>';
      var link = item.productUrl ? '<a target="_blank" rel="noopener noreferrer" href="' + esc(item.productUrl) + '">' + (data.source === "catalog" ? "Abrir catálogo e escolher anúncio ↗" : "Abrir anúncio ↗") + '</a>' : "";
      var state = item.canPrepareDraft ? "Anúncio identificado; confira preço e estoque e gere o link oficial de afiliado antes de cadastrar." : (data.source === "catalog" ? "Resultado de catálogo, não um anúncio confirmado. Escolha um anúncio individual com preço e disponibilidade e gere o link oficial de afiliado." : "Não publicável automaticamente: faltam dados reais do anúncio ou do preço.");
      return '<div class="row">' + image + '<div class="grow"><b>' + esc(item.title || "Produto sem título") + '</b><div class="price">' + esc(price) + '</div><div class="muted">' + esc(stock) + '</div><div class="muted">' + esc(state) + '</div>' + link + '</div></div>';
    }).join("") : '<div class="empty">Nenhum resultado encontrado para essa busca.</div>';
    if (data.notice) target.insertAdjacentHTML("afterbegin", '<div class="callout">' + esc(data.notice) + '</div>');
  } catch (error) {
    target.textContent = error.message || "Falha ao buscar produtos.";
  } finally {
    if (button) button.disabled = false;
  }
}
function openMeliOfferForm() {
  var p = lastMeliInspection;
  if (!p || !p.canPrepareDraft || !p.title || p.price == null || !p.imageUrl || !p.productUrl) {
    toast("Não há dados reais suficientes para preparar esta oferta.");
    return;
  }
  var current = Number(p.price).toFixed(2);
  var content =
    field("Nome do produto", "title", "text", 'required value="' + esc(p.title) + '"') +
    '<div class="formgrid">' +
    '<div class="field"><label for="meliSource">Loja</label><select class="input" id="meliSource" name="source"><option value="MERCADO_LIVRE" selected>Mercado Livre</option></select></div>' +
    '<div class="field"><label for="meliCategory">Categoria</label><select class="input" id="meliCategory" name="categoryId">' + catOpts() + '</select></div></div>' +
    '<div class="formgrid">' +
    field("Preço atual (R$)", "currentPrice", "number", 'step=".01" min=".01" required value="' + current + '"') +
    field("Preço anterior (R$)", "originalPrice", "number", 'step=".01" min="0"') +
    '</div>' +
    field("Página do produto", "productUrl", "url", 'required value="' + esc(p.productUrl) + '"') +
    field("Link oficial de afiliado", "affiliateUrl", "url", 'required value="' + esc(p.affiliateLinkCandidate || "") + '" placeholder="Cole aqui o link gerado no portal oficial"') +
    field("Imagem do produto (URL)", "imageUrl", "url", 'required value="' + esc(p.imageUrl) + '"') +
    '<div class="field"><label><input type="checkbox" name="affiliateConfirmed" required> Confirmo que conferi o link de afiliado no portal oficial. A oferta ficará pendente de revisão.</label></div>' +
    select("Modelo da mensagem", "messageTemplate", '<option value="AUTO" selected>Automático pela categoria</option><option value="IMPACT">Impactante</option><option value="COMPLETE">Oferta completa</option><option value="CLEAN">Direto e limpo</option>');
  openModal("Preparar oferta do Mercado Livre", "Os dados vêm da API quando disponíveis. A oferta será salva como pendente e não será publicada automaticamente.", content, async function(e) {
    e.preventDefault();
    try {
      var fd = new FormData(e.target);
      var original = String(fd.get("originalPrice") || "").trim();
      var payload = {
        entity: "offer",
        title: String(fd.get("title") || "").trim(),
        source: "MERCADO_LIVRE",
        categoryId: String(fd.get("categoryId") || ""),
        currentPrice: Number(fd.get("currentPrice")),
        originalPrice: original ? Number(original) : "",
        productUrl: String(fd.get("productUrl") || "").trim(),
        affiliateUrl: String(fd.get("affiliateUrl") || "").trim(),
        imageUrl: String(fd.get("imageUrl") || "").trim(),
        messageTemplate: String(fd.get("messageTemplate") || "AUTO")
      };
      if (!fd.get("affiliateConfirmed")) throw Error("Confirme que conferiu o link de afiliado oficial.");
      await call("POST", payload);
      closeModal();
      show("offers");
      toast("Oferta salva como pendente para revisão; nada foi publicado.");
    } catch (error) {
      toast(error.message || "Não foi possível preparar a oferta.");
    }
  });
}
function openMarketplace(store) {
  var x =
    (D.suite.marketplaces || []).find(function (i) {
      return i.marketplace === store;
    }) || {};
  var isMeli = store === "MERCADO_LIVRE";
  var fields = field(
    isMeli ? "Identificação oficial de afiliado (se fornecida pelo Mercado Livre)" : "Tag ou identificação de afiliado",
    "affiliateTag",
    "text",
    'value="' + esc(x.affiliateTag || "") + '"' + (isMeli ? ' placeholder="Opcional; não cole aqui o link meli.la"' : ""),
  );
  if (isMeli) {
    fields += field("Perfil social de referência (não é link de produto/afiliado)","socialProfileUrl","url",'value="' + esc(x.socialProfileUrl || "") + '" placeholder="https://www.mercadolivre.com.br/social/seu-perfil"') + '<div class="callout"><strong>Perfil salvo apenas como referência.</strong> Ele não será usado como oferta nem como link comissionado. Rastreamento de conversões segue desativado: use o link individual gerado no portal oficial e consulte vendas e comissões no painel do Mercado Livre. A conexão OAuth da API é configurada separadamente.</div>';
  } else {
    fields += field(
      "Modelo do SubID",
      "subidTemplate",
      "text",
      'value="' + esc(x.subidTemplate || "{group}") + '"',
    ) + field(
      "Endpoint oficial de conversão",
      "conversionEndpoint",
      "url",
      'value="' + esc(x.conversionEndpoint || "") + '" placeholder="https://..."',
    ) + '<div class="callout">A integração permanecerá pendente até o sistema concluir um teste oficial. O status não pode ser ativado manualmente.</div>';
  }
  openModal(
    "Configurar " + store.replace("_", " "),
    isMeli ? "Configure somente dados confirmados. O rastreamento de comissões não será simulado." : "Use somente identificação e endpoint oficiais da sua conta.",
    fields,
    async function (e) {
      e.preventDefault();
      try {
        await suiteCall(
          "PUT",
          Object.assign(
            { entity: "marketplace", marketplace: store },
            Object.fromEntries(new FormData(e.target)),
          ),
        );
        closeModal();
        toast(isMeli ? "Configuração salva; conversões não serão simuladas." : "Configuração salva");
      } catch (err) {
        toast(err.message);
      }
    },
  );
}
function openStorefront() {
  var s = D.suite.storefront || {};
  openModal(
    "Vitrine pública",
    "Escolha os dados apresentados aos visitantes.",
    field(
      "Título",
      "title",
      "text",
      'required value="' + esc(s.title || "Ofertas selecionadas") + '"',
    ) +
      field(
        "Descrição",
        "description",
        "text",
        'value="' + esc(s.description || "") + '"',
      ) +
      field(
        "Cor principal",
        "primaryColor",
        "color",
        'value="' + esc(s.primaryColor || "#ff6a2a") + '"',
      ) +
      select(
        "Publicação",
        "published",
        '<option value="true">Publicada</option><option value="">Privada</option>',
      ),
    async function (e) {
      e.preventDefault();
      try {
        var x = Object.fromEntries(new FormData(e.target));
        x.published = x.published === "true";
        await suiteCall("PUT", Object.assign({ entity: "storefront" }, x));
        closeModal();
        toast("Vitrine atualizada");
      } catch (err) {
        toast(err.message);
      }
    },
  );
}
function whatsappConnectionsMarkup() {
  var connections = D.suite.connections || [], rotation = D.suite.whatsappRotation || {enabled:true,maxConnections:5};
  var cards = connections.map(function(x,index) {
    return '<div class="integration"><div class="intlogo" aria-hidden="true">'+(index+1)+'</div><div class="grow"><b>'+esc(x.name)+'</b><div class="muted">'+esc(x.phoneNumber || 'Informe o número')+' · '+esc(x.status)+'</div><div class="muted">Intervalo '+x.intervalSeconds+'s · '+(x.groupMessagingSupported?'Grupo confirmado pelo conector':'Aguardando validação do conector')+'</div>'+(x.lastDispatchedAt?'<div class="muted">Último envio assumido: '+esc(new Date(x.lastDispatchedAt).toLocaleString('pt-BR'))+'</div>':'')+'<div class="actions csp-margin-top-8px" ><button class="btn secondary" data-action="openConnection(\''+x.id+'\')">Editar '+esc(x.name)+'</button><button class="btn secondary" data-action="toggleWhatsapp(\''+x.id+'\',\''+(x.status==='ACTIVE'?'PAUSED':'ACTIVE')+'\')">'+(x.status==='ACTIVE'?'Pausar':'Ativar')+' '+esc(x.name)+'</button><button class="btn secondary" data-action="archiveWhatsapp(\''+x.id+'\')">Remover '+esc(x.name)+'</button></div></div></div>';
  }).join('');
  return '<div class="callout"><b>'+connections.length+' de 5 números</b> · '+(rotation.enabled?'Revezamento automático ativo':'Seleção por prioridade')+'<p>Cada publicação é assumida por um único número. Números pausados, desconectados ou em intervalo aguardam sua vez.</p><button class="btn secondary" data-action="toggleWhatsappRotation('+(rotation.enabled?'false':'true')+')">'+(rotation.enabled?'Usar prioridade':'Ativar revezamento')+'</button> <button class="btn secondary" data-action="openWhatsappPairing()">Parear conector</button></div>'+cards+(connections.length<5?'<button class="btn csp-margin-top-12px"  data-action="openConnection()">+ Adicionar número ('+connections.length+'/5)</button>':'<p class="muted">Limite de cinco números atingido.</p>');
}
async function toggleWhatsapp(id,status) {
  try {await suiteCall('PUT',{entity:'connection',id:id,status:status});show('account');toast('Estado do número atualizado');}catch(e){toast(e.message);}
}
async function archiveWhatsapp(id) {
  try {await suiteCall('DELETE',null,'?entity=connection&id='+encodeURIComponent(id));show('account');toast('Número removido do revezamento');}catch(e){toast(e.message);}
}
async function toggleWhatsappRotation(enabled) {
  try {await suiteCall('PUT',{entity:'whatsappRotation',enabled:enabled});show('account');toast(enabled?'Revezamento automático ativo':'Seleção por prioridade ativa');}catch(e){toast(e.message);}
}
function openConnection(id) {
  var current=(D.suite.connections||[]).find(function(x){return x.id===id;})||{};
  if(!id&&(D.suite.connections||[]).length>=5)return toast('Limite de cinco números por conta.');
  openModal(id?'Editar WhatsApp':'Adicionar WhatsApp','Cadastre até cinco números. O conector confirma o acesso ao número e aos grupos; depois você ativa o envio.',
    field('Nome da conexão','name','text','required value="'+esc(current.name||'')+'" placeholder="Número principal"')+
    field('Número do WhatsApp com DDI','phoneNumber','tel','required value="'+esc(current.phoneNumber||'')+'" placeholder="+55 (DD) número" autocomplete="tel"')+
    select('Provedor','provider',['N8N','EVOLUTION','OFFICIAL_API'].map(function(x){return '<option value="'+x+'" '+(current.provider===x?'selected':'')+'>'+({N8N:'n8n / conector próprio',EVOLUTION:'Evolution API',OFFICIAL_API:'WhatsApp Business (verificar suporte ao grupo)'})[x]+'</option>';}).join(''))+
    field('Identificação no conector','externalId','text','required value="'+esc(current.externalId||'')+'" placeholder="Nome da instância ou ID fornecido pelo provedor"')+
    '<div class="formgrid">'+field('Prioridade quando o revezamento estiver desligado','priority','number','min="1" max="9999" value="'+(current.priority||100)+'"')+field('Intervalo mínimo por número (segundos)','intervalSeconds','number','min="30" max="3600" value="'+(current.intervalSeconds||60)+'"')+'</div><div id="connectionError" role="alert" tabindex="-1" hidden></div>',
    async function(e){e.preventDefault();try{var body=Object.assign({entity:'connection'},Object.fromEntries(new FormData(e.target)));if(id){body.id=id;body.action='EDIT';}await suiteCall(id?'PUT':'POST',body);closeModal();show('account');toast(id?'Conexão atualizada':'Número cadastrado; confirme no conector e ative.');}catch(error){var notice=document.getElementById('connectionError');notice.hidden=false;notice.textContent=error.message;notice.focus();}});
}
function openTelegramConnection() {
  openModal(
    "Ativar bot do Telegram",
    "Antes, salve o token no campo seguro correspondente nas configurações do projeto.",
    field(
      "Nome da conexão",
      "name",
      "text",
      'required placeholder="Bot principal"',
    ) +
      select(
        "Posição segura do token",
        "secretSlot",
        '<option value="1">Bot 1 — principal</option><option value="2">Bot 2 — fallback</option><option value="3">Bot 3 — fallback</option>',
      ) +
      field(
        "Prioridade de fallback",
        "priority",
        "number",
        'min="1" max="9999" value="100" required',
      ),
    async function (e) {
      e.preventDefault();
      try {
        await suiteCall(
          "POST",
          Object.assign(
            { entity: "telegramConnection" },
            Object.fromEntries(new FormData(e.target)),
          ),
        );
        closeModal();
        toast("Bot validado e conectado");
      } catch (err) {
        toast(err.message);
      }
    },
  );
}
async function toggleTelegram(id, value) {
  try {
    await suiteCall("PUT", {
      entity: "telegramConnection",
      id: id,
      status: value,
    });
    toast("Conexão atualizada");
  } catch (e) {
    toast(e.message);
  }
}
async function testTelegram(groupId) {
  try {
    var r = await fetch("/api/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: groupId }),
      }),
      b = await r.json();
    if (!r.ok) throw Error(b.error);
    toast("Mensagem de teste enviada ao Telegram");
  } catch (e) {
    toast(e.message);
  }
}
function openGroup(id) {
  var g = id ? grp(id) : null,
    categoryOptions = D.categories
      .map(function (c) {
        return (
          '<option value=\"' +
          c.id +
          '\" ' +
          (g && g.categoryId === c.id ? "selected" : "") +
          ">" +
          c.icon +
          " " +
          esc(c.name) +
          "</option>"
        );
      })
      .join(""),
    platformOptions =
      '<option value=\"WHATSAPP\" ' +
      (g && g.platform === "WHATSAPP" ? "selected" : "") +
      '>WhatsApp</option><option value=\"TELEGRAM\" ' +
      (g && g.platform === "TELEGRAM" ? "selected" : "") +
      ">Telegram</option>",
    destinationTypeOptions = '<option value="GROUP" '+(!g||!g.destinationType||g.destinationType==="GROUP"?"selected":"")+">👥 Grupo</option><option value=\"CHANNEL\" "+(g&&g.destinationType==="CHANNEL"?"selected":"")+">📢 Canal</option><option value=\"COMMUNITY\" "+(g&&g.destinationType==="COMMUNITY"?"selected":"")+">🏘️ Comunidade</option>";
  openModal(
    g ? "Configurar destino" : "Novo destino WhatsApp",
    "Grupos exigem ID e verificação do conector. Canais e comunidades ficam pausados até haver suporte real confirmado pelo conector.",
    field(
      "Nome",
      "name",
      "text",
      'required value=\"' + esc(g ? g.name : "") + '\"',
    ) +
      select("Plataforma", "platform", platformOptions) +
      select("Tipo de destino WhatsApp", "destinationType", destinationTypeOptions) +
      select("Categoria", "categoryId", categoryOptions) +
      field(
        "Link de convite",
        "inviteUrl",
        "url",
        'placeholder=\"https://...\" value=\"' +
          esc(g ? g.inviteUrl || "" : "") +
          '\"',
      ) +
      '<div class=\"formgrid\">' +
      field(
        "Membros",
        "members",
        "number",
        'min=\"0\" value=\"' + Number(g ? g.members : 0) + '\"',
      ) +
      field(
        "Capacidade",
        "capacity",
        "number",
        'min=\"1\" value=\"' + Number(g ? g.capacity : 1024) + '\"',
      ) +
      "</div>" +
      field(
        "ID oficial do destino",
        "externalId",
        "text",
        'placeholder=\"Telegram: -1001234567890\" value=\"' +
          esc(g ? g.externalId || "" : "") +
          '\"',
      ) +
      '<div class=\"callout\">WhatsApp e Telegram exigem o identificador oficial fornecido pela respectiva integração. Sem ele, o destino permanece pausado.</div>',
    async function (e) {
      e.preventDefault();
      try {
        var payload = Object.assign(
          { entity: g ? "groupConfig" : "group" },
          Object.fromEntries(new FormData(e.target)),
        );
        if (g) payload.id = g.id;
        await call(g ? "PUT" : "POST", payload);
        closeModal();
        toast(g ? "Destino atualizado" : "Destino salvo");
      } catch (err) {
        toast(err.message);
      }
    },
  );
  var platformField=document.querySelector('#form [name="platform"]');
  var destinationField=document.querySelector('#form [name="destinationType"]');
  var syncDestinationType=function(){
    var isWhatsapp=platformField&&platformField.value==="WHATSAPP";
    if(destinationField){
      destinationField.closest(".field").hidden=!isWhatsapp;
      destinationField.disabled=!isWhatsapp;
      if(!isWhatsapp)destinationField.value="GROUP";
    }
  };
  if(platformField)platformField.addEventListener("change",syncDestinationType);
  syncDestinationType();
}
function openMonitor() {
  openModal(
    "Nova fonte monitorada",
    "Use somente grupos e fontes que você está autorizada a monitorar.",
    field("Nome da fonte", "name", "text", "required") +
      select(
        "Tipo",
        "sourceType",
        '<option value="WHATSAPP_GROUP">Grupo do WhatsApp</option><option value="MARKETPLACE">Marketplace</option><option value="FEED">Feed autorizado</option>',
      ) +
      field("Origem HTTPS", "sourceUrl", "url", "required") +
      field('Link oficial de afiliado (anúncio Mercado Livre)', 'affiliateUrl', 'url') +
      select('Autorização da origem', 'sourceAuthorized', '<option value="false">Não confirmada — manter pausado</option><option value="true">Confirmo que tenho autorização para esta origem</option>') +
      '<p class="muted">Feed: JSON com lista offers. Marketplace: um anúncio MLB do Mercado Livre. Grupos: eventos enviados pelo conector da conta.</p>' +
      select(
        "Categoria",
        "categoryId",
        '<option value="">Classificação automática</option>' + catOpts(),
      ) +
      select(
        "Modo",
        "mode",
        '<option value="SMART">Inteligente</option><option value="CLONE">Clone</option>',
      ),
    async function (e) {
      e.preventDefault();
      try {
        await call(
          "POST",
          Object.assign(
            { entity: "monitor" },
            Object.fromEntries(new FormData(e.target)),
          ),
        );
        closeModal();
        toast("Monitor cadastrado");
      } catch (err) {
        toast(err.message);
      }
    },
  );
}
function openQueue() {
  openModal(
    "Nova fila",
    "Defina a janela, intervalo e prioridade.",
    field("Nome da fila", "name", "text", "required") +
      select(
        "Categoria",
        "categoryId",
        '<option value="">Todas</option>' + catOpts(),
      ) +
      '<div class="formgrid">' +
      field("Início", "startTime", "time", 'value="08:00" required') +
      field("Término", "endTime", "time", 'value="22:00" required') +
      "</div>" +
      field(
        "Intervalo em minutos (1 a 30)",
        "intervalMinutes",
        "number",
        'min="1" max="30" value="10" required',
      ) +
      select(
        "Prioridade",
        "priorityMode",
        '<option value="NEWEST_FIRST">Fura-fila: mais novas primeiro</option><option value="FIFO">Ordem de chegada</option>',
      ) +
      select(
        "Prévia do link",
        "linkPreview",
        '<option value="true">Ativada</option><option value="false">Desativada</option>',
      ) +
      select(
        "Marcar todos",
        "mentionAll",
        '<option value="false">Não</option><option value="true">Solicitar ao conector</option>',
      ),
    async function (e) {
      e.preventDefault();
      try {
        await call(
          "POST",
          Object.assign(
            { entity: "queue" },
            Object.fromEntries(new FormData(e.target)),
          ),
        );
        closeModal();
        toast("Fila criada");
      } catch (err) {
        toast(err.message);
      }
    },
  );
}
function openSchedule() {
  openModal(
    "Nova recorrência",
    "Salva pausada. Ao ativar, o executor agenda a mensagem no fuso da conta e respeita os intervalos de envio.",
    field("Nome", "name", "text", "required") +
      select("Grupo", "groupId", groupOpts()) +
      select(
        "Recorrência",
        "recurrence",
        '<option value="DAILY">Diária</option><option value="WEEKDAYS">Dias úteis</option><option value="WEEKLY">Semanal</option><option value="ONCE">Uma vez</option>',
      ) +
      select('Dia da semana (semanal)', 'weekday', '<option value="1">Segunda</option><option value="2">Terça</option><option value="3">Quarta</option><option value="4">Quinta</option><option value="5">Sexta</option><option value="6">Sábado</option><option value="0">Domingo</option>') +
      field('Data (uma vez)', 'onceDate', 'date') +
      field("Horário", "sendTime", "time", 'value="09:00" required') +
      '<div class="field"><label>Mensagem</label><textarea class="input" name="message" rows="5" required></textarea></div>',
    async function (e) {
      e.preventDefault();
      try {
        await call(
          "POST",
          Object.assign(
            { entity: "schedule" },
            Object.fromEntries(new FormData(e.target)),
          ),
        );
        closeModal();
        toast("Recorrência salva pausada");
      } catch (err) {
        toast(err.message);
      }
    },
  );
}
function prepare(id) {
  selected = off(id);
  if (!selected || !selected.imageUrl)
    return toast("A oferta precisa de uma imagem.");
  var groups = D.groups.filter(function (g) {
    return (
      g.status === "ACTIVE" &&
      String(g.externalId || "").trim() &&
      (g.categoryId === selected.categoryId || !g.categoryId)
    );
  });
  if (!groups.length)
    groups = D.groups.filter(function (g) {
      return g.status === "ACTIVE" && String(g.externalId || "").trim();
    });
  if (!groups.length)
    return toast(
      "Configure um grupo ou canal com ID oficial antes de preparar o envio.",
    );
  openModal(
    "Preparar envio",
    "Imagem, mensagem e link seguirão juntos.",
    select(
      "Grupo",
      "groupId",
      groups
        .map(function (g) {
          return '<option value="' + g.id + '">' + esc(g.name) + "</option>";
        })
        .join(""),
    ) +
      select(
        "Modo",
        "mode",
        '<option value="ON_DEMAND">Sob demanda</option><option value="SMART">Inteligente</option><option value="CLONE">Clone</option>',
      ) +
      select(
        "Prioridade",
        "priority",
        '<option value="NORMAL">Normal</option><option value="FLASH">Fura-fila</option>',
      ) +
      select(
        "Marcar todos",
        "mentionAll",
        '<option value="false">Não</option><option value="true">Solicitar ao conector</option>',
      ) +
      field("Agendar para", "scheduledAt", "datetime-local") +
      '<div class="field"><label>Mensagem</label><textarea class="input" name="message" rows="8">' +
      esc(selected.message) +
      "</textarea></div>",
    async function (e) {
      e.preventDefault();
      try {
        await call(
          "POST",
          Object.assign(
            { entity: "publication", offerId: selected.id },
            Object.fromEntries(new FormData(e.target)),
          ),
        );
        closeModal();
        show("queues");
        toast("Publicação adicionada à fila");
      } catch (err) {
        toast(err.message);
      }
    },
  );
}
async function status(entity, id, value) {
  try {
    await call("PUT", { entity: entity, id: id, status: value });
    toast("Status atualizado");
  } catch (e) {
    toast(e.message);
  }
}
async function removeItem(entity, id) {
  if (!confirm("Deseja realmente excluir?")) return;
  try {
    await call(
      "DELETE",
      null,
      "?entity=" + encodeURIComponent(entity) + "&id=" + encodeURIComponent(id),
    );
    toast("Item excluído");
  } catch (e) {
    toast(e.message);
  }
}
async function share(id) {
  var p = D.publications.find(function (x) {
      return x.id === id;
    }),
    o = off(p.offerId),
    g = grp(p.groupId);
  if (!o || !o.imageUrl) return toast("Imagem não encontrada.");
  var text =
    (p.message || o.message) + "\n\nDestino: " + (g ? g.name : "Grupo");
  try {
    var r = await fetch(o.imageUrl),
      blob = await r.blob(),
      file = new File([blob], "oferta." + (blob.type.split("/")[1] || "jpg"), {
        type: blob.type,
      });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ title: o.title, text: text, files: [file] });
      toast("Compartilhamento aberto. A entrega será confirmada pelo conector.");
    } else {
      await navigator.clipboard.writeText(text);
      window.open(o.affiliateUrl, "_blank", "noopener");
      toast("Texto copiado. Anexe a imagem ao WhatsApp.");
    }
  } catch (e) {
    if (e.name !== "AbortError") toast("Não foi possível compartilhar.");
  }
}

var selectedGroups = {}, loadSequence = 0, modalReturnFocus = null, drawerReturnFocus = null, fieldSequence = 0;
var navPaths = {
  dashboard:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  radar:'M12 3a9 9 0 1 0 9 9 M12 7a5 5 0 1 0 5 5 M12 12l8-8',
  offers:'M3 3h7l11 11-7 7L3 10z M7 7h.01',
  publishing:'M4 4h16v16H4z M4 9h16 M8 2v4 M16 2v4 M8 13h3 M8 16h7',
  channels:'M4 4h16v13H8l-4 4z M8 8h8 M8 12h5',
  reports:'M4 20V10 M10 20V4 M16 20v-7 M3 21h18',
  settings:'M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2'
};
function nav(){
  document.getElementById('nav').innerHTML=NAV.map(function(n){
    return '<button '+(current===n[0]?'aria-current="page" ':'')+'class="'+(current===n[0]?'on':'')+'" data-action="show(\''+n[0]+'\')"><span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="'+navPaths[n[0]]+'"/></svg></span>'+n[1]+'</button>';
  }).join('');
}
function syncDrawer(){
  var mobile=matchMedia('(max-width:900px)').matches,side=document.getElementById('side');
  side.inert=mobile&&!side.classList.contains('open');
}
function menu(open){
  var side=document.getElementById('side'),mobile=matchMedia('(max-width:900px)').matches;
  if(open)drawerReturnFocus=document.activeElement;
  side.classList.toggle('open',!!open);document.getElementById('shade').classList.toggle('on',!!open);
  document.querySelector('.menu').setAttribute('aria-expanded',String(!!open));
  document.getElementById('main').inert=!!open&&mobile;
  syncDrawer();
  if(open&&mobile)side.querySelector('button')?.focus();
  if(!open&&drawerReturnFocus?.isConnected){drawerReturnFocus.focus();drawerReturnFocus=null;}
}
function show(view){
  if(view==='content')view='studio';
  var parent=Object.keys(GROUPS).find(function(key){return key!==view&&GROUPS[key].some(function(item){return item[0]===view;});});
  var target=parent||view;
  if(!NAV.some(function(n){return n[0]===target;}))target='dashboard';
  if(parent)selectedGroups[parent]=view;else if(GROUPS[target])selectedGroups[target]=GROUPS[target][0][0];
  current=target;menu(false);nav();
  document.getElementById('title').textContent=NAV.find(function(n){return n[0]===current;})[1];
  render();history.replaceState(null,'','#'+(parent?view:current));
}
async function readJSON(path){
  var response=await fetch(path,{signal:AbortSignal.timeout(20000)}),value=await response.json();
  if(!response.ok)throw Error(value.error||'Não foi possível carregar '+path);
  return value;
}
var loadInFlight=null,loadAgain=false;
function load(){
  // Several UI actions can request a refresh at once; share one dashboard request burst.
  if(loadInFlight){loadAgain=true;return loadInFlight;}
  var task=loadNow();
  loadInFlight=task;
  return task.finally(function(){
    if(loadInFlight===task)loadInFlight=null;
    if(loadAgain){loadAgain=false;Promise.resolve().then(load);}
  });
}
async function loadNow(){
  var sequence=++loadSequence;
  try{
    var data=await readJSON('/api/data');
    var paths=['/api/suite','/api/reports?days='+reportDays,'/api/growth','/api/social/autopilot','/api/compliance/messaging?days=7','/api/readiness'];
    var results=await Promise.allSettled(paths.map(readJSON));
    if(sequence!==loadSequence)return;
    var keys=['suite','reportsData','growth','social','compliance','readiness'],failures=[];
    results.forEach(function(result,index){if(result.status==='fulfilled')data[keys[index]]=result.value;else{data[keys[index]]=D[keys[index]];failures.push(keys[index]);}});
    D=Object.assign({},D,data);D.loadFailures=failures;
    var hash=decodeURIComponent(location.hash.slice(1));
    if(hash)show(hash);else render();
    if(failures.length)document.getElementById('content').insertAdjacentHTML('afterbegin','<div role="alert" class="partial-error">Algumas áreas não puderam ser atualizadas: '+esc(failures.join(', '))+'. <button class="btn secondary" data-action="load()">Tentar novamente</button></div>');
  }catch(error){
    if(sequence!==loadSequence)return;
    document.getElementById('content').innerHTML='<div class="empty" role="alert"><b>Não foi possível carregar</b><p>'+esc(error.message)+'</p><button class="btn" data-action="load()">Tentar novamente</button></div>';
  }
}
function toast(message){
  var element=document.getElementById('toast');element.textContent=message;element.classList.add('on');
  var error=document.getElementById('formError');if(error&&document.getElementById('modal').classList.contains('on')){error.textContent=message;error.tabIndex=-1;error.focus();}
  clearTimeout(window.toastTimeout);window.toastTimeout=setTimeout(function(){element.classList.remove('on');},4500);
}
function openModal(title,hint,body,submit){
  modalReturnFocus=document.activeElement;
  document.getElementById('modalTitle').textContent=title;document.getElementById('modalHint').textContent=hint;
  var form=document.getElementById('form');
  form.innerHTML='<div class="formerror" id="formError" role="alert"></div>'+body+'<div class="formactions"><button type="button" class="btn secondary" data-action="closeModal()">Cancelar</button><button class="btn" type="submit">Salvar</button></div>';
  form.onsubmit=async function(event){
    event.preventDefault();if(form.getAttribute('aria-busy')==='true')return;
    document.getElementById('formError').textContent='';form.setAttribute('aria-busy','true');
    var buttons=Array.from(form.querySelectorAll('button'));buttons.forEach(function(button){button.disabled=true;});
    try{await submit(event);}catch(error){toast(error.message||'Não foi possível salvar.');}
    finally{form.removeAttribute('aria-busy');buttons.forEach(function(button){button.disabled=false;});}
  };
  var modal=document.getElementById('modal');modal.classList.add('on');modal.setAttribute('aria-hidden','false');document.querySelector('.app').inert=true;
  labelFields(form);(form.querySelector('input,select,textarea')||modal.querySelector('button')).focus();
}
function closeModal(){
  var modal=document.getElementById('modal');modal.classList.remove('on');modal.setAttribute('aria-hidden','true');document.querySelector('.app').inert=false;
  if(modalReturnFocus?.isConnected)modalReturnFocus.focus();else document.getElementById('content').focus();
  modalReturnFocus=null;whatsappPairing=null;
}
function field(label,name,type,extra){
  var id='field_'+(++fieldSequence);
  return '<div class="field"><label for="'+id+'">'+label+'</label><input class="input" id="'+id+'" name="'+name+'" type="'+(type||'text')+'" '+(extra||'')+'></div>';
}
function select(label,name,options){
  var id='field_'+(++fieldSequence);
  return '<div class="field"><label for="'+id+'">'+label+'</label><select class="input" id="'+id+'" name="'+name+'">'+options+'</select></div>';
}
function labelFields(root){
  root.querySelectorAll('input,select,textarea').forEach(function(field){
    var label=field.closest('.field')?.querySelector('label');
    if(!field.id)field.id='field_'+(++fieldSequence);
    if(label&&!label.contains(field))label.htmlFor=field.id;
    if(!field.labels?.length&&!field.hasAttribute('aria-label'))field.setAttribute('aria-label',field.placeholder||field.name||'Campo');
  });
}
new MutationObserver(function(){labelFields(document.getElementById('content'));labelFields(document.getElementById('form'));}).observe(document.body,{childList:true,subtree:true});
document.addEventListener('keydown',function(event){
  var modal=document.getElementById('modal'),drawer=document.getElementById('side'),root=modal.classList.contains('on')?modal:drawer.classList.contains('open')&&matchMedia('(max-width:900px)').matches?drawer:null;
  if(!root)return;
  if(event.key==='Escape'){event.preventDefault();if(root===modal)closeModal();else menu(false);return;}
  if(event.key==='Tab'){
    var fields=Array.from(root.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')).filter(function(element){return element.getClientRects().length;});
    if(!fields.length)return;
    var first=fields[0],last=fields[fields.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
});
matchMedia('(max-width:900px)').addEventListener('change',function(){menu(false);syncDrawer();});
window.addEventListener('hashchange',function(){show(decodeURIComponent(location.hash.slice(1)));});
function apiCredentialsPanel(){
 return '<div class="card api-credentials-panel"><h3>Chaves de IA e serviços técnicos</h3><p class="muted">Use esta área para provedores de IA e serviços técnicos. <b>Não cadastre aqui chaves de lojas ou afiliados</b>; use a seção Credenciais das lojas. As chaves são criptografadas e só mostramos os últimos quatro caracteres.</p><div class="grid three">'+[
 ["OpenAI","https://platform.openai.com/api-keys","Criar chave OpenAI"],
 ["Google Gemini","https://aistudio.google.com/app/apikey","Criar chave Gemini"],
 ["Anthropic Claude","https://console.anthropic.com/settings/keys","Criar chave Claude"],
 ["Runway","https://dev.runwayml.com/","Criar acesso Runway"]
 ].map(function(x){return '<div class="integration"><div class="grow"><b>'+esc(x[0])+'</b><p class="muted">Abra a plataforma oficial para criar ou consultar suas credenciais.</p><a class="btn secondary" href="'+x[1]+'" target="_blank" rel="noopener noreferrer">'+esc(x[2])+' ↗</a></div></div>';}).join("")+
 '</div><div class="formgrid"><div class="field"><label for="apiProvider">Plataforma da API</label><select class="input" id="apiProvider" name="apiProvider"><option value="OPENAI">OpenAI</option><option value="GEMINI">Google Gemini</option><option value="ANTHROPIC">Anthropic Claude</option><option value="RUNWAY">Runway</option><option value="CUSTOM">Outra API</option></select></div><div class="field"><label for="apiLabel">Nome da API (obrigatório para Outra API)</label><input class="input" id="apiLabel" name="apiLabel" placeholder="Ex.: API de análise de links"></div></div><div class="field"><label for="apiKeyInput">Chave da API</label><input class="input" id="apiKeyInput" name="apiKeyInput" type="password" autocomplete="new-password" placeholder="Cole sua chave secreta aqui" maxlength="4096" required><p class="muted">Nunca compartilhe sua chave. Ela será criptografada e não poderá ser visualizada novamente.</p></div><div class="actions"><button class="btn" type="button" data-action="saveApiCredential()">Cadastrar / atualizar API</button><button class="btn secondary" type="button" data-action="loadApiCredentials()">Atualizar lista</button></div><div id="apiCredentialNotice" class="callout" role="status" hidden></div><h3>APIs cadastradas</h3><div id="apiCredentialsList" class="grid two"><div class="empty">Carregando APIs cadastradas...</div></div></div>';
}
async function loadApiCredentials(){
 var list=document.getElementById("apiCredentialsList");if(!list)return;
 list.innerHTML='<div class="empty">Carregando credenciais cadastradas...</div>';
 try{
  var response=await fetch("/api/integrations/apis"),data=await response.json();
  if(!response.ok)throw Error(data.error||"Não foi possível carregar as APIs.");
  list.innerHTML=(data.items||[]).length?(data.items||[]).map(function(item){
   return '<div class="integration"><div class="grow"><b>'+esc(item.label||item.provider)+'</b><div class="muted">'+esc(item.provider)+' · chave terminada em ••••'+esc(item.keyLast4||'')+'</div><small class="muted">Cadastrada em '+esc(item.updatedAt?new Date(item.updatedAt).toLocaleDateString("pt-BR"):"—")+'</small></div><button class="btn danger" type="button" data-action="deleteApiCredential(\''+esc(item.provider)+'\')">Excluir</button></div>';
  }).join(""):'<div class="empty">Nenhuma API cadastrada ainda.</div>';
 }catch(error){list.innerHTML='<div class="empty" role="alert">'+esc(error.message)+'</div>';}
}
async function saveApiCredential(){
 var provider=document.getElementById("apiProvider"),label=document.getElementById("apiLabel"),key=document.getElementById("apiKeyInput"),notice=document.getElementById("apiCredentialNotice");
 if(!provider||!key||!notice)return;
 notice.hidden=false;notice.textContent="Protegendo e cadastrando a chave...";
 try{
  var response=await fetch("/api/integrations/apis",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({provider:provider.value,label:label?label.value:"",apiKey:key.value})}),data=await response.json();
  if(!response.ok)throw Error(data.error||"Não foi possível cadastrar a API.");
  key.value="";if(label)label.value="";
  notice.textContent=data.message||"API cadastrada com segurança.";await loadApiCredentials();toast("API cadastrada com segurança.");
 }catch(error){notice.textContent=error.message;toast(error.message);}
}
async function deleteApiCredential(provider){
 if(!confirm("Excluir a credencial de "+provider+"? Essa ação não pode ser desfeita."))return;
 try{
  var response=await fetch("/api/integrations/apis?provider="+encodeURIComponent(provider),{method:"DELETE"}),data=await response.json();
  if(!response.ok)throw Error(data.error||"Não foi possível excluir a API.");
  toast(data.deleted?"Credencial excluída.":"Nenhuma credencial encontrada.");await loadApiCredentials();
 }catch(error){toast(error.message);}
}
function marketplaceCredentialsPanel(){
 return '<div class="card csp-margin-bottom-16px"><h3>Credenciais das lojas</h3><p class="muted">Cadastre apenas chaves, tokens e IDs emitidos pelo portal oficial. Salvar credenciais não significa que a API foi validada; nenhuma oferta é publicada por esta tela.</p><div id="marketplaceCredentialStatus" class="grid two"><div class="empty">Carregando estado das lojas...</div></div><div id="lomadeeDataPanel" class="csp-margin-top-16px"></div></div>';
}
async function loadMarketplaceStatus(){
 var root=document.getElementById('marketplaceCredentialStatus');if(!root)return;
 try{
  var data=await operationRequest('/api/integrations/marketplaces');
  root.innerHTML=(data.items||[]).map(function(item){
   var status=item.id==='SHEIN'?'Links oficiais · importação manual':(item.id==='MAGALU'||item.id==='MERCADOLIVRE')&&item.status==='CONNECTED'?'Conta conectada via OAuth':item.id==='MAGALU'?(item.credentialFields||[]).indexOf('apiKey')!==-1&&(item.credentialFields||[]).indexOf('apiKeyId')!==-1&&(item.credentialFields||[]).indexOf('apiKeySecret')!==-1?'3 chaves salvas · conecte a conta':'Chaves API pendentes · afiliado manual':item.status==='VALIDATED'?'Validada':item.status==='ERROR'?'Erro de validação':item.status==='PENDING_VALIDATION'?'Chaves salvas · validação pendente':item.status==='NOT_CONFIGURED'?'Não configurada':item.id==='ALIEXPRESS'?'API legada · validação pendente':item.id==='AWIN'?'Awin · validação pendente':'Status não reconhecido';
   var cls=(item.status==='VALIDATED'||item.status==='CONNECTED')?'live':'warn';
   var fields=(item.credentialFields||[]).map(esc).join(', ');
   var lomadeeActions=item.id==='LOMADEE'&&(item.credentialFields||[]).indexOf('apiKey')!==-1?'<button class="btn secondary" type="button" data-action="testLomadeeConnection()">Testar API</button>'+(item.status==='VALIDATED'?' <button class="btn secondary" type="button" data-action="loadLomadeeContents()">Conteúdos</button> <button class="btn secondary" type="button" data-action="loadLomadeeCommissions()">Regras de comissão</button> <button class="btn secondary" type="button" data-action="loadLomadeeOrders()">Pedidos</button>':''):'';
   var shopeeActions=item.id==='SHOPEE'&&(item.credentialFields||[]).indexOf('appId')!==-1&&(item.credentialFields||[]).indexOf('apiSecret')!==-1?'<button class="btn secondary" type="button" data-action="openShopeeTools()">Ferramentas Shopee</button>':'';
   var amazonActions=item.id==='AMAZON'&&(item.credentialFields||[]).indexOf('clientId')!==-1&&(item.credentialFields||[]).indexOf('clientSecret')!==-1?'<button class="btn secondary" type="button" data-action="openAmazonTools()">Ferramentas Amazon</button>':'';
   var sheinActions=item.id==='SHEIN'?'<button class="btn secondary" type="button" data-action="openSheinTools()">Ferramentas SHEIN</button>':'';
   var aliexpressActions=item.id==='ALIEXPRESS'&&(item.credentialFields||[]).indexOf('appId')!==-1&&(item.credentialFields||[]).indexOf('apiSecret')!==-1?'<button class="btn secondary" type="button" data-action="openAliExpressTools()">Ferramentas AliExpress</button>':'';
   var awinActions=item.id==='AWIN'&&(item.credentialFields||[]).indexOf('accessToken')!==-1&&(item.credentialFields||[]).indexOf('affiliateId')!==-1?'<button class="btn secondary" type="button" data-action="openAwinTools()">Ferramentas Awin</button>':'';
   var rakutenActions=item.id==='RAKUTEN'&&(item.credentialFields||[]).indexOf('accessToken')!==-1?'<button class="btn secondary" type="button" data-action="openRakutenTools()">Ferramentas Rakuten</button>':'';
   var admitadActions=item.id==='ADMITAD'&&(item.credentialFields||[]).indexOf('clientId')!==-1&&(item.credentialFields||[]).indexOf('clientSecret')!==-1?'<button class="btn secondary" type="button" data-action="openAdmitadTools()">Ferramentas Admitad</button>':'';
   return '<div class="integration"><div class="grow"><b>'+esc(item.name)+'</b><div class="muted">'+(item.id==='SHEIN'?'Importe links gerados no Centro de Afiliados.':item.id==='MAGALU'?(fields.indexOf('apiKey')!==-1&&fields.indexOf('apiKeyId')!==-1&&fields.indexOf('apiKeySecret')!==-1?'API Magalu: três chaves salvas; autenticação e teste oficial ainda pendentes.':'API Key, API Key ID e API Key Secret ainda não cadastradas. Links de afiliado são um fluxo separado.'):(fields?'Campos cadastrados: '+fields:'Nenhuma credencial cadastrada.'))+'</div>'+(item.updatedAt?'<small class="muted">Atualizado em '+esc(new Date(item.updatedAt).toLocaleDateString('pt-BR'))+'</small>':'')+'<div class="csp-margin-top-10px"><a class="btn secondary" href="'+esc(item.portalUrl)+'" target="_blank" rel="noopener noreferrer">Abrir portal ↗</a> <button class="btn secondary" type="button" data-action="'+(item.id==='MAGALU'?'connectMagaluAccount()':item.id==='MERCADOLIVRE'?'connectMercadoLivre()':'openMarketplaceSetup(\''+esc(item.id)+'\')')+'">'+((item.id==='MAGALU'||item.id==='MERCADOLIVRE')?'Conectar conta':item.id==='SHEIN'?'Preparar oferta':(fields?'Atualizar chaves':'Conectar conta'))+'</button> '+(item.id==='MAGALU'?'<button class="btn secondary" type="button" data-action="openMagaluApiCredentials()">Atualizar chaves API</button> <button class="btn secondary" type="button" data-action="openMagaluTools()">Importar link de afiliado</button>':'')+' '+lomadeeActions+' '+shopeeActions+' '+amazonActions+' '+sheinActions+' '+aliexpressActions+' '+awinActions+' '+rakutenActions+' '+admitadActions+'</div></div><span class="pill '+cls+'">'+status+'</span></div>';
  }).join('')||'<div class="empty">Nenhuma loja disponível.</div>';
  var overviewCode={MERCADOLIVRE:'ML',SHOPEE:'SH',AMAZON:'AMZ',ALIEXPRESS:'ALI',SHEIN:'SHN',MAGALU:'MAG',CASAS_BAHIA:'CB',HOTMART:'HOT',KABUM:'KB',AMERICANAS:'AME',LOMADEE:'LOM',AWIN:'AWIN',RAKUTEN:'RAK',ADMITAD:'ADM'};
  (data.items||[]).forEach(function(item){
   var code=overviewCode[item.id],card=code?document.querySelector('.integration[data-integration-code="'+code+'"]'):null,pill=card&&card.querySelector('.pill');
   if(!pill)return;
   var label=item.id==='SHEIN'?'Fluxo manual':item.id==='MAGALU'&&item.status==='CONNECTED'?'Conta conectada':item.id==='MAGALU'?(item.credentialFields||[]).indexOf('apiKey')!==-1&&(item.credentialFields||[]).indexOf('apiKeyId')!==-1&&(item.credentialFields||[]).indexOf('apiKeySecret')!==-1?'Conecte a conta':'Chaves pendentes':item.status==='CONNECTED'?'Conta conectada':item.status==='VALIDATED'?'Validada':item.status==='ERROR'?'Erro':item.status==='PENDING_VALIDATION'?'Validação pendente':item.status==='NOT_CONFIGURED'?'Não configurada':item.status;
   pill.textContent=label;pill.className='pill '+((item.status==='VALIDATED'||item.status==='CONNECTED')?'live':'warn');
  });
 }catch(error){root.innerHTML='<div class="empty" role="alert">'+esc(error.message)+'</div>';}
}
var originalIntegrations=integrations;
integrations=function(){
  var readiness=D.readiness;
  var panel=readiness?'<div class="card csp-margin-bottom-16px" ><h2>Prontidão da operação</h2><p>Configuração: '+readiness.operationalPercent+'%. '+(readiness.productionReady?'Entrega recente confirmada.':'Há etapas pendentes antes de ativar a operação.')+'</p>'+readiness.core.filter(function(item){return !item.ready;}).map(function(item){return '<p><strong>'+esc(item.label)+':</strong> '+esc(item.action)+'</p>';}).join('')+'</div>':'';
  return panel+originalIntegrations()+
    '<details class="card csp-margin-bottom-16px integration-details"><summary><b>Credenciais das lojas</b><p class="muted">Chaves e IDs de marketplaces e redes de afiliados. Abra somente para cadastrar ou validar credenciais.</p></summary><div class="csp-margin-top-16px">'+marketplaceCredentialsPanel()+'</div></details>'+
    '<details class="card csp-margin-bottom-16px integration-details"><summary><b>Chaves de IA e serviços técnicos</b><p class="muted">OpenAI, Gemini, Claude, Runway ou outra API técnica. Não use para credenciais de lojas.</p></summary><div class="csp-margin-top-16px">'+apiCredentialsPanel()+'</div></details>';
};
syncDrawer();nav();load();

async function operationRequest(path,body){
  var r=await fetch(path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
  var data=await r.json();if(!r.ok)throw Error(data.error || 'Operação indisponível.');return data;
}
async function openMarketplaceSetup(provider){
  if(provider==='SHEIN'){openSheinTools();return;}
  if(provider==='MAGALU'){openMagaluApiCredentials();return;}
    if(provider==='ALIEXPRESS'){/* continue with the provider-specific secure credential form below */}
  try{
    var data=await operationRequest('/api/integrations/marketplaces');
    var item=(data.items||[]).find(function(x){return x.id===provider;});
    if(!item)throw Error('Loja não encontrada no catálogo de integrações.');
    var body='<p class="muted">'+esc(item.authModel)+'</p>'+
      field('ID de afiliado / Partner ID','affiliateId','text','autocomplete="off" maxlength="4096"')+
      field('App ID / Client ID','appId','text','autocomplete="off" maxlength="4096"')+
      field('Client ID (se o portal usar este nome)','clientId','text','autocomplete="off" maxlength="4096"')+
      field('Chave de API / Partner Key','apiKey','password','autocomplete="new-password" maxlength="4096"')+
      field('Segredo de API / App Secret','apiSecret','password','autocomplete="new-password" maxlength="4096"')+
      field('Client Secret','clientSecret','password','autocomplete="new-password" maxlength="4096"')+
      field('Token de acesso (se fornecido)','accessToken','password','autocomplete="new-password" maxlength="4096"')+
      field('Tracking ID / SubID padrão (opcional)','trackingId','text','autocomplete="off" maxlength="4096"')+
      field('Outro campo oficial (opcional)','extra','text','placeholder="Ex.: campo=valor; não inclua senha de login nem cookies" maxlength="4096"')+
      '<div class="callout">As credenciais serão criptografadas no servidor. O sistema não testa nem declara a conta conectada nesta etapa. A ativação só poderá ocorrer após validar o endpoint oficial e as permissões da conta.</div>';
    if(provider==='LOMADEE') body=field('Chave de autenticação da API (x-auth-key)','apiKey','password','autocomplete="new-password" maxlength="4096" required')+'<div class="callout">Use a chave de API emitida para sua conta Lomadee — não a senha de login. O Radar valida a chave com uma consulta de leitura ao endpoint oficial de conteúdos. A SDK pública verificada oferece consultas de conteúdos, regras de comissão e pedidos; geração de deeplinks e descoberta de produtos não estão documentadas nessa SDK.</div>';
    if(provider==='ALIEXPRESS') body=field('App Key (App ID)','appId','text','autocomplete="off" maxlength="200" required')+field('App Secret','apiSecret','password','autocomplete="new-password" maxlength="4096" required')+field('Tracking ID','trackingId','text','autocomplete="off" maxlength="200" required')+field('App Signature (se exigida pelo portal)','appSignature','password','autocomplete="new-password" maxlength="300"')+'<label class="csp-margin-top-10px"><input type="checkbox" name="legacyApiAcknowledged" value="true" required> Entendo que a documentação pública da Affiliate API está marcada como descontinuada e confirmo que o portal ainda habilita esse acesso para minha conta.</label><div class="callout">As credenciais serão criptografadas no servidor. O teste faz uma consulta somente leitura; não cria links nem publica ofertas. A API só será considerada funcional depois de responder à consulta real.</div>';
    if(provider==='AWIN') body=field('Token Bearer da API Awin','accessToken','password','autocomplete="new-password" maxlength="4096" required')+field('Publisher ID numérico','affiliateId','text','inputmode="numeric" pattern="[0-9]{1,20}" maxlength="20" required')+'<div class="callout">Gere o token na interface oficial Awin. Não use senha de login nem chave de feed de produto neste campo. O teste consulta os programas joined em modo somente leitura. A consulta de feed exige o ID de anunciante e um locale autorizado. Nenhuma oferta será publicada.</div>';
    if(provider==='RAKUTEN') body=field('Token Bearer da API Rakuten','accessToken','password','autocomplete="new-password" maxlength="4096" required')+field('ID da conta de afiliado (opcional)','affiliateId','text','autocomplete="off" maxlength="100"')+'<div class="callout">Gere um token no Developer Portal da Rakuten Advertising. O token normalmente expira em 60 minutos, então será necessário gerar outro no portal quando expirar. O teste consulta anunciantes em modo somente leitura; a busca de produtos usa XML oficial e deeplinks exigem parceria aprovada. Nenhuma oferta será publicada.</div>';
    if(provider==='ADMITAD') body=field('Client ID da aplicação Admitad','clientId','text','autocomplete="off" maxlength="300" required')+field('Client Secret da aplicação Admitad','clientSecret','password','autocomplete="new-password" maxlength="4096" required')+field('Website ID (ID da sua plataforma/site)','affiliateId','text','inputmode="numeric" pattern="[0-9]{1,20}" maxlength="20" required')+'<div class="callout">O Radar solicita o token OAuth oficial e renova-o usando o refresh token criptografado. A aplicação precisa ter os escopos advcampaigns, advcampaigns_for_website, deeplink_generator e websites. O teste consulta campanhas da plataforma; gerar deeplink cria apenas uma URL rastreável, sem publicar ofertas.</div>';
    if(provider==='SHOPEE') body=field('App ID da Open API Shopee','appId','text','autocomplete="off" maxlength="200" required')+field('App Secret da Open API Shopee','apiSecret','password','autocomplete="new-password" maxlength="4096" required')+'<div class="callout">Use somente App ID e App Secret emitidos para a Open API de Afiliados Shopee. Se ainda não tiver acesso, solicite a habilitação pelo portal oficial. A validação inicial fará uma consulta de ofertas somente leitura; nenhum link será criado e nenhuma oferta será publicada.</div>';
    if(provider==='AMAZON') body=field('Credential ID (Creators API)','clientId','text','autocomplete="off" maxlength="500" required')+field('Credential Secret (Creators API)','clientSecret','password','autocomplete="new-password" maxlength="4096" required')+field('Partner Tag / ID de Associado','affiliateId','text','autocomplete="off" maxlength="200" required')+'<label for="amazonVersion">Versão da credencial emitida pela Amazon</label><select id="amazonVersion" name="version" required><option value="3.1" selected>3.1 · América do Norte / Brasil</option><option value="3.2">3.2 · Europa</option><option value="3.3">3.3 · Extremo Oriente</option></select><label for="amazonMarketplace">Marketplace</label><select id="amazonMarketplace" name="marketplace" required><option value="www.amazon.com.br" selected>Amazon Brasil (www.amazon.com.br)</option><option value="www.amazon.com">Amazon EUA (www.amazon.com)</option><option value="www.amazon.co.uk">Amazon Reino Unido (www.amazon.co.uk)</option><option value="www.amazon.de">Amazon Alemanha (www.amazon.de)</option><option value="www.amazon.co.jp">Amazon Japão (www.amazon.co.jp)</option></select><div class="callout">Use credenciais próprias da Creators API, não as antigas chaves PA-API nem a senha da conta. A conta precisa estar aprovada no programa de Associados e habilitada para a API. O teste realiza uma busca de leitura e não publica ofertas.</div>';
    openModal('Preparar conexão · '+item.name,provider==='LOMADEE'?'Abra o portal Lomadee, procure as credenciais de API e informe somente a chave de autenticação. Se o portal não disponibilizar uma chave, não informe sua senha: solicite ao suporte Lomadee a habilitação e documentação da API.':provider==='SHOPEE'?'Use as credenciais da Open API de Afiliados, não sua senha da conta Shopee. O botão de teste valida a autenticação com uma consulta somente leitura.':provider==='AMAZON'?'Abra Creators API em Associados Amazon e use Credential ID, Credential Secret, versão atribuída e Partner Tag. Não use as chaves antigas PA-API nem a senha de login.':'Abra o portal oficial, copie apenas as credenciais de API emitidas para sua conta e preencha os campos aplicáveis. Não informe senha de login, cookies ou códigos de recuperação.',body,async function(event){
      event.preventDefault();
      var formData=new FormData(event.target),credentials={};
      ['affiliateId','appId','clientId','apiKey','apiSecret','clientSecret','accessToken','trackingId','version','marketplace','appSignature','legacyApiAcknowledged','extra'].forEach(function(key){var value=String(formData.get(key)||'').trim();if(value)credentials[key]=value;});
      var result=await operationRequest('/api/integrations/marketplaces',{marketplace:provider,credentials:credentials});
      closeModal();
      var testRoutes={AMAZON:{path:'/api/integrations/amazon',body:{action:'test'}},SHOPEE:{path:'/api/integrations/shopee',body:{action:'test'}},ALIEXPRESS:{path:'/api/integrations/aliexpress',body:{action:'test'}},AWIN:{path:'/api/integrations/awin',body:{action:'test'}},RAKUTEN:{path:'/api/integrations/rakuten',body:{action:'test'}},ADMITAD:{path:'/api/integrations/admitad',body:{action:'test'}},LOMADEE:{path:'/api/integrations/lomadee',body:{action:'validate'}}};
      var testRoute=testRoutes[provider];
      if(testRoute){try{var testResult=await operationRequest(testRoute.path,testRoute.body);await loadMarketplaceStatus();toast(testResult.status==='VALIDATED'||testResult.ok?'Credenciais salvas e conexão validada pela API oficial.':'Teste concluído; confira o estado da integração.');}catch(testError){await loadMarketplaceStatus();toast('Credenciais salvas, mas a validação falhou: '+(testError.message||'verifique credenciais, escopos e acesso ao programa.'));}}
      else{await loadMarketplaceStatus();toast(result.message||'Credenciais salvas. Este provedor ainda exige confirmação manual ou outro fluxo oficial; não foi marcado como conectado.');}
    });
  }catch(error){toast(error.message||'Não foi possível abrir o cadastro de credenciais.');}
}
async function testLomadeeConnection(){
  try{
    var result=await operationRequest('/api/integrations/lomadee',{action:'validate'});
    await loadMarketplaceStatus();
    toast(result.status==='VALIDATED'?'Lomadee autenticada. Consultas de leitura habilitadas.':'Validação da Lomadee concluída.');
  }catch(error){await loadMarketplaceStatus();toast(error.message||'Não foi possível validar a chave Lomadee.');}
}
async function loadLomadeeContents(){return loadLomadeeResource('contents');}
async function loadLomadeeCommissions(){return loadLomadeeResource('commissions');}
async function loadLomadeeOrders(){return loadLomadeeResource('orders');}
async function loadLomadeeResource(resource){
  var panel=document.getElementById('lomadeeDataPanel');if(!panel)return;
  panel.innerHTML='<div class="empty">Consultando dados da Lomadee...</div>';
  try{
    var result=await operationRequest('/api/integrations/lomadee?resource='+encodeURIComponent(resource)+'&limit=10');
    var labels={contents:'Conteúdos disponíveis',commissions:'Regras de comissão',orders:'Pedidos'};
    var rows=result.items||[];
    panel.innerHTML='<h3>'+esc(labels[resource]||'Dados Lomadee')+'</h3><p class="muted">Consulta somente leitura · '+rows.length+' registro(s) retornado(s). Dados pessoais de clientes são omitidos.</p>'+
      (rows.length?rows.map(function(item){
        var heading=item.title||item.name||item.id||'Registro';
        var details=resource==='contents'?[item.type,item.status,item.highlighted?'Destaque':''].filter(Boolean).join(' · '):
          resource==='commissions'?[item.type,item.value===null?'':String(item.value),item.active?'Ativa':'Inativa',item.startAt,item.endAt].filter(Boolean).join(' · '):
          [item.status,item.value===null?'':String(item.value),item.createdAt].filter(Boolean).join(' · ');
        return '<div class="integration"><div class="grow"><b>'+esc(heading)+'</b><div class="muted">'+esc(details)+'</div>'+(item.url?'<a href="'+esc(item.url)+'" target="_blank" rel="noopener noreferrer">Abrir conteúdo oficial ↗</a>':'')+'</div></div>';
      }).join(''):'<div class="empty">A API não retornou registros para esta consulta.</div>');
  }catch(error){panel.innerHTML='<div class="empty" role="alert">'+esc(error.message||'Consulta indisponível.')+'</div>';}
}
async function connectMagaluAccount(){
  try{var result=await operationRequest('/api/integrations/magalu-connect');if(!result.authorizationUrl)throw Error('A Magalu não retornou a URL de autorização.');window.location.href=result.authorizationUrl;}
  catch(error){toast(error.message||'Não foi possível iniciar a conexão Magalu. Confira as credenciais OAuth do aplicativo.');}
}
async function openMagaluApiCredentials(){
  try{
    var data=await operationRequest('/api/integrations/marketplaces');
    var item=(data.items||[]).find(function(x){return x.id==='MAGALU';});
    var body='<p class="muted">Preencha os três campos exatamente como aparecem no portal Magalu. Não substitua estes campos por Client ID/Client Secret.</p>'+field('API Key','apiKey','text','autocomplete="off" maxlength="4096" required')+field('API Key ID','apiKeyId','text','autocomplete="off" maxlength="4096" required')+field('API Key Secret','apiKeySecret','password','autocomplete="new-password" maxlength="4096" required')+'<div class="callout"><b>Estado real:</b> as três credenciais serão criptografadas e salvas como pendentes. Ainda precisamos confirmar o tipo de API Magalu habilitada na sua conta e implementar/testar a autenticação oficial correspondente antes de declarar a conexão ativa. Não informe senha do portal nem cookies.</div>';
    openModal('Cadastrar chaves · Magalu','Use API Key, API Key ID e API Key Secret emitidas pelo portal Magalu. O cadastro das chaves, sozinho, não conecta a loja.',body,async function(event){
      event.preventDefault();var fd=new FormData(event.target),credentials={apiKey:String(fd.get('apiKey')||'').trim(),apiKeyId:String(fd.get('apiKeyId')||'').trim(),apiKeySecret:String(fd.get('apiKeySecret')||'').trim()};
      try{var result=await operationRequest('/api/integrations/marketplaces',{marketplace:'MAGALU',credentials:credentials});closeModal();await loadMarketplaceStatus();toast(result.message||'Chaves salvas; OAuth e validação continuam pendentes.');}
      catch(error){toast(error.message||'Não foi possível salvar as chaves Magalu.');}
    });
  }catch(error){toast(error.message||'Não foi possível abrir o cadastro de chaves Magalu.');}
}
async function openMagaluTools(){
  var body='<label for="magaluAction">Operação Parceiro Magalu</label><select id="magaluAction" name="action" required><option value="validate_link">Validar domínio do link (sem salvar)</option><option value="create_draft">Criar rascunho de oferta pendente</option></select>'+
    field('Título do produto','title','text','maxlength="220" placeholder="Nome do produto"')+
    field('Link de afiliado gerado na sua conta','affiliateUrl','url','maxlength="2000" placeholder="https://www.magazinevoce.com.br/..."')+
    field('Link do produto (opcional)','productUrl','url','maxlength="2000"')+
    field('Imagem HTTPS do produto','imageUrl','url','maxlength="1200"')+
    field('Preço atual em reais','currentPrice','number','min="0.01" step="0.01"')+
    field('Preço original em reais (opcional)','originalPrice','number','min="0.01" step="0.01"')+
    field('ID da categoria no Radar (opcional)','categoryId','text','maxlength="80"')+
    '<label class="csp-margin-top-10px"><input type="checkbox" name="affiliateLinkConfirmed" value="true"> Confirmo que copiei este link do meu painel oficial do Parceiro Magalu e que o rastreamento foi gerado pela minha conta.</label>'+
    '<div class="callout"><b>Limitação conhecida:</b> não foi confirmada API pública de afiliados do Parceiro Magalu. As APIs do Magalu Devs atendem operações de sellers/marketplace e não substituem a geração de links de influenciador. O Radar só valida o domínio, não confirma comissão ou rastreamento. O rascunho fica pendente e não é publicado.</div>';
  openModal('Importar link · Parceiro Magalu','Use links que você mesmo gerou na conta oficial. Não informe senha nem cookies.',body,async function(event){
    event.preventDefault();var fd=new FormData(event.target),action=String(fd.get('action')||'validate_link'),payload={action:action};
    ['title','affiliateUrl','productUrl','imageUrl','currentPrice','originalPrice','categoryId'].forEach(function(key){var value=String(fd.get(key)||'').trim();if(value)payload[key]=value;});
    payload.affiliateLinkConfirmed=fd.get('affiliateLinkConfirmed')==='true';
    try{
      var result=await operationRequest('/api/integrations/magalu',payload);
      if(action==='validate_link'){closeModal();openModal('Validação do link Magalu','O resultado confere apenas o domínio, não a comissão nem o rastreamento.','<pre style="white-space:pre-wrap;max-height:55vh;overflow:auto;word-break:break-word">'+esc(JSON.stringify(result,null,2))+'</pre>',function(e){e.preventDefault();closeModal();});var submit=document.querySelector('#form button[type="submit"]');if(submit)submit.textContent='Fechar';return;}
      closeModal();await load();await loadMarketplaceStatus();toast('Rascunho Magalu criado; aprovação e publicação continuam desativadas.');
      openModal('Rascunho Magalu criado','A oferta foi salva como pendente e não foi publicada.','<p><b>ID:</b> '+esc(result.offerId)+'</p><p><b>Status:</b> '+esc(result.status)+'</p><p>'+esc(result.message)+'</p>',function(e){e.preventDefault();closeModal();});var submit2=document.querySelector('#form button[type="submit"]');if(submit2)submit2.textContent='Fechar';
    }catch(error){toast(error.message||'Não foi possível validar ou preparar o rascunho Magalu.');}
  });var submit=document.querySelector('#form button[type="submit"]');if(submit)submit.textContent='Executar';
}
async function openSheinTools(){
  var body='<label for="sheinAction">Operação</label><select id="sheinAction" name="action" required><option value="validate_link">Validar domínio do link (sem salvar)</option><option value="create_draft">Criar rascunho de oferta pendente</option></select>'+
    field('Título do produto','title','text','maxlength="220" placeholder="Nome do produto"')+
    field('Link de afiliado gerado no Centro de Afiliados','affiliateUrl','url','maxlength="2000" placeholder="https://onelink.shein.com/..."')+
    field('Link normal do produto (opcional)','productUrl','url','maxlength="2000" placeholder="https://br.shein.com/..."')+
    field('Preço atual em reais','currentPrice','number','min="0.01" step="0.01"')+
    field('Preço original em reais (opcional)','originalPrice','number','min="0.01" step="0.01"')+
    field('URL HTTPS da imagem do produto','imageUrl','url','maxlength="1200" placeholder="https://..."')+
    '<label class="csp-margin-top-10px"><input type="checkbox" name="affiliateLinkConfirmed" value="true"> Confirmei que o link foi gerado/copiado na minha conta do Centro de Afiliados SHEIN e que ele inclui meu rastreamento.</label>'+
    '<div class="callout">A SHEIN não disponibiliza uma API pública de afiliados validada neste fluxo. Use somente links gerados na sua conta. A validação verifica o domínio, não comprova comissão. Criar rascunho não publica nem aprova a oferta; a imagem e os preços precisam ser revisados manualmente.</div>';
  openModal('Ferramentas · SHEIN Afiliados','Importe um link oficial e prepare um rascunho. Não cole senha, cookies ou códigos de acesso.',body,async function(event){
    event.preventDefault();
    var fd=new FormData(event.target),action=String(fd.get('action')||'validate_link');
    var payload={action:action,affiliateUrl:String(fd.get('affiliateUrl')||'').trim(),productUrl:String(fd.get('productUrl')||'').trim()};
    try{
      if(action==='validate_link'){
        var check=await operationRequest('/api/integrations/shein',payload);
        closeModal();
        openModal('Validação de link SHEIN','Domínio conferido; rastreamento não foi verificado pela API.','<pre style="white-space:pre-wrap;max-height:55vh;overflow:auto;word-break:break-word">'+esc(JSON.stringify(check,null,2))+'</pre>',function(e){e.preventDefault();closeModal();});
        var submit=document.querySelector('#form button[type="submit"]');if(submit)submit.textContent='Fechar';
        return;
      }
      payload.title=String(fd.get('title')||'').trim();
      payload.currentPrice=String(fd.get('currentPrice')||'').trim();
      payload.originalPrice=String(fd.get('originalPrice')||'').trim();
      payload.imageUrl=String(fd.get('imageUrl')||'').trim();
      payload.affiliateLinkConfirmed=fd.get('affiliateLinkConfirmed')==='true';
      var result=await operationRequest('/api/integrations/shein',payload);
      closeModal();
      await load();await loadMarketplaceStatus();
      toast('Rascunho SHEIN criado; aprovação e publicação continuam desativadas.');
      openModal('Rascunho SHEIN criado','A oferta foi salva como pendente e não foi publicada.','<p><b>ID:</b> '+esc(result.offerId)+'</p><p><b>Status:</b> '+esc(result.status)+'</p><p>'+esc(result.message)+'</p>',function(e){e.preventDefault();closeModal();});
      var submit=document.querySelector('#form button[type="submit"]');if(submit)submit.textContent='Fechar';
    }catch(error){toast(error.message||'Não foi possível validar ou preparar a oferta SHEIN.');}
  });
  var submit=document.querySelector('#form button[type="submit"]');if(submit)submit.textContent='Executar';
}
async function openAliExpressTools(){
  var body='<label for="aliAction">Operação AliExpress</label><select id="aliAction" name="action" required><option value="test">Validar conexão (consulta somente leitura)</option><option value="products">Buscar produtos</option><option value="smartMatch">Recomendação inteligente</option><option value="hotProducts">Produtos em destaque</option><option value="hotProductsDownload">Baixar produtos em destaque</option><option value="productDetail">Detalhes de produtos por ID</option><option value="categories">Categorias</option><option value="campaigns">Campanhas em destaque</option><option value="campaignProducts">Produtos de uma campanha</option><option value="generateLink">Gerar link de afiliado</option><option value="orders">Consultar pedidos/comissões (API legada)</option><option value="orderDetail">Detalhes de pedidos por ID</option><option value="ordersByCursor">Consultar pedidos por cursor</option></select>'+field('Palavra-chave','keyword','text','maxlength="120" placeholder="Ex.: fone bluetooth"')+field('IDs dos produtos (separados por vírgula)','productIds','text','maxlength="500"')+field('ID de produto para recomendação inteligente','productId','text','maxlength="30"')+field('IDs dos pedidos (separados por vírgula)','orderIds','text','maxlength="500"')+field('Cursor start_query_index_id (relatórios)','cursor','text','maxlength="200"')+field('Site/região do portal (ex.: global)','localeSite','text','maxlength="30" value="global"')+field('IDs das categorias (separados por vírgula)','categoryIds','text','maxlength="200"')+field('ID da categoria para campanha','categoryId','text','maxlength="80"')+field('Nome exato da campanha','promotionName','text','maxlength="180"')+field('URL original do produto (gerar link)','productUrl','url','maxlength="2000" placeholder="https://www.aliexpress.com/item/..."')+field('País de entrega (ISO, padrão BR)','country','text','maxlength="2" value="BR"')+field('Página','page','number','min="1" max="1000" value="1"')+field('Itens por página (1–50)','pageSize','number','min="1" max="50" value="20"')+field('Preço mínimo (opcional)','minPrice','number','min="0" step="0.01"')+field('Preço máximo (opcional)','maxPrice','number','min="0" step="0.01"')+field('Início do relatório (AAAA-MM-DD HH:mm:ss)','startTime','text','maxlength="19" placeholder="2026-10-01 00:00:00"')+field('Fim do relatório (AAAA-MM-DD HH:mm:ss)','endTime','text','maxlength="19" placeholder="2026-10-02 23:59:59"')+field('Status do pedido','orderStatus','text','maxlength="50" value="Payment Completed"')+'<div class="callout"><b>Atenção:</b> a documentação pública dos métodos Affiliate API está marcada como descontinuada. Todas as consultas dependem de a sua conta ainda ter acesso. Busca, detalhes, categorias, campanhas e relatórios são somente leitura. Gerar link cria apenas um link rastreável; não publica em WhatsApp ou Telegram.</div>';
  openModal('Ferramentas · AliExpress Afiliados','Use apenas credenciais oficiais do portal. Não informe sua senha de login nem cookies.',body,async function(event){
    event.preventDefault();var fd=new FormData(event.target),action=String(fd.get('action')||'test'),payload={action:action};
    ['keyword','productIds','productId','orderIds','cursor','localeSite','categoryIds','categoryId','promotionName','productUrl','country','page','pageSize','minPrice','maxPrice','startTime','endTime','orderStatus'].forEach(function(key){var v=String(fd.get(key)||'').trim();if(v)payload[key]=v;});
    try{var result=await operationRequest('/api/integrations/aliexpress',payload);if(action==='test')await loadMarketplaceStatus();closeModal();openModal('Resultado · AliExpress','Resultado da API. Nenhuma oferta foi publicada.','<pre style="white-space:pre-wrap;max-height:55vh;overflow:auto;word-break:break-word">'+esc(JSON.stringify(result,null,2))+'</pre>',function(e){e.preventDefault();closeModal();});var submit=document.querySelector('#form button[type="submit"]');if(submit)submit.textContent='Fechar';}
    catch(error){toast(error.message||'Não foi possível executar a operação AliExpress.');}
  });var submit=document.querySelector('#form button[type="submit"]');if(submit)submit.textContent='Executar';
}
async function openRakutenTools(){
  var body='<label for="rakutenAction">Operação Rakuten</label><select id="rakutenAction" name="action" required><option value="test">Validar token (anunciantes)</option><option value="advertisers">Listar anunciantes</option><option value="search">Buscar produtos</option><option value="deep_link">Gerar deeplink com SubID</option></select>'+
    field('Palavra-chave para produtos','keyword','text','maxlength="100"')+
    field('ID numérico do anunciante','advertiserId','text','inputmode="numeric" pattern="[0-9]{1,20}" maxlength="20"')+
    field('URL HTTPS do produto (deeplink)','productUrl','url','maxlength="2000"')+
    field('Nome para identificar o link (opcional)','name','text','maxlength="100" value="Radar Promo Brasil"')+
    field('SubID / u1 (opcional)','subId','text','maxlength="80" pattern="[A-Za-z0-9_-]{1,80}"')+
    field('País para anunciantes (ex.: BRA)','countryCode','text','maxlength="3" value="BRA"')+
    field('Idioma para busca (ex.: pt_BR)','language','text','maxlength="10" value="pt_BR"')+
    field('Página','page','number','min="1" max="10000" value="1"')+
    field('Limite de resultados (1–100)','limit','number','min="1" max="100" value="20"')+
    '<div class="callout">O token temporário costuma expirar em 60 minutos. A busca de produtos é somente leitura. Gerar deeplink cria apenas uma URL de rastreamento e exige parceria aprovada e suporte a deep linking pelo anunciante; não publica a oferta.</div>';
  openModal('Ferramentas · Rakuten Advertising','Use token Bearer emitido no Developer Portal. Nunca informe senha nem client secret neste campo.',body,async function(event){
    event.preventDefault();var fd=new FormData(event.target),action=String(fd.get('action')||'test'),payload={action:action};
    ['keyword','advertiserId','productUrl','name','subId','countryCode','language','page','limit'].forEach(function(key){var value=String(fd.get(key)||'').trim();if(value)payload[key]=value;});
    try{var result=await operationRequest('/api/integrations/rakuten',payload);if(action==='test')await loadMarketplaceStatus();closeModal();openModal('Resultado · Rakuten','Resposta da API oficial. Nenhuma oferta foi publicada.','<pre style="white-space:pre-wrap;max-height:55vh;overflow:auto;word-break:break-word">'+esc(JSON.stringify(result,null,2))+'</pre>',function(e){e.preventDefault();closeModal();});var submit=document.querySelector('#form button[type="submit"]');if(submit)submit.textContent='Fechar';}
    catch(error){toast(error.message||'Não foi possível consultar a Rakuten Advertising.');}
  });var submit=document.querySelector('#form button[type="submit"]');if(submit)submit.textContent='Executar';
}
async function openAdmitadTools(){
  var body='<label for="admitadAction">Operação Admitad</label><select id="admitadAction" name="action" required><option value="test">Validar API e Website ID</option><option value="campaigns">Listar programas da plataforma</option><option value="product_feed">Pré-visualizar feed XML de produtos</option><option value="deeplink">Gerar deeplink com SubID</option></select>'+
    field('ID numérico da campanha','campaignId','text','inputmode="numeric" pattern="[0-9]{1,20}" maxlength="20"')+
    field('Índice do feed XML (0 para o primeiro)','feedIndex','number','min="0" max="20" value="0"')+
    field('URL HTTPS do produto (deeplink)','productUrl','url','maxlength="2000"')+
    field('SubID principal','subid','text','maxlength="50"')+
    field('SubID 1','subid1','text','maxlength="50"')+
    field('SubID 2','subid2','text','maxlength="50"')+
    field('SubID 3','subid3','text','maxlength="50"')+
    field('SubID 4','subid4','text','maxlength="120"')+
    field('Filtro de programas','hasTool','text','maxlength="20" placeholder="deeplink, products ou coupons"')+
    field('Limite de programas (1–50)','limit','number','min="1" max="50" value="20"')+
    field('Deslocamento/página','offset','number','min="0" max="100000" value="0"')+
    '<div class="callout">O token OAuth é renovado automaticamente no servidor e guardado criptografado. O Website ID precisa pertencer à sua conta. O catálogo não retorna URLs de feeds que possam conter credenciais. Gerar deeplink não publica oferta.</div>';
  openModal('Ferramentas · Admitad','Use apenas Client ID, Client Secret e Website ID da sua conta oficial.',body,async function(event){
    event.preventDefault();var fd=new FormData(event.target),action=String(fd.get('action')||'test'),payload={action:action};
    ['campaignId','feedIndex','productUrl','subid','subid1','subid2','subid3','subid4','hasTool','limit','offset'].forEach(function(key){var value=String(fd.get(key)||'').trim();if(value)payload[key]=value;});
    try{var result=await operationRequest('/api/integrations/admitad',payload);if(action==='test')await loadMarketplaceStatus();closeModal();openModal('Resultado · Admitad','Resposta da API oficial. Nenhuma oferta foi publicada.','<pre style="white-space:pre-wrap;max-height:55vh;overflow:auto;word-break:break-word">'+esc(JSON.stringify(result,null,2))+'</pre>',function(e){e.preventDefault();closeModal();});var submit=document.querySelector('#form button[type="submit"]');if(submit)submit.textContent='Fechar';}
    catch(error){toast(error.message||'Não foi possível consultar a API Admitad.');}
  });var submit=document.querySelector('#form button[type="submit"]');if(submit)submit.textContent='Executar';
}
async function openShopeeTools(){
  var body='<label for="shopeeAction">Operação da Open API</label><select id="shopeeAction" name="action" required><option value="test">Validar conexão (somente leitura)</option><option value="offers">Consultar ofertas</option><option value="create_link">Gerar link de afiliado</option><option value="conversions">Consultar conversões</option><option value="validated">Consultar relatório validado</option></select>'+
    '<label for="shopeeKind">Tipo de oferta</label><select id="shopeeKind" name="kind"><option value="product">Produtos</option><option value="shop">Lojas</option><option value="brand">Marcas</option><option value="shopee">Campanhas Shopee</option></select>'+
    field('Palavra-chave para ofertas','keyword','text','maxlength="80" placeholder="Ex.: fone bluetooth"')+
    field('URL original shopee.com.br (para gerar link)','originUrl','url','maxlength="2000" placeholder="https://shopee.com.br/..."')+
    field('SubIDs separados por vírgula (opcional, até 5)','subIds','text','maxlength="300"')+
    field('Data inicial do relatório (opcional)','startDate','date','')+
    field('Data final do relatório (opcional)','endDate','date','')+
    field('Validation ID do relatório de pagamentos','validationId','text','inputmode="numeric" pattern="[0-9]{1,18}" maxlength="18"')+
    field('Limite de resultados (1–100)','limit','number','min="1" max="100" value="20"')+
    '<div class="callout">O teste consulta uma oferta sem publicar nem criar links. Consultas de ofertas e relatórios são somente leitura. Gerar link chama a mutação oficial para criar um link de afiliado, mas não publica em WhatsApp ou Telegram.</div>';
  openModal('Ferramentas · Shopee Afiliados','Use apenas recursos liberados pela Open API da sua conta. Nenhuma operação publica ofertas nos canais.',body,async function(event){
    event.preventDefault();
    var fd=new FormData(event.target),action=String(fd.get('action')||'test'),payload={action:action};
    if(action==='offers'){payload.kind=String(fd.get('kind')||'product');payload.keyword=String(fd.get('keyword')||'');payload.limit=Number(fd.get('limit')||10);}
    if(action==='create_link'){payload.originUrl=String(fd.get('originUrl')||'');payload.subIds=String(fd.get('subIds')||'');}
    if(action==='conversions'){payload.startDate=String(fd.get('startDate')||'');payload.endDate=String(fd.get('endDate')||'');payload.limit=Number(fd.get('limit')||20);}
    if(action==='validated'){payload.validationId=String(fd.get('validationId')||'');payload.limit=Number(fd.get('limit')||20);}
    try{
      var result=await operationRequest('/api/integrations/shopee',payload);
      closeModal();
      if(action==='test')await loadMarketplaceStatus();
      openModal('Resultado · Shopee Afiliados','Resposta da API oficial. Os dados não foram publicados em nenhum canal.','<pre style="white-space:pre-wrap;max-height:55vh;overflow:auto;word-break:break-word">'+esc(JSON.stringify(result,null,2))+'</pre>',function(e){e.preventDefault();closeModal();});
      var submit=document.querySelector('#form button[type="submit"]');if(submit)submit.textContent='Fechar';
    }catch(error){toast(error.message||'Não foi possível executar a operação Shopee.');}
  });
  var submit=document.querySelector('#form button[type="submit"]');if(submit)submit.textContent='Executar';
}
async function openAmazonTools(){
  var body='<label for="amazonAction">Operação oficial</label><select id="amazonAction" name="action" required><option value="test">Validar conexão (somente leitura)</option><option value="search">Buscar produtos</option><option value="items">Detalhes por ASIN</option><option value="variations">Variações de produto</option><option value="browseNodes">Consultar categorias</option></select>'+
    field('Palavra-chave (busca)','keyword','text','maxlength="120" placeholder="Ex.: fone bluetooth"')+
    field('Marca (opcional)','brand','text','maxlength="100"')+
    field('ASINs separados por vírgula (até 10)','asins','text','maxlength="200" placeholder="B0XXXXXXXX"')+
    field('ASIN pai para variações','asin','text','maxlength="10" placeholder="B0XXXXXXXX"')+
    field('IDs de categorias (até 10)','browseNodeIds','text','maxlength="250" placeholder="123456, 789012"')+
    field('Índice de busca/categoria','searchIndex','text','maxlength="80" value="All"')+
    field('Preço mínimo em reais (opcional)','minPrice','number','min="0" step="0.01"')+
    field('Preço máximo em reais (opcional)','maxPrice','number','min="0" step="0.01"')+
    field('Quantidade por página (1–10)','itemCount','number','min="1" max="10" value="10"')+
    field('Página de busca ou variações','itemPage','number','min="1" max="100" value="1"')+
    '<div class="callout">As consultas usam a Creators API oficial e o Partner Tag salvo. Os links retornados pela Amazon podem ser links de afiliado, mas esta ferramenta não publica em WhatsApp ou Telegram. Não existe uma ação de publicação nesta tela.</div>';
  openModal('Ferramentas · Amazon Creators API','Escolha uma operação de catálogo. O teste é uma busca somente leitura e consome a quota normal da API.',body,async function(event){
    event.preventDefault();
    var fd=new FormData(event.target),action=String(fd.get('action')||'test'),payload={action:action};
    ['keyword','brand','asins','asin','browseNodeIds','searchIndex','minPrice','maxPrice','itemCount','itemPage'].forEach(function(key){var value=String(fd.get(key)||'').trim();if(value)payload[key]=value;});
    try{
      var result=await operationRequest('/api/integrations/amazon',payload);
      await loadMarketplaceStatus();
      closeModal();
      openModal('Resultado · Amazon','Consulta de leitura concluída. Nenhuma oferta foi publicada.','<pre style="white-space:pre-wrap;max-height:55vh;overflow:auto;word-break:break-word">'+esc(JSON.stringify(result,null,2))+'</pre>',function(e){e.preventDefault();closeModal();});
      var submit=document.querySelector('#form button[type="submit"]');if(submit)submit.textContent='Fechar';
    }catch(error){toast(error.message||'Não foi possível executar a operação Amazon.');}
  });
  var submit=document.querySelector('#form button[type="submit"]');if(submit)submit.textContent='Executar';
}
async function connectMercadoLivre(){
  try{
    toast('Preparando conexão segura com o Mercado Livre…');
    var data=await operationRequest('/api/mercadolivre/connect');
    if(!data.authorizationUrl)throw Error('O Mercado Livre não retornou o endereço de autorização.');
    window.location.href=data.authorizationUrl;
  }catch(error){toast(error.message||'Não foi possível iniciar a conexão com o Mercado Livre.');}
}
async function captureMonitor(id,button){
  button.disabled=true;try{var r=await operationRequest('/api/monitors/run',{monitorId:id});await load();toast(r.failed?'Falha na origem; consulte o monitor.':r.captured+' nova(s) oferta(s) capturada(s).');}catch(e){toast(e.message);}finally{button.disabled=false;}
}
function saveDownload(data,name){
  var link=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));link.href=url;link.download=name;link.click();setTimeout(function(){URL.revokeObjectURL(url);},1000);
}
async function downloadPrivate(path,name){try{saveDownload(await operationRequest(path),name);}catch(e){toast(e.message);}}
async function listBackups(button){
  if(button)button.disabled=true;
  try{var r=await operationRequest('/api/backups'),target=document.getElementById('backupList');if(target)target.innerHTML=r.backups.length?r.backups.map(function(b){return '<div class="row"><div class="grow"><b>'+esc(new Date(b.createdAt).toLocaleString('pt-BR'))+'</b><div class="muted">'+Math.ceil(b.bytes/1024)+' KiB · SHA-256 '+esc(b.sha256.slice(0,12))+'…</div></div><button class="btn secondary" data-action="downloadPrivate(\'/api/backups?id='+b.id+'\',\'radar-backup-'+b.id+'.json\')">Baixar backup</button></div>';}).join(''):empty('Nenhum backup criado.');}catch(e){toast(e.message);}finally{if(button)button.disabled=false;}
}
async function createBackup(button){button.disabled=true;try{await operationRequest('/api/backups',{});await listBackups();toast('Backup privado criado e integridade registrada.');}catch(e){toast(e.message);}finally{button.disabled=false;}}
async function previewRetention(){try{var r=await operationRequest('/api/privacy',{action:'RETENTION_PREVIEW'});toast(r.enabledAccounts?r.removed+' evento(s) antigo(s) elegíveis à limpeza.':'Limpeza automática desativada.');}catch(e){toast(e.message);}}
function openPrivacyProcess(id){
  var item=(D.growth.privacyRequests||[]).find(function(x){return x.id===id;});if(!item)return;
  var verified=Boolean(item.identityVerifiedAt),form=verified?'<p class="muted">Escopo verificado: '+esc(item.subjectScope)+'</p>':select('Escopo do titular','subjectScope','<option value="LEAD">Contato identificado por hash</option><option value="ACCOUNT_OWNER">Titular desta conta</option>')+field('Hash do contato (escopo contato)','subjectHash','text')+field('Evidência da verificação de identidade','evidence','text','minlength="8" required');
  if(verified&&['DELETION','REVOCATION'].includes(item.requestType))form+=field('Confirme ANONIMIZAR','confirmation','text','required');
  if(verified&&item.requestType==='CORRECTION')form+=field('DDD corrigido','ddd','text','pattern="[0-9]{2,3}" required');
  openModal(verified?'Processar solicitação':'Verificar identidade','Confira a identidade e o escopo antes de tratar dados. Serviços externos exigem atendimento próprio.',form,async function(e){e.preventDefault();try{var data=Object.fromEntries(new FormData(e.target)),r=await operationRequest('/api/privacy',Object.assign({id:id,action:verified?'RESOLVE':'VERIFY'},data));if(r.data&&['ACCESS','PORTABILITY'].includes(item.requestType))saveDownload(r.data,'radar-solicitacao-'+id+'.json');await load();closeModal();show('security');toast(verified?'Solicitação processada.':'Identidade registrada. Agora processe a solicitação.');}catch(error){toast(error.message);}});
}


// CSP-safe delegated actions: rendered controls use data-action instead of inline event handlers.
function parseActionArgs(source,element){
  var args=[],token='',quote='',escape=false,depth=0;
  for(var i=0;i<source.length;i++){
    var ch=source[i];
    if(escape){token+=ch;escape=false;continue;}
    if(quote){token+=ch;if(ch==='\\\\'){escape=true;}else if(ch===quote){quote='';}continue;}
    if(quote){token+=ch;if(ch==='\\'){escape=true;}else if(ch===quote){quote='';}continue;}
    if(ch==="'"||ch==='\"'){quote=ch;token+=ch;continue;}
    if(ch===')'||ch===']'||ch==='}'){depth--;token+=ch;continue;}
    if(ch===','&&depth===0){args.push(token.trim());token='';continue;}
    token+=ch;
  }
  if(token.trim()||source.trim())args.push(token.trim());
  return args.map(function(value){
    if(value==='this')return element;
    if(value==='true')return true;if(value==='false')return false;if(value==='null')return null;
    if(/^[-+]?\\d+(?:\\.\\d+)?$/.test(value))return Number(value);
    if((value[0]==="'"&&value[value.length-1]==="'")||(value[0]==='\"'&&value[value.length-1]==='\"')){
      var body=value.slice(1,-1);return body.replace(/\\\\([\\\\'"nrt])/g,function(_,c){return ({n:'\\n',r:'\\r',t:'\\t'})[c]||c;});
    }
    return value;
  });
}
document.addEventListener('change',function(event){
  var el=event.target.closest('[data-change]');if(!el)return;
  var name=el.getAttribute('data-change')||'';if(!/^[A-Za-z_$][\\w$]*$/.test(name))return;
  var fn=window[name];if(typeof fn!=='function')return;
  fn.call(window,el.value,el);
});
document.addEventListener('click',function(event){
  var el=event.target.closest('[data-action]');if(!el)return;
  var source=el.getAttribute('data-action')||'';
  var match=source.match(/^([A-Za-z_$][\w$]*)\((.*)\)$/s);if(!match)return;
  var fn=window[match[1]];if(typeof fn!=='function')return;
  event.preventDefault();fn.apply(window,parseActionArgs(match[2],el));
});

var whatsappPairing=null;
async function openWhatsappPairing(){
  try{
    var data=await operationRequest('/api/n8n/pairing',{});whatsappPairing=data;
    openModal('Parear conector','Copie o código para o conector desta conta. Após validar os números e os grupos, ative os números no painel.',field('Conta do conector','workerAccountId','text','readonly value="'+esc(data.accountId)+'"')+field('Código de pareamento','workerPairingCode','password','readonly value="'+esc(data.pairingSecret)+'" autocomplete="off"')+'<button type="button" class="btn secondary" data-action="copyWhatsappPairing()">Copiar código</button>',async function(e){e.preventDefault();closeModal();});
    document.querySelector('#form button[type=submit]').textContent='Concluído';
  }catch(e){whatsappPairing=null;toast(e.message);}
}
async function copyWhatsappPairing(){try{if(whatsappPairing){await navigator.clipboard.writeText(whatsappPairing.pairingSecret);toast('Código copiado. Guarde apenas no conector desta conta.');}}catch{toast('Não foi possível copiar. Selecione o código no campo.');}}
async function openAwinTools(){
  var body='<label for="awinAction">Operação Awin</label><select id="awinAction" name="action" required><option value="test">Validar conexão (programas joined)</option><option value="programmes">Listar programas por relacionamento</option><option value="feed">Consultar feed de produtos JSONL</option></select>'+
    '<label for="awinRelationship">Relacionamento</label><select id="awinRelationship" name="relationship"><option value="joined">joined · aprovado/participando</option><option value="pending">pending · aguardando</option><option value="notjoined">notjoined · ainda não associado</option><option value="suspended">suspended · suspenso</option><option value="rejected">rejected · recusado</option></select>'+
    field('País ISO (padrão BR)','countryCode','text','maxlength="2" value="BR"')+
    field('ID numérico do anunciante para feed','advertiserId','text','inputmode="numeric" pattern="[0-9]{1,20}" maxlength="20"')+
    field('Locale do feed (ex.: pt_BR ou en_GB)','locale','text','maxlength="10" value="pt_BR"')+
    field('Quantidade máxima de itens exibidos (1–50)','limit','number','min="1" max="50" value="20"')+
    '<div class="callout">O teste consulta programas autorizados; o feed só funciona se o anunciante, idioma e acesso estiverem liberados para o seu Publisher ID. Os resultados são somente leitura: nenhuma oferta é salva, aprovada ou publicada.</div>';
  openModal('Ferramentas · Awin Afiliados','Use token Bearer e Publisher ID emitidos no portal oficial. Nunca cole senha de login.',body,async function(event){
    event.preventDefault();var fd=new FormData(event.target),action=String(fd.get('action')||'test'),payload={action:action};
    ['relationship','countryCode','advertiserId','locale','limit'].forEach(function(key){var value=String(fd.get(key)||'').trim();if(value)payload[key]=value;});
    try{var result=await operationRequest('/api/integrations/awin',payload);if(action==='test')await loadMarketplaceStatus();closeModal();openModal('Resultado · Awin','Consulta oficial de leitura. Nenhuma oferta foi publicada.','<pre style="white-space:pre-wrap;max-height:55vh;overflow:auto;word-break:break-word">'+esc(JSON.stringify(result,null,2))+'</pre>',function(e){e.preventDefault();closeModal();});var submit=document.querySelector('#form button[type="submit"]');if(submit)submit.textContent='Fechar';}
    catch(error){toast(error.message||'Não foi possível consultar a API Awin.');}
  });var submit=document.querySelector('#form button[type="submit"]');if(submit)submit.textContent='Executar';
}