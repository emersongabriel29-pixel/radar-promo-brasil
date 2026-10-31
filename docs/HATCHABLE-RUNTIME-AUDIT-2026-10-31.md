# Auditoria de runtime Hatchable — 2026-10-31

## Método e ressalva

Agregação dos registros de função retornados para as rotas abaixo com janela `since=24h`. A duração é a soma de `duration_ms` nos logs de cada rota. Isso é uma medição observada de execução, não uma reconciliação oficial do medidor de faturamento/uso da Hatchable; não se deve assumir correspondência exata de 1:1.

## Rotas com maior duração observada

| Rota | Chamadas | Duração acumulada | Máximo por chamada | Erros |
|---|---:|---:|---:|---:|
| `/api/jobs/telegram` | 132 | 38,04 min | 153,2 s | 4 |
| `/api/n8n/telegram-tick` | 41 | 3,85 min | 58,1 s | 1 |
| `/api/jobs/lomadee` | 20 | 3,71 min | 58,2 s | 0 |
| `/api/jobs/aliexpress` | 18 | 2,03 min | 8,4 s | 1 |
| `/api/jobs/shopee` | 21 | 1,80 min | 10,1 s | 6 |
| `/api/integrations/lomadee-explorer` | 12 | 1,44 min | 16,9 s | 4 |
| `/api/integrations/aliexpress` | 24 | 0,91 min | 6,6 s | 2 |
| `/api/integrations/shopee` | 102 | 0,68 min | 3,2 s | 32 |
| `/api/jobs/social` | 9 | 0,29 min | 14,8 s | 0 |
| `/api/jobs/ai-enrichment` | 10 | 0,18 min | 10,4 s | 0 |

**Total dessas dez rotas: aproximadamente 52,93 minutos observados.** Há outras rotas além dessas; portanto, o total real registrado no projeto pode ser maior.

## Decisão técnica

1. O despachante Telegram é o maior consumidor observado: aproximadamente 38 minutos. Ele realiza publicação real, confirmações e tratamento de falhas; não será transferido nem acelerado nesta fase.
2. O tick n8n também participa do circuito de enfileiramento. Mantê-lo sem alteração evita duplicação ou perda de ofertas.
3. As rotas de marketplace e descoberta somam uma parcela menor. A migração externa deve começar por um piloto read-only Lomadee, medir o ganho real e só então avançar para Shopee e AliExpress.
4. O piloto não deve ser descrito como solução definitiva do limite de uma hora antes de medir a economia depois da ativação.
5. A publicação Telegram/WhatsApp permanece na Hatchable; nenhuma mensagem real foi enviada por esta auditoria.

## Próxima medição

Depois de ativar o piloto Lomadee, repetir a mesma agregação em uma janela de 24 horas e comparar duração de `/api/jobs/lomadee`, execuções externas e total do projeto. Só expandir para outros marketplaces se o ganho for comprovado e a CI permanecer verde.
