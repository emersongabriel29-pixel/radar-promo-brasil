# Catálogo de rotas API do Radar Promo Brasil

**Data:** 19/10/2026  
**Escopo:** branch atualizado nesta auditoria, 77 arquivos `api/*.js`. Hatchable v324 ainda lista 82 funções: 76 rotas API e seis páginas `__page`; a IA Central desta branch ainda não está implantada.
**Uso:** referência de roteamento, autenticação e métodos; presença de código não prova conexão nem entrega externa.

## Arquivos de endpoint, acesso e métodos declarados

| Arquivo de API | Acesso no edge | Métodos permitidos |
|---|---|---|
| `/api/admin/telegram-diagnostics.js` | `member` | `GET` |
| `/api/agents/social-media.js` | `member` | `GET`, `POST` |
| `/api/ai/card/[id].js` | `public` | `GET` |
| `/api/ai/image.js` | `member` | `POST` |
| `/api/ai/media.js` | `member` | `GET`, `POST` |
| `/api/ai/media/file/[id].js` | `member` | `GET` |
| `/api/ai/orchestrator.js` | `member` | `POST` |
| `/api/ai/promo.js` | `member` | `POST` |
| `/api/ai/studio.js` | `member` | `POST` |
| `/api/ai/video-ia.js` | `member` | `POST` |
| `/api/automation/simulate.js` | `member` | `POST` |
| `/api/backups.js` | `member` | `GET`, `POST` |
| `/api/batches.js` | `member` | `GET`, `POST` |
| `/api/compliance/messaging.js` | `member` | `GET`, `POST` |
| `/api/data.js` | `member` | `GET`, `POST`, `PUT`, `DELETE` |
| `/api/email/test.js` | `member` | `POST` |
| `/api/growth.js` | `member` | `GET`, `POST`, `PUT`, `DELETE` |
| `/api/integrations/admitad.js` | `member` | `GET`, `POST` |
| `/api/integrations/aliexpress.js` | `member` | `GET`, `POST` |
| `/api/integrations/amazon.js` | `member` | `GET`, `POST` |
| `/api/integrations/apis.js` | `member` | `GET`, `POST`, `DELETE` |
| `/api/integrations/awin.js` | `member` | `GET`, `POST` |
| `/api/integrations/lomadee.js` | `member` | `GET`, `POST` |
| `/api/integrations/magalu-callback.js` | `public` | `GET` |
| `/api/integrations/magalu-clone.js` | `member` | `POST` |
| `/api/integrations/magalu-connect.js` | `member` | `GET` |
| `/api/integrations/magalu-status.js` | `member` | `GET`, `POST` |
| `/api/integrations/magalu.js` | `member` | `GET`, `POST` |
| `/api/integrations/marketplaces.js` | `member` | `GET`, `POST`, `DELETE` |
| `/api/integrations/rakuten.js` | `member` | `GET`, `POST` |
| `/api/integrations/shein.js` | `member` | `GET`, `POST` |
| `/api/integrations/shopee.js` | `member` | `GET`, `POST` |
| `/api/jobs/api-health.js` | `scheduler` | `POST` |
| `/api/jobs/autopilot.js` | `scheduler` | `POST` |
| `/api/jobs/hourly.js` | `scheduler` | `POST` |
| `/api/jobs/lomadee.js` | `scheduler` | `POST` |
| `/api/jobs/media.js` | `scheduler` | `POST` |
| `/api/jobs/mercadolivre-notifications.js` | `scheduler` | `POST` |
| `/api/jobs/recurrence.js` | `scheduler` | `POST` |
| `/api/jobs/social.js` | `scheduler` | `POST` |
| `/api/jobs/telegram.js` | `scheduler` | `POST` |
| `/api/links/convert.js` | `member` | `POST` |
| `/api/media/offer/[id].js` | `member` | `GET` |
| `/api/mercadolivre/callback.js` | `public` | `GET` |
| `/api/mercadolivre/connect.js` | `member` | `GET` |
| `/api/mercadolivre/health.js` | `member` | `GET` |
| `/api/mercadolivre/notifications.js` | `public` | `GET`, `POST` |
| `/api/mercadolivre/parse-link.js` | `member` | `POST` |
| `/api/mercadolivre/products.js` | `member` | `GET` |
| `/api/messages/parse-preview.js` | `member` | `POST` |
| `/api/messages/preview.js` | `member` | `GET`, `POST` |
| `/api/monitors/run.js` | `member` | `POST` |
| `/api/n8n/api-status.js` | `member` | `POST` |
| `/api/n8n/bridge.js` | `public` | `POST` |
| `/api/n8n/mcp-callback.js` | `public` | `GET` |
| `/api/n8n/mcp-connect.js` | `member` | `POST` |
| `/api/n8n/mcp-status.js` | `member` | `POST` |
| `/api/n8n/pairing.js` | `member` | `POST` |
| `/api/n8n/ping-test.js` | `member` | `POST` |
| `/api/n8n/telegram-tick.js` | `public` | `POST` |
| `/api/privacy.js` | `member` | `GET`, `POST` |
| `/api/public/media/[id].js` | `public` | `GET` |
| `/api/public/social-image/[id].js` | `public` | `GET` |
| `/api/public/storefront.js` | `public` | `GET` |
| `/api/r/[id].js` | `public` | `GET` |
| `/api/radar/autopilot.js` | `member` | `GET`, `POST` |
| `/api/radar/curator-ai.js` | `member` | `POST` |
| `/api/radar/opportunities.js` | `member` | `GET` |
| `/api/radar/price.js` | `member` | `GET`, `POST` |
| `/api/readiness.js` | `member` | `GET` |
| `/api/reports.js` | `member` | `GET`, `POST` |
| `/api/social/autopilot.js` | `member` | `GET`, `POST`, `PUT`, `DELETE` |
| `/api/suite.js` | `member` | `GET`, `POST`, `PUT`, `DELETE` |
| `/api/telegram/incoming.js` | `public` | `POST` |
| `/api/telegram/test.js` | `member` | `POST` |
| `/api/telegram/webhook-setup.js` | `member` | `POST` |
| `/api/upload.js` | `member` | `POST` |

## Páginas publicadas

- `/__page`
- `/__page/inicio`
- `/__page/privacidade`
- `/__page/radar-video-ia`
- `/__page/termos`
- `/__page/vitrine`

## Critérios da auditoria

- Todas as 77 rotas desta branch declaram explicitamente um nível de acesso (`public`, `member` ou `scheduler`) e uma lista de métodos HTTP. A versão Hatchable v324 contém 76 rotas API; compare deployments antes de publicar.
- O nome do arquivo determina a rota: remova o prefixo do arquivo e a extensão `.js`; segmentos `[id]` são parâmetros dinâmicos, por exemplo `api/r/[id].js` → `/api/r/:id`.
- `public` indica que a chamada chega ao handler sem sessão. Webhooks e callbacks ainda validam assinatura, segredo ou estado próprio; URL pública não significa autorização para executar qualquer ação.
- `scheduler` é bloqueado para visitantes; teste real anônimo retorna 404 antes do handler.
- O E2E e os testes unitários verificam contratos selecionados; a verificação online individual de todas as rotas protegidas segue pendente por rate limit do console Hatchable.
- Arquivos completos de algumas funções divergem entre branch e Hatchable. Compare os hashes por deployment antes de sincronizar ou publicar arquivos em lote; consulte `docs/AUDITORIA-FUNCIONAL-COMPLETA-2026-10-18.md`.

