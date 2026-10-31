# Worker externo Lomadee — piloto seguro

## Objetivo

Transferir somente a leitura e seleção do catálogo Lomadee para um runner padrão do GitHub Actions. A Hatchable continua sendo a fonte de verdade para credenciais cadastradas, banco, criação de ofertas, geração de links curtos, histórico de preços e autopilot.

O worker externo **não** cria ofertas, não altera preços no catálogo de ofertas, não gera links afiliados, não enfileira publicações e não envia mensagens. Ele grava somente até 12 produtos selecionados em `affiliate_discovery_items`, por meio de um endpoint autenticado por HMAC.

## Fluxo

1. GitHub Actions consulta até cinco páginas de produtos Lomadee por hora, com rotação de páginas.
2. O worker aplica os filtros de disponibilidade, preço, imagem, URL, segurança de medicamentos e diversidade já usados pelo Radar.
3. O worker envia os produtos selecionados ao endpoint `/api/worker/lomadee-discovery`.
4. O endpoint valida assinatura, janela de tempo, tamanho do lote e fingerprint da chave Lomadee.
5. A descoberta é persistida com a operação `external_worker_products`.
6. O importador atual da Hatchable pode consumir a descoberta recente quando `lomadee_external_discovery_enabled=true`. Se não houver lote recente, ele volta automaticamente à consulta direta da API.

## Configuração manual necessária

Os segredos não são gravados no GitHub nem enviados pelo chat.

1. No cofre de segredos do projeto Hatchable, configure `EXTERNAL_WORKER_SECRET` com um valor aleatório exclusivo de pelo menos 32 caracteres.
2. Em GitHub → Settings → Secrets and variables → Actions, crie:
   - `LOMADEE_API_KEY`: a mesma chave de API Lomadee já cadastrada e validada no Radar.
   - `RADAR_WORKER_SECRET`: o mesmo valor configurado como `EXTERNAL_WORKER_SECRET` na Hatchable.
3. No arquivo `.github/workflows/lomadee-discovery.yml`, associe esses dois segredos às variáveis de ambiente com a sintaxe de secrets do GitHub Actions. Os campos estão intencionalmente vazios até a configuração manual.
4. O workflow roda somente por acionamento manual ou agendamento; não é executado em eventos de pull request.
5. A primeira execução deve ser manual e observada antes de ativar o consumo externo.

O endpoint compara o SHA-256 da chave enviada pelo worker com a chave já armazenada e descriptografada no servidor. Isso impede que uma chave Lomadee diferente seja usada para gravar dados na conta do Radar.

## Ativação gradual

- A configuração `lomadee_external_discovery_enabled` nasce como `false`.
- Com ela desativada, o importador continua usando a API diretamente, mesmo que o worker já esteja gravando descobertas.
- Depois de uma execução manual bem-sucedida, confirme que `productsPersisted` é coerente e que o lote pertence à execução mais recente.
- Só então altere a configuração para `true`. O importador passa a consumir o último lote concluído, com até 90 minutos de idade.
- Se não existir lote recente ou houver lote vazio, o importador usa automaticamente a consulta direta da Hatchable.

## Reversão

Defina `lomadee_external_discovery_enabled=false`. O importador volta à consulta direta sem apagar ofertas, histórico de preços, descobertas ou credenciais. Não é necessário alterar o scheduler nem o fluxo Telegram.

## Limites e segurança

- O piloto exige exatamente uma conta Lomadee validada no Radar. Se houver mais de uma, o endpoint rejeita o lote em vez de misturar contas.
- A assinatura HMAC tem tolerância de cinco minutos e o lote é limitado a 750 KB e 12 produtos.
- O worker consulta cinco páginas no máximo por execução e respeita uma pausa entre chamadas.
- O agendamento GitHub Actions é horário UTC e só passa a executar automaticamente depois que o workflow estiver na branch padrão.
- O PR não deve ser mesclado nem a flag ativada antes da configuração dos segredos e do teste manual.
