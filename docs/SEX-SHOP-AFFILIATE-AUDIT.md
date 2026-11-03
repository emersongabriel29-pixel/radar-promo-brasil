# Auditoria — categoria Sex shop nas APIs de afiliados

## Resultado da auditoria de código

A categoria `Sex shop` já existia em `lib/category-classifier.js`, com subcategorias para vibradores/massageadores, lubrificantes/géis, preservativos, lingerie sensual, acessórios íntimos e bem-estar íntimo.

O problema identificado era a descoberta: o catálogo rotativo de palavras-chave da Shopee não continha termos dessa categoria. Também não havia um tratamento de política específico para produtos adultos nos fluxos automáticos.

## Alterações nesta branch

- Incluídos termos de busca íntima na lista de palavras-chave da Shopee.
- Criado `isAdultProduct()` no módulo de segurança.
- Shopee: produtos identificados como adultos podem ser descobertos/importados, mas ficam como `PENDING` + `NEEDS_REVIEW`, sem aprovação automática.
- AliExpress: produtos adultos são retidos pelo filtro de política nos jobs e na importação manual; preservativos/camisinha isolados não são classificados como produtos adultos.
- Incluídos testes automatizados para detecção, exceção contraceptiva e catálogo de palavras-chave.

## Limite do que foi possível confirmar

Esta alteração de código não executa chamadas autenticadas às contas reais de afiliado. Portanto, ainda não é possível afirmar quantos produtos de sex shop cada conta retorna, nem que a API da Shopee/AliExpress os entrega. Isso depende de executar a busca autenticada em modo de auditoria/dry-run no ambiente Hatchable com as credenciais já cadastradas.

## Política das plataformas

- Shopee Ads classifica lubrificantes e brinquedos sexuais como conteúdo restrito; algumas categorias adultas só podem ser promovidas com palavras-chave em correspondência exata e exibidas nos resultados de busca.
- Os termos de afiliados do AliExpress restringem anúncios de produtos e serviços adultos, com exceção de contraceptivos. Por isso, o Radar não deve encaminhar esses itens para publicação automática.

## Próxima validação operacional

1. Publicar a branch após revisão.
2. Rodar o worker Shopee em dry-run e confirmar se há resultados para os termos íntimos adicionados.
3. Conferir os contadores de itens descobertos, classificados como `Sex shop` e retidos para revisão.
4. Executar auditoria AliExpress somente para validar a disponibilidade da API; não importar nem publicar produtos adultos.
5. Manter a revisão humana como condição obrigatória para qualquer item adulto Shopee e respeitar os termos de cada canal de divulgação.

## Validação operacional somente leitura (02/11/2026)

- Shopee `productOfferV2`: a busca `vibrador intimo` retornou 4 ofertas; a busca `massageador intimo` retornou 20 ofertas na primeira página.
- Os resultados incluíram vibradores, massageadores íntimos e lingerie com pérolas massageadoras, com links de afiliado e taxas de comissão informadas pela API.
- Algumas palavras-chave (`sex shop`, `anel peniano` e `lubrificante intimo`) retornaram erro do provedor Shopee `10000 System Error`; não interpretar esses erros como ausência de produtos.
- AliExpress: buscas por `vibrador intimo`, `massageador intimo` e `lubrificante intimo` retornaram zero itens. A busca-controle `fone bluetooth` retornou um item, indicando que a consulta de produtos está respondendo, mas não confirma ausência de toda a categoria no catálogo.
- Todas as consultas foram somente leitura. Nenhum produto foi importado, aprovado ou publicado durante a auditoria.

## Classificação e revisão

Os exemplos retornados pela Shopee motivaram regras adicionais para classificar vibradores de uso íntimo e lingerie com pérolas massageadoras como `Sex shop`. O filtro de segurança diferencia peças de reposição de vibração de celular e mantém produtos adultos em revisão humana.
