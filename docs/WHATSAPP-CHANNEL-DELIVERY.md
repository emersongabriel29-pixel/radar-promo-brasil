# Integração com Canal do WhatsApp (API auto-hospedada)

Este conector é opcional e não altera o envio atual pelo Telegram. Ele usa o projeto externo https://github.com/Abdodiab2005/whatsapp-api, uma API comunitária baseada em Baileys, para publicar texto em um Canal do WhatsApp onde a conta conectada seja administradora/proprietária.

## Limites importantes

- Não é uma API oficial da Meta. A conta vinculada pode ser desconectada ou restringida pelo WhatsApp; usar um número secundário reduz o impacto no número principal, mas não elimina o risco ao canal.
- O conector não envia automaticamente por si só: ele fornece as operações de consulta, validação de função e envio para ser chamado pelo executor de publicações após a oferta ser aprovada.
- Não envie ofertas em massa nem mensagens não solicitadas. Respeite as regras do WhatsApp e mantenha frequência moderada.
- Não publique credenciais, QR, arquivo .env ou o diretório de sessão no GitHub.
- Em falha/timeout de envio, o resultado deve ser reconciliado no canal antes de qualquer reenvio. A chave de idempotência precisa permanecer igual para a mesma publicação.

## Preparar a API (Node.js 24.x)

1. No servidor próprio, clone o projeto externo e confira o README atualizado.
2. Configure API_KEY com um segredo aleatório forte (pelo menos 32 bytes) no ambiente da API.
3. Inicie a API conforme as instruções do projeto externo e faça o pareamento do número secundário pelo QR mostrado apenas no terminal seguro do servidor.
4. Mantenha uma única instância da API e persista o volume session/. Use HTTPS e restrinja a porta a chamadas do servidor Radar; não exponha a API diretamente à internet sem proxy/firewall.
5. Confirme que GET /healthz retorna sucesso após o pareamento.
6. No WhatsApp do número secundário, entre como administrador/proprietário do canal de destino. A função é verificada novamente pela API no momento do envio.

## Configuração no Radar

Adicione estes valores no cofre de segredos/variáveis do ambiente do Radar (não no código nem em commits):

- whatsapp_channel_api_url: URL base HTTPS da API, sem barra final, por exemplo https://whatsapp-api.seudominio.com.
- WHATSAPP_CHANNEL_API_KEY: a mesma chave definida na API externa.

O módulo lib/whatsapp-channel.js disponibiliza:
- whatsappChannelHealth(): saúde da API;
- listWhatsAppChannels(): canais com permissão de publicação;
- checkWhatsAppChannelRole(link): valida a função do número no canal;
- sendWhatsAppChannelText({ channel, message, publicationId }): envio de texto com chave de idempotência determinística.

O link de destino é o link de convite do canal, por exemplo https://whatsapp.com/channel/.... Não coloque a chave da API na URL.

## Checklist de teste antes de ativar automação

- [ ] A API responde a /healthz e a sessão está conectada.
- [ ] GET /channel lista o canal esperado como ADMIN/OWNER.
- [ ] POST /channel/check-role confirma a permissão atual.
- [ ] Publicar manualmente uma mensagem de teste neutra em um canal de teste privado.
- [ ] Confirmar que a resposta retorna sucesso e que a mensagem realmente aparece no canal.
- [ ] Simular timeout e confirmar que a fila passa a WAITING_CONFIRMATION, sem reenvio automático.
- [ ] Confirmar que Telegram continua funcionando de forma independente.
- [ ] Só então habilitar a integração no executor/fila, com limite inicial baixo e revisão humana.

## Estado desta implementação

O adaptador HTTP, a verificação de conexão e o job api/jobs/whatsapp-channel estão adicionados nesta branch. O job busca publicações aprovadas destinadas a registros WhatsApp do tipo CHANNEL, usa o mesmo controle de elegibilidade e claim da fila atual e registra PUBLISHED, RETRY, FAILED, WAITING_CONNECTION ou WAITING_CONFIRMATION. O cron foi configurado para executar no minuto 2 de cada hora, alinhado ao agendamento atual do projeto. A publicação real ainda depende de instalar a API externa, parear o número secundário, cadastrar os segredos no ambiente, cadastrar/ativar o destino do tipo CHANNEL e confirmar um envio manual. Os testes automatizados e o envio real ainda precisam ser executados; não considerar a integração validada antes disso.
