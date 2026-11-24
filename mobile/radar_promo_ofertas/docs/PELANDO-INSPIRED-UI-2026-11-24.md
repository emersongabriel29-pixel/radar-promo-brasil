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
APIs oficiais e fontes integradas ao Radar Promo Brasil
                  |
                  v
Banco Supabase (espelho operacional)
                  |
      Edge Function read-only
      radar-offers-feed
                  |
                  v
Radar Promo Ofertas — aplicativo Flutter
```

- O app consulta `https://runnmpzkomcdawwzuift.supabase.co/functions/v1/radar-offers-feed`.
- A Edge Function executa SQL somente de leitura no Supabase usando `SUPABASE_DB_URL` do ambiente gerenciado; não aceita SQL, conta, tabela ou colunas fornecidas pelo cliente.
- O endpoint fixa a conta Radar, restringe paginação e ordenação, seleciona apenas campos públicos e mantém os links afiliados HTTPS sem modificar seus parâmetros.
- A resposta exige preço oficial verificado nas últimas 24 horas e correspondência entre preço atual e último histórico oficial. O APK não recebe credenciais privilegiadas.
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
- O endpoint anterior do Hatchable retornou `429 usage_limit` antes de executar o handler.
- O espelho Supabase contém 10.360 ofertas e 22 categorias, mas a última atualização das ofertas observada foi em 13/11/2026; `offer_price_history` contém 0 registros. Portanto, a Edge Function corretamente retorna feed vazio até que o Radar volte a sincronizar e validar preços recentes.
- A Edge Function Supabase foi criada e está ACTIVE na versão 2; `verify_jwt=false` porque o feed é público, mas o código restringe a leitura a uma conta e campos públicos, sem permitir operações de escrita.
- A execução HTTP real da função e a CI do novo commit ainda precisam ser confirmadas.
- Nenhuma linha de dados, segredo, visibilidade de projeto, publicação ou credencial foi alterada.

## Regra de continuidade

APK debug compilado e testado; pode ser usado como prévia de interface. Não apontar como produção nem publicar em loja até:
1. GET anônimo do proxy retornar HTTP 200 com ofertas reais do Radar;
2. validar em aparelho a abertura de links afiliados preservando parâmetros;
3. resolver a visibilidade `personal` e o limite `429 usage_limit` sem expor segredos;
4. gerar assinatura de produção separada da chave debug.
