# Auditoria e plano de integração conjunta — Afilimax + BlueBot

Data: 2026-11-25
Status: diagnóstico documentado; integração executável bloqueada por dependências de autenticação e runtime.
Escopo: Mercado Livre, sem alterar o fluxo atual de Shopee, demais lojas, filas ou publicação.

## Resultado da inspeção dos repositórios

### Afilimax/mercado-livre-provider
- Licença declarada: MIT.
- Implementação principal: `src/index.ts`, classe `MercadoLivreProvider`.
- Gera link via POST para `https://www.mercadolivre.com.br/affiliate-program/api/v2/stripe/user/links`.
- Autenticação exigida pelo código: cookies de sessão do navegador e token CSRF; também exige uma tag.
- O pacote declara peer dependency `@afilimax/core` e dependências próprias de scraping.
- O endpoint é uma rota web interna de afiliados baseada em sessão, não foi demonstrado como endpoint público/documentado do OAuth de desenvolvedor.
- Riscos: expiração/revogação de cookies, mudanças no frontend/endpoint, bloqueios anti-bot e exposição de sessão se cookies forem registrados ou armazenados incorretamente.

### SaulloGabryel/BlueBot
- Licença declarada: MIT.
- `Affiliates/MercadoLivre_affiliate.py` usa Selenium, Brave/ChromeDriver, perfil de navegador local e clipboard.
- Os caminhos do navegador e perfil estão fixos para um ambiente Linux específico.
- `bot.py` monitora grupos via Telethon e faz encaminhamento para Telegram/WhatsApp, além de chamar geradores de afiliados.
- O BlueBot não é apenas um segundo gerador: importa monitoramento e publicação que já existem no Radar. Importar o bot inteiro duplicaria responsabilidades e poderia provocar publicação externa não autorizada.
- Selenium com perfil de navegador local não é compatível, sem worker próprio, com o runtime atual do Radar.

## Situação atual do Radar

- `api/mercadolivre/callback.js` persiste conexão OAuth Mercado Livre em `marketplace_connections`.
- `lib/direct-connectors.js` fornece chamadas autenticadas por OAuth através de `meliGet`.
- `api/mercadolivre/products.js` pesquisa/enriquece produtos, mas avisa explicitamente que isso não gera link afiliado.
- `api/links/convert.js` retorna HTTP 412 para Mercado Livre e mantém a conversão automática desativada.
- `package.json` não declara Python, Selenium, Playwright browser runtime ou os pacotes do Afilimax.

## Arquitetura conjunta recomendada

1. Criar um único serviço interno `MercadoLivreAffiliateService` por trás da rota atual de conversão, com contrato comum de entrada/saída.
2. Adaptador Afilimax: opcional e isolado; só habilitar quando existir método seguro e autorizado para obter/renovar a sessão e CSRF. Nunca aceitar cookies enviados pelo cliente, nunca gravá-los em logs e nunca armazená-los em texto puro.
3. Adaptador BlueBot: não importar `bot.py`, Telethon, WhatsApp-web.js, sessões ou encaminhamento. Isolar somente o mecanismo Selenium num worker externo dedicado, com perfil de navegador protegido, fila autenticada, allowlist estrita de domínios e timeout. Não executar navegador no processo web do Hatchable.
4. Ordem de tentativa, timeout, idempotência e erros normalizados devem ser definidos no serviço. Um adaptador indisponível não pode impedir a busca de produtos nem afetar Shopee/outros marketplaces.
5. Preservar `subid`/grupo apenas quando o gerador efetivamente aceitar e devolver esse dado; não anexar parâmetros presumidos.
6. Retornar somente links verificados como Mercado Livre afiliado (domínio/estrutura esperados) e nunca marcar comissão como confirmada apenas porque o encurtador foi retornado.
7. Feature flag desligada por padrão. Sem publicação automática, sem envio para Telegram/WhatsApp e sem processamento em produção durante a validação.

## Bloqueios antes da implementação funcional

- O Radar dispõe de OAuth de desenvolvedor, mas os dois candidatos inspecionados dependem de autenticação por sessão de navegador.
- Não foi demonstrado que os cookies/CSRF necessários estão disponíveis por um meio autorizado e sustentável.
- O BlueBot requer um worker Selenium externo e perfil de navegador persistente; esse runtime não existe no `package.json` do Radar.
- Não há evidência de que o endpoint web usado pelo Afilimax seja estável ou faça parte da API pública contratada.
- Não criar segredos, não solicitar que o usuário cole cookies no chat e não contornar mecanismos de autenticação/anti-bot.

## Plano de validação exigido

- Testes unitários de validação de URL, normalização de resposta, timeout, rate limit e erros de autenticação.
- Testes com respostas simuladas; nenhum acesso a conta real durante CI.
- Teste manual controlado com conta e sessão autorizadas, sem publicar/encaminhar.
- Verificar expiração de sessão, rotação de CSRF, URLs curtas, links sociais e respostas inválidas.
- Confirmar que falha dos dois adaptadores preserva o comportamento atual HTTP 412 e não afeta Shopee, Amazon ou outras integrações.
- Auditoria de logs para garantir ausência de cookies, CSRF, tokens e dados de sessão.
- Só então habilitar a feature flag em ambiente de teste. Produção exige revisão e autorização separadas.

## Alterações nesta etapa

Somente este documento de auditoria foi adicionado. Nenhum código de execução, dependência, credencial, fila, canal ou publicação foi alterado. Nenhuma implantação foi feita.
