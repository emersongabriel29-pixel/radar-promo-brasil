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
