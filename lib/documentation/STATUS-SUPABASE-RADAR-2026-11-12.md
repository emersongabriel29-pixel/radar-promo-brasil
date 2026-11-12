# Status da migração do Radar Promo Brasil para Supabase
Atualizado em 12/11/2026.

## Destino
- Projeto: Radar Promo Brasil; ref `runnmpzkomcdawwzuift`; região `sa-east-1` (São Paulo).
- URL: `https://runnmpzkomcdawwzuift.supabase.co`; PostgreSQL 17.x; estado ACTIVE_HEALTHY.
- O projeto Feiraê não foi reutilizado nem alterado.

## Schema reconstruído e conferido
- 68/68 tabelas presentes; comparação dos nomes das colunas sem diferenças.
- 88 constraints de chave estrangeira no catálogo PostgreSQL. A primeira contagem de 176 duplicava relações de entrada/saída retornadas pela API de introspecção; a contagem direta de pg_constraint é a referência correta.
- Correção pós-replay aplicada: removidos os índices globais legados `uq_offers_fingerprint` e `uq_publications_idempotency`, que a migration 008 substitui por unicidade por conta. O destino ficou com 192 índices públicos contra 193 no schema de origem: o índice redundante `extension_api_tokens_token_hash_key` não foi recriado porque `idx_extension_api_tokens_hash` já garante a mesma unicidade.
- 74 migrations SQL distintas do Hatchable aplicadas.
- O histórico registra 81 entradas: 74 migrations distintas mais 7 reaplicações idempotentes das migrations 001–007 durante a recuperação da primeira tentativa. Não editar/apagar manualmente o histórico.
- Criado schema privado `private` com tabela de nonces anti-replay e tabela de auditoria.
- Nenhum dado real de usuário, oferta, fila, publicação, integração ou credencial foi importado. Migrations podem ter criado registros globais de bootstrap.

## Segurança — alerta obrigatório
O Security Advisor acusa RLS desabilitado nas 68 tabelas públicas (`rls_disabled_in_public`, ERROR). O destino ainda não contém os dados reais, mas o Advisor classifica as tabelas como expostas pela Data API. Não usar a chave anon/publishable para acessar essas tabelas.

RLS não foi ativado automaticamente: habilitar sem políticas interromperia o acesso de clientes PostgREST e não cria isolamento multi-tenant correto. Antes de expor a Data API, definir e testar políticas por `account_id`, papéis e operações. A aplicação deve acessar o banco somente no servidor. A decisão e a validação das políticas continuam pendentes. A proposta de habilitação deny-by-default, **não executada**, está em `lib/documentation/PROPOSTA-RLS-DEFAULT-DENY-2026-11-12.sql`; requer decisão e políticas antes de qualquer acesso pela Data API.

Performance Advisor: 36 FKs sem índice, 89 índices não utilizados e 3 possíveis índices duplicados. Como ainda não há carga real, não remover índices por alerta de uso; revisar FKs e duplicidades após testes representativos.

## Ponte privada implantada
- Edge Function `radar-db-bridge`, ACTIVE, versão 2.
- URL: `https://runnmpzkomcdawwzuift.supabase.co/functions/v1/radar-db-bridge`.
- `verify_jwt=false` porque a própria função valida HMAC-SHA256; não é endpoint aberto.
- Timestamp com janela de 60 s, nonce persistido anti-replay, comparação em tempo constante, SQL parametrizado, uma instrução por operação, payload até 1 MB, SQL até 64 KB e até 25 operações por transação.
- Somente SELECT/INSERT/UPDATE/DELETE/WITH/VALUES; pool PostgreSQL máximo 1, SSL obrigatório e prepared statements desativados para pooler em modo transação.
- Auditoria registra metadados, nunca SQL, parâmetros ou credenciais.

## Segredos ainda necessários (não compartilhar no chat)
O conector não permite gravar segredos nos painéis. Configurar manualmente:
1. Supabase → Edge Functions → Secrets: `SUPABASE_DB_URL` (connection string do Transaction Pooler com SSL) e `RADAR_DB_BRIDGE_SECRET` (segredo aleatório forte de pelo menos 32 bytes).
2. Hatchable → Settings/Secrets: `SUPABASE_DB_BRIDGE_SECRET` (o mesmo segredo).
3. Hatchable → Config: `SUPABASE_DB_BRIDGE_URL` = `https://runnmpzkomcdawwzuift.supabase.co/functions/v1/radar-db-bridge`.

Não colocar senha, connection string, service-role key ou HMAC no GitHub, navegador ou documentação. Depois, testar `GET /api/admin/supabase-health`; somente `ok:true` libera a adaptação das rotas.

## Código preparado, sem tráfego de produção
- `lib/supabase-db.js`: adaptador compatível com `db.query(sql, params)` e `db.transaction(operations)`.
- `api/admin/supabase-health.js`: teste administrativo read-only.
- `hatchable.toml`: declara URL e segredo como opcionais.
- `supabase/functions/radar-db-bridge/`: fonte versionada da Edge Function.
- `lib/supabase/database.types.ts`: tipos TypeScript gerados.
- Seis migrations ausentes no GitHub main foram adicionadas ao branch `codex/supabase-migration-20261112`: 037, 039, 041, 045, 052_affiliate_discovery_metadata e 068.

As 99 rotas continuam usando o SDK Hatchable; as 486 chamadas `db.query` e 4 fluxos `db.transaction` ainda não foram redirecionados. Adaptador e rota de teste estão como draft, não publicados. Não houve troca de tráfego.

## Origem e próximos passos
Produção continua no Hatchable, projeto `proj_1Xj94QxQmCam`, versão v668. O limite mensal/timeout do banco Hatchable impediu exportar dados reais; a data de restauração anteriormente informada foi 02/12/2026. Nenhuma credencial cifrada foi copiada.

1. Configurar segredos e validar a rota administrativa.
2. Testar assinatura inválida, replay, SQL proibido, SELECT e transação com rollback.
3. Definir RLS/políticas tenant-aware e resolver alertas críticos.
4. Adaptar e testar as 99 rotas, preservando locks, `SKIP LOCKED`, resultados e isolamento por `account_id`.
5. Exportar/importar dados reais, preservar IDs/sequences e comparar contagens e relações.
6. Fazer leitura sombra, backup, delta final, corte controlado e rollback testado.

**Estado operacional:** o Radar continua usando PostgreSQL do Hatchable (v668). Supabase já tem schema e ponte implantada, mas não recebe tráfego nem dados reais. Não declarar migração concluída antes de validar segredos, conexão, RLS, rotas, dados e rollback.


## Validação GitHub e publicação Hatchable
- PR #198 está aberto no branch `codex/supabase-migration-20261112`; não foi mesclado.
- `npm run build` passou (207 arquivos JavaScript).
- `npm test`: 234 passaram e 7 falharam. Os 7 casos falhos pertencem a contratos/testes de segurança AliExpress, autoaprovação, classificação de medicamentos Lomadee, ingestão e limite diário do autopilot. Os arquivos de teste são idênticos aos de main e os arquivos testados não fazem parte das alterações deste PR; são divergências preexistentes fora do escopo da migração. Por isso não declarei CI verde nem mesclei o PR.
- `npm audit` e E2E foram pulados pelo workflow após a falha dos testes.
- Hatchable dry-run: zero erros e zero avisos; versão candidata v669. Não foi publicado, pois o PR ainda não foi mesclado e a validação completa do CI está pendente.
- Produção permanece v668 e continua usando o PostgreSQL do Hatchable.
