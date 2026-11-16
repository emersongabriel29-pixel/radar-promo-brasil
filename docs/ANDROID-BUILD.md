# Compilação Android — Radar Promo Ofertas

Estado em 16/11/2026: workflow preparado; fonte Flutter ainda não importado; nenhum APK novo compilado.

## Escopo e fonte de verdade

Repositório: emersongabriel29-pixel/radar-promo-brasil. Alteração isolada na branch android/github-actions-build, a partir de a6ec44374fcf0915cb37940679af79c9cef6bfd8. O aplicativo Android ficará em mobile/radar_promo_ofertas. A fonte a recuperar é o projeto existente radar-promo-ofertas-android-flutter-18.zip; esta alteração não recria nem substitui esse projeto.

O Radar Promo Brasil v671 e o backend independente Radar Promo Ofertas v1 foram identificados nesta sessão. Não há deploy, alteração de API, banco, credenciais, filas ou scheduler nesta tarefa. GitHub e Hatchable não são declarados sincronizados: este workflow é exclusivo do GitHub e a documentação desta branch ainda não foi espelhada no Hatchable.

## Uso

1. Recuperar e revisar o ZIP Flutter existente, sem incluir código ou identidade proprietária do Pelando.
2. Importar a raiz Flutter com pubspec.yaml e android/ em mobile/radar_promo_ofertas. Revisar segredos, credenciais, configurações e arquivos pessoais antes de qualquer commit: o repositório é público.
3. Confirmar a versão Flutter compatível e fixá-la no workflow após ler o pubspec e eventual configuração FVM. Até essa confirmação, o workflow usa o canal stable e registra a versão efetiva; builds ainda não são reprodutíveis por versão de SDK.
4. Um push com mudanças no diretório mobile inicia o workflow nas branches main ou android/**. Pull requests que alteram esse diretório também o executam. A execução manual fica disponível após o workflow existir na branch padrão.
5. Abrir Actions, selecionar a execução e baixar o artefato Radar-Promo-Ofertas-Android. Ele contém APK debug instalável, ZIP do fonte versionado e SHA256SUMS.txt. Retenção: sete dias.

O workflow falha explicitamente se a fonte Flutter ou o projeto Android estiverem ausentes. Ele não gera aplicativo vazio para passar a compilação. Análise estática bloqueia o build em caso de erro; os testes existentes são executados. Ausência de testes gera aviso e não equivale a homologação.

## Assinatura e validação

Esta primeira configuração produz um APK de teste com assinatura debug. A chave pode mudar entre execuções; atualizações sobre instalações anteriores podem exigir reinstalação e perda de dados locais. Uma versão de distribuição exige chave persistente protegida e fluxo de assinatura próprio. Nenhum segredo de assinatura foi criado.

A compilação não chama as APIs do Radar, não cria ofertas fictícias, não valida login, feed, favoritos, comentários, votos, cupons ou notificações e não publica na Play Store. Essas funções precisam ser verificadas no código existente e testadas separadamente.

## Evidências e pendências

- Inventário recursivo de main: sem pubspec.yaml, projeto Android ou ZIP Flutter.
- Fonte ZIP identificada, porém transferência e extração bloqueadas: ambiente de execução local indisponível.
- Execução de funções Hatchable retornou 429 usage_limit nesta sessão; integração não homologada.
- Revisão do workflow baseada nas documentações oficiais de subosito/flutter-action e actions/upload-artifact.
- Workflow não executado com fonte; flutter analyze, flutter test e build não executados.
- O CI web existente não foi modificado. Nenhuma equivalência GitHub/Hatchable foi presumida.

Rollback: remover o workflow e esta documentação da branch ou reverter o commit. Não há migração nem modificação de dados.
