# Integrações de marketplaces do Radar Promo Brasil

## Integração com a API existente

A extensão utiliza as rotas de integração que já existem no backend do Radar, em vez de exigir endpoints arbitrários por loja. Configure na extensão a URL-base da API central e o token de autenticação compatível com a instalação. A URL-base pode ser o endereço raiz ou o endpoint antigo terminado em `/api/data`; a extensão normaliza a origem e chama as rotas abaixo.

- `GET/POST /api/integrations/marketplaces`: catálogo de programas e credenciais protegidas.
- `GET/POST /api/integrations/amazon`: Amazon Creators API.
- `GET/POST /api/integrations/shopee`: Shopee Afiliados Open API.
- `GET/POST /api/integrations/aliexpress`: AliExpress Open Platform (legada, sujeita à disponibilidade da conta).
- `GET/POST /api/integrations/shein`: validação/importação de links oficiais, sem API pública de afiliados confirmada.
- `GET/POST /api/integrations/temu`: validação/importação de links oficiais, sem API pública de afiliados confirmada.
- `GET/POST /api/integrations/magalu`: validação/importação de links do Parceiro Magalu, sem API pública de afiliados confirmada.
- Mercado Livre: cadastro/estado via `/api/integrations/marketplaces`; OAuth de catálogo e Programa de Afiliados são fluxos distintos. A conversão automática de link do Programa de Afiliados permanece desativada; importe o link gerado no portal oficial.

## O que a extensão solicita

- **Verificar conexão:** executa consulta de leitura autenticada para Amazon, Shopee e AliExpress; para os outros, consulta estado e capacidades declaradas no backend.
- **Consultar produtos:** usa pesquisa Amazon, ofertas de produtos Shopee e busca AliExpress, quando a conta possui permissões.
- **Gerar link:** usa `create_link` da Shopee, `generateLink` do AliExpress e `detailPageURL` retornada pela Amazon Creators API. Mercado Livre, SHEIN, Temu e Magalu permanecem em fluxo de link oficial importado/manual quando não há geração automática pública validada.

## Credenciais e segurança

As credenciais oficiais são cadastradas no painel do Radar e criptografadas no backend. Não inserir App Secret, Client Secret ou refresh token na extensão. O token usado pela extensão autentica no Radar; não é o token do marketplace. A autenticação Bearer depende do modo de hospedagem: o standalone privado aceita o token configurado para a API; instalações Hatchable que exigem sessão de membro podem não aceitar chamadas cross-origin da extensão com Bearer. Nessa situação, é necessário um fluxo seguro de autorização da extensão, sem compartilhar cookies ou segredos.

## Limites reais por loja

- **Mercado Livre:** OAuth de conta não concede automaticamente acesso ao Programa de Afiliados. Não alterar parâmetros do link de afiliado oficial.
- **Amazon:** Creators API exige Credential ID, Credential Secret, versão e Partner Tag. A disponibilidade depende da elegibilidade e dos limites da conta.
- **Shopee:** exige App ID/App Secret e habilitação da Open API de Afiliados.
- **AliExpress:** métodos da Affiliate API são legados/descontinuados em parte da documentação. O backend exige confirmação explícita da limitação; teste real e permissões da conta são indispensáveis.
- **SHEIN, Temu e Magalu:** o backend identifica fluxo de importação de links gerados nos respectivos portais; não apresentar isso como API oficial de geração.

## Não confundir os estados

Salvar credenciais não valida uma API. Um status `VALIDATED` deve resultar de chamada oficial de leitura. Uma consulta bem-sucedida não significa publicação, comissão garantida ou relatório de conversões habilitado. A API central do Radar e os conectores de marketplace são camadas diferentes.
