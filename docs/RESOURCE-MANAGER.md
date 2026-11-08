# Resource Manager — orçamento adaptativo

## Objetivo
Maximizar vazão útil sem esgotar hospedagem, banco, APIs, IA ou mensageria. Não limitar quantidade comercial; controlar temporariamente concorrência e ritmo conforme recursos reais.

## Orçamentos separados
Invocações da hospedagem; tempo/memória; CPU/conexões/consultas do banco; armazenamento/tráfego; cotas de cada API; tokens/chamadas de IA; mensagens por canal. Não somar unidades incompatíveis.

## Fonte dos limites
Painel do plano, contrato e documentação oficial. Registrar valor, unidade, janela, fonte, data e margem. Métrica indisponível deve ser “desconhecida”, nunca estimada como fato.

## Controle adaptativo
Medir consumo e tendência; reservar capacidade para autenticação, saúde e recuperação; aumentar concorrência gradualmente quando latência/erros/orçamento permitirem; reduzir diante de saturação, 429, timeout ou pool esgotado; aplicar backpressure por tarefa e fornecedor; retomar gradualmente.

## Estados
NORMAL: orçamento sustentável. GUARDED: reduzir tarefas não críticas/lotes. EMERGENCY: suspender trabalho não essencial e preservar dados/funções críticas. RECOVERY: retomar conservadoramente. Limiares derivam de cotas verificadas e testes, não de números arbitrários.

## Justiça e proteção
Fatia mínima configurável por API ativa; excedente por backlog, frescor, prioridade e custo. Circuit breaker isolado. Evitar retry em loop, cron sobreposto, N+1, fan-out ilimitado e tarefa sem timeout.

## Painel
Orçamento, consumo por janela, previsão, reserva, concorrência, fila, latência, erros, pausas e motivo.

## Limite confirmado do plano Hatchable Free
Logs reais registraram rejeição HTTP 422 ao tentar armar one-shots quando o projeto alcançou 200 execuções one-shot agendadas no dia UTC. O erro foi produzido por `scheduler.now()` chamado a cada recorrência Telegram, em cascata. A regra correta é preservar a publicação READY no banco e deixar o cron recorrente `/api/jobs/telegram` consumi-la, evitando fan-out de one-shots. Chamadas imediatas manuais continuam sujeitas à cota e devem ser usadas com parcimônia. Nunca contornar ou falsificar a cota do provedor.


## Shopee — orçamento de execução
O worker Shopee foi ajustado para proteger o limite de 65 segundos do scheduler: janela de início de novas operações de até 30s; timeout de rede 8s; até 2 tentativas HTTP; uma repetição para erros GraphQL 10000/10030; uma página por consulta com cursor persistido após os itens de descoberta serem gravados; seis palavras-chave por execução e alternância horária entre ordenação por vendas/comissão; uma consulta AMS, uma amostra de loja parceira e uma de Shopee Mall; lote de processamento de 10 itens e reconciliação de um item. Não há teto diário de ofertas: páginas e itens continuam nos cursores/filas para os próximos ciclos. Se o orçamento terminar, o trabalho restante permanece pendente sem perder cursor ou apagar dados.


## Estado de operação após v649
Shopee usa orçamento de execução por janela (30s para iniciar novas chamadas) e cursores persistidos após armazenamento. A capacidade comercial não tem teto diário artificial: páginas restantes continuam no cursor e itens permanecem na fila. O limite real do scheduler Free (200 one-shots/dia UTC) é respeitado; recorrências não fazem fan-out one-shot.
