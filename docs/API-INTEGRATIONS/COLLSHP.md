# Collshp — importação de vitrine

## Evidência no projeto
Arquivo `api/integrations/collshp-import.js`. Consulta GraphQL pública `https://collshp.com/api/v3/gql/graphql` para dados da vitrine e lista de links.

## Operação
Lê uma página de links (pageSize 40), valida URL pública collshp.com, filtra links de produto HTTPS de domínios Shopee aceitos e deduplica por URL. Retorna candidato de link afiliado e imagem quando disponível.

## Limitações
`affiliateTrackingVerified=false` e `canPublish=false`. A API pública da vitrine não comprova que cada link possui atribuição afiliada ativa. A rota não cria oferta nem publica.

## Estado
Importação de vitrine implementada; atribuição e comissão não validadas. Não contornar autenticação ou controles de acesso da vitrine.