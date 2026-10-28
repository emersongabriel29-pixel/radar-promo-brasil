# Arquivo da investigação

Esta pasta reúne os relatórios, scripts próprios e evidências sanitizadas usados para produzir e avaliar o protótipo.

## Relatórios

- `REA-INVESTIGACAO.md` — identificação e uso do REA.
- `ANALISE-CAPTURA-HTML.md` — estrutura observável da captura fornecida e sanitização.
- `INVENTARIO-FRONTEND.md` e `INVENTARIO-FUNCIONAL.md` — interface, rotas e recursos observáveis.
- `AUDITORIA-FERRAMENTAS.md` e `RESULTADOS-CLONAGEM.md` — verificações e resultados reais das ferramentas.
- `ARQUITETURA-INFERIDA.md` — hipóteses separadas de fatos observados.
- `LIMITACOES-E-BLOQUEIOS.md` — limites de acesso e itens não confirmados.
- `ESPECIFICACAO-PROXIMA-FASE.md` — capacidades e contratos necessários para uma eventual implementação própria.
- `PROTOTIPO-README.md` — escopo, execução e resultados dos testes do protótipo.

## Evidências incluídas

`evidence/` contém observações públicas, relatórios de análise e cenários REA com a política de inspeção anônima. `evidence/rea-export-manifest.json` registra o manifesto sanitizado da captura histórica sem incluir os arquivos JavaScript do site. `tool-output/morph-demo-output/` preserva o placeholder produzido pelo Morph para documentar que aquela tentativa não gerou um clone utilizável.

Os scripts próprios para analisar HTML, observar páginas públicas e fazer parse estático dos nós PROMOLINKS estão em `scripts/`. A observação de páginas públicas requer Chrome/Chromium e Playwright. O parser de HTML requer um arquivo fornecido explicitamente. O verificador PROMOLINKS requer um checkout separado do repositório-alvo, no caminho indicado no próprio script; ele só analisa sintaxe e não executa os nós.

## Conteúdo deliberadamente não versionado

O branch contém todos os arquivos do protótipo, testes, documentação e evidências sanitizadas produzidos para esta investigação. Ele não contém `node_modules`, clones de dependências, o código JavaScript extraído do site de referência, cookies, tokens, credenciais, o HTML original anexado nem screenshots da interface do site de referência. As duas capturas do protótipo estão em `../screenshots/`.
