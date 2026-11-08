# Observabilidade e relatórios

## Métricas
Descoberta por API: chamadas, páginas, itens recebidos/novos/atualizados/repetidos. Qualidade: pendentes, validados, bloqueados, links inválidos. Filas: profundidade, idade, vazão, lease expirado, retry e DLQ. Infra: invocações, duração, memória, consultas, conexões, armazenamento e cotas disponíveis. Canais: tentativas, confirmações, erros e latência. Afiliados: links, cliques e conversões confirmados. Scheduler: execução esperada/real, atraso e sobreposição.

## Dimensões
Segmentar por fornecedor, tarefa, ambiente, canal e período. Não somar janelas ou unidades diferentes.

## Logs
Estruturados com correlation_id, task_id, offer_id interno, fornecedor, etapa, duração e erro sanitizado. Proibir tokens, cookies, segredos e dados pessoais desnecessários.

## Alertas
Consumo anormal/previsão de cota; worker sem progresso; fila envelhecendo; API sem atividade esperada; erros 401/403/429/5xx; falha de publicação; cron divergente.

Painel deve exibir timestamp e fonte. Métrica ausente é “não disponível”, nunca zero. Diferenciar “sem oferta nova”, “não consultou” e “consulta falhou”.