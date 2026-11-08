# Shopee — ficha de integração

## Evidência observada
Há código em api/integrations/shopee e api/jobs/shopee.js; função agendada /api/jobs/shopee. A implementação importa utilitários de retry, códigos de erro, fingerprint, validação de URL/imagem, classificação e seleção de palavras-chave. O arquivo contém comentário indicando que itens do catálogo não são filtrados por categoria.

## Verificações obrigatórias
- Confirmar documentação oficial vigente da Affiliate Open API e operações GraphQL utilizadas.
- Conferir assinatura, timestamp, credencial, permissões e limites publicados.
- Validar paginação, cursores, filtros, ordenação e cobertura real do catálogo.
- Conferir códigos de erro, retry-after, timeout e backoff.
- Verificar campos de preço, moeda, estoque, imagem, comissão e URL de afiliado.
- Testar preservação de SubID e destino final.
- Medir novos itens por chamada e custo por oportunidade.

## Isolamento
Configuração, cota, cursor, circuit breaker e fila Shopee independentes. Erro Shopee não pausa outros fornecedores.

## Estado
Código presente; não classificar como fluxo ponta a ponta testado nesta documentação. O resumo de cron consultado em 08/11/2026 registrou 6 erros em 118 execuções de 7 dias; investigar sem presumir causa.

## Diagnóstico de API e worker
A credencial passou em teste somente leitura em 08/11/2026: 1 produto retornado em 3,3s, sem criar oferta/link/publicação. A API respondeu `10000` em consultas de descoberta; documentação pública consultada classifica `10000` como System Error e `10030` como Rate Limit. Os erros `10010` no relatório de conversões em 01/11 vieram de versões anteriores das queries; o código atual declara `Int64` e `DisplayOrderStatus`, mas ainda requer teste de relatório com autorização e janela de dados apropriada. Não confundir autenticação válida com todas as operações validadas.
