# Integração segura da comunidade Radar Promo Ofertas ao Supabase

Estado verificado em 2026-11-20. Projeto Supabase: `runnmpzkomcdawwzuift` (Radar Promo Brasil).
Projeto Hatchable da comunidade: `proj_rPigttuZOrM7` (versão publicada 3).

## Inventário verificado
- `public.offers`: 10.360 registros; `public.accounts`: 2 registros.
- `auth.users`: 0 registros; não existe nenhuma tabela `public.rpo_*`.
- A comunidade autentica pelo Hatchable `[auth] enabled=true`, `providers=["email"]`; os handlers usam `req.user.id`.
- Os rascunhos Hatchable contêm migrações `0001_community.sql` até `0004_account_requests.sql`, ainda não implantadas.
- O Hatchable retornou HTTP 429 por limite mensal de tempo de banco em testes de API.

## Contrato de segurança obrigatório
1. **Não confiar em `user_id` vindo do cliente.** O backend deve validar a sessão Hatchable e resolver o usuário de forma verificável no Supabase.
2. **Não usar `public.accounts` como substituto de `auth.users`**: são contas operacionais do Radar e não identidades autenticadas da comunidade.
3. Antes de conceder acesso, escolher e testar uma das opções:
   - Migração explícita para Supabase Auth, com correspondência de identidades validada e renovação de sessão; ou
   - Backend confiável que valide tokens Hatchable com mecanismo oficial e acesse o Supabase exclusivamente no servidor, usando credenciais restritas.
4. Nunca expor `service_role` no Flutter, JavaScript público, GitHub ou logs. Não criar política RLS que aceite identificadores arbitrários do cliente.
5. Ao criar tabelas no Supabase, habilitar RLS desde o início, **sem políticas de acesso público até a identidade estar validada**.
6. Exportação e exclusão de conta devem abranger dados do usuário e identidade no provedor real, com trilha de auditoria e sem exclusões automáticas em testes.
7. Migrar em etapas, comparando contagens e identificadores entre bancos, sem sobrescrever registros. Executar rollback seguro em caso de falha.

## Próximas verificações de implementação
- Confirmar documentação e suporte oficial de validação de sessão Hatchable fora do ambiente Hatchable.
- Verificar se o banco Hatchable contém dados de comunidade antes de qualquer migração.
- Construir e testar camada de acesso com identidade verificada, isolamento entre usuários, limites e tratamento de erros.
- Revisar e corrigir SQL dos rascunhos, aplicar em ambiente controlado e validar RLS.
- Testar operações reais com contas de teste (sem publicar ofertas nem excluir dados), depois avaliar implantação.

## Preparação aplicada no Supabase em 2026-11-20
- Criado o schema privado `radar_community` no projeto `runnmpzkomcdawwzuift`.
- Executado `REVOKE ALL ON SCHEMA radar_community FROM PUBLIC, anon, authenticated`.
- Verificação SQL posterior: `anon_usage=false`, `authenticated_usage=false`, `tables=0`.
- Nenhuma tabela de comunidade ou conta foi migrada; dados existentes preservados.
- A documentação Supabase de 2026-11-17 permite OIDC de terceiros com issuer discovery e JWT assimétrico. **Não foi comprovado que o Hatchable expõe issuer OIDC compatível**; não configurar um emissor presumido.
- Próxima dependência: validar suporte oficial do Hatchable a identidade externa ou planejar migração autenticada para Supabase Auth antes de conceder permissões.

## Estado
**Integração não concluída.** Este documento registra as dependências reais e evita migração prematura ou acesso indevido.

## Estrutura de tabelas criada no Supabase
- Criadas no schema privado `radar_community` as 10 tabelas: `rpo_favorites`, `rpo_votes`, `rpo_comments`, `rpo_notification_preferences`, `rpo_notifications`, `rpo_offer_submissions`, `rpo_moderators`, `rpo_reports`, `rpo_moderation_audit`, `rpo_account_deletion_requests`.
- Estrutura adaptada das quatro migrações de rascunho do Hatchable, com nomes qualificados pelo schema privado.
- Verificação posterior via catálogo `pg_class`: **10/10 com RLS habilitado**, `anon_select=false` e `authenticated_select=false` para todas.
- Nenhuma política pública ou privilégio de escrita concedido; sem integração com a API e sem dados migrados.
- **Próxima etapa obrigatória:** implementar e validar identidade confiável entre Hatchable e Supabase, definir acesso do backend e testar isolamento de dados antes de liberar as APIs.

## Adaptador da comunidade preparado no Hatchable (2026-11-20)
- Rascunho do projeto `proj_rPigttuZOrM7`: `lib/community-db.js` seleciona banco por `community_supabase_enabled` (padrão `false`); `lib/community-supabase-db.js` prepara requisições assinadas HMAC; `api/admin/community-db-health.js` permite diagnóstico somente para administrador.
- `lib/api.js`, `api/submissions.js`, `api/reports.js`, `api/moderation.js`, `api/account/data.js` e `api/account/deletion-request.js` foram redirecionados para o adaptador. As identidades continuam derivadas de `req.user` autenticado pelo Hatchable, não de `user_id` fornecido pelo cliente.
- `hatchable.toml` declara URL e segredo opcionais da ponte e flag desativada por padrão. **Não existe ponte configurada/validada para a comunidade**, portanto não habilitar a flag.
- Teste SQL no Supabase confirmou as 10 tabelas com RLS e nenhum privilégio direto `SELECT/INSERT/UPDATE/DELETE` para `anon`/`authenticated`; o schema não permite `USAGE` a esses papéis.
- Tentativas de executar `/api/admin/community-db-health` e `/api/favorites` no Hatchable retornaram HTTP 429 (`usage_limit`, 2,1h de 2,0h); **não há validação ponta a ponta nem teste entre duas sessões reais**.
- Antes do cutover: implementar/inspecionar servidor da ponte com allowlist restrita às operações de comunidade, autenticação HMAC e proteção contra replay, configurar segredos em cofre, validar identidade de dois usuários e autorização de moderador, reconciliar dados e executar testes em ambiente seguro.
- **Não realizar deploy ou habilitar Supabase** enquanto esses itens estiverem pendentes.

## Ponte Supabase criada em 2026-11-20
- Edge Function independente `radar-community-db-bridge` implantada no Supabase `runnmpzkomcdawwzuift`, versão 1, status `ACTIVE`, `verify_jwt=false` **porque valida HMAC no próprio handler**.
- Exige segredo `COMMUNITY_SUPABASE_BRIDGE_SECRET` de pelo menos 32 caracteres; sem ele responde `503 BRIDGE_NOT_CONFIGURED` (fail closed).
- Inclui validação de timestamp, assinatura HMAC, nonce único persistido em `radar_community.bridge_nonces`, limites de corpo, lote, SQL e parâmetros, transações e consultas restritas ao schema da comunidade.
- Criada tabela privada `radar_community.bridge_nonces`, com RLS habilitado e sem acesso `anon` ou `authenticated`.
- O código do adaptador no Hatchable ainda é **rascunho não implantado** e `community_supabase_enabled=false`. Não há segredo compartilhado configurado, migração ou cutover.
- **Não houve teste de chamada HTTP ponta a ponta**: Hatchable continua retornando `429 usage_limit`; acesso externo de teste não disponível. O estado ACTIVE indica deploy, não funcionamento validado.
- Antes de produção: revisar allowlist de SQL e limites de acesso, testar assinatura válida/inválida e replay, confirmar identidade confiável, configurar segredo exclusivo em ambos os cofres, testar duas contas e moderador, comparar dados, só então habilitar a flag e implantar.

## Revisão de segurança da ponte — 2026-11-20
- Auditoria do código publicado da Edge Function `radar-community-db-bridge` versão 1 identificou que o filtro textual de SQL não constituía uma allowlist de operações segura: SQL assinado poderia executar comandos não previstos sobre tabelas da comunidade.
- **Correção aplicada:** Edge Function publicada na versão **2** (`ACTIVE`), substituindo `safeSQL` por rejeição incondicional `SQL_NOT_ALLOWED`. O bloqueio impede execução de SQL arbitrário enquanto não houver API tipada com autorização por identidade.
- A versão 2 foi recuperada e conferida pelo conector Supabase, confirmando rejeição de SQL, exigência de segredo e proteção de nonce. **Não houve teste HTTP real**: ambiente de execução local não conseguiu resolver DNS do domínio Supabase.
- O adaptador Hatchable atual ainda envia SQL genérico e **não é compatível com a ponte bloqueada**; `community_supabase_enabled` deve permanecer `false`.
- Próxima implementação: substituir SQL genérico por comandos explícitos (`favorites.list`, `favorites.add`, etc.) com identidade validada e autorização por operação; adicionar testes com duas identidades, configurar segredo compartilhado nos cofres e somente então fazer cutover.

## Operações tipadas implantadas — 2026-11-20
- Edge Function `radar-community-db-bridge` **versão 3 ACTIVE**: somente `favorites.list`, `favorites.add`, `favorites.remove`, `votes.get`, `votes.set`, `votes.remove`; SQL parametrizado definido no servidor, sem entrada SQL do chamador.
- Hatchable Radar Promo Ofertas (rascunho): criado `lib/community-operations.js` com HMAC e URL fixa do Supabase; `lib/community.js` usa seis operações tipadas derivadas de `req.user.id`. `lib/community-db.js` rejeita consultas SQL genéricas no modo Supabase.
- Teste SQL transacional com dois IDs de teste, filtros por `user_id` e `ROLLBACK`: **0 registros de teste persistidos**. Isto não equivale a teste ponta a ponta de duas sessões.
- **Importante:** somente favoritos e votos foram convertidos. As demais APIs retornariam 503 com o modo Supabase habilitado; não habilitar `community_supabase_enabled` nem fazer deploy/cutover até implementar todas as operações necessárias e validar credenciais, autenticação, testes e divergências.
- Ainda não foram configurados segredos nem testado HTTP HMAC; Hatchable segue com limitação 429.

## Operações tipadas adicionais — 2026-11-20
- Edge Function `radar-community-db-bridge` implantada na **versão 4 ACTIVE**: adicionadas `notifications.list`, `notifications.preference`, `notifications.read`, `comments.public`, `comments.own`.
- Hatchable Radar Promo Ofertas (somente rascunho): `lib/community-operations.js` e `lib/community.js` atualizados para chamar as operações tipadas; leituras próprias filtradas por `user_id` e comentários públicos limitados por página.
- Verificação de código publicado confirmou as cinco ações no switch; consulta SQL confirmou 0 registros em comentários, notificações e preferências no schema privado.
- **Ainda não convertidos:** criação/edição/exclusão de comentários, envio e revisão de ofertas, denúncias, moderação, exportação e solicitação de exclusão de conta. Sem segredo configurado, sem teste HTTP, sem teste de duas sessões, sem deploy Hatchable. Manter a flag Supabase desligada.

## Operações tipadas de escrita — 2026-11-20
- Edge Function `radar-community-db-bridge` versão **7 ACTIVE**, conferida após deploy: `comments.add`, `comments.edit`, `comments.remove`, `submissions.add`, `submissions.list`, `reports.add`, `reports.list` acrescentadas.
- Comentários: escrita com limite de 5/min por usuário e edição/remoção condicionadas ao proprietário. **A versão tipada ainda não envia notificação de resposta** (diferença funcional a resolver antes do cutover).
- Submissões: limite de 10/h, deduplicação de URL por usuário por 7 dias, status `pending`, sem publicação. Denúncias: limite de 10/h, alvo existente e deduplicação por usuário/alvo.
- Hatchable Radar Promo Ofertas (rascunho): `lib/community.js`, `lib/community-operations.js`, `api/submissions.js`, `lib/moderation.js` modificados para chamar a ponte.
- SQL de verificação: 0 comentários, 0 submissões e 0 denúncias nas tabelas do schema privado. Não foram realizados testes HTTP HMAC nem testes ponta a ponta, nem deploy Hatchable.
- **Pendências críticas:** revisão de código e testes de autorização, notificação de resposta, moderação com auditoria, exportação e solicitação de exclusão, credenciais seguras, teste entre duas contas e liberação do limite 429 do Hatchable. Manter flag Supabase desligada.

## Moderação, notificações de resposta e privacidade — 2026-11-20
- Edge Function `radar-community-db-bridge` implantada na **versão 10 ACTIVE**, confirmada via leitura da versão publicada.
- `comments.add` envia notificação transacional de resposta somente quando há comentário original visível, usuário distinto e preferência habilitada. Deduplicação por ID do novo comentário.
- `moderation.check`, `moderation.list`, `moderation.decide`: consultam a tabela privada `rpo_moderators`; decisão e auditoria usam CTE no banco e restringem ação a relatório pendente/alvo compatível. **Sem moderadores cadastrados no Supabase, acesso negado por padrão.**
- `account.request.get`, `account.request.create`, `account.request.cancel`: gerenciam apenas solicitação de exclusão, sem apagar dados nem conta; pedidos `completed` não podem ser reabertos.
- Hatchable Radar Promo Ofertas: rascunhos atualizados `lib/community.js`, `lib/community-operations.js`, `lib/moderation.js`, `api/account/deletion-request.js`.
- Consulta de verificação: `rpo_moderators=0`, `rpo_moderation_audit=0`, `rpo_account_deletion_requests=0`. **Não foi realizado teste HTTP de decisão de moderação, HMAC, autenticação ou isolamento entre sessões.**
- **Pendência:** exportação integral de dados ainda usa SQL genérico; deve ser convertida com paginação segura antes de ativar Supabase. Credenciais HMAC não configuradas; Hatchable sem deploy e bloqueio 429 permanece. Revisar comportamento de erros, testar permissões, auditar SQL, e validar operações com contas reais de teste antes de produção.

## Exportação paginada — 2026-11-20
- Edge Function `radar-community-db-bridge` versão **11 ACTIVE**: operação `account.export.page` com oito datasets explícitos, consulta SQL parametrizada no servidor, filtro por `user_id`/`reporter_id`, páginas de 200 registros e sinalização `hasMore`.
- Hatchable Radar Promo Ofertas **somente rascunho**: `lib/community-operations.js` permite operação tipada; `api/account/data.js` busca páginas sequenciais por dataset e retorna erro `EXPORT_TOO_LARGE` acima de 10.000 itens por conjunto em vez de truncar silenciosamente.
- Verificação: leitura da Edge Function confirmou versão 11, operação presente e filtros de propriedade; leitura do rascunho confirmou paginação e guarda de limite. **Não houve chamada HTTP autenticada, teste de duas contas, teste de volumes nem deploy Hatchable**.
- **Riscos a resolver antes da ativação:** exportação por OFFSET não garante snapshot consistente sob escrita concorrente; revisar autorização, configuração HMAC e credenciais, testes ponta a ponta, divergências GitHub/Hatchable, limite 429 e demais operações.
- `community_supabase_enabled` permanece desativado. Nenhum dado real foi migrado ou apagado.

## Auditoria de segurança e bloqueio de testes — 2026-11-20
- Versão publicada da Edge Function conferida: `radar-community-db-bridge` **11 ACTIVE**; Hatchable principal versão **672** e Radar Promo Ofertas versão **3**.
- Teste real `run_function` em `/api/account/data` como visitante público retornou **HTTP 429** `usage_limit`: 2,1 horas consumidas de orçamento de 2,0 horas do Hatchable Free. Não foi possível verificar sequer a resposta esperada de autorização, nem testar o caminho autenticado. **Não repetir chamadas até a cota permitir.**
- Supabase Security Advisors: avisos `rls_enabled_no_policy` (INFO) também em tabelas privadas. Auditoria SQL das **11 tabelas** de `radar_community`: RLS habilitado em todas; roles `anon` e `authenticated` sem USAGE no schema e sem privilégios SELECT/INSERT/UPDATE/DELETE nas tabelas. Para o desenho atual de ponte privada, a ausência de políticas públicas é deliberada, não razão para conceder acesso.
- O resultado **não** valida isolamento ponta a ponta entre duas contas: a ponte usa HMAC de servidor e `userId` do chamador; somente o servidor autenticado deve poder defini-lo.
- Pendências de segurança: teste HTTP HMAC com segredo configurado, teste com duas sessões reais, validação de resposta das APIs, teste de exportação com volumes e alterações concorrentes, revisão de semântica de notificações e moderação, gerenciamento de nonces expirados, revisão de código e sincronização GitHub/Hatchable. Não ativar `community_supabase_enabled`.

## Auditoria da ponte e limpeza de nonces — 2026-11-20
- Supabase Edge Function `radar-community-db-bridge` **v12 ACTIVE**: após reivindicar nonce de requisição HMAC válida, há limpeza probabilística (1/256) de até 500 nonces expirados por execução; mantém proteção contra replay e limita trabalho por chamada. Sem cron externo.
- Verificação: leitura da função publicada confirmou versão 12, assinatura HMAC SHA-256, inserção de nonce com `ON CONFLICT DO NOTHING` e consulta de limpeza limitada. Consulta SQL de leitura confirmou 0 nonces totais/expirados na ocasião.
- **Limite da validação:** nenhuma requisição HMAC real foi executada; a limpeza não foi exercitada com nonces expirados e não há prova de desempenho sob carga. O Hatchable segue bloqueado por HTTP 429 e suas versões publicadas permanecem 672 (principal) e 3 (Ofertas).
- **Sem ativação:** segredo HMAC e URL do bridge precisam ser configurados nos dois ambientes, com teste de autorização e isolamento entre usuários antes do cutover. Nenhum dado de comunidade foi apagado.
