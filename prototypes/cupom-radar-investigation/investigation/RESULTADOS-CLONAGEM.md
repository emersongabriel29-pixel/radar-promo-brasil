# Resultados da reconstrução e clonagem

## Resumo

O protótipo independente foi construído manualmente em HTML, CSS e JavaScript, guiado por fluxos públicos da homepage/FAQ e rótulos da captura estática. O Morph gerou apenas uma página placeholder e falhou antes de produzir componentes funcionais. webEmbedding foi testado em modo de auditoria/inspeção, não executou uma clonagem local porque seu classificador marcou a homepage pública como superfície autenticada. AI Website Cloner é um template/workflow para agentes, não um executável de clonagem independente. PROMOLINKS é uma automação de ofertas por n8n, não uma ferramenta de clonagem de páginas.

## Morph

Clone local: `outputs/morph-review`, repositório `mikulgohil/Morph`, commit `ea44cb294e2a4acecf1311e7f72dac02a70865f1`, pacote-fonte declara `morph@2.0.0`, MIT. Instalação foi isolada com scripts desativados. O repositório não tinha lockfile; `npm ci` falhou por esse motivo; foi gerado lock local apenas no clone de revisão e instaladas dependências com `--ignore-scripts`.

Testes: `npm test` falhou por não encontrar arquivos previstos em `tests/**/*.test.ts`; `npm run build:cli` falhou porque `ts-node` é referenciado e não está listado/instalado. Bundle ESM alternativo executou ajuda e iniciou extração de tokens, interações e rota de uma página local de demonstração; geração de componentes falhou com `Dynamic require of "cheerio" is not supported`. Tentativa CommonJS alternativa falhou na interoperabilidade do Chalk (`import_chalk.default.red is not a function`). O arquivo produzido em `morph-demo-output/src/app/page.tsx` é um placeholder com comentário TODO e não renderiza a reconstrução. Portanto, não é clone funcional.

Consulta ao registro npm `npm view morph@2.0.0 ...` retornou E404. Isso confirma que o clone GitHub e pacote npm com esse nome/versão não são equivalentes; não foi executado pacote de terceiros via `npx`.

## webEmbedding

Clone local `outputs/webembedding-review`, projeto `jongko54/webEmbedding`, pacote `web-embedding@0.3.10`, MIT, Node >=18; Python >=3.9. `audit` e `inspect` foram executados contra a URL pública e retornaram HTTP 200. O site respondeu com `X-Frame-Options: SAMEORIGIN` e CSP `frame-ancestors 'self'`, bloqueando reutilização de iframe em outra origem. O classificador sinalizou `authenticated-app-surface`/`needs_session` com confiança alta e identificou Nuxt/Vue; isso é uma limitação/possível falso positivo, pois a homepage pública abriu normalmente. Por essa indicação, a captura de site inteiro não foi iniciada. Relatórios: `webembedding-cupomradar-public-audit.json` e `webembedding-cupomradar-public-inspect.json`.

## AI Website Cloner

Repositório confirmado: `isorobo/website-cloner`, gerado de `JCodesMore/ai-website-cloner-template`; ambos declaram MIT. O código local é um template Next.js e descreve workflow de agente/browser (`/clone-website`), sem CLI/crawler próprio. Inspeção de README, package.json e estrutura confirmou a natureza de template. Não há teste de clonagem executável isoladamente; não foi alegado como testado funcionalmente. Repositórios: [cópia gerada](https://github.com/isorobo/website-cloner) e [template de origem](https://github.com/JCodesMore/ai-website-cloner-template).

## PROMOLINKS

Repositório confirmado: `zHobbit/promolinks-ofertas-whatsapp`, com fluxo descrito de Mercado Livre → deduplicação PostgreSQL → link afiliado → WhatsApp via Evolution API e n8n. Não há licença explícita no clone examinado; não copiar código. Os cinco arquivos JavaScript de nó passaram em parse estático dentro de wrapper assíncrono compatível com Code node. O SQL foi inspecionado, mas não executado. Docker Compose e workflows não foram iniciados. Os documentos descrevem uso de cookies/endpoint interno de afiliado e gateway WhatsApp não oficial, limitações importantes para qualquer reutilização.

## Comparativo e conclusão

Para observação de navegador e exportação de scripts, REA foi a ferramenta mais útil nesta investigação. Para análise rápida de barreiras e cabeçalhos, webEmbedding fornece relatórios, mas bloqueou a clonagem automatizada. Morph tem intenção mais próxima de geração de aplicação, porém a execução atual não produziu código funcional. O template AI Website Cloner serve como instrução para agente, sem motor autônomo. PROMOLINKS pode informar padrões de pipeline de ofertas, mas não tem relação com clonagem de interface.

O protótipo manual está em `prototype/`; testes em `tests/`. Ele demonstra fluxos locais com dados sintéticos e declara desconexão de integrações. Não é implementação do serviço original nem substitui backend, APIs ou autenticação.
