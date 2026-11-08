# Regras Mestras

## Objetivo
Descobrir, organizar, validar e transformar oportunidades de afiliados em publicações rastreáveis nos canais autorizados.

## Descoberta ampla, processamento controlado
- Não impor limites internos arbitrários de ofertas por dia, API ou categoria.
- Não descartar oportunidades por volume.
- Separar descoberta, armazenamento, validação, link e publicação.
- Sem capacidade: persistir e reagendar, nunca apagar.
- Respeitar limites oficiais, termos, permissões e políticas das APIs e canais.
- “Sem restrições artificiais” não significa chamadas ilimitadas ou bypass de rate limit.

## Integridade
Preservar origem, IDs externos, timestamps, histórico de preço disponível, estado, URL original, URL afiliada, SubID, tentativas e motivos. Toda transição é auditável.

## Isolamento
Cada integração possui credenciais, orçamento, cursores, métricas, fila e retentativas próprias. Uma falha não interrompe outras APIs.

## Não alucinar
Não inventar endpoint, credencial, permissão, preço, desconto, estoque, frete, métrica ou resultado. Diferenciar ausência de dado de zero, tentativa de sucesso, inferência de validação. Registrar fonte e horário.

## Segurança
Não expor segredos. Não enviar mensagens, publicar ofertas reais, gastar créditos ou alterar produção durante testes sem autorização específica. Não apagar dados, executar migração destrutiva ou mudança irreversível sem autorização.

## Qualidade
Antes de editar, avaliar efeitos colaterais, compatibilidade, autenticação, autorização, validação, concorrência, idempotência, consumo, observabilidade e rollback.

## Conclusão
Só declarar tarefa concluída após verificar arquivos, testes, ambiente, versão implantada, divergências e pendências.