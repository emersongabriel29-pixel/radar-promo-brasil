# Auditoria de desempenho e otimização conservadora — 12/11/2026

## Escopo e salvaguardas

Solicitação: investigar o consumo de 7.209/7.200 segundos de banco de dados do Hatchable e reduzir consultas desnecessariamente pesadas sem regressões.

Projeto: Radar Promo Brasil — `proj_1Xj94QxQmCam`.
Produção observada antes desta rodada: Hatchable v664.
Banco: PostgreSQL gerenciado pelo Hatchable.
Estado operacional informado pelo titular: chamadas de função pausadas até a reinicialização mensal de 02/12/2026.

A inspeção desta rodada foi somente leitura até as duas otimizações de código descritas abaixo. Não foram executados envios, publicação, importação, reprocessamento de filas, alterações de dados, alterações de credenciais, migrations, índices ou mudanças de cron. As otimizações foram inicialmente preparadas em WIP/branch isolada. Posteriormente, após autorização expressa do titular e registro da limitação operacional, o PR #195 foi integrado ao main e publicado no Hatchable v665.

## Evidências observadas

Janela principal: logs dos últimos sete dias disponíveis no Hatchable. Durações são duração total da função, não tempo ativo de CPU/SQL do PostgreSQL.

| Rota | Execuções | Resultado observado | Duração |
|---|---:|---|---|
| `/api/jobs/telegram` | 300 registros retornados (amostra truncada) | 297 HTTP 200, 3 HTTP 500 | mediana 5,976 s; máximo 73,542 s; 8 acima de 30 s |
| `/api/jobs/lomadee-reconcile` | 107 | 107 HTTP 200 | mediana 1,033 s; máximo 2,238 s |
| `/api/jobs/lomadee-link-queue` | 121 | 83 HTTP 200, 38 HTTP 500 | mediana 4,302 s; máximo 10,477 s |
| `/api/jobs/lomadee-discovery-queue` | 24 | 24 HTTP 200 | mediana 1,247 s; máximo 5,985 s |
| `/api/jobs/shopee` | 109 | 83 HTTP 200, 20 HTTP 429, 1 HTTP 503, 5 HTTP 504 | mediana 22,303 s; p90 64,110 s; máximo 90,551 s |
| `/api/jobs/hourly` | 138 | 107 HTTP 200, 31 HTTP 500 | mediana 0,581 s; máximo 2,208 s |

Limitações da evidência:
- Logs de função não medem diretamente os 7.209 segundos de banco consumidos.
- As 38 respostas HTTP 500 da fila Lomadee não trazem detalhe de erro nos registros disponíveis; não é correto atribuí-las automaticamente ao PostgreSQL.
- Shopee apresenta sinais explícitos de limitação do provedor (HTTP 429) e estouro de orçamento de função (HTTP 504). Isso é um problema de execução/API externa e não prova consumo de banco.
- Os registros de erro da rotina horária incluem estouro do limite gratuito de 200 agendamentos avulsos por dia em 05–06/11. O código atual de `api/jobs/lomadee-link-queue.js` já declara que não arma retomada avulsa e depende do cron horário; não se deve presumir que o erro histórico ainda esteja ativo na versão 664.
- Não foi possível obter planos `EXPLAIN` nem métricas de tempo SQL enquanto as chamadas de função estão pausadas. Não foram executadas consultas de diagnóstico pesadas.

## Achados de código e schema

1. `api/jobs/lomadee-reconcile.js` buscava todas as ofertas Lomadee aprovadas/publicadas, carregava muitas colunas e executava uma subconsulta `EXISTS` de histórico de preço para cada oferta; depois disso, o worker processava somente dez ofertas por execução. Esse trabalho amplo era desnecessário para o lote efetivo.
2. `api/jobs/lomadee-link-queue.js` ordenava todo o conjunto elegível com `ORDER BY last_seen_at ASC, random()`. A ordenação aleatória global pode exigir ordenar muitos registros para selecionar um lote de até dez.
3. O schema observado possui índices em `affiliate_discovery_items(account_id, processing_status, last_seen_at)`, `affiliate_discovery_items(account_id, id, first_seen_at)`, `offers(account_id, status, created_at)` e `offer_price_history(verified_at, account_id, offer_id)`. A adequação real desses índices depende dos planos de execução e da distribuição/volume dos dados.
4. A consulta de publicações do Telegram contém vários joins, subconsultas e ordenação por prioridade. Há índices de apoio existentes, mas não será adicionado índice especulativo sem plano de execução.
5. A migração `068_ingestion_batches.sql` consta nos arquivos, mas o inventário de banco anterior registrou que ela ainda não estava aplicada na produção. Ela não foi alterada nem aplicada nesta tarefa.

## Otimizações preparadas

### A. Reconciliação Lomadee — leitura ampla mais estreita

Arquivo: `api/jobs/lomadee-reconcile.js`.

- A verificação global de links agora lê somente a coluna `affiliate_url` para calcular o total e a quantidade de links ativos.
- A consulta com colunas completas e `EXISTS` de histórico oficial é executada somente para o lote de dez ofertas selecionado.
- A rotação horária, o offset manual, o limite de dez, a validação de links e a regra de atualização de credenciais foram preservados.
- Nenhuma oferta, preço ou histórico foi alterado durante a preparação.

### B. Fila Lomadee — seleção oldest-first

Arquivo: `api/jobs/lomadee-link-queue.js`.

- A seleção agora usa `ORDER BY last_seen_at ASC` e o índice de status/última atualização existente, em vez de aplicar `random()` sobre todo o conjunto elegível.
- `last_seen_at` continua sendo atualizado no claim e nos caminhos de deferimento; isso faz os itens processados/deferidos voltarem para o fim da rotação.
- O claim continua usando `FOR UPDATE SKIP LOCKED`; a regra de diversidade por organização, os estados, o limite do lote e o fluxo de criação/verificação de links foram preservados.
- A escolha entre registros com o mesmo `last_seen_at` deixa de ser aleatória. Essa pequena mudança de ordenação deve ser observada na validação de distribuição da fila.

## O que deliberadamente não foi alterado

- Nenhuma migration ou índice novo: falta EXPLAIN, estimativa de volume e avaliação de locks.
- Nenhuma frequência de cron foi reduzida.
- Nenhum limite comercial, lote de publicação, política de oferta, classificação, aprovação ou canal foi alterado.
- Nenhuma integração Shopee, Telegram, WhatsApp, Gemini, Ollama ou marketplace foi desativada.
- Nenhuma fila foi limpa, zerada, descartada ou reprocessada.
- Nenhum dado foi migrado para Supabase.
- Nenhum deploy adicional, migration ou alteração de dados foi executado durante a auditoria inicial. O deploy controlado posterior da versão v665 publicou apenas os arquivos de código e documentação.

## Validação e estado de rollout

- Os dois arquivos de código foram comparados antes da edição: conteúdo idêntico entre Hatchable WIP e GitHub `main`.
- As alterações foram aplicadas no Hatchable e no branch GitHub `codex/db-performance-optimization-20261112`; os três arquivos foram comparados antes do merge.
- PR #195 foi convertido de draft e integrado por squash em 12/11/2026; commit resultante no `main`: `d51c7f0b34f7e34bdc24b5b7aa92cb7aafdbac3a`.
- Dry-run imediatamente antes do deploy: `ok=true`, zero erros e zero avisos.
- Deploy Hatchable v665 concluído em 12/11/2026 às 10:16:50 UTC, status `live`, 333 arquivos e 133 funções registradas, sem avisos.
- A produção foi confirmada na v665; a v664 consta como `superseded`.
- A validação de runtime, planos de execução e comparação real de consumo continuam bloqueadas enquanto a cota mensal mantiver as funções pausadas.

## Próximos passos após a restauração das funções

1. Executar os testes de contrato dos dois workers em ambiente isolado, sem credenciais reais nem envios.
2. Obter planos `EXPLAIN (ANALYZE, BUFFERS)` somente para consultas SELECT limitadas e representativas; usar timeout curto e interromper se o plano indicar varredura/ordenação excessiva.
3. Avaliar separadamente as consultas do Telegram, Lomadee e Shopee; não atribuir consumo por inferência de duração da função.
4. Só então decidir se índices adicionais são necessários; avaliar lock, tamanho, custo de escrita e implantação.
5. Rodar dry-run, comparar os arquivos Hatchable/GitHub e validar os contratos de resposta.
6. O deploy controlado já foi realizado na v665, sem disparar publicações de teste; após a restauração, confirmar novamente versão, hashes e comportamento.
7. Medir o consumo do banco e as durações por rota antes/depois. Se a cota continuar insuficiente, decidir sobre upgrade com base em métricas, não em suposição.

## Sincronização e estado final do rollout

- Branch de trabalho: `codex/db-performance-optimization-20261112`.
- PR #195 — [Otimização conservadora das consultas e filas Lomadee](https://github.com/emersongabriel29-pixel/radar-promo-brasil/pull/195) — merged em 12/11/2026.
- Commit de merge no GitHub `main`: `d51c7f0b34f7e34bdc24b5b7aa92cb7aafdbac3a`.
- Hatchable: versão `v665`, status `live`, publicada em 12/11/2026 às 10:16:50 UTC.
- Resumo do deploy: 333 arquivos, 133 funções registradas, zero avisos.
- Dry-run pré-deploy: `ok=true`, zero erros, zero avisos.
- O status do commit no GitHub não retornou verificações/statuses configurados; isso não equivale a CI aprovado.
- Produção anterior v664: `superseded`.
- Nenhum dado, fila, credencial, migration, índice ou cron foi alterado pelo rollout.
- A cota mensal de banco ainda impede testes de runtime, EXPLAIN/ANALYZE e mensuração pós-deploy até a restauração das funções.

## Pendências técnicas bloqueadas pela cota

Estas etapas não podem ser declaradas concluídas agora:
1. Testes de contrato isolados dos workers Lomadee.
2. Verificação de distribuição/justiça da fila com registros reais.
3. Planos de execução representativos e medição de buffers/tempo SQL.
4. Medição comparativa de consumo do banco e acompanhamento de erros após a v665.
5. Avaliação de índices ou otimizações adicionais com evidência.

Não executar disparos de publicação, importação ou reprocessamento apenas para testar. Após a restauração, validar com chamadas controladas e sem efeitos externos.

## Rollback

As alterações são isoladas em dois arquivos de worker. Se a validação falhar, reverter esses dois arquivos ao conteúdo anterior, mantendo todos os dados e migrations intactos. Não executar DROP, limpeza ou rollback destrutivo.