> Documento histórico recuperado da branch de feed. Validação HTTP atual e limitações: [auditoria de 26/11/2026](../../../docs/ANDROID-AUDIT-2026-11-26.md).

# Feed Android via Supabase Edge Function — 24/11/2026

## Objetivo
Remover a dependência do endpoint Hatchable do projeto Radar Promo Ofertas, que estava bloqueado por 429 usage_limit, sem colocar segredos no APK e sem apresentar preços antigos como ofertas atuais.

## Implementação
- Função: radar-offers-feed, projeto Supabase runnmpzkomcdawwzuift, versão 2, status ACTIVE.
- Endpoint: https://runnmpzkomcdawwzuift.supabase.co/functions/v1/radar-offers-feed.
- Driver PostgreSQL server-side postgres@3.4.7, usando apenas SUPABASE_DB_URL do ambiente gerenciado da Edge Function.
- Método GET e OPTIONS; nenhum método de escrita.
- Conta de publicação definida no servidor; cliente não escolhe tenant, tabela, coluna ou SQL.
- Seleção explícita de campos públicos; nenhum token de afiliado, credencial, storage key ou dado de usuário é retornado.
- Paginação 1–10.000, limite 1–60, busca limitada a 120 caracteres e ordenação allowlist recent, discount, score.
- Link afiliado mantido exatamente como armazenado, desde que HTTPS.
- Cache HTTP de 30 segundos com stale-while-revalidate de 60 segundos.
- Exige status APPROVED/PUBLISHED e último histórico OFFICIAL_API verificado nas últimas 24 horas, com preço e preço original idênticos aos dados atuais.
- A função não usa RLS público nem expõe chave service-role; consulta por conexão server-side e só devolve o contrato do feed.

## Diagnóstico de dados
Consulta read-only em 24/11/2026:
- public.offers: 10.360 linhas.
- public.categories: 22 linhas.
- Conta principal: ACTIVE (identificador omitido no documento público).
- public.offer_price_history: 0 linhas.
- Última offers.updated_at observada: 13/11/2026 00:58 UTC.
- 2.501 ofertas em APPROVED/PUBLISHED, mas 0 com validation_status VALID e 0 com histórico oficial recente no espelho.
Esses registros não podem ser apresentados como promoções atuais. O feed deve retornar vazio até a ingestão e validação oficiais voltarem a gravar dados recentes no Supabase.

## Limitação ainda aberta
A função Supabase está implantada, mas a chamada HTTP externa real ainda não foi validada nesta sessão. A cota do Hatchable bloqueia as funções que poderiam sincronizar o catálogo do Radar; trocar o feed do APK não reativa os workers de ingestão. A retomada segura exige liberar a execução do Radar e sincronizar offers + offer_price_history para Supabase por um processo idempotente e reconciliado, sem ligar o banco Supabase para todas as rotas antes de concluir a migração.

## Segurança
- Sem alterações em dados, policies, chaves, segredos ou visibilidade.
- Sem credenciais no GitHub ou no APK.
- Sem publicação de ofertas, mensagens ou deploy Hatchable.
- A Edge Function é read-only e não recebe SQL do cliente.
