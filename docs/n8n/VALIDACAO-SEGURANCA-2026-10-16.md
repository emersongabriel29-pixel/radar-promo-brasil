# Validação de segurança e fluxo — Radar Promo Brasil

**Data:** 2026-10-16  
**Escopo:** teste técnico e simulação; nenhuma oferta real publicada e nenhuma promoção enviada a grupos.

## Resultado técnico

- Workflow n8n `BldO3MqWULbMGsjs` permanece ativo; versão publicada `feff5979-e23f-4b24-9aea-b435b71d3af9`; 4 nós.
- Corrigida a expressão regular do timestamp Unix, que estava escapada em excesso e rejeitava timestamps válidos.
- O ping autenticado Hatchable → n8n → ponte respondeu HTTP 200 às 10:44:59 UTC.
- O endpoint protegido `POST /api/n8n/ping-test` rejeitou acesso público com HTTP 401.
- A ponte `POST /api/n8n/bridge` rejeitou uma chamada sem assinatura válida com HTTP 401.
- Testes isolados do nó de validação rejeitaram timestamp malformado, timestamp expirado e assinatura HMAC inválida. Os testes falharam deliberadamente com as mensagens de bloqueio esperadas, antes do nó HTTP.
- Simulação de oferta fictícia com URLs reservadas `example.com` passou a validação de formato; classificação indicou `needsReview: true` e não encontrou grupos elegíveis. A rota de simulação valida e monta a mensagem; não grava nem publica a oferta.
- Oferta vazia foi rejeitada com HTTP 400 e lista de campos inválidos.
- `dry_run_deploy` do Hatchable: `ok: true`, zero erros e zero avisos. Não foi necessário novo deploy Hatchable, pois esta correção foi feita no workflow n8n.

## Estado operacional — ainda não pronto para produção

A leitura de prontidão da conta retornou `SETUP_REQUIRED`, `productionReady: false`, prontidão interna 25% e operacional 15%. Pendências observadas:

- 0 ofertas aprovadas;
- 0 destinos oficiais ativos;
- 0 filas ativas;
- piloto automático sem oferta/regra/marketplace/destino/conector completos;
- nenhuma confirmação oficial recente de entrega;
- contato de incidentes não configurado;
- marketplace afiliado, Telegram, WhatsApp/n8n e vitrine pública ainda exigem configuração/validação.

**Fila e deduplicação:** não foi executado o job do piloto automático nem o worker de Telegram/WhatsApp, porque eles podem criar publicações ou enviar mensagens. A execução real da fila permanece bloqueada por falta de ofertas aprovadas, destinos e filas ativas. O código da ponte mantém registro persistente de eventos e tratamento de duplicatas, mas a idempotência entre execuções não foi provocada por um evento de oferta real neste teste.

## Sincronização

- Workflow de produção: `https://radar-n8n.duckdns.org/workflow/BldO3MqWULbMGsjs`
- Exportação no GitHub: `docs/n8n/radar-ofertas.workflow.json`
- O export contém `active: false` para evitar ativação acidental de uma segunda cópia; o workflow remoto continua ativo.
- Nenhum segredo, token ou credencial foi incluído neste relatório.
