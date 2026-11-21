# Avaliação de ferramentas open source para o Radar Promo Brasil

Data: 2026-11-21
Status: avaliação inicial; nenhum pacote externo foi instalado nem executado.

## Regras
- Não instalar ferramentas indiscriminadamente no runtime Hatchable.
- O Radar roda em ambiente gerenciado: ferramentas locais de desktop, TV, voz, Docker ou renderização que exijam binários/daemon/child_process não são compatíveis sem arquitetura externa aprovada.
- Não publicar, enviar mensagens reais, consumir cotas pagas, alterar fila ou dados de produção durante avaliação.
- Verificar repositório oficial, licença, dependências, permissões, manutenção, requisitos e threat model antes de integrar.
- Integrações devem ser isoladas, opt-in, documentadas, com feature flag e testes; preservar APIs, filas e comportamento existentes.
- Toda mudança deve seguir a sincronização GitHub/Hatchable e passar por auditoria, testes e dry-run antes de deploy.

## Matriz inicial

| Ferramenta do vídeo | Uso possível | Decisão inicial |
|---|---|---|
| Rhea / Craft Anything | Engenharia reversa/reconstrução de software | Não integrar ao runtime. Só usar em análise de código próprio e com autorização/licença. |
| Voice Studio / VoiceBox | Voz local, TTS, clonagem e transcrição | Não integrar ao Hatchable. Requer avaliar execução local/serviço externo, GPU, consentimento e direitos de voz. |
| Clean Your TV / TV Detox | Debloat Android TV/Google TV | Sem relação com o produto Radar. Não instalar. |
| FreeLLM API | Gateway a provedores de LLM com quotas gratuitas | Investigar como opção de provider isolado. Não enviar dados pessoais/segredos/ofertas privadas a provedores não aprovados. Verificar disponibilidade, limites, licença e segurança antes de teste. |
| Hallmark / Impeccable / TasteSkill | Skills de design para agentes de programação | Avaliar como ferramentas de desenvolvimento; não são dependências do aplicativo. Aplicar somente em branch/PR e preservar UI/UX existente. |
| Remotion | Renderização programática de vídeo | Possível serviço de renderização externo/worker isolado. Não executar dentro do runtime Hatchable sem validação de compatibilidade, custo, limites e arquitetura. |
| OpenShot / ReScript | Edição de vídeo local/transcrição | Não integrar diretamente ao runtime. Requer binários/ambiente de processamento e análise de licenças. |
| ClaudeMem / AI Memory | Memória de sessões de agente | Priorizar avaliação de memória de projeto baseada em documentação versionada, não coleta automática irrestrita. Verificar armazenamento, retenção, dados sensíveis, compatibilidade e licença. |
| Fluid Voice / Hex | Ditado local | Ferramenta de workstation, não runtime do Radar. Não integrar. |
| Cloudflare Security Audit Skill | Auditoria de segurança assistida por agente | Prioridade de avaliação para o fluxo de desenvolvimento; requer instalar o skill completo no ambiente do agente, verificar todos os arquivos e seguir sandbox/execução segura. Não é uma dependência da aplicação. |

## Prioridades recomendadas

1. **Segurança do código:** usar a skill oficial Cloudflare Security Audit em ambiente de agente de desenvolvimento, após conferir todo o conteúdo, arquivos auxiliares e licença. A auditoria deve ser somente leitura inicialmente, sem executar código do alvo nem testar endpoints de produção.
2. **Memória de projeto:** manter decisões, estado, auditorias e próximos passos em arquivos versionados existentes; avaliar ferramenta externa apenas após análise de privacidade e risco de duplicar/contradizer a documentação.
3. **Design:** avaliar skills no ambiente Codex/Cursor/Claude em uma branch separada; nenhum pacote de runtime.
4. **Vídeo:** elaborar arquitetura de worker isolado para Remotion apenas se houver necessidade confirmada de vídeo automático, limites e armazenamento. O app atual gera roteiros/arte, mas não deve passar a renderizar vídeos sem testes e orçamento.
5. **LLM gateway:** investigar FreeLLM API como provider experimental com feature flag e dados sintéticos. Não substituir Gemini/fallback atual nem afetar classificação ou publicação automática.

## Checklist antes de qualquer integração
- [ ] URL oficial e proprietário verificados.
- [ ] Licença compatível verificada.
- [ ] Commit/tag fixado (não instalar latest sem pin).
- [ ] Dependências, scripts e arquivos de instalação revisados.
- [ ] Permissões e chamadas de rede documentadas.
- [ ] Risco de prompt injection e exfiltração avaliado.
- [ ] Testes em branch isolada e dados sintéticos.
- [ ] Feature flag / fallback / rollback documentados.
- [ ] Nenhuma alteração de fila ou publicação real.
- [ ] Documentação atualizada e evidência dos testes anexada.

## Fonte inicial
- Cloudflare Security Audit Skill: https://github.com/cloudflare/security-audit-skill
- Remotion: https://github.com/remotion-dev/remotion
- Claude Mem: https://github.com/thedotmack/claude-mem

Os nomes e números de estrelas mencionados no vídeo não foram todos confirmados. Esta matriz não afirma que os projetos estejam instalados, aprovados ou executados.
