# Integração — 15/11/2026

## Fontes inspecionadas

| Projeto | ID | Versão | Rota |
| --- | --- | --- | --- |
| Radar Promo Brasil | proj_1Xj94QxQmCam | 671 | /api/public/offers-feed |
| Radar Promo Ofertas | proj_rPigttuZOrM7 | 1 | /api/offers |

O cliente Flutter consulta somente o projeto Ofertas. O proxy lê a credencial no servidor e autentica sua consulta ao feed do Brasil.
Nenhum arquivo, configuração, oferta, fila ou implantação dos projetos Hatchable foi alterado por esta entrega.

## Contrato

Resposta do feed: source, generatedAt, page, limit, total, hasMore, offers.
Cada oferta: id, title, source, currentPrice, originalPrice, imageUrl, affiliateUrl,
discountPercent, radarScore, score, couponCode, createdAt, category, categoryIcon,
subcategory. O cliente utiliza os campos necessários à apresentação e preserva o link afiliado completo.

## Bloqueios observados

1. A chamada anônima ao endereço real do proxy recebeu login_required na camada de hospedagem.
2. A execução pela plataforma retornou 429 usage_limit, com orçamento mensal de banco esgotado.
3. Sem resposta de sucesso entre servidores, não foi possível confirmar a igualdade dos tokens, o conteúdo atual das ofertas nem a abertura de uma oferta real.

A rota public no código não elimina a barreira de visibilidade personal da hospedagem. A liberação pública do projeto Ofertas depende do proprietário no console; o Brasil pode permanecer com sua configuração atual. Nenhum segredo deve entrar no cliente.

## Critérios de aceite pendentes para produção

- GET anônimo no proxy com status 200 e JSON compatível, sem cookie de proprietário.
- Confirmação da autenticação entre os dois servidores.
- Ofertas reais com filtros, paginação, imagens, cupons e links de afiliado válidos.
- Teste do APK instalado em aparelho Android.
- Serviços de conta, votos, comentários e notificações, se fizerem parte da próxima versão.

Os testes locais usam respostas simuladas exclusivamente em test/, sem dados fictícios no aplicativo distribuído.
