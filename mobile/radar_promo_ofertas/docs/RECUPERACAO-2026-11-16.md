# Recuperação do fonte Flutter — 16/11/2026

O ZIP radar-promo-ofertas-android-flutter-18.zip foi recuperado e extraído após o ambiente executor voltar a funcionar. O projeto existente foi preservado em mobile/radar_promo_ofertas.

Inventário do ZIP: 37 arquivos, incluindo projeto Android nativo, código Dart, pubspec.lock e dois arquivos de testes. Verificação automática de padrões comuns de segredo não encontrou ocorrências; nenhum arquivo de chave privada ou keystore foi incluído. Isso não substitui revisão completa de segurança.

O workflow antigo do ZIP foi conservado como texto em docs/reference/android-original-workflow.yml.txt. Ele não é um workflow ativo. O workflow ativo na raiz do repositório realiza somente análise e testes, com Flutter 3.50.0, Java 21 e dependências do lockfile. Nenhum comando de build de APK foi habilitado.

Os arquivos validation/ e o conteúdo original do README registram uma entrega histórica de 15/11/2026. Não são evidência dos testes desta recuperação. Os resultados atuais devem ser consultados no GitHub Actions.

O cliente já consulta o backend independente e possui feed, busca, filtros, favoritos locais, detalhes e cupons. Não se presume que recursos locais passaram a sincronizar automaticamente: login nativo, votos, comentários e notificações ainda exigem conexão do cliente às novas rotas e testes ponta a ponta. Nenhuma oferta fictícia foi criada e nenhum código ou identidade do Pelando foi incorporado nesta recuperação.

Estado da hospedagem após autorização: Radar Promo Brasil v672 e Radar Promo Ofertas v2. O backend independente ainda possui visibilidade personal; a execução de APIs continua retornando 429 por quota. O banco ativo não foi trocado. A cópia de catálogo para o Supabase está em andamento e será reconciliada antes de ser declarada concluída.


---

## Resultado após autorização — 16/11/2026

Publicações autorizadas concluídas: Radar Promo Brasil **v672** e Radar Promo Ofertas **v2**, ambas live. As cinco tabelas próprias do backend independente foram confirmadas no schema após a publicação.

A cópia do catálogo para o Supabase foi concluída e reconciliada. Corte da leitura: 2026-11-17 01:07:00.968172+00 (UTC). As contagens e as assinaturas MD5 agregadas por registro/ID coincidem nos dois bancos para todas as colunas transferidas:

| Tabela | Origem no corte | Destino | Conteúdo comparado |
|---|---:|---:|---|
| accounts | 2 | 2 | Igual |
| categories | 22 | 22 | Igual |
| coupons | 1 | 1 | Igual |
| offers | 10.360 | 10.360 | Igual |

Foram confirmados 55 lotes: três para as tabelas-base e 52 para ofertas, com até 200 registros por lote. Zero conflitos de inserção. Nenhuma linha original foi atualizada ou apagada. Não houve troca do banco ativo. Objetos de imagem permanecem no armazenamento original; suas referências foram preservadas.

O ambiente executor voltou a funcionar. O ZIP Flutter existente foi recuperado, revisado e extraído: 37 arquivos. O código foi incorporado em mobile/radar_promo_ofertas. O workflow de APK encontrado no ZIP foi arquivado como texto; apenas análise e testes estão habilitados. A análise Flutter terminou sem problemas e os testes existentes passaram no [CI Flutter 43994639891](https://github.com/emersongabriel29-pixel/radar-promo-brasil/actions/runs/43994639891), sobre o commit de recuperação f58a4ceec436a07a1564044f07d18246f9b42d09. O workflow não executa build de APK.

Permanecem limites externos: APIs Hatchable ainda retornam 429 usage_limit; o backend independente continua com visibilidade personal e exige alteração pelo titular para acesso externo. Os avisos de deploy sobre ausência de import direto de db/auth são estáticos: o acesso ao banco ocorre por lib/api.js e a identidade por access='user'/req.user; login chama o cliente de autenticação injetado. A execução real de login e das rotas continua não homologada por causa da quota e da visibilidade.

O login nativo Flutter, a sincronização de favoritos, votos, comentários e notificações ainda precisam ser conectados às rotas novas e testados. Não se declara o aplicativo finalizado e nenhum APK foi gerado.
