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

Use destino e dados de teste autorizados pelo titular. Validar imagem, preço/cupom reais, link oficial, receipt e retry/UNKNOWN por canal habilitado. Validar comissão no relatório oficial. Configurar contato de incidentes e rotinas de backup/restore. Funcionalidades opcionais sem provedor devem continuar pendentes.

Os bloqueios e os recursos ainda sem executor estão discriminados na auditoria. A configuração inicial preserva a operação privada existente; disponibilizar uma vitrine ao público é ação do titular nas configurações de visibilidade do Hatchable.

## Standalone

Node 22+, HTTPS, volumes duráveis, identidade e segredo obrigatórios, proxy confiável definido explicitamente. Migrações aplicadas são imutáveis. Uma instalação antiga sem ledger não deve receber baseline automático: faça backup, compare o schema e reconcilie o histórico com evidência. O scheduler usa o banco e token interno; chamadas externas às suas rotas retornam 404.
