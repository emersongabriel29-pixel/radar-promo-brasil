# Magalu — ficha de integração

## Evidência observada
Há api/integrations/magalu e rotas de connect, status, callback e clone no inventário de funções. A configuração Hatchable descreve credenciais OAuth 2.0 e tenant autorizado, mas os valores nunca devem constar nesta documentação.

## Verificações obrigatórias
- Conferir documentação oficial do produto/programa habilitado.
- Confirmar OAuth, redirect URI, scopes, tenant, expiração e refresh.
- Validar callback com state/CSRF e associação correta da conta.
- Confirmar endpoints permitidos, limites, paginação e dados retornados.
- Testar link de afiliado e SubID, se suportados.
- Documentar status de conexão, revogação e diagnóstico sem expor segredo.

## Estado
Rotas presentes; credenciais, autorização e operação real não validadas nesta tarefa.