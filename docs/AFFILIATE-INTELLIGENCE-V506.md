# Inteligência de afiliados — reconciliação v506

**Data:** 30/10/2026  
**Produção observada:** Hatchable v506  
**Branch:** `codex/affiliate-intelligence-v493-20261030`  
**PR:** #140, draft, base `codex/hatchable-github-reconciliation-20261029`  
**Commit de referência desta revisão:** `d7e8cbff5a81b4e30cefbc87c1943f3e5bd5d51c`

## Reconciliação das fontes

- O manifesto Hatchable v506 contém 212 arquivos não virtuais. Os 212 caminhos estão presentes na branch; nenhum arquivo extra do GitHub foi removido.
- A comparação dos manifestos v493→v505 identificou 5 arquivos novos e 14 arquivos alterados. Esses caminhos foram incorporados, preservando scheduler, jobs, Telegram, WhatsApp, autopilot, entrega, classificação e UI.
- A comparação v505→v506 identificou seis arquivos alterados: `lib/offer-images.js`, integrações Shopee/Amazon/AliExpress e jobs Shopee/AliExpress. As versões v506 da Amazon, jobs e imagens foram preservadas; Shopee e AliExpress foram mesclados sobre os handlers atuais, mantendo os controles de segurança e as adições de afiliados.
- A branch contém o código atual v506 mais as adições de inteligência; os arquivos novos e alterações relevantes também foram gravados no workspace Hatchable como rascunho. A produção continua v506 até um deploy explícito.
- A verificação de todos os caminhos foi concluída. A igualdade byte-a-byte dos 212 arquivos inteiros não foi declarada: três arquivos intencionalmente diferem da produção por receberem as novas funções/links de inteligência ou classificação.

## Funcionalidades adicionadas

- Endpoint autenticado `GET /api/affiliate/intelligence` e painel `/affiliate-intelligence.html`.
- Persistência idempotente de catálogos descobertos por conta, marketplace, tipo e identificador externo.
- Paginação manual limitada por execução: produtos/lojas/campanhas Shopee e produtos/hot products/campaign products AliExpress; continuação pelo painel.
- Exploração e sincronização Lomadee, com continuação por página.
- Livro de pedidos/comissões para Shopee (`conversionReport` + `scrollId`), AliExpress (`orders` + página) e Lomadee (`orders` + página).
- Chave única de `affiliate_sales` impede duplicação por conta/marketplace/pedido.
- Pontuação explicável com cliques, pedidos e comissões. Conversão permanece nula quando não há vendas comprovadas.
- Não são armazenados dados pessoais de compradores. Oferta/grupo/subID e lucro líquido não são inferidos sem os campos necessários.
- Importações manuais continuam protegidas pelo bloqueio de medicamentos e pela revisão humana. Nenhum fluxo de publicação foi ativado.

## Mapeamento de pedidos

- Shopee: cada pedido é extraído de `conversionReport.nodes[].orders[]`; valores e comissões vêm dos itens retornados pela API.
- AliExpress: os campos de pedido normalizados incluem `order_id`, `product_price`, `product_count`, `commission`, `created_time` e `order_status`.
- Lomadee: a normalização é condicionada aos campos presentes na resposta de `/affiliate/orders`; a permissão `orders:read` é confirmada pela própria consulta, não inferida da leitura de produtos.
- Os três endpoints foram consultados em modo somente leitura. Lomadee e AliExpress retornaram zero pedidos no período de sete dias. A consulta Shopee da produção respondeu que os timestamps precisam ser `Int64`; a correção está nesta branch e ainda depende de deploy para validação contra a API real.
- Portanto, os testes unitários comprovam os normalizadores e a idempotência, mas a conciliação financeira com vendas reais ainda não foi comprovada.

## Banco, validação e publicação

- A tabela `affiliate_sales` já existe no banco ativo e sua chave única foi conferida.
- `migrations/050_affiliate_discovery.sql` cria `affiliate_discovery_runs` e `affiliate_discovery_items`. Essas tabelas ainda não existem no banco ativo; a migration está apenas no workspace/branch.
- Dry-run Hatchable: **0 erros**, 3 avisos preexistentes de respostas SSE bufferizadas em `api/jobs/api-health.js`. Próxima versão prevista: v507, 101 funções, 11 arquivos públicos e 52 migrations.
- CI atual: run #41007586854, commit `d7e8cbf`; build, testes unitários e auditoria passaram. Testes E2E ainda em execução no momento desta atualização.
- Nenhuma migration foi aplicada, nenhum deploy foi feito, nenhum agendamento foi alterado, nenhuma oferta foi publicada e nenhuma mensagem foi enviada.
- A branch e a PR continuam isoladas/draft; `main` não foi alterada por esta PR.

## Portões restantes

1. CI #41007586854 terminar com E2E verde na ponta final.
2. Revisão final da PR e do diff com a branch-base.
3. Autorização operacional explícita para aplicar a migration 050 e publicar a v507 em Hatchable/GitHub.
4. Após o deploy, validar a consulta Shopee com `Int64` e, quando houver pedidos reais, reconciliar valores, comissões, cancelamentos e devoluções antes de usar os números como lucro.
