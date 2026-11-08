# Inventário técnico completo — Radar Promo Brasil

**Snapshot:** Hatchable v654 LIVE, 08/11/2026. Este documento registra todos os arquivos de rota, módulos compartilhados e migrações presentes no snapshot consultado. A presença de arquivo não certifica que integração externa esteja configurada ou homologada.

## Rotas API (121)

Access e métodos foram extraídos do código. Para 108 rotas, a extração textual identificou as declarações; 13 rotas adicionais foram conferidas por leitura direta dos arquivos. O runtime Hatchable registra as funções como ANY, mas o código restringe métodos por `export const methods`.

| Arquivo | Access | Métodos permitidos |
|---|---|---|
| `api/admin/ai-usage.js` | member | GET |
| `api/admin/telegram-diagnostics.js` | member | GET |
| `api/affiliate/aliexpress-metrics.js` | member | GET |
| `api/affiliate/competition.js` | member | GET,POST |
| `api/affiliate/intelligence.js` | member | GET |
| `api/affiliate/shopee-intelligence.js` | member | GET |
| `api/agents/social-media.js` | member | GET,POST |
| `api/ai/assistant.js` | member | POST |
| `api/ai/card/[id].js` | public | GET |
| `api/ai/image.js` | member | POST |
| `api/ai/intelligence.js` | member | POST |
| `api/ai/media.js` | member | GET,POST |
| `api/ai/media/file/[id].js` | member | GET |
| `api/ai/promo.js` | member | POST |
| `api/ai/studio.js` | member | POST |
| `api/ai/video-ia.js` | member | POST |
| `api/ai/vision-review.js` | member | POST |
| `api/automation/simulate.js` | member | POST |
| `api/backups.js` | member | GET,POST |
| `api/batches.js` | member | GET,POST |
| `api/clone/inspect.js` | member | POST |
| `api/clone/whatsapp-bind.js` | member | POST |
| `api/clone/whatsapp-incoming.js` | public | POST |
| `api/compliance/messaging.js` | member | GET,POST |
| `api/data.js` | member | GET,POST,PUT,DELETE |
| `api/email/test.js` | member | POST |
| `api/extension-offers-preview.js` | public | POST |
| `api/extension-offers.js` | public | POST |
| `api/extension-token.js` | member | GET,POST,DELETE |
| `api/growth.js` | member | GET,POST,PUT,DELETE |
| `api/integrations/admitad.js` | member | GET,POST |
| `api/integrations/aliexpress.js` | member | GET,POST |
| `api/integrations/amazon.js` | member | GET,POST |
| `api/integrations/apis.js` | member | GET,POST,DELETE |
| `api/integrations/awin.js` | member | GET,POST |
| `api/integrations/collshp-import.js` | member | POST |
| `api/integrations/health-summary.js` | member | GET |
| `api/integrations/lomadee-explorer.js` | member | GET,POST |
| `api/integrations/lomadee.js` | member | GET,POST |
| `api/integrations/magalu-callback.js` | public | GET |
| `api/integrations/magalu-clone.js` | member | POST |
| `api/integrations/magalu-connect.js` | member | GET |
| `api/integrations/magalu-status.js` | member | GET,POST |
| `api/integrations/magalu.js` | member | GET,POST |
| `api/integrations/marketplaces.js` | member | GET,POST,DELETE |
| `api/integrations/rakuten.js` | member | GET,POST |
| `api/integrations/shein.js` | member | GET,POST |
| `api/integrations/shopee.js` | member | GET,POST |
| `api/integrations/temu.js` | member | GET,POST |
| `api/jobs/ai-enrichment.js` | scheduler | POST |
| `api/jobs/aliexpress-review.js` | scheduler | POST |
| `api/jobs/aliexpress.js` | scheduler | POST |
| `api/jobs/api-health.js` | scheduler | POST |
| `api/jobs/autopilot.js` | scheduler | POST |
| `api/jobs/extension-autopublish.js` | scheduler | POST |
| `api/jobs/extension-offers-resolve-queue.js` | scheduler | POST |
| `api/jobs/extension-offers-resolve.js` | scheduler | POST |
| `api/jobs/hourly.js` | scheduler | POST |
| `api/jobs/lomadee-discovery-queue.js` | scheduler | POST |
| `api/jobs/lomadee-link-queue.js` | scheduler | POST |
| `api/jobs/lomadee-reconcile.js` | scheduler | POST |
| `api/jobs/lomadee.js` | scheduler | POST |
| `api/jobs/marketplace-ingestion.js` | scheduler | POST |
| `api/jobs/media.js` | scheduler | POST |
| `api/jobs/mercadolivre-notifications.js` | scheduler | POST |
| `api/jobs/recurrence.js` | scheduler | POST |
| `api/jobs/shopee.js` | scheduler | POST |
| `api/jobs/social.js` | scheduler | POST |
| `api/jobs/telegram.js` | scheduler | POST |
| `api/jobs/whatsapp-channel.js` | scheduler | POST |
| `api/links/convert.js` | member | POST |
| `api/mercadolivre/callback.js` | public | GET |
| `api/mercadolivre/connect.js` | member | GET |
| `api/mercadolivre/health.js` | member | GET |
| `api/mercadolivre/notifications.js` | public | GET,POST |
| `api/mercadolivre/parse-link.js` | member | POST |
| `api/mercadolivre/products.js` | member | GET |
| `api/messages/parse-preview.js` | member | POST |
| `api/messages/preview.js` | member | GET,POST |
| `api/messages/templates.js` | member | GET,POST,PUT,DELETE |
| `api/monitors/run.js` | member | POST |
| `api/n8n/api-status.js` | member | POST |
| `api/n8n/bridge.js` | public | POST |
| `api/n8n/mcp-callback.js` | public | GET |
| `api/n8n/mcp-connect.js` | member | POST |
| `api/n8n/mcp-status.js` | member | POST |
| `api/n8n/pairing.js` | member | POST |
| `api/n8n/ping-test.js` | member | POST |
| `api/n8n/telegram-tick.js` | public | POST |
| `api/privacy.js` | member | GET,POST |
| `api/public/social-image/[id].js` | public | GET |
| `api/public/storefront.js` | public | GET |
| `api/r/[id].js` | public | GET |
| `api/radar/autopilot.js` | member | GET,POST |
| `api/radar/curator-ai.js` | member | POST |
| `api/radar/opportunities.js` | member | GET |
| `api/radar/price.js` | member | GET,POST |
| `api/readiness.js` | member | GET |
| `api/reports.js` | member | GET,POST |
| `api/settings/offer-builder.js` | member | GET,PUT |
| `api/settings/publication-scheduler.js` | member | GET,PUT |
| `api/shopee-video/drafts.js` | member | GET,POST,DELETE |
| `api/shopee/categories.js` | member | GET |
| `api/social/autopilot.js` | member | GET,POST,PUT,DELETE |
| `api/suite.js` | member | GET,POST,PUT,DELETE |
| `api/telegram/diagnostics.js` | member | POST |
| `api/telegram/incoming.js` | public | POST |
| `api/telegram/test.js` | member | POST |
| `api/telegram/webhook-setup.js` | member | POST |
| `api/upload.js` | member | POST |
| `api/video-studio.js` | member | GET,POST,PUT,DELETE |
| `api/video-studio/file/[id].js` | member | GET |
| `api/video-studio/image.js` | member | GET |
| `api/video-studio/script.js` | member | POST |
| `api/video-studio/upload.js` | member | POST |
| `api/video-studio/voice.js` | member | POST |
| `api/video-studio/youtube-connect.js` | member | GET |
| `api/video-studio/youtube-oauth.js` | public | GET |
| `api/video-studio/youtube.js` | member | GET,POST |
| `api/whatsapp-channel/test.js` | member | POST |
| `api/worker/lomadee-discovery.js` | public | POST |

## Páginas (9)

- `pages/estudio-videos.js`
- `pages/index.js`
- `pages/inicio.js`
- `pages/links.js`
- `pages/privacidade.js`
- `pages/radar-video-ia.js`
- `pages/shopee-video-rascunhos.js`
- `pages/termos.js`
- `pages/vitrine.js`

## Módulos compartilhados (53)

- `lib/accounts.js`
- `lib/affiliate-discovery.js`
- `lib/affiliate-intelligence.js`
- `lib/affiliate-sales.js`
- `lib/afilimax-aliexpress-provider.js`
- `lib/automation.js`
- `lib/autopilot.js`
- `lib/backups.js`
- `lib/catalog-diversity.js`
- `lib/category-classifier.js`
- `lib/category-routing.js`
- `lib/click-filter.js`
- `lib/coupon-rules.js`
- `lib/creative.js`
- `lib/credential-bindings.js`
- `lib/delivery.js`
- `lib/direct-connectors.js`
- `lib/extension-marketplace-lookup.js`
- `lib/extension-offer-resolver.js`
- `lib/gemini.js`
- `lib/http-retry.js`
- `lib/ingestion.js`
- `lib/lomadee-api.js`
- `lib/lomadee-catalog.js`
- `lib/lomadee-shortener.js`
- `lib/marketplace-rotation.js`
- `lib/media.js`
- `lib/message-templates.js`
- `lib/messaging-compliance.js`
- `lib/monitoring.js`
- `lib/offer-images.js`
- `lib/offer-message-parser.js`
- `lib/privacy.js`
- `lib/product-safety.js`
- `lib/promo-classifier.js`
- `lib/promo-message.js`
- `lib/publication-priority.js`
- `lib/radar-ai-guard.js`
- `lib/radar-ai.js`
- `lib/radar.js`
- `lib/recurrences.js`
- `lib/security.js`
- `lib/shopee-api-errors.js`
- `lib/shopee-feed.js`
- `lib/shopee-ids.js`
- `lib/shopee-keywords.js`
- `lib/social-autopilot.js`
- `lib/telegram-core.js`
- `lib/telegram.js`
- `lib/top-signature.js`
- `lib/validation.js`
- `lib/whatsapp-channel.js`
- `lib/whatsapp-rotation.js`

## Migrações SQL (71)

- `migrations/001_categories.sql`
- `migrations/002_groups.sql`
- `migrations/003_offers.sql`
- `migrations/004_publications.sql`
- `migrations/005_automation_suite.sql`
- `migrations/006_internal_automation.sql`
- `migrations/007_platform_suite.sql`
- `migrations/008_tenant_isolation.sql`
- `migrations/009_reporting.sql`
- `migrations/010_telegram.sql`
- `migrations/011_growth_ai_security.sql`
- `migrations/012_media_generation.sql`
- `migrations/012_radar_intelligence.sql`
- `migrations/013_fix_radar_id_types.sql`
- `migrations/014_social_media_agent.sql`
- `migrations/015_social_autopilot.sql`
- `migrations/016_messaging_compliance.sql`
- `migrations/017_direct_connectors.sql`
- `migrations/018_production_audit.sql`
- `migrations/019_social_ai_artwork.sql`
- `migrations/019_unlimited_radar_publications.sql`
- `migrations/019_whatsapp_rotation.sql`
- `migrations/020_operational_workflows.sql`
- `migrations/021_offer_batches.sql`
- `migrations/022_api_credentials.sql`
- `migrations/022_meli_notifications.sql`
- `migrations/023_marketplace_social_profile.sql`
- `migrations/024_meli_notification_processing.sql`
- `migrations/025_meli_notification_dispatch.sql`
- `migrations/030_whatsapp_destination_types.sql`
- `migrations/031_marketplace_api_credentials.sql`
- `migrations/032_api_credential_validation.sql`
- `migrations/033_category_classification.sql`
- `migrations/033_collshp_storefront.sql`
- `migrations/034_offer_classification_metadata.sql`
- `migrations/035_official_price_verification.sql`
- `migrations/035_telegram_offer_message_fallback.sql`
- `migrations/037_lomadee_read_only_validation_status.sql`
- `migrations/038_coupon_eligibility.sql`
- `migrations/039_lomadee_link_read_validation.sql`
- `migrations/040_whatsapp_clone_source_id.sql`
- `migrations/041_shopee_video_drafts.sql`
- `migrations/042_reporting_tenant_integrity.sql`
- `migrations/043_message_templates.sql`
- `migrations/044_offer_builder_settings.sql`
- `migrations/045_extension_api_tokens.sql`
- `migrations/046_radar_intelligence.sql`
- `migrations/047_gemini_quota_optimization.sql`
- `migrations/048_marketplace_rotation_state.sql`
- `migrations/049_marketplace_api_audit.sql`
- `migrations/049_publication_scheduler.sql`
- `migrations/050_affiliate_discovery.sql`
- `migrations/051_affiliate_sales.sql`
- `migrations/052_affiliate_discovery_metadata.sql`
- `migrations/052_shopee_competition_observations.sql`
- `migrations/053_affiliate_discovery_snapshots.sql`
- `migrations/054_shopee_competition_sample.sql`
- `migrations/055_shopee_competition_categories.sql`
- `migrations/056_discovery_category_attribution.sql`
- `migrations/056_video_studio.sql`
- `migrations/057_youtube_video_publishing.sql`
- `migrations/058_extension_autopublish.sql`
- `migrations/058_shopee_discovery_cursors.sql`
- `migrations/059_shopee_discovery_processing_queue.sql`
- `migrations/060_lomadee_discovery_queue.sql`
- `migrations/061_shopee_category_api_validation.sql`
- `migrations/061_telegram_scheduler_performance.sql`
- `migrations/062_category_routing_keywords.sql`
- `migrations/063_auto_moto_taxonomy.sql`
- `migrations/064_casa_lar_taxonomy_keywords.sql`
- `migrations/065_gemini_usage_governance.sql`

## Contagem por nível de acesso

- member: 84 rotas.
- public: 16 rotas.
- scheduler: 21 rotas.
- Total: 121 rotas API.

## Regras de manutenção

Qualquer inclusão, remoção ou mudança em rota, permissão, método HTTP, módulo compartilhado ou migração exige atualizar este inventário na mesma tarefa. Mudanças de access exigem testes positivos e negativos para os níveis correspondentes. Mudanças em migrações exigem registrar compatibilidade, teste e plano de recuperação. Integrações externas permanecem pendentes até homologação real documentada.
