# Lomadee — ficha de integração

## Evidência observada
Há api/integrations/lomadee e tarefas /api/jobs/lomadee, /api/jobs/lomadee-discovery-queue, /api/jobs/lomadee-link-queue e /api/jobs/lomadee-reconcile. Existem migrações dedicadas à fila de descoberta e validação de links.

## Verificações obrigatórias
- Confirmar documentação oficial, base URL e endpoints utilizados.
- Mapear autenticação, publisher, canais, campanhas, marcas, produtos e limites.
- Verificar paginação, cursores e reconciliação de catálogo.
- Conferir transformação de URL curta, link afiliado e parâmetros de atribuição.
- Validar SubID e destino final.
- Confirmar schema da fila e compatibilidade da migração 060 com banco ativo.
- Medir retries, HTTP 500, itens por lote e backlog.

## Atenção operacional
Resumo de cron de 7 dias em 08/11/2026: link queue 12 erros/124 execuções; job Lomadee 1/147. Há one-shots históricos concluídos com HTTP 500. Não apagar registros nem reiniciar filas sem auditoria de estado.

## Estado
Código presente; fluxo ponta a ponta e credenciais não certificados por esta documentação.

## Adendo de auditoria — 08/11/2026, parecer35

Consulta somente leitura de produtos retornou um item em452ms. Não gerou link nem acionou worker. Backlog/falhas da linkqueue continuam pendentes. Documentação oficial consultada retornou403.

Evidências e limitações: [relatório consolidado](../AUDITORIA-CONTINUIDADE-2026-11-08.md) e `../audit-evidence/2026-11-08/`. Os probes de fornecedores executaram helpers derivados no isolate; não equivalem a importar e homologar toda a rota implantada. Sem mensagem, migration, token renovado ou deploy.
