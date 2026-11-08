# Amazon Creators API — ficha técnica observada

## Evidência no projeto
Arquivo `api/integrations/amazon.js` (233 linhas). Usa Creators API `https://creatorsapi.amazon/catalog/v1/`, OAuth client credentials e token endpoints regionais. Operações permitidas no código: `searchItems`, `getItems`, `getVariations`, `getBrowseNodes`.

## Campos e validação
Requer Credential ID, Credential Secret, Partner Tag, versão e marketplace permitido. Confere ASIN, título, URL com Partner Tag correspondente, imagem e preço atual/original. Itens são criados como rascunhos PENDING e exigem revisão humana; não dispara autopilot nem publicação.

## Segurança e limites
Credenciais criptografadas por conta; cache de token no processo; marketplace allowlist; medicamentos bloqueados; deduplicação por fingerprint. A disponibilidade de operação e recursos depende do acesso concedido pela Amazon à conta.

## Estado operacional
Nenhuma credencial AMAZON apareceu no inventário de produção consultado em 08/11/2026. Implementada, mas não configurada/validada. Não presumir que PA-API antiga e Creators API tenham contratos intercambiáveis.