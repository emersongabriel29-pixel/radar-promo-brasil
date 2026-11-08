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