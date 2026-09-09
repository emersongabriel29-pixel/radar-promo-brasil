# Radar Promo Brasil

Painel de automação para organizar ofertas de afiliados por categoria, gerar mensagens promocionais e preparar o envio de imagem, texto e link para grupos administrados no WhatsApp.

## Estado atual

- Dashboard responsivo com menu lateral
- Cadastro e categorização de ofertas
- Geração de mensagem promocional com IA e fallback local
- Filas, agendamentos, grupos e métricas de leads
- Ponte segura para integração com n8n
- Rotina horária para liberar publicações agendadas
- Estrutura para Mercado Livre, Shopee e WhatsApp

## Fluxo planejado

`Oferta -> validação -> categoria -> link de afiliado -> mensagem -> fila -> n8n -> WhatsApp`

Cada publicação deve enviar a imagem do produto, a mensagem formatada e o link oficial de afiliado.

## Segurança

Não salve senhas, Client Secrets ou tokens neste repositório. Configure `N8N_WEBHOOK_SECRET` e as credenciais das plataformas somente no ambiente seguro de hospedagem.

## Pendências externas

As integrações reais dependem das credenciais e permissões oficiais das contas do Mercado Livre, Shopee, n8n e do serviço escolhido para WhatsApp.
