# Radar Promo Brasil — registro de mudanças e análise de impacto

> Registro append-only de mudanças propostas, executadas, recusadas ou revertidas. Não apagar entradas antigas. Toda correção de registro deve ser feita por adendo datado.

## Objetivo

Prever efeitos colaterais antes de qualquer mudança, documentar o que foi realmente alterado e comprovar que o resultado correspondeu ao previsto.

Este log complementa:
- `docs/MASTER-CONTEXT.md`: regras permanentes, contexto e continuidade.
- `docs/AUDIT-LEDGER.md`: histórico sequencial das auditorias.

## Regras obrigatórias

1. Registrar a proposta antes de editar qualquer arquivo ou dado.
2. Identificar a causa raiz; se ainda não estiver confirmada, marcar como hipótese.
3. Ler o estado atual do arquivo/recurso e suas dependências.
4. Comparar GitHub e Hatchable antes de alterar código.
5. Listar efeitos diretos e indiretos, inclusive efeitos que podem ocorrer fora do arquivo editado.
6. Definir explicitamente o que não pode mudar.
7. Preferir a menor alteração reversível possível.
8. Definir testes e critérios de sucesso antes da execução.
9. Obter autorização para ações críticas, destrutivas, externas ou irreversíveis.
10. Depois, comparar o diff, executar testes e verificar efeitos observados.
11. Registrar falhas, alterações parciais e rollback; não ocultar tentativas malsucedidas.
12. Não declarar sucesso se a evidência não sustentar a conclusão.

## Classificação de risco

- **BAIXO:** alteração documental ou isolada, sem efeito no runtime/dados, reversível.
- **MÉDIO:** mudança em função ou componente com dependências conhecidas e testes disponíveis.
- **ALTO:** mudança transversal, integração, fila, scheduler, autorização, publicação ou schema.
- **CRÍTICO:** risco de perda/exposição de dados, interrupção ampla, migration destrutiva, publicação real ou ação irreversível.

A classificação deve considerar o pior efeito plausível sustentado pelo desenho do sistema, não apenas a quantidade de linhas alteradas.

## Checklist de análise antes da mudança

### A. Identidade e estado inicial
- [ ] Projeto e repositório corretos.
- [ ] Branch e commit confirmados.
- [ ] Versão e deployment Hatchable confirmados.
- [ ] Arquivos/recursos atuais lidos nas plataformas relevantes.
- [ ] Alterações pendentes e divergências identificadas.
- [ ] Auditoria anterior e decisões consultadas.

### B. Causa e objetivo
- [ ] Problema descrito de forma reproduzível.
- [ ] Causa raiz confirmada ou hipótese identificada.
- [ ] Resultado esperado mensurável.
- [ ] Escopo e itens fora do escopo definidos.

### C. Mapa de impacto
- [ ] Arquivos, funções, rotas e endpoints afetados.
- [ ] Chamadores, consumidores e dependências.
- [ ] Tabelas, colunas, índices, constraints e migrations.
- [ ] Integrações/APIs e credenciais envolvidas.
- [ ] Filas, estados, retries e idempotência.
- [ ] Agendamentos, concorrência e workers.
- [ ] Canais, destinos e risco de envio/publicação.
- [ ] Interface e fluxos de usuário.
- [ ] Chamadas, limites, latência e custo.
- [ ] Segurança, privacidade e exposição de dados.
- [ ] Compatibilidade com dados e versões anteriores.

### D. Previsão e salvaguardas
- [ ] Efeitos colaterais prováveis descritos.
- [ ] Cenários de falha previstos.
- [ ] Funcionalidades que devem permanecer intactas listadas.
- [ ] Alternativa menos invasiva considerada.
- [ ] Backup/snapshot adequado, quando necessário.
- [ ] Plano de rollback e limites de reversão definidos.
- [ ] Autorização explícita obtida, quando exigida.

### E. Plano de validação
- [ ] Testes de unidade.
- [ ] Testes de integração.
- [ ] Testes de regressão.
- [ ] Testes de segurança.
- [ ] Verificação de banco/dados.
- [ ] Verificação de filas e agendamentos.
- [ ] Verificação de chamadas/custos.
- [ ] Smoke tests sem efeitos externos reais.
- [ ] Critérios objetivos de aprovação definidos.

## Modelo de registro de mudança

Copie para cada proposta:

### CHG-[AAAA-MM-DD]-[identificador] — [descrição curta]

**1. Estado**
- Status: PROPOSTA | APROVADA | EM EXECUÇÃO | CONCLUÍDA | PARCIAL | BLOQUEADA | REVERTIDA | CANCELADA
- Data/hora e fuso:
- Solicitante/autorização:
- Auditoria relacionada:
- Projeto/repositório/branch:
- Commit inicial:
- Hatchable projeto/versão inicial:

**2. Problema e causa**
- Problema observado:
- Evidência:
- Causa raiz: CONFIRMADA | HIPÓTESE | NÃO IDENTIFICADA
- Objetivo mensurável:
- Escopo:
- Fora do escopo:

**3. Estado anterior**
- Arquivos e hashes:
- Funções/rotas:
- Dados/tabelas/estados:
- Integrações e filas:
- Comportamento atual:
- Dependências:
- Alterações locais/remotas pendentes:

**4. Previsão de impacto**
- Risco: BAIXO | MÉDIO | ALTO | CRÍTICO
- Efeito direto esperado:
- Efeitos indiretos possíveis:
- APIs afetadas:
- Filas e ofertas afetadas:
- Banco e migrations:
- Canais/publicações:
- Agendamentos/workers:
- Segurança/privacidade:
- Chamadas/limites/custos:
- Compatibilidade:
- Funcionalidades que não podem mudar:
- Alternativas consideradas:

**5. Salvaguardas**
- Backup/snapshot:
- Estratégia de idempotência:
- Plano de rollback:
- Condições para interromper:
- Autorização necessária/obtida:

**6. Execução real**
- Arquivos alterados:
- Resumo do diff:
- Alterações realizadas:
- Alterações não realizadas:
- Commit:
- Ambiente/plataforma:
- Versão implantada (se houver):

**7. Validação**
- Testes executados:
- Resultados:
- Regressões verificadas:
- Efeitos colaterais observados:
- Diferenças entre previsto e observado:
- Evidências:
- Pendências:

**8. Encerramento**
- Resultado: CONCLUÍDO | PARCIAL | BLOQUEADO | REVERTIDO
- Justificativa baseada em evidências:
- Próxima ação:
- Referências/entrada de auditoria:

---

## Registro inicial — criação dos documentos

### CHG-2026-11-07-DOCS — Criar documentação de continuidade

**1. Estado**
- Status: CONCLUÍDA NO ESCOPO DOCUMENTAL, sujeita à conferência final dos commits.
- Data: 07/11/2026.
- Projeto: Radar Promo Brasil.
- Repositório: `emersongabriel29-pixel/radar-promo-brasil`.
- Branch: `main`.
- Commit inicial observado: `2d34776aaf12ee14f1f639546ab52eaf00dce7e9`.
- Hatchable: `proj_1Xj94QxQmCam`, versão live 638 observada.

**2. Problema e objetivo**
- Problema: faltava a estrutura documental solicitada para manter contexto, histórico de auditorias e análise preventiva de mudanças.
- Objetivo: criar três documentos novos, sem alterar o código ou o comportamento operacional.

**3. Estado anterior**
- Os caminhos `docs/MASTER-CONTEXT.md`, `docs/AUDIT-LEDGER.md` e `docs/CHANGE-IMPACT-LOG.md` não existiam no GitHub `main), conforme consultas de conteúdo.
- O inventário Hatchable não apresentou diretório `docs/`.
- A interface de escrita Hatchable disponível nesta execução restringe os caminhos aceitos; não foi usado `public/` como atalho porque isso poderia expor documentação interna.

**4. Previsão de impacto**
- Risco: BAIXO.
- Efeito direto esperado: adicionar somente três arquivos Markdown no repositório GitHub.
- Efeito no runtime: nenhum esperado, pois não são arquivos executáveis nem parte do bundle Hatchable.
- Efeito em banco, integrações, filas, agendamentos, canais e credenciais: nenhum esperado.
- Funcionalidades a preservar: todas.
- Deploy: não necessário e não autorizado por esta tarefa.

**5. Salvaguardas**
- Confirmar que os caminhos não existiam antes da criação.
- Usar operação de criação, não substituição.
- Não editar arquivos existentes.
- Não copiar os documentos para diretório público do Hatchable.
- Não executar jobs, publicações ou mensagens.

**6. Execução real**
- Arquivos pretendidos:
  - `docs/MASTER-CONTEXT.md`
  - `docs/AUDIT-LEDGER.md`
  - `docs/CHANGE-IMPACT-LOG.md`
- Resultado da criação e SHAs/commits: preencher após confirmação das respostas da API GitHub.

**7. Validação**
- Testes de aplicação: não executados; não aplicáveis à criação exclusiva de Markdown.
- Validação documental: confirmar presença, branch, commit e leitura posterior dos três arquivos.
- Hatchable: sem cópia; nenhuma implantação realizada.
- Regressões: não há alteração executável prevista; ainda assim, não declarar validação operacional do app.

**8. Encerramento**
- Resultado: PARCIAL até a conferência final dos três arquivos.
- Próxima ação: reler os documentos no GitHub, registrar os commits resultantes e confirmar que não houve deploy nem alterações no Hatchable.

## Adendos

Nenhum adendo registrado até o momento.


## Adendo 2026-11-07 — confirmação final

- Os três documentos foram criados e relidos no GitHub `main`.
- Commit de criação de `docs/MASTER-CONTEXT.md`: `9746a283c53f6b2e2a03168cc2e0e8f6bba3345b`.
- Commit de criação de `docs/AUDIT-LEDGER.md`: `f8d12b52f24f4dff625ddf9b79785f217ce831d7`.
- Commit de criação de `docs/CHANGE-IMPACT-LOG.md`: `85e2a4f8fdeea2fcf4ca4e217110fe7ad08375de`.
- Último commit observado: `85e2a4f8fdeea2fcf4ca4e217110fe7ad08375de`.
- A validação documental foi concluída por leitura dos três caminhos no branch `main`.
- Não houve alteração de código executável, banco, migrations, integrações, filas, credenciais ou agendamentos. Não houve deploy nem publicação.
- Hatchable continua sem cópia destes documentos; a interface disponível não aceita `docs/` e não foi usado diretório público como substituto.
- Nenhum teste npm foi executado; não aplicável à criação exclusiva de Markdown.
- Resultado: CONCLUÍDA no escopo documental do GitHub; sincronização GitHub ↔ Hatchable não realizada nem alegada.


### CHG-2026-11-08-MEDICATION-ENQUEUE — proposta isolada

- Autorização: auditoria e correções solicitadas pelo titular no prompt mestre; a exclusão de medicamentos prevalece sobre a regra histórica de ausência de filtro.
- Baseline GitHub: main cf20a088e4fe2ac32f43fbe777b7f49fa7423cbb. Branch de revisão: codex/audit-medication-enqueue-20261108.
- Problema confirmado: canEnterOfferFlow aceita Paracetamol 750 mg com preço e URL HTTPS.
- Fonte de verdade desta proposta: código GitHub do commit-base, sem substituir arquivos de produção. Hatchable: versão/backend não acessíveis; CSS públicos divergentes, JS principal equivalente.
- Mudança prevista: reutilizar isMedicationProduct no gate de novos enfileiramentos. Preservar registros, links, categorias, regras comerciais e estados existentes.
- Impacto: médio, elegibilidade de novos itens em lib/offer-flow-policy.js e seus consumidores. Sem schema, segredo, API externa, envio, custo ou migration.
- Limitação explícita: este gate não protege sozinho publicações já enfileiradas, dispatchers, links de tracking ou todos os caminhos sociais/manuais. Não considerar o bloqueio completo nem liberar deploy.
- Alternativa adotada: PR draft incremental; reconciliação do backend Hatchable e proteção do dispatcher permanecem pendentes.
- Testes previstos: medicamentos e acessórios no gate; enqueue real em banco em memória; build, suíte, E2E e audit existentes.
- Rollback: reverter apenas o commit da proposta. Sem alteração de dados ou configuração a reverter.
- Estado: EM EXECUÇÃO; resultado e commit registrados após validação.


### Adendo CHG-2026-11-08-MEDICATION-ENQUEUE — resultado

- Proposta implementada em lib/offer-flow-policy.js, com teste unitário e teste real de enqueue em banco isolado.
- Atualizados índice, regra Master, matriz de testes, ledger, este log e relatório de continuidade.
- Sem alterações em migrations, dispatcher, cron, ofertas reais, credenciais ou outros provedores.
- Estado: PARCIAL, preparado para revisão em PR draft. Não homologado para produção.


## Validação final da proposta em branch

- npm run build: aprovado, 205 arquivos JavaScript. O script verifica sintaxe, não produz bundle.
- node --test tests/master-offer-flow.test.mjs tests/medication-enqueue.test.mjs: 10 aprovados, zero falhas; teste de enqueue usa banco em memória e não envia mensagem.
- npm test: 243 testes, 236 aprovados, sete falhas preexistentes mantidas. Não há liberação integral da suíte.
- npm run test:e2e: três aprovados no adapter standalone, scheduler desativado.
- npm audit --audit-level=moderate: nenhuma vulnerabilidade reportada.
- Teste adicional anterior de lib/category-classifier.test.js: nove aprovados; classificador não modificado nesta proposta.
- Nenhuma API externa/canal homologado; nenhum dry-run Hatchable disponível; sem deploy, sem merge e sem alteração de dados de produção.
- Resultado: proposta validada no escopo restrito de novo enqueue via canEnterOfferFlow, não homologada para produção.
- Commit/PR: consultar o commit e a URL do PR que contém este registro; não há versão Hatchable correspondente.


### Adendo de escopo — regra adicional do titular

- O titular reiterou que toda atualização deve ser aplicada no GitHub e no Hatchable.
- Regra registrada no documento de sincronização, controle de mudanças e relatório de continuidade.
- Esta branch é uma proposta parcial, não sincronizada. Hatchable indisponível nesta sessão. Sem merge ou deploy.
- Próxima ação depende de acesso seguro ao projeto Hatchable para comparar backend, aplicar a alteração compatível e validar os dois ambientes.


### Adendo de 08/11/2026 — conexão Hatchable e reconciliação da proposta

- Acesso autenticado owner confirmado no projeto Radar Promo Brasil, versão 664 LIVE. O bloqueio anterior de conexão foi resolvido; outros bloqueios continuam individualmente registrados.
- Comparados 267 caminhos comuns GitHub/Hatchable: 190 hashes iguais, 77 diferentes, sem conclusão automática de diferença funcional.
- Conferidos schema com 67 tabelas, crons, logs e contagens agregadas de ofertas/publicações/descoberta, conexões, backups, receipts e vendas.
- Nenhum dado operacional modificado. Não executar worker como teste.
- Proposta de médio risco: espelhar o gate e a documentação do PR #193 no WIP, sem deploy. Fonte de verdade para o gate: PR testado sobre baseline equivalente; demais divergências preservadas.
- Documentação privada em lib/documentation corresponde aos documentos GitHub em docs; não expor em public/.
- Detalhes e limites: AUDITORIA-CONTINUIDADE-2026-11-08.md. Versão publicada continua 664 até prova de novo deployment.


### Resultado do espelhamento no WIP Hatchable

- Gate lib/offer-flow-policy.js e oito documentos privados foram salvos no WIP, preservando os arquivos divergentes fora do escopo. Documentação em docs/ no GitHub corresponde a lib/documentation/ no Hatchable. Testes Node permanecem no repositório, pois não são arquivos executáveis no isolate.
- dry_run_deploy: ok=true, errors=[], warnings=[]; próxima versão calculada 665, 122 funções API, nove páginas e 73 migrations detectadas. Nenhum deploy executado.
- run_code somente computacional: fontes locais do detector/gate enviadas como funções puras ao isolate, sem importação de módulo nem chamada ao dispatcher: Paracetamol 750 mg -> eligible:false/MEDICATION_PUBLICATION_EXCLUDED; porta-comprimidos -> true; produto +18 -> true. HTTP 200, 23 ms. Não é teste de endpoint implantado.
- O código do gate e os documentos foram comparados por SHA-256 com o inventário WIP. Não existe alegação de sincronização integral das plataformas: persistem 77 divergências de hash na baseline, incluindo adapters e migrations, e a produção continua v664.
- A suíte local continua com 236 aprovações e sete falhas preexistentes. O patch não resolve filas preexistentes/dispatchers. Portanto, PR #193 permanece em rascunho, sem merge e sem deploy.
- Próximas ações: revisar diferenças funcionais em arquivos de entrega; validar todos os caminhos de publicação de medicamentos; tratar testes legados e causas de falhas; homologar APIs oficiais e receitas; backup/restauração; só então concluir reconciliação e liberação.


### AUD-2026-11-08-PARECER-35 — consolidação rastreável

- Autorização: titular solicitou auditoria completa dos 35 itens e reiterou atualização documental no GitHub e Hatchable.
- Baseline: main cf20a088e4fe2ac32f43fbe777b7f49fa7423cbb; PR #193 antes da consolidação a16aac9a432257fbe93befb7bce8873ef970f8f3; produção v664.
- Escopo: parecer de cada seção P01–P35, 16 frentes, recuperação de 44 PRs, nove complementares, 22 controles e dez fases.
- Leitura integral dos 77 arquivos divergentes; 47 diferenças de formatação/comentários normalizadas e 30 diferenças restantes de código/conteúdo/configuração. Não reconciliadas em lote.
- Testes novos de leitura: Shopee/Lomadee retornam um produto; AliExpress resp_code405 não tratado; Rakuten falha com token salvo; dois tokens Mercado Livre retornam401; Magalu sem TenantID; diagnóstico Telegram Casa & Lar/Pet passa sem envio.
- Risco/resultado: REPROVADO PARA LIBERAÇÃO; sistema não está 100% homologado. Bloqueios não foram convertidos em aprovações.
- Nenhum código de aplicação alterado nesta consolidação. Nenhum token renovado, dado operacional escrito, mensagem enviada, migration, merge, deploy ou gasto realizado.
- Documentos de domínio atualizados; JSONs de evidência sanitizados versionados e espelhados em lib/documentation no WIP.
- Teste filtrado de backup falhou por dependência de fixture; operations completo:19/20, restore36tabelas passa. CI falha em npm test e pula audit/E2E.
- Próximo passo: tratar F01(envelope AliExpress), F02(testes/CI) e F03(reconciliação por arquivo), com análise de impacto antes de implementação. Filas reais não serão reprocessadas sem plano quantitativo/recuperação.
- Commit final: consultar o commit que contém esta entrada no PR#193; versão publicada continua664. Rollback documental por reversão de commit/conteúdo WIP; sem dados a reverter.
