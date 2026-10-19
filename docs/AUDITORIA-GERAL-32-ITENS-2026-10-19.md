# Radar Promo Brasil — Auditoria geral dos 32 itens

**Data:** 2026-10-19  
**Etapa:** inventário, correções locais e reteste; nenhum fluxo de oferta foi publicado ou enviado.  
**Commit GitHub auditado:** `981337948840b04fba35a06674123fb7f0d8f29c` (`codex/radar-video-ia-runway-20261018`).  
**`origin/main`:** `575fc2c96b032697e24cb51dd63a38bb444c43a7`.  
**Hatchable:** projeto `proj_1Xj94QxQmCam`, v324 live em 2026-10-19 03:31 UTC.  
**Regra:** manter todas as funções, configurações, APIs e ids de navegação; corrigir sem apagar. Mudanças nesta auditoria ficam na branch até revisão e comparação com Hatchable.

## Escala de resultado

- **Parcial:** há evidência limitada (código, teste, contagem ou tela), mas falta comprovação ponta a ponta.
- **Pendente:** o teste real não foi possível por falta de sessão, autorização, credencial, dados elegíveis ou ambiente de teste.
- **Aprovado:** só depois de executar o caso definido, conferir o resultado e registrar evidência reproduzível.

## 1–32. Lista solicitada e estado inicial

| Nº | Auditoria | Resultado inicial | Evidência/limite desta rodada |
|---:|---|---|---|
| 1 | Segurança | Parcial | A matriz anônima dos 63 endpoints privados/agendados implantados retornou 401/404 em 63/63. Busca heurística de padrões comuns de chave/segredo nos arquivos rastreados encontrou zero arquivos; `.env.example` é o único arquivo de ambiente rastreado. HMAC do n8n tem testes/código. Falta validação com sessão real, revisão independente de credenciais e execução de testes externos de segurança. |
| 2 | GitHub ↔ Hatchable | Divergente | Branch `c37a06c`; `main` `575fc2c`; Hatchable v324. Após normalizar CRLF/LF, 80 de 150 arquivos-fonte comuns ainda têm hashes diferentes. Há 13 arquivos só no Hatchable e 20 só na branch. Não sincronizar em lote. |
| 3 | Automações e orquestração | Parcial | Cinco cron jobs ativos; 0 erros de cron em 7 dias e 23–24 invocações/24 h para os jobs horários. Workflow n8n ativo, 7 nós, 2 gatilhos e 25 execuções recentes `success`. Os números não provam entrega ao destinatário; `next_fire_at` de `/api/jobs/hourly` e `/api/jobs/telegram` ficou fora da expressão cron na captura atual e precisa de observação posterior. |
| 4 | APIs e afiliados | Pendente | Testes individuais com credenciais válidas não foram executados em todos os provedores. Lomadee acumulou 6 erros HTTP 504 em 11 chamadas nas últimas 24 h (uma chamada POST resultou em 502), com duração de até 30 s; a causa está no upstream/timeout e continua aberta. |
| 5 | Publicações | Pendente | Não foi feito envio real. Telegram tem cron/execuções, porém não há ofertas elegíveis confirmadas na última checagem; Meta está sem autorização. |
| 6 | Preços e descontos | Pendente | Estado administrativo anterior: zero ofertas com preço oficial recente. Não foi criada oferta sintética na produção. |
| 7 | Links de afiliados | Parcial | Contratos/rastreio existem no código; falta testar cada programa com conta aprovada e conferir relatório oficial. |
| 8 | Catálogo de lojas | Parcial | Conectores encontrados para Amazon, Mercado Livre, Shopee, Magalu, SHEIN e demais listados; presença de rota não comprova acesso comercial. |
| 9 | APIs de afiliados | Pendente | Sem prova individual contemporânea de OAuth, escopos, limites e renovação para cada parceiro. |
| 10 | Categorias e filtros | Parcial | Classificador e roteamento existem e têm testes automatizados; falta execução com dados sintéticos por conta e cada grupo. |
| 11 | Cupons | Pendente | A tela mostra zero cupons; validade/expiração/esgotamento precisam de casos de teste isolados. |
| 12 | Duplicidade | Parcial | A ponte n8n aplica idempotência por evento e estados incertos; falta teste ponta a ponta após reinício em ambiente isolado. |
| 13 | Aprovação de ofertas | Parcial | Estados/regras estão no código; nenhuma oferta elegível disponível para testar os caminhos de aprovação/rejeição na produção. |
| 14 | Rastreamento de conversões | Pendente | Não foram comparados resultados com relatórios oficiais de afiliados. |
| 15 | Telegram | Parcial | Job horário ativo, 23 invocações/24 h e 0 erros reportados pelo Hatchable; o n8n chama a ponte a cada 10 min. Não há recibo de novo envio nesta auditoria. O próximo horário informado pelo scheduler ficou desalinhado de `0 * * * *`; precisa ser observado novamente. |
| 16 | WhatsApp | Pendente | Não foi testado provedor/consentimento/entrega nesta rodada. Testes E2E locais cobrem fluxos de interface, não entrega de mensagens. |
| 17 | n8n | Parcial com divergência | Produção ativa: `BldO3MqWULbMGsjs`, 7 nós, dois gatilhos; 25 execuções recentes bem-sucedidas. JSON local possui 4 nós e `active:false`, portanto é export histórico, não espelho do fluxo ativo. |
| 18 | MCP | Parcial | Workflow n8n disponível via MCP e execução recente observada; nenhuma ferramenta de publicação foi chamada. Falta testar o ciclo de autorização da aplicação com sessão. |
| 19 | Orquestrador Maestro | Pendente | Nenhuma integração Maestro comprovada no código ou no n8n auditado. Compatibilidade/licença/custo não foram validados. |
| 20 | Rakuten e Lomadee | Pendente | Rakuten não validada com credencial; Lomadee está em `ERROR/NOT_CONNECTED` por HTTP 504 do provedor. |
| 21 | Integrações adicionais | Pendente | É necessária prova isolada para cada conector; configuração preenchida não será considerada sucesso. |
| 22 | Banco de dados | Parcial | Esquema, migrações e isolamento por `account_id` estão documentados; não foi feito restore nem varredura de integridade sobre dados de produção. |
| 23 | Autenticação e sessões | Parcial | Os 63 endpoints privados/agendados existentes passaram na matriz anônima (401/404 antes do handler). `GET /api/social/autopilot` como membro retornou 200 com snapshot vazio. O projeto não tem `[auth]` para simular usuário final (`as:'user'` indisponível); falta validar o ciclo de sessão real após login. |
| 24 | Dependências | Aprovado no audit automatizado | `npm audit --audit-level=moderate`: zero vulnerabilidades reportadas no lockfile instalado. Não prova ausência de risco em APIs externas/segredos. |
| 25 | Testes automatizados | Aprovado no escopo local | Build passou (125 JS); `npm test` 120/120; 3/3 E2E, incluindo formulários e seis larguras. Sem chamadas pagas nem envios reais. |
| 26 | Desempenho | Parcial | E2E cobre layout em seis larguras; nenhum perfil de carga/concorrência foi executado. |
| 27 | Logs e monitoramento | Parcial | Consulta aos logs de 24 h encontrou 9 erros: seis em Lomadee (504), dois históricos em `/api/social/autopilot` com `ReferenceError: api is not defined` (01:51 UTC) e um em `/api/ai/video-ia` (gateway sem chave OpenAI). O reteste de leitura do agente social retornou 200; a origem dos dois erros anteriores não foi reproduzida. Isso não comprova entrega de mensagem. |
| 28 | Recuperação de falhas | Parcial | Há reintentos/idempotência/estado incerto no código; resta testar falha/reinício com fixtures sem destino externo. |
| 29 | Custos | Parcial | Estúdio mostra Gemini, OpenAI e Claude; n8n Gateway informa indisponível. Não foram feitas chamadas que gerem cobrança. Falta registrar limite e confirmação de custo. |
| 30 | Privacidade e conformidade | Parcial | Avisos e controles de consentimento existem; falta exercitar exclusão/exportação/retention em conta isolada e revisar todas as plataformas. |
| 31 | Deploy e configuração | Divergente | v324 está live; funções e cron ativos. Arquivos de UI entre Hatchable e GitHub divergem; não fazer deploy até reconciliar. |
| 32 | Recuperação de desastre | Parcial | Teste automatizado isolado restaurou 36 tabelas e rejeitou backup adulterado/de outra conta; restore de backup de produção em base Hatchable isolada ainda não foi feito. |

## Evidência visual e teste de navegação no Hatchable

O app foi aberto em `https://radar-promo-brasil.hatchable.site/`, e as áreas **Radar** e **Ofertas** foram abertas pelo menu visível. Em Ofertas, as categorias Ofertas, IA e Redes/Campanhas existem na v324. Foram abertas as telas Ofertas/Cupons, Curador, Estúdio IA, Tráfego/Redes e Agente Radar Social.

Achados antes de alterar a interface:

1. O workspace repete “Ofertas” no título global e no título interno; a hierarquia gasta espaço sem explicar a tarefa.
2. A captura da árvore de acessibilidade do CUA exibiu `checkbox`, enquanto o DOM da branch e o Playwright reconhecem os controles como botões `aria-pressed`. A discrepância entre ferramentas permanece para validação com leitor de tela real; não alterei a semântica correta do DOM sem prova reprodutível.
3. No viewport observado (~714×651), a barra fixa inferior (“Conexões”/“Nova oferta”) cobre os cartões e o conteúdo do formulário.
4. Em 375 px, os cartões ficam compactos. E2E verificou a visualização em 375 e 714 px e ausência de rolagem horizontal em seis larguras.
5. A página “Tráfego, cupons e redes sociais” ainda combina três tarefas no título e apresenta cartões sem conexão. A hierarquia precisa separar redes, campanhas e cupons sem remover ações.
6. O Agente Radar Social mostra controles de configuração, geração de rascunho e execução de fila; Instagram/Facebook aparecem como não autorizados. Nenhum botão de ativação, geração ou publicação foi enviado.
7. A tela Curador mostra zero ofertas aprovadas; ao clicar em “Analisar agora”, a aplicação respondeu `login_required`. Isso impede validar a análise autenticada pelo navegador público.
8. A rota IA exibe Gemini ativo e opções OpenAI/Claude, mas nenhuma geração foi feita para evitar consumo de API/custo durante o diagnóstico. A fila de mídia estava vazia.
9. A tela Radar mostrou fontes vazias; nenhuma fonte foi criada ou ativada.

**Limite de captura:** o navegador não forneceu caminho para salvar localmente a captura inicial do Hatchable. Capturas pós-correção foram geradas no E2E autenticado com banco em memória; elas não substituem validação de produção.

## Verificação adicional do ambiente publicado (19/10/2026)

- Hatchable continuava na v324. O inventário lista 82 funções ao todo (76 APIs e seis páginas); a branch lista 77 endpoints API, incluindo a IA Central ainda não implantada.
- Comparação de rotas v324 × branch: faltam na produção `/api/ai/orchestrator`, `/api/media/offer/:id` e `/api/public/media/:id`. A produção ainda tem `/api/integrations/collshp-import` e `/api/integrations/health-summary`, que não estão no catálogo local. Rotas com parâmetro foram normalizadas (`[id]` ↔ `:id`) para não contar diferenças de sintaxe como ausências.
- A lista de arquivos publicada tem 164 entradas (163 com hash; `AGENTS.md` é virtual). Comparando 150 caminhos-fonte em comum com os arquivos locais e normalizando finais de linha, 80 hashes divergem; há 13 caminhos-fonte exclusivos do Hatchable e 20 exclusivos da branch. A diferença inclui arquivos de interface, APIs, bibliotecas e migrações. Portanto, a branch não pode ser enviada por cima da produção sem reconciliação arquivo a arquivo.
- O teste anônimo de `GET /api/social/autopilot` retornou 401 antes do handler. Um `GET` simulado como membro retornou 200 com configuração padrão `PAUSED`, sem publicações nem conexões; nenhum envio foi solicitado. A tentativa `as:'user'` não é suportada porque o projeto Hatchable não tem `[auth]` de usuário final.
- A matriz anônima automatizada cobriu as 63 rotas `member`/`scheduler` existentes nas duas listas: 63 retornaram o bloqueio esperado (401 para membro, 404 para scheduler). Duas rotas privadas da branch estão ausentes na produção e foram excluídas da matriz. A consulta ao console foi espaçada após o limite do MCP; 14 respostas inicialmente limitadas foram repetidas com sucesso. Esta prova verifica apenas a borda de autorização, não a lógica das chamadas autenticadas.
- Cinco leituras adicionais simuladas como membro retornaram 200 em `/api/readiness`, `/api/reports`, `/api/data` e `/api/integrations/marketplaces`; nenhuma resposta com dados da conta foi copiada para este relatório. `/api/mercadolivre/health` retornou 412 `Mercado Livre não conectado`, portanto a API externa não foi testada.
- A prontidão na simulação de membro retornou `SETUP_REQUIRED`, `productionReady:false`, 25% de itens internos e 13% operacional. Esse perfil simulado não corresponde a uma verificação da conta real do proprietário; a rota relata pré-requisitos ausentes sem expor dados para o relatório.
- Dois erros históricos de `ReferenceError: api is not defined` na rota social foram observados nos logs. O código local e o arquivo publicado lidos não contêm esse identificador como referência executável; o reteste agora retornou 200. A causa não foi reproduzida, portanto o incidente fica em observação e não foi declarado corrigido.
- O erro de vídeo IA da janela é compatível com a ausência de chave OpenAI reportada pelo gateway. Nenhuma chamada adicional foi feita; configuração do provedor e consumo de créditos permanecem sem validação.
- O scheduler lista cinco tarefas ativas com 0 erros em 7 dias; para os jobs `hourly` e `telegram`, os próximos horários informados não se alinharam com a expressão `0 * * * *`. A leitura foi pontual e não permite concluir que houve falha de agendamento; acompanhar uma nova execução antes de corrigir.
- A inspeção n8n atual confirmou a versão publicada igual à versão de rascunho, workflow ativo com 7 nós e 2 gatilhos. Foram listadas 210 execuções, com as 25 mais recentes em `success`; isso representa execução, não confirmação de entrega. Há uma credencial visível (`httpCustomAuth`), nenhum agente acessível e Gateway indisponível. `prepare_workflow_pin_data` falhou com `Maximum call stack size exceeded`; nenhum teste manual do workflow foi executado.
- A comparação GitHub↔Hatchable permanece divergente. Foram lidos arquivos publicados de social, vídeo IA e mídia, mas não se substituiu código ou configuração de produção. Nenhum deploy, acionamento de workflow n8n, teste de publicação, chamada paga ou alteração de integração foi executado.

## n8n e “IA mãe”

- O único workflow exposto ao MCP é `Radar Promo Brasil — Webhook Seguro de Ofertas` (`BldO3MqWULbMGsjs`). Está ativo, com versão publicada `c8865d8b-c3a5-4c08-92ac-8376a11950d9`, 7 nós e dois gatilhos: webhook seguro e scheduler de Telegram de 10 minutos.
- As 25 execuções recentes observadas foram `success` em modo `trigger`, normalmente abaixo de 2 segundos. A execução aciona a ponte da aplicação; status `success` não significa que uma oferta foi enviada.
- O validador exige timestamp Unix, HMAC-SHA256 com comparação segura e tolerância de 300 segundos. A ação Telegram assina um evento e chama `/api/n8n/telegram-tick`.
- A busca n8n não encontrou agentes de IA publicados/disponíveis; só há uma credencial `httpCustomAuth`, sem credencial OpenAI/Google na lista do n8n; Gateway de IA indisponível. Segredos não são copiados para este relatório.
- O JSON existente em `docs/n8n/radar-ofertas.workflow.json` declara `active:false`, quatro nós e um snapshot publicado antigo. Não deve ser importado por cima do workflow ativo.
- Na aplicação há Estúdio multimodelo, Curadoria IA e Agente Radar Social, mas não foi encontrada uma IA central que coordene módulos e apresente um plano consolidado. Esse é um item de produto ainda não implementado; qualquer executor central precisará separar leitura, preparação de rascunhos e ações externas que exigem aprovação.

## Comparação pré-alteração: hashes selecionados

| Arquivo | GitHub branch `c28afe0` | Hatchable v324 | Conclusão inicial |
|---|---|---|---|
| `pages/index.js` | `052ad66c33dd4f35cfacdf6e392557632a07e8a82778e22b69e7a7859278e3e9` | `b1f51731f4a48ab128c75ac5f2353637d8387d95bf2281a1f5310171db38f941` | Divergente |
| `public/radar.js` | `cfd39eb3dd0888dfa1a4f66647f2ff4e60f43c9c74293a5fdb765a96817fc34c` | `18afaa859d24308f5949f7259bf31585776c6f2b00f2899280247a64d035819f` | Divergente |
| `public/radar.css` | `463dd92aad678a51e77bc0cda8791445980c6f0b6eb73043683c7940807047ff` | `9cd4df3bafe4bdf4832096ae51feb323f76734fbd965547a49a5a3fe10f585e0` | Divergente |
| `public/radar-theme-v5.css` | `8d158cf70209f4993933020910f6955962f7f74f7734b7c231e9cd5de4ee2d4c` | `48240300e81f0fc895dee02dc9032f8111bc07eafcf28561c55827987426a79c` | Divergente |
| `pages/radar-video-ia.js` | `2dda7bd765947172586af9c783f65aa443a3b47b512db119df8ac71184762f19` | `9930bb349bf7a04f6c4ca6dfe269fff82949ae38110fe566bbaefa760c2742ed` | Divergente |
| `api/n8n/bridge.js` | `23489290b017ec4eba4fe5ad4dc43d2f3b80fe89365c2d81ad922c9ad4e1d049` | `4a70f78b7800add2a44f287c75a66a05336823db6b0a199983d84bf2dc739acc` | Divergente |
| `api/n8n/telegram-tick.js` | `69148d060d5ce5c72e456870c6e2401db353e7c03df48b78381f4984c81694b` | `40ef25107e0fc5cb4476f0ebe373ccfe68028a116a85dac9bd9cc8ae92ad944c` | Divergente |

Esta comparação impede declarar os ambientes sincronizados. Antes de publicar qualquer ajuste será necessário revisar os arquivos de produção relevantes e reconciliar as diferenças sem substituir trechos válidos.

## Inventário de recursos a preservar

A referência é `docs/RADAR-FUNCTIONAL-INVENTORY.md`, complementada pelo mapa de navegação em `docs/RADAR-NAV-DESIGN-PRECHANGE-INVENTORY.md`, o catálogo `docs/RADAR-API-ROUTE-CATALOG-2026-10-19.md` e os contratos no `AGENTS.md`. A organização de Ofertas, IA e Redes é somente de navegação: manter os sete destinos principais, ids/hash atuais, as cinco telas existentes, a rota `/radar-video-ia`, handlers, modais, integrações, APIs, scheduler, dados por `account_id` e as configurações de segurança. Não remover telas, controles, provedores ou caminhos antigos.

## Correções e reteste desta rodada

- A hierarquia da tela Ofertas removeu o título duplicado sem apagar destinos. Ofertas/Cupons, Curador, IA, Redes/Campanhas, Estúdio, Agente Radar Social, Conexões, Nova oferta e o link existente Radar Vídeo IA continuam acessíveis.
- Em telas até 900 px, as ações do cabeçalho voltaram ao fluxo da página; o E2E confirma que não cobrem conteúdo. Conexões e criação de oferta permanecem acessíveis, com CTA contextual na tela de catálogo.
- Foi adicionada a **IA Central** consultiva em `api/ai/orchestrator.js` e no workspace IA. A rota é autenticada, lê contagens/estados agregados da própria conta, não escreve no banco e força `requiresApproval: true`; o painel avisa que a consulta pode consumir cota ou gerar custo. Nenhum provedor pago foi chamado nos testes.
- O catálogo de rotas agora registra 77 endpoints da branch. Hatchable v324 segue com 76 APIs mais seis páginas; a IA Central ainda não está publicada.
- A auditoria n8n detalhada está em `docs/n8n/AUDITORIA-2026-10-19.md`; workflow remoto não foi alterado.
- `npm run check:release` passou, incluindo build, unitários, E2E e auditoria npm.
- Build `node scripts/check-source.mjs`: passou, 125 arquivos JavaScript verificados.
- E2E: 3/3 passaram; IA Central usa resposta interceptada no navegador. Capturas revisadas: `test-results/offers-workspace-375.png`, `test-results/offers-workspace-714.png` e `test-results/ia-central-plan.png`.
- Unitários: `npm test` inclui agora `.test.mjs` e `.test.js`; 120/120 passaram, incluindo os três contratos Lomadee que antes estavam fora do script.
- Dependências: `npm audit --audit-level=moderate` passou, zero vulnerabilidades reportadas.
- Divergência GitHub↔Hatchable permanece. Não implantar até reconciliar os arquivos relevantes e preservar o passo de revisão do Modo Copiador já existente na produção.

## Estado final desta rodada

**Auditoria ainda em andamento.** Os 32 itens originais estão mantidos. A suíte local está aprovada, mas integrações externas, publicação real, restore verificado de backup, teste de carga e sincronização de produção não foram comprovados. Itens sem credenciais, permissões, dados elegíveis ou ambiente de restauração permanecem parciais/pendentes. Nenhuma oferta real foi publicada.
