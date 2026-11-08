# Rakuten Advertising — ficha de integração

## Evidência observada
Há rota api/integrations/rakuten no inventário Hatchable. O uso de uma base URL ou nome de serviço em código não prova que credenciais, conta publisher ou endpoints estejam autorizados.

## Verificações obrigatórias
- Confirmar documentação oficial vigente e produto/API habilitado.
- Mapear autenticação, publisher account, advertiser permissions e limites.
- Confirmar endpoints, paginação, filtros, produtos/ofertas e campanhas.
- Verificar criação de tracking links, parâmetros e SubID.
- Registrar políticas de conteúdo, imagens e atribuição.
- Testar erros, retries, rate limits e reconciliação.

## Estado
Rota presente; integração não validada ponta a ponta nesta auditoria.

## Adendo de auditoria — 08/11/2026, parecer35

Leitura advertisers com token salvo falhou(status normalizado502), sem acionar refresh. O status VALIDATED de31/10 é histórico e não homologa a operação atual. Diagnosticar expiração, escopos, parceria e resposta oficial sem expor token.

Evidências e limitações: [relatório consolidado](../AUDITORIA-CONTINUIDADE-2026-11-08.md) e `../audit-evidence/2026-11-08/`. Os probes de fornecedores executaram helpers derivados no isolate; não equivalem a importar e homologar toda a rota implantada. Sem mensagem, migration, token renovado ou deploy.
