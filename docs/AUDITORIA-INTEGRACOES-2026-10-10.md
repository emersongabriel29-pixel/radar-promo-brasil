# Auditoria e reconciliação de integrações — 2026-10-10

## Estado de referência

- Projeto Hatchable: Radar Promo Brasil, versão publicada 113 (deploy em 2026-10-10).
- Repositório: `emersongabriel29-pixel/radar-promo-brasil`.
- Base GitHub observada: `71efa8a13379b4dde060ca93d0e1839348073233` (`main`).
- A proposta principal está na branch de auditoria e não altera `main`. Uma correção pequena e segura de diagnóstico foi publicada separadamente no Hatchable v113; a correção do parser de `items_prices` está salva como rascunho para v114.

## Divergências reconciliadas nesta proposta

- Foram adicionadas ao repositório as rotas que existem no Hatchable e faltavam no GitHub: `api/mercadolivre/health.js`, `api/mercadolivre/notifications.js`, `api/mercadolivre/parse-link.js` e `api/jobs/mercadolivre-notifications.js`.
- O código de `api/mercadolivre/products.js` foi alinhado ao comportamento publicado: busca de catálogo para descoberta, indicação explícita de que catálogo não confirma anúncio comprável e `safeToAutoPublish: false`.
- Revisão adicional identificou que o processador rejeitava o formato oficial de recurso `items_prices` (`/items/{id}/prices`). O parser foi corrigido no código-fonte Hatchable e nesta branch para aceitar somente esse caminho adicional quando o tópico for `items_prices`; o deploy v114 ainda está pendente de CI.
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
- O endpoint de saúde executado com o membro de teste retornou HTTP 412 porque aquela conta não tinha conexão própria. Separadamente, uma conexão OAuth ativa já armazenada foi validada por GET somente-leitura a `https://api.mercadolibre.com/users/me`: HTTP 200, identidade retornada, sem expor nem alterar token. Isso comprova conectividade de uma conta, não todas as contas, nem publicação ou comissão.
- Telegram: o token configurado passou uma chamada oficial somente-leitura `getMe` (HTTP 200). Existe uma conexão Telegram ativa e um grupo ativo com ID; nenhuma mensagem foi enviada, portanto entrega ponta a ponta permanece não testada.
- WhatsApp/n8n: zero conexões WhatsApp; nove grupos WhatsApp estão pausados e sem ID externo. `WHATSAPP_API_URL`, `WHATSAPP_API_TOKEN` e `N8N_WEBHOOK_SECRET` não estão configurados; não houve entrega real.
- O segredo `API_CREDENTIALS_MASTER_KEY` está ausente e a tabela `account_api_credentials` está vazia; assim, credenciais de API por conta (incluindo Lomadee/custom) não foram cadastradas por esse mecanismo. A busca no código Hatchable encontrou Lomadee apenas como opção de metadados/UI em `api/integrations/apis.js`; não foi encontrada implementação de cliente/SDK ou fluxo de API Lomadee. Classificação: **não implementada e não configurada**. `RUNWAY_API_KEY`, `META_PAGE_ACCESS_TOKEN`, `META_FACEBOOK_PAGE_ID` e `META_INSTAGRAM_ACCOUNT_ID` também não estão configurados.
- No banco consultado: 2 contas, 0 ofertas, 0 publicações e 0 eventos de notificação Mercado Livre. Há 10 grupos cadastrados, mas apenas o grupo Telegram aparece ativo; os nove grupos WhatsApp estão pausados. Isso impede comprovar o fluxo comercial completo mesmo quando um token de provedor é válido.
- A existência de variáveis de configuração do Telegram/Mercado Livre não comprova credenciais válidas nem operação externa.
- A versão Hatchable não possui a coluna `promo_groups.whatsapp_destination_type`; portanto, a implementação standalone de `main` que depende dessa coluna não deve ser copiada cegamente para o Hatchable.
- O arquivo `api/n8n/bridge.js` do GitHub contém uma proteção adicional para claims antigos e um filtro de tipo de destino. O filtro depende de esquema que não existe no banco Hatchable observado; qualquer backport deve portar apenas a lógica compatível e ser testado antes do deploy.

## Ajuste de diagnóstico preparado (ainda não publicado)

- Em `api/n8n/pairing.js`, o código-fonte Hatchable foi ajustado para tratar `config.get('N8N_WEBHOOK_SECRET')` ausente/não declarado e devolver um 503 específico e acionável, em vez de cair no erro genérico. A mesma alteração está nesta branch GitHub. Os arquivos conferem ignorando somente a quebra de linha final.
- Hatchable continua publicado na versão 112; o ajuste está salvo como rascunho e **não está ativo em produção**. Não foi criado nem alterado segredo. Publicação fica pendente da configuração segura e da homologação do fluxo.

## Critério de conclusão

Esta proposta documenta a reconciliação no GitHub, mas não declara as integrações externas funcionais. Após o CI da branch, revisar o diff e decidir o merge. Depois, sincronizar explicitamente as mudanças compatíveis ao Hatchable, executar testes de contrato e somente então considerar deploy. A configuração do segredo n8n exige ação segura do titular; nenhum segredo deve ser commitado ou enviado em mensagens.
