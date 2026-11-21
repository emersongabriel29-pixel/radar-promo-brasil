# Radar Promo Brasil — Memória operacional e handoff

Este documento padroniza a continuidade entre Codex, ChatGPT, revisores e agentes. É memória versionada de projeto, não um banco de dados operacional nem substituto de evidências.

## Fonte da verdade
1. Código e commits no GitHub.
2. Estado/manifesto e deployments do Hatchable.
3. Logs, testes, relatórios e resultados de ferramentas datados.
4. Documentação versionada, incluindo este handoff.
5. Conversas antigas apenas como contexto histórico até reconfirmação.

## Regras
- Não inventar fatos; marcar VERIFICADO, HISTÓRICO, INFERÊNCIA, NÃO VERIFICADO ou BLOQUEADO.
- Nunca registrar tokens, passwords, API keys, cookies, dados pessoais, payloads sensíveis, links privados de acesso ou secrets.
- Atualizar a memória somente com mudanças relevantes, mantendo histórico de decisões e links para evidências.
- Não declarar uma feature pronta sem arquivo/commit, teste ou evidência.
- Não alterar o projeto para "limpar" a memória; preservar pendências, riscos e decisões ainda válidas.
- Separar estado GitHub, Hatchable live, branch/PR, e ambiente de teste.

## Modelo de atualização de handoff
- Data UTC:
- GitHub main commit:
- Branch/PR atual:
- Hatchable live version e data verificada:
- Objetivo/escopo atual:
- Alterações concluídas (com evidências):
- Testes executados e resultado:
- Pendências:
- Bloqueios:
- Riscos/side effects:
- Próxima ação exata:
- Ações explicitamente NÃO realizadas (ex.: deploy, publicação, envio real):

## Continuidade — atualização 2026-11-21

### Estado verificado nesta sessão
- Hatchable project ID: `proj_1Xj94QxQmCam`.
- Deployment live mais recente retornado pelo Hatchable: v672, deploy timestamp 2026-11-17T01:06:26Z, 348 files, 136 functions.
- Dry-run do estado atual: `ok=true`, 0 errors, 0 warnings; estimativa do próximo deploy v673, 16 public files, 127 API functions, 9 pages, 74 migrations, auth_enabled=false. Dry-run não é deploy nem prova de funcionamento.
- O arquivo `prototypes/remotion-offer-video/README.md` e `package.json` foram lidos no GitHub. O protótipo Remotion é código isolado, com dependências pinadas, dados sintéticos; não há lockfile, instalação ou render comprovados.
- A memória existente estava desatualizada: descrevia o protótipo Remotion como ainda não criado, apesar dos arquivos já existirem no repositório. Corrigir essa divergência por este registro.
- Nenhuma mudança foi feita no Hatchable, banco, filas, ofertas, APIs, canais ou produção.

### Status dos cinco objetivos
1. **Remotion render/demo — BLOQUEADO:** código existente, mas não há runtime de shell/Node para instalar/renderizar neste ambiente. Nenhum MP4 foi produzido ou validado.
2. **Auditoria de segurança arquivo a arquivo — PARCIAL:** triagem histórica e relatório de status registrados em `docs/FINAL-AUDIT-STATUS-2026-11-21.md`. Não é auditoria completa; revisão de todas as rotas, SQL, tenant isolation, OAuth/webhooks, uploads, SSRF, secrets, dependências e execução de testes continua pendente.
3. **Revisão visual real mobile/desktop — BLOQUEADA:** não há ferramenta de browser/screenshot nesta sessão. Nenhuma captura ou inspeção visual foi fabricada.
4. **Memória operacional — PARCIAL/ATUALIZADA:** este handoff corrige a informação do Remotion, registra estado verificado, pendências e limites.
5. **Monitoramento recorrente — VERIFICADO:** automação criada, ID `6b02113310108191b0e1428a92cb30f0`, semanal às segundas 08:30 America/Sao_Paulo, iniciando 2026-11-23. Escopo read-only: GitHub/Hatchable, regressões, segurança, comparação de estados, screenshots/render somente se ferramentas disponíveis; não corrigir, publicar, mergear ou deployar automaticamente.

### Continuação — workflows de CI propostos nesta branch
- `.github/workflows/radar-remotion-render.yml`: renderiza fixtures sintéticas vertical/horizontal e preview still em GitHub Actions e arquiva artefatos por 7 dias. Criado, mas ainda sem run verificado.
- `.github/workflows/radar-dependency-audit.yml`: executa `npm audit` e arquiva JSON; relatório precisa de revisão. Criado, sem run verificado.
- `.github/workflows/radar-codeql.yml`: CodeQL security-extended para JS/TS. Criado, sem run verificado.
- Esses workflows não fazem deploy, publicação nem integração com Hatchable; não são evidência de execução até os resultados do Actions serem verificados.

### Regras específicas desta etapa
- Não declarar render, segurança integral ou visual review concluídos sem artefatos/evidências.
- Não fazer deploy, merge, publicação, envio real ou alteração de dados operacionais.
- A PR de documentação/handoff é proposta e precisa de revisão; não foi mergeada.

### Próximas ações
1. Em ambiente com shell/Node isolado, instalar dependências pinadas do protótipo Remotion, gerar lockfile, revisar licença/risco, renderizar fixture sintética, validar MP4 (codec, duração, dimensões, reprodução, tamanho) e registrar artefato.
2. Executar auditoria estática completa em todos os arquivos/rotas e revisar achados manualmente; documentar arquivo, linha, evidência, impacto, confiança e recomendação.
3. Capturar app real em viewport mobile e desktop com browser, revisar acessibilidade/layout e registrar screenshots e achados.
4. Revisar PR e validar CI; reconciliar GitHub/Hatchable antes de qualquer deploy.
5. A automação semanal reporta resultados, não altera código nem produção.

## Registro da adoção open source (histórico)
- 2026-11-21: plano dos cinco projetos integrado ao main no commit `deb355d919751c3803f6290edbf9a8dd464d0762`.
- Cloudflare Security Audit: skill Radar adaptada criada nesta branch; não executa auditoria nem instala dependências.
- ClaudeMem: ainda não instalado. A memória versionada acima é o fluxo de fallback seguro; avaliar ClaudeMem como ferramenta externa de agente antes de adoção.
- Design: `.codex/skills/ui-ux-pro-max/` já existe no main e foi verificada; não duplicar. A integração de design deve consultar essa skill e avaliar Impeccable quando repositório/licença confirmados.
- FreeLLM API: repo exato do vídeo não identificado com confiança; não instalar homônimo. Nenhum provider atual alterado.
- Remotion: protótipo isolado criado em PR #208; código não equivale a instalação ou render. Runtime Hatchable não deve receber renderização pesada sem prova de compatibilidade. Próxima etapa é protótipo externo isolado e synthetic fixtures.

## Regra final
**Não alucinar. Não presumir. Não apagar. Não sobrescrever cegamente. Não quebrar. Não esquecer.**

Pensar antes de alterar; prever antes de executar; preservar antes de otimizar; testar antes de aprovar; comparar antes de sincronizar; validar antes de implantar; registrar antes de encerrar.


## Atualização de evidências — 2026-11-21 (após execução CI)
- Remotion synthetic render concluído no GitHub Actions run 44953749308. Artifact 14726347622 inspecionado: MP4 vertical 1080×1920 H.264/30fps/15s; horizontal 1920×1080 H.264/30fps/15s; still PNG 1080×1920. Fixture contém dados fictícios; não é vídeo de oferta real.
- npm audit do protótipo isolado concluído: 296 dependências, zero vulnerabilidades reportadas; isso não cobre dependências do Radar inteiro.
- CodeQL security-extended JavaScript/TypeScript run 44953749197 concluiu e upload SARIF foi processado. Lista/quantidade dos alertas ainda não foi consultada; não afirmar zero findings.
- CI principal run 44953749284 passou build, unit tests, npm audit moderate e Playwright E2E.
- Hatchable revalidado: v672 live, 348 arquivos, 136 funções. Dry-run sem erros/warnings; estimativa 127 API functions + 9 pages, 74 migrations. Sem deploy ou alteração no Hatchable.
- Documentação de status recebeu retificação e evidências nesta branch; commit mais recente da retificação de status: 127d7940e90e03963149a55fda6aacc3d9471828. Este handoff ainda precisa de atualização/integrar via PR #211.
- Pendências: triagem dos alertas CodeQL; auditoria manual completa e reconciliação de contagens de rotas; screenshots reais mobile/desktop (browser externo indisponível); integração da documentação na main após revisão; receber/revisar o relatório da execução imediata do monitoramento.
- A automação semanal permanece ativa para segunda-feira 08:30 America/Sao_Paulo. Uma execução sob demanda foi solicitada em 21/11; não presumir relatório entregue até resultado disponível.

## Retificação final de execução — 2026-11-21 (CI/artefatos inspecionados)

- O run Remotion 44953749308 terminou com sucesso. ZIP artifact 14726347622 baixado e inspecionado nesta sessão: radar-offer-vertical.mp4 (H.264, 1080×1920, 30 fps, 15 s, 659.241 bytes), radar-offer-horizontal.mp4 (H.264, 1920×1080, 30 fps, 15 s, 690.458 bytes) e preview.png (1080×1920, 1.519.427 bytes). A prévia foi aberta visualmente. Fixtures contêm dados fictícios; não é criativo de oferta real.
- O run npm audit 44953749290 terminou com sucesso; ZIP artifact 14726114936 baixado e JSON lido. Resultado do protótipo isolado: 296 dependências (242 prod, 3 dev, 52 optional), 0 vulnerabilidades info/low/moderate/high/critical. Não representa a árvore completa de dependências do Radar.
- O run CodeQL 44953749197 terminou com sucesso e log confirma exportação SARIF e upload concluído. O log também confirma ausência de on.push no workflow anterior, o que impedia análise automática de commits diretos à branch default. O resumo de alertas/contagem não está exposto pelas ferramentas disponíveis; nenhum resultado zero-alertas foi presumido.
- O workflow CodeQL foi corrigido nesta branch no commit b918ee50e5b87cb6af3f84ad6df4f5cbf9ba67de: github/codeql-action atualizado de v3 para v4, gatilho push para main adicionado e SARIF agora é arquivado como artefato por 30 dias para triagem manual. A nova execução ainda não foi confirmada; não declarar a mudança validada até o run/artifact aparecer.
- Avisos operacionais observados no log anterior: CodeQL Action v3 entra em depreciação em dezembro de 2026 e actions v4 executadas sob Node 20 emitiram aviso de runtime Node 20 depreciado/forçado para Node 24. A mudança para CodeQL v4 endereça o primeiro aviso; revisar versões de checkout/setup-node/upload-artifact em tarefa separada e validar compatibilidade antes de atualizar.
- CI principal 44953749284 concluiu build, testes unitários, npm audit moderate e Playwright E2E com sucesso.
- Branch codex/radar-final-audit-handoff-20261121 comparada com main: 10 commits à frente, 0 atrás na última comparação (base 0dfff4cb81476e3a47bdaf13322ceaf2609f8201). Alterações em 5 arquivos; PR #211 continua sem reviews e sem threads de revisão na última consulta.
- A automação semanal está habilitada para 23/11/2026 às 08:30 America/Sao_Paulo. Uma solicitação de execução imediata retornou um prompt inline, mas peek ainda mostra last_run=null e latest_result=null; portanto, não existe relatório de execução imediato confirmado.
- Pendências mantidas: triagem dos findings CodeQL com SARIF exportado, auditoria manual de todas as rotas/arquivos e reconciliação 114 declarações de acesso vs 127 rotas API vs 136 funções; screenshots reais mobile/desktop; nova execução CodeQL com artifact SARIF; revisão/integração da PR #211. Nenhum merge, deploy, publicação ou alteração operacional foi feito.

## Correção de reconciliação e bloqueio visual — 21/11/2026
- Reconciliação do inventário Hatchable: list_functions retornou 136 funções, sendo 127 rotas API + 9 páginas; list_files retornou 127 arquivos api/ e 9 pages/. A busca anterior por export const access com glob api/**/*.js retornou 114 porque esse padrão não incluiu os 13 arquivos diretamente na raiz api/. Repetindo a busca com glob api/*.js, o resultado foi 127/127 arquivos API com uma declaração export const access. Portanto, a divergência 114 vs 127 era limitação do glob, não 13 rotas sem declaração. Isso confirma presença de declaração, mas não valida se cada tier está correto nem a autorização dentro do handler.
- Captura visual real foi tentada com o browser gerenciado do próprio Hatchable, nos viewports 390×844 e 1440×900, sem cookies ou credenciais. A execução foi bloqueada antes de iniciar pelo limite mensal de database time do plano Free: 2,1h usadas frente a 2,0h disponíveis. Nenhuma screenshot do dashboard foi produzida; a revisão visual permanece bloqueada. Não se deve confundir com preview PNG Remotion.
- Workflow CodeQL atualizado para v4, gatilho push em main e arquivamento SARIF. A primeira execução pós-correção falhou apenas no passo de arquivamento porque o SARIF é gravado em ../results/javascript.sarif, não results/javascript.sarif; a análise e o upload de code scanning em si terminaram com sucesso. O caminho foi corrigido para ../results/javascript.sarif no commit 66241bb7f61a578418be7e8f24bfb4c4a100139a. Nova execução run 44954391250 estava em andamento na última consulta; aguardar job e artefato antes de considerar validado.
- O run 44954391250 é PR-triggered e usa CodeQL v4. A última consulta encontrou o job Analyze JavaScript and TypeScript em andamento durante init, sem artefato ainda. Link: https://github.com/emersongabriel29-pixel/radar-promo-brasil/actions/runs/44954391250.
- A chamada run_now da automação devolveu um prompt inline para executar a auditoria nesta conversa; peek continuou sem last_run/latest_result, portanto não há relatório de execução da automação registrado. A auditoria manual realizada nesta sessão é trabalho direto desta conversa, não deve ser atribuída como relatório da automação.
- O projeto Hatchable permanece v672 live (136 funções); dry-run segue ok=true, 0 errors, 0 warnings. Não foi feito deploy, merge, teste de credenciais, publicação ou alteração de dados.
## Findings adicionais da inspeção de rotas públicas e regex — 21/11/2026

### Defeitos funcionais confirmados por inspeção estática + teste isolado de expressão regular
- MEDIUM — api/extension-offers-preview.js:30: regex de autenticação Bearer foi gravada com `\\\\s+` em regex literal (duas barras invertidas no arquivo). Teste isolado em Node confirmou que `Bearer rpb_ext_...` válido não casa, enquanto a expressão correta com `\\s+` casa. A rota pública retorna 401 para tokens Android válidos; fluxo de prévia/extração automática do compartilhamento Android fica quebrado. Nenhuma requisição autenticada real foi feita.
- LOW — api/extension-offers-preview.js:49: regex `replace(/\\\\s+/g,' ')` também está sobre-escapada e não normaliza sequências de espaços; efeito secundário na limpeza de título/metadata.
- MEDIUM — api/integrations/magalu-clone.js:242 e 247: regex literais sobre-escapadas no fallback Gemini. Teste isolado confirmou que o parser não remove fences de resposta ```json e JSON.parse falha; normalização de preço com `[^\\\\d.,]`/decimal thousands também falha para valor como R$ 1.299,90 (resultado '..' no teste). Afeta o caminho de fallback de extração quando a leitura HTML não encontra produtos; não foi testado em produção.
- LOW — api/jobs/telegram.js:196: regex de substituição de URL de tracking usa `[^\\\\s]+` em vez de `[^\\s]+`; teste isolado confirmou que não reconhece URL real `https://radar-promo-brasil.hatchable.site/api/r/<id>`. O worker ainda constrói a mensagem e publica via fluxo existente; o defeito afeta somente a substituição preventiva do link curto no texto-base.
- Os testes acima foram executados somente em Node local com exemplos sintéticos. Nenhum dado, fila, oferta, conta ou canal foi acessado ou alterado.

### Rotas públicas e webhooks — revisão inicial
- 127/127 rotas API têm declaração export const access. Distribuição atual: 86 member, 2 admin, 17 public, 22 scheduler. A presença da declaração não valida por si só a autorização lógica dentro de cada handler.
- Nas rotas públicas examinadas, os fluxos Android/Chrome usam token bearer armazenado como hash; WhatsApp clone, Telegram, n8n e worker externo verificam segredo/HMAC; callbacks OAuth Magalu e Mercado Livre consomem state com DELETE condicional; YouTube OAuth usa state de curta duração, mas SELECT e DELETE não são atômicos (revisar resistência a corrida/replay).
- api/mercadolivre/notifications.js é pública e confere application_id, limita lote a 10, valida tópico/recurso e persiste evento idempotente; o cron api/jobs/mercadolivre-notifications.js busca os dados oficiais via meliGet antes de alterar ofertas. A documentação oficial do Mercado Livre recomenda allowlist de IPs atualizada ou tratar webhook apenas como aviso e consultar o recurso diretamente na API oficial. Não foi confirmado uso de allowlist no endpoint; recomendar rate limit/allowlist como hardening, não classificar como vulnerabilidade confirmada.

### CodeQL e próximos passos
- CodeQL run 44954570478 (workflow v4 + SARIF stage em codeql-results/) está em andamento. A execução anterior falhou apenas na etapa de arquivamento porque upload-artifact não permite paths ../; workflow corrigido para copiar SARIF para dentro do workspace antes de upload. Não considerar SARIF disponível até artifact aparecer.
- Auditoria manual completa de todas as rotas ainda não terminou. Findings funcionais acima devem ser triados/corrigidos em PR separado após autorização; nenhuma correção foi aplicada nesta sessão.
## Triagem SARIF CodeQL — 21/11/2026

- Run CodeQL v4 44954570478 concluído com sucesso; artifact SARIF 14726564340 baixado e inspecionado (720.819 bytes). Contém 22 resultados em 5 regras: bad-tag-filter 1; double-escaping 7; incomplete-sanitization 5; incomplete-multi-character-sanitization 4; regex/missing-regexp-anchor 4. O SARIF não trouxe `level`, `security-severity` nem metadata de severidade por resultado; portanto, não atribuir classificação automática nem afirmar zero findings.
- Triagem contextual inicial: os resultados bad-tag-filter e incomplete-multi-character-sanitization atingem parser de HTML externo (Admitad/Magalu Clone/Rakuten). Os títulos/strings resultantes são usados como dados e, nos caminhos da interface examinados, passam por esc() antes de innerHTML ou por textContent; não foi confirmado XSS. Manter como LOW/hardening até revisão completa dos sinks.
- Double-escaping (7): caminhos de decodificação de entidades HTML/XML; tende a afetar representação de texto. Nenhum sink executável foi confirmado nos fluxos amostrados; LOW/INFO.
- Incomplete-sanitization (5): replace('%','') em conversão numérica; afeta normalização de valores com mais de um sinal %, não é SQL injection nem execução de código nos usos examinados; LOW/INFO.
- Missing-regexp-anchor (4): regex de filtragem de URL AliExpress em lib/telegram.js e testes. É um filtro de texto/link, não uma validação de destino para fetch; não foi confirmado bypass de SSRF/autorização. LOW/INFO; rever se o helper passar a ser usado como allowlist.
- Busca global de sinks DOM: innerHTML existe (93 ocorrências em 6 arquivos) e insertAdjacentHTML (3), portanto a busca antiga limitada a public/**/*.js era incompleta. Foram examinados caminhos de vitrine, histórico, painel de inteligência, API credentials, Mercado Livre e publicação scheduler; campos dinâmicos relevantes estavam escapados por esc() ou escritos com textContent. Revisão de todos os 93 usos ainda não terminou.
- Nenhum resultado CodeQL no SARIF para SQL injection, request forgery/SSRF ou XSS direto; isso não substitui revisão manual nem prova ausência dessas classes.
- Run CodeQL mais recente 44954620497 (head 75f4d320...) ainda estava em andamento na última consulta; run 44954570478 já forneceu SARIF triável para o mesmo código de aplicação (commits seguintes foram apenas documentação).

## Confirmação de presença no deployment live v672

- A manifestação de arquivos do deployment Hatchable v672 (live, 2026-11-17T01:06:26Z) foi comparada com hashes do projeto atual; os três arquivos com defeitos funcionais têm hash idêntico ao artefato publicado: api/extension-offers-preview.js 43d3e9df2beb3e2e0f909e9795aaaca1373762edcde71d830f6a5ab70b8faea1; api/integrations/magalu-clone.js d8f7dc9921d952e6b8653a23e9a49d604ba6f6bfe8bdb1ece25af25980515b5c; api/jobs/telegram.js 7c79bb86db5d7d736362ab0ce7fa1a432b27d47805d534842ec3d8b823a9a072. Isso confirma que o código com os defeitos está no pacote publicado; não houve chamada runtime autenticada nem modificação da produção.
- npm audit do protótipo Remotion: 296 dependências (242 prod, 3 dev, 52 optional), 0 vulnerabilidades. CI principal também passou `npm audit --audit-level=moderate`; não foi arquivado JSON de auditoria da árvore principal, então não inferir contagem completa.
- O branch tem 19 commits à frente e 0 atrás da main; PR #211 permanece open/draft, não merged, sem reviews/threads. A PR inclui apenas 5 arquivos: 3 workflows e 2 documentos. Não foram alterados arquivos de runtime do Radar.