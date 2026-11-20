# Incremento Android — preço desejado local (Issue #204)

Data: 20/11/2026.

## Escopo
Na tela **Buscas**, cada termo salvo pode receber um preço máximo de referência. O usuário toca no ícone de preço, informa valor positivo em reais (vírgula ou ponto decimal), salva, edita ou remove o limite. A busca pode ser removida deslizando o cartão. O armazenamento usa SharedPreferences, chave `saved_search_target_prices` em JSON, sem alterar os dados do backend. A ação **Apagar favoritos e buscas** também remove os limites.

## Limitações explícitas
O valor não dispara notificações, não compara automaticamente ofertas, não consulta histórico e não sincroniza com a conta. Nenhum recurso é rotulado como alerta ativo. A futura implementação real depende de backend, consentimento e push.

## Reconciliação
Fonte Flutter: branch `android/github-actions-build` do GitHub, com implementação isolada em `feature/ofertas-price-watch-ui-204`. Hatchable Radar Promo Brasil v672 e Radar Promo Ofertas v3 observados no início; nenhum arquivo Hatchable alterado. PR #202 contém correções independentes; reconciliar antes de merge.

## Validação
Arquivo relido no GitHub após gravação; verificados delimitadores e fluxo textual. Flutter analyze, flutter test e compilação Android **não executados nesta etapa**; requer CI. Não houve deploy nem APK.
