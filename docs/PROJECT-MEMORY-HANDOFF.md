# Radar Promo Brasil — Memória operacional e handoff

Este documento padroniza a continuidade entre Codex, ChatGPT, revisores e agentes. É memória versionada de projeto, não um banco de dados operacional nem substituto de evidências.

## Fonte da verdade
1. Código e commits no GitHub.
2. Estado/manifesto e deployments do Hatchable.
3. Logs, testes, relatórios e resultados de ferramentas datados.
4. Documentação versionada, incluindo este handoff.
5. Conversas antigas apenas como contexto histórico até reconfirmação.

## Regras
- Não inventar fatos; marcar VERIFICADO, HISTÓRICO, INFERÊNCIA, NÃO VERIFICADO ou BLOQUEADO.
- Nunca registrar tokens, passwords, API keys, cookies, dados pessoais, payloads sensíveis, links privados de acesso ou secrets.
- Atualizar a memória somente com mudanças relevantes, mantendo histórico de decisões e links para evidências.
- Não declarar uma feature pronta sem arquivo/commit, teste ou evidência.
- Não alterar o projeto para "limpar" a memória; preservar pendências, riscos e decisões ainda válidas.
- Separar estado GitHub, Hatchable live, branch/PR, e ambiente de teste.

## Modelo de atualização de handoff
- Data UTC:
- GitHub main commit:
- Branch/PR atual:
- Hatchable live version e data verificada:
- Objetivo/escopo atual:
- Alterações concluídas (com evidências):
- Testes executados e resultado:
- Pendências:
- Bloqueios:
- Riscos/side effects:
- Próxima ação exata:
- Ações explicitamente NÃO realizadas (ex.: deploy, publicação, envio real):

## Regras de continuidade
Antes de continuar um trabalho:
1. Ler `docs/MASTER-CONTEXT.md`, `docs/MASTER-RULES.md`, `docs/HATCHABLE-GITHUB-SYNC-RULE.md` e o documento de auditoria/feature relevante.
2. Verificar o commit atual e estado real do Hatchable.
3. Identificar alterações não integradas e PRs abertos.
4. Revalidar afirmações históricas críticas antes de agir.
5. Atualizar este handoff ao concluir uma etapa significativa.

## Registro desta adoção open source
- 2026-11-21: plano dos cinco projetos integrado ao main no commit `deb355d919751c3803f6290edbf9a8dd464d0762`.
- Cloudflare Security Audit: skill Radar adaptada criada nesta branch; não executa auditoria nem instala dependências.
- ClaudeMem: ainda não instalado. A memória versionada acima é o fluxo de fallback seguro; avaliar ClaudeMem como ferramenta externa de agente antes de adoção.
- Design: `.codex/skills/ui-ux-pro-max/` já existe no main e foi verificada; não duplicar. A integração de design deve consultar essa skill e avaliar Impeccable quando repositório/licença confirmados.
- FreeLLM API: repo exato do vídeo não identificado com confiança; não instalar homônimo. Nenhum provider atual alterado.
- Remotion: protótipo/worker ainda não criado; runtime Hatchable não deve receber renderização pesada sem prova de compatibilidade. Próxima etapa é protótipo externo isolado e synthetic fixtures.
