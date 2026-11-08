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