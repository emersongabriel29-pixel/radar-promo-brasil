# Mercado Livre — ficha de integração

## Evidência observada
Foi observada a tarefa /api/jobs/mercadolivre-notifications no scheduler. O callback de integração e os endpoints de catálogo/afiliados precisam ser confirmados no inventário de código atual antes de documentar rotas adicionais.

## Verificações obrigatórias
- Confirmar documentação oficial aplicável à conta e ao programa de afiliados.
- Mapear OAuth, escopos, refresh token, expiração e revogação.
- Identificar endpoints realmente utilizados, paginação e limites.
- Verificar notificações, validação de assinatura e deduplicação de eventos.
- Confirmar geração de link, parâmetros de atribuição e SubID suportado.
- Validar preço, disponibilidade, imagens e regras de uso de conteúdo.
- Documentar códigos HTTP, retries e idempotência.

## Estado
Integração não validada ponta a ponta nesta auditoria. Não inferir que tarefa de notificações equivale a descoberta de ofertas ou geração de links funcional.

## Adendo de auditoria — 08/11/2026, parecer35

A chave de conexão persistida é MERCADOLIVRE; a fonte de oferta pode usar MERCADO_LIVRE. Consulta agregada confirmou duas conexões ACTIVE. GET/users/me com os dois access_tokens salvos retornou401 e expiração passada; nenhum refresh foi executado. OAuth não equivale à habilitação no Programa de Afiliados e não autoriza inventar parâmetros.

Evidências e limitações: [relatório consolidado](../AUDITORIA-CONTINUIDADE-2026-11-08.md) e `../audit-evidence/2026-11-08/`. Os probes de fornecedores executaram helpers derivados no isolate; não equivalem a importar e homologar toda a rota implantada. Sem mensagem, migration, token renovado ou deploy.
