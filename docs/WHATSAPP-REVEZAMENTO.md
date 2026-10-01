# Até cinco números e revezamento automático

Em Configurações → Conta, vitrine e planos → Conexões WhatsApp, cadastre de um a cinco números com +DDI, nome da instância do conector e intervalo mínimo. Cada cadastro começa pausado. O sexto cadastro é recusado também em requisições simultâneas.

O revezamento está ligado por padrão. O próximo envio usa o número elegível menos usado na sequência da conta. São excluídos números pausados, degradados, em intervalo, com validação vencida (24h), sem acesso confirmado ao grupo ou já ocupados em um envio. Desligar o revezamento mantém a seleção por prioridade. Remover arquiva a conexão e preserva o histórico; uma entrega em andamento precisa ser reconciliada antes.

## Conectar o executor

1. Preencha o segredo N8N_WEBHOOK_SECRET no Setup seguro da hospedagem. O agente declara o campo; o valor deve ser inserido pelo titular.
2. Autenticado no painel, clique em Parear conector para obter a conta e copiar o código de pareamento (API POST /api/n8n/pairing). Esse segredo derivado só autoriza essa conta; não copie o segredo principal para o worker.
3. No servidor do conector, copie workers/whatsapp-worker.example.json para whatsapp-worker.json. Inclua até cinco instâncias, com externalId idêntico ao cadastrado no painel, URL HTTPS, tokenEnv e os IDs dos grupos autorizados. Credenciais ficam em variáveis do ambiente.
4. Configure PUBLIC_APP_URL, WORKER_ACCOUNT_ID, RPB_PAIRING_SECRET, WHATSAPP_WORKER_CONFIG e as variáveis de token indicadas no arquivo.
5. Execute node workers/whatsapp.mjs em Node 22+ como serviço com reinício e volume durável para WORKER_STATE_DIR. Para n8n self-hosted com execução de comandos habilitada, node workers/whatsapp.mjs --once executa um ciclo; evite execuções sobrepostas e mantenha o mesmo volume.
6. O worker consulta o provedor, confere o número conectado e os grupos acessíveis, e envia o diagnóstico assinado. Depois ative cada número no painel.

O adaptador EVOLUTION usa fetchInstances, fetchAllGroups, sendText e sendMedia. A implementação foi conferida no código primário evolution-foundation/evolution-api (routers de instância/grupo/envio e DTOs; sendMessage.router.ts blob cd073dba3dfd56311dc21d9ca78514eb0cbb264a, consulta 01/10/2026 UTC). A compatibilidade da instalação e a autorização de uso dos grupos ainda precisam de homologação. Baileys e Cloud API têm capacidades diferentes; o cadastro do provedor não comprova suporte a grupos.

O adaptador HTTP atende n8n/conector próprio e provedores oficiais por meio deste contrato:

| Operação | Contrato |
| --- | --- |
| GET /connections/EXTERNAL_ID/status | Bearer; JSON status CONNECTED, phoneNumber com +DDI e groupIds dos grupos realmente utilizáveis |
| POST /connections/EXTERNAL_ID/messages | Bearer e Idempotency-Key; JSON groupId, text, imageUrl opcional e dispatchToken |
| Confirmação | status PUBLISHED e externalMessageId real do provedor |
| Ausência de entrega | status FAILED e confirmedNotDelivered true |
| Resultado incerto | status UNKNOWN; timeout, 5xx, erro ou resposta sem recibo também são tratados como incertos |

O conector HTTP deve implementar seu provedor real e garantir idempotência. Não responda PUBLISHED por apenas receber a requisição.

## Contrato da ponte

POST /api/n8n/bridge recebe accountId, action, eventId e o conteúdo da ação. x-rpb-timestamp contém segundos Unix; x-rpb-signature é HMAC-SHA256 hexadecimal de timestamp + ponto + corpo JSON exato, usando pairingSecret. A janela é de cinco minutos. Repetir o mesmo eventId retorna a resposta anterior.

| Ação | Conteúdo |
| --- | --- |
| connections | Lista dos números da conta, sem tokens de provedor |
| connection | connectionId, phoneNumber, status CONNECTED/DISCONNECTED, groupMessagingSupported booleano, groupIds |
| pull | limit até 20; retorna uma atribuição por publicação, connectionId, connectionExternalId, connectionPhone e dispatchToken |
| result | publicationId, connectionId, dispatchToken, status PUBLISHED/FAILED/UNKNOWN e recibo real quando publicado |
| ping | Diagnóstico da ponte; não envia mensagens |

Cada tentativa ganha um token. Recibos de outra tentativa ou outro número são recusados. O worker grava a tentativa antes do envio e o resultado antes da confirmação da ponte. Após interrupção, reconcilia o resultado sem repetir o envio. Se cair entre o envio e a gravação do recibo, registra UNKNOWN. A fila mantém WAITING_CONFIRMATION até confirmação tardia ou conferência explícita de ausência de entrega pelo operador.

O diretório do worker precisa ser durável e privado. Não apague o journal para forçar reenvio. Após encerramento abrupto, remova worker.lock apenas depois de confirmar que não há processo ativo; as entradas JSON pendentes devem permanecer.

## Validação antes de usar

Use um grupo de homologação autorizado pelo titular. Confira número, grupo, imagem/texto, link, recibo e tratamento de timeout em cada instância. Os testes automatizados usam fornecedores simulados e não enviam mensagens reais. Os cinco números e seus tokens não foram fornecidos nesta sessão: os controles estão implementados, mas a ativação real exige o pareamento acima.
