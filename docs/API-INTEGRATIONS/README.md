# Fichas por fornecedor

Estas fichas são contratos de auditoria, não certificações de integração funcional. A existência de rota/arquivo é evidência de código presente, não de credencial válida, permissão, quota conhecida ou fluxo completo testado.

| Fornecedor | Evidência de código observada | Estado nesta auditoria |
|---|---|---|
| Shopee | api/integrations/shopee; api/jobs/shopee.js | Implementação presente; fluxo ponta a ponta não validado nesta tarefa |
| Mercado Livre | api/jobs/mercadolivre-notifications; callbacks devem ser confirmados no inventário atual | Não validado nesta tarefa |
| Lomadee | api/integrations/lomadee; jobs lomadee, discovery-queue, link-queue e reconcile | Implementação presente; há erros operacionais registrados |
| AliExpress | api/integrations/aliexpress; api/jobs/aliexpress.js e aliexpress-review.js | Implementação presente; fluxo ponta a ponta não validado |
| Magalu | api/integrations/magalu e rotas connect/status/callback observadas | Implementação presente; OAuth e operação não validados |
| Rakuten | api/integrations/rakuten | Implementação presente; fluxo ponta a ponta não validado |

Para cada fornecedor preencher endpoint oficial, autenticação, escopos, limites, paginação, erros, dados, geração de link, SubID, política de conteúdo e evidência de teste. Não preencher lacunas por suposição.