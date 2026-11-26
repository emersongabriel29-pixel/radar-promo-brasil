# Radar Promo Ofertas — auditoria de 26/11/2026

Registro de execução em andamento. Não é declaração de homologação ou release.

## Inventário e preservação

- Repositório: emersongabriel29-pixel/radar-promo-brasil; PR #221 aberto.
- Main inicial: `1adc8791bd488c4f20a561ee9f10a852b6b257f3`.
- Branch de trabalho: `fix/android-consolidation-20261126`; inicial `11bf2ab77cb1121e90045f7ec4e7d182fc63eca5`.
- Ponto de restauração: commit inicial preservado no histórico; tag local `audit-start-20261126-11bf2ab`.
- Hatchable principal: `proj_1Xj94QxQmCam`, v674. Auxiliar: `proj_rPigttuZOrM7`, v3.
- Fonte de verdade Flutter: branch de consolidação, com comparação das branches Android antes de incorporar alterações. Não há fonte Flutter entre os arquivos listados no Hatchable auxiliar.
- Comparação das branches `codex/android-pelando-inspired-ui-20261124`, `codex/android-supabase-feed-20261124` e `feature/ofertas-price-watch-ui-204`: melhoria de endpoint Supabase ausente na consolidação; tokens de marca e ícone novos preservados. Nenhum merge global de backend.
- App: HomeScreen, OfferCard, OfferDetailScreen, SavedSearchesScreen, PreferencesScreen, PrivacyScreen, StoresCouponsScreen, InstalledAppVersion. Serviços: feed HTTP, favoritos/cache em SharedPreferences, comunidade externa, tema, buscas/preços e notificações Android locais.
- Rotas de conta, votos, comentários, denúncias, submissões e moderação permanecem hospedadas no projeto auxiliar. Não são autenticação nativa Flutter nem push em segundo plano.
- Dependências Flutter: http, shared_preferences, url_launcher, intl; sem adição nesta etapa.
- Supabase: projeto `runnmpzkomcdawwzuift`, ACTIVE_HEALTHY; 68 tabelas public, 11 radar_community e quatro private, todas com RLS habilitado. Advisor apresenta 83 avisos informativos de RLS sem policies; isso bloqueia acesso direto por papéis comuns e exige revisão das bridges, não abertura de policies indiscriminada.
- Contagens read-only: 10.360 offers, 22 categories, zero offer_price_history, dois operational_backups. Existência de registros de backup não comprova restauração nem backup gerenciado.
- Edge Functions ativas: radar-offers-feed v2, radar-db-bridge v2, radar-community-db-bridge v12. Fonte da função de feed inspecionada; usa conexão de servidor e parâmetros, sem credenciais no cliente.
- Identificador atual: `br.com.radarpromo.radar_promo_ofertas`; pubspec 0.2.0+2; minSdk 24. Gradle release usa chave debug: bloqueio de release definitivo. Não foram alterados identificador, versão ou assinatura.

## Evidências iniciais

- GitHub Actions do commit inicial: runs 45906064807 e 45906064725 concluídos com success (consulta do conector). Não equivalem a teste em aparelho.
- Teste real público Hatchable `/api/offers`: HTTP 429, código usage_limit, cota mensal de banco excedida.
- Teste HTTP real Supabase `/functions/v1/radar-offers-feed?limit=1`: HTTP 200, total 0, offers [], hasMore false. A função exige histórico oficial recente; nenhum histórico existe no espelho consultado. Não inventar ofertas nem enfraquecer a validação de atualidade.
- SDK Flutter 3.50.0 recuperado para scratch. Inicialização local bloqueada por revisão automática por tentativa de acesso a metadados da infraestrutura. Não houve bypass. Testes locais não podem ser marcados aprovados; validação seguirá no CI.

## Análise de impacto e correções

### Recuperação do endpoint e proteção contra APK intermediário

O endpoint do proxy bloqueado foi reintroduzido na consolidação, desfazendo melhoria de outra branch. Recuperar apenas a URL pública Supabase já existente é menos invasivo que alterar backend, dados ou credenciais. Mesmo contrato offers/total/hasMore e parâmetros page/q/category/sort; links de afiliado permanecem intocados. Teste de contrato verifica host e caminho, além de ausência de Authorization no cliente.

O workflow legado radar-ofertas-validation ainda compilava/uploadava debug APK automaticamente. Foram retiradas somente essas etapas; análise e testes preservados. Workflow principal permanece com geração manual desativada por padrão; não será acionado para gerar APK durante a auditoria.

### Temas e acessibilidade

Busca usava fundo branco com foreground escuro/claro herdado; passa a usar superfície do ColorScheme. Favoritos tinham constraints vazias/densidade compacta e cor fixa azul escura: passam a 48 dp, nome acessível e cor semântica. Desconto em detalhes tinha fundo claro e texto herdado do tema escuro: foreground explícito verde escuro. Preço antigo passa a onSurfaceVariant. Tipografia de título/cupom ampliada. Sem alteração em preferências, dados, rotas ou contratos de backend.

## Estado e rollback

### Imagens, preços, detalhes e interações

`offer_image.dart` centraliza decodificação limitada (até 1200px de largura), proporção contain, estados de carregamento/ausência/falha e semântica; URLs sem HTTPS ou com credenciais são recusadas pelo componente sem substituir o produto. `Offer` mantém o desconto bruto recebido, mas calcula desconto/economia exibidos a partir de dois preços positivos coerentes. Nenhuma gravação de preços ou links no servidor.

O CTA existente foi movido para bottomNavigationBar com SafeArea, fora do conteúdo rolável, preservando destino HTTPS e parâmetros. Estado de abertura evita toques concorrentes; erro libera nova tentativa. Faixa de categorias ampliada para acomodar toque. Testes novos em `audit_visual_safety_test.dart` cobrem os dois temas, área de toque, fallback de imagem, cálculo matemático, persistência de rastreamento e acesso ao CTA sem scroll. Aguardam CI; não são evidência de teste em aparelho.

Publicação via git push local indisponível por ausência de credencial no shell. Será usado o conector GitHub, com tree baseada no commit remoto existente, atualização sem force e verificação de expected SHA.

Sem deploy Hatchable, migração, alteração de segredo, publicação de ofertas ou mensagens. Nenhum APK gerado nesta execução. Equivalência global GitHub/Hatchable não comprovada. Rollback por revert dos commits desta execução, preservando o histórico; não usar reset destrutivo nem force push.

## Matriz consolidada das 25 auditorias

Nenhuma linha abaixo significa homologação em aparelho. Os testes de widgets usam fixtures locais identificadas, sem publicar ofertas ou comentários. A indisponibilidade do catálogo atual, assinatura e ambiente Android impede a conclusão integral solicitada.

Arquivos citados: `M` = mobile/radar_promo_ofertas/lib/main.dart; `O` = lib/models/offer.dart; `I` = lib/offer_image.dart; `A` = lib/services/api.dart; `C` = lib/screens/stores_coupons.dart; `P` = lib/screens/preferences.dart; todos os caminhos lib são relativos a mobile/radar_promo_ofertas. `V` = test/audit_visual_safety_test.dart; `R` = test/audit_regressions_test.dart; demais testes estão no mesmo diretório test.

| Nº / auditoria | Problema e causa observada | Correção / arquivos | Testes e evidências | Pendência | Status final |
|---|---|---|---|---|---|
| 01 Identidade visual | Marca já parcialmente centralizada; validação visual anterior incompleta | Preservados navy/radar/tokens anteriores em M; foregrounds semânticos ampliados | V nos dois temas; fonte de marca comparada com branches | Revisão visual completa em Android | Parcialmente concluída |
| 02 Logotipo, ícone e abertura | Launcher era drawable único; sem camadas adaptativas/monocromática; splash genérico | AndroidManifest.xml, drawable/radar_foreground.xml, radar_monochrome.xml, mipmap-anydpi-v26/v33, values-v31/night-v31, valores e launch backgrounds; smallIcon dedicado em MainActivity.kt | 12 XMLs parseados; fallback original preservado; código do símbolo reaproveitado | Compilar recursos na etapa final; máscaras, launcher e splash em versões Android reais | Implementada, aguardando validação |
| 03 Paleta de cores | Busca branca e foregrounds fixos conflitavam com tema escuro | Superfície de busca, textos secundários, CTA, favorito e desconto corrigidos em M; versão em screens/app_version.dart; tokens verde e laranja adicionados | V claro/escuro; análise estática CI | Varredura de contraste completa de todos os estados | Parcialmente concluída |
| 04 Tipografia | Título/cupom pequenos no card; fonte ampliada não coberta com oferta carregada | Título 14, cupom e demais textos do main no mínimo 12; toolbar adapta altura; fontes do usuário preservadas | V: card 320 dp/fonte 200%, dois temas, sem exceção | Tipografia de todas as telas, idiomas, densidades e aparelho | Parcialmente concluída |
| 05 Hierarquia visual | Economia pouco explícita e acesso à loja exigia rolagem longa | Economia calculada exibida, preço preservado e CTA fixo em M/O | V economia, rastreamento e CTA alcançável | Comparação visual por tela e condições comerciais reais | Parcialmente concluída |
| 06 Espaçamento e responsividade | Imagem de largura fixa e chips baixos; botão importante ao fim da lista | Imagem menor abaixo de 360 dp, faixa de categorias ampliada, CTA em SafeArea | V 320 dp/200%; R 360 dp/180%; home_test navegação | Paisagem, tablets, diferentes densidades e Android real | Parcialmente concluída |
| 07 Design system e componentes | Duas implementações de imagem com comportamento desigual | Componente I reutilizado por feed/detalhes; ThemeData/ColorScheme existentes preservados; sem refatoração global | V fallback e temas; CI analyze | TextTheme e tokens de espaçamento ainda não consolidados integralmente | Parcialmente concluída |
| 08 Inicial e feed | Consolidação havia perdido URL Supabase; proxy 429; sem catálogo atual | A recupera endpoint existente; deduplicação de requisições; paginação e cache existentes mantidos | HTTP 200 vazio real; offers_api_test; feed_widget_test; R | Retomar ingestão e histórico oficial; validar feed real com dados atuais | Parcialmente concluída |
| 09 Cards | Favorito reduzido, cupom pequeno e desconto recebido podia divergir dos preços | M/O: alvo 48 dp, nome acessível, cor semântica, economia e percentual coerentes; mantém campos opcionais sem inventar frete/votos | V alvo de toque, economia, fonte 200%; feed_widget_test favorito/cupom | Cards com imagens e metadados comerciais reais; validação visual | Parcialmente concluída |
| 10 Imagens | Tratamento duplicado; decodificação sem limite; fallback pouco explícito | I valida HTTPS, rejeita credenciais, limita decode, preserva proporção e explica loading/falha/ausência | V URL insegura não gera Image; inspeção da Edge Function remove caminhos não absolutos | Feed real está vazio; investigar URLs quebradas e rota de mídia com dados reais | Parcialmente concluída |
| 11 Preços, desconto e economia | Badge confiava no percentual recebido independentemente do par de preços | O calcula savingsAmount/savingsPercent sem modificar dados recebidos; M exibe cálculo; preços inválidos continuam indisponíveis | V preços válidos/inválidos e rastreamento; offer_model_test; R | Atualidade depende do histórico oficial ausente; não há homologação comercial | Parcialmente concluída |
| 12 Detalhes | CTA no fim do conteúdo; imagem duplicada; contraste do chip no escuro | M/I: CTA inferior seguro, preço/economia, chip legível e componente compartilhado; links/SubIDs preservados | V CTA sem scroll; home_test favorito; community_test contexto da oferta | Jornada real até loja e inspeção visual em aparelho | Parcialmente concluída |
| 13 Botões e interações | Favorito compacto e abertura da loja sem bloqueio concorrente | M: alvo 48 dp/tooltip; opening desabilita CTA até conclusão e libera após erro | V alvo/CTA; testes existentes de falha de navegador; inspeção do try/finally | Double tap da loja e abertura em apps Android reais | Parcialmente concluída |
| 14 Navegação | Cupons exigiam entrar em Sobre; reorganizar tabs poderia retirar Buscas | M: atalho Cupons e lojas no menu de conta, preservando os cinco tabs e todos os destinos anteriores | home_test navegação/privacidade; community_links_test destinos oficiais | Layout proposto Início/Categorias/Cupons/Favoritos/Perfil não aplicado por inteiro; deep links não homologados | Parcialmente concluída |
| 15 Busca | Consultas idênticas simultâneas desperdiçavam rede; risco de resposta antiga | A compartilha chamadas em voo por parâmetros; M já usa requestVersion, preservado; limpar com tooltip | offers_api_test coalescência; V resposta antiga não substitui busca recente; encoding café & leite | Busca por marca/categoria depende dos campos/contrato do servidor; validação com catálogo real | Parcialmente concluída |
| 16 Categorias, filtros e ordenação | Catálogo do cliente é derivado das páginas; API atual não entrega índice completo de categorias | Preservados nomes reais, filtros e sort recent/discount/score; não inventado filtro de preço ou catálogo completo | R nomes e filtro enviado à API; offers_api_test parâmetros | Catálogo completo e ordenação por preço exigem contrato backend adicional e validação | Parcialmente concluída |
| 17 Cupons | Acesso pouco evidente e cópia dependia dos detalhes | C/M: atalho e cópia direta; condições de validade continuam honestamente não confirmadas | feed_widget_test cupom; inspeção clipboard/código sem transformar link; fluxo de detalhes preservado | Datas/condições/expiração não fornecidas no contrato atual; catálogo real vazio | Parcialmente concluída |
| 18 Favoritos, buscas e alertas | Recursos locais poderiam ser confundidos com conta/push; assinatura antiga precisava preservação | Nenhuma chave SharedPreferences renomeada; código existente mantido; ícone de notificação monocromático próprio | home_test offline/favorito; price_alerts_test; price_alert_delivery_test; android_notification_channel_test | Push em segundo plano, sincronização nativa de conta, reinício/atualização em aparelho não validados | Parcialmente concluída |
| 19 Comunidade | Fluxo depende de páginas externas do Hatchable com cota esgotada | services/community.dart e permissões preservados; community_test rola até botão preguiçoso e mantém asserções | community_test e community_links_test aprovados com opener controlado; endpoints/páginas auxiliares inventariados | Votos/comentários/denúncias/moderação reais e antispam não homologados; sem publicações de teste | Bloqueada |
| 20 Login, cadastro e perfil | Sessão pertence ao navegador; serviço hospedado limitado por cota | Mantida autenticação existente e ausência de token no Flutter; sem sistema paralelo ou exclusão real | community_links_test HTTPS, host, IDs seguros e login com retorno same-origin | Login/cadastro/recuperação/logout/exclusão ponta a ponta e autorização real | Bloqueada |
| 21 Claro e escuro | Busca branca, chip com texto herdado, favorito azul escuro, versão com cor fixa | M/I/screens/app_version.dart passam a usar foregrounds/superfícies apropriados; preferência de tema intacta | V dois temas; theme_preference_test; cards 320 dp em ambos | Revisão de todas as telas/diálogos/estados em aparelho | Parcialmente concluída |
| 22 Animações e microinterações | Não há animações customizadas essenciais a substituir; risco de adicionar custo decorativo | Mantidas transições Material; CTA informa abertura; placeholder estático sem animação decorativa | Inspeção do código; testes de widgets sem carregamento infinito | Redução de movimento e fluidez precisam validação Android; sem métrica inventada | Parcialmente concluída |
| 23 Loading, erros e vazios | 429 permitia insistência imediata e consultas duplicadas; servidor podia retornar HTML | A mantém timeout/validação e implementa pausa Retry-After numérico/fallback; coalescência; mensagens existentes preservadas | offers_api_test HTML, 429, pausa, paginação vazia; feed_widget_test 503; R falha 429 | Retry-After em formato de data não interpretado (usa fallback); falhas reais com catálogo/cache e recuperação do serviço | Parcialmente concluída |
| 24 Acessibilidade | Alvo de favorito pequeno, nome ausente e contraste inadequado em estados escuros | M/I: 48 dp/tooltip/semântica de imagem, cores de foreground corrigidas; nenhum limite artificial ao textScaler | V: contraste, alvos e nomes acessíveis dos cards aprovados em ambos os temas; fontes 200%; R fonte 180% | TalkBack, ordem de foco, todos os critérios WCAG 2.2 AA aplicáveis e todos os alvos/contrastes não homologados | Parcialmente concluída |
| 25 Desempenho e experiência | Requests duplicados e imagens sem bound de decode | A/I reduzem chamadas simultâneas e limite de decodificação; SliverList e cache existente preservados; nenhuma dependência adicionada | 57 testes Flutter no CI; build/test/audit Node; inspeção da lista preguiçosa | Medir cold start, memória, bateria, jank, tamanho final, conversão e jornada em aparelho intermediário | Parcialmente concluída |

## Resultado técnico e critérios de entrega

- Commit inicial: `11bf2ab77cb1121e90045f7ec4e7d182fc63eca5`; base main `1adc8791bd488c4f20a561ee9f10a852b6b257f3`.
- Commits de implementação nesta execução: `be567435958012ef31de2013eaf7e7739f19977f`, `67ee10d37116512b7a64b1b261fbf6cb718b85da`, `2d160d963250867129b149a852d8b6e3ef988351`, `3d0a0b9cc6cbc5832d3a25a6f40f1297b7933b2d` e `c6a49f43c934aef280e0d69c97f4f70e264a1730`. O commit documental seguinte registra a consolidação; não altera o código homologado no CI.
- Última validação Flutter: commit de código `c6a49f43c934aef280e0d69c97f4f70e264a1730`, run [45909021383](https://github.com/emersongabriel29-pixel/radar-promo-brasil/actions/runs/45909021383), job 140212606267, **57 testes aprovados**, análise sem problemas. Run CI [45909021352](https://github.com/emersongabriel29-pixel/radar-promo-brasil/actions/runs/45909021352) também aprovado. Consulta de artifacts da execução Flutter retornou zero. Build e upload APK não executados.
- Primeiro teste falho de comunidade corrigido; nenhuma falha conhecida restante na suíte Flutter executada. Isso não comprova ausência de regressões em partes não testadas.
- Dependências, lockfile, identificador, assinatura, migrations, policies, tabelas e registros não alterados. Nenhum arquivo do app removido. Após incluir os arquivos recuperados no índice, comparação com todas as branches Android relevantes encontrou zero caminhos ausentes; isso comprova preservação estrutural, não equivalência comportamental integral de todas as versões.
- Contagens finais Supabase iguais às iniciais: offers 10.360, categories 22, price_history 0, backup_records 2. Não houve chamada de mutação ao banco. Não foi auditado o conteúdo completo dos registros nem testada restauração.
- Sem adb/emulator disponíveis no shell. Instalação, atualização, assinatura binária, permissões reais, TalkBack, screenshots Android e perfil de desempenho não executados. Golden tests não executados por ausência de baseline visual homologada.
- Segurança: links HTTPS e parâmetros preservados nos testes; nenhuma chave no cliente identificada na busca realizada; npm audit zero vulnerabilidades. Não declarar auditoria de segurança integral do backend/bridges; o advisor RLS não substitui testes de autorização.
- Integrações Shopee, Mercado Livre, AliExpress, Amazon, Magalu, Lomadee, Rakuten, WhatsApp e Telegram: não alteradas; fluxos reais não revalidados nesta tarefa. Nenhuma publicação/mensagem disparada.
- Hatchable continua v674/v3, sem deploy; nenhum backend substituído por conteúdo da branch Android. Documentação GitHub/Hatchable já divergia; espelhamento do relatório e adições pontuais aos índices não comprovam equivalência global.
- Decisões autônomas: recuperar URL pública já existente em vez de criar backend; manter tabs atuais para preservar Buscas; pausar chamadas após 429 sem retentativas automáticas; limitar decode de imagem sem nova dependência; recuperar apenas hash público de certificado.
- Riscos residuais: catálogo sem atualidade comprovada, serviços externos limitados por cota, assinatura release ausente no CI, versionCode do fonte inferior ao histórico, recursos Android novos ainda sem compilação binária, validação visual/acessibilidade/desempenho pendente.
- APK/AAB final: **não gerados**. Não há versão, checksum, tamanho, link de release ou instrução de atualização novos a informar. Compilar agora violaria os critérios de conclusão e preservação da assinatura solicitados.

Próximos desbloqueios indispensáveis: restabelecer ingestão oficial e histórico recente no banco existente; restabelecer os serviços hospedados sem gastos não autorizados; reconciliar versionCode e usar a mesma chave de assinatura; disponibilizar ambiente Android para testes finais. Continuar o restante da modernização visual e a matriz de acessibilidade após esses desbloqueios, sem converter esta entrega parcial em release definitiva.

## Rodada de validação e correções complementares

- Commit remoto `be567435958012ef31de2013eaf7e7739f19977f`, run Flutter 45907817430: dependências e análise estática aprovadas; 49 testes passaram e um falhou. O teste de comunidade usava ensureVisible em um elemento ainda não construído pela lista preguiçosa após a fixação do CTA. Corrigido para scrollUntilVisible no scroll vertical, preservando as asserções do destino real e mensagem de falha. Nenhum teste removido.
- Local: `npm run build` verificou 215 arquivos; `npm test` 254/254; `npm audit --audit-level=moderate` zero vulnerabilidades reportadas. Primeira execução e2e bloqueada por navegador Chromium ausente; instalação e reexecução pendentes.
- Ícone adaptativo: fallback vetorial original mantido; foreground separado do fundo, versão monocromática no qualifier API 33 e splash específico API 31, sem Activity ou atraso artificial. Manifest aponta ao recurso mipmap; API 24/25 preservam alias do drawable anterior. 12 XMLs de recursos parseados; compilação/launcher/máscaras em aparelho aguardam etapa final. Referências: documentação oficial Android sobre adaptive icons e splash screen.
- API: requisições idênticas simultâneas compartilham Future; entrada removida após conclusão para permitir atualização posterior. HTTP 429 estabelece pausa local conforme Retry-After numérico (1–3600s; fallback 60s), sem retentativa automática. Testes verificam coalescência, nova consulta após conclusão e respeito à pausa com relógio injetado.
- Cupons: acesso pelo menu de conta sem remoção de buscas/salvos/sobre; cópia direta no catálogo de lojas, com aviso de validade não confirmada. Fluxos externos preservados.

### Preservação complementar e rodada 2

- Commit remoto `67ee10d37116512b7a64b1b261fbf6cb718b85da`: run Flutter 45908108178 aprovado, análise sem problemas e 52 testes aprovados; compilação e upload APK explicitamente skipped. Run CI 45908108171 aprovado, incluindo testes de navegador no runner.
- E2E local: download do Chromium Playwright retornou HTTP 403. Alternativa pelo `/usr/bin/chromium` falhou porque o executável real `/usr/lib/chromium/chromium` está ausente. Não é falha funcional comprovada do app; CI executou a suíte com sucesso.
- Evidência histórica do Hatchable `lib/documentation/evidence/apk-0.3.1-2026-11-20.json`: versão distribuída 0.3.1+4, certificado SHA-256 `c5f6176299c7cf0775050e36c84c1ac54e605a22b3d1c687f1ef541729fcd5a4`, assinatura CI não configurada e instalação em aparelho não testada. Fonte recuperado ainda informa 0.2.0+2: exige reconciliar versionCode antes da compilação final, sem inventar compatibilidade.
- Recuperado arquivo público `android/signing-certificate.sha256` do commit histórico `c050315113f5757348babe51610de6d9da837495`. Não contém chave privada nem permite assinar. Recuperada documentação FEED-SUPABASE-EDGE da branch anterior, com marca histórica e identificador privado omitido.
- Ao adotar ícone adaptativo, o smallIcon das notificações passa ao drawable monocromático dedicado; evita reutilizar ícone de launcher adaptativo como ícone de status. Assinatura e permissões preservadas.
- Versão exibida no aplicativo passa a cor semântica onSurfaceVariant; CTA usa primary/onPrimary nos dois temas. Acrescentados testes de resposta fora de ordem e cards a 320 dp com fonte 200% nos dois temas; aguardam próxima execução CI.

### Verificação adicional de acessibilidade

Após os 55 testes aprovados, acrescentadas verificações Flutter textContrastGuideline, androidTapTargetGuideline e labeledTapTargetGuideline dos cards em ambos os temas. Tamanhos 10/11 do main elevados ao mínimo de 12; toolbar da inicial acompanha a ampliação de fonte (sem limitar textScaler); ícones de erro/vazio usam onSurfaceVariant e favorito de detalhes anuncia remoção quando salvo. Validadas posteriormente no run 45909021383; os 57 testes incluem as novas verificações, sem alterar os limiares dos matchers.

Run 45908825526 detectou duas falhas na nova instrumentação: o matcher assíncrono de acessibilidade não era aguardado, e o teste encerrava antes de liberar SemanticsHandle. Corrigido para await expectLater e try/finally com dispose; as três verificações de acessibilidade permanecem obrigatórias nos dois temas. Não foi alterada tolerância de contraste nem removida asserção.

## Arquivos desta execução

27 arquivos adicionados ou modificados em relação ao commit inicial; zero arquivos removidos; nenhuma dependência ou lockfile alterado.

```text
M	.github/workflows/radar-ofertas-validation.yml
A	docs/ANDROID-AUDIT-2026-11-26.md
M	docs/CONTROLE-DE-MUDANCAS.md
M	docs/INDICE.md
M	mobile/radar_promo_ofertas/README.md
M	mobile/radar_promo_ofertas/android/app/src/main/AndroidManifest.xml
M	mobile/radar_promo_ofertas/android/app/src/main/kotlin/br/com/radarpromo/radar_promo_ofertas/MainActivity.kt
M	mobile/radar_promo_ofertas/android/app/src/main/res/drawable-v21/launch_background.xml
M	mobile/radar_promo_ofertas/android/app/src/main/res/drawable/launch_background.xml
A	mobile/radar_promo_ofertas/android/app/src/main/res/drawable/radar_foreground.xml
A	mobile/radar_promo_ofertas/android/app/src/main/res/drawable/radar_monochrome.xml
A	mobile/radar_promo_ofertas/android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml
A	mobile/radar_promo_ofertas/android/app/src/main/res/mipmap-anydpi-v33/ic_launcher.xml
A	mobile/radar_promo_ofertas/android/app/src/main/res/values-night-v31/styles.xml
A	mobile/radar_promo_ofertas/android/app/src/main/res/values-v31/styles.xml
A	mobile/radar_promo_ofertas/android/app/src/main/res/values/radar_icon.xml
A	mobile/radar_promo_ofertas/android/signing-certificate.sha256
A	mobile/radar_promo_ofertas/docs/FEED-SUPABASE-EDGE-2026-11-24.md
M	mobile/radar_promo_ofertas/lib/main.dart
M	mobile/radar_promo_ofertas/lib/models/offer.dart
A	mobile/radar_promo_ofertas/lib/offer_image.dart
M	mobile/radar_promo_ofertas/lib/screens/app_version.dart
M	mobile/radar_promo_ofertas/lib/screens/stores_coupons.dart
M	mobile/radar_promo_ofertas/lib/services/api.dart
A	mobile/radar_promo_ofertas/test/audit_visual_safety_test.dart
M	mobile/radar_promo_ofertas/test/community_test.dart
M	mobile/radar_promo_ofertas/test/offers_api_test.dart
```

## Espelhamento documental e conclusão da execução

Relatório integral copiado como rascunho privado `lib/documentation/ANDROID-AUDIT-2026-11-26.md` nos dois projetos Hatchable. Os índices e controles de mudança receberam adições pontuais após leitura/comparação, preservando entradas exclusivas de cada ambiente. Não houve deploy: v674/v3 continuam sendo as versões publicadas. Este espelhamento é documental, não sincronização bidirecional ou implantação do Flutter.

Código final validado: c6a49f43c934aef280e0d69c97f4f70e264a1730. Resultado: avanços implementados e testados, auditoria integral de produção ainda não concluída. As 25 linhas acima discriminam as pendências; nenhum APK final é disponibilizado enquanto os critérios de assinatura, atualidade do catálogo e testes Android permanecem abertos.
