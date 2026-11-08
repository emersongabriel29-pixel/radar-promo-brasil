# Contrato de integração

## Execução
1. Adquirir lease exclusivo.
2. Verificar configuração, credencial e orçamento.
3. Ler cursor persistido.
4. Consultar endpoint oficial com timeout e paginação controlados.
5. Validar esquema e metadados sem segredos.
6. Persistir lote e cursor consistentemente.
7. Enfileirar etapas seguintes.
8. Atualizar métricas e liberar lease.

## Falhas
401/403: parar tentativas cegas e diagnosticar escopo/credencial. 429: respeitar Retry-After e cota oficial. 5xx/rede: backoff exponencial com jitter. Resposta inválida: quarentena sem avançar cursor de modo a perder dados. Timeout: confirmar idempotência antes de repetir. Token expirado: renovar pelo fluxo oficial.

## Evidência
Registrar fornecedor, operação, request_id quando existir, duração, status HTTP, itens recebidos/persistidos, cursor antes/depois, retries e erro sanitizado. Nunca Authorization, cookies ou tokens.

## Testes
Preferir mocks, sandbox e leitura. Não gerar transação, link de atribuição real, publicação ou mensagem externa sem autorização.