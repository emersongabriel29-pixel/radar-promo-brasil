# SHEIN — ficha de integração observada

## Evidência no projeto
Arquivo `api/integrations/shein.js` (112 linhas). Fluxo `official_affiliate_center_link_import`, com validação de HTTPS e domínios SHEIN/OneLink.

## Operações presentes
- Validar domínio e formato de links.
- Importar manualmente link/campanha.
- Criar rascunho pendente para revisão.

## Limitações explícitas
O código não comprova rastreamento/comissão internamente e declara indisponíveis descoberta automatizada, feed de campanhas, geração programática de links e relatórios de comissão/conversão sem API oficial de afiliados.

## Estado
Fluxo manual implementado. Não inventar endpoint nem tratar Open Platform de sellers como API de afiliados.