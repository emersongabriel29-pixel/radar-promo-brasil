# Próximos passos: investigação Cupom Radar → Radar Promo

Atualizado em 2026-10-28. Este documento registra a retomada recomendada após salvar e comparar o protótipo isolado. Ele não afirma que o Radar Promo foi atualizado ou implantado.

## Estado confirmado

- O protótipo está isolado no branch GitHub `codex/cupom-radar-prototype`, commit `f5c517d8eadfe4be9451022faede05dcfe483dfc`.
- O protótipo demonstra fluxos de interface com dados fictícios. Ele não tem backend nem conecta marketplaces, afiliados, redes sociais, WhatsApp ou Telegram.
- A comparação está em [COMPARACAO-COM-RADAR-PROMO.md](COMPARACAO-COM-RADAR-PROMO.md). A conclusão é aproveitar padrões de UX e cenários de teste; não juntar/copiar o protótipo inteiro.
- No worktree local `outputs/radar-hardcore-worktree`, há alterações ainda não commitadas em vários módulos e documentação. Entre elas está o CRUD de modelos de mensagem por conta/loja. O estado desse worktree não foi publicado no `main` nem no Hatchable.
- A comparação registrada diz que o Hatchable e o GitHub divergiam. Portanto, não sincronizar nem implantar automaticamente.

## Próxima ação concreta

Fazer uma revisão de escopo do diff do worktree `outputs/radar-hardcore-worktree` antes de incorporar qualquer mudança:

1. Confirmar novamente branch, commit-base e `git status`; preservar todas as alterações locais existentes.
2. Revisar cada arquivo alterado e não rastreado, agrupando por funcionalidade e dependência. Distinguir as mudanças de modelos de mensagem das demais alterações já presentes.
3. Comparar cada grupo com `docs/COMPARACAO-PROTOTIPO-CUPOM-RADAR.md`, `docs/INVENTARIO-ENDPOINTS.md` e `docs/PLANO-RECONSTRUCAO-RADAR.md` do worktree.
4. Para cada grupo, registrar benefício, arquivos, dependências, risco de regressão e evidência de teste. Manter fora qualquer dado fictício, `localStorage` demonstrativo ou estado de integração que não seja real.
5. Priorizar a implementação persistente de modelos de mensagem somente depois de confirmar isolamento por conta, autorização, migration, preview e compatibilidade com os fluxos atuais de ofertas.
6. Validar localmente os testes já pertinentes e corrigir falhas. Não publicar ofertas reais nem executar workflows de produção.
7. Preparar uma mudança revisável, isolada e com rollback. Só depois de revisar a divergência entre GitHub e Hatchable decidir se cabe PR/merge; não fazer deploy nesta etapa.

## Sequência sugerida depois da revisão

| Ordem | Entrega | Aceite mínimo |
| --- | --- | --- |
| 1 | Modelos de mensagem por conta e marketplace | CRUD persistente; validação; autorização; preview; testes de isolamento e regressão |
| 2 | UX dos fluxos de oferta inspirada no protótipo | Adaptada aos componentes/tokens do Radar; estados vazios e erros reais; sem trocar integrações existentes |
| 3 | Normalização, origem e validação de preço/link | Proveniência e timestamp; APIs documentadas; fixtures e testes sem chamadas de produção |
| 4 | Curadoria e deduplicação | Regras verificáveis e persistentes; idempotência; aprovação humana; cobertura de concorrência |
| 5 | Fila, lista, agendamento e histórico | Persistência e transições reais; retries seguros; nenhuma publicação externa em QA |
| 6 | Integrações e saúde operacional | Cada provedor validado separadamente; status baseado em eventos reais; credenciais externas permanecem requisito explícito |

## Regras para não perder trabalho nem confundir estados

- O protótipo continua como referência isolada; não mesclar sua aplicação demonstrativa no Radar Promo.
- Não descartar nem sobrescrever alterações locais. Antes de qualquer cherry-pick, merge ou rebase, salvar um snapshot/branch revisável e inspecionar conflitos.
- Não tratar a presença de uma tela, ferramenta, configuração ou nome de integração como prova de funcionamento.
- Separar `implementado`, `testado localmente`, `validado com sandbox/credenciais` e `implantado` no relatório.
- Não sincronizar GitHub e Hatchable enquanto suas versões e diffs não forem comparados e reconciliados.
- Não fazer deploy, publicar em canais externos, executar workflows de produção ou usar credenciais reais durante os testes.

## Retomada rápida

1. Abra `outputs/radar-hardcore-worktree` e leia seu `git status` e diff completo.
2. Leia os três documentos de comparação/inventário/plano mencionados acima.
3. Revise o módulo de modelos de mensagem e os testes associados como primeiro candidato de integração.
4. Execute apenas os testes locais pertinentes, registre resultados reais e corrija regressões.
5. Apresente o diff revisado em branch/PR separado antes de qualquer integração ao `main`; mantenha o protótipo neste branch.

## Evidências e limitações

Os resultados anteriores de build, auditoria de dependências e testes do worktree estão descritos no histórico desta investigação, mas precisam ser repetidos na retomada depois da revisão do diff. O teste E2E do protótipo valida somente seus próprios fluxos demonstrativos; ele não valida os fluxos do Radar Promo nem integrações externas.

O acesso ao dashboard privado do Cupom Radar, aos contratos internos de API e às configurações privadas não foi estabelecido. A próxima fase deve implementar requisitos próprios a partir de comportamento público e documentação oficial das integrações, sem alegar paridade interna não verificada.
