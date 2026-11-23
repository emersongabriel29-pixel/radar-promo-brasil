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

## Adendo de auditoria — 08/11/2026, parecer35

GET magalu-status retornou CONNECTED_API_ERROR, tenantIdConfigured=false e scopeGrantVerified=false. OAuth cadastrado e API seller precisam ser distinguidos do fluxo manual Parceiro Magalu. Não usar ClientID/APIKey como TenantID nem substituir credenciais existentes.

Evidências e limitações: [relatório consolidado](../AUDITORIA-CONTINUIDADE-2026-11-08.md) e `../audit-evidence/2026-11-08/`. Os probes de fornecedores executaram helpers derivados no isolate; não equivalem a importar e homologar toda a rota implantada. Sem mensagem, migration, token renovado ou deploy.
