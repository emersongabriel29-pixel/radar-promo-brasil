> Fonte recuperado em 16/11/2026. Consulte [RECUPERACAO-2026-11-16.md](docs/RECUPERACAO-2026-11-16.md) para o estado atual. As instruções de compilação e os resultados abaixo são históricos; a geração de APK continua desativada.

# Radar Promo Ofertas — Android 0.2.0

Cliente Flutter independente. O Radar Promo Brasil e seus dados não foram alterados nesta entrega.

## Recursos
- Feed paginado, pesquisa, ordenação e filtro de categoria com opção de limpar.
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

Validação em 15/11/2026:
- Radar Promo Brasil: projeto existente, versão 671, feed `api/public/offers-feed.js`.
- Radar Promo Ofertas: projeto existente, versão 1, proxy `api/offers.js`.
- Contrato inspecionado: `{source, generatedAt, page, limit, total, hasMore, offers}`.
- Preços podem ser números ou strings decimais; o cliente aceita ambos.
- Execução pela plataforma: `429 usage_limit` por limite mensal de banco atingido.
- Consulta anônima ao endereço real: resposta `login_required`, antes do proxy.

Para o feed funcionar no APK, o proprietário precisa liberar o acesso público do **Radar Promo Ofertas** nas configurações da hospedagem e regularizar o limite de execução. Esta entrega não altera a visibilidade de nenhum projeto nem contrata planos.
Depois disso, validar um GET anônimo no proxy com retorno 200 e JSON de ofertas. A igualdade entre `RADAR_API_TOKEN` (Ofertas) e `RADAR_OFFERS_FEED_TOKEN` (Brasil) ainda depende de um teste entre servidores bem-sucedido; os valores não foram lidos ou exportados.

Login de usuários, sincronização de conta, comentários, votos e alertas push permanecem pendentes de backend. Não há contadores fictícios, usuários simulados ou notificações fingidas. As buscas salvas são atalhos manuais e não fazem monitoramento em segundo plano.

## Compilar
Ferramentas desta entrega: Flutter 3.50.0 / Dart 3.14.0, Java 21, Android SDK 36, NDK 28.2.13676358. Android mínimo: API 24 (Android 7).

```bash
flutter pub get --enforce-lockfile
flutter analyze
flutter test
flutter build apk --release
```

O projeto nativo Android já está incluído. Não é necessário recriá-lo.
O workflow `.github/workflows/android.yml` repete análise, testes e compilação e publica o APK como artefato da execução. Nenhum workflow foi disparado externamente nesta entrega.

## Assinatura e instalação
A configuração de release usa a chave de teste local gerada pelo Android. O APK serve para instalação direta e avaliação. Uma publicação na Play Store requer chave de produção e configuração própria de assinatura.

No Android, abra o APK e autorize a instalação por esse aplicativo quando solicitado pelo sistema. Os links de afiliados abrem no navegador ou aplicativo da loja. Em versões futuras, atualizar sem reinstalação exige preservar a mesma chave de assinatura.

Favoritos e buscas não têm sincronização. Desinstalar o aplicativo apaga esses dados.

## Origem do código
A implementação continua o projeto Flutter fornecido. O código descompilado do Pelando não foi incorporado. A marca, o ícone e a interface do Radar são independentes.
