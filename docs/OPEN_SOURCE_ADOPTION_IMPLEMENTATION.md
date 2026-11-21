# Implementação dos cinco projetos open source no Radar

Data: 2026-11-21. Branch de implementação; alterações ainda não integradas/deployadas.

## Status de adoção

| Projeto | Adoção real nesta etapa | Próxima ação | Estado |
|---|---|---|---|
| Cloudflare Security Audit | Skill Radar adaptada em `.codex/skills/radar-security-audit/SKILL.md`; links e commit upstream registrados. | Usar em auditoria source-first isolada; validar workflow e coverage manualmente. | Skill local versionada; não executada |
| ClaudeMem | Implementado handoff/memória versionada em `docs/PROJECT-MEMORY-HANDOFF.md`. | Avaliar ClaudeMem upstream, armazenamento, privacidade, licença e dependências; não duplicar docs. | Memória de projeto pronta; ClaudeMem não instalado |
| Impeccable/TasteSkill | Reaproveitar UI UX Pro Max já existente em `.codex/skills/ui-ux-pro-max/`. | Confirmar repos exatos de Impeccable/TasteSkill; testar em tela protótipo e comparar acessibilidade/mobile. | Skill existente; ferramentas extras pendentes |
| FreeLLM API | Nenhuma instalação; pesquisas não identificaram com segurança o repo citado. | Solicitar/identificar URL exata; auditar API, licença, quotas, privacy e OpenAI-compatibilidade. | Bloqueado por identidade |
| Remotion | Protótipo isolado em `prototypes/remotion-offer-video/`: composition vertical/horizontal, 15s/30fps, dados sintéticos, preço/desconto/economia/cupom/CTA. Remotion/CLI pin 4.0.545. | Revisar licença/uso, gerar lockfile, instalar e renderizar em worker isolado; medir recursos e validar layout. | Código protótipo versionado; não instalado, não renderizado e não integrado |

## Segurança e compatibilidade
- Hatchable runtime possui restrições de build/dependências; não adicionar React/Remotion/Chromium/FFmpeg ao runtime.
- Skills de agente ficam no repositório de desenvolvimento e não são expostas ao público/runtime.
- Qualquer provider de IA novo fica atrás de feature flag e não substitui Gemini nem os providers existentes.
- Nenhum teste usa offers reais, secrets, produção, canais, fila, credenciais, API paga ou publica conteúdo.
- Repositórios e releases precisam ser identificados por URL oficial e commit/tag fixado. Não instalar clones homônimos.

## Critérios de aceite
- Skill de segurança: metodologia, escopo Radar, cobertura, no-go e evidência definidos.
- Memória: handoff versionado com estado, evidências, pendências e ações não executadas.
- Design: usar skill existente, não duplicar; mudanças visuais em branch/PR e revisão de mobile/accessibility.
- FreeLLM: provider isolado, dados sintéticos, timeout/rate-limit, sem logging de prompts sensíveis, fallback e opt-in.
- Remotion: protótipo fora do Hatchable, licença verificada, limites de recursos, storage, concorrência, cleanup e rollback definidos.
- Documentação sincronizada GitHub; Hatchable só recebe arquivos de aplicação compatíveis, sem deploy de documentação/skills.

## Upstream links
- Cloudflare Security Audit Skill: https://github.com/cloudflare/security-audit-skill (reviewed commit `c1c8a8c1471069fb0e188eeaff69b8e8db6564a8`)
- ClaudeMem: https://github.com/thedotmack/claude-mem
- Remotion: https://github.com/remotion-dev/remotion
- UI UX Pro Max: existing local skill; provenance tracked in `.codex/skills/ui-ux-pro-max/provenance.json`.

FreeLLM API, Impeccable and TasteSkill exact upstream repos remain unconfirmed.


## Auditoria source-only inicial (2026-11-21)

- Hatchable manifest listou 136 funções; 127 rotas API e 9 páginas internas.
- Busca no código Hatchable encontrou declaração `export const access` em 127/127 arquivos API (a contagem inicial de 114 foi causada por glob que não cobria arquivos no root `api/`; a busca ampla foi refeita e confirmou 127). Isso confirma declaração de tier, não valida autorização de cada handler.
- Busca por chamadas `eval(`, `new Function` e `child_process` em `api/**/*.js`: nenhum match no scan realizado.
- Foram localizados fetches com URLs fornecidas/derivadas; os casos amostrados `api/ai/media.js`, `api/ai/vision-review.js` e `api/ai/video-ia.js` implementam validação de HTTPS/domínio e redirecionamentos manuais. `api/clone/inspect.js` valida HTTPS e allowlist, e no trecho analisado apenas reconhece/inspeciona o link; não faz fetch do link submetido.
- **Não é uma auditoria completa.** Sem execução de código, testes, revisão de todas as 127 rotas, DB/RLS, secrets, callbacks, jobs e frontend. Nenhuma vulnerabilidade confirmada nesta triagem. Pendências permanecem para auditoria completa e validação segura.
- Nenhum dado de produção foi alterado; nenhum endpoint live foi testado.
