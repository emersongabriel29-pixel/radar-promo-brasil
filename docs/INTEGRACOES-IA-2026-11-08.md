# Integrações e IA — estado observado em 08/11/2026

## Regra de status

Cada integração deve ser classificada como: **não implementada**, **implementada mas não configurada**, **configurada mas não validada**, **testada com sucesso** ou **bloqueada por acesso/credencial/limitação externa**. Uma rota, segredo cadastrado ou badge visual não basta para “testada com sucesso”.

## Catálogo de integrações

O projeto contém rotas/artefatos relacionados a Shopee, Mercado Livre, Lomadee, AliExpress, Magalu, Amazon, Awin, Admitad, Rakuten, SHEIN, Temu, Telegram, WhatsApp/Meta, n8n, YouTube e provedores de IA. Isso descreve presença de código, não homologação.

Para cada provedor, manter uma ficha com: documentação oficial e endpoint; fluxo de autenticação; segredos por nome (nunca valor); escopo/permissões; operação suportada; limites e paginação; timeouts/retries; tratamento 401/403/429/5xx; armazenamento e renovação; status real; evidência de teste sem publicação/cobrança; data da última validação.

## Gemini — comportamento real

Arquivo observado: `api/ai/promo.js`.

1. Rota exige membro autenticado e POST.
2. Valida título, preço positivo, link HTTPS e cupom HTTPS opcional.
3. Usa guard de cooldown/quota (`checkGeminiCooldown`) antes de chamar o modelo.
4. Quando permitido, chama `generateGeminiText` com modelo lógico `gemini-flash`, purpose `affiliate-promo-copy`, limite de 256 tokens e prompt que pede apenas nome comercial curto em português, preservando marca/modelo e sem inventar atributos.
5. Sanitiza a saída com `safeCreative` e entrega o título para `formatPromo`.
6. Em cooldown, quota 429, falha, resposta vazia ou truncada, usa fallback local determinístico.
7. O resultado informa `aiUsed`/model/usage conforme o caminho.

**Conclusão importante:** Gemini, nessa rota, não pesquisa a oferta nem recebe necessariamente uma classificação factual de Black Friday/relâmpago. Ele encurta o título. O texto promocional completo é composto localmente por `formatPromo` com dados de preço, cupom, loja, template e `promoMetadata`. Os rótulos promocionais devem ser derivados de metadados verificáveis; nunca inventar urgência ou desconto. O commit mais recente observado registra classificação baseada em metadados verificados para Black Friday, Flash Sale, cupons, descontos e ofertas padrão.

## Mensagem e templates

- `api/messages/preview.js` usa `formatPromo`, preço em centavos e regra de melhor cupom quando solicitada.
- A prévia retorna package IMAGE, MESSAGE e AFFILIATE_LINK e indica limites de caracteres WhatsApp/Telegram.
- `api/messages/templates.js` armazena templates por conta e disponibiliza variáveis produto, preco, preco_anterior, desconto, loja, link_afiliado, cupom, link_cupom e categoria.
- Não afirmar que IA gerou todos os elementos da mensagem quando o código compõe o texto localmente.

## Critério de homologação por integração

1. Confirmar documentação oficial e autorização da conta.
2. Testar autenticação e leitura permitida sem alterar conta externa.
3. Validar paginação, limites, timeout e rate limit.
4. Validar geração/atribuição do link afiliado conforme regras oficiais do programa.
5. Validar persistência, deduplicação e rastreabilidade SubID.
6. Validar imagem/preço/cupom com origem verificável.
7. Testar entrega apenas em destino de teste autorizado; não publicar em grupos reais.
8. Conferir receipt, idempotência, retry e UNKNOWN.
9. Registrar logs seguros e evidência datada.

## Pendências

A auditoria de 08/11 não executou chamadas de homologação de cada provedor. Portanto, não declara todos os conectores operacionais. A causa dos 502 de diagnóstico Telegram também permanece aberta.


## Adendo de remediação — 08/11/2026

Correção preparada: envelope de negócio AliExpress é validado além do HTTP e erros não validam credencial. Telegram expõe retry_after nas recusas explícitas, diferenciando transporte incerto. Isso não resolve credenciais vencidas/ausentes nem configura infraestrutura. Ver REMEDIACAO-AUDITORIA-2026-11-08.md.
