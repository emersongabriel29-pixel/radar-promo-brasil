# Agendamentos

Cada tarefa tem dono, frequência, timezone, timeout, orçamento, idempotência e política de retry. Evitar cron duplicado e sobreposição; usar lock/lease.

Manter inventário de rota, cron, origem (declarado/armado), próxima/última execução, duração, sucesso/erro e dependências. Frequência considera frescor, custo e política do fornecedor; não usar polling agressivo.

Dividir trabalhos longos em lotes e persistir cursor. Se execução anterior estiver ativa, a nova não duplica trabalho. One-shot concluído/desabilitado não é tarefa recorrente ativa.

Testar timezone, fronteira horária, atraso, sobreposição, falha, reinício e retomada. Simular antes de habilitar em produção.