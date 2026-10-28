# Investigação do REA

Data da execução: 2026-10-27. Escopo restrito ao Cupom Radar público e ferramentas de reconstrução. Nenhum arquivo do Radar Promo Brasil foi modificado.

## Identificação

REA é o projeto [morluto/rea](https://github.com/morluto/rea), distribuído no npm como `rea-agents`, versão local verificada 6.5.0, licença MIT. O ambiente também contém uma ponte local de prévia `rea-mcp-bridge@1.0.0`, que executa o pacote por stdio; a ponte não é o próprio REA. A cópia em cache do pacote e seu `package.json` foram examinados. O Node disponível é v24.22.0, dentro da faixa de engine declarada pelo pacote.

Documentação oficial: [repositório/documentação](https://github.com/morluto/rea), [observação de navegador](https://github.com/morluto/rea/blob/main/docs/browser-observation.md) e [exportação de scripts](https://github.com/morluto/rea/blob/main/docs/website-script-export.md).

## Entradas e saídas confirmadas

- O CLI oferece comandos próprios para inspeção de páginas e captura de navegador; o esquema do cenário define URL, modo de navegador e ações permitidas. A captura executada usou URL pública e browser `launch`, aguardou um `h1` e registrou a URL final, sem anexar perfil, cookies ou sessão existente.
- A observação de navegador pode reter DOM, acessibilidade, metadados de scripts e evidências; o fluxo de CDP não é um navegador remoto genérico.
- `export-web-scripts` consome evidência retida e grava fontes públicas capturadas e manifesto local. Não refaz a navegação nem executa o JavaScript exportado.
- O resultado não é o código-fonte privado do site: são artefatos observáveis e scripts compilados/minificados.

## Testes reproduzíveis

1. `node <cache-do-rea>/bin/rea.mjs --help` — sucesso; confirmou comandos, opções e formato de entrada do CLI.
2. `node <cache-do-rea>/bin/rea.mjs capture-browser-scenario --input <rea-public-home-scenario.json> --output <rea-public-home-capture.json>` — sucesso em modo launch contra a raiz pública. Evidência `ev_bf2d65452953d35840bc6f1b1a993d2e74952e49241a9a7b9911813d3c215b2f`; destino final foi a raiz pública.
3. `node <cache-do-rea>/bin/rea.mjs export-web-scripts --input <evidência histórica local> --output <rea-export-smoke>` — sucesso; exportação local de 111 scripts JavaScript, aproximadamente 1,51 MB. A evidência histórica era uma análise da rota `/dashboard`, e não foi reutilizada como sessão para navegar.
4. Tentativa de conexão do conector Chrome DevTools ao CDP `127.0.0.1:9222` — falhou com conexão recusada. Não havia Chrome/CDP ou ponte na porta 8787 ativos nesta execução. A captura launch do REA funcionou sem esses serviços.

## Limitações da evidência

A análise histórica dos scripts reportou 111 scripts, zero falhas de parse entre os scripts analisados, 392.833 nós AST, 2.953 achados e 95 limitações; esses números descrevem uma análise estática anterior e não provam execução de APIs nem cobertura completa. Não foram encontrados source maps. Parte das respostas e metadados não foi preservada, e a captura sofreu filtros de origem/limites de tamanho. Não há evidência suficiente para recuperar backend, banco, segredos ou implementação original.

Os arquivos `rea-public-home-scenario.json`, `rea-public-home-capture.json` e `rea-export-smoke/` são os artefatos reproduzíveis desta investigação. A captura do dashboard veio de anexo HTML antigo, foi inspecionada estaticamente e não foi reaberta com sua sessão.
