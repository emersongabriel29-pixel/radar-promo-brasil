# Liberação e operação

## Validação executada

40 testes de regras, segurança e banco; duas jornadas Chromium com axe; sintaxe de 64 arquivos; npm audit sem vulnerabilidades conhecidas. O `package-lock.json` é a referência para instalações npm. Artefatos e traces de falha são publicados pela CI quando ela encontra erro.

## Implantação Hatchable

1. Conferir o projeto `proj_1Xj94QxQmCam` e preservar o snapshot anterior.
2. Publicar os arquivos compatíveis e apenas a migração adicional 018. Manter migrações anteriores da hospedagem sem alteração.
3. Executar `dry_run_deploy` e revisar erros/warnings. O adaptador standalone e seus pacotes não pertencem ao bundle da plataforma.
4. Implantar a atualização com descrição legível; verificar a versão e executar smoke tests de leitura/validação negativa e acesso.
5. Conferir crons, integridade dos dados e diagnóstico da conta. Não invocar jobs que enviam mensagens a consumidores como parte do smoke test.

Schema migra para frente. Rollback de código utiliza a versão anterior com o schema adicional preservado; não apagar tabelas ou dados para reverter. Uma falha de migração exige correção adicional/reconciliação antes de tentar novamente. O release não liga novas regras de automação nem insere credenciais.

## Homologação externa

Use destino e dados de teste autorizados pelo titular. Validar imagem, preço/cupom reais, link oficial, receipt e retry/UNKNOWN por canal habilitado. Validar comissão no relatório oficial. Configurar contato de incidentes. Backup privado e verificador de restauração estão documentados em OPERACAO-2026-10-01.md; até cinco WhatsApps e o executor de revezamento em WHATSAPP-REVEZAMENTO.md. Funcionalidades sem provedor devem continuar pendentes.

Os bloqueios e os recursos ainda sem executor estão discriminados na auditoria. O painel exige membro autenticado. No release 61 a plataforma informou visibilidade pública; `/vitrine` é acessível anonimamente, enquanto `/` e as APIs privadas retornam 401 sem autenticação. A vitrine de cada conta depende da sua configuração de publicação.

## Standalone

Node 22+, HTTPS, volumes duráveis, identidade e segredo obrigatórios, proxy confiável definido explicitamente. Migrações aplicadas são imutáveis. Uma instalação antiga sem ledger não deve receber baseline automático: faça backup, compare o schema e reconcilie o histórico com evidência. O scheduler usa o banco e token interno; chamadas externas às suas rotas retornam 404.

## Resultado do release 61

Implantação live em https://radar-promo-brasil.hatchable.site, sem draft. Migração 018 aplicada; sete relações compostas presentes e defaults 85/15/5/120 conferidos. Manifesto dos 41 arquivos enviados conferido com a normalização de espaços da plataforma. Snapshot de reversão de código v60 em `docs/rollback/hatchable-v60.json`; onze arquivos adicionais do release estão identificados no snapshot e podem permanecer durante uma reversão de código.

Nove leituras API 200, bloqueios 401/403/404 e validações 400 confirmados; assets JS/CSS 200 e painel anônimo 401. Quatro crons ativos e zero logs de erro na janela de 15 minutos observada. Não houve envio real a consumidores. CI do código no commit `ebd36e1562928ed5683f5848255e9bdeeb032595` aprovada nos runs 36791544984 e 36791540569.

O diagnóstico da conta segue `SETUP_REQUIRED` (25% interno / 15% operacional). O release não liga integrações ausentes nem certifica entrega, comissão, carga ou recuperação sem homologação.
