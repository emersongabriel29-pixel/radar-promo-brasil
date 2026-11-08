# Temu — ficha de integração observada

## Evidência no projeto
Arquivo `api/integrations/temu.js` (170 linhas). O fluxo é explicitamente `official_affiliate_portal_link_import`, não integração de API de catálogo.

## Operações presentes
- Validar HTTPS e domínio Temu/Temu.to.
- Importar manualmente produto/campanha usando link gerado no Programa de Afiliados.
- Criar rascunho de oferta com preço, imagem e categoria.
- Exigir confirmação explícita de que o link foi gerado na conta afiliada.

## Não disponível neste código
Descoberta automatizada, feed de campanhas, geração programática de links, relatórios de comissão e conversão. Domínio oficial não comprova tracking.

## Estado
Fluxo manual implementado. Não classificar como API de afiliados automatizada nem como tracking validado.