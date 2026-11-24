# Adaptação visual do Radar Promo Ofertas — 24/11/2026

## Fonte de referência

Arquivo de referência recebido: snapshot HTML da página inicial do Pelando (461 linhas). Ele apresenta:
- feed com as abas **Destaques**, **Recentes**, **Quentes**, **Mais baratos**, **Comentadas** e **Discussões**;
- navegação por comunidades/categorias;
- busca e filtros;
- apresentação de descontos e cupons;
- navegação inferior com início, postagem, alertas e discussões;
- chamadas de participação comunitária.

A referência é usada somente para orientar padrões de experiência. Não foram copiados código, marca, logotipo, fontes, imagens, CSS ou endpoints do Pelando.

## Mapeamento para o app Radar

| Padrão observado | Implementação no Radar | Limite respeitado |
|---|---|---|
| Destaques | Ordenação `score` | Usa pontuação calculada pelo Radar; não simula votos |
| Recentes | Ordenação `recent` | Ordem do feed oficial |
| Descontos | Ordenação `discount` | Usa o campo oficial de desconto |
| Categorias | Chips horizontais no feed e tela Categorias | Apenas categorias recebidas nas ofertas da API |
| Cards de oferta | Imagem, título, loja, preço, preço anterior e desconto | Dados vêm do JSON do Radar |
| Cupons | Selo no card e cópia na tela de detalhes | Só aparece quando a API retorna código |
| Busca | Busca por produto, loja ou marca | Consulta o proxy do Radar |
| Navegação inferior | Ofertas, Categorias, Salvos, Buscas e Sobre | Não cria postagem comunitária fictícia |
| Alertas | Buscas salvas e alertas de preço locais já existentes | Não afirma monitoramento remoto nem push nativo |

As abas Quentes, Mais baratos, Comentadas e Discussões não foram adicionadas como filtros falsos: o contrato atual do feed só aceita `recent`, `discount` e `score`. A criação de postagem do Pelando foi deliberadamente excluída porque as ofertas do aplicativo são recebidas pelas APIs do Radar Promo Brasil.

## Origem e fluxo dos dados

```
APIs oficiais e fontes integradas ao Radar Promo Brasil
                  |
                  v
api/public/offers-feed.js
                  |
       autenticação servidor-servidor
                  |
                  v
Radar Promo Ofertas — /api/offers
                  |
         JSON validado e sanitizado
                  |
                  v
Radar Promo Ofertas — aplicativo Flutter
```

- O app consulta exclusivamente `https://radar-promo-ofertas.hatchable.site/api/offers`.
- O proxy chama `https://radar-promo-brasil.hatchable.site/api/public/offers-feed`.
- `RADAR_API_TOKEN` e `RADAR_OFFERS_FEED_TOKEN` permanecem no servidor. Nenhum segredo é incluído no APK, no Flutter ou em `--dart-define`.
- O proxy aceita apenas o host/caminho esperado, restringe os parâmetros e valida o contrato.
- `affiliateUrl` e seus parâmetros são mantidos no modelo do app. O app só abre URLs HTTPS sem credenciais embutidas.
- O feed principal só retorna ofertas nos estados públicos permitidos e com histórico de preço oficial recente; o app não inventa nem completa preços ausentes.

## Arquivos alterados nesta tarefa

- `mobile/radar_promo_ofertas/lib/main.dart`: categorias rápidas alimentadas pelos dados recebidos da API; selo de cupom nos cards; texto de origem dos dados.
- `mobile/radar_promo_ofertas/test/feed_widget_test.dart`: teste de exibição do cupom e envio do filtro de categoria.
- `mobile/radar_promo_ofertas/README.md`: documentação atualizada do fluxo, versão e limitações.
- `.github/workflows/radar-ofertas-android-ci.yml`: análise Flutter, testes, build debug e artefato com checksum/proveniência.

## Validação e bloqueios

- Projeto Radar Promo Brasil verificado em 24/11/2026: versão 674.
- Projeto Radar Promo Ofertas verificado em 24/11/2026: versão 3.
- A execução diagnóstica de `/api/offers` retornou `429 usage_limit` da plataforma antes da validação do handler. Portanto, ainda não há evidência de resposta 200 com ofertas reais.
- O projeto Radar Promo Ofertas está classificado como `personal`; a disponibilidade anônima externa precisa ser confirmada pelo proprietário nas configurações.
- O ambiente desta sessão não possui Flutter/Dart instalados. A análise, os testes e a compilação devem ser confirmados pelo workflow do GitHub Actions.
- Nenhuma alteração foi feita nos dados, credenciais, visibilidade dos projetos ou publicação de ofertas.

## Regra de continuidade

APK debug compilado e testado; pode ser usado como prévia de interface. Não apontar como produção nem publicar em loja até:
1. GET anônimo do proxy retornar HTTP 200 com ofertas reais do Radar;
2. validar em aparelho a abertura de links afiliados preservando parâmetros;
3. resolver a visibilidade `personal` e o limite `429 usage_limit` sem expor segredos;
4. gerar assinatura de produção separada da chave debug.
