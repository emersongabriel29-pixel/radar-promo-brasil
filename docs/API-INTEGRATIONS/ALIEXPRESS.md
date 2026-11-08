# AliExpress — ficha de integração

## Evidência observada
Há api/integrations/aliexpress, api/jobs/aliexpress.js e api/jobs/aliexpress-review.js. Scheduler observou tarefa horária para coleta e tarefa de revisão.

## Verificações obrigatórias
- Confirmar programa, portal e documentação oficial habilitados para a conta.
- Mapear OAuth/credenciais, escopos e renovação.
- Confirmar endpoints de produto, campanha, comissão e link realmente usados.
- Verificar paginação, limites, campos, moeda, idioma e disponibilidade.
- Validar deep link, tracking e SubID.
- Documentar erros, backoff e cache.
- Garantir que revisão não descarta itens sem motivo persistido.

## Estado
Código e agendamento presentes; integração não validada ponta a ponta nesta tarefa.