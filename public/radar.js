var lastMeliInspection = null;
var pendingCopierPrefill = null;
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
    messageTemplates: [],
    integrationHealth: { items: [], interval: "hourly", alert: false },
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
  ["dashboard", "Central", "DB", "Operação"],
  ["radar", "Radar", "RD", "Operação"],
  ["offers", "Ofertas", "OF", "Operação"],
  ["publishing", "Publicações", "PB", "Operação"],
  ["channels", "Canais", "CN", "Análise"],
  ["reports", "Relatórios", "BI", "Análise"],
  ["aiusage", "Consumo de IA", "AI", "Análise"],
  ["settings", "Configurações", "CT", "Gestão"],
];
var GROUPS = {
  radar: [
    ["monitoring", "Monitoramento 24h", "24", "monitoring"],
    ["clone", "Modo clone", "CL", "cloneView"],
    ["quick", "Criação rápida", "60", "quick"],
  ],
  offers: [
    ["offers", "Ofertas e cupons", "OF", "offers"],
    ["curator", "Curador de ofertas", "IA", "curatorView"],
    ["studio", "Estúdio de IA", "AI", "studio"],
    ["growth", "Tráfego e redes sociais", "AD", "growth"],
    ["socialagent", "Agente Radar Social", "RS", "socialAgent"],
    ["assistant", "Assistente Radar", "AI", "assistantView"],
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
    ["templates", "Modelos de mensagem", "TM", "messageTemplatesView"],
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
var OFFER_CATEGORIES = [
  { id: "catalog", title: "Ofertas", description: "Catálogo e curadoria", views: ["offers", "curator", "assistant"] },
  { id: "ai", title: "IA", description: "Conteúdo, arte e vídeo", views: ["studio"] },
  { id: "social", title: "Redes e campanhas", description: "Canais, anúncios e posts", views: ["growth", "socialagent"] },
];
function offerCategoryForView(view) {
  var category = OFFER_CATEGORIES.find(function (item) { return item.views.indexOf(view) !== -1; });
  return category ? category.id : "catalog";
}
function switchOfferCategory(categoryId) {
  var category = OFFER_CATEGORIES.find(function (item) { return item.id === categoryId; });
  if (!category) return;
  selectedGroups.offerCategory = category.id;
  show(category.views[0]);
}
function offersWorkspace() {
  var category = OFFER_CATEGORIES.find(function (item) { return item.id === selectedGroups.offerCategory; }) || OFFER_CATEGORIES[0],
    items = GROUPS.offers || [],
    visibleItems = items.filter(function (item) { return category.views.indexOf(item[0]) !== -1; }),
    active = visibleItems.find(function (item) { return item[0] === selectedGroups.offers; }) || visibleItems[0];
  return '<div class="offers-workspace"><aside class="offers-rail" aria-label="Organização de Ofertas"><div class="offers-rail-intro"><span class="offers-kicker">ESPAÇO DE TRABALHO</span><h2>Ofertas</h2><p>Escolha uma área para continuar.</p></div><nav class="offers-categories" aria-label="Categorias de Ofertas">' +
    OFFER_CATEGORIES.map(function (item) {
      return '<button class="offers-category category-' + item.id + ' ' + (item.id === category.id ? "on" : "") + '" type="button" aria-pressed="' + (item.id === category.id) + '" data-action="switchOfferCategory(&quot;' + item.id + '&quot;)"><span class="offers-category-mark" aria-hidden="true">' + (item.id === "catalog" ? "01" : item.id === "ai" ? "02" : "03") + '</span><span class="offers-category-copy"><b>' + item.title + '</b><small>' + item.description + '</small></span><span class="offers-category-arrow" aria-hidden="true">›</span></button>';
    }).join("") +
    '</nav><div class="offers-rail-divider"></div><div class="offers-destinations" aria-label="Telas de ' + category.title + '"><h3>' + category.title + '</h3>' +
    visibleItems.map(function (item) {
      return '<button type="button" class="group-tab offers-view-tab ' + (item[0] === active[0] ? "on" : "") + '" aria-current="' + (item[0] === active[0] ? "page" : "false") + '" data-action="switchGroup(&quot;offers&quot;,&quot;' + item[0] + '&quot;)"><span class="ico" aria-hidden="true">' + item[2] + '</span><span>' + item[1] + '</span></button>';
    }).join("") +
    (category.id === "ai" ? '<a class="offers-video-link" href="/radar-video-ia"><span class="offers-video-icon" aria-hidden="true">▶</span><span><b>Radar Vídeo IA</b><small>Roteiros e geração de vídeo</small></span><span aria-hidden="true">↗</span></a>' : "") +
    '</div><div class="offers-rail-foot">Todos os recursos e conexões da conta continuam disponíveis.</div></aside><section class="offers-content" id="group-panel" aria-label="' + active[1] + '">' + window[active[3]]() + '</section></div>' + offerBuilderSettingsPanel();
}
function groupPage(key) {
  if (key === "offers") return offersWorkspace();
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
  if(key==="offers")selectedGroups.offerCategory=offerCategoryForView(id);
  history.replaceState(null,'','#'+id);
  document.querySelectorAll(".group-tab").forEach(function (b) {
    b.classList.toggle("on", b.textContent.trim().includes(item[1]));
  });
  document.getElementById("group-panel").innerHTML = window[item[3]]();
  if(key==="settings"&&id==="integrations"){loadApiCredentials();loadMarketplaceStatus();}if(key==="settings"&&id==="templates")loadOfferBuilderSettings();
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
    '<label class="csp-flex-shrink-0"><input type="checkbox" class="offer-batch-check" value="' + esc(o.id) + '" aria-label="Selecionar ' + esc(o.title) + '"></label>' +
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
    integrationHealthPanel() +
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
      "Copiar e importar",
      "Cole uma mensagem ou link, revise os dados e salve um rascunho pendente.",
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
function integrationHealthPanel() {
  var health = D.integrationHealth || {};
  var items = Array.isArray(health.items) ? health.items.slice(0, 6) : [];
  var rows = items.map(function (item) {
    var status = String(item.status || "NOT_REPORTED").trim();
    var details = String(item.details || "").trim();
    var checked = item.lastCheckedAt ? new Date(item.lastCheckedAt) : null;
    var checkedLabel = checked && !Number.isNaN(checked.getTime())
      ? "Verificado em " + checked.toLocaleString("pt-BR")
      : "Sem horário de verificação registrado";
    var statusLabel = status === "CONNECTED" ? "CONECTADO"
      : status === "ERROR" ? "FALHA"
      : status === "NOT_CONFIGURED" ? "NÃO CONFIGURADO"
      : status === "PENDING_VALIDATION" ? "PENDENTE DE VALIDAÇÃO"
      : status;
    return '<li><i class="a-dot"></i><div><b>' +
      esc(item.name || "Integração sem nome") +
      '</b><div class="muted">' + esc(details || "Sem detalhes de diagnóstico registrados.") +
      '</div><small class="muted">' + esc(checkedLabel) +
      '</small></div><span class="pill">' + esc(statusLabel) + '</span></li>';
  }).join("");
  var alert = health.alert
    ? '<p role="alert" class="partial-error">O monitoramento registrou uma falha. Confira os detalhes antes de confiar na conexão.</p>'
    : "";
  var interval = health.interval ? " Frequência informada: " + String(health.interval) + "." : "";
  return section(
    "Saúde das integrações",
    "Diagnóstico automático registrado pelo Radar. Conectado não significa que uma publicação foi testada ou enviada."
  ) + alert + '<div class="card"><ul class="activity">' +
    (rows || '<li><i class="a-dot"></i><div><b>Nenhum diagnóstico registrado</b><div class="muted">Aguardando dados do monitor de saúde; não há confirmação de funcionamento externo.</div></div></li>') +
    '</ul><small class="muted">' + esc(interval) + '</small></div>';
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
      "Copiar e importar ofertas",
      "Cole uma mensagem promocional ou importe dados públicos. Revise preço, imagem e link oficial; toda oferta começa pendente e nada é publicado automaticamente.",
    ) +
    '<div class="card csp-margin-top-12px"><h3>Fluxo recomendado</h3><div class="steps"><div class="step"><i>01</i><b>Cole a mensagem ou link</b></div><div class="step"><i>02</i><b>Revise preço, imagem e afiliado</b></div><div class="step"><i>03</i><b>Aprove e confirme preço oficial</b></div><div class="step"><i>04</i><b>Escolha o destino e o horário</b></div></div><div class="actions csp-margin-top-12px"><button class="btn secondary" type="button" data-action="show(\'offers\')">Revisar ofertas</button><button class="btn secondary" type="button" data-action="show(\'publishing\')">Abrir filas e horários</button></div></div>' +
    '<div class="grid two"><div class="card"><h3>Importar página pública</h3><p class="muted">Cole o link de um produto ou de uma página pública da sua vitrine. O Radar tentará ler título, imagem e preço publicado nos metadados; revise tudo antes de criar o rascunho.</p><div class="field"><label for="magaluCloneUrl">URL pública do produto ou da vitrine</label><input class="input" id="magaluCloneUrl" type="url" maxlength="2000" placeholder="https://www.magazinevoce.com.br/..."></div><button class="btn csp-margin-top-12px" type="button" data-action="inspectMagaluClone()">Ler página pública</button><div id="magaluCloneResult" class="callout csp-hidden csp-margin-top-12px" role="status"></div></div><div class="card"><h3>O que o modo clone faz</h3><div class="steps">' +
    ["Lê metadados públicos", "Preserva a URL original", "Pede o link de afiliado", "Cria rascunho pendente", "Aguarda revisão"]
      .map(function (x, i) {
        return '<div class="step"><i>0' + (i + 1) + "</i><b>" + x + "</b></div>";
      }).join("") +
    '</div><div class="callout csp-margin-top-15px">O link de afiliado e a comissão não são validados pela simples leitura da página. Para comissão, cole o link gerado no Parceiro Magalu. Nada será publicado automaticamente.</div><p><a href="https://www.magazinevoce.com.br/" target="_blank" rel="noopener noreferrer">Abrir Magazine Você ↗</a></p></div></div>' +
    '<section class="section"><div class="sectionhead"><div><h2>Outras opções do Modo Clone</h2><p>Atalhos para os fluxos existentes. Testes não publicam ofertas.</p></div></div><div class="grid two">' +
    '<div class="card"><h3>Espelhamento inteligente 24h</h3><p class="muted">Abra os monitores e confira fontes, status e captura. A captura depende da fonte e das permissões configuradas.</p><button class="btn secondary" type="button" data-action="show(\'monitoring\')">Abrir monitoramento</button></div>' +
    '<div class="card"><h3>Validar links SHEIN em lote</h3><p class="muted">Cole uma mensagem e valide os links sem salvar; se desejar, crie rascunhos pendentes para revisão.</p><button class="btn secondary" type="button" data-action="openSheinTools()">Abrir ferramentas SHEIN</button></div>' +
    '<div class="card"><h3>Importar vitrine Collshp</h3><p class="muted">Lê os produtos públicos da sua vitrine. Os links retornados são candidatos e não têm comissão verificada.</p><label for="collshpCloneUrl">URL pública da vitrine</label><input class="input" id="collshpCloneUrl" type="url" maxlength="500" value="https://collshp.com/emersongabriel291295?view=storefront" placeholder="https://collshp.com/sua-vitrine"><button class="btn secondary csp-margin-top-12px" type="button" data-action="inspectCollshpClone(this)">Ler vitrine</button><div id="collshpCloneResult" class="callout csp-hidden csp-margin-top-12px" role="status"></div></div>' +
    '<div class="card"><h3>Importador universal de links</h3><p class="muted">Reconhece convites WhatsApp/Telegram, vitrines e links de produto/afiliado. Grupos ficam pausados até que a conexão autorizada seja validada. Nenhuma mensagem é enviada.</p><label for="universalCloneUrl">Cole qualquer link de origem</label><input class="input" id="universalCloneUrl" type="url" maxlength="2000" placeholder="https://chat.whatsapp.com/... ou https://t.me/..."><button class="btn csp-margin-top-12px" type="button" data-action="inspectUniversalClone(this)">Analisar link</button><div id="universalCloneResult" class="callout csp-hidden csp-margin-top-12px" role="status"></div></div>' +
    '<div class="card"><h3>Clone sob demanda</h3><p class="muted">Analise um link, revise os dados e prepare uma oferta manualmente. A conversão só é considerada afiliada quando confirmada pelo programa oficial.</p><button class="btn secondary" type="button" data-action="show(\'quick\')">Abrir criação rápida</button></div>' +
    '<div class="card"><h3>Modo Copiador de mensagens</h3><p class="muted">Cole uma mensagem de oferta para extrair título, preços, cupom e link de origem. O Radar prepara um rascunho para revisão; não publica nada automaticamente.</p><div class="field"><label for="copierText">Mensagem copiada</label><textarea class="input" id="copierText" rows="7" maxlength="6000" placeholder="Cole aqui o texto da oferta, incluindo preços e links..."></textarea></div><div class="field"><label for="copierAffiliateUrl">Link oficial de afiliado</label><input class="input" id="copierAffiliateUrl" type="url" maxlength="1200" placeholder="Cole o link gerado pelo programa oficial"></div><button class="btn csp-margin-top-12px" type="button" data-action="parseCopierMessage()">Analisar e preparar rascunho</button><div id="copierResult" class="callout csp-hidden csp-margin-top-12px" role="status"></div></div><div class="card"><h3>Fila e agendamento</h3><p class="muted">Organize rascunhos aprovados, horários, intervalos e prioridade. O envio real depende do conector e do destino validados.</p><button class="btn secondary" type="button" data-action="show(\'publishing\')">Abrir filas e agendamento</button></div></div></section>'
  );
}
var lastUniversalCloneInspection = null;
async function inspectUniversalClone(button) {
  var input = document.getElementById("universalCloneUrl");
  var box = document.getElementById("universalCloneResult");
  if (!input || !box) return;
  var url = input.value.trim();
  if (!url) { toast("Cole um link antes de analisar."); return; }
  if (button) button.disabled = true;
  box.classList.remove("csp-hidden");
  box.textContent = "Analisando tipo e requisitos do link; nada será salvo ou publicado...";
  lastUniversalCloneInspection = null;
  try {
    var response = await fetch("/api/clone/inspect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url })
    });
    var data = await response.json();
    if (!response.ok || !data.ok) throw Error(data.error || "Não foi possível analisar o link.");
    lastUniversalCloneInspection = data;
    box.textContent = (data.title || "Link reconhecido") + "\\nStatus: " + (data.status || "ANALISADO") +
      "\\nTipo: " + data.kind + "\\nOrigem: " + data.host +
      "\\n\\n" + (data.message || "Link analisado.") +
      (data.nextStep ? "\\nPróximo passo: " + data.nextStep : "") +
      (data.trackingParametersPreserved ? "\\nParâmetros de rastreamento preservados." : "");
    if (["COLLSHP_STOREFRONT", "MAGALU_PUBLIC_PAGE"].includes(data.kind)) {
      var importPath = data.kind === "COLLSHP_STOREFRONT" ? "/api/integrations/collshp-import" : "/api/integrations/magalu-clone";
      box.textContent += "\\n\\nLendo dados públicos pela integração específica...";
      var importResponse = await fetch(importPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url })
      });
      var imported = await importResponse.json();
      if (!importResponse.ok || !imported.ok) throw Error(imported.error || "A integração não conseguiu ler esta página.");
      var products = Array.isArray(imported.products) ? imported.products : [];
      box.textContent = (data.title || "Vitrine") + "\\nStatus: LEITURA_PÚBLICA_CONCLUÍDA" +
        "\\nTipo: " + data.kind + "\\nOrigem: " + data.host +
        "\\nProdutos identificados: " + products.length +
        "\\n\\n" + String(imported.note || "Produtos lidos para revisão; nenhum rascunho foi criado ou publicado.");
      products.slice(0, 24).forEach(function(product) {
        var row = document.createElement("div");
        row.className = "listrow";
        var label = document.createElement("span");
        label.textContent = String(product.title || "Produto sem título") +
          (product.currentPrice ? " · preço informado: " + product.currentPrice : " · preço não confirmado");
        row.appendChild(label);
        try {
          var safeProductUrl = new URL(String(product.productUrl || ""));
          if (safeProductUrl.protocol === "https:") {
            var link = document.createElement("a");
            link.href = safeProductUrl.toString();
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.textContent = "Abrir origem";
            row.appendChild(link);
          }
        } catch {}
        box.appendChild(row);
      });
      if (!products.length) box.textContent += "\\nA página abriu, mas nenhum produto foi identificado.";
    }
    if (["WHATSAPP_INVITE", "TELEGRAM_LINK"].includes(data.kind)) {
      var action = document.createElement("button");
      action.type = "button";
      action.className = "btn secondary csp-margin-top-12px";
      action.textContent = "Registrar destino pausado";
      action.addEventListener("click", registerUniversalCloneDestination);
      box.appendChild(document.createElement("br"));
      box.appendChild(action);
      var sourceAction = document.createElement("button");
      sourceAction.type = "button";
      sourceAction.className = "btn secondary csp-margin-top-12px";
      sourceAction.textContent = "Registrar origem de ofertas";
      sourceAction.addEventListener("click", registerUniversalCloneSource);
      box.appendChild(document.createTextNode(" "));
      box.appendChild(sourceAction);
    } else if (data.importEndpoint) {
      var hint = document.createElement("p");
      hint.textContent = "Importador dedicado: " + data.importEndpoint + ". Abra o cartão específico da integração para executar a leitura.";
      box.appendChild(hint);
    }
  } catch (error) {
    box.textContent = error.message || "Falha ao analisar o link.";
  } finally {
    if (button) button.disabled = false;
  }
}
async function registerUniversalCloneDestination() {
  var data = lastUniversalCloneInspection;
  var box = document.getElementById("universalCloneResult");
  if (!data || !["WHATSAPP_INVITE", "TELEGRAM_LINK"].includes(data.kind)) {
    toast("Analise um convite válido primeiro."); return;
  }
  var name = data.title || (data.platform === "TELEGRAM" ? "Destino Telegram importado" : "Grupo WhatsApp importado");
  try {
    var saved = await call("POST", {
      name: name.slice(0, 100),
      platform: data.platform,
      destinationType: "GROUP",
      inviteUrl: data.originalUrl,
      externalId: "",
      members: 0,
      capacity: 1024
    }, "?entity=group");
    if (box) box.textContent = "Destino registrado como PAUSADO. O convite foi preservado; ainda é necessário validar a conexão autorizada e informar o ID oficial antes de ativar a captura ou publicar.";
    toast("Destino registrado pausado. Nenhuma mensagem foi enviada.");
  } catch (error) {
    if (box) box.textContent += "\\nNão foi possível registrar o destino: " + (error.message || "erro desconhecido");
  }
}
async function registerUniversalCloneSource() {
  var data = lastUniversalCloneInspection;
  var box = document.getElementById("universalCloneResult");
  if (!data || !["WHATSAPP_INVITE", "TELEGRAM_LINK"].includes(data.kind)) {
    toast("Analise um convite de grupo/canal primeiro."); return;
  }
  if (!confirm("Você tem autorização para monitorar esta origem e conectará um conector autorizado? A fonte ficará pausada e nenhuma mensagem será enviada.")) return;
  var sourceType = data.platform === "TELEGRAM" ? "TELEGRAM_CHANNEL" : "WHATSAPP_GROUP";
  try {
    var registered = await call("POST", {
      entity: "monitor",
      name: (data.title || (data.platform === "TELEGRAM" ? "Origem Telegram" : "Origem WhatsApp")).slice(0, 120),
      sourceType: sourceType,
      sourceUrl: data.originalUrl,
      mode: "CLONE",
      sourceAuthorized: true,
      affiliateUrl: ""
    });
    if (box) box.textContent += "\nOrigem cadastrada como PAUSADA. O convite sozinho não fornece mensagens anteriores.";
if (sourceType === "WHATSAPP_GROUP" && box) {
      var setup = document.createElement("p");
      setup.className = "muted";
      setup.textContent = "Conectores gratuitos auto-hospedados possíveis: OpenWA (GitHub) ou Evolution API. Ambos usam sessão WhatsApp Web não oficial e podem causar restrições na conta; exigem servidor e não foram conectados automaticamente. Configure WHATSAPP_CLONE_WEBHOOK_SECRET (mínimo 32 caracteres) no Hatchable. Para OpenWA, configure um webhook POST para https://radar-promo-brasil.hatchable.site/api/clone/whatsapp-incoming, evento message.received, e inclua o cabeçalho personalizado x-rpb-whatsapp-secret com o mesmo segredo; filtre grupos se disponível. Para Evolution, use o evento MESSAGES_UPSERT e o mesmo cabeçalho. As ofertas entram PENDENTES para revisão; nada é publicado automaticamente.";
      box.appendChild(setup);
    }
    if (sourceType === "WHATSAPP_GROUP" && registered && registered.id && box) {
      var help = document.createElement("p");
      help.textContent = "Após configurar o conector, informe o JID do grupo (formato numérico terminado em @g.us). O vínculo permanecerá pausado até você ativar manualmente.";
      var jid = document.createElement("input");
      jid.type = "text"; jid.className = "input"; jid.maxLength = 100; jid.placeholder = "Ex.: 120363000000000000-123456@g.us"; jid.setAttribute("aria-label", "JID do grupo WhatsApp");
      var bind = document.createElement("button");
      bind.type = "button"; bind.className = "btn secondary csp-margin-top-12px"; bind.textContent = "Vincular grupo (manter pausado)";
      bind.addEventListener("click", function(){ bindUniversalWhatsAppSource(registered.id, jid, bind); });
      box.appendChild(help); box.appendChild(jid); box.appendChild(bind);
    }
    toast("Origem cadastrada pausada. Nenhuma mensagem foi enviada.");
  } catch (error) {
    if (box) box.textContent += "\nNão foi possível cadastrar a origem: " + (error.message || "erro desconhecido");
  }
}
async function bindUniversalWhatsAppSource(monitorId, input, button) {
  var box = document.getElementById("universalCloneResult");
  var groupJid = String(input && input.value || "").trim();
  if (!/^\d{6,30}(?:-\d{4,25})?@g\.us$/.test(groupJid)) { toast("Informe o JID válido do grupo WhatsApp."); return; }
  if (button) button.disabled = true;
  try {
    var response = await fetch("/api/clone/whatsapp-bind", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({monitorId:monitorId,groupJid:groupJid})});
    var result = await response.json();
    if (!response.ok || !result.ok) throw Error(result.error || "Não foi possível vincular o grupo.");
    if (box) box.appendChild(document.createTextNode("\nJID vinculado. A origem continua PAUSADA; nenhuma oferta será publicada automaticamente."));
    toast("Grupo vinculado e mantido pausado.");
  } catch (error) {
    if (box) box.appendChild(document.createTextNode("\nFalha no vínculo: " + (error.message || "erro desconhecido")));
  } finally { if (button) button.disabled = false; }
}
async function parseCopierMessage() {
  var input = document.getElementById("copierText"),
    affiliateInput = document.getElementById("copierAffiliateUrl"),
    box = document.getElementById("copierResult"),
    raw = input ? input.value.trim() : "",
    affiliateUrl = affiliateInput ? affiliateInput.value.trim() : "";
  if (!raw) { toast("Cole a mensagem da oferta antes de analisar."); return; }
  if (box) {
    box.classList.remove("csp-hidden");
    box.textContent = "Interpretando a mensagem. Os campos serão sugestões para sua revisão.";
  }
  try {
    var parseText = raw + (affiliateUrl ? "\n" + affiliateUrl : ""),
      response = await fetch("/api/messages/parse-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: parseText }),
      }),
      data = await response.json();
    if (!response.ok || !data.ok) {
      throw Error(data.reason || data.error || "Não consegui interpretar esta oferta.");
    }
    var currentPrice = Number(data.currentPrice || 0) / 100,
      originalPrice = data.originalPrice ? Number(data.originalPrice) / 100 : 0,
      productUrl = String(data.productUrl || "");
    if (!data.title || !currentPrice || !productUrl) {
      throw Error("Confira se a mensagem inclui o nome, o preço e o link do produto.");
    }
    var prefill = {
      title: data.title,
      source: data.marketplace || "",
      currentPrice: currentPrice.toFixed(2),
      originalPrice: originalPrice ? originalPrice.toFixed(2) : "",
      productUrl: productUrl,
      affiliateUrl: affiliateUrl || data.affiliateUrl || "",
      couponCode: data.couponCode || "",
      couponUrl: data.couponUrl || "",
      message: raw,
    };
    if (box) {
      box.textContent = "Sugestão extraída: " + prefill.title +
        " · preço sugerido R$ " + prefill.currentPrice.replace(".", ",") +
        (prefill.originalPrice ? " · preço anterior sugerido R$ " + prefill.originalPrice.replace(".", ",") : "") +
        (prefill.couponCode ? " · cupom " + prefill.couponCode : "") +
        (data.needsAffiliateLink && !affiliateUrl ? " · falta informar seu link afiliado" : "") +
        ". " + String(data.notice || "Revise todos os campos; nada será publicado automaticamente.");
    }
    pendingCopierPrefill = prefill;
    if (box) {
      box.innerHTML = '<div class="field"><strong>Revise os dados reconhecidos</strong><p class="muted">Os campos abaixo são sugestões extraídas da mensagem. Confirme preço e links antes de continuar.</p></div>' +
        '<div class="field"><label for="copierReviewTitle">Produto</label><input class="input" id="copierReviewTitle" maxlength="220" value="' + esc(prefill.title) + '"></div>' +
        '<div class="field"><label for="copierReviewCurrent">Preço atual (R$)</label><input class="input" id="copierReviewCurrent" inputmode="decimal" value="' + esc(prefill.currentPrice) + '"></div>' +
        '<div class="field"><label for="copierReviewOriginal">Preço anterior (R$)</label><input class="input" id="copierReviewOriginal" inputmode="decimal" value="' + esc(prefill.originalPrice) + '"></div>' +
        '<div class="field"><label for="copierReviewProduct">Link do produto</label><input class="input" id="copierReviewProduct" type="url" maxlength="1200" value="' + esc(prefill.productUrl) + '"></div>' +
        '<div class="field"><label for="copierReviewAffiliate">Link de afiliado confirmado</label><input class="input" id="copierReviewAffiliate" type="url" maxlength="1200" value="' + esc(prefill.affiliateUrl) + '"></div>' +
        '<div class="field"><label for="copierReviewCoupon">Cupom (se aplicável)</label><input class="input" id="copierReviewCoupon" maxlength="100" value="' + esc(prefill.couponCode) + '"></div>' +
        '<div class="field"><label for="copierReviewCouponUrl">URL do cupom (opcional)</label><input class="input" id="copierReviewCouponUrl" type="url" maxlength="1200" value="' + esc(prefill.couponUrl) + '"></div>' +
        '<p class="muted">Salvar como rascunho não publica a oferta. O preço oficial ainda precisa ser verificado antes do envio.</p>' +
        '<button class="btn csp-margin-top-12px" type="button" data-action="continueCopierDraft()">Continuar para cadastro</button>';
    }
  } catch (error) {
    if (box) box.textContent = error.message || "Não foi possível interpretar a mensagem.";
    toast(error.message || "Não foi possível interpretar a mensagem.");
  }
}
function continueCopierDraft() {
  if (!pendingCopierPrefill) { toast('Analise uma mensagem antes de continuar.'); return; }
  var value = function(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; };
  var draft = {
    title: value('copierReviewTitle'), currentPrice: value('copierReviewCurrent'),
    originalPrice: value('copierReviewOriginal'), productUrl: value('copierReviewProduct'),
    affiliateUrl: value('copierReviewAffiliate'), couponCode: value('copierReviewCoupon'),
    couponUrl: value('copierReviewCouponUrl'), source: pendingCopierPrefill.source,
    message: pendingCopierPrefill.message
  };
  if (!draft.title || !draft.currentPrice || !draft.productUrl) {
    toast('Confirme o produto, o preço atual e o link do produto.'); return;
  }
  pendingCopierPrefill = draft;
  openOffer(draft);
}
async function inspectCollshpClone(button) {
  var input = document.getElementById("collshpCloneUrl");
  var box = document.getElementById("collshpCloneResult");
  if (!input || !box) return;
  var url = input.value.trim();
  if (!url) { toast("Cole a URL pública da vitrine Collshp."); return; }
  if (button) button.disabled = true;
  box.classList.remove("csp-hidden");
  box.textContent = "Consultando a vitrine pública; nenhum produto será salvo ou publicado...";
  try {
    var response = await fetch("/api/integrations/collshp-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url })
    });
    var data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || "Não foi possível consultar a vitrine.");
    var products = Array.isArray(data.products) ? data.products : [];
    box.innerHTML = '<b>' + esc(data.storefront?.name || "Vitrine Collshp") + '</b><p>' +
      products.length + ' produto(s) retornado(s) nesta página; ' + Number(data.totalCount || 0) +
      ' no total informado pela fonte.</p>' +
      '<div class="callout">Somente leitura: nenhum rascunho foi criado. Os links são candidatos e o rastreamento de comissão não foi verificado. Revise cada item antes de usar.</div>' +
      (products.length ? '<div class="list csp-margin-top-12px">' + products.map(function(p) {
        return '<div class="listrow">' +
          (p.imageUrl ? '<img src="' + esc(p.imageUrl) + '" alt="" loading="lazy" width="64" height="64" style="object-fit:contain;border-radius:8px">' : '') +
          '<div><b>' + esc(p.title || "Produto sem título") + '</b><p class="muted">' +
          '<a href="' + esc(p.productUrl || "#") + '" target="_blank" rel="noopener noreferrer">Abrir link de origem ↗</a></p></div></div>';
      }).join("") + '</div>' : '<p>Nenhum produto retornado pela fonte.</p>');
    labelFields(box);
  } catch (error) {
    box.textContent = error.message || "Falha ao consultar a vitrine.";
  } finally {
    if (button) button.disabled = false;
  }
}
var lastMagaluCloneInspection = null;
async function inspectMagaluClone(button) {
  var input = document.getElementById("magaluCloneUrl");
  var box = document.getElementById("magaluCloneResult");
  if (!input || !box) return;
  var url = input.value.trim();
  if (!url) { toast("Cole a URL pública da Magalu ou da sua vitrine."); return; }
  if (button) button.disabled = true;
  box.classList.remove("csp-hidden");
  box.textContent = "Lendo metadados públicos da página...";
  try {
    var response = await fetch("/api/integrations/magalu-clone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url })
    });
    var data = await response.json();
    if (!response.ok) throw Error(data.error || "Não foi possível importar a página.");
    lastMagaluCloneInspection = data;
    var products = Array.isArray(data.products) ? data.products : [];
    if (!products.length) throw Error("A página foi lida, mas nenhum produto foi identificado. Cole o link direto de um produto ou preencha os dados manualmente.");
    var needsManual = products.some(function (p) { return !p.title || p.currentPrice == null || !p.imageUrl; });
    var readStatus = needsManual ? 'Leitura automática parcial — complete e confira os campos abaixo' : products.length + ' item(ns) identificado(s) — confira os dados antes de cadastrar';
    var manualNotice = needsManual ? '<div class="callout">A loja bloqueou ou não forneceu todos os metadados. O Radar não vai inventar preço nem imagem. Preencha os campos faltantes com os dados visíveis na loja e use o link de afiliado gerado no Parceiro Magalu.</div>' : '';
    box.innerHTML = '<b>' + esc(readStatus) + '</b>' + manualNotice + '<p class="muted">' + esc(data.note || "") + '</p>' +
      products.map(function (p, i) {
        return '<div class="card csp-margin-top-12px"><h4>Produto ' + (i + 1) + '</h4>' +
          '<div class="field"><label for="magaluCloneTitle' + i + '">Nome do produto</label><input class="input" id="magaluCloneTitle' + i + '" maxlength="220" value="' + esc(p.title || "") + '"></div>' +
          '<div class="formgrid"><div class="field"><label for="magaluClonePrice' + i + '">Preço atual (R$)</label><input class="input" id="magaluClonePrice' + i + '" type="number" min="0.01" step="0.01" value="' + (p.currentPrice == null ? "" : esc(p.currentPrice)) + '" placeholder="Confirme o preço"></div><div class="field"><label for="magaluCloneOriginal' + i + '">Preço anterior (opcional)</label><input class="input" id="magaluCloneOriginal' + i + '" type="number" min="0.01" step="0.01" placeholder="Preço anterior"></div></div>' +
          '<div class="field"><label for="magaluCloneImage' + i + '">URL HTTPS da imagem</label><input class="input" id="magaluCloneImage' + i + '" type="url" value="' + esc(p.imageUrl || "") + '" placeholder="URL pública da imagem"></div>' +
          '<div class="field"><label for="magaluCloneAffiliate' + i + '">Link da sua vitrine/afiliado</label><input class="input" id="magaluCloneAffiliate' + i + '" type="url" maxlength="2000" value="' + esc(p.affiliateLinkCandidate || "") + '" placeholder="Confirme o link da sua vitrine ou cole o link oficial gerado"></div>' +
          '<div class="field"><label><input id="magaluCloneConfirmed' + i + '" type="checkbox"> Confirmo que esta é minha vitrine oficial e revisei preço, imagem e link. Comissão não verificada.</label></div>' +
          '<p class="muted"><a target="_blank" rel="noopener noreferrer" href="' + esc(p.productUrl || data.productUrl || url) + '">Abrir produto de origem ↗</a></p>' +
          '<button class="btn csp-margin-top-12px" type="button" data-action="createMagaluCloneProductDraft(' + i + ', this)">Criar rascunho deste produto</button></div>';
      }).join("") +
      '<p class="muted">Os rascunhos são criados individualmente e ficam pendentes de revisão. A extração pode deixar de fora produtos carregados por JavaScript e não confirma comissão.</p>';
    labelFields(box);
  } catch (error) {
    box.textContent = error.message || "Falha ao ler a página pública.";
  } finally {
    if (button) button.disabled = false;
  }
}
async function createMagaluCloneProductDraft(index, button) {
  var title = document.getElementById("magaluCloneTitle" + index)?.value.trim();
  var currentPrice = document.getElementById("magaluClonePrice" + index)?.value;
  var originalPrice = document.getElementById("magaluCloneOriginal" + index)?.value;
  var imageUrl = document.getElementById("magaluCloneImage" + index)?.value.trim();
  var affiliateUrl = document.getElementById("magaluCloneAffiliate" + index)?.value.trim();
  var confirmed = document.getElementById("magaluCloneConfirmed" + index)?.checked;
  var products = lastMagaluCloneInspection?.products || [];
  var item = products[index] || {};
  var productUrl = item.productUrl || lastMagaluCloneInspection?.productUrl || document.getElementById("magaluCloneUrl")?.value.trim();
  if (!title || !currentPrice || !affiliateUrl) { toast("Preencha título, preço atual confirmado e link de afiliado."); return; }
  if (!confirmed) { toast("Confirme o link gerado no Parceiro Magalu e revise os dados."); return; }
  if (button) button.disabled = true;
  try {
    var response = await fetch("/api/integrations/magalu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_draft", title: title, currentPrice: currentPrice, originalPrice: originalPrice || null, imageUrl: imageUrl, affiliateUrl: affiliateUrl, productUrl: productUrl, affiliateLinkConfirmed: true, description: item.description || lastMagaluCloneInspection?.description || "", sourceCategory: "Vitrine Parceiro Magalu" })
    });
    var data = await response.json();
    if (!response.ok) throw Error(data.error || "Não foi possível criar o rascunho.");
    toast("Rascunho criado e mantido pendente de revisão.");
    var card = button?.closest(".card");
    if (card) { card.querySelectorAll("input,button").forEach(function (el) { el.disabled = true; }); card.insertAdjacentHTML("beforeend", '<p class="muted">Rascunho enviado para revisão.</p>'); }
    await load();
  } catch (error) {
    toast(error.message || "Falha ao criar o rascunho.");
  } finally {
    if (button) button.disabled = false;
  }
}
async function createMagaluCloneDraft(button) {
  return createMagaluCloneProductDraft(0, button);
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
async function generateSelectedShopeeLinks() {
  var checks = Array.from(document.querySelectorAll('.offer-batch-check:checked'));
  if (!checks.length) return toast('Selecione ao menos uma oferta.');
  if (checks.length > 20) return toast('A Shopee permite até 20 URLs por lote. Selecione no máximo 20.');
  var selectedOffers = checks.map(function (el) { return D.offers.find(function (o) { return String(o.id) === String(el.value); }); }).filter(Boolean);
  var invalid = selectedOffers.filter(function (o) { return String(o.source || '').toUpperCase() !== 'SHOPEE' || !o.productUrl || o.affiliateUrl; });
  if (invalid.length) return toast('Selecione somente ofertas Shopee que tenham link original e ainda não possuam link afiliado.');
  var subIds = prompt('SubID opcional para identificar este lote (letras e números, até 50 caracteres):', 'radarpromo');
  if (subIds === null) return;
  var box = document.getElementById('batch-link-results');
  if (box) box.textContent = 'Gerando ' + selectedOffers.length + ' links pela API oficial da Shopee...';
  try {
    var response = await fetch('/api/integrations/shopee', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'batch_links', subIds: subIds, items: selectedOffers.map(function (o) { return { originUrl: o.productUrl }; }) }) });
    var data = await response.json();
    if (!response.ok) throw Error(data.error || 'Falha ao gerar os links.');
    var byUrl = new Map(selectedOffers.map(function (o) { return [String(o.productUrl), o.title]; }));
    if (box) box.innerHTML = '<b>Resultado: ' + Number(data.created || 0) + ' gerados · ' + Number(data.failed || 0) + ' falharam</b>' + (data.items || []).map(function (item) { return '<div class="row"><div class="grow"><b>' + esc(byUrl.get(item.originUrl) || 'Oferta') + '</b><div class="muted">' + (item.shortLink ? '<a href="' + esc(item.shortLink) + '" target="_blank" rel="noopener noreferrer">' + esc(item.shortLink) + '</a>' : esc(item.error || 'Sem retorno')) + '</div></div>' + (item.shortLink ? '<button class="btn secondary" type="button" data-action="copyText(\'' + esc(item.shortLink).replace(/'/g, '&#39;') + '\')">Copiar</button>' : '') + '</div>'; }).join('') + '<p class="muted">Os links foram gerados, mas não foram gravados automaticamente nas ofertas nem publicados. Copie e atualize cada oferta após conferir o rastreamento.</p>';
    toast('Lote concluído: ' + data.created + ' links gerados.');
  } catch (error) {
    if (box) box.textContent = error.message || 'Falha no lote.';
    toast(error.message || 'Falha ao gerar links.');
  }
}
function copyText(value) { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(String(value || '')).then(function () { toast('Link copiado.'); }).catch(function () { toast('Não foi possível copiar automaticamente.'); }); else toast('Copie o link exibido.'); }
function offers() {
  return (
    section(
      "Central de ofertas",
      "Produtos encontrados, aprovados e publicados.",
      "+ Nova oferta",
      "openOffer()",
    ) +
    '<div class="card csp-margin-bottom-12px"><div class="row"><div class="grow"><b>Gerar links em lote — Shopee</b><p class="muted">Selecione ofertas Shopee sem link afiliado. A API oficial processa até 20 por lote; os resultados ficam para conferência e cópia, sem publicar.</p></div><button class="btn dark" type="button" data-action="generateSelectedShopeeLinks()">Gerar links selecionados</button></div><div id="batch-link-results" class="list csp-margin-top-12px"></div></div>' +
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
      "Conectar credenciais salvas e validar a API oficial em consulta somente leitura.",
      "Conectar / validar",
      "connectOrTestAliExpress()",
    ) +
    integration(
      "SHN",
      "SHEIN Afiliados",
      "Importar link criado no Centro de Afiliados; API pública automática não confirmada.",
      "Preparar oferta manual",
      "openMarketplaceSetup('SHEIN')",
    ) +
    integration(
      "TMU",
      "Temu Afiliados",
      "Importar link/código oficial e preparar rascunho; API pública de afiliados não confirmada.",
      "Preparar oferta manual",
      "openTemuTools()",
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
      "API oficial de afiliados: produtos, campanhas, pedidos, canais e geração de links rastreáveis.",
      "Ver fluxo oficial",
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
      "Pareie o conector seguro para validar o acesso antes de ativar os números.",
      "Configurar",
      "openWhatsappPairing()",
    ) +
    '<div class="integration" data-integration-code="MCP"><div class="intlogo">MCP</div><div class="grow"><b>n8n · Servidor MCP</b><div class="muted">OAuth com PKCE para consultar as ferramentas do servidor. O teste lista ferramentas sem executá-las.</div><button type="button" class="btn secondary csp-margin-top-10px" data-action="connectN8nMcp()">Conectar servidor</button> <button type="button" class="btn secondary csp-margin-top-10px" data-action="testN8nMcp()">Testar conexão</button></div></div>' +
    integration(
      "TG",
      "Telegram",
      "Conecte o bot e valide o token antes de liberar publicações.",
      "Conectar bot",
      "openTelegramConnection()",
    ) +
    integration(
      "META",
      "Facebook e Instagram",
      "Testa os tokens oficiais já configurados; autorização OAuth e permissões continuam obrigatórias.",
      "Testar conexão",
      "testMetaConnection()",
    ) +
    integration(
      "MAIL",
      "Gmail e Outlook",
      "Teste de entrega com consentimento; isso não autentica uma caixa Gmail ou Outlook.",
      "Testar envio",
      "openEmailTest()",
    ) +
    integration(
      "GEM",
      "Google Gemini",
      "Configure e valide a chave Gemini; o cadastro não substitui o segredo usado pelo backend.",
      "Configurar chave",
      "openApiProvider('GEMINI')",
    ) +
    integration(
      "GPT",
      "OpenAI e Claude",
      "Configure OpenAI ou Claude e teste a chave antes de habilitar o provedor.",
      "Configurar chave",
      "openApiProvider('OPENAI')",
    ) +
    integration(
      "IMG",
      "IA de imagem",
      "Configure a chave do provedor principal e confirme o uso no backend.",
      "Configurar chave",
      "openApiProvider('OPENAI')",
    ) +
    integration(
      "VID",
      "IA de vídeo",
      "Configure a credencial Runway; a validação automática depende de endpoint oficial suportado.",
      "Configurar Runway",
      "openApiProvider('RUNWAY')",
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
    action==='openWhatsappPairing()'?'Conectar conector':
    action==='openTelegramConnection()'?'Conectar bot':
    action==='testMetaConnection()'?'Testar conexão':
    action==='openEmailTest()'?'Testar envio':
    action&&action.indexOf('openApiProvider(')===0?'Configurar chave':
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
    (code === "ALI" ? '<div class="row csp-margin-top-10px"><button type="button" class="btn secondary" data-action="auditAliExpress()">Auditar API avançada</button><button type="button" class="btn secondary" data-action="generateAliExpressLinksBatch()">Gerar links em lote</button></div>' : '') +
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
function assistantView() {
  return section("Assistente Radar", "Consulte ofertas, vendas, comissões, publicações e cliques usando os dados reais da sua conta. O assistente é somente leitura.", "", "") +
    '<div class="card"><h3>Pergunte ao Radar</h3><p class="muted">Ex.: quais ofertas da Shopee estão pendentes? Quanto tivemos de comissão nos últimos 30 dias? Quais foram os cliques do mês?</p><textarea id="radarAssistantQuestion" class="input" rows="3" maxlength="1200" placeholder="Digite sua pergunta..."></textarea><div class="actions csp-margin-top-12px"><button class="btn" type="button" data-action="askRadarAssistant()">Consultar</button></div><div id="radarAssistantAnswer" class="callout csp-margin-top-12px" aria-live="polite">As consultas não alteram ofertas nem publicam conteúdo.</div></div>';
}
async function askRadarAssistant() {
  var input=document.getElementById("radarAssistantQuestion"),box=document.getElementById("radarAssistantAnswer");
  if(!input||!box||!input.value.trim())return toast("Digite uma pergunta.");
  box.textContent="Consultando os dados da sua conta...";
  try{
    var r=await fetch("/api/ai/assistant",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question:input.value.trim()})});
    var b=await r.json();if(!r.ok)throw Error(b.error||"Falha na consulta.");
    box.textContent=(b.answer||"Sem resposta.")+"\n\n"+(b.notice||"Consulta somente de leitura.");
  }catch(e){box.textContent=e.message||"Assistente indisponível.";}
}
async function reviewOfferImage(offerId) {
  var box=document.getElementById("curatorAiResult");if(!box)return;
  box.textContent="Analisando a imagem original do anúncio...";
  try{
    var r=await fetch("/api/ai/vision-review",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({offerId:offerId})});
    var b=await r.json();if(!r.ok)throw Error(b.error||"Falha na análise visual.");
    var x=b.result||{};
    box.innerHTML='<div class="card"><h3>Resultado da análise visual</h3><p><b>Tipo de imagem:</b> '+esc(x.imageType||"—")+'</p><p><b>Compatibilidade com título:</b> '+(x.matchesTitle===true?"Compatível":x.matchesTitle===false?"Divergente":"Não conclusiva")+'</p><p><b>Qualidade:</b> '+Number(x.qualityScore||0)+'/100</p><p><b>Parecer:</b> '+esc(x.verdict||"REVIEW")+'</p><p><b>Problemas:</b> '+esc((x.issues||[]).join(" · ")||"Nenhum identificado")+'</p><p><b>Sugestões:</b> '+esc((x.recommendations||[]).join(" · ")||"—")+'</p><small class="muted">'+esc(b.notice||"Parecer consultivo.")+'</small></div>';
  }catch(e){box.textContent=e.message||"Falha na análise visual.";}
}

function curatorView() {
  var approved = D.offers.filter(function (offer) { return offer.status === "APPROVED"; }).length;
  return section(
    "Curador de ofertas",
    "Avalie ofertas aprovadas usando pontuação, histórico e regras comerciais do Radar. A análise não publica nem envia mensagens.",
    "Analisar agora",
    "runCurator()",
  ) +
    '<div class="actions csp-margin-top-12px"><button class="btn secondary" type="button" data-action="runAiCurator()">Curadoria com IA</button></div>' +
    '<div class="metrics">' +
    metric("Ofertas aprovadas", approved, "disponíveis para análise") +
    metric("Ofertas carregadas", D.offers.length, "na conta atual") +
    '</div><div class="callout">A pontuação é um sinal de apoio, não uma garantia de preço, comissão ou conversão. Confira as fontes oficiais e a elegibilidade antes de publicar.</div>' +
    '<div id="curatorResult" class="csp-margin-top-14px" aria-live="polite"><p class="muted">Clique em Analisar agora para classificar as ofertas aprovadas pelas regras existentes.</p></div>' +
    '<div class="card csp-margin-top-14px"><h3>Análise visual do anúncio</h3><p class="muted">O Gemini compara a imagem original com o título cadastrado. Não altera a oferta.</p>'+select("Oferta para analisar imagem","visionOffer",'<option value="">Selecione uma oferta</option>'+D.offers.filter(function(x){return x.imageUrl;}).map(function(x){return '<option value="'+esc(x.id)+'">'+esc(x.title)+'</option>';}).join(""))+'<button class="btn secondary" type="button" data-action="reviewOfferImage(document.querySelector(\'[name=visionOffer]\').value)">Analisar imagem</button></div><div id="curatorAiResult" class="csp-margin-top-14px" aria-live="polite"></div>';
}
async function runCurator() {
  var box = document.getElementById("curatorResult");
  if (!box) return;
  box.innerHTML = '<div class="callout">Analisando ofertas aprovadas e verificando regras...</div>';
  try {
    var response = await fetch("/api/radar/autopilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "EVALUATE" })
    });
    var data = await response.json();
    if (!response.ok) throw new Error(data.error || "Não foi possível analisar as ofertas.");
    var items = (Array.isArray(data.diagnostics) ? data.diagnostics : []).slice().sort(function (a, b) {
      return Number(b.score || 0) - Number(a.score || 0);
    });
    if (!items.length) {
      box.innerHTML = '<div class="empty">Nenhuma oferta aprovada para avaliar. Aprove primeiro as ofertas que já foram revisadas.</div>';
      return;
    }
    box.innerHTML =
      '<div class="metrics">' +
      metric("Avaliadas", Number(data.summary && data.summary.total || items.length), "ofertas aprovadas") +
      metric("Regras correspondentes", Number(data.summary && data.summary.matched || 0), "não é aprovação de publicação") +
      metric("Pontuação", "0–100", "apenas informativa") +
      '</div><div class="tablewrap"><table class="table"><thead><tr><th>Oferta</th><th>Preço atual</th><th>Desconto</th><th>Regras</th><th>Score Radar</th><th>Ação do Radar</th><th>Motivos</th></tr></thead><tbody>' +
      items.slice(0, 30).map(function (item) {
        var reasons = Array.isArray(item.reasons) ? item.reasons.join(" · ") : "";
        return '<tr><td><b>' + esc(item.title || "Oferta sem título") + '</b><div class="muted">' + esc(item.source || "") + '</div></td><td>' +
          brl(Number(item.current_price || 0)) + '</td><td>' + Number(item.discount || 0) + '%</td><td><span class="pill ' +
          (item.matched ? "live" : "warn") + '">' + (item.matched ? "Regra OK" : "Sem regra") +
          '</span></td><td>' + Number(item.score || 0) + '/100 · ' + esc(item.radar && item.radar.label || "Sem classificação") +
          '</td><td>' + esc(item.radar && item.radar.action || "REVISAR") + '</td><td>' + esc(reasons || "Sem motivo detalhado") + '</td></tr>';
      }).join("") +
      '</tbody></table></div><p class="muted">A análise atualiza o score interno do Radar. Regras correspondentes não significam que o score recomende publicar; confira a ação informativa, o preço, a imagem e o link oficial. Nenhuma oferta foi aprovada, agendada ou publicada por esta ação.</p>';
  } catch (error) {
    box.textContent = error.message || "Falha ao analisar ofertas.";
  }
}
async function runAiCurator() {
  var box = document.getElementById("curatorAiResult");
  if (!box) return;
  box.innerHTML = '<div class="callout">A IA está analisando somente as ofertas aprovadas...</div>';
  try {
    var response = await fetch("/api/radar/curator-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ANALYZE" })
    });
    var data = await response.json();
    if (!response.ok) throw new Error(data.error || "A curadoria com IA falhou.");
    var items = Array.isArray(data.recommendations) ? data.recommendations : [];
    if (!items.length) {
      box.innerHTML = '<div class="empty">' + esc(data.notice || "Nenhuma oferta aprovada para analisar.") + '</div>';
      return;
    }
    var priorityLabel = { HIGH: "Alta", MEDIUM: "Média", LOW: "Baixa" };
    var actionLabel = { REVIEW: "Revisar", HOLD: "Bloqueada · falta validar dados", IGNORE: "Ignorar" };
    box.innerHTML =
      '<div class="callout">' + esc(data.notice || "Análise consultiva; nada foi publicado.") + '</div>' +
      '<p class="muted">Motor: ' + esc(data.model || "IA") + ' · Ofertas analisadas: ' + Number(data.count || items.length) + '</p>' +
      '<div class="tablewrap"><table class="table"><thead><tr><th>Oferta</th><th>Preço</th><th>Score Radar</th><th>Prioridade IA</th><th>Próxima ação</th><th>Justificativa</th></tr></thead><tbody>' +
      items.map(function (item) {
        return '<tr><td><b>' + esc(item.title || "Oferta sem título") + '</b><div class="muted">' + esc(item.store || "") + '</div></td><td>' +
          brl(Number(item.currentPriceCents || 0)) + '</td><td>' + Number(item.radarScore || 0) + '/100</td><td>' +
          esc(priorityLabel[item.priority] || "Baixa") + '</td><td><span class="pill ' +
          (item.action === "HOLD" || item.action === "IGNORE" ? "warn" : "live") + '">' + esc(actionLabel[item.action] || "Revisar") +
          '</span></td><td>' + esc(item.reason || "Revise manualmente.") + '</td></tr>';
      }).join("") +
      '</tbody></table></div>';
  } catch (error) {
    box.textContent = error.message || "A curadoria com IA falhou. Nenhuma oferta foi alterada.";
  }
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
              (x.discountType === "PERCENT" ? " · " + esc(x.discountValue) + "% de desconto" : x.discountType === "FIXED" ? " · R$ " + (Number(x.discountValue || 0) / 100).toFixed(2).replace(".", ",") + " de desconto" : "") +
              (Number(x.minPurchaseCents || 0) > 0 ? " · mínimo R$ " + (Number(x.minPurchaseCents) / 100).toFixed(2).replace(".", ",") : "") +
              (Number(x.maxDiscountCents || 0) > 0 ? " · limite R$ " + (Number(x.maxDiscountCents) / 100).toFixed(2).replace(".", ",") : "") +
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
  var socialOffers=(D.offers||[]).filter(function(x){return ['APPROVED','READY'].includes(x.status)&&x.affiliateUrl&&x.imageUrl;}),
    socialImages=(D.growth&&D.growth.mediaJobs||[]).filter(function(x){return x.kind==='IMAGE'&&['COMPLETED','FALLBACK_COMPLETED'].includes(x.status);});
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
    '</div>' + select("Oferta para publicar", "socialOffer", '<option value="">Todas as ofertas elegíveis</option>'+socialOffers.map(function(x){return '<option value="'+esc(x.id)+'">'+esc(x.title)+'</option>'}).join("")) +
    select("Imagem gerada por IA", "socialImageJob", '<option value="">Usar imagem da oferta</option>'+socialImages.map(function(x){return '<option value="'+esc(x.id)+'">'+esc(x.title)+' · '+esc(x.provider||"IA")+'</option>'}).join("")) +
    '<div class="callout">Gere uma arte no Estúdio de IA, volte aqui e selecione-a. Ela será anexada aos rascunhos do Instagram/Facebook; revise legenda e imagem antes de aprovar. Publicar exige uma conexão Meta ativa.</div><div class="actions"><button class="btn" data-action="saveSocialSettings()">Salvar e ativar</button><button class="btn secondary" data-action="generateSocialQueue()">Gerar posts e legendas</button><button class="btn dark" data-action="runSocialQueue()">Executar fila</button></div><div class="callout csp-margin-top-14px" >A IA não inventa preço, desconto, cupom, frete ou urgência. Cada link aponta para o rastreador do Radar e depois redireciona ao link de afiliado cadastrado.</div></div><div class="card"><h3>Conexões oficiais Meta</h3>' +
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
    '</div><div class="callout csp-margin-top-8px">Collshp: ' + (sf.collshp_url ? '<a target="_blank" rel="noopener noreferrer" href="' + esc(sf.collshp_url) + '">Abrir vitrine externa</a>' : 'Salve o link da Collshp em Editar vitrine') + '</div><button class="btn csp-margin-top-12px"  data-action="openStorefront()">Editar vitrine</button> <a class="btn secondary" target="_blank" href="/vitrine?loja=' +
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
var editingMessageTemplateId = '';
function messageTemplatesView() {
  var rows = (D.messageTemplates || []).map(function(item) {
    return '<article class="card csp-margin-top-12px"><div class="sectionhead"><div><h3>' + esc(item.name) + '</h3><p class="muted">' + (item.isActive ? 'Ativo' : 'Pausado') + ' · atualizado em ' + esc(item.updatedAt ? new Date(item.updatedAt).toLocaleString('pt-BR') : '—') + '</p></div><div class="actions"><button type="button" class="btn secondary" data-action="editMessageTemplate(\'' + esc(item.id) + '\')">Editar</button><button type="button" class="btn danger" data-action="deleteMessageTemplate(\'' + esc(item.id) + '\')">Excluir</button></div></div><pre class="template-preview">' + esc(item.body) + '</pre></article>';
  }).join('');
  return section('Modelos de mensagem', 'Crie modelos personalizados salvos no banco e isolados por conta. Eles não enviam nem publicam mensagens.', '+ Novo modelo', 'newMessageTemplate()') +
    '<div class="grid two"><section class="card"><h3 id="message-template-form-title">Novo modelo</h3><form id="message-template-form" onsubmit="return false"><div class="field"><label for="message-template-name">Nome</label><input id="message-template-name" class="input" maxlength="80" required placeholder="Ex.: Oferta de eletrônicos"></div><div class="field csp-margin-top-12px"><label for="message-template-body">Texto do modelo</label><textarea id="message-template-body" class="input" rows="9" maxlength="3000" required placeholder="🔥 {{produto}} por {{preco}}&#10;Compre: {{link_afiliado}}"></textarea></div><p class="muted">Variáveis: {{produto}}, {{preco}}, {{preco_anterior}}, {{desconto}}, {{loja}}, {{link_afiliado}}, {{cupom}}, {{link_cupom}}, {{categoria}}.</p><label class="checkline"><input id="message-template-active" type="checkbox" checked> Modelo ativo</label><div class="actions csp-margin-top-12px"><button type="button" class="btn" data-action="saveMessageTemplate()">Salvar modelo</button><button type="button" class="btn secondary" data-action="previewSavedMessageTemplate()">Pré-visualizar</button><button type="button" class="btn secondary" data-action="resetMessageTemplateForm()">Limpar</button></div><div id="message-template-preview" class="callout csp-hidden csp-margin-top-12px" role="status"></div></form></section><section><h3>Modelos salvos (' + (D.messageTemplates || []).length + ')</h3>' + (rows || '<div class="empty"><b>Nenhum modelo personalizado</b><p>Crie um modelo à esquerda. Os modelos padrão do Radar continuam disponíveis na criação de ofertas.</p></div>') + '</section></div>';
}
function offerBuilderSettingsPanel() {
  return '<section class="card csp-margin-top-16px"><div class="sectionhead"><div><h3>Preferências do criador de ofertas</h3><p>Defina o modelo padrão, o tipo de oferta e como o Radar deve tratar os links.</p></div></div><div class="formgrid"><div class="field"><label for="ob-template">Modelo padrão</label><select id="ob-template" class="input"><option value="">Usar modelo automático do Radar</option></select></div><div class="field"><label for="ob-message-type">Tipo de oferta</label><select id="ob-message-type" class="input"><option value="PROMOTION">Oferta padrão</option><option value="FLASH">Oferta relâmpago</option><option value="COUPON">Oferta com cupom</option><option value="IMPORTED">Produto importado</option><option value="SOCIAL">Texto para redes sociais</option></select></div><div class="field"><label for="ob-link-mode">Modo de obtenção do link</label><select id="ob-link-mode" class="input"><option value="MANUAL">Manual — colar link oficial</option><option value="API">API — usar integração oficial</option><option value="AI">IA — assistência e análise</option></select></div><div class="field"><label for="ob-link-type">Tipo de link</label><select id="ob-link-type" class="input"><option value="AFFILIATE_REDIRECT">Link afiliado com redirecionador Radar</option><option value="OFFICIAL_SHORT">Link curto oficial da plataforma</option><option value="DIRECT_AFFILIATE">Link afiliado direto</option><option value="COUPON">Link de resgate de cupom</option><option value="PRODUCT">Link comum do produto (sem comissão garantida)</option></select></div></div><label class="checkline csp-margin-top-12px"><input type="checkbox" id="ob-ai-assist"> Permitir que a IA sugira, classifique e revise links e textos</label><div class="callout csp-margin-top-12px"><b>Segurança de afiliados:</b> a IA não inventa nem transforma URL em link com comissão. No modo API, o Radar só usa integrações oficiais habilitadas para a loja. Quando não houver API de afiliados validada, será necessário colar o link gerado no portal oficial.</div><div class="actions csp-margin-top-12px"><button class="btn" type="button" data-action="saveOfferBuilderSettings()">Salvar preferências</button><button class="btn secondary" type="button" data-action="loadOfferBuilderSettings()">Recarregar</button></div><div id="ob-settings-status" class="muted csp-margin-top-8px"></div></section>';
}
async function loadOfferBuilderSettings() {
  try {
    var r=await fetch('/api/settings/offer-builder'),b=await r.json();
    if(!r.ok)throw Error(b.error||'Falha ao carregar preferências.');
    var s=b.settings||{},t=document.getElementById('ob-template');
    if(t){t.innerHTML='<option value="">Usar modelo automático do Radar</option>'+(b.templates||[]).map(function(x){return '<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>';}).join('');t.value=s.messageTemplateId||'';}
    var set=function(id,v){var e=document.getElementById(id);if(e)e.value=v;};
    set('ob-message-type',s.messageType||'PROMOTION');set('ob-link-mode',s.linkMode||'MANUAL');set('ob-link-type',s.linkType||'AFFILIATE_REDIRECT');
    var ai=document.getElementById('ob-ai-assist');if(ai)ai.checked=Boolean(s.aiAssist);
    var status=document.getElementById('ob-settings-status');if(status)status.textContent='Preferências carregadas. A IA não cria links de comissão por conta própria.';
  }catch(e){var status=document.getElementById('ob-settings-status');if(status)status.textContent=e.message||'Não foi possível carregar.';}
}
async function saveOfferBuilderSettings() {
  var value=function(id){var e=document.getElementById(id);return e?e.value:'';},ai=Boolean(document.getElementById('ob-ai-assist')?.checked);
  try{var r=await fetch('/api/settings/offer-builder',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({messageTemplateId:value('ob-template'),messageType:value('ob-message-type'),linkMode:value('ob-link-mode'),linkType:value('ob-link-type'),aiAssist:ai})}),b=await r.json();if(!r.ok)throw Error(b.error||'Não foi possível salvar.');var status=document.getElementById('ob-settings-status');if(status)status.textContent='Preferências salvas com sucesso.';toast('Preferências do criador de ofertas salvas.');}
  catch(e){toast(e.message||'Falha ao salvar preferências.');}
}
function newMessageTemplate() {
  editingMessageTemplateId = '';
  var title = document.getElementById('message-template-form-title');
  if (title) title.textContent = 'Novo modelo';
  resetMessageTemplateForm();
  var name = document.getElementById('message-template-name');
  if (name) name.focus();
}
function resetMessageTemplateForm() {
  editingMessageTemplateId = '';
  var form = document.getElementById('message-template-form');
  if (!form) return;
  form.reset();
  document.getElementById('message-template-active').checked = true;
  document.getElementById('message-template-form-title').textContent = 'Novo modelo';
  var preview = document.getElementById('message-template-preview');
  preview.classList.add('csp-hidden');
  preview.textContent = '';
}
function editMessageTemplate(templateId) {
  var item = (D.messageTemplates || []).find(function(entry) { return entry.id === templateId; });
  if (!item) return toast('Modelo não encontrado. Atualize a tela e tente novamente.');
  editingMessageTemplateId = item.id;
  document.getElementById('message-template-name').value = item.name;
  document.getElementById('message-template-body').value = item.body;
  document.getElementById('message-template-active').checked = Boolean(item.isActive);
  document.getElementById('message-template-form-title').textContent = 'Editar modelo';
  document.getElementById('message-template-form-title').scrollIntoView({behavior:'smooth',block:'start'});
}
async function saveMessageTemplate() {
  var name = document.getElementById('message-template-name').value.trim();
  var body = document.getElementById('message-template-body').value.trim();
  var isActive = document.getElementById('message-template-active').checked;
  try {
    var response = await fetch('/api/messages/templates', {method: editingMessageTemplateId ? 'PUT' : 'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id:editingMessageTemplateId || undefined,name,body,isActive})});
    var result = await response.json();
    if (!response.ok) throw Error(result.error || 'Não foi possível salvar o modelo.');
    var data = await readJSON('/api/messages/templates');
    D.messageTemplates = data.templates || [];
    resetMessageTemplateForm();
    render();
    toast('Modelo salvo na conta.');
  } catch(error) { toast(error.message || 'Não foi possível salvar o modelo.'); }
}
async function deleteMessageTemplate(templateId) {
  if (!confirm('Excluir este modelo desta conta? Esta ação não envia mensagens.')) return;
  try {
    var response = await fetch('/api/messages/templates?id=' + encodeURIComponent(templateId), {method:'DELETE'});
    var result = await response.json();
    if (!response.ok) throw Error(result.error || 'Não foi possível excluir o modelo.');
    D.messageTemplates = (D.messageTemplates || []).filter(function(item){return item.id !== templateId;});
    render();
    toast('Modelo excluído.');
  } catch(error) { toast(error.message || 'Não foi possível excluir o modelo.'); }
}
function previewSavedMessageTemplate() {
  var body = document.getElementById('message-template-body').value;
  var values = {produto:'Produto de exemplo',preco:'R$ 99,90',preco_anterior:'R$ 149,90',desconto:'33%',loja:'Shopee',link_afiliado:'https://exemplo.invalid/link',cupom:'CUPOM10',link_cupom:'https://exemplo.invalid/cupom',categoria:'Tecnologia'};
  var preview = document.getElementById('message-template-preview');
  var tokens = [...body.matchAll(/{{\s*([a-zA-Z_]+)\s*}}/g)].map(function(match){return match[1].toLowerCase();});
  var allowed = ['produto','preco','preco_anterior','desconto','loja','link_afiliado','cupom','link_cupom','categoria'];
  var unknown = tokens.filter(function(token){return !allowed.includes(token);});
  if (!body.trim()) return toast('Escreva o texto do modelo antes de pré-visualizar.');
  if (unknown.length || /{{|}}/.test(body.replace(/{{\s*[a-zA-Z_]+\s*}}/g,''))) return toast('Corrija as variáveis inválidas antes de pré-visualizar.');
  preview.textContent = body.replace(/{{\s*([a-zA-Z_]+)\s*}}/g,function(_match,token){return values[token.toLowerCase()] || '';});
  preview.classList.remove('csp-hidden');
}

function aiUsageView(){
  return '<div class="ai-usage-page">'+
    '<section class="hero"><div><div class="eyebrow">GOVERNANÇA E EFICIÊNCIA</div><h2>Consumo de inteligência artificial</h2><p>Acompanhe chamadas, tokens, custos registrados, modelos utilizados e o estado do controle global do Gemini.</p></div></section>'+
    '<div class="ai-usage-toolbar"><label>Período <select id="ai-usage-window" class="input" onchange="loadAIUsage()"><option value="24h">Últimas 24 horas</option><option value="7d" selected>Últimos 7 dias</option><option value="30d">Últimos 30 dias</option><option value="mtd">Este mês</option></select></label><button class="btn secondary" onclick="loadAIUsage()">Atualizar dados</button><span id="ai-usage-updated" class="muted">Buscando dados...</span></div>'+
    '<div id="ai-usage-status" class="ai-usage-status">Carregando controle do Gemini...</div>'+
    '<div id="ai-usage-metrics" class="metrics"><div class="empty">Carregando consumo real...</div></div>'+
    '<div class="ai-usage-grid"><section class="card"><div class="sectionhead"><div><h2>Consumo ao longo do período</h2><p>Chamadas e custo registrado por intervalo.</p></div></div><div id="ai-usage-series" class="ai-usage-series"></div></section><section class="card"><div class="sectionhead"><div><h2>Uso por modelo</h2><p>Distribuição de chamadas e custos.</p></div></div><div id="ai-usage-models"></div></section></div>'+
    '<section class="card"><div class="sectionhead"><div><h2>Finalidade das chamadas</h2><p>Quais recursos mais utilizam IA.</p></div></div><div id="ai-usage-purposes" class="tablewrap"></div></section>'+
    '<section class="card"><div class="sectionhead"><div><h2>Detalhamento técnico</h2><p>Tokens, cache e qualidade dos dados de custo.</p></div></div><div id="ai-usage-details" class="ai-usage-details"></div></section>'+
    '<p class="muted ai-usage-footnote">Os custos são os valores reportados pela plataforma para o período selecionado; custo zero em um modelo não significa necessariamente que ele esteja incluído no plano gratuito do Google. Limites de RPM, TPM e RPD são separados do orçamento financeiro.</p></div>';
}
function aiUsageMoney(value){return Number(value||0).toLocaleString('en-US',{style:'currency',currency:'USD',minimumFractionDigits:4,maximumFractionDigits:4});}
function aiUsageNumber(value){return Number(value||0).toLocaleString('pt-BR');}
async function loadAIUsage(){
  var windowSelect=document.getElementById('ai-usage-window'),period=windowSelect?windowSelect.value:'7d';
  var status=document.getElementById('ai-usage-status'),metrics=document.getElementById('ai-usage-metrics');
  if(status)status.textContent='Atualizando dados...';
  try{
    var response=await fetch('/api/admin/ai-usage?window='+encodeURIComponent(period),{headers:{Accept:'application/json'}}),data=await response.json();
    if(!response.ok)throw Error(data.error||'Não foi possível consultar o consumo.');
    var t=data.totals||{},pause=data.gemini_control||{};
    if(status)status.innerHTML=pause.paused?'<b>Gemini em pausa global</b><span>Até '+esc(new Date(pause.paused_until).toLocaleString('pt-BR'))+'. As rotas protegidas devem evitar novas chamadas Gemini.</span>':'<b>Gemini sem pausa global registrada</b><span>O controle de cota está ativo. Os limites gratuitos do Google continuam sujeitos ao projeto e ao modelo.</span>';
    if(metrics)metrics.innerHTML=[
      ['Chamadas',aiUsageNumber(t.calls),'Solicitações no período'],
      ['Custo registrado',aiUsageMoney(t.cost_usd),'Estimativa reportada pela plataforma'],
      ['Tokens de entrada',aiUsageNumber(t.input_tokens),'Conteúdo enviado aos modelos'],
      ['Tokens de saída',aiUsageNumber(t.output_tokens),'Conteúdo gerado pelos modelos'],
      ['Leitura de cache',aiUsageNumber(t.cache_read_tokens),'Tokens reutilizados em cache'],
      ['Chamadas sem preço',aiUsageNumber(t.unpriced_calls),'Itens sem custo calculado']
    ].map(function(m){return '<div class="metric"><label>'+m[0]+'</label><b>'+m[1]+'</b><small>'+m[2]+'</small></div>';}).join('');
    var series=data.series||[],maxCost=Math.max(0.000001,...series.map(function(x){return Number(x.cost_usd)||0;}));
    var seriesEl=document.getElementById('ai-usage-series');
    if(seriesEl)seriesEl.innerHTML=series.length?series.map(function(x){var pct=Math.max(3,Number(x.cost_usd||0)/maxCost*100);return '<div class="ai-series-row"><div><b>'+esc(String(x.bucket||'').replace('T',' '))+'</b><span>'+aiUsageNumber(x.calls)+' chamadas · '+aiUsageMoney(x.cost_usd)+'</span></div><div class="ai-bar"><i style="width:'+pct.toFixed(1)+'%"></i></div></div>';}).join(''):'<div class="empty">Sem dados para o período.</div>';
    var models=data.by_model||[],modelsEl=document.getElementById('ai-usage-models');
    if(modelsEl)modelsEl.innerHTML=models.length?models.map(function(x){return '<div class="ai-usage-line"><div><b>'+esc(x.model||x.alias||'Modelo não identificado')+'</b><small>'+esc(x.provider||'Provedor não informado')+' · '+aiUsageNumber(x.calls)+' chamadas</small></div><strong>'+aiUsageMoney(x.cost_usd)+'</strong></div>';}).join(''):'<div class="empty">Sem dados por modelo.</div>';
    var purposes=data.by_purpose||[],purposeEl=document.getElementById('ai-usage-purposes');
    if(purposeEl)purposeEl.innerHTML=purposes.length?'<table class="table"><thead><tr><th>Finalidade</th><th>Chamadas</th><th>Custo</th></tr></thead><tbody>'+purposes.map(function(x){return '<tr><td>'+esc(x.purpose||'Não identificada')+'</td><td>'+aiUsageNumber(x.calls)+'</td><td>'+aiUsageMoney(x.cost_usd)+'</td></tr>';}).join('')+'</tbody></table>':'<div class="empty">Sem finalidades registradas.</div>';
    var details=document.getElementById('ai-usage-details');
    if(details)details.innerHTML=[
      ['Cache de criação',aiUsageNumber(t.cache_creation_tokens)],
      ['Cache de leitura',aiUsageNumber(t.cache_read_tokens)],
      ['Custo completo',t.cost_is_complete?'Sim':'Não'],
      ['Chamadas sem preço',aiUsageNumber(t.unpriced_calls)],
      ['Limite financeiro reportado hoje',aiUsageMoney(data.daily_limit_usd)],
      ['Gasto reportado hoje',aiUsageMoney(data.spend_today_usd)]
    ].map(function(x){return '<div><small>'+x[0]+'</small><b>'+x[1]+'</b></div>';}).join('');
    var updated=document.getElementById('ai-usage-updated');if(updated)updated.textContent='Atualizado em '+new Date().toLocaleString('pt-BR');
  }catch(error){if(status)status.textContent=error.message;if(metrics)metrics.innerHTML='<div class="empty">Falha ao carregar os dados. Verifique sua sessão e tente novamente.</div>';toast(error.message||'Falha ao consultar IA.');}
}

function render() {
  nav();
  var globalOfferAction=document.getElementById("global-create-offer");
  if(globalOfferAction)globalOfferAction.hidden=current==="offers"&&selectedGroups.offers==="offers";
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
    aiusage: aiUsageView,
    settings: function () {
      return groupPage("settings");
    },
    templates: messageTemplatesView,
    quick: quick,
    monitoring: monitoring,
  };
  document.getElementById("content").innerHTML =
    '<section class="view on">' + f[current]() + "</section>";
  loadMarketplaceStatus();
  if(current==='templates'||current==='settings'&&selectedGroups.settings==='templates')loadOfferBuilderSettings();
  if(current==='aiusage')loadAIUsage();
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
    var b = await socialCall("POST", { action: "GENERATE", limit: 6, offerId:document.querySelector('[name="socialOffer"]').value, imageJobId:document.querySelector('[name="socialImageJob"]').value });
    show("socialagent");
    toast(
      b.generated
        ? b.generated + " post(s) com legenda criados para revisão"
        : b.reason==="IMAGE_NOT_READY" ? "A imagem selecionada ainda não está pronta" : "Nenhuma oferta elegível nova",
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
      select("Tipo de benefício", "discountType", '<option value="TEXT">Somente descrição (sem cálculo automático)</option><option value="PERCENT">Percentual</option><option value="FIXED">Valor fixo em reais</option>') +
      field("Valor do benefício", "discountValue", "number", 'step="0.01" min="0" placeholder="Ex.: 20 para 20% ou 15 para R$ 15,00"') +
      '<div class="formgrid">' +
      field("Compra mínima (R$)", "minPurchase", "number", 'step="0.01" min="0" value="0"') +
      field("Desconto máximo (R$)", "maxDiscount", "number", 'step="0.01" min="0" value="0" placeholder="0 = sem limite"') +
      "</div>" +
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
function storeOptions(selected) {
  return (D.suite.marketplaces || [])
    .map(function (x) {
      return (
        '<option value="' +
        x.marketplace +
        '"' + (x.marketplace === selected ? ' selected' : '') + '>' +
        esc(x.marketplace.replaceAll("_", " ")) +
        "</option>"
      );
    })
    .join("");
}
function openOffer(prefill) {
  prefill = prefill || {};
  openModal(
    "Nova oferta",
    "O cadastro cria um rascunho pendente. Confira os dados; o envio exige validação oficial de preço.",
    field(
      "Imagem do produto",
      "image",
      "file",
      'accept="image/jpeg,image/png,image/webp" required',
    ) +
      field("Nome do produto", "title", "text", 'required value="' + esc(prefill.title || "") + '"') +
      '<div class="formgrid">' +
      select("Loja", "source", storeOptions(prefill.source)) +
      select("Categoria", "categoryId", catOpts()) +
      '</div><div class="formgrid">' +
      field(
        "Preço atual",
        "currentPrice",
        "number",
        'step=".01" min=".01" required value="' + esc(prefill.currentPrice || "") + '"',
      ) +
      field("Preço anterior", "originalPrice", "number", 'step=".01" min="0" value="' + esc(prefill.originalPrice || "") + '"') +
      "</div>" +
      field("Link original", "productUrl", "url", 'placeholder="https://..." value="' + esc(prefill.productUrl || "") + '"') +
      field(
        "Link oficial de afiliado",
        "affiliateUrl",
        "url",
        'required placeholder="https://..." value="' + esc(prefill.affiliateUrl || "") + '"',
      ) +
      '<div class="formgrid"><div class="field"><label for="offer-link-mode">Modo de link</label><select id="offer-link-mode" class="input" disabled><option value="MANUAL">Manual</option><option value="API">API oficial</option><option value="AI">Assistência de IA</option></select></div><div class="field"><label for="offer-link-type">Formato do link</label><select id="offer-link-type" class="input" disabled><option value="AFFILIATE_REDIRECT">Redirecionador Radar</option><option value="OFFICIAL_SHORT">Link curto oficial</option><option value="DIRECT_AFFILIATE">Afiliado direto</option><option value="COUPON">Link de cupom</option><option value="PRODUCT">Link comum</option></select></div><div class="field"><label for="offer-message-type">Tipo de oferta</label><select id="offer-message-type" class="input" disabled><option value="PROMOTION">Padrão</option><option value="FLASH">Relâmpago</option><option value="COUPON">Com cupom</option><option value="IMPORTED">Importada</option><option value="SOCIAL">Redes sociais</option></select></div></div><div class="actions"><button type="button" class="btn secondary" data-action="generateAffiliateLinkByApi()">Gerar link pela API oficial</button></div><p id="offer-api-help" class="muted">As preferências vêm de Configurações → Modelos de mensagem.</p>' +
      '<div class="callout csp-margin-top-12px">O Radar não considera o link afiliado só por ele estar preenchido. Confirme que foi gerado na sua conta do programa e revise preço, imagem e cupom; a oferta continuará pendente até aprovação.</div>' +
      '<div class="field"><label><input type="checkbox" name="offerDetailsConfirmed" required> Confirmo que revisei os dados e que este é meu link oficial de afiliado.</label></div>' +
      '<div class="formgrid">' +
      field("Código do cupom", "couponCode", "text", 'placeholder="CASA20" value="' + esc(prefill.couponCode || "") + '"') +
      field("Link do cupom", "couponUrl", "url", 'placeholder="https://..." value="' + esc(prefill.couponUrl || "") + '"') +
      "</div>" +
      '<div class="field"><label><input type="checkbox" name="useBestCoupon" checked> Aplicar automaticamente o melhor cupom ativo da loja que atende ao preço mínimo e à validade</label></div>' +
      select(
        "Modelo da mensagem",
        "messageTemplate",
        '<option value="AUTO">Automático pela categoria</option><option value="IMPACT">Impactante</option><option value="COMPLETE">Oferta completa</option><option value="BABY">Bebês e família</option><option value="IMPORTED">Produtos importados</option><option value="CLEAN">Direto e limpo</option>',
      ) +
      '<div class="field"><label for="customMessageTemplateId">Modelo personalizado salvo</label><select class="input" id="customMessageTemplateId"><option value="">Selecione um modelo salvo...</option>' + (D.messageTemplates || []).filter(function(item){return item.isActive;}).map(function(item){return '<option value="' + esc(item.id) + '">' + esc(item.name) + '</option>';}).join('') + '</select><button type="button" class="btn secondary csp-margin-top-8px" data-action="applySavedOfferTemplate()">Usar modelo salvo</button><small class="muted">Gerencie os modelos em Configurações → Modelos de mensagem.</small></div>' +
      '<div class="field"><div class="csp-field-heading"><label>Mensagem da promoção</label><div class="actions"><button type="button" class="btn secondary" data-action="previewMessage()">Montar modelo</button><button type="button" class="btn secondary" data-action="generateAI()">Melhorar com IA</button></div></div><textarea class="input" name="message" rows="12" placeholder="Clique em Montar modelo ou Melhorar com IA.">' + esc(prefill.message || "") + '</textarea></div>',
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
        toast("Oferta salva como pendente. Aprove e confirme o preço oficial antes de enviar.");
      } catch (err) {
        toast(err.message);
      }
    },
  );
  loadOfferDefaultsIntoForm();
}

async function loadOfferDefaultsIntoForm() {
  try {
    var r=await fetch('/api/settings/offer-builder'),b=await r.json();
    if(!r.ok)throw Error(b.error||'Falha ao carregar preferências');
    var s=b.settings||{},form=document.getElementById('form');if(!form)return;
    var mode=document.getElementById('offer-link-mode');
    if(mode)mode.value=s.linkMode||'MANUAL';
    var linkType=document.getElementById('offer-link-type');
    if(linkType)linkType.value=s.linkType||'AFFILIATE_REDIRECT';
    var messageType=document.getElementById('offer-message-type');
    if(messageType)messageType.value=s.messageType||'PROMOTION';
    if(s.messageTemplateId){
      var custom=document.getElementById('customMessageTemplateId');
      if(custom&&Array.from(custom.options).some(function(o){return o.value===s.messageTemplateId;})){custom.value=s.messageTemplateId;applySavedOfferTemplate();}
    }
    var preset=document.getElementById('offer-api-help');
    if(preset)preset.textContent=s.linkMode==='API'?'Modo API selecionado. A geração automática depende de uma integração oficial validada para a loja escolhida.':'Modo '+(s.linkMode==='AI'?'IA':'manual')+' selecionado. Revise o link e o texto antes de salvar.';
  }catch(e){toast('Não foi possível carregar as preferências: '+e.message);}
}

async function generateAffiliateLinkByApi() {
  var f=document.getElementById('form');if(!f)return;
  var store=String(f.elements.source.value||'').toUpperCase();
  var productUrl=String(f.elements.productUrl.value||'').trim();
  if(!productUrl)return toast('Informe primeiro o link original do produto.');
  var payload={},path='',affiliateUrl='';
  if(store==='AMAZON'){path='/api/integrations/amazon';payload={action:'generateLink',productUrl:productUrl};}
  else if(store==='AWIN'){path='/api/integrations/awin';var awinAdvertiser=prompt('Informe o ID do anunciante Awin em que seu Publisher está aprovado:');if(!awinAdvertiser)return;payload={action:'deeplink',advertiserId:awinAdvertiser,productUrl:productUrl};}
  else if(store==='ALIEXPRESS'){path='/api/integrations/aliexpress';payload={action:'generateLink',productUrl:productUrl};}
  else if(store==='SHOPEE'){path='/api/integrations/shopee';payload={action:'create_link',originUrl:productUrl};var sub=prompt('SubID opcional para identificar a campanha (deixe vazio se não usar):','');if(sub===null)return;payload.subIds=sub;}
  else if(store==='ADMITAD'){path='/api/integrations/admitad';var campaign=prompt('Informe o ID da campanha Admitad em que sua conta/site está aprovado:');if(!campaign)return;payload={action:'deeplink',campaignId:campaign,productUrl:productUrl};}
  else if(store==='RAKUTEN'){path='/api/integrations/rakuten';var advertiser=prompt('Informe o ID numérico do anunciante Rakuten em que você tem parceria aprovada:');if(!advertiser)return;payload={action:'deep_link',advertiserId:advertiser,productUrl:productUrl,subId:'radarpromo'};}
  else if(store==='LOMADEE'){
    path='/api/integrations/lomadee';var org=prompt('Informe o organizationId (UUID) autorizado pela Lomadee:');if(!org)return;
    var kind=prompt('Tipo de link: Coupon, Offer, BrandPage, Custom ou Home','Custom');if(!kind)return;
    payload={action:'shorten_url',organizationId:org,type:kind};
    if(kind==='Custom')payload.url=productUrl;
    if(kind==='Coupon'||kind==='Offer'){var feature=prompt('Informe o featureId da campanha/cupom:');if(!feature)return;payload.featureId=feature;}
  } else {
    return toast('Esta loja ainda não possui geração automática de link confirmada neste formulário. Use o link criado no portal oficial; o Radar não fabricará parâmetros de afiliado.');
  }
  try{
    toast('Solicitando link rastreável à API oficial de '+store+'...');
    var r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),b=await r.json();
    if(!r.ok)throw Error(b.error||'A API não gerou o link.');
    if(store==='AMAZON'||store==='AWIN')affiliateUrl=b.affiliateUrl||'';
    if(store==='ALIEXPRESS')affiliateUrl=b.affiliateUrl||'';
    if(store==='SHOPEE')affiliateUrl=b.shortLink||'';
    if(store==='ADMITAD')affiliateUrl=b.links&&b.links[0]&&b.links[0].link||'';
    if(store==='RAKUTEN')affiliateUrl=b.affiliateUrl||'';
    if(store==='LOMADEE'){var channels=Array.isArray(b.channels)?b.channels:[];for(var i=0;i<channels.length&&!affiliateUrl;i++){var urls=channels[i].shortUrls||[];if(urls.length)affiliateUrl=urls[0];}}
    if(!affiliateUrl)throw Error('A API respondeu, mas não retornou uma URL afiliada utilizável. Confira permissões, campanha, anunciante e canal.');
    f.elements.affiliateUrl.value=affiliateUrl;
    toast('Link oficial retornado pela '+store+'. Confira o rastreamento e confirme antes de salvar; nada foi publicado.');
  }catch(e){toast(e.message||'Falha na geração do link.');}
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
    useBestCoupon: Boolean(f.elements.useBestCoupon && f.elements.useBestCoupon.checked),
    template: (document.getElementById('offer-message-type')?.value==='FLASH'?'IMPACT':document.getElementById('offer-message-type')?.value==='IMPORTED'?'IMPORTED':f.elements.messageTemplate.value),
    offerType: document.getElementById('offer-message-type')?.value || 'PROMOTION',
  };
}
function applySavedOfferTemplate() {
  var form = document.getElementById('form');
  var selected = document.getElementById('customMessageTemplateId');
  var template = (D.messageTemplates || []).find(function(item){return item.id === (selected && selected.value);});
  if (!template) return toast('Selecione um modelo personalizado ativo.');
  var data = offerMessageData();
  var money = function(value) {
    var number = Number(String(value || '').replace(',', '.'));
    return Number.isFinite(number) && number > 0 ? number.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : '';
  };
  var current = Number(String(data.currentPrice || '').replace(',', '.'));
  var original = Number(String(data.originalPrice || '').replace(',', '.'));
  var discount = Number.isFinite(current) && Number.isFinite(original) && original > current ? Math.round((original-current)*100/original) + '%' : '';
  var values = {
    produto: data.title || '',
    preco: money(data.currentPrice),
    preco_anterior: money(data.originalPrice),
    desconto: discount,
    loja: data.source || '',
    link_afiliado: data.affiliateUrl || '',
    cupom: data.couponCode || '',
    link_cupom: data.couponUrl || '',
    categoria: data.category || ''
  };
  form.elements.message.value = template.body.replace(/{{\s*([a-zA-Z_]+)\s*}}/g,function(_match,token){return values[token.toLowerCase()] || '';});
  toast('Modelo personalizado aplicado. Revise o texto antes de salvar a oferta.');
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
    toast(b.appliedCoupon ? "Modelo validado com o cupom " + b.appliedCoupon.code : "Modelo " + b.templateName + " montado e validado");
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
var lastMeliSearchResults = [];
function copyMeliSearchUrls() {
  var urls = (lastMeliSearchResults || []).map(function(item) { return String(item.productUrl || "").trim(); }).filter(function(url) { return /^https:\/\/(www\.|produto\.)?mercadolivre\.com\.br\//i.test(url); });
  if (!urls.length) { toast("Faça uma busca primeiro; nenhum link de produto válido foi encontrado."); return; }
  navigator.clipboard.writeText(urls.join("\n")).then(function() { toast(urls.length + " links de produto copiados. No Gerador oficial, cole a lista para gerar links em lote, se disponível para sua conta."); }).catch(function() { toast("Não foi possível copiar automaticamente. Selecione os links exibidos e copie manualmente."); });
}
function openMeliAffiliateGenerator() {
  window.open("https://www.mercadolivre.com.br/l/afiliados-gere-seus-links", "_blank", "noopener,noreferrer");
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
    lastMeliSearchResults = (data.results || []).slice(0, 12);
    target.innerHTML = lastMeliSearchResults.length ? '<div class="row csp-margin-bottom-12px"><button class="btn secondary" type="button" data-action="copyMeliSearchUrls()">Copiar URLs para gerar em lote</button> <button class="btn secondary" type="button" data-action="openMeliAffiliateGenerator()">Abrir gerador oficial</button></div>' + lastMeliSearchResults.map(function(item) {
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
  // Never ask for generic affiliate tags, SubID templates, or conversion endpoints.
  // Each integration must use its documented provider-specific flow.
  if (store === "MERCADO_LIVRE" || store === "MERCADOLIVRE") {
    connectMercadoLivre();
    return;
  }
  if (store === "MAGALU") {
    openMagaluApiCredentials();
    return;
  }
  openMarketplaceSetup(store);
}
function openStorefront() {
  var s = D.suite.storefront || {},
    publicUrl = D.account && D.account.slug
      ? location.origin + "/vitrine?loja=" + encodeURIComponent(D.account.slug)
      : "";
  openModal(
    "Vitrine pública",
    "Edite sua página pública do Radar e escolha quais ofertas aprovadas aparecem para visitantes.",
    '<div class="callout">Esta é a vitrine própria do Radar Promo. Marque ofertas aprovadas como visíveis para incluí-las.' +
      (publicUrl ? '<p><a href="' + esc(publicUrl) + '" target="_blank" rel="noopener noreferrer">Abrir vitrine pública ↗</a></p>' : '') +
      '</div>' +
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
      field(
        "Link da vitrine Collshp",
        "collshpUrl",
        "url",
        'placeholder="https://collshp.com/emersongabriel291295?view=storefront" value="' + esc(s.collshp_url || s.collshpUrl || "https://collshp.com/emersongabriel291295?view=storefront") + '"',
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
        '<option value="WHATSAPP_GROUP">Grupo do WhatsApp</option><option value="TELEGRAM_CHANNEL">Grupo/canal do Telegram</option><option value="MARKETPLACE">Marketplace</option><option value="FEED">Feed autorizado</option>',
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
  var lastGroup='';
  document.getElementById('nav').innerHTML=NAV.map(function(n){
    var heading=n[3]!==lastGroup?'<h2 class="nav-heading">'+n[3]+'</h2>':'';
    lastGroup=n[3];
    return heading+'<button '+(current===n[0]?'aria-current="page" ':'')+'class="'+(current===n[0]?'on':'')+'" data-action="show(\''+n[0]+'\')"><span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="'+navPaths[n[0]]+'"/></svg></span>'+n[1]+'</button>';
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
  if(parent){selectedGroups[parent]=view;if(parent==="offers")selectedGroups.offerCategory=offerCategoryForView(view);}else if(GROUPS[target]){selectedGroups[target]=GROUPS[target][0][0];if(target==="offers")selectedGroups.offerCategory="catalog";}
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
    // Serialize dashboard reads to avoid bursts against the project's shared DB query limit.
    var paths=['/api/suite','/api/reports?days='+reportDays,'/api/growth','/api/social/autopilot','/api/compliance/messaging?days=7','/api/readiness','/api/integrations/health-summary','/api/messages/templates'];
    var keys=['suite','reportsData','growth','social','compliance','readiness','integrationHealth','messageTemplatesData'],failures=[];
    for(var index=0;index<paths.length;index++){
      try{data[keys[index]]=await readJSON(paths[index]);}
      catch(error){data[keys[index]]=D[keys[index]];failures.push(keys[index]);}
      if(sequence!==loadSequence)return;
    }
    if(data.messageTemplatesData&&Array.isArray(data.messageTemplatesData.templates))data.messageTemplates=data.messageTemplatesData.templates;
    D=Object.assign({},D,data,data.messageTemplatesData?{messageTemplates:data.messageTemplatesData.templates}: {});D.loadFailures=failures;
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
function openApiProvider(provider){
 var details=Array.from(document.querySelectorAll('.integration-details')).find(function(x){return x.querySelector('.api-credentials-panel');});
 if(!details){toast('Abra Integrações e tente novamente.');return;}
 details.open=true;
 var selectEl=document.getElementById('apiProvider');
 if(selectEl)selectEl.value=provider;
 details.scrollIntoView({behavior:'smooth',block:'start'});
 var key=document.getElementById('apiKeyInput');if(key)key.focus({preventScroll:true});
}
function apiCredentialsPanel(){
 return '<div class="card api-credentials-panel"><h3>Chaves de IA e serviços técnicos</h3><p class="muted">Use esta área para provedores de IA e serviços técnicos. <b>Não cadastre aqui chaves de lojas ou afiliados</b>; use a seção Credenciais das lojas. As chaves são criptografadas e só mostramos os últimos quatro caracteres. O teste confirma a credencial desta lista; ele não substitui automaticamente os segredos de produção usados pelo backend.</p><div class="grid three">'+[
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
   var testable=['OPENAI','GEMINI','ANTHROPIC'].indexOf(item.provider)!==-1;
   var validationLabel=item.validationStatus==='VALIDATED'?'Validada':item.validationStatus==='ERROR'?'Erro no teste':item.validationStatus==='PENDING_VALIDATION'?'Aguardando teste':'Teste manual necessário';
   return '<div class="integration"><div class="grow"><b>'+esc(item.label||item.provider)+'</b><div class="muted">'+esc(item.provider)+' · chave terminada em ••••'+esc(item.keyLast4||'')+'</div><small class="muted">'+esc(validationLabel)+' · atualizada em '+esc(item.updatedAt?new Date(item.updatedAt).toLocaleDateString("pt-BR"):"—")+'</small>'+(item.lastError?'<div class="muted">'+esc(item.lastError)+'</div>':'')+'</div>'+(testable?'<button class="btn secondary" type="button" data-action="testApiCredential(\''+esc(item.provider)+'\')">Testar chave</button> ':'')+'<button class="btn danger" type="button" data-action="deleteApiCredential(\''+esc(item.provider)+'\')">Excluir</button></div>';
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
  var testable=["OPENAI","GEMINI","ANTHROPIC"].indexOf(provider.value)!==-1;
  if(testable){try{var testResponse=await fetch("/api/integrations/apis",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({provider:provider.value,action:"test"})}),testData=await testResponse.json();if(!testResponse.ok)throw Error(testData.error||"A chave foi salva, mas o teste falhou.");notice.textContent="Chave salva e validada por consulta oficial somente leitura. "+(testData.message||"");toast("Chave salva e validada.");}catch(testError){notice.textContent="Chave salva, mas a validação falhou: "+testError.message;toast("Chave salva; valide o erro antes de usar.");}}
  else{notice.textContent=data.message||"API cadastrada com segurança. Teste automático ainda não disponível para este provedor.";toast("Chave salva; teste automático indisponível para este provedor.");}
  await loadApiCredentials();
 }catch(error){notice.textContent=error.message;toast(error.message);}
}
async function testApiCredential(provider){
 try{var response=await fetch('/api/integrations/apis',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider:provider,action:'test'})}),data=await response.json();if(!response.ok)throw Error(data.error||'A validação falhou.');toast('Chave '+provider+' validada por consulta oficial somente leitura.');}
 catch(error){toast(error.message||'Não foi possível validar a chave.');}
 await loadApiCredentials();
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
 return '<div class="card csp-margin-bottom-16px"><h3>Credenciais das lojas</h3><p class="muted">Cadastre apenas chaves, tokens e IDs emitidos pelo portal oficial. Salvar credenciais não significa que a API foi validada; nenhuma oferta é publicada por esta tela.</p><div id="marketplaceCredentialStatus" class="grid two"><div class="empty">Carregando estado das lojas...</div></div><div id="lomadeeDataPanel" class="csp-margin-top-16px"></div><div class="actions csp-margin-top-12px"><a class="btn secondary" href="/affiliate-intelligence.html">Abrir explorador e inteligência de afiliados</a></div></div><div class="card csp-margin-bottom-16px"><h3>Extensão Capturador Multiplataforma</h3><p class="muted">Crie uma chave exclusiva para a extensão Chrome. A chave é exibida uma única vez, armazenada no Chrome e pode ser revogada a qualquer momento. Ela só permite enviar ofertas como rascunhos para sua conta.</p><div id="extensionTokenStatus" class="callout">Verificando conexão da extensão...</div><div class="actions"><button class="btn" type="button" data-action="createExtensionToken()">Gerar / renovar token da extensão</button><button class="btn secondary" type="button" data-action="revokeExtensionToken()">Revogar token</button></div><div id="extensionTokenNew" class="csp-margin-top-12px" hidden></div><p class="muted">Endpoint HTTPS: <code>https://radar-promo-brasil.hatchable.site/api/extension-offers</code></p></div>';
}
async function loadMarketplaceStatus(){
 var root=document.getElementById('marketplaceCredentialStatus');if(!root)return;loadExtensionTokenStatus();
 try{
  var data=await operationRequest('/api/integrations/marketplaces');
  root.innerHTML=(data.items||[]).map(function(item){
   var fieldsArray=item.credentialFields||[],hasFields=fieldsArray.length>0;
   var manualOnly=['SHEIN','TEMU','CASAS_BAHIA','HOTMART','KABUM','AMERICANAS'].indexOf(item.id)!==-1;
   var status=item.id==='MERCADOLIVRE'?(item.status==='CONNECTED'?'API conectada · afiliado separado':'Conta afiliada ≠ conexão API'):item.status==='CONNECTED'?'Conta autorizada':item.status==='VALIDATED'?'API testada com sucesso':item.status==='READ_ONLY_VALIDATED'?'Leitura validada · automação bloqueada':item.status==='ERROR'?'Falha na última validação':item.status==='PENDING_VALIDATION'?'Credenciais salvas · falta testar':item.id==='SHEIN'?'Fluxo manual · sem API pública confirmada':item.id==='TEMU'?'Fluxo manual · API de afiliados não confirmada':manualOnly?'API de afiliados não confirmada':hasFields?'Credenciais salvas · conexão não comprovada':'Não configurada';
   var cls=(item.status==='VALIDATED'||item.status==='CONNECTED')?'live':item.status==='ERROR'?'danger':'warn';
   var nextStep=item.id==='MAGALU'?(item.status==='CONNECTED'?'Próximo: executar Testar OAuth + API seller.': 'Próximo: configurar Client ID/Secret OAuth, cadastrar callback, autorizar a conta e testar API seller.'):
    item.id==='MERCADOLIVRE'?(item.status==='CONNECTED'?'Conta de afiliado separada da API: testar a conexão de leitura e validar o uso da API.':'Sua conta do Programa de Afiliados pode estar ativa. Este status verifica apenas a conexão OAuth do Radar; para pesquisar produtos pela API, conecte a conta do Mercado Livre aqui.'):
    item.id==='SHEIN'?'Próximo: importar link oficial criado no Centro de Afiliados; não há conexão automática confirmada.':item.id==='TEMU'?'Próximo: importar link/código do portal oficial de Afiliados Temu; rastreamento e comissão precisam ser confirmados no portal.':
    item.id==='CASAS_BAHIA'||item.id==='KABUM'?'Próximo: confirmar acesso a programa de afiliados; API de seller não equivale a API de afiliado.':
    item.id==='HOTMART'?'Próximo: identificar API/escopo oficial compatível com ofertas de afiliados antes de configurar.':
    item.id==='AMERICANAS'?'Próximo: confirmar a rede de afiliados e sua documentação oficial.':
    item.id==='ALIEXPRESS'?'Próximo: confirmar que o portal ainda habilita a API legada; depois executar teste somente leitura.':
    item.id==='LOMADEE'&&item.status==='READ_ONLY_VALIDATED'?'Próximo: leitura oficial validada; testar geração de link e aprovação comercial separadamente.':
    item.id==='LOMADEE'?'Próximo: escolher uma marca no portal Lomadee e testar um link rastreável autorizado.':
    item.id==='RAKUTEN'?'Próximo: salvar Client ID, Client Secret e Account ID Publisher; executar teste oficial.':
    item.id==='ADMITAD'?'Próximo: conferir Website ID e escopos OAuth; depois testar campanhas de leitura.':
    item.id==='AWIN'?'Próximo: conferir Publisher ID e token; testar programas joined em leitura.':
    item.id==='AMAZON'?'Próximo: conferir credenciais Creators API, Partner Tag e versão atribuída; testar busca de leitura.':
    item.id==='SHOPEE'?'Próximo: confirmar habilitação Open API de Afiliados e executar teste de leitura.':
    hasFields?'Próximo: executar o teste oficial disponível; credenciais salvas não provam conexão.':'Próximo: abrir o portal oficial e obter as credenciais do produto correto.';
   if(item.status==='ERROR'&&item.lastError)nextStep='Corrigir a falha informada abaixo e repetir o teste oficial.';
   var fields=(item.credentialFields||[]).map(esc).join(', ');
   var lomadeeActions=item.id==='LOMADEE'&&['VALIDATED','READ_ONLY_VALIDATED'].indexOf(item.status)!==-1?'<button class="btn secondary" type="button" data-action="importLomadeeProducts()">Importar ofertas</button> <button class="btn secondary" type="button" data-action="searchLomadeeProducts()">Pesquisar produtos</button> <button class="btn secondary" type="button" data-action="shortenLomadeeUrl()">Gerar link rastreável</button> <button class="btn secondary" type="button" data-action="loadLomadeeCommissions()">Ver campanhas</button> <button class="btn secondary" type="button" data-action="loadLomadeeOffers()">Ver ofertas</button> <button class="btn secondary" type="button" data-action="loadLomadeeShortUrls()">Ver links encurtados</button> <button class="btn secondary" type="button" data-action="loadLomadeeOrders()">Ver pedidos e comissões</button> <button class="btn secondary" type="button" data-action="loadLomadeeChannels()">Ver canais</button>':'';
   var shopeeActions=item.id==='SHOPEE'&&(item.credentialFields||[]).indexOf('appId')!==-1&&(item.credentialFields||[]).indexOf('apiSecret')!==-1?'<button class="btn secondary" type="button" data-action="openShopeeTools()">Ferramentas Shopee</button>':'';
   var amazonActions=item.id==='AMAZON'&&(item.credentialFields||[]).indexOf('clientId')!==-1&&(item.credentialFields||[]).indexOf('clientSecret')!==-1?'<button class="btn secondary" type="button" data-action="openAmazonTools()">Ferramentas Amazon</button>':'';
   var sheinActions=item.id==='SHEIN'?'<button class="btn secondary" type="button" data-action="openSheinTools()">Ferramentas SHEIN</button>':'';
   var temuActions=item.id==='TEMU'?'<button class="btn secondary" type="button" data-action="openTemuTools()">Ferramentas Temu</button>':'';
   var aliexpressActions=item.id==='ALIEXPRESS'&&(item.credentialFields||[]).indexOf('appId')!==-1&&(item.credentialFields||[]).indexOf('apiSecret')!==-1?'<button class="btn secondary" type="button" data-action="openAliExpressTools()">Ferramentas AliExpress</button>':'';
   var awinActions=item.id==='AWIN'&&(item.credentialFields||[]).indexOf('accessToken')!==-1&&(item.credentialFields||[]).indexOf('affiliateId')!==-1?'<button class="btn secondary" type="button" data-action="openAwinTools()">Ferramentas Awin</button>':'';
   var rakutenActions=item.id==='RAKUTEN'&&(item.credentialFields||[]).indexOf('accessToken')!==-1?'<button class="btn secondary" type="button" data-action="openRakutenTools()">Ferramentas Rakuten</button>':'';
   var admitadActions=item.id==='ADMITAD'&&(item.credentialFields||[]).indexOf('clientId')!==-1&&(item.credentialFields||[]).indexOf('clientSecret')!==-1?'<button class="btn secondary" type="button" data-action="openAdmitadTools()">Ferramentas Admitad</button>':'';
   return '<div class="integration"><div class="grow"><b>'+esc(item.name)+'</b><div class="muted">'+(item.id==='SHEIN'?'Importe links gerados no Centro de Afiliados.':item.id==='MAGALU'?(fields.indexOf('apiKey')!==-1&&fields.indexOf('apiKeyId')!==-1&&fields.indexOf('apiKeySecret')!==-1?'API Magalu: três chaves salvas; autenticação e teste oficial ainda pendentes.':'API Key, API Key ID e API Key Secret ainda não cadastradas. Links de afiliado são um fluxo separado.'):(fields?'Campos cadastrados: '+fields:'Nenhuma credencial cadastrada.'))+'</div>'+ '<div class="muted csp-margin-top-10px"><b>Próxima etapa:</b> '+esc(nextStep)+'</div>'+(item.lastError?'<div class="muted" role="status"><b>Último erro:</b> '+esc(item.lastError)+'</div>':'')+(item.updatedAt?'<small class="muted">Atualizado em '+esc(new Date(item.updatedAt).toLocaleDateString('pt-BR'))+'</small>':'')+'<div class="csp-margin-top-10px"><a class="btn secondary" href="'+esc(item.portalUrl)+'" target="_blank" rel="noopener noreferrer">'+(item.id==='SHEIN'?'Acessar conta de afiliados ↗':'Abrir portal ↗')+'</a> <button class="btn secondary" type="button" data-action="'+(item.id==='MAGALU'?'connectMagaluAccount()':item.id==='MERCADOLIVRE'?'connectMercadoLivre()':'openMarketplaceSetup(\''+esc(item.id)+'\')')+'">'+(item.id==='MERCADOLIVRE'?'Conectar API do Radar':item.id==='MAGALU'?'Conectar conta':['CASAS_BAHIA','HOTMART','KABUM','AMERICANAS'].indexOf(item.id)!==-1?'Ver situação':item.id==='SHEIN'?'Preparar oferta':(fields?'Atualizar chaves':'Conectar conta'))+'</button> '+(item.id==='MAGALU'?'<button class="btn secondary" type="button" data-action="openMagaluApiCredentials()">Atualizar chaves API</button> <button class="btn secondary" type="button" data-action="testMagaluApi()">Testar OAuth + API seller</button> <button class="btn secondary" type="button" data-action="openMagaluTools()">Importar link de afiliado</button>':'')+' '+lomadeeActions+' '+shopeeActions+' '+amazonActions+' '+sheinActions+' '+temuActions+' '+aliexpressActions+' '+awinActions+' '+rakutenActions+' '+admitadActions+'</div></div><span class="pill '+cls+'">'+status+'</span></div>';
  }).join('')||'<div class="empty">Nenhuma loja disponível.</div>';
  var overviewCode={MERCADOLIVRE:'ML',SHOPEE:'SH',AMAZON:'AMZ',ALIEXPRESS:'ALI',SHEIN:'SHN',TEMU:'TMU',MAGALU:'MAG',CASAS_BAHIA:'CB',HOTMART:'HOT',KABUM:'KB',AMERICANAS:'AME',LOMADEE:'LOM',AWIN:'AWIN',RAKUTEN:'RAK',ADMITAD:'ADM'};
  (data.items||[]).forEach(function(item){
   var code=overviewCode[item.id],card=code?document.querySelector('.integration[data-integration-code="'+code+'"]'):null,pill=card&&card.querySelector('.pill');
   if(!pill)return;
   var label=item.id==='MERCADOLIVRE'?(item.status==='CONNECTED'?'API conectada':'Afiliado configurado · API separada'):item.id==='SHEIN'?'Fluxo manual':item.id==='MAGALU'&&item.status==='CONNECTED'?'Conta conectada':item.id==='MAGALU'?(item.credentialFields||[]).indexOf('apiKey')!==-1&&(item.credentialFields||[]).indexOf('apiKeyId')!==-1&&(item.credentialFields||[]).indexOf('apiKeySecret')!==-1?'Conecte a conta':'Chaves pendentes':['CASAS_BAHIA','HOTMART','KABUM','AMERICANAS'].indexOf(item.id)!==-1&&item.status!=='NOT_CONFIGURED'?'Sem teste automático':item.status==='CONNECTED'?'Conta conectada':item.status==='VALIDATED'?'Validada':item.status==='READ_ONLY_VALIDATED'?'Leitura validada':item.status==='ERROR'?'Erro':item.status==='PENDING_VALIDATION'?'Validação pendente':item.status==='NOT_CONFIGURED'?'Não configurada':item.status;
   pill.textContent=label;pill.className='pill '+((item.status==='VALIDATED'||item.status==='CONNECTED')?'live':'warn');
  });
 }catch(error){root.innerHTML='<div class="empty" role="alert">'+esc(error.message)+'</div>';}
}
async function loadExtensionTokenStatus(){var root=document.getElementById('extensionTokenStatus');if(!root)return;try{var response=await fetch('/api/extension-token'),data=await response.json();if(!response.ok)throw Error(data.error||'Falha ao consultar token.');root.textContent=data.configured?'Token ativo · final '+data.token.last4+(data.token.lastUsedAt?' · último uso '+new Date(data.token.lastUsedAt).toLocaleString('pt-BR'):' · ainda não utilizado'):'Nenhum token ativo. Gere um token para conectar a extensão.';}catch(error){root.textContent=error.message||'Não foi possível consultar o token.';}}
async function createExtensionToken(){var root=document.getElementById('extensionTokenNew');if(!root)return;if(!confirm('Gerar um novo token? O token anterior será revogado e a extensão precisará receber o novo valor.'))return;try{var response=await fetch('/api/extension-token',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}),data=await response.json();if(!response.ok)throw Error(data.error||'Não foi possível gerar o token.');root.hidden=false;root.innerHTML='<div class="callout"><b>Copie o token agora. Ele não será exibido novamente.</b><p><code style="word-break:break-all">'+esc(data.token)+'</code></p><button class="btn secondary" type="button" data-action="copyExtensionToken()">Copiar token</button></div>';window.extensionTokenOneTime=data.token;toast('Token gerado. Cole-o na extensão Chrome.');await loadExtensionTokenStatus();}catch(error){toast(error.message||'Falha ao gerar token.');}}
async function copyExtensionToken(){if(!window.extensionTokenOneTime)return toast('Gere um novo token para copiá-lo.');try{await navigator.clipboard.writeText(window.extensionTokenOneTime);toast('Token copiado. Guarde-o na extensão.');}catch(_){toast('Não foi possível copiar; selecione o token exibido.');}}
async function revokeExtensionToken(){if(!confirm('Revogar o token da extensão? Os envios automáticos serão interrompidos até gerar outro.'))return;try{var response=await fetch('/api/extension-token',{method:'DELETE'}),data=await response.json();if(!response.ok)throw Error(data.error||'Falha ao revogar token.');window.extensionTokenOneTime='';var fresh=document.getElementById('extensionTokenNew');if(fresh){fresh.hidden=true;fresh.innerHTML='';}await loadExtensionTokenStatus();toast('Token da extensão revogado.');}catch(error){toast(error.message||'Não foi possível revogar o token.');}}
var apiHealthSnapshot = null;
function apiHealthPanel(snapshot) {
  var data = snapshot === undefined ? apiHealthSnapshot : snapshot;
  var busy = Boolean(data && data.loading);
  var pct = data && data.percent != null ? data.percent : null;
  var color = data && data.errors ? '#d94841' : pct === 100 ? '#138a62' : '#b7791f';
  var button = '<button type="button" class="btn secondary" data-action="refreshApiHealth()"' + (busy ? ' disabled' : '') + '>' + (busy ? 'Verificando…' : 'Verificar agora') + '</button>';
  var html = '<section class="card csp-margin-bottom-16px" id="api-health-card"><div class="sectionhead"><div><h2>Saúde de APIs e integrações</h2><p class="muted">Testes somente de leitura para n8n, MCP e credenciais de IA compatíveis.</p></div>' + button + '</div>';
  if (!data || data.loading) {
    html += '<p class="muted">' + (busy ? 'Consultando conexões e endpoints oficiais…' : 'Ainda não há uma verificação recente. Clique em “Verificar agora” para testar as conexões.') + '</p></section>';
    return html;
  }
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:14px 0">';
  html += '<div style="border:1px solid var(--line);border-radius:12px;padding:14px"><div class="muted">Saúde confirmada</div><div style="font-size:28px;font-weight:800;color:' + color + '">' + (pct == null ? '—' : pct + '%') + '</div><div class="muted">' + data.checked + ' teste(s) concluído(s)</div></div>';
  html += '<div style="border:1px solid var(--line);border-radius:12px;padding:14px"><div class="muted">Com falha</div><div style="font-size:28px;font-weight:800;color:' + (data.errors ? '#d94841' : '#138a62') + '">' + data.errors + '</div><div class="muted">Testes com erro</div></div>';
  html += '<div style="border:1px solid var(--line);border-radius:12px;padding:14px"><div class="muted">Pendente de configuração</div><div style="font-size:28px;font-weight:800">' + data.notConfigured + '</div><div class="muted">Não entram no percentual</div></div></div>';
  if (pct != null) html += '<div style="height:9px;background:var(--line);border-radius:999px;overflow:hidden;margin:0 0 8px"><div role="progressbar" aria-label="Saúde confirmada das APIs" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" style="height:100%;width:' + pct + '%;background:' + color + ';transition:width .25s"></div></div>';
  html += '<p class="muted">Última verificação manual: ' + esc(data.checkedAt || '—') + '. O percentual considera apenas testes realmente executados; credenciais ausentes e integrações sem teste automático ficam fora do cálculo.</p>';
  if (data.autoHealth) { var ah=data.autoHealth.items||[]; var ae=data.autoHealth.alert||ah.some(function(x){return x.status==='ERROR';}); var at=ah.length?ah.map(function(x){return (x.name==='n8n_mcp'?'MCP':'API REST')+': '+(x.status==='CONNECTED'?'OK':x.status==='ERROR'?'FALHA':'configuração pendente')+(x.lastCheckedAt?' ('+x.lastCheckedAt+')':'');}).join(' · '):'Aguardando a primeira execução automática.'; html += '<p class="muted" style="padding:10px;border:1px solid '+(ae?'#d94841':'var(--line)')+';border-radius:10px">'+(ae?'<b>ALERTA: monitoramento automático detectou falha.</b> ':'<b>Monitoramento automático (horário):</b> ')+esc(at)+'</p>'; }
  html += '<h3 class="csp-margin-top-16px">Serviços verificados</h3><div style="display:grid;gap:8px">';
  (data.checks || []).forEach(function(item) {
    var good = item.status === 'UP';
    var bad = item.status === 'ERROR';
    var bg = good ? '#e7f7ef' : bad ? '#fff0ef' : '#fff7df';
    var fg = good ? '#116b46' : bad ? '#a52a25' : '#805b00';
    html += '<div style="display:flex;gap:12px;align-items:flex-start;justify-content:space-between;border:1px solid var(--line);border-radius:10px;padding:12px"><div style="min-width:0;flex:1"><b>' + esc(item.name) + '</b><div class="muted" style="margin-top:4px;overflow-wrap:anywhere">' + esc(item.detail || '') + '</div></div><span style="flex-shrink:0;border-radius:999px;padding:4px 8px;background:' + bg + ';color:' + fg + ';font-size:12px;font-weight:700">' + esc(item.label) + '</span></div>';
  });
  html += '</div>';
  if (data.marketplaces && data.marketplaces.length) {
    html += '<details class="csp-margin-top-16px"><summary><b>Estado das integrações comerciais (' + data.marketplaces.length + ')</b><p class="muted">Estado cadastrado no Radar; “conectado” não significa que a API de afiliados foi testada agora.</p></summary><div style="display:grid;gap:8px;margin-top:12px">';
    data.marketplaces.forEach(function(item) {
      var good = item.state === 'UP';
      var bad = item.state === 'ERROR';
      var bg = good ? '#e7f7ef' : bad ? '#fff0ef' : '#fff7df';
      var fg = good ? '#116b46' : bad ? '#a52a25' : '#805b00';
      html += '<div style="display:flex;gap:10px;align-items:flex-start;justify-content:space-between;border-bottom:1px solid var(--line);padding:9px 0"><div><b>' + esc(item.name) + '</b><div class="muted">' + esc(item.detail || '') + '</div></div><span style="flex-shrink:0;border-radius:999px;padding:4px 8px;background:' + bg + ';color:' + fg + ';font-size:12px;font-weight:700">' + esc(item.label) + '</span></div>';
    });
    html += '</div></details>';
  }
  html += '<p class="muted csp-margin-top-12px">Os testes não executam workflows, não publicam ofertas e não revelam chaves ou tokens.</p></section>';
  return html;
}
async function healthRequest(path, method, body) {
  var response = await fetch(path, { method: method || 'GET', headers: body ? {'Content-Type':'application/json'} : {}, body: body ? JSON.stringify(body) : undefined });
  var data = await response.json().catch(function(){ return {}; });
  if (!response.ok) throw Object.assign(new Error(data.error || ('HTTP ' + response.status)), { code: response.status, payload: data });
  return data;
}
async function refreshApiHealth() {
  var root = document.getElementById('api-health-card');
  if (!root) return;
  apiHealthSnapshot = {loading:true};
  root.outerHTML = apiHealthPanel(apiHealthSnapshot);
  var settled = await Promise.allSettled([
    healthRequest('/api/n8n/api-status','POST',{}),
    healthRequest('/api/n8n/mcp-status','POST',{}),
    healthRequest('/api/integrations/apis','GET'),
    healthRequest('/api/integrations/marketplaces','GET'),
    healthRequest('/api/integrations/health-summary','GET')
  ]);
  function result(index) { return settled[index].status === 'fulfilled' ? settled[index].value : null; }
  function failure(index) { return settled[index].status === 'rejected' ? settled[index].reason : null; }
  function connectionCheck(name, index, service) {
    var value = result(index), error = failure(index);
    if (value && value.ok) return {name:name,status:'UP',label:'Operacional',detail:service === 'mcp' ? 'Handshake e listagem de ferramentas concluídos (' + (value.toolCount || 0) + ' ferramentas). Nenhuma ferramenta executada.' : 'API REST autenticada respondeu a uma consulta somente de leitura.'};
    var status = error && error.payload && error.payload.status || '';
    if (status === 'NOT_CONFIGURED' || status === 'NOT_CONNECTED' || status === 'REAUTH_REQUIRED' || status === 'UNAUTHENTICATED' || (error && error.code === 412)) return {name:name,status:'NOT_CONFIGURED',label:'Configuração pendente',detail:(error && error.message) || 'Conexão ainda não configurada.'};
    return {name:name,status:'ERROR',label:'Falha',detail:(error && error.message) || (value && value.error) || 'O serviço não confirmou a conexão.'};
  }
  var checks = [
    connectionCheck('n8n · API REST',0,'rest'),
    connectionCheck('n8n · Servidor MCP',1,'mcp')
  ];
  var apiData = result(2), marketplaceData = result(3);
  if (apiData) {
    var apiItems = apiData.items || [];
    var testable = ['OPENAI','GEMINI','ANTHROPIC'];
    for (var i=0;i<testable.length;i++) {
      var provider = testable[i];
      var saved = apiItems.find(function(item){return String(item.provider||'').toUpperCase()===provider;});
      if (!saved) {
        checks.push({name:provider==='OPENAI'?'OpenAI API':provider==='GEMINI'?'Google Gemini API':'Anthropic Claude API',status:'NOT_CONFIGURED',label:'Não configurada',detail:'Nenhuma credencial cadastrada para este provedor.'});
        continue;
      }
      try {
        var tested = await healthRequest('/api/integrations/apis','POST',{action:'test',provider:provider});
        checks.push({name:saved.label || (provider==='OPENAI'?'OpenAI API':provider==='GEMINI'?'Google Gemini API':'Anthropic Claude API'),status:'UP',label:'Operacional',detail:'Endpoint oficial respondeu com sucesso em teste somente de leitura.'});
      } catch (e) {
        checks.push({name:saved.label || provider,status:'ERROR',label:'Falha',detail:e.message || 'O provedor não aceitou a consulta de validação.'});
      }
    }
  } else {
    checks.push({name:'Inventário de APIs de IA',status:'ERROR',label:'Falha',detail:(failure(2) && failure(2).message) || 'Não foi possível ler o estado das credenciais.',healthEligible:false});
  }
  var inventory = [
    {name:'Inventário de integrações comerciais',status:marketplaceData?'UP':'ERROR',label:marketplaceData?'Disponível':'Falha',detail:marketplaceData?'O Radar conseguiu consultar os estados cadastrados.':'Não foi possível carregar os estados comerciais.',healthEligible:false}
  ];
  checks = checks.concat(inventory);
  var checked = checks.filter(function(item){return item.healthEligible!==false&&(item.status==='UP'||item.status==='ERROR');});
  var errors = checked.filter(function(item){return item.status==='ERROR';}).length;
  var notConfigured = checks.filter(function(item){return item.status==='NOT_CONFIGURED';}).length;
  var marketplaces = (marketplaceData && marketplaceData.items || []).filter(function(item){
    return item.status !== 'NOT_CONFIGURED' || (item.credentialFields || []).length || item.lastError;
  }).map(function(item){
    var state='NOT_TESTED',label='Ainda não testada',detail='Há configuração cadastrada, mas o endpoint comercial não foi testado por esta verificação.';
    if(item.status==='ERROR'||item.apiStatus==='ERROR'){state='ERROR';label='Falha registrada';detail=item.lastError || 'A conexão registrada apresenta erro.';}
    else if(item.status==='VALIDATED'||item.status==='READ_ONLY_VALIDATED'){state='UP';label='Validada anteriormente';detail='Última validação registrada: '+(item.lastCheckedAt || 'data não informada')+'.';}
    else if(item.status==='CONNECTED'){state='NOT_TESTED';label='Conectada · API não confirmada';detail='Conta conectada, mas a API comercial não foi testada agora.';}
    else if(item.status==='NOT_CONFIGURED'){state='NOT_CONFIGURED';label='Não configurada';detail='Nenhuma credencial reconhecida para esta integração.';}
    else if(item.status==='PENDING_VALIDATION'||item.status==='MANUAL_REVIEW'){state='NOT_TESTED';label='Pendente de teste';detail='Credenciais cadastradas; teste oficial ainda pendente.';}
    else {state='NOT_TESTED';label='Não testada';detail='Não há teste automático disponível para este fluxo.';}
    return {name:item.name || item.id, state:state,label:label,detail:detail};
  });
  apiHealthSnapshot = {
    loading:false,
    checks:checks,
    marketplaces:marketplaces,
    checked:checked.length,
    errors:errors,
    notConfigured:notConfigured,
    percent:checked.length ? Math.round((checked.length-errors)*100/checked.length) : null,
    checkedAt:new Date().toLocaleString('pt-BR'),
    autoHealth:result(4)
  };
  var current = document.getElementById('api-health-card');
  if (current) current.outerHTML = apiHealthPanel(apiHealthSnapshot);
}

var originalIntegrations=integrations;
integrations=function(){
  var readiness=D.readiness;
  var panel=readiness?'<div class="card csp-margin-bottom-16px" ><h2>Prontidão da operação</h2><p>Configuração: '+readiness.operationalPercent+'%. '+(readiness.productionReady?'Entrega recente confirmada.':'Há etapas pendentes antes de ativar a operação.')+'</p>'+readiness.core.filter(function(item){return !item.ready;}).map(function(item){return '<p><strong>'+esc(item.label)+':</strong> '+esc(item.action)+'</p>';}).join('')+'</div>':'';
  return panel+apiHealthPanel()+originalIntegrations()+
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
  if(provider==='MERCADO_LIVRE'||provider==='MERCADOLIVRE'){connectMercadoLivre();return;}
  // These portals do not currently have a verified affiliate-offer integration in this app.
  // Do not accept arbitrary credentials or imply that seller/business APIs are affiliate APIs.
  if(['CASAS_BAHIA','HOTMART','KABUM','AMERICANAS'].indexOf(provider)!==-1){
    var explanations={
      CASAS_BAHIA:'O portal público localizado é para integração de lojistas do marketplace (catálogo, estoque, preço e pedidos), não uma API de descoberta de ofertas para afiliados. Não cadastre credenciais aqui para esse objetivo.',
      HOTMART:'A API Hotmart é voltada à integração de produtos digitais, vendas e dados da conta. Ainda não foi confirmado um endpoint oficial de catálogo de ofertas afiliadas adequado ao Radar. Não cadastre chaves genéricas aqui.',
      KABUM:'A documentação pública localizada é para integração de sellers via Mirakl, com API Key e operações de catálogo/pedidos. Isso não comprova uma API de afiliados para descobrir ofertas. Não cadastre essa chave neste fluxo.',
      AMERICANAS:'Não foi confirmada nesta auditoria uma API pública oficial de afiliados para descoberta de produtos, geração de deeplinks e consulta de comissões. Não informe credenciais até identificarmos a rede oficial da sua conta.',
      LOMADEE:'A API oficial Lomadee oferece produtos, marcas, campanhas, canais, pedidos e encurtamento de links rastreáveis. Use uma chave de afiliado com os escopos necessários; não informe senha de login.'
    };
    openModal('Integração não validada · '+provider.replace('_',' '),'A configuração genérica foi desativada para evitar pedir campos não documentados. '+explanations[provider],'<div class="callout">'+explanations[provider]+'</div><p class="muted">Estado: não implementada/validada para descoberta de ofertas de afiliados. Nenhuma credencial foi alterada.</p>',async function(){throw Error('Este fluxo ainda não aceita credenciais. Nenhuma credencial foi salva ou alterada.');});
    var unavailableSubmit=document.querySelector('#form button[type="submit"]');if(unavailableSubmit){unavailableSubmit.disabled=true;unavailableSubmit.textContent='Não disponível';}
    return;
  }
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
    if(provider==='LOMADEE') body=field('API Key de afiliado (x-api-key)','apiKey','password','autocomplete="new-password" maxlength="4096" required')+'<div class="callout">Gere uma chave do tipo affiliate no painel de desenvolvedores Lomadee. Autorize products:read, campaigns:read, brands:read, channels:read, orders:read e shortener:write. O teste inicial consulta apenas produtos. Campanhas, canais, pedidos e geração de links precisam de testes separados; a aprovação comercial depende da Lomadee. Nenhuma oferta é publicada automaticamente.</div>';
    if(provider==='ALIEXPRESS') body=field('App Key (App ID)','appId','text','autocomplete="off" maxlength="200" required')+field('App Secret','apiSecret','password','autocomplete="new-password" maxlength="4096" required')+field('Tracking ID','trackingId','text','autocomplete="off" maxlength="200" required')+field('App Signature (se exigida pelo portal)','appSignature','password','autocomplete="new-password" maxlength="300"')+'<label class="csp-margin-top-10px"><input type="checkbox" name="legacyApiAcknowledged" value="true" required> Entendo que a documentação pública da Affiliate API está marcada como descontinuada; salvar credenciais não confirma que a API esteja aprovada ou disponível.</label><label class="csp-margin-top-10px"><input type="checkbox" name="accessApproved" value="true"> Já confirmei no portal que o acesso à Affiliate API está aprovado/ativo e autorizo uma consulta de leitura agora.</label><div class="callout">As credenciais serão criptografadas no servidor. Se o acesso ainda estiver em análise, elas serão salvas como pendentes e o teste não será executado. Quando aprovado, marque a segunda opção para testar. Nenhum link será criado e nenhuma oferta será publicada.</div>';
    if(provider==='AWIN') body=field('Token Bearer da API Awin','accessToken','password','autocomplete="new-password" maxlength="4096" required')+field('Publisher ID numérico','affiliateId','text','inputmode="numeric" pattern="[0-9]{1,20}" maxlength="20" required')+'<div class="callout">Gere o token na interface oficial Awin. Não use senha de login nem chave de feed de produto neste campo. O teste consulta os programas joined em modo somente leitura. A consulta de feed exige o ID de anunciante e um locale autorizado. Nenhuma oferta será publicada.</div>';
    if(provider==='RAKUTEN') body=field('Client ID da aplicação Rakuten','clientId','text','autocomplete="off" maxlength="500" required')+field('Client Secret da aplicação Rakuten','clientSecret','password','autocomplete="new-password" maxlength="4096" required')+field('Account ID da conta Publisher','accountId','text','autocomplete="off" maxlength="100" required')+'<div class="callout">A API oficial emite o token em /token usando Client ID, Client Secret e Account ID. O Radar armazena access/refresh tokens criptografados e renova o acesso antes de expirar. Se sua conta só recebeu um Bearer temporário, solicite no Developer Portal a aplicação e as credenciais necessárias para renovação. O teste consulta anunciantes em modo somente leitura; busca de produtos e deeplinks dependem das permissões e parcerias. Nenhuma oferta será publicada.</div>';
    if(provider==='ADMITAD') body=field('Client ID da aplicação Admitad','clientId','text','autocomplete="off" maxlength="300" required')+field('Client Secret da aplicação Admitad','clientSecret','password','autocomplete="new-password" maxlength="4096" required')+field('Website ID (ID da sua plataforma/site)','affiliateId','text','inputmode="numeric" pattern="[0-9]{1,20}" maxlength="20" required')+'<div class="callout">O Radar solicita o token OAuth oficial e renova-o usando o refresh token criptografado. A aplicação precisa ter os escopos advcampaigns, advcampaigns_for_website, deeplink_generator e websites. O teste consulta campanhas da plataforma; gerar deeplink cria apenas uma URL rastreável, sem publicar ofertas.</div>';
    if(provider==='SHOPEE') body=field('App ID da Open API Shopee','appId','text','autocomplete="off" maxlength="200" required')+field('App Secret da Open API Shopee','apiSecret','password','autocomplete="new-password" maxlength="4096" required')+'<div class="callout">Use somente App ID e App Secret emitidos para a Open API de Afiliados Shopee. Se ainda não tiver acesso, solicite a habilitação pelo portal oficial. A validação inicial fará uma consulta de ofertas somente leitura; nenhum link será criado e nenhuma oferta será publicada.</div>';
    if(provider==='AMAZON') body=field('Credential ID (Creators API)','clientId','text','autocomplete="off" maxlength="500" required')+field('Credential Secret (Creators API)','clientSecret','password','autocomplete="new-password" maxlength="4096" required')+field('Partner Tag / ID de Associado','affiliateId','text','autocomplete="off" maxlength="200" required')+'<label for="amazonVersion">Versão da credencial emitida pela Amazon</label><select id="amazonVersion" name="version" required><option value="3.1" selected>3.1 · América do Norte / Brasil</option><option value="3.2">3.2 · Europa</option><option value="3.3">3.3 · Extremo Oriente</option></select><label for="amazonMarketplace">Marketplace</label><select id="amazonMarketplace" name="marketplace" required><option value="www.amazon.com.br" selected>Amazon Brasil (www.amazon.com.br)</option><option value="www.amazon.com">Amazon EUA (www.amazon.com)</option><option value="www.amazon.co.uk">Amazon Reino Unido (www.amazon.co.uk)</option><option value="www.amazon.de">Amazon Alemanha (www.amazon.de)</option><option value="www.amazon.co.jp">Amazon Japão (www.amazon.co.jp)</option></select><div class="callout">Use credenciais próprias da Creators API, não as antigas chaves PA-API nem a senha da conta. A conta precisa estar aprovada no programa de Associados e habilitada para a API. O teste realiza uma busca de leitura e não publica ofertas.</div>';
    openModal('Preparar conexão · '+item.name,provider==='LOMADEE'?'Gere uma API Key do tipo affiliate no portal de desenvolvedores Lomadee. Autorize products:read, campaigns:read, channels:read e shortener:write; copie somente a chave, nunca a senha de login.':provider==='SHOPEE'?'Use as credenciais da Open API de Afiliados, não sua senha da conta Shopee. O botão de teste valida a autenticação com uma consulta somente leitura.':provider==='AMAZON'?'Abra Creators API em Associados Amazon e use Credential ID, Credential Secret, versão atribuída e Partner Tag. Não use as chaves antigas PA-API nem a senha de login.':'Abra o portal oficial, copie apenas as credenciais de API emitidas para sua conta e preencha os campos aplicáveis. Não informe senha de login, cookies ou códigos de recuperação.',body,async function(event){
      event.preventDefault();
      var formData=new FormData(event.target),credentials={};
      ['affiliateId','appId','clientId','clientSecret','accountId','apiKey','apiKeySecret','apiKeyId','apiSecret','accessToken','trackingId','version','marketplace','appSignature','legacyApiAcknowledged','extra'].forEach(function(key){var value=String(formData.get(key)||'').trim();if(value)credentials[key]=value;});
      var accessApproved=String(formData.get('accessApproved')||'')==='true';
      var result=await operationRequest('/api/integrations/marketplaces',{marketplace:provider,credentials:credentials});
      closeModal();
      if(provider==='ALIEXPRESS'&&!accessApproved){await loadMarketplaceStatus();toast('Credenciais salvas com segurança como pendentes. Nenhum teste foi executado porque a aprovação da API ainda não foi confirmada.');return;}
      var testRoutes={AMAZON:{path:'/api/integrations/amazon',body:{action:'test'}},SHOPEE:{path:'/api/integrations/shopee',body:{action:'test'}},ALIEXPRESS:{path:'/api/integrations/aliexpress',body:{action:'test'}},AWIN:{path:'/api/integrations/awin',body:{action:'test'}},RAKUTEN:{path:'/api/integrations/rakuten',body:{action:'test'}},ADMITAD:{path:'/api/integrations/admitad',body:{action:'test'}},LOMADEE:{path:'/api/integrations/lomadee',body:{action:'validate'}}};
      var testRoute=testRoutes[provider];
      if(testRoute){try{var testResult=await operationRequest(testRoute.path,testRoute.body);await loadMarketplaceStatus();toast(testResult.status==='VALIDATED'?'Credenciais e escopos validados pela API oficial.':testResult.status==='READ_ONLY_VALIDATED'?'Leitura de produtos validada; geração de links e aprovação comercial exigem testes separados.':testResult.ok?'Consulta oficial respondeu; confira os escopos ainda pendentes.':'Teste concluído; confira o estado da integração.');}catch(testError){await loadMarketplaceStatus();toast('Credenciais salvas, mas a validação falhou: '+(testError.message||'verifique credenciais, escopos e acesso ao programa.'));}}
      else{await loadMarketplaceStatus();toast(result.message||'Credenciais salvas. Este provedor ainda exige confirmação manual ou outro fluxo oficial; não foi marcado como conectado.');}
    });
  }catch(error){toast(error.message||'Não foi possível abrir o cadastro de credenciais.');}
}
// Expose the marketplace setup handler to the delegated data-action dispatcher.
window.openMarketplaceSetup = openMarketplaceSetup;
async function connectOrTestAliExpress(){
  try{
    var data=await operationRequest('/api/integrations/marketplaces');
    var item=(data.items||[]).find(function(x){return x.id==='ALIEXPRESS';});
    if(!item||!item.credentialFields||item.credentialFields.indexOf('appId')===-1||item.credentialFields.indexOf('apiSecret')===-1||item.credentialFields.indexOf('trackingId')===-1){
      openMarketplaceSetup('ALIEXPRESS');
      return;
    }
    if(!confirm('Executar agora uma consulta de leitura para validar a API Affiliate do AliExpress? Só prossiga se o portal confirmou que o acesso à API está aprovado/ativo. Nenhuma oferta será publicada.'))return;
    var result=await operationRequest('/api/integrations/aliexpress',{action:'test'});
    await load();
    await loadMarketplaceStatus();
    toast(result.status==='VALIDATED'?'AliExpress validado por consulta oficial de leitura. Nenhuma oferta foi publicada.':'A API respondeu, mas a validação ainda não foi confirmada.');
  }catch(error){
    try{await load();await loadMarketplaceStatus();}catch(_){}
    toast('Não foi possível validar o AliExpress: '+(error.message||'confira o acesso à API e o estado das credenciais.'));
  }
}
window.connectOrTestAliExpress = connectOrTestAliExpress;
async function auditAliExpress(){
  if(!confirm('Executar até oito chamadas reais somente de leitura para auditar as permissões da API AliExpress? Pode consumir cota de API. Nenhuma oferta será publicada.'))return;
  try{
    var result=await operationRequest('/api/integrations/aliexpress',{action:'audit'});
    var rows=(result.checks||[]).map(function(x){
      var state=x.status==='OK'?'OK':x.status==='SKIPPED'?'Ignorado':'Falhou';
      return '<li><b>'+esc(x.action)+'</b> — '+esc(state)+(x.api?' · <code>'+esc(x.api)+'</code>':'')+(x.returnedCount!==undefined?' · itens: '+esc(x.returnedCount):'')+(x.permissionDenied?' · permissão ausente provável':'')+(x.error?' · '+esc(x.error):'')+(x.reason?' · '+esc(x.reason):'')+'</li>';
    }).join('');
    openModal('Auditoria da API AliExpress', 'Resultado das chamadas reais somente de leitura. Um método implementado não significa que a permissão foi concedida.', '<div class="callout"><b>Verificadas:</b> '+esc(result.summary?.checked||0)+'<br><b>Falhas:</b> '+esc(result.summary?.failed||0)+'<br><b>Ignoradas:</b> '+esc(result.summary?.skipped||0)+'<br><b>Auditoria completa:</b> '+(result.complete?'sim':'não')+'</div><ul>'+rows+'</ul><p class="muted">Nenhuma oferta foi aprovada, importada ou publicada por esta auditoria.</p>',function(e){e.preventDefault();closeModal();});
  }catch(error){toast('Falha na auditoria AliExpress: '+(error.message||'verifique credenciais e permissões.'));}
}
window.auditAliExpress=auditAliExpress;
async function generateAliExpressLinksBatch(){
  var raw=window.prompt('Cole de 1 a 10 URLs de produtos AliExpress, uma por linha. Serão gerados links individualmente; nenhuma oferta será publicada.','');
  if(raw===null)return;
  var urls=raw.split(/\r?\n/).map(function(x){return x.trim();}).filter(Boolean).slice(0,10);
  if(!urls.length){toast('Informe ao menos uma URL.');return;}
  try{
    var result=await operationRequest('/api/integrations/aliexpress',{action:'generateLinksBatch',productUrls:urls});
    var rows=(result.results||[]).map(function(x){return '<li><b>'+esc(x.status==='OK'?'Gerado':'Falhou')+'</b> — '+esc(x.productUrl||urls[x.index]||'URL')+(x.affiliateUrl?'<br><input readonly value="'+esc(x.affiliateUrl)+'" aria-label="Link de afiliado gerado">':'')+(x.error?'<br>'+esc(x.error):'')+'</li>';}).join('');
    openModal('Links AliExpress em lote','Cada URL foi processada individualmente. Confira os links antes de usar.', '<div class="callout"><b>Gerados:</b> '+esc(result.created||0)+'<br><b>Falhas:</b> '+esc(result.failed||0)+'<br><b>Publicação:</b> desativada</div><ol>'+rows+'</ol>',function(e){e.preventDefault();closeModal();});
  }catch(error){toast('Falha ao gerar links AliExpress: '+(error.message||'verifique credenciais e permissões.'));}
}
window.generateAliExpressLinksBatch=generateAliExpressLinksBatch;
async function testLomadeeConnection(){
  try{
    var result=await operationRequest('/api/integrations/lomadee',{action:'validate'});
    await loadMarketplaceStatus();
    toast(result.status==='VALIDATED'?'Lomadee autenticada. Consultas de leitura habilitadas.':'Validação da Lomadee concluída.');
  }catch(error){await loadMarketplaceStatus();toast(error.message||'Não foi possível validar a chave Lomadee.');}
}
async function importLomadeeProducts(){
  try{
    var result=await operationRequest('/api/integrations/lomadee',{action:'import_products',limit:5});
    await load();await loadMarketplaceStatus();
    openModal('Importação Lomadee concluída','Os produtos com preço oficial e link rastreável foram importados como rascunhos para revisão. Nenhuma oferta foi publicada e o piloto automático não foi disparado.','<div class="callout"><b>Rascunhos criados:</b> '+esc(result.imported||0)+'<br><b>Ignorados:</b> '+esc(result.skipped||0)+'<br><b>Publicação automática:</b> desativada nesta importação</div>'+(result.items&&result.items.length?'<ul>'+result.items.map(function(x){return '<li>'+esc(x.title)+' · '+esc(x.discount)+'% OFF · preço oficial verificado · revisão pendente</li>';}).join('')+'</ul>':'<p>Nenhum produto com desconto verificável e link rastreável foi importado nesta consulta.</p>'),function(e){e.preventDefault();closeModal();});
  }catch(error){toast(error.message||'Não foi possível importar ofertas da Lomadee.');}
}
var lomadeeProductFilters={};
async function searchLomadeeProducts(){
  var search=window.prompt('Nome ou descrição do produto (opcional):','');
  if(search===null)return;
  var price=window.prompt('Faixa de preço em centavos, formato mínimo:máximo (opcional; ex. 5000:10000):','');
  if(price===null)return;
  var organizationIds=window.prompt('UUIDs das marcas separados por vírgula (opcional):','');
  if(organizationIds===null)return;
  lomadeeProductFilters={};
  if(String(search).trim())lomadeeProductFilters.search=String(search).trim();
  if(String(price).trim())lomadeeProductFilters.price=String(price).trim();
  if(String(organizationIds).trim())lomadeeProductFilters.organizationIds=String(organizationIds).trim();
  return loadLomadeeProducts(1);
}
async function loadLomadeeProducts(page){
  return loadLomadeeResource('products',Object.assign({page:Math.max(1,Math.floor(Number(page)||1)),limit:20},lomadeeProductFilters));
}
async function shortenLomadeeUrl(){
  var organizationId=window.prompt('UUID da marca (organizationId) no portal Lomadee:','');
  if(organizationId===null)return;
  var type=window.prompt('Tipo do link: Coupon, Offer, BrandPage, Custom ou Home','BrandPage');
  if(type===null)return;
  type=String(type).trim();
  var payload={action:'shorten_url',organizationId:String(organizationId).trim(),type:type};
  if(type==='Coupon'||type==='Offer'){
    var featureId=window.prompt('ID da operação da campanha (featureId):','');
    if(featureId===null)return;
    payload.featureId=String(featureId).trim();
  }
  if(type==='Custom'){
    var url=window.prompt('URL HTTPS que deseja encurtar:','https://');
    if(url===null)return;
    payload.url=String(url).trim();
  }
  var mdasc=window.prompt('Identificador de rastreamento mdasc (opcional):','');
  if(mdasc===null)return;
  if(String(mdasc).trim())payload.mdasc=String(mdasc).trim();
  if(!window.confirm('Confirmar criação de link(s) rastreável(is) na conta Lomadee? Nenhuma oferta será publicada por esta ação.'))return;
  var panel=document.getElementById('lomadeeDataPanel');if(!panel)return;
  panel.innerHTML='<div class="empty">Solicitando geração do link à Lomadee...</div>';
  try{
    var result=await operationRequest('/api/integrations/lomadee',payload);
    var rows=result.channels||[];
    panel.innerHTML='<h3>Resultado da geração de link</h3><p class="muted">Links gerados: '+Number(result.generatedCount||0)+' · Nenhuma oferta publicada.</p>'+
      (rows.length?rows.map(function(row){return '<div class="integration"><div class="grow"><b>'+esc(row.name||row.availableChannel&&row.availableChannel.name||row.id||'Canal')+'</b>'+(row.message?'<p>'+esc(row.message)+'</p>':'')+(row.shortUrls||[]).map(function(link){return '<p><a href="'+esc(link)+'" target="_blank" rel="noopener noreferrer">'+esc(link)+'</a></p>';}).join('')+'</div></div>';}).join(''):'<div class="empty">A Lomadee não retornou canais ou links para esta solicitação.</div>')+
      '<button class="btn secondary" type="button" data-action="loadLomadeeShortUrls(1)">Ver links encurtados</button>';
  }catch(error){panel.innerHTML='<div class="empty" role="alert">'+esc(error.message||'Não foi possível gerar o link.')+'</div>';}
}
async function loadLomadeeContents(){return loadLomadeeResource('products');}
async function loadLomadeeCommissions(){return loadLomadeeResource('campaigns');}
async function loadLomadeeOrders(){return loadLomadeeResource('orders');}
async function loadLomadeeChannels(){return loadLomadeeResource('channels');}
async function loadLomadeeOffers(){
  return loadLomadeeResource('campaigns',{types:'Offer',status:'onTime,scheduled',limit:10});
}
async function loadLomadeeCampaign(campaignId){
  var panel=document.getElementById('lomadeeDataPanel');if(!panel)return;
  panel.innerHTML='<div class="empty">Consultando campanha da Lomadee...</div>';
  try{
    var result=await operationRequest('/api/integrations/lomadee?resource=campaigns&campaignId='+encodeURIComponent(campaignId));
    var item=(result.items||[])[0];if(!item)throw Error('A API não retornou essa campanha.');
    var details=[item.type,item.offerType,item.status,item.startAt?'Início: '+item.startAt:'',item.endAt?'Fim: '+item.endAt:'',item.organizationId?'Marca: '+item.organizationId:'',item.categories&&item.categories.length?'Categorias: '+item.categories.join(', '):'',item.code?'Cupom: '+item.code:''].filter(Boolean).join(' · ');
    panel.innerHTML='<h3>Detalhes da campanha</h3><div class="integration"><div class="grow"><b>'+esc(item.title||item.id)+'</b><div class="muted">'+esc(details)+'</div><p>'+esc(item.description||'Sem descrição fornecida pela API.')+'</p>'+(item.url?'<a href="'+esc(item.url)+'" target="_blank" rel="noopener noreferrer">Abrir oferta oficial ↗</a>':'')+'</div></div>';
  }catch(error){panel.innerHTML='<div class="empty" role="alert">'+esc(error.message||'Consulta indisponível.')+'</div>';}
}
var lomadeeShortUrlSearch='';
async function searchLomadeeShortUrls(){
  var value=window.prompt('Pesquisar em URL original ou URL curta (deixe vazio para listar tudo):',lomadeeShortUrlSearch);
  if(value===null)return;
  lomadeeShortUrlSearch=String(value).trim();
  return loadLomadeeShortUrls(1);
}
async function loadLomadeeShortUrls(page){
  var panel=document.getElementById('lomadeeDataPanel');if(!panel)return;
  page=Math.max(1,Math.floor(Number(page)||1));
  panel.innerHTML='<div class="empty">Consultando links encurtados da Lomadee...</div>';
  try{
    var query=new URLSearchParams({resource:'shortener',page:String(page),limit:'20',active:'true'});
    if(lomadeeShortUrlSearch)query.set('search',lomadeeShortUrlSearch);
    var result=await operationRequest('/api/integrations/lomadee?'+query.toString());
    var rows=result.items||[];
    panel.innerHTML='<h3>Links encurtados</h3><p class="muted">Consulta somente leitura · '+Number(result.total||rows.length)+' link(s) no total · página '+Number(result.page||page)+' de '+Number(result.totalPages||1)+'.</p><div class="actions"><button class="btn secondary" type="button" data-action="searchLomadeeShortUrls()">Pesquisar links</button><button class="btn secondary" type="button" data-action="loadLomadeeShortUrls(1)">Voltar ao início</button></div>'+
      (rows.length?rows.map(function(item){
        var details=[item.linkType||'Tipo não informado',item.active===true?'Ativo':item.active===false?'Inativo':'Status não informado','Cliques: '+(item.count===null?'—':item.count),item.organizationId?'Marca: '+item.organizationId:''].filter(Boolean).join(' · ');
        return '<div class="integration"><div class="grow"><b>'+esc(item.shortUrl||item.urlCode||'URL encurtada')+'</b><div class="muted">'+esc(details)+'</div>'+(item.originalUrl?'<div class="muted">Original: <a href="'+esc(item.originalUrl)+'" target="_blank" rel="noopener noreferrer">'+esc(item.originalUrl)+'</a></div>':'')+(item.shortUrl?'<div><a href="'+esc(item.shortUrl)+'" target="_blank" rel="noopener noreferrer">Abrir link curto ↗</a></div>':'')+'<button class="btn secondary" type="button" data-action="loadLomadeeShortUrl(\''+esc(item.urlCode)+'\')">Ver detalhes</button></div></div>';
      }).join(''):'<div class="empty">Nenhum link encontrado com este filtro.</div>')+
      '<div class="actions">'+(page>1?'<button class="btn secondary" type="button" data-action="loadLomadeeShortUrls('+(page-1)+')">Página anterior</button>':'')+(Number(result.totalPages||1)>page?'<button class="btn secondary" type="button" data-action="loadLomadeeShortUrls('+(page+1)+')">Próxima página</button>':'')+'</div>';
  }catch(error){panel.innerHTML='<div class="empty" role="alert">'+esc(error.message||'Consulta indisponível.')+'</div>';}
}
async function loadLomadeeShortUrl(urlCode){
  var panel=document.getElementById('lomadeeDataPanel');if(!panel)return;
  panel.innerHTML='<div class="empty">Consultando detalhes do link encurtado...</div>';
  try{
    var result=await operationRequest('/api/integrations/lomadee?resource=shortener&urlCode='+encodeURIComponent(urlCode));
    var item=(result.items||[])[0];if(!item)throw Error('A API não retornou esse link encurtado.');
    var details=['Código: '+item.urlCode,item.linkType?'Tipo: '+item.linkType:'',item.active===true?'Ativo':item.active===false?'Inativo':'Status não informado','Cliques: '+(item.count===null?'—':item.count),item.organizationId?'Marca: '+item.organizationId:''].filter(Boolean).join(' · ');
    panel.innerHTML='<h3>Detalhes do link encurtado</h3><div class="integration"><div class="grow"><b>'+esc(item.shortUrl||item.urlCode)+'</b><div class="muted">'+esc(details)+'</div>'+(item.originalUrl?'<p>URL original: <a href="'+esc(item.originalUrl)+'" target="_blank" rel="noopener noreferrer">'+esc(item.originalUrl)+'</a></p>':'')+(item.shortUrl?'<p><a href="'+esc(item.shortUrl)+'" target="_blank" rel="noopener noreferrer">Abrir link curto ↗</a></p>':'')+'<button class="btn secondary" type="button" data-action="loadLomadeeShortUrls(1)">Voltar à lista</button></div></div>';
  }catch(error){panel.innerHTML='<div class="empty" role="alert">'+esc(error.message||'Consulta indisponível.')+'</div>';}
}
async function loadLomadeeChannel(channelId){
  var panel=document.getElementById('lomadeeDataPanel');if(!panel)return;
  panel.innerHTML='<div class="empty">Consultando canal da Lomadee...</div>';
  try{
    var result=await operationRequest('/api/integrations/lomadee?resource=channels&channelId='+encodeURIComponent(channelId));
    var item=(result.items||[])[0];if(!item)throw Error('A API não retornou esse canal.');
    panel.innerHTML='<h3>Detalhes do canal</h3><div class="integration"><div class="grow"><b>'+esc(item.name||item.id)+'</b><div class="muted">ID: '+esc(item.id)+' · '+(item.active===true?'Ativo':item.active===false?'Inativo':'Status não informado')+' · Criado em '+esc(item.createdAt||'não informado')+'</div></div></div>';
  }catch(error){panel.innerHTML='<div class="empty" role="alert">'+esc(error.message||'Consulta indisponível.')+'</div>';}
}
async function loadLomadeeResource(resource,filters){
  var panel=document.getElementById('lomadeeDataPanel');if(!panel)return;
  panel.innerHTML='<div class="empty">Consultando dados da Lomadee...</div>';
  try{
    var query=new URLSearchParams(Object.assign({resource:resource,limit:10},filters||{}));
    var result=await operationRequest('/api/integrations/lomadee?'+query.toString());
    var labels={products:'Produtos afiliados',campaigns:'Campanhas ativas',brands:'Marcas disponíveis',channels:'Canais de afiliado',orders:'Pedidos e comissões'};
    var rows=result.items||[];
    panel.innerHTML='<h3>'+esc(labels[resource]||'Dados Lomadee')+'</h3><p class="muted">Consulta somente leitura · '+rows.length+' registro(s) retornado(s). Dados pessoais de clientes são omitidos.</p>'+(resource==='products'?'<div class="actions"><button class="btn secondary" type="button" data-action="searchLomadeeProducts()">Alterar filtros de produtos</button><span class="muted">Página '+Number(result.page||1)+' de '+Number(result.totalPages||1)+' · total '+Number(result.total||result.count||rows.length)+'</span>'+(Number(result.page||1)>1?'<button class="btn secondary" type="button" data-action="loadLomadeeProducts('+(Number(result.page||1)-1)+')">Página anterior</button>':'')+(Number(result.page||1)<Number(result.totalPages||1)?'<button class="btn secondary" type="button" data-action="loadLomadeeProducts('+(Number(result.page||1)+1)+')">Próxima página</button>':'')+'</div>':'')+
      (rows.length?rows.map(function(item){
        var heading=item.title||item.name||item.id||'Registro';
        var details=resource==='products'?[item.seller,item.currentPrice===null?'':'R$ '+(item.currentPrice/100).toFixed(2),item.available?'Disponível':'Indisponível'].filter(Boolean).join(' · '):
          resource==='campaigns'?[item.type,item.status,item.offerType,item.startAt,item.endAt].filter(Boolean).join(' · '):
          resource==='brands'?[item.status].filter(Boolean).join(' · '):resource==='orders'?['Pedido '+(item.orderId||item.id),item.status?'Status: '+item.status:'',item.value===null?'':'Venda R$ '+Number(item.value).toFixed(2),item.commission===null?'':'Comissão R$ '+Number(item.commission).toFixed(2),item.commissionStatus?'Comissão: '+item.commissionStatus:'',item.createdAt].filter(Boolean).join(' · '):resource==='channels'?['ID: '+item.id,item.active===true?'Ativo':item.active===false?'Inativo':'Status não informado',item.createdAt?'Criado em '+item.createdAt:''].filter(Boolean).join(' · '):[item.type].filter(Boolean).join(' · ');
        return '<div class="integration"><div class="grow"><b>'+esc(heading)+'</b><div class="muted">'+esc(details)+'</div>'+(resource==='channels'?'<button class="btn secondary" type="button" data-action="loadLomadeeChannel(\''+esc(item.id)+'\')">Ver detalhes</button> ':'')+(resource==='campaigns'?'<button class="btn secondary" type="button" data-action="loadLomadeeCampaign(\''+esc(item.id)+'\')">Ver detalhes</button> ':'')+(item.url?'<a href="'+esc(item.url)+'" target="_blank" rel="noopener noreferrer">Abrir conteúdo oficial ↗</a>':'')+'</div></div>';
      }).join(''):'<div class="empty">A API não retornou registros para esta consulta.</div>');
  }catch(error){panel.innerHTML='<div class="empty" role="alert">'+esc(error.message||'Consulta indisponível.')+'</div>';}
}
async function connectMagaluAccount(){
  try{var result=await operationRequest('/api/integrations/magalu-connect');if(!result.authorizationUrl)throw Error('A Magalu não retornou a URL de autorização.');window.location.href=result.authorizationUrl;}
  catch(error){
    var message=error.message||'Não foi possível iniciar a conexão Magalu.';
    openModal('Conectar Magalu · etapa 1 de 3','O cadastro das chaves API não conecta a conta. Siga esta sequência antes de testar a API.', '<div class="callout"><b>1. Credenciais OAuth do aplicativo</b><p>Configure MAGALU_CLIENT_ID e MAGALU_CLIENT_SECRET nos segredos do projeto Hatchable. Não cole o Client Secret em mensagens nem no código.</p><p><b>2. URL de retorno autorizada</b><br>https://radar-promo-brasil.hatchable.site/api/integrations/magalu-callback</p><p><b>3. Autorizar e validar</b><br>Depois de salvar os segredos e registrar exatamente a URL de retorno no portal Magalu, volte aqui, clique em Conectar conta e autorize. Por fim, use Testar OAuth + API seller.</p><p><b>Diagnóstico retornado:</b> '+esc(message)+'</p><p><a href="https://developers.magalu.com/docs/first-steps/create-an-application/authentication-authorization/index.html" target="_blank" rel="noopener noreferrer">Abrir documentação oficial OAuth ↗</a></p></div>',function(e){e.preventDefault();closeModal();});
  }
}
async function testMagaluApi(){
  try{
    toast('Renovando OAuth e consultando a API oficial de SKUs em modo somente leitura...');
    var result=await operationRequest('/api/integrations/magalu-status',{action:'test'});
    await loadMarketplaceStatus();
    openModal('Diagnóstico Magalu','O teste não publica ofertas e não testa o programa de afiliados.', '<div class="callout"><b>Status: '+esc(result.status||'DESCONHECIDO')+'</b><p>Renovação OAuth: '+esc(result.oauthRefresh||'N/A')+'</p><p>Endpoint: '+esc(result.apiEndpoint||'N/A')+'</p><p>HTTP: '+esc(result.httpStatus||'N/A')+'</p><p>Registros consultados: '+esc(result.sampleCount??'N/A')+'</p><p>'+esc(result.note||'A consulta da API seller é separada do rastreamento de afiliados.')+'</p></div>',function(e){e.preventDefault();closeModal();});
    var submit=document.querySelector('#form button[type="submit"]');if(submit)submit.textContent='Fechar';
  }catch(error){
    await loadMarketplaceStatus();
    toast(error.message||'Teste Magalu falhou. Confira OAuth, escopos e autorização do seller.');
  }
}
async function openMagaluApiCredentials(){
  try{
    var data=await operationRequest('/api/integrations/marketplaces');
    var item=(data.items||[]).find(function(x){return x.id==='MAGALU';});
    var hasSavedKeys=!!(item&&item.credentialFields&&item.credentialFields.indexOf('apiKey')!==-1&&item.credentialFields.indexOf('apiKeyId')!==-1&&item.credentialFields.indexOf('apiKeySecret')!==-1);var body='<div class="callout"><b>'+ (hasSavedKeys?'As três chaves já estão cadastradas.':'Nenhum cadastro completo das três chaves foi confirmado nesta conta.') +'</b> '+(hasSavedKeys?'Elas permanecem salvas e criptografadas. Não é necessário cadastrá-las novamente para corrigir a tela de SubID. Só preencha e salve abaixo se quiser substituir as chaves.':'Cadastre somente se ainda não as salvou. O cadastro não comprova conexão com a API.')+'</div><p class="muted">Não substitua estas chaves por Client ID/Client Secret. A documentação pública atual do Grupo Magalu descreve OAuth 2.0 com Client ID/Client Secret; estas três chaves permanecem separadas até identificarmos o produto/portal que as emitiu. As credenciais já salvas não serão apagadas por esta correção.</p>'+field('Tenant ID da conta seller (X-Tenant-Id)','tenantId','text','autocomplete="off" maxlength="200" required placeholder="UUID/identificador do tenant autorizado"')+field('API Key (opcional; preserva a chave já salva se deixar vazio)','apiKey','text','autocomplete="off" maxlength="4096"')+field('API Key ID (opcional)','apiKeyId','text','autocomplete="off" maxlength="4096"')+field('API Key Secret (opcional)','apiKeySecret','password','autocomplete="new-password" maxlength="4096"')+'<div class="callout"><b>Tenant ID:</b> informe o identificador do tenant da conta/seller que autorizou a integração. O Radar armazenará esse dado criptografado por conta. As três API Keys são mantidas separadas do OAuth; deixe-as em branco para preservá-las. O teste renova o OAuth e faz uma consulta somente leitura de SKUs; nenhum produto será alterado ou publicado.</div>';
    openModal('Cadastrar chaves · Magalu','Use API Key, API Key ID e API Key Secret emitidas pelo portal Magalu. O cadastro das chaves, sozinho, não conecta a loja.',body,async function(event){
      event.preventDefault();var fd=new FormData(event.target),credentials={tenantId:String(fd.get('tenantId')||'').trim(),apiKey:String(fd.get('apiKey')||'').trim(),apiKeyId:String(fd.get('apiKeyId')||'').trim(),apiKeySecret:String(fd.get('apiKeySecret')||'').trim()};Object.keys(credentials).forEach(function(key){if(!credentials[key])delete credentials[key];});
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
async function connectN8nMcp(){
  try{
    var response=await fetch('/api/n8n/mcp-connect',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
    var data=await response.json();
    if(!response.ok||!data.authorizationUrl)throw Error(data.error||'Não foi possível iniciar a conexão OAuth do n8n.');
    window.location.href=data.authorizationUrl;
  }catch(error){toast(error.message||'Falha ao conectar o servidor MCP.');}
}
async function testN8nMcp(){
  try{
    var response=await fetch('/api/n8n/mcp-status',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
    var data=await response.json();
    if(!response.ok)throw Error(data.error||'O teste MCP falhou.');
    closeModal();
    openModal('Teste · n8n MCP','Consulta somente leitura. Nenhuma ferramenta remota foi executada.','<div class="callout"><b>Conexão: '+esc(data.status||'—')+'</b><p>Servidor: '+esc(data.server?.name||'n8n')+' · protocolo '+esc(data.protocolVersion||'—')+'</p><p>Ferramentas disponíveis: '+esc(data.toolCount||0)+'</p></div><pre style="white-space:pre-wrap;max-height:45vh;overflow:auto;word-break:break-word">'+esc(JSON.stringify(data.tools||[],null,2))+'</pre>',function(e){e.preventDefault();closeModal();});
    var submit=document.querySelector('#form button[type="submit"]');if(submit)submit.textContent='Fechar';
  }catch(error){toast(error.message||'Não foi possível testar o servidor MCP.');}
}
async function openSheinTools(){
  var body='<label for="sheinAction">Operação</label><select id="sheinAction" name="action" required><option value="validate_link">Validar um link (sem salvar)</option><option value="validate_batch">Importar mensagem e validar todos os links (sem salvar)</option><option value="create_draft">Criar rascunho de oferta pendente</option></select>'+'<label for="sheinBulkText">Mensagem promocional ou lista de links (opcional)</label><textarea id="sheinBulkText" name="bulkText" rows="4" maxlength="12000" placeholder="Cole aqui o texto copiado da SHEIN; o Radar extrairá os links encontrados."></textarea>'+
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
      if(action==='validate_batch'){
        var pasted=String(fd.get('bulkText')||'');
        var found=(pasted.match(/https?:\/\/[^\s<>"'\]]+/gi)||[]).map(function(url){return url.replace(/[),.;!?]+$/,'');});
        if(payload.affiliateUrl)found.push(payload.affiliateUrl);
        if(payload.productUrl)found.push(payload.productUrl);
        found=Array.from(new Set(found)).slice(0,30);
        if(!found.length)throw Error('Cole uma mensagem ou pelo menos um link HTTPS para validar.');
        var results=[];
        for(var i=0;i<found.length;i++){
          try{results.push({url:found[i],result:await operationRequest('/api/integrations/shein',{action:'validate_link',affiliateUrl:found[i]})});}
          catch(err){results.push({url:found[i],error:err.message||'Falha na validação'});}
        }
        closeModal();
        var rows=results.map(function(item){var r=item.result||{},a=r.affiliateLink||{};return '<div class="callout"><b>'+esc(a.valid?'Domínio reconhecido':'Não validado')+'</b><p style="word-break:break-all">'+esc(item.url)+'</p><p>'+esc(item.error||r.message||r.note||'A validação não confirma rastreamento ou comissão.')+'</p><small>Rastreamento: não verificado · Publicação: desativada</small></div>';}).join('');
        openModal('Importação SHEIN · resultado','Links extraídos da mensagem e conferidos individualmente. Nenhuma oferta foi criada ou publicada.',rows,function(e){e.preventDefault();closeModal();});
        var submitBatch=document.querySelector('#form button[type="submit"]');if(submitBatch)submitBatch.textContent='Fechar';
        return;
      }
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
      var sourceText=String(fd.get('bulkText')||'');
      if(sourceText){
        var sourceUrls=(sourceText.match(/https?:\/\/[^\s<>"'\]]+/gi)||[]).map(function(url){return url.replace(/[),.;!?]+$/,'');});
        if(!payload.affiliateUrl){var affiliateCandidate=sourceUrls.find(function(url){return /(^https:\/\/)?(www\.)?onelink\.shein\.com\//i.test(url);});if(affiliateCandidate)payload.affiliateUrl=affiliateCandidate;}
        if(!payload.productUrl){var productCandidate=sourceUrls.find(function(url){return /(^https:\/\/)?(www\.)?br\.shein\.com\//i.test(url);});if(productCandidate)payload.productUrl=productCandidate;}
        if(!payload.title){var titleLine=sourceText.split(/\r?\n/).map(function(line){return line.trim();}).find(function(line){return line&&!/^https?:\/\//i.test(line)&&!/descubra minhas escolhas|cupom|off para|novo usu|novo usu|desconto exclusivo/i.test(line)&&line.length>8;});if(titleLine)payload.title=titleLine.slice(0,220);}
        if(!payload.currentPrice){var priceMatch=sourceText.match(/(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/);if(priceMatch)payload.currentPrice=priceMatch[1].replace(/\./g,'').replace(',','.');}
        if(!payload.originalPrice){var originalMatch=sourceText.match(/(?:de|antes|preço original)\s*:?[\sR$]*([\d.]+,\d{2})/i);if(originalMatch)payload.originalPrice=originalMatch[1].replace(/\./g,'').replace(',','.');}
      }
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
async function openTemuTools(){
  var body='<label for="temuAction">Operação Temu</label><select id="temuAction" name="action" required><option value="validate_link">Validar link (sem salvar)</option><option value="create_draft">Criar rascunho pendente</option></select>'+
    field('Título do produto','title','text','maxlength="220" placeholder="Nome do produto"')+
    field('Link de afiliado gerado no portal oficial Temu','affiliateUrl','url','maxlength="2000" placeholder="https://www.temu.com/... ou https://temu.to/..."')+
    field('Link do produto (opcional)','productUrl','url','maxlength="2000" placeholder="https://www.temu.com/..."')+
    field('Preço atual em reais','currentPrice','number','min="0.01" step="0.01"')+
    field('Preço original em reais (opcional)','originalPrice','number','min="0.01" step="0.01"')+
    field('URL HTTPS da imagem do produto','imageUrl','url','maxlength="1200" placeholder="https://...')+
    '<label class="csp-margin-top-10px"><input type="checkbox" name="affiliateLinkConfirmed" value="true"> Confirmei que o link foi gerado no Programa de Afiliados Temu da minha conta.</label>'+
    '<div class="callout">O Radar valida o domínio e pode criar um rascunho. Isso não comprova rastreamento, venda ou comissão. A geração automática via API de afiliados não está disponível sem acesso oficial confirmado. A oferta fica pendente e não é publicada.</div>';
  openModal('Ferramentas · Temu Afiliados','Use somente links gerados na sua conta oficial. Não cole senha, cookies ou códigos de acesso.',body,async function(event){
    event.preventDefault();
    var fd=new FormData(event.target),action=String(fd.get('action')||'validate_link');
    var payload={action:action,affiliateUrl:String(fd.get('affiliateUrl')||'').trim(),productUrl:String(fd.get('productUrl')||'').trim()};
    try{
      if(action==='validate_link'){
        var check=await operationRequest('/api/integrations/temu',payload);
        closeModal();
        openModal('Validação de link Temu','Domínio conferido; rastreamento não foi verificado pela API.','<pre style="white-space:pre-wrap;max-height:55vh;overflow:auto;word-break:break-word">'+esc(JSON.stringify(check,null,2))+'</pre>',function(e){e.preventDefault();closeModal();});
        var validateSubmit=document.querySelector('#form button[type="submit"]');if(validateSubmit)validateSubmit.textContent='Fechar';
        return;
      }
      payload.title=String(fd.get('title')||'').trim();
      payload.currentPrice=String(fd.get('currentPrice')||'').trim();
      payload.originalPrice=String(fd.get('originalPrice')||'').trim();
      payload.imageUrl=String(fd.get('imageUrl')||'').trim();
      payload.affiliateLinkConfirmed=fd.get('affiliateLinkConfirmed')==='true';
      var result=await operationRequest('/api/integrations/temu',payload);
      closeModal();await load();await loadMarketplaceStatus();
      toast('Rascunho Temu criado; aprovação e publicação continuam desativadas.');
      openModal('Rascunho Temu criado','A oferta foi salva como pendente e não foi publicada.','<p><b>ID:</b> '+esc(result.offerId)+'</p><p><b>Status:</b> '+esc(result.status)+'</p><p>'+esc(result.message)+'</p>',function(e){e.preventDefault();closeModal();});
      var submit=document.querySelector('#form button[type="submit"]');if(submit)submit.textContent='Fechar';
    }catch(error){toast(error.message||'Não foi possível validar ou preparar a oferta Temu.');}
  });
  var submit=document.querySelector('#form button[type="submit"]');if(submit)submit.textContent='Executar';
}
async function openAliExpressTools(){
  var body='<label for="aliAction">Operação AliExpress</label><select id="aliAction" name="action" required><option value="test">Validar conexão (consulta somente leitura)</option><option value="products">Buscar produtos (somente consulta)</option><option value="importOffers">Buscar e importar ofertas para revisão manual</option><option value="smartMatch">Recomendação inteligente</option><option value="hotProducts">Produtos em destaque</option><option value="hotProductsDownload">Baixar produtos em destaque</option><option value="productDetail">Detalhes de produtos por ID</option><option value="categories">Categorias</option><option value="campaigns">Campanhas em destaque</option><option value="campaignProducts">Produtos de uma campanha</option><option value="generateLink">Gerar link de afiliado</option><option value="generateLinkAfilimax">Gerar link com provider Afilimax (experimental)</option><option value="orders">Consultar pedidos/comissões (API legada)</option><option value="orderDetail">Detalhes de pedidos por ID</option><option value="ordersByCursor">Consultar pedidos por cursor</option></select>'+field('Palavra-chave','keyword','text','maxlength="120" placeholder="Ex.: fone bluetooth"')+field('IDs dos produtos (separados por vírgula)','productIds','text','maxlength="500"')+field('ID de produto para recomendação inteligente','productId','text','maxlength="30"')+field('IDs dos pedidos (separados por vírgula)','orderIds','text','maxlength="500"')+field('Cursor start_query_index_id (relatórios)','cursor','text','maxlength="200"')+field('Site/região do portal (ex.: global)','localeSite','text','maxlength="30" value="global"')+field('IDs das categorias (separados por vírgula)','categoryIds','text','maxlength="200"')+field('ID da categoria para campanha','categoryId','text','maxlength="80"')+field('Nome exato da campanha','promotionName','text','maxlength="180"')+field('URL original do produto (gerar link)','productUrl','url','maxlength="2000" placeholder="https://www.aliexpress.com/item/..."')+field('País de entrega (ISO, padrão BR)','country','text','maxlength="2" value="BR"')+field('Página','page','number','min="1" max="1000" value="1"')+field('Itens por página (1–50)','pageSize','number','min="1" max="50" value="20"')+field('Desconto mínimo para importar (%)','minDiscountPercent','number','min="0" max="90" value="0"')+field('Comissão mínima para importar (%)','minCommissionRate','number','min="0" max="100" value="3"')+field('Avaliação mínima se fornecida (%)','minimumRating','number','min="0" max="100" value="90"')+field('Preço mínimo (opcional)','minPrice','number','min="0" step="0.01"')+field('Preço máximo (opcional)','maxPrice','number','min="0" step="0.01"')+field('Início do relatório (AAAA-MM-DD HH:mm:ss)','startTime','text','maxlength="19" placeholder="2026-10-01 00:00:00"')+field('Fim do relatório (AAAA-MM-DD HH:mm:ss)','endTime','text','maxlength="19" placeholder="2026-10-02 23:59:59"')+field('Status do pedido','orderStatus','text','maxlength="50" value="Payment Completed"')+'<div class="callout"><b>Atenção:</b> a documentação pública dos métodos Affiliate API está marcada como descontinuada. Todas as consultas dependem de a sua conta ainda ter acesso. Busca, detalhes, categorias, campanhas e relatórios são somente leitura. Gerar link cria apenas um link rastreável; não publica em WhatsApp ou Telegram. O provider Afilimax usa endpoint alternativo não validado com esta conta; use apenas para teste manual e confirme que o portal mantém a API habilitada.</div>';
  openModal('Ferramentas · AliExpress Afiliados','Use apenas credenciais oficiais do portal. Não informe sua senha de login nem cookies.',body,async function(event){
    event.preventDefault();var fd=new FormData(event.target),action=String(fd.get('action')||'test'),payload={action:action};
    ['keyword','productIds','productId','orderIds','cursor','localeSite','categoryIds','categoryId','promotionName','productUrl','country','page','pageSize','minDiscountPercent','minCommissionRate','minimumRating','minPrice','maxPrice','startTime','endTime','orderStatus'].forEach(function(key){var v=String(fd.get(key)||'').trim();if(v)payload[key]=v;});
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
    '<label for="admitadHasTool">Filtrar programas com ferramenta</label><select id="admitadHasTool" name="hasTool"><option value="">Todos</option><option value="coupons">Programas com cupons</option><option value="products">Catálogo de produtos</option><option value="deeplink">Links profundos</option></select>'+
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
  var body='<label for="shopeeAction">Operação da Open API</label><select id="shopeeAction" name="action" required><option value="test">Validar conexão (somente leitura)</option><option value="offers">Consultar ofertas</option><option value="create_link">Gerar link de afiliado</option><option value="conversions">Consultar conversões</option><option value="validated">Consultar relatório validado</option><option value="batch_links">Gerar vários links de afiliado</option><option value="feeds">Listar feeds de catálogo</option><option value="feed_data">Ler itens de um feed</option></select>'+
    '<label for="shopeeKind">Tipo de oferta</label><select id="shopeeKind" name="kind"><option value="product">Produtos</option><option value="shop">Lojas</option><option value="brand">Marcas</option><option value="shopee">Campanhas Shopee</option></select>'+
    field('Palavra-chave para ofertas','keyword','text','maxlength="80" placeholder="Ex.: fone bluetooth"')+
    '<label for="shopeeSort">Ordenar por</label><select id="shopeeSort" name="sortType"><option value="5">Maior comissão</option><option value="2">Mais vendidos (ordenação Shopee)</option><option value="1">Relevância</option><option value="3">Maior preço</option><option value="4">Menor preço</option></select>'+
    '<label for="shopeeListType">Lista de produtos</label><select id="shopeeListType" name="listType"><option value="1">Maior comissão</option><option value="2">Melhor desempenho</option><option value="0">Recomendados</option></select>'+
    field('ID da loja (opcional)','shopId','text','inputmode="numeric" maxlength="20"')+
    field('ID do produto (opcional)','itemId','text','inputmode="numeric" maxlength="20"')+
    '<label for="shopeeAms">Elegibilidade para comissão extra (AMS)</label><select id="shopeeAms" name="isAMSOffer"><option value="">Sem filtro</option><option value="true">Sim</option><option value="false">Não</option></select>'+
    '<label for="shopeeKeySeller">Somente vendedor estratégico (Key Seller)</label><select id="shopeeKeySeller" name="isKeySeller"><option value="">Sem filtro</option><option value="true">Sim</option><option value="false">Não</option></select>'+
    field('Página','page','number','min="1" max="1000" value="1"')+
    field('Resultados por página (1–500)','limit','number','min="1" max="500" value="50"')+
    field('URL original shopee.com.br (para gerar link)','originUrl','url','maxlength="2000" placeholder="https://shopee.com.br/..."')+
    field('SubIDs separados por vírgula (opcional, até 5)','subIds','text','maxlength="300"')+
    field('Data inicial do relatório (opcional)','startDate','date','')+
    field('Data final do relatório (opcional)','endDate','date','')+
    field('Status do pedido (opcional)','orderStatus','text','maxlength="20" placeholder="COMPLETED, PENDING, UNPAID ou CANCELLED"')+
    field('Tipo de comprador (opcional)','buyerType','text','maxlength="20" placeholder="NEW ou EXISTING"')+
    field('Dispositivo (opcional)','device','text','maxlength="10" placeholder="APP ou WEB"')+
    field('Validation ID do relatório de pagamentos','validationId','text','inputmode="numeric" pattern="[0-9]{1,18}" maxlength="18"')+
    '<label for="shopeeBatchUrls">URLs para lote (uma por linha, até 20)</label><textarea id="shopeeBatchUrls" name="batchUrls" rows="4" placeholder="https://shopee.com.br/..."></textarea>'+
    '<label for="shopeeFeedMode">Modo do feed (opcional)</label><select id="shopeeFeedMode" name="feedMode"><option value="">Listar todos</option><option value="FULL">FULL</option><option value="DELTA">DELTA</option></select>'+
    field('ID do feed para leitura','datafeedId','text','inputmode="numeric" maxlength="24"')+
    field('Offset do feed','offset','number','min="0" max="1000000" value="0"')+
    '<div class="callout">Use filtros para buscar produtos por comissão, desempenho, loja e elegibilidade de comissão extra. Para ranking, selecione Produtos e ordene por Mais vendidos. O filtro AMS indica elegibilidade para comissão extra, não garantia de comissão em toda venda. A API de Afiliados não possui busca direta de códigos de cupom. Shopee Video continua em rascunhos até existir acesso autorizado à API própria de vídeo. O relatório validado exige o Validation ID exibido no painel da Shopee. As consultas não publicam ofertas.</div>';
  openModal('Ferramentas · Shopee Afiliados','Use apenas recursos liberados pela Open API da sua conta. Nenhuma operação publica ofertas nos canais.',body,async function(event){
    event.preventDefault();
    var fd=new FormData(event.target),action=String(fd.get('action')||'test'),payload={action:action};
    if(action==='offers'){
      ['kind','keyword','sortType','listType','shopId','itemId','isAMSOffer','isKeySeller','page','limit'].forEach(function(key){var value=String(fd.get(key)||'').trim();if(value!=='')payload[key]=['sortType','listType','page','limit'].includes(key)?Number(value):value;});
    }
    if(action==='create_link'){payload.originUrl=String(fd.get('originUrl')||'');payload.subIds=String(fd.get('subIds')||'');}
    if(action==='batch_links'){payload.subIds=String(fd.get('subIds')||'');payload.items=String(fd.get('batchUrls')||'').split(/\r?\n/).map(function(url){return url.trim();}).filter(Boolean).slice(0,20).map(function(url){return {originUrl:url};});}
    if(action==='feeds'){payload.feedMode=String(fd.get('feedMode')||'');}
    if(action==='feed_data'){payload.datafeedId=String(fd.get('datafeedId')||'');payload.offset=Number(fd.get('offset')||0);payload.limit=Number(fd.get('limit')||100);}
    if(action==='conversions'){['startDate','endDate','orderStatus','buyerType','device'].forEach(function(key){var value=String(fd.get(key)||'').trim();if(value)payload[key]=value;});payload.limit=Number(fd.get('limit')||20);}
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
  var target=event.target;if(target&&target.nodeType!==1)target=target.parentElement;if(!target||typeof target.closest!=='function')return;var el=target.closest('[data-action]');if(!el)return;
  var source=el.getAttribute('data-action')||'';
  var match=source.match(/^([A-Za-z_$][\w$]*)\((.*)\)$/s);if(!match)return;
  var fn=window[match[1]];if(typeof fn!=='function')return;
  event.preventDefault();
  try{var result=fn.apply(window,parseActionArgs(match[2],el));if(result&&typeof result.catch==='function')result.catch(function(error){toast(error.message||'Não foi possível concluir a ação.');});}
  catch(error){toast(error.message||'Não foi possível concluir a ação.');}
},true);

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