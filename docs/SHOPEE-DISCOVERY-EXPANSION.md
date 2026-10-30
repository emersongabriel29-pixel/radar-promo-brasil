# Shopee — expansão de descoberta do catálogo

## Escopo

Esta alteração amplia a descoberta automática sem transformar campanhas ou lojas em produtos fictícios e sem ativar publicação automática. O catálogo atual contém 24.786 frases únicas, geradas a partir de 243 termos de produto, 70 marcas, 16 intenções e 16 qualificadores.

O catálogo de palavras-chave é gerado a partir de termos curados de produtos, marcas, intenções de compra e atributos. A expansão atual gera milhares de frases distintas em memória; o worker consulta apenas uma pequena amostra rotativa por execução. Não existe motivo operacional para disparar centenas de milhares de consultas: isso consumiria quota e aumentaria ruído.

## Fontes consultadas pelo worker

- `productOfferV2`: três termos rotativos por execução, cada um pesquisado por desempenho de vendas e comissão.
- `shopOfferV2`: descobre lojas com ofertas de afiliado; o worker consulta produtos de até duas lojas retornadas.
- `shopeeOfferV2`: identifica campanhas ativas e registra a contagem. Campanhas não são importadas como produtos, pois não trazem preço/item individual.
- `brandOffer`: identifica ofertas de marca e registra a contagem. A operação é somente de descoberta; não é tratada como produto individual.

As consultas usam paginação rotativa limitada e são sequenciais. A execução não tenta esgotar todas as páginas em um único ciclo.

## Limites e proteção

- O worker continua limitado a três palavras-chave por ciclo de 30 minutos.
- Cada termo usa dois modos de ordenação: vendas/desempenho e comissão.
- Uma página de até 50 itens por consulta de produto.
- Uma consulta de lojas, com até duas consultas de produtos por loja.
- Uma consulta de campanhas e uma consulta de marcas.
- Falhas nas superfícies opcionais (lojas, campanhas ou marcas) não interrompem a busca principal de produtos.
- Medicamentos continuam bloqueados.
- Produtos sem título, URL de produto, link afiliado, imagem, preço ou comissão válidos continuam fora da importação.
- Desconto anunciado pela API não vira economia confirmada sem histórico de preço.
- O limite de seleção/importação por execução e o fluxo existente de validação/publicação são preservados.
- `dryRun=true` permanece sem criar links, gravar ofertas ou acionar publicação.

## Contadores de diagnóstico

A resposta do job inclui contadores para palavras-chave, consultas de produto, lojas descobertas, consultas de produtos por loja, campanhas ativas e ofertas de marca. Os campos de indisponibilidade opcional ajudam a distinguir falha de permissão/schema da ausência de resultados.

## Diagnóstico real da API (30/10/2026)

Consultas somente leitura executadas pela rota já implantada confirmaram:
- `productOfferV2` retorna produtos e métricas para buscas como `air fryer` e `smartphone`.
- A busca `notebook` retornou papel fotográfico e etiquetas, demonstrando correspondência fuzzy pouco relevante; o novo filtro impede esses itens de entrarem na seleção.
- `shopOfferV2` retornou lojas parceiras com comissão e avaliação.
- Consultas `shopeeOfferV2` testadas sem resultados nesta conta/período; o worker registra zero em vez de inventar campanhas.
- O endpoint manual `brandOffer` estava implementado internamente, mas inacessível pelo mapa de tipos; a PR adiciona o tipo `brand` e mantém sua persistência classificada como `BRAND`.
- A consulta atual por `shopId` com variável numérica retornou erro GraphQL `wrong type`; a PR corrige o envio do identificador `Int64` como string.

## Validação necessária

Os testes automatizados cobrem a geração e rotação determinística do catálogo. A confirmação de permissões e resultados reais de `shopOfferV2`, `shopeeOfferV2` e `brandOffer` depende de executar o worker em dry-run com a credencial da conta no ambiente Hatchable. Nenhuma chamada real de produção foi feita nesta alteração.
