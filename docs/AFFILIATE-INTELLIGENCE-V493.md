# Inteligência de afiliados — reconciliação da produção v493

- Fonte de dados consultada: projeto Hatchable Radar Promo Brasil, produção v493 em 2026-10-30.
- Branch base: codex/hatchable-github-reconciliation-20261029, commit ea9411fcff8f5d50c6d8ae9de8813dd14e2228dd.
- Esta branch é isolada: não altera main, não faz merge e não faz deploy.
- Os arquivos de integração listados abaixo foram espelhados do conteúdo atual do Hatchable, sem copiar credenciais/segredos.

## Arquivos espelhados
api/integrations/lomadee.js; api/integrations/lomadee-explorer.js; lib/lomadee-api.js; api/integrations/shopee.js; api/integrations/aliexpress.js; api/jobs/shopee.js; api/jobs/aliexpress.js; api/jobs/lomadee-reconcile.js; api/jobs/marketplace-ingestion.js; migrations/049_marketplace_api_audit.sql.

## Implementação adicionada
- GET /api/affiliate/intelligence: endpoint autenticado, somente leitura.
- public/affiliate-intelligence.html: painel de indicadores, auditorias e ranking.
- lib/affiliate-intelligence.js: score explicável com sinais observados.
- migrations/050_affiliate_discovery.sql: tabelas para execuções paginadas e itens de catálogo.
- tests/affiliate-intelligence.test.mjs: testes de ausência de cliques, conversão e limites.

## Semântica e limites
Cliques vêm de click_events; pedidos e comissões vêm de affiliate_sales. Conversão é nula sem cliques. Comissão não é lucro líquido: custos, estornos e devoluções precisam de conciliação. A auditoria de API não é catálogo completo. Itens descobertos só aparecem depois que coletores gravarem em affiliate_discovery_items.

## Segurança e implantação
A migration 050 não foi aplicada em produção. Nenhum endpoint externo foi chamado por este commit. Nenhuma rotina recorrente foi ativada. Nenhuma oferta foi importada/aprovada/publicada. Nenhuma mensagem Telegram/WhatsApp foi enviada. O painel só estará disponível após revisão, merge autorizado e deploy controlado.

## Próximas etapas
1. Adaptadores paginados e retomáveis por provedor, com cursor e limite por execução.
2. Persistir campanhas, marcas, lojas e produtos sem aprovar/publicar automaticamente.
3. Gerar links com permissão confirmada e subId rastreável.
4. Ingerir pedidos/comissões com idempotência por conta, provedor e ID externo.
5. Conciliar atribuição, estornos, devoluções e custos.
6. Ativar agendamentos somente após medir cotas e testar regressão Telegram/WhatsApp.
