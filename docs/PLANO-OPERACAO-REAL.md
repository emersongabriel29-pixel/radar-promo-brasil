# Plano de operação real

Objetivo: comprovar um fluxo real do Radar antes de ampliar os canais. Este documento complementa docs/RELEASE.md e docs/OPERACAO-2026-10-01.md.

## Ordem de execução

1. **Infraestrutura:** conferir versão ativa do Radar, agendamentos e armazenamento. Preparar o n8n com HTTPS, volume persistente, conta administrativa e backup. Verificar todos os custos e limites da hospedagem antes de criar recursos.
2. **Fonte:** escolher uma API ou feed autorizado. Validar preço, disponibilidade, URL, data de coleta e duplicidade. Manter as ofertas em revisão durante a homologação.
3. **Afiliado:** usar um programa aprovado e gerar o link pela ferramenta oficial. Conferir o destino final e comparar resultados com o relatório do programa.
4. **Telegram:** validar bot e destino de teste autorizado. Enviar uma oferta aprovada e guardar a confirmação oficial.
5. **Automação:** confirmar endpoint, payload e assinatura da integração antes de importar workflows. Usar um único responsável por disparar a publicação. Reutilizar o mesmo eventId em retentativas e reconciliar resultados incertos antes de reenviar.
6. **Monitoramento:** alertar para falhas consecutivas, fila parada, credencial expirada, falta de coleta, espaço em disco e backup com falha.
7. **Estabilidade:** observar o piloto por sete dias e testar reinicialização e restauração antes de ampliar para Mercado Livre, Meta, WhatsApp ou mídia com IA.

## Critérios de aceite

- Ofertas reais vêm de uma fonte permitida e podem ser conferidas na origem.
- Repetir a coleta não cria duplicatas.
- Link afiliado oficial funciona; comissão só é considerada confirmada no relatório do programa.
- A mensagem tem confirmação oficial e identificador externo.
- Falhas e timeouts não provocam reenvio cego.
- Backup foi restaurado em ambiente isolado.
- O n8n volta após reinicialização e a interface não fica exposta sem HTTPS/autenticação.
- Nenhum canal novo é ativado sem credenciais e teste real autorizado.

## Limites atuais

Os arquivos de implantação preparam o n8n, mas não criam a VM, DNS, contas externas nem credenciais. A hospedagem gratuita depende das condições reais da conta e dos recursos selecionados. Os agendamentos atuais do Radar não devem ser duplicados pelo n8n até que exista uma decisão explícita sobre o único executor de publicação.