# Recuperação de arquivos de runtime do Hatchable — 24/11/2026

## Objetivo
Repor no GitHub os dois arquivos de runtime presentes no manifesto e no código live do Hatchable v672, mas ausentes da branch main consultada em 24/11/2026.

## Fonte e integridade
- Hatchable project: `proj_1Xj94QxQmCam`
- Deployment de produção preservado: v672
- Base GitHub: `b77f61cd6585dd049a7417d9c556cbfe2dbb7a50`
- `api/public/offers-feed.js`: SHA-256 de origem `5ca0dba386ef2a728fd056f6d83ed75270e6bbf01809ac14759623fa8442d16c`, 82 linhas.
- `lib/feed-images.js`: SHA-256 de origem `05e01b9eda4f06b766e7cac723c27fa8f6f7aeed77948f7f0d6b8357e1cad596`, 12 linhas.

Os conteúdos foram recuperados literalmente do projeto Hatchable; não foram reescritos nem adaptados.

## Segurança e escopo
- Nenhuma configuração ou segredo foi lido ou alterado.
- Nenhuma consulta de dados operacionais foi executada.
- Nenhuma publicação, fila, scheduler, migration ou banco foi alterado.
- Nenhum deploy, merge ou cutover foi realizado.
- O feed permanece com autenticação Bearer via configuração já existente, validação de conta ativa, placeholders SQL parametrizados e cache `private, no-store`.
- O helper mantém URL HTTPS e URL assinada de storage com TTL de 300 segundos.

## Validação pendente
Esta branch deve passar por build, testes, auditoria de dependências e E2E no GitHub Actions antes de qualquer merge. A restauração no GitHub não altera a versão live do Hatchable.

## Próximo passo seguro
Revisar a PR resultante e confirmar que a cópia dos dois arquivos corresponde aos hashes acima. Qualquer sincronização adicional de runtime ou mudança de banco exige comparação individual e plano de rollback.
