# Controle de mudanças e documentação obrigatória

## Regra permanente

Toda alteração no Radar Promo Brasil DEVE produzir uma atualização documental na mesma tarefa. Não existe exceção para “mudança pequena”, hotfix, refatoração, ajuste visual, alteração de prompt, troca de configuração, mudança de cron ou correção emergencial. Se a alteração não mudar o comportamento documentado, registrar no changelog técnico que a documentação funcional foi revisada e não exigiu mudança, explicando o motivo.

## Escopo obrigatório

Aplica-se a:
- código de frontend, backend, bibliotecas e rotas;
- contratos de API, payloads, validações e permissões;
- integrações, credenciais (somente nomes/escopos; nunca valores), webhooks e provedores;
- IA, prompts, modelos, fallback, classificadores e limites de consumo;
- banco, schema, índices, constraints, migrações e backfills;
- filas, workers, cron, recorrência, retries, idempotência e publicação;
- categorias, subcategorias, regras, palavras-chave e filtros;
- segurança, autenticação, autorização, privacidade e LGPD;
- interface, navegação, acessibilidade, assets e design system;
- testes, CI, dependências, hospedagem, deploy e rollback;
- a própria documentação.

## O que atualizar em cada mudança

1. Índice e documento de domínio afetado.
2. Registro de mudanças com data, motivação, arquivos/rotas/tabelas afetados e impacto.
3. Contrato operacional/API quando houver mudança de entrada, saída, permissão ou estado.
4. Banco/migração quando schema ou dados mudarem, incluindo estratégia de compatibilidade e rollback.
5. Integração quando mudar provedor, autenticação, endpoint, limites, status ou teste.
6. Operação quando mudar fila, cron, worker, retry, janela, limite ou recuperação.
7. Matriz de testes com testes executados, resultado real e itens não testados.
8. Estado de sincronização GitHub/Hatchable, commit, versão implantada e divergências.

## Registro mínimo por mudança

- Data/hora (UTC) e responsável/agente.
- Solicitação/objetivo e razão técnica.
- Fonte de verdade definida para a tarefa.
- Arquivos, rotas, componentes, tabelas, migrações e configurações afetados.
- Comportamento anterior e novo comportamento.
- Riscos, segurança, compatibilidade e impacto em dados.
- Testes executados e evidências; testes não executados e motivo.
- Deploy: não realizado/realizado, versão, commit e resultado.
- Sincronização: GitHub, Hatchable e estado comprovado.
- Rollback ou recuperação aplicável.

## Fluxo obrigatório

**Antes:** identificar projeto/repositório/branch; consultar commit GitHub e versão Hatchable; comparar arquivos relevantes; definir fonte de verdade; ler regras e documentação do domínio.

**Durante:** fazer mudança mínima e reversível; não sobrescrever divergências; preservar integrações e dados; não executar publicação real, gasto, migração destrutiva ou alteração de segredo sem autorização específica.

**Depois:** atualizar docs na mesma alteração; revisar diff; executar testes apropriados; dry-run; sincronizar explicitamente os arquivos documentais e de código; implantar apenas se autorizado; validar versão/commit e rotas; registrar evidências.

## Critério de conclusão

Uma alteração só pode ser marcada como concluída quando implementação, documentação e evidências estiverem coerentes. Se documentação foi atualizada mas os testes/deploy não foram executados, classificar como “documentado, não homologado”. Se Hatchable e GitHub divergirem, classificar como “documentação/código parcialmente sincronizados” e listar os arquivos.

## Integridade documental

- Não inventar endpoints, limites, respostas, estados, status de integração ou testes.
- Distinguir implementado, configurado, conectado, validado e homologado.
- Datar toda evidência; não reutilizar uma evidência histórica como prova atual.
- Nunca registrar tokens, cookies, chaves, segredos, dados pessoais ou payloads sensíveis.
- Documentação pública nunca deve conter detalhes operacionais privados, IDs de conta, tokens ou informações de segurança exploráveis.
- Alterações em documentos devem atualizar o índice e manter links válidos.

## Modelo de entrada no changelog

| Data UTC | Mudança | Escopo | Testes/evidência | GitHub commit | Hatchable versão | Estado |
|---|---|---|---|---|---|---|
| 2026-11-08 | Instituída política de documentação obrigatória e criada baseline documental | Governança/documentação | Inventário Hatchable v653; dry-run sem erros/avisos | A registrar após commit | v653 (sem deploy documental) | Em reconciliação |
