# Auditoria do estado real — 08/11/2026

## Identificação e baseline

- Projeto: Radar Promo Brasil.
- Hatchable project: `proj_1Xj94QxQmCam`; URL: https://radar-promo-brasil.hatchable.site.
- Hatchable: v653 LIVE, implantado em 2026-11-08 13:44:31 UTC; manifesto do último deployment informa 276 arquivos e 130 funções.
- Snapshot de arquivos consultado depois: 277 arquivos (inclui 121 api/, 53 lib/, 15 public/, 9 pages/, 71 migrations/ e 8 na raiz/outras pastas). Diferença de um arquivo em relação ao manifesto é trabalho local/WIP posterior ao deployment; não assumir que está publicado.
- Banco publicado: 67 tabelas.
- GitHub: `emersongabriel29-pixel/radar-promo-brasil`, branch `main`; commit-base do código observado antes dos commits documentais: `a6215ee2264cb70741fa27075f4584c526d93e2f` (08/11/2026 13:44:05 UTC). A documentação desta auditoria foi adicionada em commits posteriores na mesma branch.
- README GitHub e README Hatchable não são idênticos. GitHub documenta adaptador standalone e limitações atuais; README Hatchable anterior tem descrição diferente. Não foi comprovada equivalência total dos arquivos entre plataformas.

## Método e limites

Inventário real de arquivos Hatchable, projeto/deployment, rotas implantadas, crons, schema PostgreSQL, variáveis secretas por nome (valores não lidos), arquivos de IA/mensagens, logs de diagnóstico Telegram e dry-run. Esta auditoria não foi um pentest, teste de carga, restauração de backup ou homologação de cada API externa. Nenhuma oferta ou mensagem real foi publicada.

## Evidências positivas

- `dry_run_deploy`: ok=true; errors=[]; warnings=[]; próximo deploy calculado v654. Nenhum deploy foi executado nesta auditoria.
- 130 funções implantadas: 121 rotas API e 9 páginas, conforme inventário Hatchable.
- 71 arquivos de migração e 67 tabelas no schema publicado.
- Segredos configurados no ambiente aparecem mascarados; a auditoria só registrou presença/nome, sem ler valores.
- Há controle de IA Gemini e migrações dedicadas de governança/quota (047, 065), além de módulos de throttle/cache.

## Achados e riscos atuais

| ID | Severidade | Evidência | Conclusão / ação documental |
|---|---|---|---|
| DOC-01 | Alta | README GitHub e README Hatchable divergem; docs centralizados não estavam no inventário Hatchable | Instituir índice e política obrigatória; sincronização documental ainda precisa ser comprovada |
| DOC-02 | Alta | O manifesto de arquivos WIP tem 277 arquivos, deployment v653 276 | Há pelo menos um arquivo posterior ao snapshot publicado; comparar manifestos antes de declarar sincronização |
| OPS-01 | Alta | Cron /api/jobs/hourly: 147 execuções em 7 dias, 40 erros; tentativas 1446 | Investigar logs/causa antes de alterar cadência ou afirmar estabilidade |
| OPS-02 | Média | Cron /api/jobs/lomadee-link-queue: 125 execuções, 12 erros em 7 dias | Investigar falhas e efeito sobre fila; não executar job manualmente nesta auditoria |
| OPS-03 | Média | Cron /api/jobs/shopee: 119 execuções, 6 erros em 7 dias | Revisar logs e falhas por execução sem disparar publicação |
| OPS-04 | Média | Telegram cron: 478 execuções, 1 erro em 7 dias; diagnóstico endpoint registrou 9 respostas 5xx/502 entre 15 logs recentes, demais 200 | Diagnóstico não está totalmente estável; verificar upstream/rede e motivo do 502 |
| OPS-05 | Média | AliExpress review 208 execuções/0 erros; outros workers variam por cron | Cadência e saúde devem ser monitoradas por fonte, sem inferir qualidade dos resultados |
| AI-01 | Média | api/ai/promo.js usa Gemini para reescrever título curto; mensagem completa é montada por formatPromo local | Gemini não decide sozinho se a oferta é Black Friday/relâmpago; tipo depende de metadados promoMetadata e evidências processadas pelo formatador |
| INT-01 | Alta | Catálogo de rotas/credenciais não comprova operação externa | Cada integração deve ter teste oficial completo, status e prova por conta; cadastro não equivale a homologação |
| QA-01 | Alta | Inventário Hatchable não contém pasta tests/; pacote GitHub declara testes standalone | Testes locais/CI do repositório não provam runtime Hatchable; separar as duas matrizes |
| SYNC-01 | Alta | Commit e deployment têm timestamps próximos, mas nenhuma comparação integral de hash foi feita nesta etapa | Não declarar sincronização total até comparar arquivos relevantes por hash |

## Estado das integrações

Este documento não marca nenhuma integração como “testada com sucesso” apenas pela presença de rota, variável de ambiente ou registro. Status individual exige autenticação oficial, chamada permitida, tratamento de erro, confirmação de resultado e evidência sem dados sensíveis. As chaves visíveis no ambiente são somente nomes: API_CREDENTIALS_MASTER_KEY, CONNECTOR_ENCRYPTION_KEY, GEMINI_API_KEY, MAGALU_CLIENT_ID, MAGALU_CLIENT_SECRET, MELI_APP_ID, MELI_CLIENT_SECRET, N8N_API_KEY, N8N_MCP_ACCESS_TOKEN, N8N_WEBHOOK_SECRET, TELEGRAM_BOT_TOKEN_1, TELEGRAM_WEBHOOK_SECRET.

## Parecer

O código implantado passa pelo validador de deploy atual, mas o projeto NÃO está certificado como 100% funcional nem como 100% sincronizado. A documentação criada é um baseline auditável. Os erros de cron/diagnóstico e a divergência de documentação são pendências reais que exigem investigação separada. Nenhum recurso deve ser ativado ou declarado homologado por inferência.
