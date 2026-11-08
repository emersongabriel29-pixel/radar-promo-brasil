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