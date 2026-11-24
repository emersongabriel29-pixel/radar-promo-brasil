# Execução de reconciliação e plano de retorno — 24/11/2026

## Alterações integradas e produção

| Entrega | Evidência | Estado |
|---|---|---|
| Correções Android/Magalu/Telegram | PR #212, commit `6eb45b7cb210405c9181c7e83090db5dae824fa3` | Merged |
| Recuperação do feed e helper | PR #213, commit `97292ec28ff4eb45aabe0ce7ae9cd597ee6cd245` | Merged |
| Proteção contra medicamentos | PR #214, commit `1cd4408d1ce5b3c2378b343afeddaf7286d8cc33` | Merged |
| Deploy das três correções funcionais | Hatchable v673 | Live |
| Rotas de mídia pública/privada e vitrine | Hatchable v674 | Live |

PR #212: CI e CodeQL aprovados. PR #213: CI e CodeQL aprovados. PR #214: build, testes, npm audit, Playwright E2E e CodeQL aprovados.

Hatchable v674: 361 arquivos, 138 funções, 74 migrations, sem warnings no dry-run. Nenhuma migration foi adicionada nesta execução.

## Segurança da mídia

- `api/public/media/[id].js` serve apenas ofertas de conta ativa visíveis em vitrine publicada ou vinculadas a publicação em estado permitido.
- `api/media/offer/[id].js` exige acesso member e valida o proprietário da conta.
- A vitrine pública gera URLs `/api/public/media/` para imagens armazenadas.
- As respostas incluem `X-Content-Type-Options: nosniff`; mídia privada usa `Cache-Control: private, no-store`.

## Reconciliação ainda pendente

O inventário original identificou 20 divergências de corpo. As proteções de medicamentos foram restauradas no GitHub; as duas rotas de mídia ausentes foram adicionadas ao Hatchable e a vitrine foi alinhada. Ainda existem diferenças funcionais em token/extension, suite, readiness (line endings), reports, Magalu status, Lomadee explorer, n8n telegram tick/bridge, AI media/image, links convert, radar price, jobs media, Lomadee queue normalization, AI card, social autopilot, monitoring e backups.

Não copiar esses arquivos em lote. Cada diferença deve ser classificada por comportamento e testada isoladamente. Os dois endpoints de mídia agora existem no Hatchable.

## Migração Supabase — estado verificado

- O destino tem 68 tabelas públicas com RLS ativado; 0 policies cadastradas.
- Roles `anon` e `authenticated` não possuem SELECT direto nas 68 tabelas públicas.
- Checkpoints privados: 39 lotes/36 tabelas/5.849 linhas inseridas; catálogo: 55 lotes/4 tabelas/10.385 linhas inseridas.
- Destino ainda sem dados operacionais essenciais: `publications`, `offer_price_history`, `affiliate_discovery_items` e `affiliate_discovery_snapshots` aparecem com zero linhas. Baseline de origem conhecido em 20/11: 14.511, 10.396, 93.402 e 194.570 linhas, respectivamente.
- Leitura atual do banco Hatchable falhou com HTTP 429 por cota mensal de 7.200 segundos excedida. Não foi possível reconciliar contagens atuais nem copiar o delta.
- `supabase_db_enabled` permanece desativado; Hatchable continua sendo o banco de produção.
- Não houve alteração de dados, secrets, migrations, filas ou configuração Supabase.

## Plano de migração e rollback obrigatório

### Antes da cópia
1. Restaurar capacidade de leitura/escrita da origem Hatchable e verificar saúde do projeto.
2. Fazer backup integral do banco de origem, storage, manifestos e metadados de criptografia; guardar hashes e contagens.
3. Validar no destino todas as tabelas, constraints, índices, foreign keys, sequences, grants e políticas de acesso. Manter Data API bloqueada para `anon` e `authenticated`; testar somente a ponte server-side com credenciais já configuradas, sem exibir segredos.
4. Fazer inventário de todas as tabelas, incluindo tabelas sem `account_id`, tabelas globais, tabelas de filas, logs, estados OAuth e tabelas privadas.

### Migração
5. Copiar em lotes idempotentes, preservando IDs, timestamps, status, estados de bloqueio, relacionamentos e dados criptografados.
6. Não sobrescrever registros divergentes silenciosamente. Registrar conflitos e reconciliar por chave primária.
7. Copiar objetos de storage e validar tamanho, MIME e SHA-256.
8. Comparar contagens e hashes por tabela/chave primária, verificar órfãos, constraints, sequences e consistência por account_id.
9. Fazer sincronização incremental final com escritas e workers suspensos, sem publicar nem enviar mensagens.

### Homologação e cutover
10. Homologar leitura e escrita por conta em ambiente isolado, autenticação, RLS/grants, ponte, backups, uploads, OAuth, filas, idempotência e rollback.
11. Manter a flag de provedor desativada até todas as evidências passarem.
12. Fazer cutover somente com autorização explícita, janela de manutenção, backup final e monitoramento.

### Rollback
- Se o cutover falhar antes de qualquer escrita no Supabase, desativar a flag e voltar ao Hatchable.
- Se houver escrita no Supabase, não voltar cegamente: exportar e reconciliar o delta de gravações do Supabase para a origem, validar contagens/hashes e só então trocar o provedor.
- Manter a origem íntegra e disponível até aprovação final, estabilidade operacional e encerramento formal da migração.

## Auditoria manual e visual pendentes

- Inventário estático cobre 127 rotas; a revisão manual aprofundada, rota por rota, ainda não foi concluída.
- 81 usos de `innerHTML` em `public/radar.js` e `public/affiliate-intelligence.js` foram inspecionados; não houve XSS confirmada. Hardening de `public/radar.js:5149` recomendado para o ID de backup.
- Browser visual não estava disponível nesta execução. Nenhum screenshot mobile/desktop foi fabricado ou declarado como capturado.
- A auditoria final de rotas, webhooks/OAuth e diferenças remanescentes deve continuar antes de declarar a reconciliação integral concluída.

## Restrições respeitadas

Nenhum teste de credenciais, probe destrutivo, alteração de dados, publicação, envio Telegram/WhatsApp, merge de PR de migração, ativação Supabase ou cutover foi realizado nesta documentação.
