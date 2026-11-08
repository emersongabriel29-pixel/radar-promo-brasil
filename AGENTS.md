# Radar Promo Brasil

Antes de mudanças de interface, leia `.codex/skills/ui-ux-pro-max/SKILL.md` e `design-system/radar-promo-brasil/MASTER.md`. Preserve a identidade visual azul, as sete áreas de navegação e os recursos existentes. Preserve o isolamento por `account_id`, credenciais vinculadas à conta e o isolamento entre integrações.

## Regra normativa: Regra Master e fluxos

Leia obrigatoriamente `docs/REGRA-MASTER-E-FLUXOS-PONTA-A-PONTA.md` e `docs/CONTROLE-DE-MUDANCAS.md` antes de alterar descoberta, importação, classificação, IA, links afiliados, autopilot, filas, publicação ou scheduler.

**Não aplicar score mínimo, desconto mínimo, comissão mínima, avaliação mínima, limite diário comercial, cooldown comercial ou filtro interno por categoria, subcategoria, nicho ou produto +18.** Score e métricas são sinais informativos de ordenação e relatórios. Produto +18 não deve ser bloqueado pela categoria. Toda oferta capturada deve ser preservada e encaminhada ao fluxo, sem rejeição silenciosa ou pendência indefinida.

A única limitação interna de processamento é a capacidade real da hospedagem. Proteger quotas, tempo de execução, transações, memória e concorrência com lotes adaptativos, paginação, cursor persistido, checkpoint, lease, idempotência, backoff e retomada automática. Nunca descartar oferta por quota e nunca criar um one-shot por produto. A limitação da hospedagem controla o ritmo, não a elegibilidade.

Falhas temporárias, dados ausentes, IA indisponível, falta de imagem/preço auxiliar, link ainda não convertido ou destino desconectado devem preservar o registro e produzir recuperação/diagnóstico. Não inventar dados nem marcar como publicado sem receipt. Respeitar leis, termos oficiais, autorização, autenticação e limites documentados dos provedores/canais; não contornar proteções. Duplicatas devem ser consolidadas sem perda de variantes, fontes, links, SubIDs, histórico ou eventos.

## Plataforma e dados

Use o SDK Hatchable nos arquivos implantáveis. O servidor Express e o diretório `hatchable/` são apenas o adaptador standalone; a hospedagem usa seu próprio SDK. Migrações já aplicadas são imutáveis: crie migrações adicionais. Nunca fazer atualização destrutiva em massa sem snapshot, reconciliação, idempotência e rollback.

## Testes e publicação

Valide com `npm run build`, `npm test`, `npm run test:e2e` e `npm audit --audit-level=moderate` quando os scripts existirem. O teste de navegador usa banco em memória e desativa o scheduler. Não faça envios reais nem altere segredos durante os testes. Não declare uma integração validada pela simples existência de configuração ou rota.

## Regra obrigatória: Hatchable ↔ GitHub

Antes e depois de qualquer alteração, siga [`docs/HATCHABLE-GITHUB-SYNC-RULE.md`](docs/HATCHABLE-GITHUB-SYNC-RULE.md). Nunca presuma sincronização automática: compare arquivos/versões, defina a fonte de verdade, reconcilie divergências sem sobrescrever mudanças e confirme commit/versão implantada. Se equivalência não puder ser verificada, informe divergência e não declare sincronização.

## Regra obrigatória: documentação em toda alteração

**Toda alteração no Radar Promo Brasil deve atualizar a documentação na mesma tarefa, sem exceção por tamanho ou urgência.** Isso inclui código, API, interface, configurações, integrações, credenciais (somente nomes/escopos, nunca valores), banco/migrações, categorias, prompts/Gemini, filas, workers, cron, segurança, privacidade, testes, CI, deploy e rollback.

Antes de alterar, consulte `docs/INDICE.md` e `docs/CONTROLE-DE-MUDANCAS.md`, compare o estado real do GitHub e Hatchable e defina a fonte de verdade. Depois, atualize o índice/documento do domínio, registre data, motivo, arquivos/rotas/tabelas afetados, comportamento anterior/novo, riscos, testes e resultados, commit, versão Hatchable, sincronização e rollback. Se a documentação funcional não mudar, registre revisão e justificativa. Não declare concluído enquanto código, documentação e evidências não estiverem coerentes. Nunca registrar tokens, cookies, segredos ou dados pessoais.

A documentação completa deve permanecer versionada em `docs/` no GitHub e espelhada no diretório privado `lib/documentation/` do Hatchable. O manifesto Hatchable `AGENTS.md` é gerado automaticamente e não deve ser editado manualmente.
