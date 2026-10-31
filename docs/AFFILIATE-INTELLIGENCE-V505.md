# Inteligência de afiliados — reconciliação da produção v505

## Fonte de verdade e preservação

- Projeto Hatchable: Radar Promo Brasil, versão de produção **505**, verificada em 30/10/2026.
- Branch isolada: `codex/affiliate-intelligence-v493-20261030` (iniciada sobre o baseline v493 e reconciliada com os incrementos posteriores da v505).
- PR draft #140: direcionada à branch `codex/hatchable-github-reconciliation-20261029`, não à `main`.
- A listagem atual do Hatchable contém 212 caminhos não virtuais. Todos os 212 estão presentes na branch; arquivos extras do GitHub foram preservados.
- Foram sincronizados da produção v505 os módulos atualizados de scheduler, retry, autopilot, jobs, Telegram, Shopee/AliExpress, Mercado Livre, classificação, diversidade de catálogo e entrega.
- `api/integrations/lomadee.js` foi reconciliado sobre a versão v505, preservando `classifyLomadeeProduct` e `normalizeLomadeeCategory`, com a sincronização de pedidos adicionada.
- `public/radar.js` foi reconciliado sobre a versão v505 e recebeu o link do painel de inteligência, sem substituir a interface atual.
- A cobertura de caminhos não equivale a uma comparação hash-a-hash de todos os 212 arquivos; esse último controle ainda está pendente.

## Funcionalidades nesta branch

- `GET /api/affiliate/intelligence`: indicadores autenticados, pontuação de prioridade explicável e transparência sobre dados ausentes.
- `public/affiliate-intelligence.html`, CSS e JS: explorador manual e painel de desempenho.
- Descoberta de catálogo: persistência idempotente por conta, marketplace, tipo e identificador externo.
- Paginação de produtos, lojas e campanhas Shopee, e produtos/hot products/campaign products AliExpress: até três páginas por execução, com continuação pela próxima página.
- Catálogo Lomadee: mantém o coletor e os recursos da produção v505.
- Livro de vendas: sincronização paginada Shopee (scrollId), AliExpress (page) e Lomadee (page), com lotes limitados por execução e continuação.
- `affiliate_sales` usa a chave única `(account_id, marketplace, external_id)`, permitindo repetição idempotente sem duplicar pedidos.
- Não são armazenados dados pessoais de compradores. Atribuição a oferta/grupo e lucro líquido não são inventados quando a API não fornece os identificadores/custos necessários.
- A classificação de categorias e diversidade do catálogo da v505 foram preservadas.

## Evidência de produção em 30/10/2026

- GET de status das três integrações, executado como proprietário: Shopee, AliExpress e Lomadee retornaram credenciais `VALIDATED`.
- Consulta somente leitura de pedidos Lomadee: HTTP 200, zero registros no período de sete dias.
- Consulta somente leitura de pedidos AliExpress: HTTP 200, zero registros no período de sete dias.
- Consulta de conversões Shopee: a API respondeu HTTP 200 com erro GraphQL informando que `$start` e `$end` esperavam `Int64`, não `Int`. A declaração foi corrigida na branch; não foi possível confirmar essa correção na produção sem deploy.
- A tabela `affiliate_sales` estava vazia no início da auditoria. Não houve gravação de vendas de teste.

## Banco e implantação

- `migrations/050_affiliate_discovery.sql` cria as tabelas de execuções e itens descobertos.
- As tabelas ainda não existem no banco ativo; o endpoint e o painel dependem dessa migration.
- Nenhuma migration foi aplicada, nenhum deploy foi executado, nenhum agendamento foi alterado, nenhuma oferta foi publicada e nenhuma mensagem foi enviada.
- O ambiente de produção continua na versão 505 até autorização e execução de uma publicação coordenada.

## CI

- CI completa #41005088954: build, testes unitários, auditoria de dependências e E2E aprovados.
- CI #41005258439: aprovada após a correção do tipo GraphQL Shopee para Int64.
- Alterações de reconciliação v505 e textos de interface foram adicionadas depois; a CI da ponta final precisa ser confirmada antes de retirar o estado draft da PR.

## Pendências explícitas

1. Confirmar CI verde na ponta final da branch após a reconciliação v505.
2. Completar a comparação hash-a-hash dos 212 arquivos compartilhados.
3. Aplicar migration 050 e publicar os arquivos de forma coordenada no Hatchable e GitHub, após autorização operacional explícita.
4. Validar a primeira página real de conversões Shopee após o deploy do tipo Int64 corrigido.
5. Aguardar pedidos reais para validar o mapeamento financeiro e conciliar estornos, devoluções e subIDs.
6. Mapear oferta/grupo somente quando os IDs/subIDs de rastreamento estiverem comprovadamente disponíveis.
7. Não calcular lucro líquido até conhecer custos, estornos, devoluções e atribuição.

## Política de segurança

A branch permanece isolada. Não foi feito merge para `main`, deploy, escrita no banco ativo, publicação de ofertas, envio de mensagens, alteração de credenciais ou mudança de agendamentos.
