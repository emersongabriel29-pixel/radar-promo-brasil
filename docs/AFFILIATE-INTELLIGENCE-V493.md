# Inteligência de afiliados — reconciliação da produção v493

## Estado da reconciliação

- Fonte auditada: Hatchable Radar Promo Brasil, produção v493 em 2026-10-30.
- Branch isolada: `codex/affiliate-intelligence-v493-20261030`.
- Base histórica: `codex/hatchable-github-reconciliation-20261029`, commit `ea9411fcff8f5d50c6d8ae9de8813dd14e2228dd`.
- PR draft #140 direcionado à branch de reconciliação, não à `main`.
- A listagem do Hatchable continha 207 caminhos; todos os 207 caminhos estão representados na branch. Arquivos extras do GitHub foram preservados.
- O conteúdo foi espelhado diretamente do Hatchable nos módulos atualizados de integrações, filas, Telegram/WhatsApp, validação, IA, configuração e interface. Isso não equivale a hash-a-hash de todos os 207 arquivos compartilhados; a equivalência integral ainda requer auditoria final.

## Fontes v493 espelhadas

Integrações e ingestão: `api/integrations/lomadee.js`, `api/integrations/lomadee-explorer.js`, `lib/lomadee-api.js`, `api/integrations/shopee.js`, `api/jobs/shopee.js`, `api/integrations/aliexpress.js`, `api/jobs/aliexpress.js`, `api/jobs/aliexpress-review.js`, `api/jobs/lomadee.js`, `api/jobs/lomadee-reconcile.js`, `api/jobs/marketplace-ingestion.js`, `api/integrations/amazon.js`, `api/integrations/magalu-clone.js`.

Preservação de canais, filas e validação: `api/n8n/telegram-tick.js`, `api/jobs/telegram.js`, `api/jobs/whatsapp-channel.js`, `api/n8n/bridge.js`, `lib/delivery.js`, `lib/telegram.js`, `lib/autopilot.js`, `api/jobs/autopilot.js`, `api/mercadolivre/parse-link.js`, `lib/offer-images.js`, `lib/promo-message.js`.

IA, extensão, configuração e interface: rotas atuais de IA, extensão, offer-builder, curator e social-media; helpers `lib/radar-ai.js`, `lib/radar-ai-guard.js`, `lib/marketplace-rotation.js`; `pages/index.js`, `public/radar.js`, `public/ai-usage.css`. O link do painel foi incluído em Configurações > credenciais das lojas. O item preexistente “Consumo de IA” foi movido para uma subárea de Configurações, preservando a funcionalidade e mantendo as sete áreas principais solicitadas. `hatchable.toml` foi espelhado da produção; nenhum agendamento foi alterado na instância ativa.

## Inteligência e sincronização comercial adicionadas

- `GET /api/affiliate/intelligence`: endpoint autenticado e somente leitura.
- `public/affiliate-intelligence.html`, `public/affiliate-intelligence.css`, `public/affiliate-intelligence.js`: painel e explorador manual com CSS/JS externos compatíveis com CSP.
- Consultas manuais: auditoria Lomadee, auditoria AliExpress, produtos/lojas/campanhas Shopee, feeds FULL/DELTA e conversões Shopee.
- Sincronização manual do livro de vendas: pedidos Lomadee, pedidos AliExpress e conversões Shopee são normalizados e gravados em `affiliate_sales` com chave idempotente `(account_id, marketplace, external_id)`.
- A sincronização exige credencial validada no provedor, armazena apenas identificadores, status, data, valores, comissão e subID — não dados pessoais de compradores.
- A sincronização é manual e limitada à primeira página por chamada (Lomadee 100, AliExpress 50, Shopee 100). O retorno indica paginação/cursor quando fornecido; não há rotina recorrente nova.
- `lib/affiliate-intelligence.js`: score explicável com qualidade do Radar, cliques, pedidos e comissões observados. Score não é lucro.
- `migrations/050_affiliate_discovery.sql`: estrutura para execuções paginadas e catálogo descoberto.

## Evidência comercial e limites

Na consulta ao banco de produção: 31 cliques Shopee, 27 AliExpress, 1 Lomadee; não havia linhas em `affiliate_sales`. Os novos sincronizadores estão apenas na branch e não foram executados contra as APIs; portanto, ainda não há pedidos ou comissões novos confirmados.
Comissão registrada não é lucro líquido. Custos, estornos, devoluções e atribuição precisam ser conciliados antes de calcular rentabilidade.

## Migrations

Os prefixos numéricos não são globalmente únicos entre os históricos. Os nomes completos são distintos e foram preservados. Foram adicionadas as migrations de notificações Mercado Livre, rotação, validação Lomadee, Shopee Video, offer-builder, tokens de extensão, inteligência de IA e quota Gemini, além da migration 049 de auditoria.
A migration `050_affiliate_discovery.sql` foi criada nesta branch e ainda não foi aplicada no banco ativo. Nenhuma migration foi executada nesta tarefa.

## CI e regressões

- CI #1007 e #1008: sucesso.
- CI #1009: falhou após espelhamento v493 por testes antigos que presumiam URL síncrona de mídia, limite diário artificial no autopilot e comparação SQL sem suporte a `IS NOT DISTINCT FROM`.
- CI #1010: restou uma asserção de teste antiga que esperava uma rota privada de imagem removida do helper atual. O teste foi atualizado para validar a URL real do storage configurado. A próxima CI valida também a nova sincronização de vendas.

## Segurança e implantação

- Não altera `main`, não faz merge e não faz deploy.
- Não aplica migrations no banco ativo.
- Não ativa nem altera agendamentos.
- Não executa consultas externas durante a atualização do código.
- Nenhuma oferta foi importada, aprovada ou publicada; nenhuma mensagem foi enviada a Telegram/WhatsApp.
- Nenhuma credencial ou segredo foi alterado.

## Próximas etapas

1. Concluir hash-a-hash dos 207 arquivos compartilhados.
2. Validar a primeira sincronização de pedidos/comissões por API, manualmente e com escopo confirmado.
3. Implementar paginação retomável persistente para pedidos e catálogos.
4. Implementar coletores paginados para campanhas, marcas, lojas e produtos, sem aprovação/publicação automática.
5. Conciliar estornos, devoluções, custos e atribuição antes de calcular lucro.
6. Executar CI verde, testes de isolamento e regressão Telegram/WhatsApp.
7. Só depois de revisão e autorização separada, planejar merge e deploy.
