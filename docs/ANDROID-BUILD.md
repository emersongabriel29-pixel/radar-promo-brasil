# Desenvolvimento Android — Radar Promo Ofertas

Estado em 16/11/2026: validação Flutter configurada em branch; fonte pendente de importação; nenhum teste Flutter executado e nenhum APK novo gerado.

## Escopo e fonte de verdade

Branch android/github-actions-build do repositório emersongabriel29-pixel/radar-promo-brasil. Base original a6ec44374fcf0915cb37940679af79c9cef6bfd8. O projeto existente radar-promo-ofertas-android-flutter-18.zip deve ser recuperado e revisado antes da importação em mobile/radar_promo_ofertas.

O fluxo foi ajustado à decisão do usuário: desenvolver e validar primeiro; gerar APK somente quando o aplicativo estiver pronto. Foram removidas as etapas de compilação de APK, empacotamento e upload de artefatos. Nenhum push ou execução manual deste workflow gera APK.

## Validação no GitHub Actions

1. Importar o fonte Flutter existente em mobile/radar_promo_ofertas, incluindo pubspec.yaml, android/ e testes.
2. Antes de publicar arquivos, revisar credenciais, dados pessoais e material proprietário: o repositório é público.
3. Confirmar e fixar a versão Flutter compatível com o projeto. O workflow ainda usa stable, com registro da versão efetiva; a escolha não está homologada.
4. Pushes nas branches main e android/** e pull requests com alterações no diretório mobile executam o workflow. Execução manual fica disponível quando o workflow existir na branch padrão.
5. O workflow verifica a presença do projeto, instala Java 17 e Flutter, resolve dependências, executa flutter analyze e flutter test. Falta de fonte ou de testes encerra a validação com erro.
6. Ler os resultados em Actions. Sucesso da análise e dos testes não comprova integração nem funcionamento em aparelho.

## Próximas etapas do produto

Revisar no fonte existente feed automático, busca, categorias, favoritos, detalhes, cupons, votos, comentários e notificações. Desenvolver com identidade própria e sem ofertas fictícias. A referência Pelando serve aos fluxos funcionais; seu código e identidade não devem ser incorporados.

Conectar posteriormente ao backend independente Radar Promo Ofertas, preservando o Radar Promo Brasil. Só restaurar um fluxo de geração do APK após prontidão funcional confirmada, com definição de assinatura e teste em aparelho.

## Evidências, limites e preservação

O inventário atualizado da branch nesta tarefa não contém projeto mobile nem pubspec.yaml. A extração do ZIP está bloqueada por indisponibilidade do ambiente local, confirmada novamente nesta retomada. GitHub Actions executa arquivos do repositório; não acessa diretamente anexos privados desta conversa.

A tarefa alterou apenas o workflow Android e documentação. O CI web e o sistema Radar original foram preservados. Radar Promo Brasil v671 e backend independente v1 são as versões identificadas anteriormente nesta sessão; não houve deploy nesta tarefa. A integração real continua não homologada; tentativas anteriores retornaram 429 usage_limit no Hatchable.

Fonte de verdade desta mudança: branch GitHub. Não há declaração de sincronização com Hatchable, e a documentação desta branch não foi espelhada lá. Nenhum teste ou compilação Flutter foi executado nesta tarefa. A verificação disponível é a revisão dos arquivos e do diff no GitHub.

Rollback: reverter o commit desta alteração. Não há alteração de banco, segredo ou deploy.
