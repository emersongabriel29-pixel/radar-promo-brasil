# Agendamentos

Cada tarefa tem dono, frequência, timezone, timeout, orçamento, idempotência e política de retry. Evitar cron duplicado e sobreposição; usar lock/lease.

Manter inventário de rota, cron, origem (declarado/armado), próxima/última execução, duração, sucesso/erro e dependências. Frequência considera frescor, custo e política do fornecedor; não usar polling agressivo.

Dividir trabalhos longos em lotes e persistir cursor. Se execução anterior estiver ativa, a nova não duplica trabalho. One-shot concluído/desabilitado não é tarefa recorrente ativa.

Testar timezone, fronteira horária, atraso, sobreposição, falha, reinício e retomada. Simular antes de habilitar em produção.

## Recuperação de recorrências sem explosão de one-shots
`recoverRecurrences()` pode enfileirar várias publicações de uma vez. Não disparar `scheduler.now('/api/jobs/telegram')` dentro de cada recorrência: o cron Telegram recorrente já consome a fila persistente. A fila READY é a fonte de verdade; a execução agendada imediata é apenas um acelerador e não pode comprometer o limite diário da hospedagem.


## Identidade única por ocorrência
Cada ocorrência de uma recorrência precisa de nome de tarefa one-shot único e determinístico por `scheduleId + next_run_at`. Reutilizar apenas o nome estável da recorrência pode deixar o ponteiro do banco associado a uma tarefa já concluída, sem próxima execução ativa. Na recuperação, reconciliar ponteiros antigos com tarefas efetivamente ativas; não apagar histórico.


## Verificação de recorrências após v649
Dois schedules ativos foram rearmados com nomes determinísticos únicos por ocorrência: `recurrence-aa1cc821-2b16-4d34-9b08-bd3396b6427b-1794225600000` e `recurrence-1192b0c0-7d9e-42d5-ac5a-41a37568e468-1794225600000`. Ambos aparecem ACTIVE para 09/11/2026 12:00 UTC. O cron Telegram continua horário e as recorrências não criam um one-shot imediato por item enfileirado.
