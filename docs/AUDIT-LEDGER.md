# Radar Promo Brasil — livro-razão de auditorias

> Registro cronológico e append-only. Não apagar nem reescrever entradas anteriores. Corrigir informações por novo adendo datado, com referência à entrada original e evidência que motivou a correção.

## Como utilizar

1. Criar uma entrada por auditoria ou etapa de auditoria.
2. Registrar o escopo e o estado real observado antes de começar.
3. Distinguir **VERIFICADO**, **HISTÓRICO**, **INFERÊNCIA**, **NÃO VERIFICADO**, **BLOQUEADO** e **FALHOU**.
4. Registrar fontes, caminhos, commits, versões, horários e resultados.
5. Não marcar como concluído o que não foi executado e comprovado.
6. Não misturar resultados de ambientes diferentes.
7. Não incluir tokens, senhas, cookies, chaves privadas ou dados pessoais.
8. Registrar também auditorias sem alterações e explicar por que nenhuma alteração foi necessária.
9. Ao retomar uma auditoria, consultar a última entrada e continuar da próxima etapa não concluída.
10. Ao encontrar evidência que contradiga uma conclusão anterior, criar adendo; não apagar o histórico.

## Modelo de entrada

Copie este modelo para cada nova auditoria:

### AUD-[AAAA-MM-DD]-[identificador] — [título]

- **Data/hora e fuso:**
- **Responsável/agente:**
- **Status:** NÃO INICIADA | EM ANDAMENTO | CONCLUÍDA | PARCIALMENTE CONCLUÍDA | BLOQUEADA
- **Objetivo:**
- **Escopo incluído:**
- **Escopo excluído:**
- **Restrições/autorização aplicável:**
- **Estado inicial GitHub:** branch, commit e fontes.
- **Estado inicial Hatchable:** projeto, versão, deployment e fontes.
- **Estado inicial de dados/filas:** consultas, horário e limitações.
- **Etapas executadas:**
- **Etapas não executadas:**
- **Evidências:** caminhos, hashes, logs, IDs, resultados e horários.
- **Fatos verificados:**
- **Fatos históricos ainda não reconfirmados:**
- **Inferências/hipóteses:**
- **Itens não verificados/bloqueados:**
- **Problemas encontrados:**
- **Causa raiz confirmada ou ainda hipotética:**
- **Arquivos analisados:**
- **Arquivos alterados:**
- **Impacto e efeitos colaterais previstos:**
- **Efeitos colaterais observados:**
- **Testes executados e resultados:**
- **Funcionalidades preservadas/regressões verificadas:**
- **Commit resultante:**
- **Versão/deploy resultante:**
- **Divergências GitHub ↔ Hatchable:**
- **Riscos e pendências:**
- **Próxima etapa exata:**
- **Referências a entradas anteriores:**

---

## Registro inicial — criação da estrutura de continuidade

### AUD-2026-11-07-DOCS — Criação dos documentos de contexto e rastreabilidade

- **Data:** 07/11/2026.
- **Status:** PARCIALMENTE CONCLUÍDA até a confirmação de todos os commits e da leitura posterior dos arquivos.
- **Objetivo:** criar a estrutura documental permanente para preservar contexto, registrar auditorias e controlar impactos de mudanças.
- **Escopo:** criação de `docs/MASTER-CONTEXT.md`, `docs/AUDIT-LEDGER.md` e `docs/CHANGE-IMPACT-LOG.md`.
- **Restrições:** nenhuma alteração de código de aplicação, banco, migrations, integrações, filas, credenciais, agendamentos ou publicação; nenhum deploy.
- **Estado inicial GitHub verificado:** branch `main`; último commit observado antes da criação: `2d34776aaf12ee14f1f639546ab52eaf00dce7e9`.
- **Estado inicial Hatchable verificado:** projeto `proj_1Xj94QxQmCam`; versão live observada 638; deployment indicava 269 arquivos e 129 funções. Inventário de arquivos indicava 270 itens.
- **Arquivos existentes consultados:** `README.md`, `docs/HATCHABLE-GITHUB-SYNC-RULE.md`, `docs/RELEASE.md`, `docs/AUDITORIA-2026-09-30.md`.
- **Verificação de existência:** os três caminhos novos não existiam no GitHub antes da criação. O inventário Hatchable consultado não listou pasta `docs/`.
- **Limitação:** a interface Hatchable disponível nesta sessão documenta escrita somente em `public/`, `api/`, `migrations/` e arquivos específicos de configuração; portanto, não foi usado um caminho alternativo público para simular documentação privada.
- **Impacto previsto:** somente documentação versionada no GitHub; sem impacto esperado no runtime da aplicação.
- **Testes:** nenhum teste npm executado, pois esta etapa é exclusivamente documental e não altera código executável. A validação apropriada é confirmar os três arquivos no branch e reler seu conteúdo.
- **Deploy:** não realizado nem solicitado.
- **Pendências:** confirmar os três commits/arquivos no GitHub, reler o conteúdo gravado e registrar o estado final; Hatchable permanece sem cópia destes documentos.
- **Próxima etapa:** validar os arquivos no GitHub e registrar os SHAs/commits resultantes. Não fazer deploy para distribuir documentação.

## Adendos

Nenhum adendo registrado até o momento.


### Adendo 2026-11-07 — confirmação da criação

- Os três arquivos foram relidos com sucesso no GitHub `main` após a criação.
- Commit de criação de `docs/MASTER-CONTEXT.md`: `9746a283c53f6b2e2a03168cc2e0e8f6bba3345b`.
- Commit de criação de `docs/AUDIT-LEDGER.md`: `f8d12b52f24f4dff625ddf9b79785f217ce831d7`.
- Commit de criação de `docs/CHANGE-IMPACT-LOG.md`: `85e2a4f8fdeea2fcf4ca4e217110fe7ad08375de`.
- Último commit observado após a criação: `85e2a4f8fdeea2fcf4ca4e217110fe7ad08375de`.
- Resultado: criação documental confirmada no GitHub. A pendência de confirmação dos arquivos foi encerrada.
- Hatchable permanece na versão 638; os documentos não foram copiados para lá porque o destino `docs/` não apareceu no inventário e a interface de escrita disponível não aceita esse caminho. Nenhum deploy foi realizado.
- Testes npm não foram executados porque não houve alteração de código executável. Nenhuma afirmação de validação funcional do aplicativo é feita.
