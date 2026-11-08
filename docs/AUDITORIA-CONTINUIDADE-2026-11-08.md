# Auditoria de continuidade — Radar Promo Brasil — 08/11/2026

> Registro consolidado atual: seção **Parecer consolidado das 35 seções do prompt mestre**, ao final. Histórico e limitações anteriores preservados. Parecer de liberação: REPROVADO.

## Estado, autorização e limites

Status: PARCIALMENTE CONCLUÍDA. Repositório confirmado pelo conector GitHub com permissão de escrita. Baseline main `cf20a088e4fe2ac32f43fbe777b7f49fa7423cbb`, árvore inicialmente limpa. Branch de proposta `codex/audit-medication-enqueue-20261108`. Fonte de verdade da proposta: código GitHub desse commit, sem presumir equivalência com backend Hatchable.

A fase inicial foi somente leitura, testes isolados e relatório no chat. Após apresentar o diagnóstico, iniciou-se proposta isolada autorizada. A versão/manifesto privado Hatchable, banco, filas, credenciais, AWS e logs atuais não foram acessados. Chamadas GET às rotas /api/readiness e /api/data sem sessão retornaram HTTP 401. Não foram disparados workers, envios, migrações, alteração de segredos, gastos ou deploys. Testes usam fixtures e banco em memória, não evidência de operação externa.

## Inventário confirmado

- 124 arquivos JavaScript de API, 57 em lib (incluindo teste), 9 páginas e 77 arquivos SQL de migração.
- 14 crons declarados em hatchable.toml; isso não prova execução ou saúde.
- 194 branches remotas excluindo main e HEAD; 160 com patches sem equivalência em main. Análise por git cherry; merges/squashes, substituições e sobreposição exigem revisão individual.
- 2.230 commits alcançáveis pelas refs locais obtidas.
- API GitHub paginada: 187 PRs, 44 abertos, 128 integrados e 15 fechados sem merge; cinco issues não PR. Zero tags e deployments retornados pela API pública consultada; ausência de deployment GitHub não prova ausência de deploy Hatchable.
- Documentação lida: AGENTS, README, índice, contexto mestre, ledger, impacto, controle de mudanças, regra Master, sincronização e documentos datados de operação, banco, IA e testes. Registros históricos não foram usados como métricas atuais.

## Comparação pública GitHub e Hatchable

| Arquivo | SHA-256 GitHub | SHA-256 publicado | Resultado |
|---|---|---|---|
| public/radar.js | 109f742356c7a4ca0d1d0f199055706ccf04c2bf82de3761228625360bfaf099 | 109f742356c7a4ca0d1d0f199055706ccf04c2bf82de3761228625360bfaf099 | Idêntico |
| public/ai-usage.css | 9859909b5d8ce398ad7a8c6b9f52c98e04fb291488f7a6b575b1e2180e887f50 | 9859909b5d8ce398ad7a8c6b9f52c98e04fb291488f7a6b575b1e2180e887f50 | Idêntico |
| public/radar.css | 03ede68db462676d22a65e003f14f1b3af2d668a3844657b78bef70c1374ee80 | c5a5ec723880fb98f8d4bcd7cbe9f9ff3db45a1269d2cf000714e5ea58f4fe36 | Divergente |
| public/radar-theme-v5.css | 50436251b385ef33eae6f394b7466d71682509f7fc460fe2ab6b5eeccc071d92 | 48240300e81f0fc895dee02dc9032f8111bc07eafcf28561c55827987426a79c | Divergente |

Fonte remota: https://radar-promo-brasil.hatchable.site. Nenhuma comparação de backend foi possível; não declarar sincronização.

## Grupo A — 16 frentes, cobertura inicial

| ID | Objetivo e arquivos/evidências | Estado | Impacto, teste e pendência |
|---|---|---|---|
| A01 | Arquitetura: README, server.js, hatchable/, api/, lib/, pages/ | EM ANÁLISE | SDK hospedado distinto de Express/PGlite; testes locais não homologam SDK |
| A02 | Sincronização: regra de sync e quatro hashes públicos | REPROVADA no conjunto público comparado | Dois CSS divergentes; manifesto e backend bloqueados |
| A03 | APIs: api/integrations/, api/mercadolivre/, lib/affiliate-sales.js | BLOQUEADA na homologação | Credenciais e chamadas oficiais por conta pendentes; nenhuma API aprovada por mera presença de rota |
| A04 | Filas/workers: api/jobs/telegram.js, lib/delivery.js, lib/autopilot.js | EM ANÁLISE | attempts>=5 pode deixar FAILED sem next_attempt_at; verificar recuperação real |
| A05 | Ingestão/custos: lib/ingestion.js, hatchable.toml | EM ANÁLISE | slice(0,50) sem continuação no helper; verificar chamadores e checkpoint |
| A06 | IA/classificação: lib/ollama.js, lib/product-safety.js, classificadores | EM ANÁLISE | Gate aceitava medicamento; 9 testes adicionais do classificador passaram; AWS/Ollama não validado |
| A07 | Canais: Telegram/WhatsApp, lib/delivery.js | BLOQUEADA na homologação | Conexões, destinos históricos e receipts atuais inacessíveis; nenhum envio |
| A08 | Publicação/deduplicação: offer-flow-policy, delivery, autopilot | REPROVADA na baseline | Medicamento elegível; proposta só protege novo enqueue pelo gate; dispatcher/filas pendentes |
| A09 | Banco: migrations/, hatchable/migrations.js | EM ANÁLISE | 77 SQL locais; testes em memória executam adapter; ledger/RLS/dados/backup reais bloqueados |
| A10 | Segurança: rotas privadas, lib/security.js, network guard, testes | EM ANÁLISE | 401 observado e testes locais; não é pentest nem certificação; segredos não lidos |
| A11 | Operação 24/7: 14 crons no manifesto, jobs/hourly | BLOQUEADA na operação real | Conferir last_fired, duração, leases, quotas e logs; cron declarado não prova execução |
| A12 | Qualidade: scripts npm e testes | REPROVADA | Baseline: 241 testes, 234 aprovados, 7 falhas; correção incremental não altera expectativas antigas |
| A13 | Relatórios: api/reports.js, affiliate-sales e tabelas migradas | EM ANÁLISE | Conferir totais reais, tracking, conversões e privacidade com acesso à conta |
| A14 | UX: public/, pages/, tests/e2e | APROVADA COM RESSALVAS no adapter local | 3 E2E passam, cinco larguras e acessibilidade; produção e CSS divergentes não homologados |
| A15 | Capacidade: lotes autopilot/Telegram e cron | EM ANÁLISE | Sem teste de carga nem métricas de produção; não aumentar lotes às cegas |
| A16 | Tracking: api/r/[id].js, lib/affiliate-sales.js | EM ANÁLISE | SubIDs e relatórios implementados parcialmente por provedor; não validar comissão sem resultado oficial |

## Grupo B — recuperação

| Origem | Arquivos/objetivo | Classificação inicial | Prioridade e decisão |
|---|---|---|---|
| PR #98 | lib/delivery.js e api/r/[id].js, medicamento | SEM EVIDÊNCIA SUFICIENTE de compatibilidade atual | P1: revisar contra nova política Master; não integrar patch antigo automaticamente |
| PR #187 | classificador e teste de armários Casa & Lar | Proposta em PR aberto | P1: comparar conflitos e regressões antes de recuperar |
| PR #169 | classificador Pet, singular/calopsita/caminhas | Proposta em PR aberto | P1: validar cobertura atual e evitar duplicação |
| PR #155 | retenção, referências, filas e relatórios | PARCIAL/SEM EVIDÊNCIA SUFICIENTE | P3: não ativar exclusão de ofertas; exige snapshot, análise de todas as referências e rollback |
| PR #127 | prototypes/offer-video-ffmpeg e testes | Protótipo isolado | P4: manter isolado; CPU, dependências e custos não avaliados |
| Demais 39 PRs abertos | Inventário de títulos/branches obtido por paginação | SEM EVIDÊNCIA SUFICIENTE | P3: analisar patches, equivalência e consumidores; nenhum merge em lote |

## Grupo C — complementares

- Dependências: npm ci com scripts desativados concluído usando cache no workspace; npm audit sem vulnerabilidades reportadas. Não foi auditoria completa de licenças/abandono.
- Duplicidade: patches por branch inventariados; não confundir patches únicos com funcionalidades ausentes.
- Backup: lib/backups.js usa lista fixa e schemaVersion 20; cobertura de tabelas recentes e restauração completa precisam ser reconciliadas. Nenhum backup ou restore real acionado.
- Observabilidade: relatórios históricos de erros de cron foram lidos, sem reconfirmação nos logs atuais.
- Contratos: sete falhas revelam divergências de regras/testes; algumas são asserções textuais. Não atualizar testes apenas para deixá-los verdes.
- Incompletos: camada de integração configurável não prova execução real, monitoramento ou relatórios completos.
- Flags: política master_v1 e seleção Gemini/Ollama localizadas. Não ativadas por esta tarefa.
- Recuperação/não regressão: build, testes, E2E e audit executados; resultado local separado do runtime hospedado.

## Grupo D — controles transversais

Integridade local preservada na baseline. Regressões verificadas pela suíte e E2E. Schema/migrations de produção, registros reais, isolamento efetivo de APIs, conectores, filas, preços/links oficiais, tokens, workers, cron, alertas, backups, custos, tracking e compatibilidade de ambientes permanecem não homologados por acesso. Rollback da proposta é reversão de código apenas; nenhuma alteração de dados. Medicamentos devem permanecer armazenados, fora do novo enqueue. Nenhuma oferta/registro foi apagado.

## Grupo E — dez fases

1. Diagnóstico: parcial, evidências acima; backend/versão/logs bloqueados.
2. APIs: inspeção estática parcial; documentação e homologação oficial de cada provedor pendentes.
3. Filas/ingestão: riscos identificados, recuperação real pendente.
4. IA/classificação: gate corrigido em proposta; modelos e infraestrutura pendentes.
5. Canais: bloqueada em produção, sem envios.
6. Segurança/integridade: validação local parcial.
7. Desempenho/custos: análise parcial, sem medição real.
8. Correções: somente proposta incremental de novo enqueue de medicamentos.
9. Testes: executados localmente, com falhas existentes registradas.
10. Implantação/reconciliação: não iniciada; PR draft não é deploy.

## Achados e plano priorizado

- P1 medicamento: baseline aceita Paracetamol 750 mg com eligible:true. Proposta adiciona exclusão no gate, preservando registro e acessório. Validar dispatchers, filas existentes, caminhos sociais e manuais antes de merge/deploy.
- P1 sincronização: obter manifesto/versão e arquivos privados Hatchable; comparar por hash e preservar divergências válidas.
- P1 qualidade: investigar sete falhas; algumas expectativas comerciais contradizem política nova, outras diferenças de aprovação/quantidade exigem análise de fixtures e comportamento.
- P2 ingestão: preservar lote bruto e cursor; evitar truncamento e carga ilimitada.
- P2 recuperação: definir proprietário, motivo e próxima ação de FAILED; não reenviar WAITING_CONFIRMATION sem reconciliar destino.
- P2 backup: cobertura por schema e prova de restore em ambiente isolado antes de dados em massa.
- P3 PRs: avaliar individualmente; não mesclar histórico inteiro.

## Bloqueios externos

Conector GitHub verificado com escrita. Não há ferramenta Hatchable disponível na sessão; pesquisa de plugin Hatchable não retornou resultado. Ambiente não informou secrets, runtime variables ou outbound identities. Necessário disponibilizar acesso seguro ao projeto Hatchable e infraestrutura apropriada para continuar produção; não pedir valores de segredos no chat. Nenhum requisito é aprovado por inferência.


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


## Regra adicional do titular — 08/11/2026

Toda atualização deve ser refletida no GitHub **e** no Hatchable. Comparar os arquivos relevantes, preservar divergências válidas e registrar commit GitHub, versão Hatchable, testes e resultado. Uma atualização somente no GitHub, inclusive esta proposta em branch, permanece PARCIAL e NÃO SINCRONIZADA até a aplicação e validação no Hatchable. Não substituir a hospedagem por outra plataforma. Sem acesso ao Hatchable, manter proposta em rascunho e registrar o bloqueio, sem declarar atualização concluída nem fazer merge/deploy por inferência. Documentos internos devem usar destino privado compatível; nunca copiar para public/ como atalho.


## Adendo — acesso Hatchable confirmado e diagnóstico de produção

Esta seção substitui o bloqueio de acesso descrito historicamente acima: o conector Hatchable agora está disponível e o projeto foi confirmado como Radar Promo Brasil, proj_1Xj94QxQmCam, acesso owner, v664 LIVE (08/11/2026 15:19:42 UTC). Não confundir o rascunho com o deployment publicado.

- Manifesto publicado: 292 arquivos e 131 funções. Inventário atual: 293 entradas incluindo AGENTS virtual; a entrada virtual explica a contagem adicional e NÃO é evidência de WIP por si só.
- Schema publicado: 67 tabelas. 16 tarefas recorrentes e três one-shots pendentes no inventário consultado; mais 20 one-shots concluídos listados, com 134 concluídos no total.
- GitHub main permanece cf20a088e4fe2ac32f43fbe777b7f49fa7423cbb. PR de correção #193 em rascunho.
- Comparação de 267 caminhos comuns por SHA-256: 190 iguais e 77 diferentes. Diferença de hash não comprova diferença semântica; migrations imutáveis e adapters não devem ser sobrescritos em lote. O mapa de divergências permanece pendente de revisão individual.
- O código de offer-flow-policy e product-safety envolvido na proposta foi lido no Hatchable. O gate ainda aceita medicamentos na baseline. Documentos privados já existentes de controle, índice, testes e regra Master coincidem com a baseline GitHub; adendos podem ser espelhados sem descartar alterações. Ledger, log, regra de sync e relatório de continuidade não existiam no diretório privado consultado.

### Banco, filas, canais e rastreamento — consultas somente leitura

- Ofertas: 8134. Publicações: 9634. São snapshots durante operação concorrente, não uma transação única.

| status | eligibility_policy_version | total | without_retry |
| --- | --- | --- | --- |
| FAILED | legacy | 144 | 144 |
| PUBLISHED | master_v1 | 12 | 0 |
| PUBLISHED | legacy | 2760 | 0 |
| READY | legacy | 2045 | 0 |
| READY | master_v1 | 4632 | 0 |
| RETRY | legacy | 37 | 0 |
| WAITING_CONFIRMATION | legacy | 4 | 0 |

| marketplace | processing_status | total |
| --- | --- | --- |
| ALIEXPRESS | BLOCKED_SAFETY | 17 |
| ALIEXPRESS | CAPTURED | 9955 |
| ALIEXPRESS | DISCOVERED | 162 |
| ALIEXPRESS | LINKED | 839 |
| ALIEXPRESS | NEEDS_ENRICHMENT | 20 |
| LOMADEE | BLOCKED_PROVIDER_APPROVAL | 27 |
| LOMADEE | BLOCKED_PROVIDER_CHANNEL | 17 |
| LOMADEE | DISCOVERED | 321 |
| LOMADEE | DUPLICATE | 670 |
| LOMADEE | LINKED | 354 |
| LOMADEE | NEEDS_DATA | 5 |
| LOMADEE | READY_FOR_LINK | 2045 |
| SHOPEE | DISCOVERED | 67207 |
| SHOPEE | DUPLICATE | 75 |
| SHOPEE | IMPORTED | 2052 |
| SHOPEE | INCOMPLETE | 15 |

| marketplace | status | total | last_checked_at |
| --- | --- | --- | --- |
| RAKUTEN | VALIDATED | 1 | 2026-10-31T16:09:57.888134+00:00 |
| MAGALU | PENDING_VALIDATION | 1 | None |
| SHOPEE | VALIDATED | 1 | 2026-11-08T17:40:46.965004+00:00 |
| ALIEXPRESS | VALIDATED | 1 | 2026-11-08T18:26:22.628529+00:00 |
| LOMADEE | VALIDATED | 1 | 2026-11-08T17:47:14.93104+00:00 |

| platform | status | total |
| --- | --- | --- |
| TELEGRAM | ACTIVE | 1 |

| platform | status | total |
| --- | --- | --- |
| TELEGRAM | ACTIVE | 8 |
| WHATSAPP | PAUSED | 12 |

- As 2.772 publicações PUBLISHED possuem external_message_id; quatro WAITING_CONFIRMATION não possuem receipt. Identificador persistido é evidência de registro, não reconferência independente no destino. Nenhum reenvio acionado.
- 144 publicações FAILED sem próxima tentativa exigem diagnóstico de causa e política de recuperação; não redefinidas em massa.
- Zero referências órfãs observadas nos dois checks: categoria de oferta e oferta de publicação, incluindo account_id. Isso não prova ausência de todos os órfãos.
- affiliate_sales está vazia: não existe prova de conversões/comissões importadas. Cliques não podem ser apresentados como venda.
- Dois backups registrados, último em 09/10/2026 16:06:56 UTC. Não representa cobertura de mudanças posteriores; backup externo da hospedagem e restauração permanecem não verificados.
- AliExpress registra API_CALL_LIMIT em PRODUCT_DETAIL e PERMISSION_REQUIRED em SKU_DETAIL. MAGALU ainda PENDING_VALIDATION. VALIDATED nas demais credenciais é estado armazenado, não homologação executada nesta auditoria.
- Há oito destinos Telegram ativos, 12 WhatsApp pausados, um bot Telegram ativo e zero conexões WhatsApp. Não foi conferido getChat/getMe nem enviado teste.

### Jobs e observabilidade

- Contagens de sete dias por rota (não somar repetidas em cada one-shot): hourly 150 execuções/40 erros; Lomadee link queue 129/16; Shopee 122/6; Lomadee 152/1; Telegram 498/1.
- Os dois erros recentes encontrados no filtro 5xx de hourly são de 07/11 e indicam quota de one-shot esgotada: 244/250 agendamentos contra limite diário 200. A versão atual já separa jobs recorrentes; não declarar que a causa antiga continua ativa.
- Três 500 Lomadee link queue em 08/11, durações de 3,2–4,2 s, sem log_output nem error. O handler retorna 500 em falhas individuais; causa específica não recuperada pelo log. Investigar processing_error sem acionar worker.
- O gateway bloqueia acesso a pg_class/pg_policy/pg_constraint. A consulta alternativa information_schema confirmou FKs e checks de offers/publications. RLS efetivo permanece NÃO VERIFICADO; não contornar o bloqueio.
- O servidor MCP apresentou 429 com Retry-After 2–3 s durante a inspeção. Leitura retomada de forma sequencial; não confundir limite do conector com falha da aplicação.

### Atualização da matriz A–E e próximos passos

A02: divergência integral confirmada; A03: configuração real inspecionada, homologação externa pendente; A04: 144 FAILED e quatro entregas incertas identificadas; A07: ausência de conexão WhatsApp confirmada; A09: schema/duas consultas de integridade e constraints verificadas parcialmente; A10: introspecção RLS bloqueada; A11: crons e logs obtidos; A13/A16: ausência de vendas importadas confirmada. As demais frentes mantêm o estado e limitações anteriores. Nenhuma frente recebeu aprovação integral por associação.

Grupo B: PRs e branches inventariados anteriormente; compatibilidade individual ainda pendente. Grupo C: backup desatualizado, falhas sem log e testes de contrato reprovados confirmados. Grupo D: nenhum registro, destino, token, fila ou migration alterado nesta etapa. Grupo E: diagnóstico de produção avançou; fases de homologação e implantação continuam parciais/não iniciadas.

Proposta incremental: refletir o gate de medicamentos do PR #193 no WIP Hatchable, junto dos documentos privados correspondentes, comparar conteúdo e executar dry-run. Isso NÃO equivale a deployment, merge ou bloqueio integral de todos os caminhos de publicação. Não liberar publicação da proposta enquanto persistirem as sete falhas da suíte, a cobertura pendente dos dispatchers e as divergências relevantes.


### Resultado do espelhamento no WIP Hatchable

- Gate lib/offer-flow-policy.js e oito documentos privados foram salvos no WIP, preservando os arquivos divergentes fora do escopo. Documentação em docs/ no GitHub corresponde a lib/documentation/ no Hatchable. Testes Node permanecem no repositório, pois não são arquivos executáveis no isolate.
- dry_run_deploy: ok=true, errors=[], warnings=[]; próxima versão calculada 665, 122 funções API, nove páginas e 73 migrations detectadas. Nenhum deploy executado.
- run_code somente computacional: fontes locais do detector/gate enviadas como funções puras ao isolate, sem importação de módulo nem chamada ao dispatcher: Paracetamol 750 mg -> eligible:false/MEDICATION_PUBLICATION_EXCLUDED; porta-comprimidos -> true; produto +18 -> true. HTTP 200, 23 ms. Não é teste de endpoint implantado.
- O código do gate e os documentos foram comparados por SHA-256 com o inventário WIP. Não existe alegação de sincronização integral das plataformas: persistem 77 divergências de hash na baseline, incluindo adapters e migrations, e a produção continua v664.
- A suíte local continua com 236 aprovações e sete falhas preexistentes. O patch não resolve filas preexistentes/dispatchers. Portanto, PR #193 permanece em rascunho, sem merge e sem deploy.
- Próximas ações: revisar diferenças funcionais em arquivos de entrega; validar todos os caminhos de publicação de medicamentos; tratar testes legados e causas de falhas; homologar APIs oficiais e receitas; backup/restauração; só então concluir reconciliação e liberação.


# Parecer consolidado das 35 seções do prompt mestre

**Data:** 08/11/2026. **Projeto:** Radar Promo Brasil. **GitHub main:** `cf20a088e4fe2ac32f43fbe777b7f49fa7423cbb`. **Branch/PR de trabalho:** `codex/audit-medication-enqueue-20261108`, PR #193; head antes desta consolidação `a16aac9a432257fbe93befb7bce8873ef970f8f3`. **Hatchable:** `proj_1Xj94QxQmCam`, v664 LIVE. O WIP contém proposta posterior e não é a versão publicada.

## Decisão e interpretação do resultado

**Parecer técnico: REPROVADO PARA LIBERAÇÃO. As 35 seções agora têm parecer individual e rastreabilidade; isso NÃO significa que as 35 estejam aprovadas ou que todas as homologações externas tenham sido concluídas.** Os itens que dependem de acesso, credencial, destino autorizado, documentação ou introspecção indisponível estão formalmente identificados. Compatibilidade de recuperação individual, restauração de backup real e segurança abrangente continuam com limites explicitados, sem transformar lacunas em resultados positivos.

Este adendo é o registro consolidado mais recente; os adendos anteriores acima são históricos e permanecem preservados. A classificação anterior de resposta AliExpress vazia foi refinada: o envelope real contém erro de negócio 405 e NÃO comprova sucesso. A comparação sintática foi refinada para ignorar metadados de posição do parser: o resultado correto é 47 equivalências normalizadas e 30 diferenças restantes, não 46/31.

O novo texto anexado é idêntico ao primeiro por SHA-256; a regra adicional do titular continua válida: toda atualização deve ser refletida no GitHub e Hatchable e acompanhada de documentação. Nenhum envio real, alteração de dados operacionais, migration, gasto, merge ou deploy foi executado na consolidação. Testes dos helpers de API ocorreram como snippets derivados no isolate, com credenciais mantidas no servidor e apenas resultados resumidos retornados; não são testes de importação do módulo completo nem homologação de todas as operações da rota.

## Catálogo de evidências

| ID | Fonte e resultado | Limite |
|---|---|---|
| E01 | Conectores GitHub/Hatchable, main e v664 confirmados | Branch proposta e WIP são diferentes de produção |
| E02 | Leitura dos 77 arquivos divergentes; comparação de AST JS, tokens SQL, CSS formatado e JSON; 47 equivalentes normalizados/30 diferentes | Equivalência sintática não prova ambiente/configuração idênticos; 27 migrations comuns diferem só em tokens ignorados de espaço/comentário |
| E03 | Schema 67 tabelas, contagens agregadas, constraints via information_schema e dois checks de órfãos | Snapshots sequenciais sob operação concorrente; não é transação única nem verificação de todos os relacionamentos |
| E04 | Scheduler: 16 recorrentes e logs por rota, backlog e quotas históricas | Não disparou processamento; logs ausentes não provam sucesso |
| E05 | Shopee 1 produto, Lomadee 1 produto; AliExpress resp_code 405; Rakuten falhou com token salvo; Mercado Livre dois tokens 401; Magalu sem Tenant ID | Só operações consultadas; tokens não renovados e nenhum link criado |
| E06 | Diagnóstico oficial Telegram de Casa & Lar/Pet: checks positivos e sentMessage=false | Permissão não comprova entrega real; zero conexão WhatsApp |
| E07 | Ollama SETUP_REQUIRED, AWS sem CLI/perfis/identidade; ledger Gemini 32 SUCCESS/5.139 tokens entrada/3.027 saída no snapshot | Não testou geração paga nem validou EC2/orçamento histórico |
| E08 | Build 205 arquivos; 243 testes/236 passam/7 falham; E2E local 3 passam; audit 0; CI falha no npm test e pula audit/E2E | Adapter local não é SDK hospedado; não é teste de carga |
| E09 | Restore local com fixtures: 36 tabelas, tamper e isolamento testados; operations 19/20 passam | Backup real não restaurado; teste filtrado sozinho depende de fixtures de outros testes |
| E10 | Reports anônimo 401; headers públicos reais; scan de 481 arquivos sem expor valores | Sem pentest, sem scan histórico e sem comprovação de RLS pelo gateway |
| E11 | 44 PRs abertos/ref resolvida, 234 caminhos distintos, dependências, prioridades; 194 branches e 160 com patch único | Inventário não é aprovação de recuperação; chamadas dinâmicas exigem revisão |
| E12 | Portais oficiais consultados; HTTP 200/403 e redirects preservados | Página acessível não prova contrato de endpoint/escopo; bloqueios não foram contornados |
| E13 | PR #193, gate e oito documentos espelhados no WIP por hash, dry-run ok e próxima versão 665 | Sem deploy; sete falhas e cobertura de dispatchers continuam impedindo liberação |
| E14 | GET real /api/reports 200, sete dias: shared=1538, clicks=0, sales=0, revenue=0, commission=0 | Não atribuir vendas inexistentes nem presumir tracking completo de links diretos |
| E15 | Prompt 35 seções, regras do repositório, contexto, ledger, impacto e índice | Aprovação de procedimento não certifica funcionalidade |
| E16 | Reprodução Paracetamol elegível na baseline; gate corrigido em PR/WIP, acessórios/+18 preservados | Busca por nove nomes sem candidatos é limitada e não exclui todos os medicamentos |

Artefatos em `docs/audit-evidence/2026-11-08/`: coverage-35.json, comparison-77.json, path-differences.json, recovery-44.json, runtime-checks.json, oauth-checks.json, quality-checks.json, official-documentation.json e disconnected-candidates.json. Espelho privado correspondente em `lib/documentation/audit-evidence/2026-11-08/` no Hatchable. Não há valores de credenciais nesses arquivos.

## Matriz de cobertura — 35 de 35 seções registradas

| Nº | Seção do prompt | Parecer | Gravidade | Evidências |
|---|---|---|---|---|
| 1 | Identidade do projeto | APROVADA | Baixa | E01, E15 |
| 2 | Executar, não apenas orientar | APROVADA COM RESSALVAS | Alta | E05, E08, E13 |
| 3 | Diagnóstico inicial somente leitura | APROVADA COM RESSALVAS | Média | E01, E02, E03, E04 |
| 4 | Objetivo funcional do Radar | REPROVADA | Alta | E03, E04, E05, E14 |
| 5 | Preservação do sistema existente | APROVADA COM RESSALVAS | Alta | E02, E11, E13 |
| 6 | APIs e integrações | REPROVADA | Alta | E05, E12 |
| 7 | Categorias, subcategorias e palavras-chave | APROVADA COM RESSALVAS | Média | E03, E08, E11 |
| 8 | Filas, workers e processamento | REPROVADA | Alta | E03, E04 |
| 9 | Telegram, WhatsApp e canais | BLOQUEADA | Alta | E06, E03 |
| 10 | Painel de filas e relatórios | APROVADA COM RESSALVAS | Média | E14, E03, E08 |
| 11 | Ollama e infraestrutura de IA | BLOQUEADA | Alta | E07 |
| 12 | Recursos de IA | APROVADA COM RESSALVAS | Média | E07, E08 |
| 13 | Segurança completa | REPROVADA | Alta | E10, E02, E08 |
| 14 | Banco de dados e migrations | BLOQUEADA | Alta | E02, E03, E09 |
| 15 | Agendamentos e operação 24/7 | APROVADA COM RESSALVAS | Alta | E04, E02 |
| 16 | Qualidade e conformidade das ofertas | REPROVADA | Alta | E16, E08, E13 |
| 17 | Rastreamento e conversões | BLOQUEADA | Alta | E03, E05, E14 |
| 18 | Interface e experiência do usuário | APROVADA COM RESSALVAS | Média | E08, E02 |
| 19 | Desempenho e controle de custos | APROVADA COM RESSALVAS | Alta | E04, E07, E14 |
| 20 | Dezesseis auditorias principais | APROVADA COM RESSALVAS | Alta | E01, E02, E03, E04, E05, E06, E07, E08, E09, E10, E11, E14 |
| 21 | Dez fases de execução | APROVADA COM RESSALVAS | Alta | E13, E15 |
| 22 | Controles transversais | APROVADA COM RESSALVAS | Alta | E02, E03, E04, E08, E09, E10, E13 |
| 23 | Documentação do projeto | APROVADA COM RESSALVAS | Média | E13, E15 |
| 24 | Controle de status das auditorias | APROVADA | Baixa | E15 |
| 25 | Regra GitHub e Hatchable | REPROVADA | Alta | E02, E13 |
| 26 | Testes obrigatórios | REPROVADA | Alta | E08, E09 |
| 27 | Autorização e autonomia | APROVADA COM RESSALVAS | Alta | E15, E06 |
| 28 | Continuidade | APROVADA | Baixa | E01, E13, E15 |
| 29 | Relatório obrigatório | APROVADA COM RESSALVAS | Média | E01, E02, E13, E15 |
| 30 | Critério de conclusão das 16 auditorias | REPROVADA | Alta | E05, E08, E09, E10, E13 |
| 31 | Ordem de execução | APROVADA COM RESSALVAS | Média | E01, E13, E15 |
| 32 | Implementações perdidas, desconectadas ou não integradas | APROVADA COM RESSALVAS | Alta | E11, E02 |
| 33 | Qualidade e confiabilidade complementares | APROVADA COM RESSALVAS | Alta | E08, E09, E10, E11 |
| 34 | Matriz final de cobertura | APROVADA COM RESSALVAS | Média | E15 |
| 35 | Evolução segura | APROVADA COM RESSALVAS | Alta | E13, E15 |

Contagem de pareceres: APROVADA: 3, APROVADA COM RESSALVAS: 20, BLOQUEADA: 4, REPROVADA: 8. Não somar cobertura e aprovações como se fossem o mesmo indicador.

## Achados priorizados e decisão

| ID | Gravidade | Achado comprovado | Ação e critério de saída |
|---|---|---|---|
| F01 | Alta | AliExpress: topRequest trata error_response, mas não valida resp_result.resp_code; probe derivado retornou ok=true com zero itens e, ao inspecionar o envelope, resp_code=405 | Validar envelope e código de negócio, distinguir sucesso vazio de falha, testar casos 200/405/shape inválido antes de marcar VALIDATED; não alterar credencial por inferência |
| F02 | Alta | Sete falhas locais e CI reprovada no npm test | Investigar comportamento vs expectativas legadas e fixtures; aprovar build/unidade/E2E/audit nos ambientes apropriados |
| F03 | Alta | 30 diferenças além de formatação em API, bibliotecas, páginas, CSS, package e README; dois endpoints de mídia e assets exclusivos do GitHub | Fonte de verdade por arquivo e testes de compatibilidade; algumas diferenças são intencionais do adapter; não copiar Node/Express para isolate |
| F04 | Alta | Medicamentos ainda não protegidos em todos os caminhos publicados; patch só em PR/WIP | Gate e dispatchers/caminhos manuais/sociais cobertos, filas preservadas e regressão sem falso bloqueio de acessórios |
| F05 | Alta | 144 FAILED sem próxima tentativa e quatro entregas incertas no snapshot | Plano por estado, causa, proprietário e recuperação; reconciliar destino antes de qualquer reenvio; apresentar quantidade/impacto de lote previamente |
| F06 | Alta | Ingestão faz slice(0,50) sem checkpoint dos excedentes no helper | Persistir entrada bruta/continuação e retornar progresso; não trocar por loop ilimitado em produção |
| F07 | Alta | Mercado Livre: duas conexões ACTIVE, tokens salvos retornam 401 com expiração passada; Rakuten leitura falha com token salvo; Magalu sem Tenant ID | Diagnosticar renovação/permissão oficial e vínculo por conta, testar leitura; autorização OAuth não é validação de links de afiliado |
| F08 | Alta | Zero conexão WhatsApp; 12 destinos pausados | Conector/canal permitido, permissões e destino de teste autorizado; manter cadastros e filas sem ativação indevida |
| F09 | Média/alta | Backup da aplicação cobre lista fixa de 36 tabelas; schema tem 67; último backup registrado é de 09/10 | Mapear exclusões intencionais e novas entidades, provar cobertura atual e restauração isolada real; schemaVersion=20 é contrato legado e não prova sozinho corrupção |
| F10 | Média/alta | Headers públicos da raiz: CSP apenas frame-ancestors; lib/security.js é aplicada pelo server standalone | Revisar hardening do runtime hospedado com compatibilidade dos scripts/styles; não declarar SSRF/XSS explorável sem teste autorizado |
| F11 | Média | Teste de backup isolado falha por fixture herdada; passa no arquivo operations completo | Criar fixtures explícitas e independentes antes de exigir execução isolada |
| F12 | Média | Ollama sem configuração e AWS indisponível; orçamento/EC2 não reconfirmados | Acesso seguro e testes sem substituir Gemini nem criar custos |
| F13 | Média | Tabela de vendas vazia e links diretos podem escapar da contagem de redirect | Reconciliar relatórios oficiais/SubID, sem converter clique em venda ou inventar comissão |

Nenhuma vulnerabilidade explorável foi declarada apenas por leitura de código, nenhum fornecedor foi certificado por metadata e nenhum bloqueio foi removido para deixar métricas verdes.

## Fichas consolidadas de integrações

| Integração | Código/configuração | Teste desta consolidação | Classificação e pendência |
|---|---|---|---|
| Shopee | Rota, cron, assinatura SHA256, cursores e credencial presentes | Query oficial productOfferV2, 1 item, página 1, hasNextPage=true, 4.057 ms, sem gravação | TESTADA COM SUCESSO somente nessa leitura; paginação completa, campanhas, links, conversões e quotas não homologados |
| Lomadee | Produtos, campanhas, marcas, canais, pedidos, encurtador e filas | Leitura /affiliate/products, 1 item, 452 ms | TESTADA COM SUCESSO somente nessa leitura; 500 da fila e permissões por anunciante/canal pendentes; não criou links |
| AliExpress | Credencial consta VALIDATED e metadata HTTP 200 | Resposta com envelope presente e resp_code=405, zero itens | CONFIGURADA, MAS NÃO VALIDADA pela leitura atual; F01 impede confiar no status salvo |
| Rakuten | Credencial salva VALIDATED, último check histórico 31/10 | Helper de advertisers com token salvo falhou e retornou status normalizado 502 | CONFIGURADA, MAS NÃO VALIDADA; não identificar causa como expiração sem prova; refresh não acionado |
| Mercado Livre | Duas conexões MERCADOLIVRE ACTIVE; alias de fonte MERCADO_LIVRE é distinto da chave de conexão | Dois GET /users/me com tokens salvos retornaram 401 e expiração passada | BLOQUEADA para leitura com esses tokens; renovação não testada; gerador de afiliados é separado do OAuth |
| Magalu | OAuth cadastrado, credenciais API preservadas e fluxo manual de afiliado | GET status: CONNECTED_API_ERROR, tenantIdConfigured=false, scopeGrantVerified=false | BLOQUEADA por configuração/permissão; não usar client/API key como Tenant ID |
| Amazon | Creators API implementada | GET retornou 412 pedindo credenciais | IMPLEMENTADA, MAS NÃO CONFIGURADA nesta conta |
| Admitad | Campanhas/deeplink/feed implementados | GET 200, NOT_CONFIGURED | IMPLEMENTADA, MAS NÃO CONFIGURADA; feed/API dependem de website/campanha |
| Awin | Publisher API/feed JSONL implementados | GET 200, NOT_CONFIGURED | IMPLEMENTADA, MAS NÃO CONFIGURADA; Publisher/anunciante/idioma pendentes |
| Temu | Importação manual de link oficial e rascunho | GET 200, MANUAL_LINK_WORKFLOW | Fluxo manual implementado; API de descoberta/conversões NÃO IMPLEMENTADA/validada |
| SHEIN | Importação manual de link oficial e rascunho | GET 200, MANUAL_LINK_WORKFLOW | Fluxo manual implementado; API afiliada NÃO IMPLEMENTADA/validada; seller API não a substitui |
| Collshp | Importação de vitrine pública no código | Sem nova chamada GraphQL; integração/tracking não homologados | IMPLEMENTADA; conectividade/rastreamento NÃO VERIFICADOS nesta consolidação |
| Telegram | Bot ativo e destinos | Casa & Lar e Pet: getMe/getChat/getChatMember positivos, sentMessage=false | Permissões de leitura verificadas; entrega real NÃO HOMOLOGADA |
| WhatsApp | Código de conexão/canal/worker e destinos preservados | Zero conexões, 12 destinos pausados | BLOQUEADA por configuração de canal |
| n8n | Bridge HMAC e conexão MCP ACTIVE no banco | Contratos locais; sem disparar workflow | CONFIGURADA, MAS NÃO VALIDADA ponta a ponta |

A leitura ao provedor a partir de snippets prova somente a operação exercida e as credenciais no servidor; não prova o módulo importado, a UI, o agendamento, a entrega ou o crédito de comissão. Os snippets não emitiram mensagens nem escreveram validação fictícia no banco.

Documentação: Awin, Mitgo/Admitad, Rakuten, Magalu e Amazon responderam HTTP 200 nas URLs registradas; alguns portais incluem login na página e seu conteúdo completo pode exigir sessão. Shopee/AliExpress/Lomadee/Mercado Livre tiveram 403 em documentação consultada. Os limites/escopos não foram inventados nem esses bloqueios contornados. Consultar official-documentation.json para URLs finais e redirects.

## Segurança, backup e recuperação — limites específicos

- Segurança da raiz observada: X-Content-Type-Options=nosniff, HSTS=max-age 31536000/includeSubDomains, Referrer-Policy=strict-origin-when-cross-origin e CSP=frame-ancestors self/Hatchable. Não inferir script-src/style-src a partir de lib/security.js do adapter.
- O gateway bloqueou pg_catalog; isso deixa RLS e outras propriedades não expostas sem prova. As FKs/checks de offers/publications foram consultadas em information_schema e dois checks de órfãos retornaram zero.
- O padrão de token encontrado em tests/automation.test.mjs é dado de fixture numa asserção de formato; nenhum valor foi incluído em relatório. Scan atual não substitui revisão do histórico/segredos/rotação.
- Licenças no lock: MIT 91, BSD-3-Clause 12, Apache-2.0 11, ISC 4, MPL-2.0 1 e quatro sem metadado declarado. Isso é inventário, não parecer jurídico nem licença presumida.
- Restauração local já exercitada: 36 tabelas, validação de integridade e rejeição de outra conta/tamper. A execução filtrada do teste sozinha falhou por fixture inexistente; no arquivo completo o restore passou, com 19 de 20 testes aprovados e uma falha antiga de estado da oferta. Nenhum backup real foi restaurado/exportado com credenciais.
- Backup real: último registro em 09/10, dois registros, sem garantia de backup externo da plataforma. O número 36 vs 67 exige mapear escopo e exclusões, incluindo catálogos/filas, templates, configurações recentes e credenciais por conta.
- Não houve teste de carga, pentest, mensagem real, renovação de token ou nova geração paga de IA. Não substituir esses testes por dados fictícios de sucesso.

## Recuperação de funcionalidades e divergências — decisão

Inventário recovery-44.json lista todos os 44 PRs abertos obtidos antes do PR #193: ID, objetivo/título original, branch, arquivos, dependências estáticas, equivalência de patches, prioridade, risco, teste e decisão. Foram resolvidas as 44 refs; elas abrangem 234 caminhos distintos. Os 160 ramos com patches não equivalentes não representam automaticamente 160 funcionalidades perdidas: podem conter squash, versões substituídas ou mudanças parciais.

Prioridades específicas: #98 (medicamentos), #187 (armários Casa & Lar) e #169 (Pet) em P1; protótipos de vídeo em P4; retenção #155 em P3, sem ativar exclusão. Revert encontrado: 0b73b0d restaurou monitoramento após patch incompleto. Não foram restaurados/mesclados ramos automaticamente.

O grafo de imports inicialmente sinalizou lib/security.js, mas a referência server.js:8 prova uso no adapter; não é código morto. Dois jobs sem referência literal no manifesto GitHub estão presentes no scheduler Hatchable: lomadee-reconcile e mercadolivre-notifications. WhatsApp-channel não está agendado, conforme desativação controlada documentada. lib/radar-ai.js e jobs/marketplace-ingestion permanecem candidatos que exigem considerar chamadas indiretas antes de classificar como desconectados/abandonados.

47 diferenças normalizadas incluem 27 migrations comuns: não reescrever migrations aplicadas por causa de formatação. Outras migrations têm nomes diferentes nas plataformas e precisam de mapeamento por conteúdo e ledger. Node/HTTPS/DNS usados em media/monitoring do adapter não podem ser copiados para o isolate; melhorias hosted como deduplicação por external_id, tokens Android e relatórios ampliados também não podem ser apagadas por sincronização cega.

## Grupo A — 16 auditorias principais

| ID | Frente | Parecer | Evidência | Pendência/resultado |
|---|---|---|---|---|
| A01 | Arquitetura | APROVADA COM RESSALVAS | E01/E02 | Adapter e isolate separados; diferenças intencionais precisam ser documentadas |
| A02 | GitHub ↔ Hatchable | REPROVADA | E02/E13 | 30 diferenças além de formatação e caminhos exclusivos |
| A03 | APIs e integrações | REPROVADA | E05/E12 | AliExpress 405 não tratado, tokens/escopos e contas não configuradas |
| A04 | Filas e workers | REPROVADA | E03/E04 | 144 falhas sem retry e quatro entregas incertas |
| A05 | Ingestão e custos | REPROVADA | E03/E04 | Truncamento em 50 e backlog; custo/capacidade externos não medidos |
| A06 | IA e classificação | APROVADA COM RESSALVAS | E07/E08 | Fallback/testes locais; Ollama/AWS bloqueados |
| A07 | Canais | BLOQUEADA | E06 | Telegram com permissão; entrega não exercitada e WhatsApp sem conexão |
| A08 | Publicação/deduplicação | REPROVADA | E08/E16 | Gate não protege todos os caminhos publicados |
| A09 | Banco/migrations | BLOQUEADA | E03/E09 | Schema/FKs parciais, sem ledger completo e restauração real |
| A10 | Segurança | REPROVADA | E10 | Hardening do adapter não comprova hosted; RLS e pentest pendentes |
| A11 | Operação 24/7 | APROVADA COM RESSALVAS | E04 | Crons observados, falhas/backlog e quotas a resolver |
| A12 | Testes | REPROVADA | E08/E09 | Sete falhas e CI reprovada; fixture dependente |
| A13 | Métricas | APROVADA COM RESSALVAS | E14 | Relatório real acessível; cobertura e atribuição parciais |
| A14 | UX | APROVADA COM RESSALVAS | E08/E02 | E2E local passa; hosted/assets divergentes |
| A15 | Capacidade | BLOQUEADA | E04/E07 | Sem teste de carga/CPU/memória e métricas externas |
| A16 | Conversões | BLOQUEADA | E03/E14 | Sem vendas importadas ou reconciliação oficial |

## Grupo B — recuperação

Cobertura documental: recovery-44.json (44 PRs), path-differences.json, comparison-77.json e disconnected-candidates.json. A compatibilidade individual de recuperação permanece sem aprovação até teste do candidato escolhido contra o estado atual. O relatório não considera a leitura de título/diff ou a mera presença de um arquivo como homologação.

## Grupo C — nove complementares

| Controle | Evidência | Parecer/pendência |
|---|---|---|
| 33.1 Dependências | E08/E10, lock e audit | Sem CVE reportada pelo audit; quatro licenças ausentes e abandono/supply chain não certificados |
| 33.2 Duplicidade/conflitos | E02/E11 | 77 diferenças e branches inventariadas; consumidores diretos/indiretos precisam de decisão por arquivo |
| 33.3 Backups/restauração | E09 | Restore de fixture passa; backup real/cobertura atual bloqueados |
| 33.4 Observabilidade | E04/E07 | Logs e ledger lidos; 500 de worker sem causa no log e sem alerta comprovado |
| 33.5 Contratos | E05/E08/E14 | Erro de negócio AliExpress tratado como vazio, diferenças de estado e relatórios; reprovado |
| 33.6 Incompletos | E05/E11 | Interfaces/configuração sem homologação, APIs ausentes e candidatos a código desconectado registrados |
| 33.7 Flags/ativação | E13/E16 | master_v1/WIP preservados; sem ativar WhatsApp/Ollama ou novos recursos de custo |
| 33.8 Recuperação/regressão | E08/E09 | Idempotência/restore/isolamento locais exercitados; suíte/CI ainda falham |
| 33.9 Aceite complementar | E01–E16 | Não aprovado para release enquanto persistirem riscos e testes bloqueados/reprovados |

## Grupo D — 22 controles transversais

| Controle | Resultado/evidência |
|---|---|
| Integridade dos arquivos | Hashes e normalização E02; espelho do escopo proposto E13 |
| Regressões | E08: sete falhas, release bloqueado |
| Compatibilidade de schema | E03 parcial; ledger/RLS não obtidos |
| Migrations | Arquivos preservados, nomes e adapters separados E02/E03 |
| Preservação de registros | Nenhuma limpeza/exclusão; órfãos verificados parcialmente E03 |
| Independência das APIs | Módulos/configuração separados; F01 e status por fornecedor E05 |
| Conectores | Telegram diagnósticos passam; WhatsApp sem conexão E06 |
| Filas | 144 FAILED e quatro incertas, sem reprocessamento E03/E04 |
| Links | Nenhuma URL afiliada substituída; atribuição completa pendente E05/E14 |
| Preços | Fontes oficiais vs observação manual inspecionadas/testadas localmente E08 |
| Conformidade | Medicamentos em F04; termos/escopos oficiais não presumidos E12/E16 |
| Rate limits | Quota histórica scheduler e MCP 429 observados, sem bypass E04 |
| Tokens | Nenhum valor exposto; Mercado Livre 401, Rakuten falha, sem refresh E05 |
| Saúde dos workers | Logs/crons/backlog E04, sem execução manual |
| Agendamentos | 16 observados vs 14 manifesto GitHub E04/E02 |
| Alertas | Existência/entrega de alertas não comprovada; pendência de observabilidade |
| Backups | Dois registros, data 09/10; restore fixture apenas E09 |
| Rollback | Fontes-base e branch preservadas; nenhum rollback de dados necessário |
| Custos | Nenhum gasto/upgrade; sem prova de orçamento AWS E07 |
| Tracking | Zero vendas/cliques no relatório consultado, sem inferir conversão E14 |
| Recuperação de código | Inventário dos 44 PRs e candidatos E11; sem merge automático |
| Compatibilidade entre ambientes | 30 diferenças efetivas candidatas e adapters intencionais E02 |

## Grupo E — dez fases de execução

| Fase | Estado real | Próxima saída verificável |
|---|---|---|
| 1 Diagnóstico/inventário | Levantamento dos 35 itens consolidado, com bloqueios formais | Evidências inacessíveis obtidas ou risco aceito pelo titular de forma explícita |
| 2 APIs | Leituras reais parciais e falhas documentadas | Envelope/credenciais/permissões e operações por fornecedor homologadas |
| 3 Filas/ingestão | Auditoria realizada, correções operacionais pendentes | Lotes com preservação/retomada e recuperação segura dos estados |
| 4 IA/classificação | Auditadas; Ollama/AWS bloqueados | Configuração segura e teste sem custo novo; regressão de categorias |
| 5 Canais | Telegram leitura positiva; entrega não testada e WhatsApp bloqueado | Destino de teste autorizado, receipt e idempotência reais |
| 6 Segurança/integridade | Auditoria parcial do ambiente e local; lacunas registradas | Hardening compatível, RLS e testes faltantes comprovados |
| 7 Desempenho/custos | Análise de quotas/logs, sem carga/medição externa | Métricas reais e plano de capacidade sem gasto não autorizado |
| 8 Correções/melhorias | Só gate de medicamento em PR/WIP de etapa anterior | Achados F01–F13 resolvidos de forma incremental e documentada |
| 9 Testes/validação | Executados; suíte e CI reprovadas | Checks necessários aprovados no ambiente correspondente |
| 10 Implantação/reconciliação | NÃO INICIADA | Arquivos relevantes equivalentes, gates aprovados, deployment e smoke tests registrados |

## Verificações bloqueadas e ação concreta

1. **AWS/SSM/EC2/orçamento:** falta identidade/perfil seguro; não há prova de existência/saúde/custo da referência histórica. Titular deve disponibilizar acesso seguro, sem enviar valores de segredos no chat.
2. **Ollama:** faltam configuração do endpoint, modelo e segredo; não trocar Gemini até teste completo.
3. **WhatsApp:** falta conexão/canal permitido; preservar destinos pausados.
4. **Tokens/escopos:** Mercado Livre/Rakuten exigem diagnóstico/renovação controlada; Magalu exige Tenant ID autorizado; Amazon/Admitad/Awin exigem cadastro oficial. Não tratar metadata como autenticação válida.
5. **RLS/ledger de migrations/backup externo:** as ferramentas atuais não forneceram essas provas; solicitar à plataforma o meio suportado, sem contornar o gateway.
6. **Envio real e restauração real:** nenhum disparo/restore em produção autorizado por teste genérico; validar em destino/ambiente isolado apropriado. O worker Telegram direto foi rejeitado pela revisão automática devido a risco de envio/processamento; leitura oficial de permissões foi concluída pela alternativa segura.
7. **Documentação oficial bloqueada:** quatro portais responderam 403; não presumir contratos/limites ou usar bypass. Fornecer documentação oficial acessível/autorizada quando necessário.

Esses bloqueios não são aprovação nem conclusão funcional. As correções e a homologação do sistema permanecem pendentes; este documento encerra a consolidação do parecer, não uma certificação de produção nem a implementação de todos os requisitos.

## Detalhamento rastreável por seção

### P01 — Identidade do projeto

- **Objetivo/fontes:** README.md; docs/MASTER-CONTEXT.md; GitHub get_repo; Hatchable list_projects.
- **Evidências:** E01, E15.
- **Estado/resultado:** APROVADA; gravidade Baixa.
- **Achado/impacto:** Projeto, slug, repositório e branch principal confirmados.
- **Testes:** Conector confirma owner no Hatchable e escrita no GitHub.
- **Dependências:** Nenhuma dependência externa pendente para identificação.
- **Correção/recomendação/pendência:** Manter a conferência de identidade antes de novas operações.

### P02 — Executar, não apenas orientar

- **Objetivo/fontes:** docs/AUDIT-LEDGER.md; lib/offer-flow-policy.js; tests/medication-enqueue.test.mjs.
- **Evidências:** E05, E08, E13.
- **Estado/resultado:** APROVADA COM RESSALVAS; gravidade Alta.
- **Achado/impacto:** Foram executados testes, consultas, diagnóstico de canais e proposta de correção; ainda não houve homologação integral.
- **Testes:** Resultados locais, HTTP e probes registrados separadamente.
- **Dependências:** Falhas da suíte, divergências e acessos descritos neste parecer.
- **Correção/recomendação/pendência:** Executar correções priorizadas e homologação compatível antes da liberação.

### P03 — Diagnóstico inicial somente leitura

- **Objetivo/fontes:** docs/AUDITORIA-CONTINUIDADE-2026-11-08.md; docs/HATCHABLE-GITHUB-SYNC-RULE.md.
- **Evidências:** E01, E02, E03, E04.
- **Estado/resultado:** APROVADA COM RESSALVAS; gravidade Média.
- **Achado/impacto:** Baseline inicialmente limpa, inventário e diagnóstico apresentados antes da proposta; inventário de produção ampliado após conexão.
- **Testes:** Leituras por conectores, SQL agregado, manifesto e histórico.
- **Dependências:** Parte da introspecção bloqueada pelo gateway e documentação externa.
- **Correção/recomendação/pendência:** Preservar snapshots; resolver verificações de RLS, ledger de migrations e fontes externas indisponíveis.

### P04 — Objetivo funcional do Radar

- **Objetivo/fontes:** lib/ingestion.js; lib/autopilot.js; api/reports.js; api/jobs/telegram.js.
- **Evidências:** E03, E04, E05, E14.
- **Estado/resultado:** REPROVADA; gravidade Alta.
- **Achado/impacto:** A cadeia completa não está homologada: filas falhas, credenciais/escopos incompletos e ausência de vendas importadas.
- **Testes:** Leituras reais e testes isolados; nenhum envio real.
- **Dependências:** Fornecedores, canais, contratos e dados oficiais de conversão.
- **Correção/recomendação/pendência:** Homologar captura → conversão → entrega → atribuição por fornecedor/canal, preservando registros.

### P05 — Preservação do sistema existente

- **Objetivo/fontes:** docs/CHANGE-IMPACT-LOG.md; migrations/; docs/audit-evidence/2026-11-08/recovery-44.json.
- **Evidências:** E02, E11, E13.
- **Estado/resultado:** APROVADA COM RESSALVAS; gravidade Alta.
- **Achado/impacto:** Nenhuma exclusão, limpeza de fila ou migration de produção realizada; diferenças e branches foram preservadas.
- **Testes:** Checks de órfãos nos dois vínculos e revisão de diffs; não equivalem a integridade global.
- **Dependências:** Snapshot/rollback validado para futuras mudanças de dados.
- **Correção/recomendação/pendência:** Comparar compatibilidade e backup antes de qualquer recuperação ou lote.

### P06 — APIs e integrações

- **Objetivo/fontes:** api/integrations/; api/mercadolivre/; lib/direct-connectors.js; lib/lomadee-api.js.
- **Evidências:** E05, E12.
- **Estado/resultado:** REPROVADA; gravidade Alta.
- **Achado/impacto:** Shopee e Lomadee passaram em uma leitura; AliExpress retornou erro de negócio 405 não tratado; Rakuten falhou; Mercado Livre retornou 401; Magalu sem Tenant ID.
- **Testes:** Queries de leitura com helpers derivados; endpoints de configuração; portais oficiais acessíveis/bloqueados registrados.
- **Dependências:** Credenciais, escopos/campanhas e documentação de cada programa; não há certificação ponta a ponta.
- **Correção/recomendação/pendência:** Tratar envelope AliExpress; diagnosticar tokens/permissões sem confundir OAuth seller com programa de afiliados; homologar operações individualmente.

### P07 — Categorias, subcategorias e palavras-chave

- **Objetivo/fontes:** lib/category-classifier.js; lib/category-routing.js; tests/category-classifier.test.mjs; lib/category-classifier.test.js.
- **Evidências:** E03, E08, E11.
- **Estado/resultado:** APROVADA COM RESSALVAS; gravidade Média.
- **Achado/impacto:** Casa & Lar e Pet encontrados; inventário inclui rótulo de bebês/crianças, sem correspondência literal Baby & Kids. Há PRs de classificação pendentes.
- **Testes:** Suíte de classificadores e nove testes adicionais aprovados; não houve reclassificação em lote.
- **Dependências:** Taxonomia por conta e revisão dos PRs #187/#169 e consumidores.
- **Correção/recomendação/pendência:** Conferir alias de Baby & Kids, conflitos e PRs por fonte; preservar ofertas sem classificação e categorias manuais.

### P08 — Filas, workers e processamento

- **Objetivo/fontes:** api/jobs/telegram.js; api/jobs/lomadee-link-queue.js; lib/ingestion.js; lib/delivery.js.
- **Evidências:** E03, E04.
- **Estado/resultado:** REPROVADA; gravidade Alta.
- **Achado/impacto:** Snapshot: 144 FAILED sem próxima tentativa, quatro WAITING_CONFIRMATION e grande backlog; helper de ingestão corta acima de 50 itens.
- **Testes:** SQL agregado, código e logs; sem disparo de worker ou alteração de fila.
- **Dependências:** Confirmação no destino para entregas incertas e causa das falhas Lomadee.
- **Correção/recomendação/pendência:** Definir recuperação com causa/dono/checkpoint, preservar excedentes e investigar falhas antes de qualquer reprocessamento.

### P09 — Telegram, WhatsApp e canais

- **Objetivo/fontes:** api/telegram/diagnostics.js; lib/telegram.js; lib/whatsapp-channel.js; workers/whatsapp.mjs.
- **Evidências:** E06, E03.
- **Estado/resultado:** BLOQUEADA; gravidade Alta.
- **Achado/impacto:** Diagnóstico de leitura Casa & Lar/Pet passou sem envio. Chat ID histórico Pet diverge do ativo. Zero conexões WhatsApp, 12 destinos pausados.
- **Testes:** getMe/getChat/getChatMember através da rota de diagnóstico, sentMessage=false; worker real não executado.
- **Dependências:** Conexão oficial de canal e autorização específica de teste de entrega; nenhuma mensagem disparada.
- **Correção/recomendação/pendência:** Preservar destinos atuais validados; homologação de entrega exige destino de teste autorizado e conexão WhatsApp funcional.

### P10 — Painel de filas e relatórios

- **Objetivo/fontes:** api/reports.js; public/radar.js; api/admin/ai-usage.js.
- **Evidências:** E14, E03, E08.
- **Estado/resultado:** APROVADA COM RESSALVAS; gravidade Média.
- **Achado/impacto:** GET real de relatórios respondeu 200 com dados agregados; sete dias: 1.538 publicações, zero cliques e zero vendas no relatório consultado.
- **Testes:** Endpoint real e E2E local; não usou demonstração como evidência.
- **Dependências:** Dados reais de tracking/conversões e diferenças GitHub/Hatchable de relatórios.
- **Correção/recomendação/pendência:** Cobrir todos os estados/APIs, idade da fila, retries, workers e erros; reconciliar métricas do banco com UI hospedada.

### P11 — Ollama e infraestrutura de IA

- **Objetivo/fontes:** lib/ollama.js; api/admin/ollama.js; hatchable.toml.
- **Evidências:** E07.
- **Estado/resultado:** BLOQUEADA; gravidade Alta.
- **Achado/impacto:** Ollama responde OLLAMA_SETUP_REQUIRED. Nenhum perfil AWS disponível; CLI e manifesto de identidade ausentes. EC2/região/orçamento históricos não reconfirmados.
- **Testes:** GET de status 200, configured=false; inspeção de metadados de acesso, sem ler valores de segredos.
- **Dependências:** Acesso AWS/SSM, servidor Ollama e limites/custos reais.
- **Correção/recomendação/pendência:** Disponibilizar acesso seguro à infraestrutura e configurar endpoint/modelo/token; testar sem substituir Gemini nem criar recursos pagos.

### P12 — Recursos de IA

- **Objetivo/fontes:** lib/gemini.js; lib/radar-ai.js; lib/radar-ai-guard.js; lib/promo-classifier.js; api/ai/.
- **Evidências:** E07, E08.
- **Estado/resultado:** APROVADA COM RESSALVAS; gravidade Média.
- **Achado/impacto:** Regras/fallback e ledger presentes; 32 chamadas SUCCESS em consulta agregada. Não foi feita nova geração paga. lib/radar-ai.js é candidato sem import estático.
- **Testes:** Testes locais de fatos, promoções e governança; dados de tokens não foram convertidos em custo inventado.
- **Dependências:** Provedor/modelos habilitados e validação factual com amostra representativa.
- **Correção/recomendação/pendência:** Verificar consumidores dinâmicos, qualidade factual e fallback por recurso; separar metadados de campanha de texto gerado.

### P13 — Segurança completa

- **Objetivo/fontes:** lib/security.js; server.js; lib/network-guard.js; lib/monitoring.js; lib/media.js; api/n8n/bridge.js.
- **Evidências:** E10, E02, E08.
- **Estado/resultado:** REPROVADA; gravidade Alta.
- **Achado/impacto:** API privada bloqueia anônimo com 401. Header CSP real da raiz contém somente frame-ancestors; hardening do standalone não pode ser assumido no Hatchable. RLS não confirmado.
- **Testes:** Scan de 481 arquivos: um padrão em fixture de teste; testes locais de isolamento/HMAC/SSRF; não é pentest nem varredura histórica de segredos.
- **Dependências:** Controles de rede da plataforma, introspecção RLS e revisão de todas as rotas.
- **Correção/recomendação/pendência:** Reconciliar políticas de headers e proteção de rede de cada runtime, revisar autorização/segredos/webhooks e completar RLS sem contornar o gateway.

### P14 — Banco de dados e migrations

- **Objetivo/fontes:** migrations/; hatchable/migrations.js; docs/BANCO-DADOS-2026-11-08.md.
- **Evidências:** E02, E03, E09.
- **Estado/resultado:** BLOQUEADA; gravidade Alta.
- **Achado/impacto:** 67 tabelas; 77 SQL no GitHub e 73 no inventário dry-run. Há arquivos renomeados/standalone; 27 migrations comuns divergentes em hash equivalentes por tokens. Ledger de aplicação não obtido.
- **Testes:** Schema, information_schema, checks de órfãos e migração local em memória; pg_catalog foi rejeitado.
- **Dependências:** Ledger da plataforma, RLS e backup/restauração reais; nenhuma migration reescrita.
- **Correção/recomendação/pendência:** Obter prova de migrations aplicadas, revisar aliases/constraints/índices e validar restauração antes de migration nova.

### P15 — Agendamentos e operação 24/7

- **Objetivo/fontes:** hatchable.toml; lib/recurrences.js; api/jobs/hourly.js; lib/autopilot.js.
- **Evidências:** E04, E02.
- **Estado/resultado:** APROVADA COM RESSALVAS; gravidade Alta.
- **Achado/impacto:** 16 crons observados, 14 no manifesto GitHub; dois jobs extras confirmados no scheduler. Logs antigos mostram quota one-shot esgotada; código atual já separa jobs.
- **Testes:** Inventário do scheduler e logs reais; tarefas não foram disparadas manualmente.
- **Dependências:** Observação continuada e limites do plano; falhas de fila ainda em aberto.
- **Correção/recomendação/pendência:** Reconciliar origem dos 16 agendamentos e monitorar backlog, quotas, leases e cadência; não criar one-shot por produto.

### P16 — Qualidade e conformidade das ofertas

- **Objetivo/fontes:** lib/product-safety.js; lib/offer-flow-policy.js; lib/delivery.js; api/jobs/aliexpress-review.js.
- **Evidências:** E16, E08, E13.
- **Estado/resultado:** REPROVADA; gravidade Alta.
- **Achado/impacto:** Baseline publicada permite medicamento no gate; correção protege novo enqueue somente no WIP/PR. Busca limitada por nove nomes não encontrou candidatos, sem provar ausência de todos os medicamentos.
- **Testes:** Gate e enqueue isolados passam, probe puro no isolate; sem alteração de ofertas reais.
- **Dependências:** Dispatchers, publicação manual/social, migração de filas e reconciliação de produção.
- **Correção/recomendação/pendência:** Proteger todos os caminhos de publicação e filas existentes; preservar registro e acessórios; não usar falta de dado como fraude.

### P17 — Rastreamento e conversões

- **Objetivo/fontes:** api/r/[id].js; lib/affiliate-sales.js; api/reports.js; api/n8n/bridge.js.
- **Evidências:** E03, E05, E14.
- **Estado/resultado:** BLOQUEADA; gravidade Alta.
- **Achado/impacto:** affiliate_sales vazia; cliques zero no relatório. Preservação de links é implementada, mas links diretos podem não passar pelo redirect de contagem.
- **Testes:** Testes locais de normalização/idempotência e leitura real do banco; nenhuma venda simulada como produção.
- **Dependências:** Dados/relatórios oficiais e políticas de atribuição dos provedores.
- **Correção/recomendação/pendência:** Validar atribuição/SubID e importação oficial por programa; distinguir clique, pedido, conversão e comissão.

### P18 — Interface e experiência do usuário

- **Objetivo/fontes:** public/radar.js; public/radar.css; public/radar-theme-v5.css; pages/; tests/e2e/production.spec.js.
- **Evidências:** E08, E02.
- **Estado/resultado:** APROVADA COM RESSALVAS; gravidade Média.
- **Achado/impacto:** Sete áreas preservadas, três E2E locais aprovados em cinco larguras; CSS/páginas e assets divergem entre ambientes.
- **Testes:** E2E local inclui acessibilidade, modal, upload e layout; não certifica UI de produção autenticada.
- **Dependências:** Sessão de navegador no app hospedado e reconciliação dos assets.
- **Correção/recomendação/pendência:** Validar UI autenticada hospedada, estados vazios/erro e assets antes de reconciliar CSP; preservar navegação.

### P19 — Desempenho e controle de custos

- **Objetivo/fontes:** hatchable.toml; api/jobs/shopee.js; api/jobs/lomadee-link-queue.js; lib/autopilot.js; docs/RESOURCE-MANAGER.md.
- **Evidências:** E04, E07, E14.
- **Estado/resultado:** APROVADA COM RESSALVAS; gravidade Alta.
- **Achado/impacto:** Lotes/cadência protegem o plano, mas backlog e erros permanecem. Sem medição de CPU/memória AWS ou custo completo; não houve gasto/upgrade.
- **Testes:** Durações das chamadas e logs registrados; não foi teste de carga.
- **Dependências:** Métricas de hospedagem, quotas por API e identidade AWS para orçamento.
- **Correção/recomendação/pendência:** Medir eficiência por lote, consultas lentas e taxa de drenagem sem sobrecarregar produção; reconciliar orçamento externo.

### P20 — Dezesseis auditorias principais

- **Objetivo/fontes:** docs/AUDITORIA-CONTINUIDADE-2026-11-08.md.
- **Evidências:** E01, E02, E03, E04, E05, E06, E07, E08, E09, E10, E11, E14.
- **Estado/resultado:** APROVADA COM RESSALVAS; gravidade Alta.
- **Achado/impacto:** As 16 frentes possuem parecer separado neste adendo; várias estão reprovadas ou bloqueadas.
- **Testes:** Matriz A relaciona frente, fonte, resultado e próxima validação.
- **Dependências:** As dependências de cada frente permanecem distintas.
- **Correção/recomendação/pendência:** Resolver as pendências específicas antes de aprovar as frentes; cobertura não é homologação.

### P21 — Dez fases de execução

- **Objetivo/fontes:** docs/AUDITORIA-CONTINUIDADE-2026-11-08.md; docs/CONTROLE-DE-MUDANCAS.md.
- **Evidências:** E13, E15.
- **Estado/resultado:** APROVADA COM RESSALVAS; gravidade Alta.
- **Achado/impacto:** As dez fases estão registradas separadamente; auditoria não equivale a executar dez fases de implantação.
- **Testes:** Matriz E diferencia análise, proposta, teste e deploy.
- **Dependências:** Correções, homologação e reconciliação antes da fase 10.
- **Correção/recomendação/pendência:** Seguir sequência e gates de dados/segurança/testes; implantação ainda não iniciada.

### P22 — Controles transversais

- **Objetivo/fontes:** docs/CHANGE-IMPACT-LOG.md; docs/audit-evidence/2026-11-08/coverage-35.json.
- **Evidências:** E02, E03, E04, E08, E09, E10, E13.
- **Estado/resultado:** APROVADA COM RESSALVAS; gravidade Alta.
- **Achado/impacto:** Controles de integridade, regressão, custo, dados e recuperação foram rastreados; os não comprovados permanecem explícitos.
- **Testes:** Matriz D registra os 22 controles do prompt.
- **Dependências:** Métricas contínuas, backup real e homologação externa.
- **Correção/recomendação/pendência:** Manter monitoramento e provas por mudança; não atribuir aprovação global.

### P23 — Documentação do projeto

- **Objetivo/fontes:** docs/INDICE.md; docs/MASTER-CONTEXT.md; docs/AUDIT-LEDGER.md; docs/CHANGE-IMPACT-LOG.md; lib/documentation/ no Hatchable.
- **Evidências:** E13, E15.
- **Estado/resultado:** APROVADA COM RESSALVAS; gravidade Média.
- **Achado/impacto:** Documentação consultada e adendos atuais preparados com índice, domínio, evidências e impacto; cópia privada exigida nas duas plataformas.
- **Testes:** Validação de JSON/links locais e comparação de conteúdo; sem publicar documentação em public/.
- **Dependências:** Commit final e inventário WIP desta consolidação, registrados no PR.
- **Correção/recomendação/pendência:** Conferir hashes após espelhamento e versionamento desta consolidação; manter fatos antigos como históricos.

### P24 — Controle de status das auditorias

- **Objetivo/fontes:** docs/audit-evidence/2026-11-08/coverage-35.json.
- **Evidências:** E15.
- **Estado/resultado:** APROVADA; gravidade Baixa.
- **Achado/impacto:** Os 35 itens têm identificador, status, fonte, teste, impacto, dependência e ação; implementação/configuração/teste/produção separados.
- **Testes:** Assert de exatamente 35 IDs sem repetição e estados permitidos.
- **Dependências:** Nenhuma dependência para o controle de classificação.
- **Correção/recomendação/pendência:** Manter o status atualizado quando novas provas chegarem.

### P25 — Regra GitHub e Hatchable

- **Objetivo/fontes:** docs/HATCHABLE-GITHUB-SYNC-RULE.md; docs/audit-evidence/2026-11-08/comparison-77.json.
- **Evidências:** E02, E13.
- **Estado/resultado:** REPROVADA; gravidade Alta.
- **Achado/impacto:** Na baseline, 77 hashes divergem; 47 equivalentes pela normalização declarada e 30 com diferenças de código/conteúdo/configuração. Parte é adapter intencional.
- **Testes:** Comparação de 267 caminhos e leitura dos 77 divergentes, mais inventário de caminhos exclusivos.
- **Dependências:** Reconciliação dos 30 candidatos e compatibilidade do runtime; proposta não é release.
- **Correção/recomendação/pendência:** Decidir fonte de verdade por arquivo; preservar melhorias/segurança; não copiar pacote standalone ou migrations renomeadas para produção.

### P26 — Testes obrigatórios

- **Objetivo/fontes:** package.json; .github/workflows/ci.yml; tests/; scripts/verify-backup.mjs.
- **Evidências:** E08, E09.
- **Estado/resultado:** REPROVADA; gravidade Alta.
- **Achado/impacto:** Local: 243 testes/236 aprovados/7 falhas; E2E 3 aprovados e audit zero. CI falhou em npm test e pulou audit/E2E. Teste de backup isolado depende de fixtures de outros testes.
- **Testes:** Rerun de operations: 20 testes, 19 passam, um falha; restore de 36 tabelas passa no arquivo completo.
- **Dependências:** Compatibilidade de testes e runtime hospedado; CI continua bloqueando release.
- **Correção/recomendação/pendência:** Corrigir regressões/expectativas obsoletas com testes comportamentais; tornar fixtures independentes; repetir checks pertinentes após alterações.

### P27 — Autorização e autonomia

- **Objetivo/fontes:** prompt mestre; docs/CHANGE-IMPACT-LOG.md; registro de ferramentas.
- **Evidências:** E15, E06.
- **Estado/resultado:** APROVADA COM RESSALVAS; gravidade Alta.
- **Achado/impacto:** Sem envio, gasto, deploy, migration ou exclusão. Revisão automática rejeitou testar o job Telegram por risco de processamento/envio; alternativa de leitura foi usada.
- **Testes:** Diagnósticos oficiais de leitura retornaram sentMessage=false.
- **Dependências:** Teste de entrega real depende de autorização específica e destino adequado.
- **Correção/recomendação/pendência:** Manter limites específicos de envios, gastos, alterações críticas e dados; não contornar a rejeição.

### P28 — Continuidade

- **Objetivo/fontes:** docs/MASTER-CONTEXT.md; docs/AUDIT-LEDGER.md; docs/AUDITORIA-CONTINUIDADE-2026-11-08.md.
- **Evidências:** E01, E13, E15.
- **Estado/resultado:** APROVADA; gravidade Baixa.
- **Achado/impacto:** Trabalho retomado do PR #193 e baseline já conhecida; conexão Hatchable resolveu bloqueio anterior, sem reiniciar o projeto.
- **Testes:** Comparação do novo texto com o anterior: hashes iguais; histórico preservado.
- **Dependências:** Nenhuma dependência para o registro de continuidade.
- **Correção/recomendação/pendência:** Registrar o próximo ponto exato ao encerrar cada etapa.

### P29 — Relatório obrigatório

- **Objetivo/fontes:** docs/AUDITORIA-CONTINUIDADE-2026-11-08.md; docs/audit-evidence/2026-11-08/.
- **Evidências:** E01, E02, E13, E15.
- **Estado/resultado:** APROVADA COM RESSALVAS; gravidade Média.
- **Achado/impacto:** Relatório contém execução, local, baseline, validação, implantação, pendências e prioridades; não confunde PR, WIP e produção.
- **Testes:** Índice de evidências e matriz de rastreabilidade incluídos.
- **Dependências:** Sincronização do escopo documental desta consolidação, sem afirmar sincronização integral.
- **Correção/recomendação/pendência:** Consultar commit final no PR e hashes de espelhamento; manter limitações do relatório explícitas.

### P30 — Critério de conclusão das 16 auditorias

- **Objetivo/fontes:** docs/MATRIZ-TESTES-2026-11-08.md; docs/AUDITORIA-CONTINUIDADE-2026-11-08.md.
- **Evidências:** E05, E08, E09, E10, E13.
- **Estado/resultado:** REPROVADA; gravidade Alta.
- **Achado/impacto:** Os critérios de liberação não foram atingidos: há falhas de testes, erro de API, verificações bloqueadas e diferenças não reconciliadas.
- **Testes:** Parecer final é REPROVADO PARA LIBERAÇÃO, independentemente da cobertura das 35 seções.
- **Dependências:** Correções e homologação das frentes não aprovadas.
- **Correção/recomendação/pendência:** Tratar achados críticos e completar provas faltantes antes de aprovar o projeto; não declarar 100%.

### P31 — Ordem de execução

- **Objetivo/fontes:** docs/AUDIT-LEDGER.md; docs/CHANGE-IMPACT-LOG.md.
- **Evidências:** E01, E13, E15.
- **Estado/resultado:** APROVADA COM RESSALVAS; gravidade Média.
- **Achado/impacto:** Diagnóstico precedeu a proposta; a produção não foi alterada nesta auditoria; correção incremental está isolada em PR/WIP.
- **Testes:** Histórico de commits e writes WIP separado de deployment v664.
- **Dependências:** Conclusão operacional exige fases posteriores e seus gates.
- **Correção/recomendação/pendência:** Continuar pelos achados priorizados, com análise de impacto e evidência nas duas plataformas.

### P32 — Implementações perdidas, desconectadas ou não integradas

- **Objetivo/fontes:** docs/audit-evidence/2026-11-08/recovery-44.json; docs/audit-evidence/2026-11-08/disconnected-candidates.json.
- **Evidências:** E11, E02.
- **Estado/resultado:** APROVADA COM RESSALVAS; gravidade Alta.
- **Achado/impacto:** 44 PRs abertos inventariados com refs, arquivos, dependências e decisão; 194 branches, 160 com patches únicos; 2.230 commits alcançáveis. Há candidatos desconectados e protótipos.
- **Testes:** Diffs, equivalência de patches, grafo de imports/referências e busca de revert; identificados falsos positivos por adapter e scheduler.
- **Dependências:** Decisão funcional de recuperação e teste por candidato; nenhuma recuperação automática autorizada pelo inventário.
- **Correção/recomendação/pendência:** Revisar compatibilidade individual antes de recuperação; inventário não aprova merge dos 44 PRs nem prova ausência de chamadas dinâmicas.

### P33 — Qualidade e confiabilidade complementares

- **Objetivo/fontes:** scripts/verify-backup.mjs; package-lock.json; lib/backups.js; .github/workflows/ci.yml.
- **Evidências:** E08, E09, E10, E11.
- **Estado/resultado:** APROVADA COM RESSALVAS; gravidade Alta.
- **Achado/impacto:** Nove frentes complementares examinadas; backup local de 36 tabelas passa, real não restaurado; quatro pacotes sem licença declarada no lock; falhas e gaps de logs permanecem.
- **Testes:** Matriz C inclui dependências, duplicidade, backup, observabilidade, contratos, incompletos, flags, regressão e aceite.
- **Dependências:** Backups reais, ambientes isolados, revisão jurídica se necessária e métricas da plataforma.
- **Correção/recomendação/pendência:** Reconciliar cobertura/retencão de backups, licenças, contratos e observabilidade; validar restauração real em isolamento.

### P34 — Matriz final de cobertura

- **Objetivo/fontes:** docs/AUDITORIA-CONTINUIDADE-2026-11-08.md; docs/audit-evidence/2026-11-08/coverage-35.json.
- **Evidências:** E15.
- **Estado/resultado:** APROVADA COM RESSALVAS; gravidade Média.
- **Achado/impacto:** Grupos A–E mantidos separados, ligados às 35 seções e às evidências; seções processuais não foram contadas como testes técnicos independentes.
- **Testes:** Assert de 35 IDs e tabelas distintas de 16 frentes, nove complementares, 22 controles e dez fases.
- **Dependências:** Pendências específicas nas matrizes, sem certificado global.
- **Correção/recomendação/pendência:** Atualizar resultado de cada requisito sem propagar aprovação de uma frente para outra.

### P35 — Evolução segura

- **Objetivo/fontes:** docs/HATCHABLE-GITHUB-SYNC-RULE.md; docs/CONTROLE-DE-MUDANCAS.md; docs/CHANGE-IMPACT-LOG.md.
- **Evidências:** E13, E15.
- **Estado/resultado:** APROVADA COM RESSALVAS; gravidade Alta.
- **Achado/impacto:** Investigação, comparação e testes precederam o WIP; nenhuma arquitetura substituída ou fila apagada. Proposta não foi publicada com suíte falha.
- **Testes:** Gate testado, dry-run sem erros/avisos e hash do escopo WIP comparado; não comprova os 30 arquivos pendentes.
- **Dependências:** Gates de release e recuperação listados neste parecer.
- **Correção/recomendação/pendência:** Resolver achados em mudanças pequenas, revisar impacto e rollback e manter documentação GitHub/Hatchable equivalente no escopo de cada alteração.
