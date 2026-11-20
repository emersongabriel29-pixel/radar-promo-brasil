# Desenvolvimento Android — Radar Promo Ofertas

## Atualização — 20/11/2026: Ofertas v3 publicado

A publicação específica foi autorizada pelo proprietário e concluída. Radar Promo Ofertas v3 live, manifesto de código equivalente ao GitHub; Radar original v672 preservado. Testes de API pós-deploy retornaram 429; visibilidade personal e push seguem pendentes. Nenhum APK. Consulte [resultado e evidências](./DEPLOY-OFERTAS-V3-2026-11-20.md). Os registros abaixo descrevem as etapas anteriores.

Estado em 16/11/2026: fonte Flutter recuperado e versionado em mobile/radar_promo_ofertas; análise e testes aprovados. Nenhum APK novo foi gerado.

## Fonte e versões

O projeto existente foi recuperado do ZIP radar-promo-ofertas-android-flutter-18.zip, sem substituição por scaffold vazio. O arquivo contém 37 arquivos. O workflow original de geração de APK foi arquivado como texto; ele não é executável pelo GitHub Actions.

A recuperação está no commit f58a4ceec436a07a1564044f07d18246f9b42d09 da branch android/github-actions-build. Wrapper Gradle conferido por hash. Código próprio do Radar preservado; nenhum código do Pelando foi incorporado.

## Validação da recuperação

Workflow ativo: .github/workflows/radar-android.yml. Flutter 3.50.0, Dart 3.14.0, Java 21 e flutter pub get --enforce-lockfile. Executa análise e testes em pushes/pull requests que alterem o diretório mobile.

[Execução Flutter 43994639891](https://github.com/emersongabriel29-pixel/radar-promo-brasil/actions/runs/43994639891): resoluções do lockfile, flutter analyze e flutter test concluídos com sucesso. A análise informou No issues found. Não há etapa de build de APK ou de publicação de aplicativo.

[CI web 43994639761](https://github.com/emersongabriel29-pixel/radar-promo-brasil/actions/runs/43994639761): aprovado. Essa suíte é separada da validação Flutter.

## Integração e estado do produto

O cliente consulta o backend independente. O código recuperado possui feed, busca, categorias/filtros, detalhes, cupons e favoritos locais. Conta, votos, comentários e caixa de entrada foram conectados por páginas próprias abertas em Android Custom Tabs, sem transferir sessão para Dart. Não são telas inteiramente nativas. Código b4991b7 aprovado em análise e 10 testes Flutter; backend aprovado em 258 testes unitários e 6 de navegador. O novo deploy foi recusado pela revisão automática de aprovação; permanece preparado no WIP, aguardando autorização específica. Push e homologação real continuam pendentes. Consulte COMUNIDADE-ANDROID-2026-11-17.md.

Radar original v672 e backend independente v2 foram publicados com autorização. As quatro tabelas do catálogo no Supabase foram copiadas e reconciliadas por contagem e assinaturas, sem alteração da origem e sem cutover. O backend independente possui cinco tabelas próprias.

O acesso real continua bloqueado por quota de execução do Hatchable e por visibilidade personal no backend independente. A mudança de visibilidade é uma ação do titular no console. Não houve contratação de plano. Push e testes em aparelho ainda pendentes.

Consulte [resultado da remediação](./REMEDIACAO-ANDROID-2026-11-16.md) e [fonte recuperado](../mobile/radar_promo_ofertas/docs/RECUPERACAO-2026-11-16.md).

## Entrega e rollback

A geração do APK permanece desativada até prontidão confirmada. A PR 202 continua sem merge automático. Para reverter código, reverter os commits da branch; para hospedagem, usar a versão anterior apropriada, preservando dados das tabelas novas. Não apagar o catálogo original ou truncar o destino.

## APK solicitado — 20/11/2026

O proprietário solicitou expressamente o APK nesta conversa, substituindo o adiamento anterior para esta entrega de teste. Novo workflow radar-apk-requested.yml compila o código existente em modo release para ARM64, versão 0.3.0+3 por flags, com a assinatura de desenvolvimento já prevista no Gradle. Não altera credenciais nem habilita publicação em loja. Dispara somente manualmente ou quando o próprio workflow é alterado na branch Android; o workflow regular continua de análise/testes.

Inclui flutter pub get --enforce-lockfile, análise, testes, compilação, apksigner verify, badging de pacote/versão/atividade inicial/ABI e SHA-256. O artefato será entregue após consulta ao resultado real; estar instalável não significa homologação das integrações. Ofertas v3 e Radar original v672 preservados. Quota 429, visibilidade personal, push e teste físico continuam pendentes. Resultado do build e arquivo serão registrados ao término.
