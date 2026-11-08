# Matriz de testes e critérios de aceite

## Separação de ambientes

- Testes standalone (Express/PGlite) não equivalem a testes no runtime Hatchable.
- O inventário Hatchable consultado contém 0 pastas/arquivos de teste sob tests/; o package.json do GitHub define testes Node, Playwright e audit para o adaptador standalone.
- O dry-run Hatchable em 08/11/2026 aprovou validação estática de deploy: errors 0, warnings 0; não executa fluxos de negócio nem integrações externas.

## Comandos do repositório

Conferir sempre os scripts atuais em package.json antes de executar:

- `npm run build`: verificação de sintaxe no adaptador standalone (não é build de bundle Hatchable).
- `npm test`: testes Node declarados no projeto.
- `npm run test:e2e`: Playwright; exige browsers e ambiente configurado.
- `npm audit --audit-level=moderate`: auditoria de dependências.
- `npm run check:release`: combina as verificações declaradas no package.json.

**Nenhum desses comandos foi executado nesta auditoria.** Não reutilizar resultados de 30/09 como resultado atual.

## Smoke tests seguros pós-deploy

- Rotas privadas: confirmar 401/403 sem autenticação e acesso autorizado com conta de teste.
- Rotas de leitura: confirmar shape e tipos de resposta.
- Validação: payload inválido retorna 400 sem gravar.
- Scheduler: conferir registro e execução sem disparar publicação.
- Filas: inspecionar estados e idempotência com dados isolados.
- Gemini: usar conta/limite de teste autorizado e conferir fallback, cooldown e ausência de dados inventados.
- Canais: somente destino de teste autorizado; confirmar receipt oficial sem consumidores reais.

## Critérios de aceite

| Domínio | Evidência necessária | Não basta |
|---|---|---|
| API | contrato, auth, validação, testes positivos/negativos | rota implantada |
| Banco | schema, migração, constraints, teste de compatibilidade | arquivo SQL criado |
| IA | input factual, output filtrado, fallback, quota/log | chave configurada |
| Marketplace | autenticação e operação oficial bem-sucedida | credencial cadastrada |
| Canal | receipt oficial no destino de teste | bot adicionado/grupo cadastrado |
| Scheduler | last_fired, resultado, logs e efeitos idempotentes | cron ativo |
| Segurança | testes de autorização, isolamento e segredos | painel privado visualmente |
| Deploy | dry-run, deployment version, smoke tests e diff de manifesto | deploy status live |
| Sincronização | hashes/arquivos equivalentes e commit/versão registrados | integração GitHub conectada |

## Resultado da auditoria atual

- Dry-run Hatchable: aprovado, 0 errors, 0 warnings.
- Testes npm: não executados nesta tarefa.
- E2E: não executado nesta tarefa.
- npm audit: não executado nesta tarefa.
- Homologação de integrações: não executada nesta tarefa.
- Publicação real: não executada.
- Deploy: não executado.


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


## Adendo de remediação — 08/11/2026

Rodada de remediação: suíte isolada ampliada para contratos AliExpress, cursor/lease e lote de 57 itens, claim/redirect/social de medicamentos, opt-in, backpressure e backup v1/v2. Build 209 arquivos, E2E 3/3 e npm audit 0. E2E usa bypassCSP e não valida CSP hosted. Evidência final em audit-evidence/2026-11-08/remediation-validation.json.
