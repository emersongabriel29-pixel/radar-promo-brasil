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

## Estado
**Integração não concluída.** Este documento registra as dependências reais e evita migração prematura ou acesso indevido.
