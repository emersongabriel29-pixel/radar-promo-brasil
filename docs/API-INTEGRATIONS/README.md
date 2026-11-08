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

| Fornecedor | Estado observado em 08/11/2026 |
|---|---|
| Shopee | Credencial VALIDATED, mas last_checked 01/11 e last_error `shopee_api_10000`; operação precisa de diagnóstico |
| Lomadee | Credencial VALIDATED, verificada 08/11; fila de link com backlog |
| AliExpress | Credencial VALIDATED, verificada 08/11 |
| Rakuten | Credencial VALIDATED, última checagem 31/10 |
| Magalu | PENDING_VALIDATION; fluxo de afiliado no código é manual, não confundir com API seller OAuth |
| Mercado Livre | Credenciais de app em configuração de projeto; estado de autorização OAuth da conta precisa de verificação separada |
| Amazon | Sem registro de credencial no inventário consultado |
| Admitad | Sem registro de credencial no inventário consultado |
| Awin | Sem registro de credencial no inventário consultado |
| Temu | Fluxo manual de link oficial; sem API de afiliados validada |
| SHEIN | Fluxo manual de link oficial; sem API de afiliados validada |
| Collshp | Importação de vitrine pública; tracking não validado |


## Atualização de evidências — parecer35

Preferir o [último parecer consolidado](../AUDITORIA-CONTINUIDADE-2026-11-08.md) aos estados históricos acima: leitura Shopee/Lomadee positiva em uma operação; AliExpress erro de negócio405; Rakuten falha com token salvo; Mercado Livre dois tokens401; Magalu sem TenantID. Amazon retornou412 sem credenciais; Admitad/Awin NOT_CONFIGURED; Temu/SHEIN são workflows manuais. Nenhum teste completo de atribuição, comissão ou entrega foi aprovado.
