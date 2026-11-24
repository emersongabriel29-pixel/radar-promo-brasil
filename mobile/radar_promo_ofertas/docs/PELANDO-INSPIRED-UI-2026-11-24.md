# Adaptação visual do Radar Promo Ofertas — 24/11/2026

## Fonte de referência

Arquivo de referência recebido: snapshot HTML da página inicial do Pelando (461 linhas). Ele apresenta feed com Destaques/Recentes/Quentes/Mais baratos/Comentadas/Discussões, navegação por comunidades/categorias, busca e filtros, descontos e cupons, navegação inferior e chamadas comunitárias.

A referência orienta padrões de experiência. Não foram copiados código, marca, logotipo, fontes, imagens, CSS ou endpoints do Pelando.

## Mapeamento para o app Radar

| Padrão observado | Implementação no Radar | Limite respeitado |
|---|---|---|
| Destaques | Ordenação `score` | Pontuação calculada pelo Radar; não simula votos |
| Recentes | Ordenação `recent` | Ordem do feed oficial |
| Descontos | Ordenação `discount` | Campo oficial de desconto |
| Categorias | Chips horizontais e tela Categorias | Categorias recebidas nas ofertas da API |
| Cards | Imagem, título, loja, preço, preço anterior e desconto | Dados do JSON do Radar |
| Cupons | Selo no card e cópia nos detalhes | Só aparece quando a API retorna código |
| Busca | Produto, loja ou marca | Consulta o proxy do Radar |
| Navegação | Ofertas, Categorias, Salvos, Buscas e Sobre | Não cria postagem comunitária fictícia |
| Alertas | Buscas salvas e alertas de preço locais | Não afirma monitoramento remoto nem push nativo |

Quentes, Mais baratos, Comentadas e Discussões não foram adicionados como filtros falsos: o contrato atual aceita apenas `recent`, `discount` e `score`. A criação de postagem do Pelando foi excluída porque as ofertas do aplicativo são recebidas pelas APIs do Radar Promo Brasil.

## Origem e fluxo dos dados

```
APIs oficiais e fontes integradas ao Radar Promo Brasil
                  |
                  v
api/public/offers-feed.js
                  |
       autenticação servidor-servidor
                  |
                  v
Radar Promo Ofertas — /api/offers
                  |
         JSON validado e sanitizado
                  |
                  v
Radar Promo Ofertas — aplicativo Flutter
```

- O app consulta exclusivamente `https://radar-promo-ofertas.hatchable.site/api/offers`.
- O proxy chama `https://radar-promo-brasil.hatchable.site/api/public/offers-feed`.
- `RADAR_API_TOKEN` e `RADAR_OFFERS_FEED_TOKEN` permanecem no servidor. Nenhum segredo é incluído no APK ou em `--dart-define`.
- O proxy valida host/caminho, restringe parâmetros e valida o contrato.
- `affiliateUrl` e seus parâmetros são preservados. O app só abre URLs HTTPS válidas.
- O feed principal exige oferta em estado público permitido e histórico de preço oficial recente; o app não inventa nem completa preços.

## Alterações e validação

Arquivos no commit do app `e2d53f632738776a6a123991b5294b9c737cbe03`:
- `mobile/radar_promo_ofertas/lib/main.dart`: filtros rápidos por categorias da API, selo de cupom nos cards e informação da origem dos dados.
- `mobile/radar_promo_ofertas/test/feed_widget_test.dart`: teste de cupom e filtro de categoria.
- `mobile/radar_promo_ofertas/README.md`: estado da integração e instruções CI.
- `.github/workflows/radar-ofertas-android-ci.yml`: análise, testes, build debug e artefato com SHA-256/proveniência.

Estado verificado em 24/11/2026:
- Radar Promo Brasil: Hatchable v674.
- Radar Promo Ofertas: Hatchable v3.
- A execução diagnóstica de `/api/offers` retornou `429 usage_limit` da plataforma antes de validar o handler. Ainda não há prova de GET 200 com ofertas reais.
- O projeto Radar Promo Ofertas está classificado como `personal`; acesso anônimo externo precisa ser confirmado pelo proprietário.
- Flutter 3.50.0 / Dart 3.14.0 são usados no GitHub Actions. A primeira análise do commit anterior encontrou escapes de moeda inválidos em `preferences.dart` e `android_price_notifications.dart`; ambos foram corrigidos no commit acima. A nova análise, os testes e o build estão em execução no GitHub Actions (runs 9 e 100) e ainda não estão homologados.
- Nenhuma credencial, dado, visibilidade, publicação ou deploy foi alterado.

Não distribuir o APK até obter CI aprovada, GET público 200 com ofertas reais, teste de abertura de link preservando parâmetros e conferência do checksum/commit do APK.
