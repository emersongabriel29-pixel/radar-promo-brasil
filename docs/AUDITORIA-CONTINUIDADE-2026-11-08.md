# Auditoria de continuidade — Radar Promo Brasil — 08/11/2026

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
