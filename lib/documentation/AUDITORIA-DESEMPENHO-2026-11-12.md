# Auditoria de desempenho e otimização conservadora — 12/11/2026

## Escopo e salvaguardas

Solicitação: investigar o consumo de 7.209/7.200 segundos de banco de dados do Hatchable e reduzir consultas desnecessariamente pesadas sem regressões.

Projeto: Radar Promo Brasil — `proj_1Xj94QxQmCam`.
Produção observada antes desta rodada: Hatchable v664.
Banco: PostgreSQL gerenciado pelo Hatchable.
Estado operacional informado pelo titular: chamadas de função pausadas até a reinicialização mensal de 02/12/2026.

A inspeção desta rodada foi somente leitura até as duas otimizações de código descritas abaixo. Não foram executados envios, publicação, importação, reprocessamento de filas, alterações de dados, alterações de credenciais, migrations, índices ou mudanças de cron. As otimizações foram salvas apenas como rascunho no Hatchable e em branch isolada no GitHub; não foram implantadas.

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

### B. Fila Lomadee — aleatoriedade limitada

Arquivo: `api/jobs/lomadee-link-queue.js`.

- A fila primeiro seleciona uma janela limitada aos registros mais antigos, de até quatro vezes o tamanho do lote.
- A aleatoriedade é aplicada somente dentro dessa janela, mantendo a mistura de candidatos e a lógica existente de diversidade por organização.
- O claim continua usando `FOR UPDATE SKIP LOCKED`; os estados, limite do lote e fluxo de criação/verificação de links não foram alterados.
- Para o limite padrão de dez itens, a ordenação aleatória fica limitada a no máximo quarenta candidatos, em vez de todo o conjunto elegível.

## O que deliberadamente não foi alterado

- Nenhuma migration ou índice novo: falta EXPLAIN, estimativa de volume e avaliação de locks.
- Nenhuma frequência de cron foi reduzida.
- Nenhum limite comercial, lote de publicação, política de oferta, classificação, aprovação ou canal foi alterado.
- Nenhuma integração Shopee, Telegram, WhatsApp, Gemini, Ollama ou marketplace foi desativada.
- Nenhuma fila foi limpa, zerada, descartada ou reprocessada.
- Nenhum dado foi migrado para Supabase.
- Nenhum deploy foi executado.

## Validação e estado de rollout

- Os dois arquivos de código foram comparados antes da edição: conteúdo idêntico entre Hatchable WIP e GitHub `main`.
- As alterações foram aplicadas no Hatchable como rascunho e no branch GitHub `codex/db-performance-optimization-20261112`.
- A produção continua na versão 664 até um deploy autorizado e validado.
- Dry-run de deploy deve ser executado após a documentação ser sincronizada; dry-run não substitui teste de runtime.
- A validação de runtime, planos de execução e comparação real de consumo ficam bloqueadas enquanto as funções permanecerem pausadas.
- Não declarar a otimização concluída em produção até o deploy e a medição pós-deploy.

## Próximos passos após a restauração das funções

1. Executar os testes de contrato dos dois workers em ambiente isolado, sem credenciais reais nem envios.
2. Obter planos `EXPLAIN (ANALYZE, BUFFERS)` somente para consultas SELECT limitadas e representativas; usar timeout curto e interromper se o plano indicar varredura/ordenação excessiva.
3. Avaliar separadamente as consultas do Telegram, Lomadee e Shopee; não atribuir consumo por inferência de duração da função.
4. Só então decidir se índices adicionais são necessários; avaliar lock, tamanho, custo de escrita e implantação.
5. Rodar dry-run, comparar os arquivos Hatchable/GitHub e validar os contratos de resposta.
6. Implantar em janela controlada, sem disparar publicações de teste; confirmar versão e hashes.
7. Medir o consumo do banco e as durações por rota antes/depois. Se a cota continuar insuficiente, decidir sobre upgrade com base em métricas, não em suposição.

## Rollback

As alterações são isoladas em dois arquivos de worker. Se a validação falhar, reverter esses dois arquivos ao conteúdo anterior, mantendo todos os dados e migrations intactos. Não executar DROP, limpeza ou rollback destrutivo.
