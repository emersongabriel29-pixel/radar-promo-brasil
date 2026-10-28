# Auditoria das integrações de lojas

**Data:** 27/10/2026  
**Código auditado:** branch `codex/radar-video-ia-runway-20261018`  
**Objetivo:** explicar o fluxo implementado por loja, separar integração de API de importação manual e não declarar conectores ativos sem uma chamada oficial bem-sucedida.

## Resultado executivo

O Radar tem conectores de API de afiliados para Shopee, Amazon Creators API, Awin, Admitad, Rakuten, Lomadee e AliExpress (marcado como legado). Mercado Livre tem OAuth e consulta oficial de produtos, mas a geração de link afiliado permanece no portal oficial. SHEIN e Parceiro Magalu têm fluxo de importar links gerados manualmente, validar domínio e criar rascunho; esses fluxos não consultam API de afiliados nem verificam comissão.

As rotas encontradas no JavaScript REA do Cupom Radar indicam que seu cliente envia links para endpoints próprios por loja. Como a captura REA não reteve requests/responses, esses nomes não comprovam o comportamento do backend do Cupom Radar. O código do Cupom Radar é proprietário e não foi copiado. A comparação usada aqui é de fluxo, não uma alegação de equivalência de APIs.

## Matriz por loja

| Loja/rede | Como funciona no Radar | Evidência técnica no repositório | Estado que pode ser afirmado |
|---|---|---|---|
| **Mercado Livre** | OAuth 2.0 Authorization Code com PKCE vincula a conta; refresh token mantém o acesso; `/api/mercadolivre/parse-link` resolve/identifica links e consulta `/items/{id}` ou `/products/{id}` para título, preço, estoque e imagem; `/api/mercadolivre/products` busca anúncios. A pessoa continua usando o link afiliado criado no portal oficial. | `api/mercadolivre/connect.js`, `callback.js`, `health.js`, `parse-link.js`, `products.js`; `lib/direct-connectors.js`; `api/links/convert.js` bloqueia conversão presumida. | Implementação OAuth e consultas existem. A autorização real depende de `MELI_APP_ID`, `MELI_CLIENT_SECRET`, callback e autorização da conta. OAuth não comprova aprovação no programa de afiliados. Sem credenciais da conta não há validação ao vivo nesta auditoria. |
| **Shopee** | Assina requisições GraphQL da Open API Affiliate. Pode testar leitura, consultar ofertas de produto/loja/marca/campanha, criar short link oficial com `originUrl` e `subIds`, consultar `conversionReport` e `validatedReport`. | `api/integrations/shopee.js`; endpoint `https://open-api.affiliate.shopee.com.br/graphql`. | Implementado no código, mas exige App ID/Secret e permissão de afiliado. Chamada externa não executada nesta rodada. A conversão genérica do Radar bloqueia Shopee para impedir que um parâmetro presumido seja tratado como link de afiliado. |
| **Amazon** | Obtém access token OAuth de Creators API e consulta catálogo (`searchItems`, `getItems`, `getVariations`, `getBrowseNodes`) com Partner Tag e marketplace regional. | `api/integrations/amazon.js`; `https://creatorsapi.amazon/catalog/v1/` e endpoint de token por versão. | Implementado para leitura; requer Credential ID/Secret, versão habilitada e Partner Tag da conta. Não há prova nesta rodada de que a credencial atual esteja configurada ou autorizada. O caminho genérico de conversão que acrescenta `tag` não confirma atribuição nem substitui teste oficial. |
| **Awin** | Usa token Bearer e Publisher ID para listar programas associados e ler feed de anunciante/localidade. | `api/integrations/awin.js`; `https://api.awin.com`. | Leitura/feed implementados. A conta precisa ter aderido ao anunciante e acesso ao feed. Não há prova de conversão/relatório ou chamada real nesta rodada. |
| **Admitad** | OAuth client credentials/refresh, consulta campanhas, abre prévia de feed XML autorizado e gera deeplink. A prévia filtra tamanho e host e não retorna a URL autenticada do feed. | `api/integrations/admitad.js`; `https://api.admitad.com`. | Fluxos implementados; dependem de website ID, campanha, permissões e escopos da conta. Nenhuma chamada externa feita nesta rodada. Há duas ramificações de `product_feed` no arquivo; revisar se a duplicação é intencional antes de refatorar. |
| **Rakuten Advertising** | Emite/renova token e consulta anunciantes, busca de produtos e deep links conforme a ação do conector. | `api/integrations/rakuten.js`; `https://api.linksynergy.com`. | Implementado no código; depende de Client ID/Secret, Account ID, aprovação por anunciante e autorização da API. Não validado ao vivo nesta rodada. |
| **Lomadee** | API Key no header `x-api-key`; pode validar leitura, consultar produtos/marcas/campanhas/canais/pedidos, encurtar links autorizados e importar produtos como rascunhos. | `api/integrations/lomadee.js`; `https://api.lomadee.com.br`. | O fluxo está implementado, mas há evidência anterior do ambiente Hatchable de que consultas autenticadas de produtos/marcas retornaram HTTP 504 do provedor em outubro; o conector registrou `ERROR`/`NOT_CONNECTED`. Não marcar funcional até o provedor responder novamente. Ver [auditoria funcional de 18/10](AUDITORIA-FUNCIONAL-COMPLETA-2026-10-18.md). |
| **AliExpress** | Assina chamadas da Affiliate API, consulta produtos/pedidos/campanhas e tenta gerar link afiliado. | `api/integrations/aliexpress.js`, `lib/top-signature.js`, `lib/afilimax-aliexpress-provider.js`; gateway `https://eco.taobao.com/router/rest`. | Código sinaliza documentação pública Affiliate como descontinuada, exige reconhecimento explícito e marca o provider de link como experimental. Não declarar operacional sem confirmação de acesso/permissões da conta e resposta ao vivo. |
| **SHEIN** | Pessoa cola link oficial de produto/OneLink e confirma que ele foi gerado no Centro de Afiliados; o Radar valida domínio e dados informados e salva oferta `PENDING`, não publicada. | `api/integrations/shein.js`. | Fluxo manual de rascunho. Nenhuma API pública de afiliados validada no projeto; não há busca automática, geração de link ou relatório de comissão. Formato/domínio válido não prova tracking. |
| **Parceiro Magalu** | Pessoa cola link de `magazinevoce.com.br` ou domínio oficial do Magalu, confirma origem no Parceiro Magalu e informa dados; o Radar salva oferta `PENDING`. | `api/integrations/magalu.js`; credenciais antigas de seller são preservadas no catálogo de conexões sem serem tratadas como API de afiliado. | Fluxo manual de rascunho. Não há geração automática, feed ou relatório de afiliado comprovado. API Magalu Devs de seller não é automaticamente API do Parceiro Magalu. |

## O fluxo real entre loja e publicação

1. **Descoberta:** somente conectores com API/feed habilitado retornam produtos/programas. Importações manuais começam com o link e os dados fornecidos pela pessoa.
2. **Atribuição:** o link precisa vir do gerador oficial da loja/rede ou de um endpoint oficial de deeplink/short link. Reconhecer domínio ou anexar tag não confirma a comissão.
3. **Rascunho:** os fluxos manuais de SHEIN/Magalu e as importações de feed ficam pendentes para revisão; o rascunho não equivale a aprovação.
4. **Validação comercial:** o código do Radar tem etapas separadas para preço oficial, estoque, regra/tag de afiliado, categoria e deduplicação. Isso não deve ser substituído por dados estáticos do cliente REA.
5. **Publicação:** publicação só ocorre depois das regras do Radar, aprovação/automação configurada e destino conectado. Esta auditoria não enviou ofertas nem alterou contas de loja.

## Defeito corrigido: chave de criptografia incompatível

`api/integrations/marketplaces.js` escolhe primeiro `API_CREDENTIALS_MASTER_KEY` para cifrar credenciais. Se esse segredo existisse, os leitores de seis conectores (`AMAZON`, `SHOPEE`, `AWIN`, `ADMITAD`, `ALIEXPRESS`, `RAKUTEN`) usavam exclusivamente `CONNECTOR_ENCRYPTION_KEY`. Credenciais novas podiam ser salvas e depois falhar na descriptografia.

Foi criado `lib/marketplace-credentials.js` e os seis leitores agora tentam a chave mestra atual e depois a chave antiga do conector. Isso também preserva registros antigos cifrados com `CONNECTOR_ENCRYPTION_KEY`; nenhum ciphertext foi regravado ou removido. Lomadee já aceitava as duas chaves. A correção evita a incompatibilidade local, mas não valida tokens nem conexão com a loja.

## O que falta para comprovar operação ao vivo

- Confirmar quais credenciais oficiais estão cadastradas por conta sem revelar os valores; não pedir nem registrar segredos no chat.
- Executar, com autorização e limites da conta, as ações somente leitura: teste de cada conector, consulta curta de produtos/programas e verificação de status OAuth.
- Testar geração de link em sandbox/conta própria apenas onde o endpoint oficial suportar; verificar clique/relatório de atribuição depois. Criação de link não prova conversão.
- Para Lomadee, repetir validação depois que o HTTP 504 do provedor for resolvido.
- Para SHEIN e Magalu, validar importação de link oficial e os campos do rascunho; relatório de comissão continua fora do conector.
- Atualizar o status por loja usando estados distintos: `IMPLEMENTED`, `CREDENTIALS_MISSING`, `AUTHORIZED`, `READ_TESTED`, `LINK_CREATED`, `ATTRIBUTION_VERIFIED`. O painel não deve reduzir todos esses estados a “conectado”.

## Evidência REA do Cupom Radar

A captura estática enumera, entre outras, as chamadas do cliente `/api/shopee/convert-link`, `/api/mercadolivre/convert-link`, `/api/awin/convert-link`, `/api/amazon/product`, `/api/shopee-product`, `/api/shein-product` e `/api/resolve-link`. O bundle mostra a intenção e a sequência do frontend; a captura de sessão não reteve respostas de rede e o backend não foi acessado. Portanto, REA ajudou a identificar o fluxo de interface e os pontos de integração, mas não forneceu código servidor reutilizável nem prova de que os endpoints externos funcionam.

## Verificações desta correção

- Testes unitários da descriptografia com a chave mestra atual, fallback para ciphertext legado e ausência de chave.
- Build, suíte de testes e E2E executados após a correção.
- Nenhuma chamada a loja, alteração de credencial, publicação ou envio de oferta foi feito nesta rodada.
