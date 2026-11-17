# Recuperação do fonte Flutter — 16/11/2026

O ZIP radar-promo-ofertas-android-flutter-18.zip foi recuperado e extraído após o ambiente executor voltar a funcionar. O projeto existente foi preservado em mobile/radar_promo_ofertas.

Inventário do ZIP: 37 arquivos, incluindo projeto Android nativo, código Dart, pubspec.lock e dois arquivos de testes. Verificação automática de padrões comuns de segredo não encontrou ocorrências; nenhum arquivo de chave privada ou keystore foi incluído. Isso não substitui revisão completa de segurança.

O workflow antigo do ZIP foi conservado como texto em docs/reference/android-original-workflow.yml.txt. Ele não é um workflow ativo. O workflow ativo na raiz do repositório realiza somente análise e testes, com Flutter 3.50.0, Java 21 e dependências do lockfile. Nenhum comando de build de APK foi habilitado.

Os arquivos validation/ e o conteúdo original do README registram uma entrega histórica de 15/11/2026. Não são evidência dos testes desta recuperação. Os resultados atuais devem ser consultados no GitHub Actions.

O cliente já consulta o backend independente e possui feed, busca, filtros, favoritos locais, detalhes e cupons. Não se presume que recursos locais passaram a sincronizar automaticamente: login nativo, votos, comentários e notificações ainda exigem conexão do cliente às novas rotas e testes ponta a ponta. Nenhuma oferta fictícia foi criada e nenhum código ou identidade do Pelando foi incorporado nesta recuperação.

Estado da hospedagem após autorização: Radar Promo Brasil v672 e Radar Promo Ofertas v2. O backend independente ainda possui visibilidade personal; a execução de APIs continua retornando 429 por quota. O banco ativo não foi trocado. A cópia de catálogo para o Supabase está em andamento e será reconciliada antes de ser declarada concluída.
