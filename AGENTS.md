# Radar Promo Brasil

Antes de mudanças de interface, leia `.codex/skills/ui-ux-pro-max/SKILL.md` e `design-system/radar-promo-brasil/MASTER.md`. A skill é vendorizada; não exige instalar um serviço externo ou enviar dados do projeto.

Preserve a identidade azul, as sete áreas de navegação e todos os recursos: conteúdo, IA e crescimento ficam nas abas de Ofertas. Preserve o isolamento por `account_id`, credenciais vinculadas à conta e os padrões conservadores do autopilot (score 85, desconto 15%, cinco publicações/dia, cooldown de 120 minutos).

Use o SDK Hatchable nos arquivos implantáveis. O servidor Express e o diretório `hatchable/` são apenas o adaptador standalone; a hospedagem usa seu próprio SDK. Migrações já aplicadas são imutáveis: crie migrações adicionais.

Valide com `npm run build`, `npm test`, `npm run test:e2e` e `npm audit --audit-level=moderate`. O teste de navegador usa banco em memória e desativa o scheduler. Não faça envios reais nem altere segredos durante os testes. Não declare uma integração validada pela simples existência de configuração.
