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

## Adendo de auditoria — 08/11/2026, parecer35

Achado F01: topRequest verifica error_response, mas não verifica resp_result.resp_code. A consulta de leitura retornou envelope com resp_code405 e zero itens; a checagem superficial poderia marcar sucesso. Não classificar credencial como validada por esse resultado; corrigir envelope e testes antes de homologar. Nenhuma credencial/status foi alterado.

Evidências e limitações: [relatório consolidado](../AUDITORIA-CONTINUIDADE-2026-11-08.md) e `../audit-evidence/2026-11-08/`. Os probes de fornecedores executaram helpers derivados no isolate; não equivalem a importar e homologar toda a rota implantada. Sem mensagem, migration, token renovado ou deploy.
