# Radar Promo Brasil

Painel de automação para organizar ofertas de afiliados por categoria, gerar mensagens promocionais e preparar o envio de imagem, texto e link para grupos administrados no WhatsApp.

## Estado atual

- Dashboard responsivo com menu lateral
- Cadastro e categorização de ofertas
- Geração de mensagem promocional com IA e fallback local
- Filas, agendamentos, grupos e métricas de leads
- Ponte segura para integração com n8n
- Rotina horária para liberar publicações agendadas
- Estrutura para Amazon Associados, Shopee Afiliados, Mercado Livre e WhatsApp
- Contas separadas, teste de 7 dias e configuração por usuário
- Regras de SubID, múltiplas conexões e fallback
- Fura-fila, horários, intervalos, Link Preview e solicitação de menção
- Gestão de leads, vitrine pública e páginas comerciais/legais

## Fluxo planejado

`Oferta -> validação -> categoria -> link de afiliado -> mensagem -> fila -> n8n -> WhatsApp`

Cada publicação deve enviar a imagem do produto, a mensagem formatada e o link oficial de afiliado.

## Segurança

Não salve senhas, Client Secrets ou tokens neste repositório. Configure `N8N_WEBHOOK_SECRET` e as credenciais das plataformas somente no ambiente seguro de hospedagem.

## Pendências externas

As integrações reais dependem das credenciais e permissões oficiais das contas da Amazon, Shopee, Mercado Livre, n8n e do serviço escolhido para WhatsApp.

O sistema mantém conectores externos como pendentes até que as credenciais sejam inseridas no cofre seguro e um teste real seja concluído. Ele não garante comissão, entrega de mensagens ou ausência de restrições nas plataformas.
