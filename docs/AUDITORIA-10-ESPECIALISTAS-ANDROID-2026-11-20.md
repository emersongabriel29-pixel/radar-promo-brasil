# Conselho de 10 especialistas — auditoria Android e sistema operacional
Data: 2026-11-20 | Projeto: Radar Promo Brasil / Radar Promo Ofertas
Escopo: revisão estática independente por dez especialidades (papéis de auditoria, não dez processos autônomos). Fonte Flutter: `feature/ofertas-price-watch-ui-204`. Backend implantado: Hatchable Radar Promo Ofertas v3, Radar Promo Brasil v672. Não houve instalação física ou teste de sessão real nesta rodada.

## Especialista 1 — Arquitetura Flutter e estado
**Alta:** `lib/main.dart` concentra carregamento, paginação, estado de favoritos, cache e UI. `_loadFavorites` persiste novamente após carregar; rever corrida com `_toggleFavorite` e `_load` e separar repositórios de estado. Testar requisições concorrentes e navegação durante respostas tardias.
**Média:** estado de favoritos é local, enquanto o backend possui favoritos por usuário; manter distinção até haver autenticação móvel segura.

## Especialista 2 — Android OS, ciclo de vida e permissões
**Alta:** `MainActivity.kt` responde `false` imediatamente quando solicita POST_NOTIFICATIONS (Android 13+). A primeira tentativa de alerta é descartada mesmo se o usuário conceder permissão; não há callback/reenvio explícito. Criar teste instrumental e ajustar o fluxo de permissão.
**Média:** notificações são disparadas no foreground e não há worker/push em segundo plano. `AndroidManifest.xml` declara INTERNET, POST_NOTIFICATIONS, cleartext desabilitado, backup desabilitado e launcher exportado.

## Especialista 3 — Segurança mobile e engenharia reversa
**Crítica para distribuição:** `android/app/build.gradle.kts` configura `release.signingConfig = signingConfigs.getByName("debug")`. Necessária assinatura de release persistente e protegida antes de distribuição definitiva; não colocar chave no repositório.
**Média:** `Offer.hasValidLink` aceita qualquer host HTTPS não vazio; avaliar controles contra links maliciosos/redirects e preservar SubIDs. Sem alegação de validação de destino final.

## Especialista 4 — Identidade, autenticação e autorização
**Alta:** `lib/services/community.dart` abre login/comunidade via `LaunchMode.inAppBrowserView`. Sessão fica no navegador; Dart não dispõe de credencial autorizada para `/api/favorites`. Não copiar cookies nem tokens do navegador. Avaliar fluxo oficialmente suportado de identidade móvel e revogação antes de implementar sync.
**Alta:** endpoint `api/favorites.js` exige usuário; `lib/community.js` filtra por user ID. Validar isolamento com duas contas autenticadas em ambiente de teste após restabelecer quota.

## Especialista 5 — API, rede e resiliência
**Crítica operacional:** GET `/api/offers` retornou HTTP 429 `usage_limit` (2,1h de 2,0h). `lib/services/api.dart` traduz erro e usa timeout de 20s, mas não há fluxo real validado.
**Média:** `getOffers` considera `hasMore` falso quando a página contém zero ofertas válidas; pode encerrar paginação de respostas parcialmente malformadas. Contrato e testes de payload adversarial necessários.

## Especialista 6 — Dados, Supabase e consistência
**Alta:** relatório existente `AUDITORIA-APP-2026-11-20.md` documenta cópia parcial: 10.360 ofertas no Supabase, sem `offer_price_history` e sem tabelas rpo_* nesse destino. Não migrar o feed nem a comunidade sem reconciliação e validação da autenticação.
**Alta:** feed original exige validação oficial de preço nas últimas 24h; catálogo copiado sozinho não satisfaz a consulta. Preservar origem, auditoria e idempotência.

## Especialista 7 — Qualidade de ofertas e afiliados
**Alta:** conferir `offer_price_history`, elegibilidade, preços, links e SubIDs antes de publicação. `lib/models/offer.dart` saneia números não finitos e aceita somente URLs HTTPS para abrir ofertas, mas isso não comprova a veracidade do preço ou do destino.
**Média:** `lib/screens/stores_coupons.dart` deriva lojas/cupons das ofertas já carregadas; não é catálogo completo.

## Especialista 8 — Performance, bateria e armazenamento
**Média:** `lib/main.dart` salva ofertas serializadas e favoritos em SharedPreferences, adequado para conjunto pequeno, mas sem limite explícito do tamanho do cache de ofertas salvas. Avaliar limites, deduplicação, validade de imagem e impacto de reconstrução da UI.
**Média:** `PriceAlerts.check` itera buscas x ofertas e armazena até 500 chaves de alerta; medir em dispositivos modestos e evitar notificação repetida por alteração de representação de preço.

## Especialista 9 — UX, acessibilidade e privacidade
**Alta:** não prometer push ou sincronização nativa: os textos atuais indicam corretamente limitações. Validar TalkBack, contraste, fonte ampliada, navegação por teclado, telas pequenas e mensagens de falha.
**Média:** `PreferencesScreen` permite apagar favoritos/buscas locais; exportação e exclusão da conta hospedada são operações separadas. Testar consentimento e entendimento da diferença.

## Especialista 10 — QA, CI/CD, assinatura e publicação
**Crítica para homologação:** workflow `.github/workflows/build-radar-ofertas-apk.yml` na main faz checkout de branch de feature móvel e gera APK debug. Um push na feature não aciona esse workflow diretamente; somente alterações no workflow main ou execução manual. Risco de compilação de revisão não fixada e de artefato não rastreável.
**Alta:** `pubspec.yaml` declara 0.2.0+2, enquanto documentação do APK anteriormente entregue descreve 0.3.0+3 via flags; alinhar versão, artefato e commit, sem substituir a identidade de assinatura.
**Pendente:** confirmar `flutter analyze`, `flutter test`, build, instalação e assinatura para o HEAD atual. Execuções antigas não validam commits novos.

## Prioridades e critérios de saída
P0: restaurar API/visibilidade e obter resposta real de feed e conta; não contornar limites da plataforma.
P1: assinatura persistente, teste de permissão Android 13+, autenticação móvel suportada, isolamento de favoritos, migração completa e verificada.
P2: limites de cache, acessibilidade, cobertura de payloads, instrumentação e UX.
**Resultado:** REPROVADO para produção. Revisão estática concluída para os arquivos inspecionados; nenhum teste novo executado nesta rodada. Não foram feitas alterações de banco, credenciais, plano, deploy ou publicação de ofertas.

## Evidência adicional já existente
`lib/documentation/AUDITORIA-APP-2026-11-20.md` no Hatchable Ofertas documenta auditoria anterior de 30 áreas, APK 0.3.0 e testes de commits anteriores. Esta auditoria de dez especialidades é complementar e não transfere resultados de CI antigos para o HEAD atual.
