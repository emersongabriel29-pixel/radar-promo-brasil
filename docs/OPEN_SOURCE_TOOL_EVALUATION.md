# Avaliação e adoção dos 5 projetos open source selecionados

Data: 2026-11-21
Escopo: Cloudflare Security Audit, ClaudeMem, Design Skills (Impeccable/TasteSkill), FreeLLM API e Remotion.
Status: avaliação e plano; não foram instalados executáveis, dependências ou serviços, nem alterada a produção.

## Regras obrigatórias
- Não alterar, excluir ou substituir funcionalidades existentes.
- Não instalar ferramentas indiscriminadamente no runtime Hatchable.
- Não publicar ofertas, enviar mensagens reais, modificar filas ou dados de produção durante testes.
- Confirmar repositório oficial, licença, versão/commit, dependências, permissões, manutenção e threat model antes de adotar.
- Integrações de runtime isoladas, opt-in, com feature flag, fallback e rollback.
- Testes com dados sintéticos; segredos e dados pessoais nunca enviados a provedores não aprovados.
- Toda alteração documentada e sincronizada GitHub/Hatchable; deploy somente depois de auditoria e autorização.

## Matriz de adoção

| Projeto | Aplicação no Radar | Plano | Compatibilidade Hatchable |
|---|---|---|---|
| Cloudflare Security Audit Skill | Auditoria de segurança no ciclo de desenvolvimento | Revisar skill e arquivos auxiliares completos; fixar versão; usar ambiente de agente separado, inicialmente somente leitura e sem execução do alvo. Criar checklist recorrente e registrar findings com evidências. | Não é dependência de runtime; usar no ambiente de desenvolvimento. |
| ClaudeMem | Memória persistente para agentes que trabalham no Radar | Avaliar armazenamento, retenção, privacidade, dependências e compatibilidade. Até aprovação, usar memória versionada do projeto: estado atual, decisões, auditorias, changelog e handoff. Não duplicar nem contradizer docs existentes. | Não instalar no servidor Hatchable. |
| Design Skills (Impeccable / TasteSkill) | UX/UI do painel e interfaces | Confirmar repositórios oficiais exatos antes de importar. Revisar licença e conteúdo. Aplicar em branch isolada, primeiro em uma tela piloto, comparando screenshots e preservando navegação, responsividade e comportamento. | Skill de desenvolvimento, não runtime. |
| FreeLLM API | Provider/gateway experimental de modelos | O nome do repositório citado não foi identificado com confiança. Não instalar clone homônimo. Confirmar URL exata; revisar endpoints, quotas, logging, autenticação e tratamento de dados. Testar com dados sintéticos atrás de feature flag; Gemini e providers atuais permanecem intactos. | Somente se API HTTP compatível e segura; validar limites/timeouts. |
| Remotion | Renderização de vídeos de ofertas | Projetar worker isolado; validar licença, requisitos Node/Chromium/FFmpeg, memória, armazenamento, concorrência e custos. Protótipo offline com ofertas sintéticas, templates e saída vertical/horizontal. Só conectar à fila depois de testes e aprovação. | Renderização não deve ocorrer no runtime Hatchable atual sem comprovação de compatibilidade. |

## Implementação em fases

### Fase 0 — Identidade e segurança dos repositórios
- [ ] Confirmar URLs oficiais dos cinco projetos (incluindo qual FreeLLM API, Impeccable e TasteSkill são os citados).
- [ ] Revisar licença, commit/tag, releases e arquivos de instalação.
- [ ] Registrar dependências, permissões, chamadas externas, riscos de supply-chain e privacidade.
- [ ] Não executar scripts de instalação de terceiros no ambiente de produção.

### Fase 1 — Segurança
- [ ] Integrar Cloudflare Security Audit ao fluxo de auditoria de desenvolvimento, sem tocar produção.
- [ ] Produzir checklist adaptado às APIs, autenticação, secrets, SSRF, webhooks, filas, uploads, acesso a dados e controles de publicação do Radar.
- [ ] Findings precisam apontar arquivo/linha, evidência, severidade, risco e correção sugerida.
- [ ] Confirmar falso positivos e regressões antes de qualquer correção.

### Fase 2 — Memória
- [ ] Auditar ClaudeMem e compatibilidade com ambiente de agente.
- [ ] Manter como fonte da verdade a documentação versionada do Radar.
- [ ] Criar processo de handoff que atualize estado, decisões, riscos, commits, deployments e pendências.
- [ ] Não armazenar secrets, tokens, dados pessoais ou conteúdo desnecessário.
- [ ] Se ClaudeMem não for seguro/compatível, adotar o fluxo versionado sem instalar.

### Fase 3 — Design
- [ ] Identificar exatamente as skills do vídeo.
- [ ] Auditar conteúdo e licença; importar somente arquivos necessários e revisados.
- [ ] Selecionar tela piloto sem alterar a interface live.
- [ ] Avaliar acessibilidade, contraste, mobile, performance e consistência.
- [ ] Comparar visual e funcionalmente antes de abrir PR.

### Fase 4 — IA alternativa
- [ ] Confirmar projeto FreeLLM API correto.
- [ ] Testar disponibilidade, limite, privacidade, modelo, rate-limit e timeout.
- [ ] Criar adapter isolado e feature flag desativada por padrão.
- [ ] Testar classificação, texto e fallback com dados sintéticos.
- [ ] Não mudar Gemini nem automatizações/publicações existentes.
- [ ] Nunca enviar tokens/segredos, dados pessoais, dados privados de afiliados ou informação confidencial para endpoints não aprovados.

### Fase 5 — Vídeos
- [ ] Prototipar Remotion em ambiente externo/isolado, sem conexão com produção.
- [ ] Criar template de vídeo de oferta com dados sintéticos, branding, preço, economia, CTA e formatos.
- [ ] Medir render, memória, tamanho, armazenamento e falhas.
- [ ] Definir serviço/worker, autenticação, limite de jobs, retries e limpeza.
- [ ] Só integrar a geração de vídeos ao Radar após testes, orçamento/limites e aprovação explícita.

## Critérios de conclusão
Cada integração só será considerada concluída com: origem oficial verificada; licença revisada; commit fixado; documentação; testes reproduzíveis; evidências; feature flag/fallback/rollback quando aplicável; auditoria de regressão; PR revisado. Nenhum item será descrito como instalado ou funcional antes de comprovação.

## Links conhecidos
- Cloudflare Security Audit Skill: https://github.com/cloudflare/security-audit-skill
- ClaudeMem: https://github.com/thedotmack/claude-mem
- Remotion: https://github.com/remotion-dev/remotion

Os repositórios exatos de FreeLLM API e das skills de design não foram confirmados; não usar repositórios homônimos sem validação.


## Execução inicial (2026-11-21)

- Criada skill adaptada `.codex/skills/radar-security-audit/SKILL.md` com escopo Radar, metodologia source-first, evidências, validação sintética e proibições de ações reais.
- Criado `docs/PROJECT-MEMORY-HANDOFF.md` como protocolo versionado de continuidade; ClaudeMem não instalado.
- Confirmada a skill existente `.codex/skills/ui-ux-pro-max/`; evitar duplicidade. Repositórios exatos Impeccable/TasteSkill ainda precisam ser identificados.
- Criado `docs/OPEN_SOURCE_ADOPTION_IMPLEMENTATION.md` para estado, critérios e próximos passos.
- FreeLLM API não identificada com confiança. Não instalar clones homônimos.
- Remotion permanece fora do runtime Hatchable; protótipo de worker exige ambiente isolado e avaliação de licença/infra.
- Nenhuma dependência, arquivo de aplicação, banco, fila, canal, segredo ou deployment foi alterado.


## Protótipo Remotion (2026-11-21)

Foi criado em branch separada `codex/remotion-offer-video-prototype-20261121` o scaffold isolado `prototypes/remotion-offer-video/`: package com Remotion 4.0.545 pinado, composição vertical/horizontal de 15s/30fps, título, loja fictícia, preço antigo/atual, desconto, economia, cupom e CTA. Não foi instalado, não possui lockfile, não foi renderizado/testado e não foi integrado à aplicação/Hatchable. Requer revisão de licença/termos, instalação isolada, lockfile, render de fixture e medição antes de qualquer worker ou integração.


## Repositórios oficiais identificados (2026-11-21)

- Impeccable: https://github.com/pbakaus/impeccable — Apache-2.0. Não importar CLI/scripts de instalação automaticamente; skill Radar adaptada prioriza UI UX Pro Max já instalada.
- Taste Skill: https://github.com/Leonxlnx/taste-skill — MIT. Skill Radar adaptada com design-review para dashboard, sem importar hooks/scripts executáveis.
- FreeLLMAPI: https://github.com/tashfeenahmed/freellmapi — MIT; self-hosted Node/Docker + dashboard/SQLite, mas README declara personal experimentation/learning, não produção. Não usar como provider de produção nem expor endpoint sem revisão de ToS/security. Avaliar apenas em ambiente isolado de laboratório, com dados sintéticos.
- Remotion: release upstream consultada v4.0.545; protótipo isolado foi criado e mergeado (commit 3290121...). Ainda não instalado/renderizado.
