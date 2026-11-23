# Contrato da ponte Supabase

## Resposta e saúde

`db.query(sql, params)` exige JSON com `ok:true`, `rows` como lista de objetos e `rowCount` inteiro não negativo. `db.transaction(operations)` exige `results` com um resultado válido por operação. Campos adicionais do envelope são preservados. Nenhum resultado de escrita é repetido automaticamente após falha de transporte.

HTTP 200 com JSON quebrado, envelope ausente ou tipos incompatíveis gera `SUPABASE_BRIDGE_INVALID_RESPONSE` (502). Resposta de erro preserva o status HTTP de falha e somente identificadores seguros; o corpo arbitrário do provedor não é usado como mensagem de erro.

O health check administrativo exige exatamente uma linha e contagem 1, nome do banco e versão não vazios, além de timestamp válido. Conteúdo incompatível gera `SUPABASE_HEALTH_INVALID_RESULT` (502), nunca uma confirmação de saúde com campos nulos. Essa validação de contrato não substitui homologação de conexão e autorização.

## Configuração e transporte

Configuração válida é compartilhada entre chamadas concorrentes e expira após cinco segundos. Estado inválido ou falha de leitura não permanece em cache. Esse limite permite recuperar alterações de configuração em instâncias reutilizadas sem fazer duas leituras por consulta SQL.

A URL deve usar HTTPS, sem credenciais embutidas ou fragmento. Redirecionamentos são recusados. HMAC, parâmetros e timeout de 30 segundos continuam preservados. Chaves e demais valores de configuração não pertencem a este documento.

## Testes

`tests/supabase-bridge.test.mjs` cobre contratos válidos e inválidos, query e transação, assinatura HMAC, erros HTTP e de transporte, ausência de retry, cache/concorrência/rotação, recuperação de configuração, restrições de URL e health check. Usa somente respostas simuladas e dados sintéticos.

Validação local desta mudança: 13 testes novos; suíte ampliada 259/259; build de 213 arquivos JavaScript; npm audit sem vulnerabilidades reportadas. Esses resultados não certificam o ambiente hospedado.

## Histórico de migrations e publicação

As versões `20261113005104` e `20261113005133` foram recuperadas do histórico de migrations para versionamento. Os arquivos representam SQL já registrado; não são uma instrução para reaplicar migrations. O CI de testes Node não executa esses arquivos.

Alterações de configuração, permissões, dados ou produção devem seguir seu próprio plano de validação e rollback. A correção é reversível pelo commit e não exige SQL de rollback.
