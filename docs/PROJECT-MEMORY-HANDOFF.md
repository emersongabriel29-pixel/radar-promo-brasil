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