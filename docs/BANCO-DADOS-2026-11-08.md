# Banco de dados e migrações — estado em 08/11/2026

## Baseline

Schema lido diretamente do PostgreSQL do projeto Hatchable: **67 tabelas**, com **71 arquivos de migração** listados no projeto. As migrações aplicadas são imutáveis: mudanças futuras devem ser feitas em migrações adicionais, nunca reescrevendo o histórico de produção. Não executar DROP, backfill destrutivo ou alteração de dados em massa sem autorização e plano de recuperação.

## Inventário de tabelas

`account_api_credentials`, `account_integration_health`, `account_security_settings`, `account_settings`, `accounts`, `activity_log`, `affiliate_competition_observations`, `affiliate_discovery_items`, `affiliate_discovery_runs`, `affiliate_discovery_snapshots`, `affiliate_sales`, `automation_settings`, `autopilot_rules`, `categories`, `click_events`, `connector_credential_bindings`, `content_assets`, `coupons`, `extension_api_tokens`, `extension_autopublish_settings`, `growth_campaigns`, `integration_health`, `lead_costs`, `lead_events`, `marketplace_api_audit`, `marketplace_api_credentials`, `marketplace_connections`, `marketplace_oauth_states`, `marketplace_rotation_state`, `marketplace_rules`, `media_generation_jobs`, `meli_notification_dispatch_state`, `meli_notification_events`, `message_templates`, `messaging_compliance_events`, `monitors`, `offer_builder_settings`, `offer_price_history`, `offers`, `operational_backups`, `privacy_requests`, `promo_groups`, `publication_scheduler_settings`, `publications`, `queues`, `radar_ai_control`, `radar_ai_copy_cache`, `radar_ai_insights`, `radar_gemini_throttle`, `radar_gemini_usage`, `schedules`, `security_events`, `shopee_category_api_validation`, `shopee_discovery_cursors`, `shopee_video_drafts`, `social_autopilot_settings`, `social_connections`, `social_posts`, `standalone_scheduled_jobs`, `storefront_settings`, `subscriptions`, `telegram_connections`, `video_studio_projects`, `webhook_events`, `whatsapp_connections`, `youtube_connections`, `youtube_oauth_states`

## Domínios principais (agrupamento sem implicar ownership exclusivo)

- Conta, identidade, configurações e segurança: accounts, account_settings, account_api_credentials, account_integration_health, account_security_settings, security_events, activity_log.
- Oferta e descoberta: offers, categories, coupons, offer_price_history, affiliate_discovery_*, affiliate_competition_observations, marketplace_api_audit, marketplace_api_credentials, marketplace_connections, marketplace_rules.
- Publicação e entrega: publications, promo_groups, queues, telegram_connections, whatsapp_connections, webhook_events, messaging_compliance_events.
- IA e mídia: radar_ai_*, radar_gemini_*, media_generation_jobs, content_assets, video_studio_projects, shopee_video_drafts.
- Automação e operação: automation_settings, autopilot_rules, monitors, schedules, standalone_scheduled_jobs, operational_backups.
- Crescimento, leads e relatórios: growth_campaigns, click_events, affiliate_sales, lead_events, lead_costs, social_posts, social_connections.
- Privacidade e comercial: privacy_requests, subscriptions, storefront_settings.

## Regras de dados

- Todas as entidades operacionais devem ser escopadas por conta autenticada; nunca confiar em account_id vindo do cliente sem autorização.
- Preservar histórico de preço: preço atual não deve ser substituído por mínimo histórico.
- Chaves idempotentes e constraints únicas são parte da proteção contra duplicidade; não remover sem análise de concorrência.
- Credenciais devem permanecer cifradas e vinculadas à conta/provedor; documentar somente nomes de campos e status, nunca conteúdo.
- Tabelas de eventos e logs não devem armazenar tokens, cookies ou dados pessoais além do necessário.

## Procedimento de migração

1. Ler schema publicado e migrações já existentes.
2. Criar novo arquivo numerado, compatível e idempotente quando possível.
3. Avaliar locks, volume, defaults, índices, constraints, backfill e duração.
4. Executar teste em banco isolado e validar rollback/compatibilidade.
5. Executar dry-run e conferir migração detectada.
6. Deploy somente com autorização; conferir resultado da migração no banco real.
7. Atualizar este documento e a matriz de testes com nome, objetivo, tabelas e prova.

Não marcar migração como aplicada manualmente sem evidência do ledger e do schema. Não apagar tabelas para rollback; preferir rollback de código compatível ou migração corretiva para frente.
