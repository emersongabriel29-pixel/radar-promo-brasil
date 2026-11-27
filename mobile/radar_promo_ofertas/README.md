> Fonte recuperado em 16/11/2026. Consulte [RECUPERACAO-2026-11-16.md](docs/RECUPERACAO-2026-11-16.md) e [PELANDO-INSPIRED-UI-2026-11-24.md](docs/PELANDO-INSPIRED-UI-2026-11-24.md) para o histórico e a adaptação visual. A validação sem APK está em `.github/workflows/build-radar-ofertas-apk.yml`; consulte também [a auditoria de 26/11/2026](../../docs/ANDROID-AUDIT-2026-11-26.md).

# Radar Promo Ofertas — Android 0.3.2+5 (fonte, não release publicada)

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
O cliente consulta a Edge Function existente `https://runnmpzkomcdawwzuift.supabase.co/functions/v1/radar-offers-feed`.
O endpoint anterior do Hatchable foi preservado no servidor, mas sua cota impede o uso atual. Credenciais continuam somente no servidor.
**Nunca coloque credenciais no APK, no código Flutter ou em `--dart-define`.**

Estado histórico verificado em 24/11/2026 (estado atual na auditoria de 26/11):
- Radar Promo Brasil: versão 674; endpoint protegido `api/public/offers-feed.js`.
- Radar Promo Ofertas: versão 3; endpoint público declarado `/api/offers`, que consulta o feed principal por `lib/radar-feed.js`.
- Contrato do feed: `{source, generatedAt, page, limit, total, hasMore, offers}`. Os parâmetros de ordenação suportados pelo servidor são `recent`, `discount` e `score`.
- O proxy valida o host e o caminho do Radar, usa `RADAR_API_TOKEN` somente no servidor e remove a chave interna de armazenamento de imagens da resposta.
- O APK não contém token nem envia cabeçalho `Authorization`; os links `affiliateUrl` são preservados e só são abertos quando HTTPS válido.
- A execução diagnóstica de `/api/offers` em 24/11 retornou `429 usage_limit` da plataforma antes de ser possível validar a resposta do handler. O GET público com retorno 200 continua pendente.

A visibilidade atual do projeto Radar Promo Ofertas é `personal` no cadastro da plataforma. O proprietário precisa confirmar/alterar a visibilidade nas configurações e regularizar o limite de execução. Nenhuma visibilidade foi alterada e nenhum plano foi contratado nesta tarefa. O status das duas credenciais servidor-a-servidor não foi exposto nem copiado para o APK.

Login nativo e sincronização de favoritos ainda não estão conectados no Flutter. Comentários e votos abrem a página segura do serviço; não são apresentados como recursos nativos. As buscas salvas são atalhos locais executados quando o usuário toca nelas, não monitoramento em segundo plano. Não há contadores fictícios, usuários simulados ou notificações fingidas.

## Validação atual — 26/11/2026

O feed Supabase respondeu HTTP 200 com catálogo vazio; há zero registros de histórico oficial de preços. Não reapresentar preços antigos como ofertas atuais. Análise e testes rodam sem compilar APK. A configuração release exige a chave existente e valida seu certificado; não há fallback para debug. Produção continua bloqueada até provisionamento seguro e validação final. A impressão digital pública do certificado anterior foi recuperada em `android/signing-certificate.sha256`, sem chave privada. O fonte agora usa 0.3.2+5, superior ao APK histórico 0.3.1+4. O pacote e as chaves de dados locais foram preservados. Isso não comprova instalação/atualização em aparelho.

## Compilar
Ferramentas desta entrega: Flutter 3.50.0 / Dart 3.14.0, Java 21, Android SDK 36, NDK 28.2.13676358. Android mínimo: API 24 (Android 7).

```bash
flutter pub get --enforce-lockfile
flutter analyze
flutter test
flutter build apk --release
```

O projeto nativo Android já está incluído. Não é necessário recriá-lo.
O workflow `.github/workflows/build-radar-ofertas-apk.yml` executa análise, testes, compilação de recursos e configuração Gradle sem APK. APK e AAB release ficam condicionados às duas opções manuais `generate_apk` e `audits_validated`, ambas false por padrão. Não acionar durante as auditorias.

## Assinatura e instalação
O release usa exclusivamente a chave existente via `android/key.properties` privado (storeFile/storePassword/keyAlias/keyPassword) ou variáveis RADAR_RELEASE_STORE_FILE, RADAR_RELEASE_STORE_PASSWORD, RADAR_RELEASE_KEY_ALIAS e RADAR_RELEASE_KEY_PASSWORD. O caminho relativo é resolvido a partir de android/. O certificado deve corresponder exatamente a android/signing-certificate.sha256; chave ausente, inacessível ou divergente bloqueia todas as tarefas release. Nenhuma chave nova é criada.

No workflow manual final, os secrets esperados são RADAR_ANDROID_KEYSTORE_BASE64, RADAR_RELEASE_STORE_PASSWORD, RADAR_RELEASE_KEY_ALIAS e RADAR_RELEASE_KEY_PASSWORD. Não coloque valores em arquivos versionados ou logs. Esses secrets não foram criados/alterados nesta tarefa. O comando `cd android && bash ./gradlew :app:validateRadarReleaseSigning` verifica a configuração sem gerar APK/AAB.

No Android, abra o APK e autorize a instalação por esse aplicativo quando solicitado pelo sistema. Os links de afiliados abrem no navegador ou aplicativo da loja. Em versões futuras, atualizar sem reinstalação exige preservar a mesma chave de assinatura.

Favoritos e buscas não têm sincronização. Desinstalar o aplicativo apaga esses dados.

## Origem do código
A implementação continua o projeto Flutter fornecido. O código descompilado do Pelando não foi incorporado. A marca, o ícone e a interface do Radar são independentes.
