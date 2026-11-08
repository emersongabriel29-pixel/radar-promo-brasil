# Estado observado — 08/11/2026

Fotografia de auditoria; não é garantia de estado futuro. Horários do provedor podem estar em UTC.

## Identidade
Repo emersongabriel29-pixel/radar-promo-brasil; branch main. Commit mais recente retornado: 0146ab018adbdd15c0d92b65f9f0ef084158c906. Hatchable proj_1Xj94QxQmCam, versão live 645. Deploy 645 informa 272 arquivos e 130 funções; inventário posterior consultado retornou 275 arquivos. Sincronização bidirecional não demonstrada.

## Divergências
GitHub package.json contém build, test, test:e2e, check:release e dependências do projeto. Hatchable package.json contém apenas test: node --test e metadata de atualização em 09/09/2026. hatchable.toml, api/jobs/hourly.js, api/jobs/shopee.js, api/jobs/lomadee-link-queue.js e api/jobs/api-health.js apresentaram conteúdo/comprimento diferente entre plataformas. docs/ não aparece no inventário Hatchable. Não copiar nem sobrescrever sem reconciliação arquivo a arquivo.

## Scheduler
38 tarefas reportadas, entre declaradas e one-shots armadas/concluídas/desabilitadas. Duas entradas armed de /api/jobs/recurrence. Há históricos de one-shot de /api/jobs/lomadee-link-queue; alguns concluídos com HTTP 500. Não excluir registros automaticamente.

## Erros em cron — janela de 7 dias
- /api/jobs/hourly: 40 erros / 147 execuções.
- /api/jobs/lomadee-link-queue: 12 / 124.
- /api/jobs/shopee: 6 / 118.
- /api/jobs/telegram: 1 / 478.
- /api/jobs/lomadee: 1 / 147.

## Erros em funções — janela de 24 horas
- /api/jobs/hourly: 8 / 23.
- /api/jobs/lomadee-link-queue: 1 / 19.
- /api/jobs/shopee: 5 / 14.
- /api/telegram/diagnostics: 9 / 29.

Janelas e fontes diferem; não somar os contadores. last_error nulo não apaga erros históricos.

## Pendências
1. Comparar integralmente arquivos divergentes e definir fonte de verdade por arquivo.
2. Investigar erros de hourly, Lomadee link queue, Shopee e diagnostics Telegram.
3. Auditar one-shots e duplicidades sem apagar.
4. Confirmar cotas reais do plano e métricas disponíveis.
5. Inspecionar schema, migrations e dados antes de mudanças.
6. Testar em ambiente seguro, sem disparar mensagem/publicação real.

Não foram executados workers reais nem alterados filas, credenciais, banco, cron ou deploy nesta auditoria.

## Atualização operacional após revisão complementar
- O limite real observado no plano Free é 200 execuções one-shot agendadas por projeto/dia UTC. Logs de `/api/jobs/hourly` retornaram HTTP 500 porque `recoverRecurrences()` chamava `scheduler.now('/api/jobs/telegram')` repetidamente e o scheduler rejeitava novas execuções com HTTP 422.
- A correção foi preparada para remover esse fan-out dentro de `runSchedule()`. As publicações permanecem persistidas como READY; o cron horário Telegram é o consumidor durável. Atraso máximo esperado do despacho recorrente: até o próximo ciclo horário, sujeito à saúde da função.
- Na janela de 2h consultada, `/api/jobs/hourly` teve execução HTTP 200 sem erros. Os contadores de 7 dias continuam históricos e não devem ser interpretados como falha atual.
- `/api/jobs/shopee`: houve timeouts 504 por exceder 65 segundos (5 erros/14 execuções na janela de 24h consultada). A rotina atual combina descoberta multipágina em muitas palavras-chave, passagens de lojas/campanhas e processamento de ofertas no mesmo worker. Reduzir escopo sem medir pode prejudicar cobertura; separar em lotes persistentes exige trabalho próprio e testes de regressão.
- `/api/jobs/lomadee-link-queue`: 1 erro 500/19 execuções em 24h; o log não trouxe mensagem de erro. O worker marca falhas individuais na fila e retorna 500 quando há qualquer item falho. É necessário correlacionar `processing_error` dos itens e resposta do provedor antes de alterar.
- `/api/telegram/diagnostics`: 9 erros/29 execuções em 24h; requer leitura dos logs específicos antes de qualquer correção.
- Dois one-shots `/api/jobs/recurrence` permanecem armados para dois `scheduleId` diferentes da mesma conta. Não foram apagados porque podem representar recorrências legítimas; validar os registros `schedules` e seus destinos antes de deduplicar.
- O cron Telegram recorrente está ativo em `0 * * * *`; o job hourly também executou com HTTP 200 na última janela de 2h consultada.


## Snapshot de dados em produção — consulta somente leitura, 08/11/2026 por volta de 12:01 UTC
- Publicações: 2.666 PUBLISHED; 2.389 READY; 37 RETRY; 136 FAILED; 4 WAITING_CONFIRMATION. A fila READY/RETRY não foi disparada nem limpa nesta auditoria porque isso enviaria mensagens reais. Os 136 FAILED e 4 WAITING_CONFIRMATION exigem revisão de causa e confirmação de entrega antes de qualquer reenvio.
- READY por destino: Ofertas 1.493; Moda & Beleza 389; Tech & Eletrônicos 222; Baby e Kids 187; Casa & Lar 84; Pet 10; Auto/Moto 4. A fila contém registros antigos desde 04/11.
- Shopee: 66.044 DISCOVERED; 2.052 IMPORTED; 184 BLOCKED; 75 DUPLICATE; 15 INCOMPLETE. Credencial está VALIDATED, porém last_checked em 01/11 e last_error `shopee_api_10000`; investigar autenticação/erro antes de reativar ingestão ampla.
- Lomadee: 1.793 READY_FOR_LINK; 345 LINKED; 662 DUPLICATE; 209 DISCOVERED; 159 BLOCKED_SAFETY; 27 BLOCKED_PROVIDER_APPROVAL; 17 BLOCKED_PROVIDER_CHANNEL; 26 NEEDS_DATA. Credencial VALIDATED e last_checked em 08/11 12:01 UTC.
- AliExpress: credencial VALIDATED e checada em 08/11 11:25 UTC. Rakuten: VALIDATED, última checagem 31/10. Magalu: PENDING_VALIDATION.
- Dois agendamentos ativos na mesma conta, destino `@radarpromobrasil1`, ambos DAILY 09:00: um chamado “Shopee” com mensagem “Fone de ouvido promoções”; outro com nome do proprietário e mensagem “Oi”. São registros distintos e foram preservados; revisar se ambos são intencionais.
- Grupo Pet está INACTIVE; os demais grupos consultados estavam ACTIVE.
- O diagnóstico Telegram teve respostas 200 e 502 intercaladas em 08/11. Os logs não guardam corpo da resposta para os 502; não é possível atribuir a falha a token, chat ou permissão sem novo diagnóstico controlado. Nenhuma mensagem foi enviada nesta auditoria.

Esses números são fotografia de produção, não alvo para zerar indiscriminadamente. READY são mensagens reais ainda não entregues; FAILED e WAITING_CONFIRMATION exigem reconciliação para evitar duplicidade. Nenhuma oferta, publicação, agendamento, credencial ou fila foi apagada ou reenviada.


## Correção de recorrências — observação complementar
Após o deploy v646, dois registros `schedules` estavam ativos e apontavam para IDs de tarefas one-shot com status `completed`, apesar de `next_run_at` futuro. O cron Telegram recorrente estava ativo. Isso indica ponteiro de scheduler obsoleto; foi preparada correção para nome determinístico único por ocorrência e rearmamento dos registros ativos sem apagar histórico. O rearmamento deve ser confirmado na lista de cron após a implantação.
