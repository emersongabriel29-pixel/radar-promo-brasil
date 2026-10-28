# Auditoria das ferramentas

| Ferramenta | Origem/licença | Entrada/uso verificado | Resultado | Limitação |
|---|---|---|---|---|
| REA (`rea-agents`) | `morluto/rea`, MIT, v6.5.0 local | CLI help; captura launch em URL pública; export de evidência histórica | Captura concluída; exportou 111 JS | CDP indisponível; evidência estática não prova execução de API |
| Morph | `mikulgohil/Morph`, MIT, commit local registrado | Clone local servido por Playwright; CLI/help e pipeline clone em builds alternativos | Tokens/interações/rota parcialmente extraídos; página gerada é placeholder | CLI documentado falha por `ts-node`; ESM/CommonJS quebram em cheerio/Chalk; sem testes no checkout |
| webEmbedding | `jongko54/webEmbedding`, MIT, `web-embedding@0.3.10` | `audit` e `inspect` somente leitura no site público | HTTP 200; cabeçalhos e classificação capturados | Classificador marca homepage pública como app autenticado; frame bloqueado pela política do site |
| AI Website Cloner | `isorobo/website-cloner` gerado de `JCodesMore/ai-website-cloner-template`, MIT | README, package, árvore e instruções examinados | Template Next.js para agente identificado | Sem comando de clonagem autônomo; não testável como produto independente |
| PROMOLINKS | `zHobbit/promolinks-ofertas-whatsapp`; sem licença explícita localizada | README/workflow/código examinados; parse de 5 nós JS dentro de wrapper async | 5/5 nós parseiam; ver `promolinks-static-check.json` | Nenhum workflow executado; SQL não executado; integrações de envio não testadas |

## Execução segura

Morph foi instalado apenas no clone de revisão, com `npm ci --ignore-scripts --no-audit`; não foi instalado no Radar Promo. O Playwright usou servidor local e página de demonstração. PROMOLINKS não teve Docker iniciado, nenhum token lido ou API chamada. webEmbedding acessou somente a página pública e não tentou reutilizar sessão. REA iniciou navegador sem perfil persistente e exportou evidência local já retida.

## Dependências e pacote

Node do ambiente: v24.22.0; npm v11.19.1. `web-embedding@0.3.10` foi confirmado no registro npm com licença/repositório/engine. A consulta `morph@2.0.0` retornou E404, enquanto o repositório clone declara esse nome/versão; o repositório não oferece evidência de que haja pacote npm correspondente. Morph não tinha lockfile no clone original. As instalações ocorreram com scripts de lifecycle desativados.

## Alternativas relevantes

Playwright foi usado para observação pública e teste do protótipo, com controle explícito de página e viewport. A captura REA e o Playwright se complementaram: REA gerou evidência de observação/exportação; Playwright reproduziu interação pública e os fluxos do protótipo. Nenhuma ferramenta demonstrou recuperar backend ou código-fonte privado.
