# Preparação do cutover para Supabase — 20/11/2026

## Estado e fonte de verdade

Projeto exclusivo: Radar Promo Brasil. Hatchable consultado: v672; GitHub main consultado: a6ec44374fcf0915cb37940679af79c9cef6bfd8. Destino: projeto Supabase Radar Promo Brasil, São Paulo, ACTIVE_HEALTHY. Nenhum outro projeto foi alterado.

Esta alteração prepara o roteamento do banco. NÃO representa cutover concluído. A origem Hatchable permanece preservada; não houve INSERT/UPDATE/DELETE de dados, mudança de segredo, configuração, scheduler, nem deploy.

Para o patch GitHub, main é a fonte dos corpos das funções existentes; a mudança se restringe aos imports de banco. Não sobrescrever os corpos com o Hatchable: foram identificadas 20 divergências relevantes entre os arquivos envolvidos e dois endpoints de mídia presentes somente no GitHub. O feed e seu helper, ausentes no main consultado, foram recuperados do Hatchable. Ainda não existe paridade integral entre plataformas.

## Reconciliação read-only atual

| Tabela | Hatchable | Supabase |
|---|---:|---:|
| accounts | 2 | 2 |
| categories | 22 | 22 |
| coupons | 1 | 1 |
| offers | 10.360 | 10.360 |
| publications | 14.511 | 0 |
| offer_price_history | 10.396 | 0 |
| affiliate_discovery_items | 93.402 | 0 |
| affiliate_discovery_snapshots | 194.570 | 0 |
| affiliate_discovery_runs | 526 | 0 |
| shopee_discovery_cursors | 1.941 | 0 |
| webhook_events | 2.948 | 0 |
| promo_groups | 20 | 0 |
| marketplace_rules | 25 | 0 |
| account_settings | 2 | 0 |
| telegram_connections | 1 | 0 |

Foram consultadas as contagens das 68 tabelas nas duas plataformas. A igualdade de contagens das quatro tabelas do catálogo não substitui uma nova reconciliação de conteúdo antes do cutover. O documento histórico MIGRACAO-CATALOGO-SUPABASE.md no Hatchable registra a cópia anterior reconciliada dessas quatro tabelas, sem troca do banco ativo.

Consulta atual no Supabase não encontrou tabelas public regulares com RLS desativada. Isso não comprova, por si só, que políticas, grants, segredos e ponte foram homologados.

## Implementação desta branch

- 130 arquivos existentes passaram a obter db de lib/radar-db.js; os demais serviços continuam vindo do SDK Hatchable.
- Recuperado api/public/offers-feed.js e lib/feed-images.js do Hatchable. O feed também passa pelo adaptador, totalizando 131 arquivos roteados nesta branch.
- Corrigido no feed o placeholder opcional do ID: antes gerava o número do parâmetro como literal; agora usa o placeholder PostgreSQL correspondente.
- Nenhuma mudança em lib/radar-db.js: a flag supabase_db_enabled permanece sob controle de configuração, com default Hatchable. Não foi ativada.
- Novos testes verificam seleção do provedor, transações, cache, recuperação de configuração, ausência de fallback silencioso em falha do Supabase e proteção contra novos imports diretos.
- Testes do feed verificam autenticação antes de consulta, parametrização do ID e URLs assinadas sem chave de storage exposta.

## Validação

- npm run build: aprovado no conjunto final, 215 arquivos verificados.
- npm test: 254/254 aprovados no conjunto final, incluindo oito testes novos de roteamento/feed.
- npm audit --audit-level=moderate: 0 vulnerabilidades.
- npm run test:e2e: executado, bloqueado antes de iniciar os casos por ausência do Chromium. A tentativa oficial de instalação retornou HTTP 403. Não houve aprovação E2E local.
- Rotas reais /api/admin/db-provider-health e consultas de storage via runtime: HTTP 429 usage_limit por cota global de banco. Os SELECTs administrativos diretos funcionaram.
- Nenhum teste disparou mensagens, workers de publicação ou cobranças.

## Bloqueios para ativação

1. Concluir cópia idempotente e reconciliada das tabelas operacionais, dependências, IDs e sequences, sem sobrescrever linhas divergentes de destino.
2. Preservar credenciais cifradas e seus vínculos com o cofre, sem registrá-las em código/logs. Validar compatibilidade de criptografia e identidade.
3. Reconciliar os 20 corpos divergentes e os endpoints de mídia antes de portar a alteração para o Hatchable. Aplicar somente os imports ao código atual não garante paridade de testes com main.
4. Homologar a ponte, segredos já configurados e o provedor em execução real. Não expor segredos nem criar rota pública de SQL.
5. Validar filas, locks, idempotência, anti-duplicidade, autenticação e isolamento entre contas sem envio real.
6. Executar backup, reconciliação final/delta, troca e rollback controlados. A origem não deve ser apagada.
7. O bloqueio global de execução Hatchable também precisa ser resolvido: usar Supabase não comprova que o gateway permitirá executar o app enquanto a cota da conta está esgotada.

## Publicação e rollback

Branch: codex/supabase-routing-20261120. Alteração para revisão; main e produção permanecem sem este patch até aprovação de revisão e validações. Registrar o SHA e a URL do PR após publicação da branch.

Não houve deploy; Hatchable permanece v672. O espelho documental pode estar no rascunho privado lib/documentation sem significar implantação. Rollback do patch é reverter o commit antes de qualquer cutover. Após uma troca real, não voltar ao banco anterior sem reconciliar gravações feitas no novo provedor.

## Divergências de corpo que exigem revisão

- api/extension-token.js
- api/suite.js
- api/readiness.js
- api/reports.js
- api/integrations/magalu-status.js
- api/integrations/lomadee-explorer.js
- api/r/[id].js
- api/n8n/telegram-tick.js
- api/n8n/bridge.js
- api/ai/media.js
- api/ai/image.js
- api/public/storefront.js
- api/links/convert.js
- api/radar/price.js
- api/jobs/media.js
- api/jobs/lomadee-discovery-queue.js
- api/ai/card/[id].js
- lib/social-autopilot.js
- lib/monitoring.js
- lib/backups.js

Endpoints somente no GitHub consultado: api/public/media/[id].js; api/media/offer/[id].js.

