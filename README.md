# Radar Promo Brasil

Painel de automação para organizar ofertas de afiliados por categoria, gerar mensagens promocionais e enviar imagem, texto e link para grupos e canais administrados no WhatsApp e Telegram.

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
- Telegram oficial com até três bots, teste de destino e fallback
- Envio automático com imagem, legenda, botão e link rastreável
- Relatórios de cliques, vendas, comissões, conversão e desempenho por canal
- Estúdio multimodelo para Gemini, OpenAI e Claude, com fallback automático para o Gemini ativo
- Textos promocionais, cupons, anúncios, legendas, carrosséis e roteiros de vídeo com fatos validados
- Artes geradas por IA em formatos de feed, stories, Reels, Facebook e YouTube
- Catálogo de conectores para Shein, AliExpress, Magalu, Casas Bahia, Hotmart, KaBuM, Americanas, Natura e Avon
- Central de tráfego com campanhas, UTMs, cupons e preparação de Facebook, Instagram, Gmail e Outlook
- Controles de LGPD, retenção, solicitações de titulares e trilha de eventos de segurança

## Fluxo planejado

`Oferta -> validação -> categoria -> link de afiliado -> mensagem -> fila -> WhatsApp e/ou Telegram`

Cada publicação deve enviar a imagem do produto, a mensagem formatada e o link oficial de afiliado.

## Segurança

Não salve senhas, Client Secrets ou tokens neste repositório. Configure `N8N_WEBHOOK_SECRET`, `TELEGRAM_BOT_TOKEN_1` e os tokens opcionais de fallback somente no ambiente seguro de hospedagem.

## Pendências externas

As integrações reais dependem das credenciais e permissões oficiais das contas da Amazon, Shopee, Mercado Livre, n8n, WhatsApp, Meta e demais marketplaces. O Gemini para textos foi testado no ambiente publicado. OpenAI e Claude exigem as respectivas chaves; geração de imagens também está sujeita à cota do provedor. A renderização de vídeos ainda exige um provedor externo aprovado, como Runway ou Veo; o sistema atualmente gera o roteiro.

O sistema mantém conectores externos como pendentes até que as credenciais sejam inseridas no cofre seguro e um teste real seja concluído. Ele não garante comissão, entrega de mensagens ou ausência de restrições nas plataformas.

## Segurança e contas

- Todas as entidades operacionais são vinculadas à conta autenticada.
- Alterações e exclusões validam o proprietário do registro.
- Oferta, grupo e publicação precisam pertencer à mesma conta.
- A ponte n8n usa uma chave derivada e assinada diferente para cada conta.
- Intervalos reduzem volume, mas não garantem ausência de restrições.

## Testes

Execute `npm test`. O GitHub Actions valida automaticamente regras determinísticas de oferta, HTTPS, categorias, preços e fingerprints.
