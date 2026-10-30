# Inteligência de afiliados — reconciliação da produção v493

## Estado da reconciliação

- Fonte auditada: Hatchable Radar Promo Brasil, produção v493 em 2026-10-30.
- Branch isolada: `codex/affiliate-intelligence-v493-20261030`.
- Base histórica: `codex/hatchable-github-reconciliation-20261029`, commit `ea9411fcff8f5d50c6d8ae9de8813dd14e2228dd`.
- PR draft #140 direcionado à branch de reconciliação, não à `main`.
- A listagem do Hatchable continha 207 caminhos; todos os 207 caminhos agora estão representados na branch. Arquivos extras do GitHub foram preservados.
- O conteúdo foi espelhado diretamente do Hatchable nos módulos atualizados de integrações, filas, Telegram/WhatsApp, validação, IA, configuração e interface. Isto não equivale a hash-a-hash de todos os 207 arquivos compartilhados; a equivalência integral ainda requer auditoria final.

## Fontes v493 espelhadas

Integrações e ingestão: `api/integrations/lomadee.js`, `api/integrations/lomadee-explorer.js`, `lib/lomadee-api.js`, `api/integrations/shopee.js`, `api/jobs/shopee.js`, `api/integrations/aliexpress.js`, `api/jobs/aliexpress.js`, `api/jobs/aliexpress-review.js`, `api/jobs/lomadee.js`, `api/jobs/lomadee-reconcile.js`, `api/jobs/marketplace-ingestion.js`, `api/integrations/amazon.js`, `api/integrations/magalu-clone.js`.

Preservação de canais, filas e validação: `api/n8n/telegram-tick.js`, `api/jobs/telegram.js`, `api/jobs/whatsapp-channel.js`, `api/n8n/bridge.js`, `lib/delivery.js`, `lib/telegram.js`, `lib/autopilot.js`, `api/jobs/autopilot.js`, `api/mercadolivre/parse-link.js`, `lib/offer-images.js`, `lib/promo-message.js`.

IA, extensão, configuração e interface: rotas atuais de IA, extensão, offer-builder, curator e social-media; helpers `lib/radar-ai.js`, `lib/radar-ai-guard.js`, `lib/marketplace-rotation.js`; `pages/index.js`, `public/radar.js`, `public/ai-usage.css`. O link para o painel foi incluído em Configurações > credenciais das lojas, sem criar uma oitava área de navegação.

`hatchable.toml` foi espelhado da produção; nenhum agendamento foi ativado ou alterado na instância ativa.

## Migrations

Os prefixos numéricos não são globalmente únicos entre os históricos. Os nomes completos são distintos e foram preservados, sem renumerar migrations históricas. Foram adicionadas as migrations de notificações Mercado Livre, rotação, validação Lomadee, Shopee Video, offer-builder, tokens de extensão, inteligência de IA e quota Gemini, além da migration 049 de auditoria.
A migration `050_affiliate_discovery.sql` foi criada nesta branch e ainda não foi aplicada no banco ativo. Nenhuma migration foi executada nesta tarefa.

## Inteligência adicionada

- `GET /api/affiliate/intelligence`: endpoint autenticado e somente leitura.
- `public/affiliate-intelligence.html`, `public/affiliate-intelligence.css`, `public/affiliate-intelligence.js`: painel e explorador manual com CSS/JS externos compatíveis com CSP.
- Consultas manuais: auditoria Lomadee, auditoria AliExpress, produtos/lojas/campanhas Shopee, feeds FULL/DELTA e conversões Shopee. Cada operação pede confirmação e não publica.
- `lib/affiliate-intelligence.js`: score explicável com score do Radar, cliques, pedidos e comissões observados.
- `migrations/050_affiliate_discovery.sql`: estrutura para execuções paginadas e catálogo descoberto.
- Testes de score e correção do parser Telegram para mensagem com um único link afiliado permitido.

## Evidência comercial e lacunas

Na consulta ao banco de produção: 31 cliques Shopee, 27 AliExpress, 1 Lomadee; não havia linhas em `affiliate_sales`. Os endpoints atuais retornam pedidos/conversões, mas não gravam essas respostas em `affiliate_sales`; a sincronização idempotente do livro de vendas ainda precisa ser implementada.
Comissão registrada não é lucro líquido. Custos, estornos, devoluções e atribuição precisam ser conciliados.

## CI e regressões

- CI #1007: sucesso após correção do parser de link afiliado único.
- CI #1008: sucesso após inclusão dos arquivos de integração/IA e migrations faltantes.
- CI #1009: falhou depois do espelhamento dos módulos v493 restantes. As falhas eram testes antigos que presumiam URL síncrona de mídia, limite diário artificial no autopilot e comparação SQL que não aceitava `IS NOT DISTINCT FROM`. Os testes foram atualizados para o comportamento atual da produção, sem reintroduzir limites ou alterar código de entrega.

## Segurança e implantação

- Não altera `main`, não faz merge e não faz deploy.
- Não aplica migrations no banco ativo.
- Não ativa nem altera agendamentos.
- Não executa consultas externas durante a atualização do código.
- Nenhuma oferta foi importada, aprovada ou publicada; nenhuma mensagem foi enviada a Telegram/WhatsApp.
- Nenhuma credencial ou segredo foi alterado.

## Próximas etapas

1. Concluir hash-a-hash dos 207 arquivos compartilhados.
2. Implementar sincronização manual e idempotente de pedidos/comissões das três APIs para `affiliate_sales`, sem dados pessoais.
3. Implementar coletores paginados com cursor persistente para campanhas, marcas, lojas e produtos.
4. Gravar catálogo descoberto sem aprovar/publicar ofertas automaticamente.
5. Conciliar estornos, devoluções, custos e atribuição antes de calcular lucro.
6. Executar CI verde, testes de isolamento e regressão Telegram/WhatsApp.
7. Só depois de revisão e autorização separada, planejar merge e deploy.
