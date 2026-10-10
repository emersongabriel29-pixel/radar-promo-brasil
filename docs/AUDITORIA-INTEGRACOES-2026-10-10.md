# Auditoria e reconciliação de integrações — 2026-10-10

## Estado de referência

- Projeto Hatchable: Radar Promo Brasil, versão publicada 112.
- Repositório: `emersongabriel29-pixel/radar-promo-brasil`.
- Base GitHub observada: `71efa8a13379b4dde060ca93d0e1839348073233` (`main`).
- Esta mudança está em uma branch de auditoria; não altera `main` e não publica no Hatchable.

## Divergências reconciliadas nesta proposta

- Foram adicionadas ao repositório as rotas que existem no Hatchable e faltavam no GitHub: `api/mercadolivre/health.js`, `api/mercadolivre/notifications.js`, `api/mercadolivre/parse-link.js` e `api/jobs/mercadolivre-notifications.js`.
- O código de `api/mercadolivre/products.js` foi alinhado ao comportamento publicado: busca de catálogo para descoberta, indicação explícita de que catálogo não confirma anúncio comprável e `safeToAutoPublish: false`.
- `api/links/convert.js` foi alinhado ao comportamento mais conservador publicado: não inventa parâmetros de afiliado e bloqueia a conversão automática do Mercado Livre; para outras lojas sem integração implementada, instrui usar o gerador oficial.
- As quatro migrações que existem no Hatchable receberam novos números sequenciais no repositório (`026` a `029`) para evitar colisão com a numeração de migrações específica do código standalone que já existe em `main`. Não renumerar de volta sem revisar o histórico do banco.

## Arquivos adicionados

- `api/mercadolivre/health.js`
- `api/mercadolivre/notifications.js`
- `api/mercadolivre/parse-link.js`
- `api/jobs/mercadolivre-notifications.js`
- `migrations/026_meli_notifications.sql`
- `migrations/027_marketplace_social_profile.sql`
- `migrations/028_meli_notification_processing.sql`
- `migrations/029_meli_notification_dispatch.sql`

## Arquivos alinhados

- `api/mercadolivre/products.js`
- `api/links/convert.js`

## Testes reais realizados no Hatchable

- `GET /api/mercadolivre/health` como membro: HTTP 412, conta de teste não conectada por OAuth.
- A mesma rota como anônimo: HTTP 401, bloqueio de acesso correto.
- `GET /api/mercadolivre/notifications`: HTTP 200 e `ready: true`; isso comprova que a rota e o App ID estão presentes, não o processamento ponta a ponta de notificações.
- `GET /api/mercadolivre/products` como membro: HTTP 412, conexão necessária.
- `GET /api/mercadolivre/products` como administrador: HTTP 200 com resultados de catálogo identificados como descoberta, sem autorização para publicação automática.
- `POST /api/links/convert` com URL do Mercado Livre: HTTP 412 e `conversionDisabled: true`, comportamento de segurança esperado.
- `GET /api/readiness` como anônimo: HTTP 401; a rota exige membro.
- Logs das últimas 24h: duas respostas HTTP 503 em `/api/n8n/pairing`.

## Bloqueios externos e limites

- `N8N_WEBHOOK_SECRET` não está configurado/disponível no ambiente consultado. O pareamento n8n não deve ser marcado como funcional até o titular cadastrar o segredo em armazenamento seguro e testar o HMAC ponta a ponta.
- O OAuth do Mercado Livre não estava ativo na conta usada no teste. Não foram feitos testes de publicação nem de comissão.
- Telegram: um teste anterior sem ID oficial de destino retornou HTTP 400. Não foi enviada mensagem real.
- WhatsApp/n8n: não houve entrega real; o fluxo exige segredo, credenciais e destino autorizado.
- A existência de variáveis de configuração do Telegram/Mercado Livre não comprova credenciais válidas nem operação externa.
- A versão Hatchable não possui a coluna `promo_groups.whatsapp_destination_type`; portanto, a implementação standalone de `main` que depende dessa coluna não deve ser copiada cegamente para o Hatchable.
- O arquivo `api/n8n/bridge.js` do GitHub contém uma proteção adicional para claims antigos e um filtro de tipo de destino. O filtro depende de esquema que não existe no banco Hatchable observado; qualquer backport deve portar apenas a lógica compatível e ser testado antes do deploy.

## Critério de conclusão

Esta proposta documenta a reconciliação no GitHub, mas não declara as integrações externas funcionais. Após o CI da branch, revisar o diff e decidir o merge. Depois, sincronizar explicitamente as mudanças compatíveis ao Hatchable, executar testes de contrato e somente então considerar deploy. A configuração do segredo n8n exige ação segura do titular; nenhum segredo deve ser commitado ou enviado em mensagens.
