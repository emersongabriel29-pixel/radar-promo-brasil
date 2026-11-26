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

Matriz final das 25 auditorias e resultados de CI será registrada após execução das verificações.
