# Integração Shopee Video — plano técnico

## Estado

- [x] API de Afiliados Shopee existente em `api/integrations/shopee.js` (GraphQL, App ID/App Secret).
- [x] Coleta de ofertas existente no fluxo de ingestão do Radar.
- [ ] Confirmar/criar um aplicativo do tipo **Shopee Video Management** na Open Platform.
- [ ] Confirmar que o app tem permissão para as APIs `v2.media.*` e `v2.video.*`.
- [ ] Aceitar os Termos e Condições do Shopee Video no Seller Center/conta aplicável.
- [ ] Implementar OAuth/autorização de usuário e armazenar tokens por `user_id`, criptografados e isolados por conta.
- [ ] Implementar upload multipart, consulta/push do resultado, seleção de capa, edição de metadados/produto e publicação.
- [ ] Implementar fila idempotente, limites de frequência, tratamento de falhas e métricas de desempenho.
- [ ] Testes unitários com respostas simuladas; teste real somente depois de confirmar as permissões.

## Separação obrigatória de credenciais

As credenciais atuais da API de Afiliados Shopee **não comprovam acesso** às APIs Shopee Video. O Video OpenAPI exige um app da categoria Shopee Video Management e autorização de usuário. Não reutilizar automaticamente o App ID/App Secret de afiliado nem presumir que `shop_id` substitui `user_id`.

A autorização precisa respeitar o papel concedido:
- Afiliado: `auth_type=user`; a autorização deve retornar `user_id`.
- Seller: `auth_type=seller`; o fluxo pode retornar `shop_id` e `user_id`.
- Assinar cada chamada de vídeo com `user_id` e manter access/refresh tokens separados por usuário.

A implementação deve seguir a documentação oficial atual de autorização e a referência de cada endpoint. Não inventar payloads, assinatura, limites, campos ou URLs de callback quando a documentação não estiver acessível.

## Fluxo previsto

1. A ingestão existente identifica uma oferta válida e com URL de produto.
2. O gerador cria um vídeo vertical original (não uma imagem estática), dentro da duração permitida pela Shopee e usando mídia própria/licenciada.
3. Uma fila persistente registra o vídeo e evita uploads/publicações duplicados.
4. A API de mídia inicia o upload, envia partes e conclui o processamento.
5. O resultado é confirmado por push ou consulta; somente vídeos processados com sucesso avançam.
6. A API de vídeo define capa, legenda, produto vinculado e demais metadados; em seguida publica.
7. O Radar grava o ID externo e consulta métricas quando disponíveis.

## Regras de segurança e monetização

- Não publicar conteúdo estático como vídeo; os termos da Shopee proíbem esse formato.
- O produto precisa estar vinculado ao vídeo pela funcionalidade oficial para que a venda direta possa ser atribuída; URL na legenda/comentários não substitui o vínculo.
- Vídeos publicados não podem ser editados segundo o guia fornecido; validar produto, legenda e capa antes da publicação.
- Não publicar automaticamente enquanto o app/permissões e a autorização da conta não forem confirmados.
- Nunca registrar access token, refresh token, App Secret ou URLs privadas de upload nos logs.
- Não declarar integração validada com base apenas em credenciais salvas ou em um upload iniciado.

## Documentação consultada

- Shopee Video API Integration Guide (atualização indicada no documento fornecido: 2025-12-19).
- [Guia de autorização Livestream / User-type APIs](https://open.shopee.com/developer-guide/669)
- [Inicialização do upload de vídeo](https://open.shopee.com/documents/v2/v2.media.init_video_upload?module=130&type=1)
- [Publicação de vídeo](https://open.shopee.com/documents/v2/v2.video.post_video?module=129&type=1)
- [Dúvidas oficiais sobre Shopee Video Brasil](https://help.shopee.com.br/portal/10/article/171162-Principais-d%C3%BAvidas-sobre-Shopee-Video)

## Bloqueio atual

A referência Open Platform retornou acesso negado durante a verificação automatizada. Antes de escrever chamadas de publicação, precisamos confirmar no Console que o aplicativo de **Shopee Video Management** está criado e habilitado e obter a especificação exata dos campos de autorização/assinatura aplicáveis à conta. Até isso ser confirmado, o recurso permanece explicitamente não habilitado; a integração de afiliados existente continua independente.
