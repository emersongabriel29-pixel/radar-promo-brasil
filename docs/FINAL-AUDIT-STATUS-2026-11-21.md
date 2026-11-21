# Auditoria final de status — Radar Promo Brasil

**Data:** 2026-11-21  
**Escopo:** os cinco itens solicitados: Remotion demo, segurança, revisão visual, memória operacional e monitoramento.  
**Tipo:** verificação de estado e triagem; não é auditoria completa nem pentest.

## Resumo executivo
- **Remotion:** protótipo de código presente no GitHub; execução/render bloqueados por falta de shell/Node nesta sessão.
- **Segurança:** triagem histórica disponível; auditoria completa arquivo a arquivo não executada. Não afirmar que o sistema está seguro.
- **Visual:** revisão real bloqueada por ausência de navegador/screenshot.
- **Memória:** handoff atualizado com estado verificado e pendências.
- **Monitoramento:** automação semanal read-only criada e confirmada.

## Evidências verificadas nesta sessão
- Hatchable project: `proj_1Xj94QxQmCam`.
- Último deployment listado como live: v672, 2026-11-17T01:06:26Z, 348 files e 136 functions.
- Dry-run atual retornou `ok=true`, errors=0, warnings=0; estimativa de próximo deployment v673, 16 public files, 127 API functions, 9 pages e 74 migrations. **Dry-run não prova execução runtime, sincronização GitHub↔Hatchable, nem deploy.**
- GitHub: `prototypes/remotion-offer-video/README.md` e `package.json` existem; package fixa Remotion/CLI 4.0.545, React 18.3.1, React DOM 18.3.1 e TypeScript 5.7.2. Scripts declarados: start, render, still.
- Não foi executado npm install, não foi gerado lockfile, não houve render e não há MP4 validado nesta sessão.
- Nenhuma alteração no Hatchable, banco, fila, ofertas, publicação ou produção.

## 1 — Remotion
**Status: BLOQUEADO (execução). Código: VERIFICADO.**

O protótipo existente é isolado e usa fixtures sintéticas. Ainda falta:
- confirmar requisitos/licença do Remotion e dependências;
- instalar em ambiente isolado e gerar lockfile;
- executar preview e render vertical/horizontal;
- validar MP4 com ferramenta de inspeção de mídia, duração, dimensões, codec, tamanho e reprodução;
- revisar recursos/tempo e documentar artefato.

Não afirmar que vídeo foi criado. Nenhum artefato de vídeo está anexado.

## 2 — Auditoria de segurança
**Status: PARCIAL.**

### Triagem histórica (não reexecutada integralmente nesta sessão)
- Inventário anterior identificou 136 funções Hatchable: 127 rotas API e 9 páginas internas.
- Declaração `export const access` encontrada nas 127 rotas na triagem anterior. Isso apenas confirma presença de declaração, não correção de autorização.
- Scans anteriores de escopo limitado não localizaram `eval(`, `new Function`, `child_process`, require dinâmico ou CORS wildcard em `api/**/*.js`.
- Amostras SSRF, upload e frontend foram inspecionadas anteriormente, mas não em todas as rotas/arquivos.
- Migrations examinadas não mostraram políticas RLS no trecho investigado. Isso é uma questão a revisar, não vulnerabilidade confirmada: isolamento pode ser implementado na camada de aplicação.

### Trabalho ainda necessário
Revisar todos os arquivos e rotas com evidência e classificação:
- autenticação e autorização por endpoint/tier;
- isolamento de tenant/account e controles em toda leitura/escrita;
- SQL parametrizado e construções dinâmicas;
- SSRF, URL validation, redirects, DNS rebinding e allowlists;
- OAuth callbacks, webhooks, assinatura/replay;
- uploads, MIME, tamanho, armazenamento e execução;
- segredos, logs, erros e exposição de dados;
- CORS, CSRF, XSS, headers e frontend;
- dependências, lockfiles, vulnerabilidades e cadeia de supply;
- scheduler, filas, concorrência, idempotência e endpoints de publicação;
- migrations, backup/restore e integridade.
Cada finding deve incluir caminho, linha, evidência, impacto, confiança, classificação CRITICAL/HIGH/MEDIUM/LOW/INFO, recomendação e teste de confirmação. Separar confirmado de hipótese. Sem pentest/probes live.


### Scans read-only adicionais executados nesta sessão (Hatchable)
- Inventário atual de funções: 136 (tool response), com rotas API e páginas; não confundir com o dry-run que estimou 127 API functions e 9 pages.
- Regex `export const access` em `api/**/*.js`: 114 arquivos correspondentes. Isso não reconcilia por si só com o inventário de 127 API functions; precisa mapear funções/arquivos e revisar endpoints que não correspondem. **Possível lacuna de cobertura, não vulnerabilidade confirmada.**
- Regex para `eval(`, `new Function`, `child_process` e `exec(`: 1 ocorrência em `api/ai/video-ia.js`, linha 45, referente a `anchorRe.exec(html)` de RegExp — falso positivo da busca; não é execução de shell.
- Busca por padrões de SQL concatenado: 13 ocorrências em 10 arquivos. Inspeção de linhas selecionadas mostra composição de cláusulas/helpers e placeholders parametrizados; não foi confirmado SQL injection. Revisão manual completa dessas construções permanece pendente.
- Busca `fetch/URL/http(s)`: 236 ocorrências em 55 arquivos. É inventário de superfície para SSRF/redirect/allowlist, não finding.
- Busca de `innerHTML`, `outerHTML`, `document.write`, `javascript:` em `public/**/*.js`: zero ocorrências. Escopo limitado; não cobre todos os scripts inline/HTML nem XSS por outros sinks.
- Busca de indicadores de segredo (`API_KEY`, `SECRET`, `TOKEN`, `PASSWORD`, `process.env`): 38 ocorrências em 23 arquivos, esperadas em código que lê configurações; nenhum valor secreto foi transcrito nem validado.
- Estas buscas não substituem revisão de código, testes, dependências ou controles runtime. Não foram realizadas chamadas de endpoints, testes de credenciais, probes de produção ou modificações.

## 3 — Revisão visual mobile e desktop
**Status: BLOQUEADO.**

Não houve browser nem screenshot real nesta sessão. Não usar inspeção de código como substituto de revisão visual. Próxima execução deve capturar app real em:
- mobile viewport (aprox. 390×844);
- desktop viewport (aprox. 1440×900);
- estados relevantes: login/entrada, dashboard, radar, ofertas, publicações, canais, relatórios e configurações, conforme acessibilidade do ambiente.

Registrar screenshots, problemas de hierarquia, overflow, navegação, densidade, contraste, foco/teclado, acessibilidade, loading/error/empty states. Não enviar/publicar nada.

## 4 — Memória operacional
**Status: PARCIAL — documento corrigido nesta proposta.**

A memória anterior estava desatualizada sobre Remotion. O handoff agora registra:
- protótipo existente e localização;
- dependências/scripts declarados;
- ausência de instalação/render comprovados;
- estado Hatchable verificado e limite do dry-run;
- auditoria parcial e visual review bloqueada;
- automação recorrente e escopo read-only;
- próximos passos e ações não realizadas.

Revisar e aprovar a PR de documentação antes de integrar à main.

## 5 — Monitoramento recorrente
**Status: VERIFICADO — ativo.**

Automação ID: `6b02113310108191b0e1428a92cb30f0`  
Cadência: semanal, segunda-feira, 08:30, America/Sao_Paulo, a partir de 2026-11-23.

Escopo: read-only; revisar GitHub e Hatchable, divergências, PRs/branches/workflows, segurança e regressões; reportar findings classificados com evidência. Screenshots/render somente se ferramentas estiverem disponíveis. Não aplicar correções, fazer merge/deploy, publicar, enviar mensagens, alterar banco/filas ou testar credenciais. Notificar prontamente sobre risco crítico/alto confirmado.

## Limites desta execução
- Sem shell/Node: Remotion não instalado nem renderizado.
- Sem browser/screenshot: visual review não realizada.
- Auditoria completa de arquivos não realizada.
- Não houve deploy, merge, publicação ou alteração operacional.
- GitHub/Hatchable não foram declarados sincronizados; só foram consultados estados pontuais.

## Critério de conclusão global
A solicitação só será **CONCLUÍDA** quando:
1. Render de demonstração for produzido e validado;
2. Auditoria de segurança completa tiver revisão de findings e evidências;
3. Screenshots mobile/desktop reais forem revisados;
4. Handoff for integrado e reconciliado com estado atual;
5. Monitoramento estiver ativo e seu primeiro relatório for recebido/revisado.

Estado atual: **PARCIALMENTE CONCLUÍDO / 3 itens bloqueados ou parciais, 2 concluídos (handoff proposto e automação criada)**.


## Continuação — CI de execução e análise adicionados (2026-11-21)

Para reduzir o bloqueio de ausência de runtime local, foram adicionados workflows isolados à branch da PR. **Ainda não foram executados nem validados pelo GitHub Actions.**

- `.github/workflows/radar-remotion-render.yml`: em PR com mudanças no protótipo ou por execução manual, instala Node 20 e dependências pinadas, renderiza fixture sintética vertical e horizontal e uma imagem still, verifica que arquivos existem e publica artifact por 7 dias. Não publica ofertas nem conecta ao Radar/Hatchable.
- `.github/workflows/radar-dependency-audit.yml`: executa `npm audit --json` e arquiva o relatório; o comando não falha automaticamente por vulnerabilidade, para permitir triagem, mas o resultado precisa ser revisado.
- `.github/workflows/radar-codeql.yml`: análise CodeQL `security-extended` para JavaScript/TypeScript, acionada manualmente e em PRs que toquem código/arquivo do workflow.

Esses workflows aumentam a capacidade de executar render e análise no CI, mas **não são evidência de sucesso até que os runs terminem e os artifacts/findings sejam examinados**. Dependências instaladas no CI e lockfile ainda precisam ser reconciliados e revisados; não foi adicionado lockfile neste commit.

A revisão visual do app real continua bloqueada: o workflow Remotion captura somente o frame do protótipo sintético, não screenshots do dashboard Radar.


## Retificação com evidências dos workflows — 2026-11-21

Esta seção substitui as declarações anteriores de que Remotion/CodeQL/npm audit ainda não tinham sido executados. O texto anterior é histórico do momento em que foi escrito.

### Remotion — EXECUTADO E ARTEFATOS INSPECIONADOS
- Workflow run: https://github.com/emersongabriel29-pixel/radar-promo-brasil/actions/runs/44953749308 — job `render-synthetic-demo` concluído com sucesso; instalação, render vertical, render horizontal, still, validação de arquivos e upload concluídos.
- Artifact `radar-remotion-synthetic-demo`, ID `14726347622`, 2.797.702 bytes; ZIP baixado e inspecionado.
- `radar-offer-vertical.mp4`: H.264, 1080×1920, 30 fps, 15,000 s, 659.241 bytes.
- `radar-offer-horizontal.mp4`: H.264, 1920×1080, 30 fps, 15,000 s, 690.458 bytes.
- `preview.png`: PNG 1080×1920, 1.519.427 bytes; imagem inspecionada. Conteúdo usa produto/loja de demonstração e declara dados fictícios.
- Os arquivos têm estrutura/metadata legíveis por ffprobe; não foi feita revisão humana quadro a quadro nem validação de publicação/uso comercial. São demos sintéticas, não criativos de ofertas reais.

### Dependências — AUDIT CONCLUÍDO PARA O PROTÓTIPO
- Workflow run: https://github.com/emersongabriel29-pixel/radar-promo-brasil/actions/runs/44953749290 — job concluído com sucesso.
- Artifact `radar-remotion-npm-audit`, ID `14726114936`, contém `npm-audit.json`.
- Resultado: 296 dependências totais (242 prod, 3 dev, 52 optional); 0 vulnerabilidades reportadas (0 info/low/moderate/high/critical).
- Escopo é somente `prototypes/remotion-offer-video` e sua árvore instalada no CI. Não é auditoria de dependências do Radar inteiro.
- O workflow usa `npm audit --json || true`; portanto, status verde sozinho não é gate de segurança. O JSON foi aberto e verificado.

### CodeQL — ANÁLISE EXECUTADA; ALERT COUNT NÃO CONFIRMADO NESTA INTERFACE
- Workflow run: https://github.com/emersongabriel29-pixel/radar-promo-brasil/actions/runs/44953749197 — análise JavaScript/TypeScript security-extended concluída e resultados SARIF enviados ao GitHub com confirmação de upload/processamento.
- Logs confirmam extração, interpretação de queries, exportação SARIF e upload concluído. O log consultável nesta sessão não expõe a lista/count final de alertas; portanto, não declarar “zero findings”. É necessário abrir Code scanning > Alerts no GitHub e revisar cada alerta com caminho/linha/fluxo.
- Log do CodeQL registra aviso de depreciação de Node 20 em actions usadas; atualizar actions/runtime em tarefa própria após avaliar compatibilidade.

### CI principal — TESTES CONCLUÍDOS
- Workflow run: https://github.com/emersongabriel29-pixel/radar-promo-brasil/actions/runs/44953749284 — job `validate` concluído com sucesso.
- Passaram: `npm ci`, `npm run build`, `npm test`, `npm audit --audit-level=moderate`, instalação do Chromium e `npm run test:e2e` (Playwright).
- O upload de artifact foi ignorado pelo workflow (step skipped); não interpretar como falha dos testes.

### Estado Hatchable — REVALIDADO
- Deployment live continua v672, implantado em 2026-11-17T01:06:26Z, 348 arquivos e 136 funções registradas.
- Dry-run: `ok=true`, zero erros e zero warnings; estimativa de 16 public files, 127 API functions, 9 pages, 74 migrations, auth_enabled=false, próxima versão 673. Dry-run não é deploy nem prova de equivalência com main.
- Inventário de funções: 136 entradas. A diferença entre 136 funções registradas e 127 API functions + 9 pages do dry-run precisa ser conciliada por inventário de arquivos/rotas; não é evidência automática de defeito.

### Monitoramento — EXECUÇÃO IMEDIATA SOLICITADA E INICIADA
- Automação `6b02113310108191b0e1428a92cb30f0` foi acionada uma vez sob demanda nesta conversa; o executor devolveu prompt inline para executar agora. O primeiro relatório completo ainda depende de concluir a auditoria read-only; isso não altera o agendamento semanal de segunda-feira às 08:30 America/Sao_Paulo.

### Pendências reais após esta retificação
1. Abrir e revisar alertas CodeQL/SARIF (o upload concluiu, mas a contagem e triagem dos alertas não foram recuperadas pela interface disponível).
2. Auditoria manual arquivo a arquivo e reconciliação das 114 declarações `export const access` encontradas no scan anterior contra 127 rotas API estimadas no dry-run e 136 funções registradas.
3. Capturar screenshots reais do dashboard em mobile e desktop; não há ferramenta de browser/screenshot externo disponível nesta sessão. Playwright E2E verde não substitui screenshots reais nem revisão visual.
4. Integrar os documentos de handoff/status à `main` por PR #211 após revisão. Não houve merge nem deploy.
5. Primeiro relatório da automação semanal ainda está pendente; execução sob demanda foi solicitada, mas não deve ser tratada como relatório entregue até receber o resultado.

**Conclusão atualizada:** Remotion render e validação de dependências do protótipo concluídos; CI principal concluído; CodeQL executado com SARIF enviado, findings pendentes de triagem; revisão visual e auditoria manual completa ainda abertas; documentação permanece em PR draft #211; Hatchable permanece v672 sem alterações.

## Continuação da auditoria — leitura direta dos artefatos e logs (21/11/2026)

### Evidência direta adicional
- Artifact Remotion 14726347622 baixado e inspecionado: vertical 1080×1920 H.264 30 fps 15,000 s 659.241 bytes; horizontal 1920×1080 H.264 30 fps 15,000 s 690.458 bytes; preview PNG 1080×1920 1.519.427 bytes. A prévia foi aberta e mostra composição demonstrativa com aviso de dados fictícios. Não foi feita revisão quadro a quadro.
- Artifact npm audit 14726114936 baixado e JSON lido: total 296 dependências (242 prod, 3 dev, 52 optional), vulnerabilidades total=0. Escopo exclusivo do protótipo Remotion.
- Logs CodeQL confirmam análise security-extended, exportação SARIF e upload processado. O log não contém resumo com quantidade de alertas; a ferramenta GitHub disponível nesta sessão não expõe listagem de Code Scanning Alerts. Resultado não pode ser declarado zero-alertas.
- Log CodeQL mostrou warning de workflow sem gatilho on.push para branch default e depreciação de github/codeql-action@v3 em dezembro de 2026. Workflow corrigido na branch no commit b918ee50e5b87cb6af3f84ad6df4f5cbf9ba67de: CodeQL action v4, push em main e arquivamento do results/javascript.sarif por 30 dias. Nova execução/artefato ainda não confirmados.
- Avisos Node 20: checkout@v4, setup-node@v4, upload-artifact@v4 e CodeQL actions emitiram aviso de depreciação do runtime Node 20, forçado para Node 24 no runner. Revisar atualização das actions separadamente com validação de compatibilidade.
- CI principal 44953749284: build, testes unitários, npm audit moderate, instalação do Chromium e Playwright E2E concluídos com sucesso.
- Comparação main...branch: 10 commits ahead, 0 behind; main base 0dfff4cb81476e3a47bdaf13322ceaf2609f8201. A branch alterou 5 arquivos nesta comparação. PR #211 sem reviews e sem threads na última consulta.
- Automação semanal ativa; run_now devolveu prompt inline, mas peek continuou com last_run=null/latest_result=null. A execução imediata não pode ser considerada realizada nem seu relatório entregue. Próxima execução agendada: 2026-11-23 08:30 America/Sao_Paulo.

### Próximas ações prioritárias
1. Aguardar nova execução CodeQL da branch com artifact SARIF e inspecionar resultados JSON/SARIF, classificar cada finding e separar falsos positivos.
2. Obter acesso à lista de Code Scanning Alerts ou usar artifact SARIF exportado para contabilizar e revisar todos os findings.
3. Completar auditoria manual de todas as rotas e arquivos; mapear as 114 ocorrências de export const access contra 127 API routes do dry-run e 136 funções registradas.
4. Capturar screenshots reais do dashboard em mobile e desktop usando browser com acesso à aplicação; não substituir por preview Remotion nem teste E2E.
5. Revisar PR #211 e integrar handoff/status à main somente depois de resolver ou documentar findings; não realizar merge/deploy automaticamente.

## Correção de reconciliação e bloqueio visual — 21/11/2026
- Reconciliação do inventário Hatchable: list_functions retornou 136 funções, sendo 127 rotas API + 9 páginas; list_files retornou 127 arquivos api/ e 9 pages/. A busca anterior por export const access com glob api/**/*.js retornou 114 porque esse padrão não incluiu os 13 arquivos diretamente na raiz api/. Repetindo a busca com glob api/*.js, o resultado foi 127/127 arquivos API com uma declaração export const access. Portanto, a divergência 114 vs 127 era limitação do glob, não 13 rotas sem declaração. Isso confirma presença de declaração, mas não valida se cada tier está correto nem a autorização dentro do handler.
- Captura visual real foi tentada com o browser gerenciado do próprio Hatchable, nos viewports 390×844 e 1440×900, sem cookies ou credenciais. A execução foi bloqueada antes de iniciar pelo limite mensal de database time do plano Free: 2,1h usadas frente a 2,0h disponíveis. Nenhuma screenshot do dashboard foi produzida; a revisão visual permanece bloqueada. Não se deve confundir com preview PNG Remotion.
- Workflow CodeQL atualizado para v4, gatilho push em main e arquivamento SARIF. A primeira execução pós-correção falhou apenas no passo de arquivamento porque o SARIF é gravado em ../results/javascript.sarif, não results/javascript.sarif; a análise e o upload de code scanning em si terminaram com sucesso. O caminho foi corrigido para ../results/javascript.sarif no commit 66241bb7f61a578418be7e8f24bfb4c4a100139a. Nova execução run 44954391250 estava em andamento na última consulta; aguardar job e artefato antes de considerar validado.
- O run 44954391250 é PR-triggered e usa CodeQL v4. A última consulta encontrou o job Analyze JavaScript and TypeScript em andamento durante init, sem artefato ainda. Link: https://github.com/emersongabriel29-pixel/radar-promo-brasil/actions/runs/44954391250.
- A chamada run_now da automação devolveu um prompt inline para executar a auditoria nesta conversa; peek continuou sem last_run/latest_result, portanto não há relatório de execução da automação registrado. A auditoria manual realizada nesta sessão é trabalho direto desta conversa, não deve ser atribuída como relatório da automação.
- O projeto Hatchable permanece v672 live (136 funções); dry-run segue ok=true, 0 errors, 0 warnings. Não foi feito deploy, merge, teste de credenciais, publicação ou alteração de dados.