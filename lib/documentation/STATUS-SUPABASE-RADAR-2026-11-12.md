# Status da migração do Radar Promo Brasil para Supabase
Atualizado em 12/11/2026.

## Destino
- Projeto Supabase: Radar Promo Brasil; ref `runnmpzkomcdawwzuift`; região `sa-east-1` (São Paulo).
- URL: `https://runnmpzkomcdawwzuift.supabase.co`; PostgreSQL 17.x; estado ACTIVE_HEALTHY.
- O projeto Feiraê não foi reutilizado nem alterado.

## Schema reconstruído
- 68/68 tabelas presentes; comparação automática de nomes de colunas sem diferenças.
- 88 constraints FK no catálogo PostgreSQL. A contagem anterior de 176 duplicava relações de entrada/saída retornadas pela API de introspecção; `pg_constraint` é a referência correta.
- 74 migrations SQL originais distintas do Hatchable aplicadas.
- Histórico Supabase: 83 entradas, 76 nomes distintos = 74 migrations originais + 2 migrations suplementares + 7 reaplicações idempotentes das migrations 001–007 na recuperação da primeira tentativa. Não editar/apagar manualmente o histórico.
- 2 tabelas privadas criadas no schema `private` para nonces anti-replay e auditoria.
- Correção pós-replay: removidos os índices globais legados `uq_offers_fingerprint` e `uq_publications_idempotency`, substituídos pela unicidade por conta da migration 008.
- Destino: 192 índices públicos; origem: 193. Não recriado o índice redundante `extension_api_tokens_token_hash_key`, pois `idx_extension_api_tokens_hash` já garante a mesma unicidade.
- Migrations podem criar registros globais de bootstrap; nenhum dado real de usuário, oferta, fila, publicação, integração ou credencial foi importado.

## Segurança
O Security Advisor acusa RLS desabilitado nas 68 tabelas públicas (`rls_disabled_in_public`, ERROR). O destino ainda não contém dados reais, mas o Advisor classifica as tabelas como expostas pela Data API. Não usar a chave anon/publishable para acessar essas tabelas.

RLS não foi ativado automaticamente: habilitar sem políticas interromperia o acesso de clientes PostgREST e não cria isolamento multi-tenant correto. Antes de expor a Data API, definir e testar políticas por `account_id`, papéis e operações. A aplicação deve acessar o banco somente no servidor. A proposta default-deny **não executada** está em `lib/documentation/PROPOSTA-RLS-DEFAULT-DENY-2026-11-12.sql`; requer decisão e políticas tenant-aware antes de qualquer acesso pela Data API.

Performance Advisor: 36 FKs sem índice, 91 índices não utilizados e 3 possíveis duplicidades. Como ainda não há carga real, não remover índices por alerta de uso; revisar FKs e duplicidades após testes representativos.

## Ponte privada
- Edge Function `radar-db-bridge`, ACTIVE, versão 2.
- URL: `https://runnmpzkomcdawwzuift.supabase.co/functions/v1/radar-db-bridge`.
- `verify_jwt=false` porque a própria função valida HMAC-SHA256; não é endpoint aberto.
- Timestamp com janela de 60 s, nonce persistido anti-replay, comparação em tempo constante, SQL parametrizado, uma instrução por operação, payload até 1 MB, SQL até 64 KB e até 25 operações por transação.
- Somente SELECT/INSERT/UPDATE/DELETE/WITH/VALUES; pool PostgreSQL máximo 1, SSL obrigatório e prepared statements desativados para pooler em modo transação.
- Auditoria registra metadados, nunca SQL, parâmetros ou credenciais.
- Migration privada: `supabase/migrations/20261112110000_radar_db_bridge_security.sql`. Correção de índices: `supabase/migrations/20261112113000_cleanup_replayed_legacy_indexes.sql`.

## Segredos manuais obrigatórios (não compartilhar no chat)
O conector disponível não permite gravar segredos nos painéis. Configurar manualmente:
1. Supabase → Edge Functions → Secrets:
   - `SUPABASE_DB_URL`: connection string do Transaction Pooler do projeto, com SSL.
   - `RADAR_DB_BRIDGE_SECRET`: segredo aleatório forte de pelo menos 32 bytes.
2. Hatchable → Settings/Secrets:
   - `SUPABASE_DB_BRIDGE_SECRET`: exatamente o mesmo segredo HMAC.
3. Hatchable → Config:
   - `SUPABASE_DB_BRIDGE_URL`: `https://runnmpzkomcdawwzuift.supabase.co/functions/v1/radar-db-bridge`.

Não colocar senha, connection string, service-role key ou HMAC no GitHub, navegador ou documentação. Após configurar, testar `GET /api/admin/supabase-health`; somente `ok:true` libera a adaptação das rotas.

## Código preparado, sem tráfego de produção
- `lib/supabase-db.js`: adaptador compatível com `db.query(sql, params)` e `db.transaction(operations)`; atualiza a leitura de config quando segredos ainda não estão configurados.
- `api/admin/supabase-health.js`: teste administrativo read-only.
- `hatchable.toml`: sincronizado com a versão Hatchable, incluindo o cron `/api/jobs/ingestion` e configurações opcionais da ponte.
- Fonte da Edge Function e Deno config versionadas em `supabase/functions/radar-db-bridge/`.
- Tipos gerados em `lib/supabase/database.types.ts`.
- 11 migrations ausentes no GitHub main sincronizadas no branch: 019_social_ai_artwork, 022_meli_notifications, 023_marketplace_social_profile, 024_meli_notification_processing, 025_meli_notification_dispatch, 037, 039, 041, 045, 052_affiliate_discovery_metadata e 068.
- 4 arquivos runtime ausentes no GitHub foram adicionados: `api/ingestion/status.js`, `api/jobs/ingestion.js`, `lib/aliexpress-response.js` e `lib/delivery-retry.js`.
- 10 arquivos runtime com conteúdo divergente foram atualizados para corresponder ao Hatchable ativo: `api/jobs/telegram.js`, `api/jobs/aliexpress.js`, `api/integrations/aliexpress.js`, `lib/delivery.js`, `lib/ingestion.js`, `api/jobs/autopilot.js`, `lib/autopilot.js`, `api/jobs/aliexpress-review.js`, `lib/lomadee-catalog.js` e `lib/product-safety.js` e `api/integrations/lomadee.js`.
- `api/ingestion/status.js` foi preservado, mas não foi encontrada referência interna a ele; não foi conectado a uma tela/fluxo sem auditoria funcional.
- O mapeamento de nome de produto Lomadee foi alinhado ao Hatchable: `x.name` é prioritário e `option.name` é fallback, preservando o nome de produto em vez de substituir pelo nome da variante.

## Auditoria de paridade Hatchable ↔ GitHub
- Inventário: 341 arquivos no Hatchable e 509 blobs no GitHub branch.
- Após sincronizar runtime e migrations, restam 46 arquivos somente no Hatchable, todos em documentação/evidências históricas; não copiar em massa sem varredura de segredos.
- 214 arquivos existem somente no GitHub (incluem skills, documentos, backups e arquivos adicionais de aplicação); exigem classificação antes de remover ou portar.
- 295 caminhos compartilhados apresentam diferenças de tamanho no inventário; isso não prova divergência de conteúdo por si só, mas exige diff de conteúdo priorizado antes do cutover.
- Os arquivos críticos listados acima foram comparados/sincronizados; a paridade integral ainda não está certificada.

## Validação, PR e produção
- PR #198 aberto no branch `codex/supabase-migration-20261112`; não mesclado.
- Primeira execução GitHub Actions: build passou, 234/241 testes passaram e 7 falharam em contratos de safety/autoaprovação AliExpress, classificação de medicamentos Lomadee, ingestion e autopilot. A investigação identificou versões runtime mais novas no Hatchable; os 10 arquivos acima foram sincronizados. A nova execução de CI está pendente; não declarar CI verde até concluir.
- `npm audit` e E2E foram pulados após a falha inicial dos testes.
- Hatchable dry-run: zero erros e zero avisos; versão candidata v669. Não publicada enquanto PR/CI e paridade permanecem pendentes.
- Produção permanece v668, usando PostgreSQL do Hatchable.
- O limite mensal/timeout do banco Hatchable impediu exportar dados reais; a data de restauração anteriormente informada foi 02/12/2026. Nenhuma credencial cifrada foi copiada.

## Próximas etapas obrigatórias
1. Configurar os segredos nos dois painéis e validar a rota administrativa.
2. Testar assinatura inválida, replay, SQL proibido, SELECT e transação controlada com rollback.
3. Definir RLS/políticas tenant-aware e resolver alertas críticos antes de expor a Data API.
4. Completar o diff de conteúdo das diferenças de paridade e resolver o conflito Lomadee.
5. Adaptar as 99 rotas em lotes revisáveis, preservando 486 chamadas `db.query`, 4 fluxos `db.transaction`, locks, `SKIP LOCKED`, resultados e isolamento por `account_id`.
6. Testar filas concorrentes, idempotência, webhooks, OAuth e publicação simulada sem mensagens reais.
7. Exportar/importar dados reais, preservar IDs/sequences e comparar contagens, relações e amostras.
8. Fazer leitura sombra, backup, delta final, corte controlado e rollback testado.

**Estado operacional:** o Radar continua usando PostgreSQL do Hatchable (v668). O Supabase já tem schema e ponte implantada, mas não recebe tráfego nem dados reais. Não declarar migração concluída até validar segredos, conexão, RLS, paridade, rotas, dados e rollback.
