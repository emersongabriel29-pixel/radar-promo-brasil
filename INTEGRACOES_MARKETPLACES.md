# Integrações oficiais por marketplace — contrato do Radar

## Arquitetura

A extensão **não chama diretamente** as APIs oficiais dos marketplaces. Cada programa possui autenticação, assinatura, permissões, limites e regras próprias. A extensão envia um contrato normalizado ao endpoint HTTPS do backend; o backend guarda os segredos e conversa com a plataforma. Isso evita expor App Secret/Client Secret em arquivos da extensão ou no armazenamento local do navegador.

Marketplaces previstos: Mercado Livre, Amazon Associates/PA-API, Shopee Open Platform/Affiliate, AliExpress Portals/Affiliate, SHEIN Open Platform, Temu Affiliate e Magalu. A disponibilidade de cada operação depende da aprovação da conta e dos escopos concedidos pelo programa.

## Configuração

Na extensão, selecione a loja, informe o endpoint HTTPS do conector e ative-o. O endpoint é por loja. O campo identificador da conexão é apenas um alias público; não é segredo. Não salve Client Secret, App Secret, refresh token ou senha na extensão.

## Contrato HTTP

A extensão envia POST JSON para o endpoint configurado:

```json
{
  "provider": "MERCADO_LIVRE",
  "action": "product_lookup",
  "account": "conta-principal",
  "offer": {
    "title": "Produto capturado",
    "productUrl": "https://...",
    "affiliateUrl": "https://...",
    "price": "199,90",
    "subId": "telegram"
  },
  "requestedAt": "ISO-8601"
}
```

Ações:
- `test`: valida credenciais, acesso e escopos. Responder `{ "ok": true, "message": "..." }`.
- `product_lookup`: consulta produto e responde com `offer` ou `product`, contendo opcionalmente `title`, `price`, `originalPrice`, `imageUrl`, `productUrl`, `category`, `affiliateUrl`.
- `create_affiliate_link`: gera link conforme programa e responde com `affiliateUrl` (HTTPS).
- `coupon_search`: opcional; retorna `coupons[]` com código, validade, regras e URL de origem.

## Implementação obrigatória no servidor

Cada adaptador do backend deve implementar assinatura/OAuth e renovação de token conforme documentação oficial; validar domínio e URL; aplicar rate limit e timeout; registrar request-id, status e erro sanitizado; nunca registrar segredos; respeitar políticas do programa; não simular respostas. Para operações não autorizadas ou indisponíveis, retornar HTTP 501/403 com mensagem clara. Não usar scraping como se fosse API oficial.

## Segurança

- Segredos somente em variáveis de ambiente/secret manager no servidor.
- HTTPS obrigatório; CORS restrito ao necessário.
- Autorização própria do Radar entre extensão e backend (token curto/usuário autenticado); não confundir com o token do marketplace.
- Não usar credenciais de um marketplace em outro.
- Validar toda resposta antes de alterar oferta.
- O botão de teste comprova apenas a resposta do endpoint; só comprova acesso à API oficial se o backend realmente executar a verificação autenticada.

## Estado atual

A extensão oferece configuração por marketplace e chama um gateway normalizado. Isso **não significa que os sete conectores oficiais já estejam autenticados**: as credenciais, a aprovação dos programas e a implementação server-side de cada adaptador ainda são necessárias. A API central do Radar continua separada e recebe ofertas já normalizadas.
