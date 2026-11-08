# Catálogo de APIs

## Inventário observado
Há rotas/arquivos associados a Shopee, Mercado Livre, Lomadee, AliExpress, Magalu, Rakuten, Amazon, Awin, Admitad, Temu, Collshp e SHEIN. A presença de rota não comprova credencial, permissão, API oficial utilizável ou fluxo funcional.

## Ficha obrigatória por fornecedor
Nome e finalidade; documentação oficial/data de consulta; endpoints usados; métodos e parâmetros; paginação/cursores; autenticação/escopos/renovação; cotas e janelas; cabeçalhos de rate limit; dados e campos opcionais; geração de link e atribuição; políticas de imagem/preço/estoque; timeouts e códigos de erro; segredos necessários apenas pelo nome; testes e evidência.

## Estados
Não implementada; implementada não configurada; configurada não validada; testada com sucesso; bloqueada por acesso/credencial/limitação externa.

## Independência
Orçamento, concorrência, cursor, cache, circuit breaker, logs e fila por fornecedor. Falha de um não pausa os demais.

HTTP 200 não basta: validar conteúdo, paginação, completude, frescor, persistência e resultado. Resposta vazia pode ser sucesso técnico e falha comercial; reportar separadamente.

## Cobertura de fichas por fornecedor
Shopee, Mercado Livre, Lomadee, AliExpress, Magalu, Rakuten, Amazon Creators API, Admitad, Awin, Temu, SHEIN e Collshp. Para Temu, SHEIN, Magalu e Collshp, o código observado descreve fluxos manuais/de vitrine, não APIs automatizadas de afiliados. Admitad, Amazon e Awin têm código de API, mas não apareceram credenciais no inventário da conta em 08/11/2026. Os status devem ser atualizados somente após validação real.