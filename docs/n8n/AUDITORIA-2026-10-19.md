# Auditoria do n8n — Radar Promo Brasil

**Data da inspeção:** 2026-10-19  
**Método:** leitura do workflow disponível pelo MCP e das execuções recentes; nenhuma edição, ativação, desativação ou execução manual foi feita.  
**Workflow:** `Radar Promo Brasil — Webhook Seguro de Ofertas` (`BldO3MqWULbMGsjs`).

## Estado observado

- Workflow ativo; versão publicada `c8865d8b-c3a5-4c08-92ac-8376a11950d9`.
- Sete nós: webhook, chamada HTTP, validador HMAC, resposta, agendador Telegram de 10 minutos, assinatura do ciclo Telegram e chamada ao endpoint `/api/n8n/telegram-tick`.
- Dois gatilhos configurados: webhook e agendamento.
- Vinte e cinco execuções recentes estavam como `success` e em modo `trigger`, normalmente abaixo de dois segundos. Isso demonstra que o n8n aceitou e executou o ciclo; não demonstra que havia publicação elegível nem que o Telegram confirmou uma mensagem.
- O endpoint da aplicação valida HMAC-SHA256, timestamp dentro da tolerância configurada, conta ativa, evento idempotente e publicação elegível. Entrega incerta fica em `WAITING_CONFIRMATION` para evitar duplicidade.
- O workflow usa segredo de ambiente e conta/evento para assinar a chamada; nenhum valor secreto foi copiado para este documento.
- Busca de agentes de IA publicados não encontrou agentes do n8n. A única credencial listada era `httpCustomAuth`; o gateway de IA estava indisponível. Os valores de credenciais não foram consultados.

## Diferença entre o n8n ativo e o snapshot do repositório

`docs/n8n/radar-ofertas.workflow.json` é um snapshot local antigo: quatro nós e `active: false`. Não representa o workflow ativo de sete nós. **Não importar esse JSON sobre a instância ativa.** Atualizar o snapshot só depois de export oficial e revisão de diferenças; preservar a exportação anterior com nome/versionamento histórico.

## Limites e pendências

1. Não há comprovante de mensagem do Telegram correlacionado às execuções observadas nesta leitura.
2. O painel Hatchable reportou invocações sem erros recentes, mas isso não prova o recebimento no destino final.
3. Não foi feita publicação de teste, pois a auditoria exige evitar envio real durante testes. O endpoint já oferece `dryRun`; validar esse caminho somente com evento assinado no ambiente controlado.
4. A IA Central do produto foi adicionada nesta branch e ainda não está conectada ao n8n; ela apenas gera plano consultivo sob ação explícita, sem editar ou executar workflows.

**Resultado:** automação ativa, com assinatura e idempotência presentes; entrega final e correspondência do snapshot seguem pendentes de teste controlado e exportação oficial. Nenhuma correção remota foi aplicada.
