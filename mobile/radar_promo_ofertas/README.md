> Fonte recuperado em 16/11/2026. Consulte [RECUPERACAO-2026-11-16.md](docs/RECUPERACAO-2026-11-16.md) e [PELANDO-INSPIRED-UI-2026-11-24.md](docs/PELANDO-INSPIRED-UI-2026-11-24.md) para o histórico e a adaptação visual. O workflow de CI do APK está em `.github/workflows/radar-ofertas-android-ci.yml`.

# Radar Promo Ofertas — Android 0.2.0

Cliente Flutter independente. O Radar Promo Brasil e seus dados não foram alterados nesta entrega.

## Recursos
- Feed paginado, pesquisa, ordenação por Destaques/Recentes/Maior desconto e filtros rápidos por categorias recebidas da API.
- Cards com preço, desconto, loja e selo de cupom quando o código existe no retorno oficial.
- Favoritos com cópia local completa: continuam visíveis mesmo com falha na API.
- Detalhes com preço, loja, categoria, cupom copiável e link afiliado copiável.
- Abertura da loja com feedback de falha e validação de links HTTPS.
- Buscas salvas no aparelho, executadas quando o usuário toca nelas.
- Preferências com exclusão confirmada de favoritos e buscas.
- Tela de privacidade e informações sobre armazenamento e afiliados.
- Estados de carregamento, vazio, falha e repetição da página após erro.
- Paginação sem cliques concorrentes, sem duplicar IDs e sem sobrescrever uma busca mais recente com uma resposta antiga.

## Integração e pendências reais
O cliente consulta exclusivamente `https://radar-promo-ofertas.hatchable.site/api/offers`.
O proxy consulta o feed do Radar Promo Brasil; a credencial pertence somente aos servidores.
**Nunca coloque credenciais no APK, no código Flutter ou em `--dart-define`.**

Estado verificado em 24/11/2026:
- Radar Promo Brasil: versão 674; endpoint protegido `api/public/offers-feed.js`.
- Radar Promo Ofertas: versão 3; endpoint público declarado `/api/offers`, que consulta o feed principal por `lib/radar-feed.js`.
- Contrato do feed: `{source, generatedAt, page, limit, total, hasMore, offers}`. Os parâmetros de ordenação suportados pelo servidor são `recent`, `discount` e `score`.
- O proxy valida o host e o caminho do Radar, usa `RADAR_API_TOKEN` somente no servidor e remove a chave interna de armazenamento de imagens da resposta.
- O APK não contém token nem envia cabeçalho `Authorization`; os links `affiliateUrl` são preservados e só são abertos quando HTTPS válido.
- A execução diagnóstica de `/api/offers` em 24/11 retornou `429 usage_limit` da plataforma antes de validar o handler. O GET público com retorno 200 continua pendente; portanto o APK foi compilado e testado, mas ainda não foi homologado com ofertas reais em aparelho.

A visibilidade atual do projeto Radar Promo Ofertas é `personal` no cadastro da plataforma. O proprietário precisa confirmar/alterar a visibilidade nas configurações e regularizar o limite de execução. Nenhuma visibilidade foi alterada e nenhum plano foi contratado nesta tarefa. O status das duas credenciais servidor-a-servidor não foi exposto nem copiado para o APK.

Login nativo e sincronização de favoritos ainda não estão conectados no Flutter. Comentários e votos abrem a página segura do serviço; não são apresentados como recursos nativos. As buscas salvas são atalhos locais executados quando o usuário toca nelas, não monitoramento em segundo plano. Não há contadores fictícios, usuários simulados ou notificações fingidas.

## Compilar
Ferramentas desta entrega: Flutter 3.50.0 / Dart 3.14.0, Java 21, Android SDK 36, NDK 28.2.13676358. Android mínimo: API 24 (Android 7).

```bash
flutter pub get --enforce-lockfile
flutter analyze
flutter test
flutter build apk --release
```

O projeto nativo Android já está incluído. Não é necessário recriá-lo.
O workflow `.github/workflows/radar-ofertas-android-ci.yml` executa `flutter analyze`, `flutter test` e `flutter build apk --debug`, anexando o APK, SHA-256 e commit de origem. **Validação concluída em 24/11/2026:** run 29 aprovado nos três passos e artefato GitHub Actions `14968610754` gerado. O APK debug universal tem 154.696.848 bytes e SHA-256 `7c6de14bde43942e97dd8d40ad841248f24cbafd872189cdbe24f895c035c5b1`.

## Assinatura e instalação
A configuração de release usa a chave de teste local gerada pelo Android. O APK serve para instalação direta e avaliação. Uma publicação na Play Store requer chave de produção e configuração própria de assinatura.

No Android, abra o APK e autorize a instalação por esse aplicativo quando solicitado pelo sistema. Os links de afiliados abrem no navegador ou aplicativo da loja. Em versões futuras, atualizar sem reinstalação exige preservar a mesma chave de assinatura.

Favoritos e buscas não têm sincronização. Desinstalar o aplicativo apaga esses dados.

## Origem do código
A implementação continua o projeto Flutter fornecido. O código descompilado do Pelando não foi incorporado. A marca, o ícone e a interface do Radar são independentes.
