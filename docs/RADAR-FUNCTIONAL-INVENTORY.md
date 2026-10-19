# Radar Promo Brasil — inventário funcional antes da auditoria visual

**Finalidade:** checklist de preservação antes de reorganizar menus e layout. Este mapa registra os pontos de entrada visíveis e os contratos funcionais existentes no código; não afirma que integrações externas estejam conectadas ou prontas nesta conta.

**Baseline auditado:** branch `codex/radar-video-ia-runway-20261018`, commit inicial `145ed0f`; produção Hatchable v317. O estado de produção, o GitHub e este worktree são conferidos separadamente conforme `docs/HATCHABLE-GITHUB-SYNC-RULE.md`.

## Navegação principal — manter as sete áreas

| Área/estado | Entradas atuais | Capacidades que precisam continuar acessíveis |
| --- | --- | --- |
| Central (`dashboard`) | Resumo e ações rápidas | KPIs, estado da operação, atividade recente, atalhos para criar oferta e configurar monitor. |
| Radar (`radar`) | Monitoramento 24h, Modo clone, Criação rápida | Fontes/feed autorizados, captura e deduplicação, validação de produtos, observação de preço, configuração e execução do monitor. |
| Ofertas (`offers`) | Workspace interna: **Ofertas** (Ofertas e cupons, Curador); **IA** (IA Central, Estúdio, acesso a Radar Vídeo IA); **Redes e campanhas** (Tráfego e redes sociais, Agente Radar Social). | Cadastro/revisão/aprovação e exclusão; cupons e links; curadoria por regras e com IA; IA Central consultiva de panorama/plano sem escrita; geração de texto, imagem e vídeo; rascunhos sociais de imagem; campanhas, tráfego e agente social. IA local é padrão para roteiro; OpenAI/Gemini/Claude seguem como escolhas explícitas; Runway requer segredo e ação explícita. Os destinos prévios e seus ids continuam; Radar Vídeo IA é rota existente com acesso na categoria IA. |
| Publicações (`publishing`) | Filas e agendamento | Revisão e preparação de envio; filas, recorrências e limites por canal/destino; estados, idempotência e comprovantes do provedor. |
| Canais (`channels`) | Grupos e canais, Gestão de leads | Cadastro, associação e estado de grupos/canais, capacidade e consentimento; importação/gestão de leads quando configurada. |
| Relatórios (`reports`) | Relatórios | Cliques, vendas/comissões, desempenho por período/categoria/canal, entregas e métricas disponíveis. Ausência de eventos não pode ser mostrada como sucesso. |
| Configurações (`settings`) | Segurança e LGPD, Integrações, Conta/vitrine/planos | Sessão e credenciais por conta, prontidão e saúde de integrações, contas/vitrine, consentimentos, exportação/backup e exclusão/portabilidade quando implementadas. |

## Contratos de navegação e interação

- `NAV` em `public/radar.js` define as sete áreas; `GROUPS` define seus submenus; `show(view)` aceita os ids profundos e mantém a seleção no hash. Preservar ids, alvos de `data-action`, `aria-current`, links diretos e retorno do histórico.
- `pages/index.js` contém casca, skip link, menu móvel, sombra de drawer, cabeçalho, ações rápidas, região principal, diálogo e toast. Preservar os ids usados no JavaScript e pelos testes.
- Drawer móvel: foco inicial, tecla Escape, contenção de Tab, `inert`, botão com `aria-expanded`, fechamento ao trocar de área e breakpoint em 900 px.
- Diálogos: foco inicial, labels associados, erro junto ao formulário, desabilitação durante envio, retorno do foco e fechamento por Escape.
- Contrato responsivo: sem rolagem horizontal em 375/714/768/880/1024/1440 px; ações do cabeçalho ficam no fluxo em telas até 900 px para não encobrir conteúdo; respeito a `prefers-reduced-motion` e safe-area.
- Manter acessíveis conexões e “Nova oferta” no cabeçalho; em telas estreitas, garantir que a barra fixa não esconda conteúdo, foco nem avisos.

## Inventário dos endpoints e serviços por domínio

Os nomes abaixo são derivados dos arquivos `api/` e `lib/` presentes no baseline. Cada fluxo deve continuar chamando o endpoint já existente, com a mesma autenticação, payload e semântica; uma mudança visual não altera contratos.

| Domínio | Arquivos de API | Serviços principais |
| --- | --- | --- |
| Dados e operação | `api/data.js`, `api/suite.js`, `api/readiness.js`, `api/reports.js`, `api/growth.js`, `api/batches.js` | `lib/accounts.js`, `lib/validation.js`, `lib/automation.js`, `lib/monitoring.js`, `lib/radar.js`, `lib/offer-message-parser.js`, `lib/offer-images.js`, `lib/category-classifier.js` |
| Radar e importação | `api/monitors/run.js`, `api/radar/autopilot.js`, `api/radar/curator-ai.js`, `api/radar/opportunities.js`, `api/radar/price.js`, `api/messages/parse-preview.js`, `api/messages/preview.js` | `lib/ingestion.js`, `lib/network-guard.js`, `lib/click-filter.js`, `lib/coupon-rules.js`, `lib/promo-message.js` |
| IA e mídia | `api/ai/orchestrator.js`, `api/ai/studio.js`, `api/ai/image.js`, `api/ai/promo.js`, `api/ai/card/[id].js`, `api/ai/media.js`, `api/ai/media/file/[id].js`, `api/ai/video-ia.js`, `api/upload.js`, `api/media/offer/[id].js`, `api/public/media/[id].js` | `lib/creative.js`, `lib/media.js`; IA Central envia apenas estados agregados depois de ação explícita, sem escrita; mídia privada por padrão, pública somente no estado autorizado para publicação. |
| Social | `api/social/autopilot.js`, `api/agents/social-media.js`, `api/jobs/social.js`, `api/public/social-image/[id].js` | `lib/social-autopilot.js`; rascunhos de imagem IG/FB, aprovação humana e conexão Meta necessária. Não inclui vídeo/Reels, grupos FB, Direct em grupo, TikTok ou Kwai. |
| Publicação, mensageria e recorrência | `api/jobs/autopilot.js`, `api/jobs/hourly.js`, `api/jobs/recurrence.js`, `api/jobs/telegram.js`, `api/jobs/media.js`, `api/automation/simulate.js`, `api/telegram/incoming.js`, `api/telegram/test.js`, `api/telegram/webhook-setup.js`, `api/compliance/messaging.js`, `api/privacy.js` | `lib/autopilot.js`, `lib/delivery.js`, `lib/recurrences.js`, `lib/telegram.js`, `lib/telegram-core.js`, `lib/whatsapp-rotation.js`, `lib/direct-connectors.js`, `lib/messaging-compliance.js`, `lib/privacy.js`. Respeitar consentimento, supressões, quotas, idempotência e confirmação oficial. |
| Conectores e afiliados | `api/integrations/*.js`, `api/mercadolivre/*.js` | AliExpress, Amazon, Awin, Admitad, Lomadee, Magalu, Rakuten, Shein, Shopee e Mercado Livre. Cada conector exige credenciais/autorização própria; cadastro não equivale a conexão ou saúde validada. |
| n8n, mensageria conectada e diagnósticos | `api/n8n/*.js`, `api/admin/telegram-diagnostics.js`, `api/jobs/api-health.js`, `api/jobs/mercadolivre-notifications.js` | `lib/credential-bindings.js`, `lib/security.js`; pareamento, callback, health checks, notificações, segredos associados à conta e estados de entrega incerta. |
| Conta, exportação e proteção | `api/backups.js`, `api/privacy.js`, `api/email/test.js`, `api/public/storefront.js`, `api/r/[id].js` | Backup/restore isolado por conta, portabilidade, LGPD, links rastreados, vitrine, sessões e logs. |

## Invariantes de dados, segurança e operação

- Isolamento por `account_id`; não mostrar nem alterar dados, credenciais, mídia ou comprovantes de outra conta.
- Credenciais permanecem vinculadas à conta e não são reveladas em telas, URLs ou logs.
- Autopilot conservador: score 85, desconto 15%, máximo de cinco publicações/dia e cooldown de 120 minutos. Aprovação humana continua padrão para social.
- Não afirmar preço, estoque, desconto, cupom, publicação ou integração saudável sem evidência oficial/verificada.
- Estados de envio incerto não podem disparar repetição automática que possa duplicar mensagem/publicação.
- Nenhuma função removida por rearranjo visual; nenhum teste de interface deve ativar jobs de envio externo.

## Checklist de regressão para a mudança visual

- [x] Os sete destinos principais continuam presentes, com os mesmos ids e handlers (E2E).
- [x] Todo item de cada `GROUPS` continua acessível; itens testados continuam ativos no painel (E2E).
- [x] APIs, permissões, migrações, scheduler e configurações não mudaram na reorganização visual (revisão do diff).
- [x] Navegação por mouse/teclado, abertura/fechamento do drawer, foco e checagem axe passaram; deep links mantêm os ids existentes.
- [x] 375, 714, 768, 880, 1024 e 1440 px sem scroll horizontal; ações do cabeçalho não sobrepõem o conteúdo; `prefers-reduced-motion` exercitado. Landscape/zoom máximo não faz parte da suíte atual.
- [x] Reteste 2026-10-19: build (125 arquivos JavaScript), 117 testes unitários, 3 E2E e axe passaram; `npm audit --audit-level=moderate` encontrou 0 vulnerabilidades. Capturas desktop/móvel e IA Central revistas em `test-results/`.
- [ ] Conferir equivalência final entre arquivos UI do GitHub e Hatchable, registrar novo commit e versão publicada.

## Estado inicial observado

- O baseline preserva sete áreas e os destinos preexistentes dentro de Ofertas. A IA Central foi adicionada como destino consultivo; nenhum destino antigo foi removido. Ver `docs/AUDITORIA-GERAL-32-ITENS-2026-10-19.md` para a rodada v324 e a evidência atual.
- Capturas E2E antigas mostravam a barra fixa móvel sobrepondo conteúdo. Nesta rodada ela passou ao fluxo em telas até 900 px; o E2E verificou separação entre ações e conteúdo em 375, 714 e demais larguras testadas.
- A prontidão em produção v317 retornou `SETUP_REQUIRED`, sem ofertas aprovadas ou destinos sociais ativos. Não existe base segura para um envio real de oferta durante esta rodada; os testes de envio devem continuar simulados/localizados.
- **Divergência preservada antes da edição:** `public/radar.js` em Hatchable (SHA-256 `49f1f1d9220580facee7e8671801d670b12c71e46d072bcea2e6d95d1eb06037`, 4.444 linhas) contém o passo de revisão explícita do Modo Copiador (`pendingCopierPrefill`, campos editáveis e `continueCopierDraft` nas linhas 2 e 594–627). Esse passo não está no baseline GitHub/PR: a versão local abre o cadastro logo após interpretar a mensagem. A navegação existente, o parse e o endpoint são os mesmos. A implementação de revisão em produção será preservada e trazida para a branch antes de publicar qualquer reorganização.
- **Hashes UI de produção antes da edição:** `pages/index.js` `5c175ac5c4cb88e7a9ba4de4620cc51d89569a8ad8d218ae4ec9ecc5b7f77b9e`; `public/radar.css` `9cd4df3bafe4bdf4832096ae51feb323f76734fbd965547a49a5a3fe10f585e0`; `public/radar-theme-v5.css` `f0a36d0652fa2d6236228ab5969c70ffb6d909d418a7f36a3ca86f641ef728f1`. São referências para comparação posterior, não mudanças a sobrescrever.

## Resultado da primeira etapa — layout e navegação

- A lateral preserva sete destinos e seus ids; subtelas permanecem em `GROUPS`. A hierarquia visual agrupa os mesmos destinos em Operação, Análise e Gestão.
- A identidade azul definida no Master foi unificada no estado ativo, ícones e superfícies do menu; verde segue reservado a sucesso. Nenhuma API, configuração de conta, permissão ou automação foi removida/alterada.
- O Modo Copiador mantém a revisão manual que existia em produção: edição de produto, preços, URLs e cupom antes de abrir o cadastro. O E2E verifica a sugestão, edição e continuidade sem publicar.
- A suíte E2E passou após as mudanças; axe não reportou violações nas telas exercitadas. Capturas: `test-results/dashboard-home.png`, `test-results/menu-mobile.png`, `test-results/dashboard-mobile.png`.
- Próxima etapa desta tarefa: reconciliar com Hatchable v317 e GitHub/PR #88, depois executar smoke checks em produção. As configurações externas da conta continuam dependentes de chaves e conexões reais.
