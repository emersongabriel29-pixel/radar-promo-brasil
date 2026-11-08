# Filas e processamento confiável

## Requisitos
Persistência no banco; estados explícitos; prioridade; created_at/available_at; lease; claim atômico; idempotency key; retry com backoff/jitter; dead-letter/quarentena; recuperação de lease expirado; auditoria; métricas de idade e profundidade.

## Nunca perder trabalho
Sem capacidade, manter pendente e reagendar. Não excluir, sobrescrever ou marcar concluído sem evidência. Retenção/arquivamento exige política explícita e auditável.

## Backpressure
Produtores e consumidores têm orçamentos distintos. Reduzir lotes e ritmo quando banco/hospedagem saturar, preservando cursor e fila.

## Duplicidade
Lease, chave idempotente e constraint adequada. Antes de repetir ação externa, consultar resultado anterior quando possível.

## Justiça
Aging para evitar starvation. Fatia de capacidade por integração ativa, ponderada por cota externa, backlog, urgência e saúde. Nenhuma API monopoliza workers permanentemente.

## Painel
Pendentes, em execução, atrasadas, retries, quarentena, idade p50/p95, vazão, falhas e próxima execução. Diferenciar fila vazia, ausência de novidades, worker parado e consulta falha.