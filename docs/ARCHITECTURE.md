# Arquitetura

## Módulos lógicos
1. Adaptadores de APIs.
2. Descoberta, catálogos, campanhas, pesquisa e cursores.
3. Modelo canônico de produto, oferta, loja e categoria.
4. Validação e segurança.
5. Afiliados e SubIDs.
6. Filas persistentes.
7. Publicação e aprovação.
8. Observabilidade.
9. Resource Manager.
10. Interface administrativa.

## Fluxo
API → captura → normalização → deduplicação → persistência → validação/enriquecimento → link afiliado → aprovação/roteamento → publicação → confirmação/métricas.

## Contratos
Adaptadores não publicam diretamente. Publicadores não executam descoberta como efeito colateral. Workers não dependem de memória temporária. Estado, cursor e credencial de um fornecedor não são compartilhados com outro. Contratos compartilhados são versionados e testados.

## Infraestrutura
Inventariar funções, cron, banco, conexões, armazenamento, filas, timeouts, memória, IA e serviços externos. Não confundir invocação, execução, consulta, token e crédito.

## Escalabilidade
Preferir processamento incremental, lotes limitados pelo orçamento, backpressure, cache com TTL explícito, cursores persistidos e operações em lote. Evitar varredura repetida, polling agressivo e fan-out ilimitado.

Este documento descreve arquitetura-alvo; confirmar cada componente no código antes de classificá-lo como implementado.