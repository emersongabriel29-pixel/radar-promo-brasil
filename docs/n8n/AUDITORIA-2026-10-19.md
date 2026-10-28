# Auditoria do n8n — Radar Promo Brasil

**Data da inspeção:** 2026-10-19  
**Método:** leitura do workflow disponível pelo MCP e das execuções recentes; nenhuma edição, ativação, desativação ou execução manual foi feita.  
**Workflow:** `Radar Promo Brasil — Webhook Seguro de Ofertas` (`BldO3MqWULbMGsjs`).

## Estado observado

- Workflow ativo; versão publicada `c8865d8b-c3a5-4c08-92ac-8376a11950d9`.
- Sete nós: webhook, chamada HTTP, validador HMAC, resposta, agendador Telegram de 10 minutos, assinatura do ciclo Telegram e chamada ao endpoint `/api/n8n/telegram-tick`.
- Dois gatilhos configurados: webhook e agendamento.
- Vinte e cinco execuções recentes estavam como `success` e em modo `trigger`, normalmente abaixo de dois segundos. Isso demonstra que o n8n aceitou e executou o ciclo; não demonstra que havia publicação elegível nem que o Telegram confirmou uma mensagem.
- Consulta posterior encontrou 210 execuções no total; as 25 mais recentes seguiram em `success`. A versão ativa e o rascunho continuam iguais (`versionId` `c8865d8b-c3a5-4c08-92ac-8376a11950d9`).
- O endpoint da aplicação valida HMAC-SHA256, timestamp dentro da tolerância configurada, conta ativa, evento idempotente e publicação elegível. Entrega incerta fica em `WAITING_CONFIRMATION` para evitar duplicidade.
- Um teste negativo ao vivo, com conta/evento fictícios e HMAC deliberadamente inválido, recebeu 401 tanto em `/api/n8n/bridge` quanto em `/api/n8n/telegram-tick`; a rejeição ocorreu antes de tocar o banco ou qualquer destinatário.
- O workflow usa segredo de ambiente e conta/evento para assinar a chamada; nenhum valor secreto foi copiado para este documento.
- Busca de agentes acessíveis não encontrou agentes do n8n. A única credencial acessível listada era `httpCustomAuth`; o gateway de IA estava indisponível. A busca de projetos não retornou projetos com esse nome e informou que projetos de equipe não estão habilitados; o workflow ativo segue acessível no projeto pessoal. Os valores de credenciais não foram consultados.

## Diferença entre o n8n ativo e o snapshot do repositório

`docs/n8n/radar-ofertas.workflow.json` é um snapshot local antigo: quatro nós e `active: false`. Não representa o workflow ativo de sete nós. **Não importar esse JSON sobre a instância ativa.** Atualizar o snapshot só depois de export oficial e revisão de diferenças; preservar a exportação anterior com nome/versionamento histórico.

## Limites e pendências

1. Não há comprovante de mensagem do Telegram correlacionado às execuções observadas nesta leitura.
2. O painel Hatchable reportou invocações sem erros recentes, mas isso não prova o recebimento no destino final.
3. Não foi feita publicação de teste, pois a auditoria exige evitar envio real durante testes. O endpoint já oferece `dryRun`; validar esse caminho somente com evento assinado no ambiente controlado.
4. A IA Central do produto foi adicionada nesta branch e ainda não está conectada ao n8n; ela apenas gera plano consultivo sob ação explícita, sem editar ou executar workflows.
5. A ferramenta de preparar dados fixados (`prepare_workflow_pin_data`) falhou com `Maximum call stack size exceeded`. Não executei manualmente o workflow: ele contém uma rota real de Telegram e o preparo seguro de simulação não ficou disponível.

**Resultado:** automação ativa, com assinatura e idempotência presentes; entrega final e correspondência do snapshot seguem pendentes de teste controlado e exportação oficial. Nenhuma correção remota foi aplicada.
