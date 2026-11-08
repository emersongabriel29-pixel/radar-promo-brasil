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