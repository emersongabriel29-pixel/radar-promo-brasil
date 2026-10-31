# Limpeza segura de ofertas — ciclo de 48 horas

O worker `/api/jobs/offer-retention` usa um agendamento one-shot autorrenovável. Cada execução agenda a próxima para exatamente 48 horas depois, com um nome estável para evitar a criação de tarefas duplicadas. Não há cron horário nem chamadas recorrentes intermediárias.

## Regras de retenção

- Remove em lotes de até 500 itens de descoberta antigos há mais de 48 horas, somente nos estados `DISCOVERED`, `INCOMPLETE`, `FAILED` ou `DUPLICATE`, e somente quando `offer_id IS NULL`.
- Preserva itens bloqueados por segurança, itens importados/vinculados e qualquer item ligado a uma oferta.
- Remove em lotes de até 100 ofertas com mais de 48 horas somente quando ainda estão em `PENDING` ou `REJECTED`, não têm validação confirmada, não aparecem na vitrine e não possuem publicação, histórico de preço ou referência na fila de descoberta.
- Ofertas aprovadas/publicadas, confirmadas, visíveis, publicadas ou com histórico comercial nunca são removidas por este worker.
- Não altera publicações, links afiliados, credenciais, preços ou histórico de vendas.
- O worker não chama APIs de marketplace e não envia mensagens.

## Ativação após revisão e implantação

1. Revisar e integrar a branch/PR conforme o fluxo do projeto.
2. Publicar a versão Hatchable que contém o endpoint.
3. Inicializar uma única vez a tarefa agendada executando `POST /api/jobs/offer-retention` como `scheduler`, com o corpo `{"armOnly":true}` (via `run_function` no console Hatchable).
4. Confirmar a resposta `armed: true` e o campo `nextRunAt`. A partir daí, cada execução agenda a próxima automaticamente.

A inicialização não executa exclusões. A primeira limpeza ocorre somente depois do primeiro disparo agendado, 48 horas depois. Não acione a rota sem `armOnly` para testar em produção.

## Limites e espaço

Cada execução é limitada a 500 itens de descoberta e 100 ofertas, para evitar picos de carga. O PostgreSQL normalmente torna o espaço de linhas excluídas reutilizável após VACUUM/autovacuum; um DELETE não garante redução imediata do tamanho físico do banco.
