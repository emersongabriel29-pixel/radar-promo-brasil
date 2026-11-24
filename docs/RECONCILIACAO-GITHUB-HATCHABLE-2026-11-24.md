# Reconciliação GitHub ↔ Hatchable — 24/11/2026

## Estado após PR #212 e #213
- GitHub main inclui as correções da PR #212 e os arquivos do feed recuperados pela PR #213.
- Hatchable produção está em v673, com os três defeitos da PR #212 corrigidos.
- `api/public/offers-feed.js` e `lib/feed-images.js` estão no manifesto v673 com hashes idênticos à origem Hatchable consultada.
- Não foi executado cutover Supabase.

## Divergências de runtime comparadas individualmente
As 20 rotas/bibliotecas abaixo diferem em conteúdo entre GitHub main e Hatchable. Não foram copiadas em lote porque as diferenças alteram contratos, proteções ou capacidades:

1. `api/extension-token.js` — formatos/geração de token e rótulos de extensão.
2. `api/suite.js` — configuração de perfil social Mercado Livre e vitrine Collshp.
3. `api/readiness.js` — diferença observada predominantemente em CRLF/LF; precisa normalização controlada.
4. `api/reports.js` — Hatchable inclui métricas de filas e ingestão além do relatório base.
5. `api/integrations/magalu-status.js` — lógica de leitura/decifragem e diagnóstico de credenciais difere.
6. `api/integrations/lomadee-explorer.js` — Hatchable persiste páginas de descoberta.
7. `api/r/[id].js` — Hatchable bloqueia medicamentos antes de redirecionar.
8. `api/n8n/telegram-tick.js` — corpos e fluxo do worker diferem substancialmente.
9. `api/n8n/bridge.js` — Hatchable inclui prioridade de publicação/descoberta.
10. `api/ai/media.js` — Hatchable inclui caminhos Gemini além do Runway.
11. `api/ai/image.js` — Hatchable restringe propósitos de geração de imagem.
12. `api/public/storefront.js` — diferença na hidratação de imagens públicas.
13. `api/links/convert.js` — comportamento de conversão Mercado Livre difere.
14. `api/radar/price.js` — diferenças de implementação e estrutura.
15. `api/jobs/media.js` — Hatchable inclui suporte Gemini além de Runway.
16. `api/jobs/lomadee-discovery-queue.js` — Hatchable marca medicamentos como `BLOCKED_SAFETY` e não reprocessa itens já bloqueados.
17. `api/ai/card/[id].js` — diferenças no conjunto de proporções e renderização.
18. `lib/social-autopilot.js` — Hatchable exclui medicamentos na descoberta e no claim final.
19. `lib/monitoring.js` — diferenças em proteção de rede e ingestão.
20. `lib/backups.js` — Hatchable descobre tabelas account-scoped, ordena dependências e detecta ciclos; GitHub main tem versão de compatibilidade mais antiga.

## Arquivos somente no GitHub histórico
- `api/public/media/[id].js`
- `api/media/offer/[id].js`

Mantidos no GitHub. Não foram removidos do repositório nem copiados para produção sem revisão de referências e contrato.

## Correção de segurança encaminhada nesta branch
A comparação identificou regressão potencial de política de medicamentos no GitHub main:
- redirect público `api/r/[id].js` não filtrava medicamentos em publicações nem em social posts;
- `lib/social-autopilot.js` não filtrava medicamentos na seleção e no claim final;
- `api/jobs/lomadee-discovery-queue.js` ignorava `classification.blocked` e podia reabrir registros `BLOCKED_SAFETY` durante o reprocessamento.

A branch atual restaura a mesma política de segurança observada no Hatchable, sem copiar os demais corpos divergentes. Inclui testes de contrato e deve passar pela CI antes de merge/deploy.

## Supabase — bloqueio para cutover
O projeto Supabase está saudável e contém 68 tabelas públicas com RLS ativado, mas zero policies; as roles `anon` e `authenticated` não têm SELECT direto nas 68 tabelas. O desenho atual depende de acesso server-side privilegiado/ponte.
A migração de dados continua incompleta: os checkpoints registram 39 lotes em 36 tabelas, 5.849 linhas inseridas; a cópia do catálogo registra 55 lotes em 4 tabelas, 10.385 linhas. Tabelas operacionais importantes ainda aparecem vazias no destino, incluindo publicações, histórico de preços, itens e snapshots de descoberta.
A leitura do banco de origem Hatchable retornou HTTP 429 por cota mensal de 2h de banco excedida. Portanto, não há como fazer reconciliação integral de origem/destino nesta execução. O banco Hatchable permanece fonte de produção.

## Decisão
Não fazer sincronização automática dos outros 17 corpos divergentes, não ativar `supabase_db_enabled`, não migrar dados parcialmente, não remover endpoints somente-GitHub e não implantar alterações de runtime sem CI e validação funcional.
