# Auditoria funcional completa — baseline pré-correção

**Data do baseline:** 18/10/2026 (America/Sao_Paulo)  
**Branch:** `codex/radar-video-ia-runway-20261018`  
**Commit de código:** `c78a265511a56000001fdac81dd9757ae8d3dceb`  
**Produção Hatchable:** v319 live (19/10/2026 02:38 UTC); 163 arquivos e 82 funções.  
**Regra:** este inventário foi registrado antes de qualquer correção de código para o pedido “fazer todas as funcionalidades e integrações funcionarem”. Nenhuma credencial foi lida/exportada e nenhum envio foi iniciado nesta etapa.

## 1. Inventário de áreas e funcionalidades

| Área | Funcionalidades presentes no produto | Contratos/caminhos principais | Auditoria desta rodada |
|---|---|---|---|
| Central | KPIs, estado de prontidão, atividade, atalhos e recomendações | `pages/index.js`, `public/radar.js`, `/api/data`, `/api/readiness`, `/api/reports` | Inventariado; validar os dados e links |
| Radar | Monitores de fontes, ingestão, classificação, deduplicação, score e preço | `/api/monitors/run`, `/api/radar/*`, `/api/messages/*`, `lib/monitoring.js`, `lib/ingestion.js`, `lib/radar.js` | Inventariado; exigir fontes autorizadas e preço oficial |
| Ofertas | Cadastro, parser/importação, edição, aprovação/rejeição, cupom, imagem, link de afiliado, classificação e vitrine | `/api/data`, `/api/automation/simulate`, `/api/integrations/*`, `lib/offer-message-parser.js`, `lib/offer-images.js`, `lib/coupon-rules.js` | Inventariado; E2E e estado real de preço/afiliado pendentes |
| Curadoria | Regras, seleção por pontuação e categoria, curadoria assistida por IA | `/api/radar/curator-ai`, `/api/radar/autopilot`, `lib/radar.js` | Inventariado; testar com dados reais somente leitura |
| IA / mídia | Roteiro, texto promocional, cards/imagens, arquivos privados, vídeo IA e provedor explícito Runway | `/api/ai/*`, `/api/upload`, `/api/media/*`, `/api/public/media/*`, `/api/public/social-image/*`, `lib/creative.js`, `lib/media.js` | Inventariado; credenciais pagas e teste de geração dependem de conta/provedor |
| Publicações | Filas, horários, recorrências, aprovação, limites, retry, idempotência, estado e comprovante de entrega | `/api/batches`, `/api/jobs/*`, `/api/data`, `lib/delivery.js`, `lib/recurrences.js` | Inventariado; conferir isolamento por canal e estados terminais |
| Canais e leads | Grupos/canais por plataforma, destinos, consentimento, leads e importação | `/api/data`, `/api/telegram/incoming`, `/api/compliance/messaging`, `lib/messaging-compliance.js` | Inventariado; canal e origem oficial precisam estar autorizados |
| Telegram | Conectar/testar bot, cadastrar destino, importar mensagens recebidas, validar webhook, preparar oferta, aprovar e despachar oferta por fila | `/api/telegram/test`, `/api/telegram/webhook-setup`, `/api/telegram/incoming`, `/api/jobs/telegram`, `/api/jobs/autopilot`, `/api/jobs/hourly`, `/api/n8n/telegram-tick`, `lib/telegram.js`, `lib/telegram-core.js`, `lib/autopilot.js` | Checagem de prontidão e diagnóstico de produção feitos; testes de contrato/local e reconciliação GitHub ↔ Hatchable pendentes |
| Redes sociais | Rascunhos Instagram/Facebook, fila social, aprovação humana e autopilot social | `/api/social/autopilot`, `/api/agents/social-media`, `/api/jobs/social`, `lib/social-autopilot.js` | Inventariado; credenciais/escopos Meta e entrega ponta a ponta pendentes |
| WhatsApp / n8n | Pareamento seguro, HMAC, rotação de conectores, envio por adaptador, recebimento e status | `/api/n8n/*`, `/api/jobs/*`, `lib/whatsapp-rotation.js`, `lib/direct-connectors.js` | Inventariado; conta indica 0 números validados; sem declarar integração operacional |
| Marketplaces/afiliados | Conectores/fluxos para Mercado Livre, Amazon, AliExpress, Shopee, Shein, Magalu, Awin, Admitad, Rakuten e Lomadee | `/api/integrations/*`, `/api/mercadolivre/*`, `lib/afilimax-aliexpress-provider.js` | Inventariado; cada integração exige escopo, conta e leitura oficial; status por provedor abaixo |
| Relatórios/crescimento | Clique, venda/comissão, campanhas, crescimento e desempenho por canal | `/api/reports`, `/api/growth`, `/api/r/*` | Inventariado; validar que ausência de evento não apareça como entrega/conversão |
| Segurança/privacidade | Sessão e isolamento de conta, configuração/segredos, trilha de atividade, backups, exportação, solicitações LGPD e controles de acesso | `/api/privacy`, `/api/backups`, `/api/email/test`, `/api/admin/*`, `lib/security.js`, `lib/privacy.js`, `lib/backups.js` | Inventariado; pentest e validação multi-conta real continuam fora do smoke atual |
| Conta/vitrine | Dados de conta, vitrine pública, termos, privacidade e plano | `/api/public/storefront`, `/api/data`, `pages/vitrine.js`, `pages/inicio.js` | Inventariado; publicação da vitrine depende de ação/configuração da conta |

Os endpoints presentes são enumerados pelos arquivos versionados em `api/`; o inventário de arquivos/serviços está em `docs/RADAR-FUNCTIONAL-INVENTORY.md`. A presença de uma rota é apenas evidência de implementação estática, não comprova que o provedor externo esteja autorizado, conectado ou entregando.

## 2. Integrações externas e dependências

- **Telegram Bot API:** `TELEGRAM_BOT_TOKEN_1..3`, conexão associada à conta, destino Telegram ativo com `external_id`, bot com permissão de publicar, webhook secret para recebimento e scheduler ativo. Resultado administrativo de readiness observado: envio e ingestão `READY`; entrega é observada pelo diagnóstico agregado, mas este baseline não enviou mensagem.
- **Amazon Creators API:** Credential ID/Secret e Partner Tag aprovados, status de validação; conta atual indica não configurada.
- **Mercado Livre:** App ID/secret, OAuth, escopos, redirect/callback e conta vinculada; readiness atual não detectou regra de afiliado nem preço oficial nas últimas 24h.
- **AliExpress:** credencial/permissão de plataforma oficial; módulo adaptado é experimental e não deve ser tratado como conexão validada.
- **Shopee, Shein e Magalu:** autorização/credenciais de vendedor/afiliado e contratos oficiais específicos. Cadastro de chave não é validação.
- **Awin, Admitad, Rakuten, Lomadee:** IDs/tags/tokens e API habilitada por conta/programa. A regra de afiliado ativa é exigida antes do autopilot publicar.
- **Meta Instagram/Facebook:** OAuth, permissões de página/conta profissional e escopo de publicação; conexão não demonstrada no readiness atual.
- **Runway:** `RUNWAY_API_KEY` ausente em readiness administrativo.
- **WhatsApp/n8n:** segredo HMAC, API URL/token, pareamento e validação de grupo/número; readiness indica zero números verificados.
- **IA:** há modo local e provedores externos selecionáveis; readiness administrativo registrou IA testada. Custo/uso deve permanecer explícito e opt-in.

## 3. Fluxo automático de ofertas no Telegram — contrato que precisa funcionar

1. Capturar ou cadastrar oferta sem publicar; calcular fingerprint e deduplicar.
2. Validar produto, preço e preço original com fonte oficial recente, link de afiliado válido e regra/tag de afiliado ativa.
3. Exigir estado `APPROVED` e os dados/imagem requeridos pela política atual.
4. Selecionar destino Telegram ativo da mesma conta, com ID oficial, sem cruzar contas.
5. Enfileirar idempotentemente respeitando fila, limite diário, cooldown e categoria.
6. Disparar o job Telegram/scheduler e reivindicar atomicamente o registro para não duplicar.
7. Enviar via Bot API; armazenar ID oficial da mensagem e marcar `PUBLISHED` apenas após resposta confirmada.
8. Falha comprovada: retry limitado e observável. Timeout após possível aceite: `WAITING_CONFIRMATION`, sem retry cego.
9. Mostrar fila, último erro, estado, tentativas e comprovante no painel/relatório.

### Bloqueios observados na conta administrativa do projeto

- `/api/readiness` como `admin`: 49 ofertas aprovadas, 1 destino utilizável, 1 fila, envio Telegram `READY`, ingestão Telegram `READY`, prova de entrega recente presente; porém **0 ofertas com preço oficial verificado nas últimas 24h** e **0 regras de afiliado ativas**, por isso o autopilot é `ACTION_REQUIRED` e a prontidão geral `SETUP_REQUIRED` (88% interna; 63% operacional).
- `RUNWAY_API_KEY` ausente; Amazon Creators não configurada; WhatsApp/n8n com zero números verificados; vitrine não publicada.
- `/api/readiness` como `member` usa uma conta de membro simulada neste teste e retornou uma conta diferente, vazia para integrações. **Não usar esse resultado para descrever a conta proprietária.**
- Diagnóstico somente leitura `/api/admin/telegram-diagnostics` consultado com contexto de administrador retornou agregado: conta ativa; 29 publicações `PUBLISHED`, 1 `WAITING_CONFIRMATION`; uma conexão Telegram ativa, um destino Telegram e 144 eventos n8n processados nas últimas 24h. Não expôs token/ID. Investigar se a publicação pendente tem prova de entrega antes de qualquer reenvio.
- Os cinco cron jobs do Hatchable aparecem ativos e sem erros recentes: `/api/jobs/telegram` a cada hora (176 execuções/7d, 0 erros), `/api/jobs/hourly` a cada hora (158/7d, 0 erros), `/api/jobs/autopilot` no minuto 5 (170/7d, 0 erros), `/api/jobs/social` no minuto 10 (168/7d, 0 erros), `/api/jobs/api-health` no minuto 30 (30/7d, 0 erros). O scheduler executa; isso, isoladamente, não comprova que uma oferta nova passe pelos filtros e chegue ao grupo.
- Foram tentados os comandos da suíte no worktree, mas `npm.cmd` não está disponível nesta sessão Windows; `node.exe` está disponível e será usado para localizar o runtime npm / executar os verificadores equivalentes antes da publicação.

## 4. Divergência de fontes (GitHub ↔ Hatchable) antes de corrigir código

Hatchable v319 está live e possui os mesmos nomes de arquivos, mas os hashes de produção e do worktree divergem em arquivos de Telegram e scheduler. Exemplos: `api/jobs/telegram.js`, `api/jobs/autopilot.js`, `api/jobs/hourly.js`, `api/telegram/test.js`, `api/telegram/incoming.js`, `api/telegram/webhook-setup.js`, `lib/telegram.js`, `lib/telegram-core.js`, `lib/autopilot.js` e `lib/delivery.js`. `api/readiness.js` confere pelo SHA-256. A divergência precisa ser comparada por conteúdo e conciliada antes de publicar qualquer mudança; não sobrescrever produção nem declarar GitHub sincronizado sem revisão.

| Caminho | SHA-256 GitHub/worktree | SHA-256 Hatchable v319 |
|---|---|---|
| `api/jobs/telegram.js` | `b0937d0440e2f3c8c2f556de317ad9c210253d8532f8de0eaf4152281d3953fc` | `5e13c810a58b4b67898e0bd5ebe0a6a430698156734ed42348f0a620f1f44a64` |
| `api/jobs/autopilot.js` | `a46d92c3f2fdc64110983be416035f5fd9fc35f1d33ed76fd118d0d30b41bce6` | `3f170bc11e68fb6042d0cdd98e5e5daf3dbbc822f19445f363a07836761a52b5` |
| `api/jobs/hourly.js` | `5919815414e8a24ca51eaae873f97b1e71db92cca6b93d611ba28eeed4e6af13` | `10a34d3dc681ebb2123a548e23b2337412bec96582697f4549419c20af0b7031` |
| `api/readiness.js` | `4430ee0d939940659db9a48f4415f893c42e32cd3607f7d4a861dd414e81e285` | `4430ee0d939940659db9a48f4415f893c42e32cd3607f7d4a861dd414e81e285` |
| `lib/autopilot.js` | `078e071a17a359b93243d7d7caf0b758d09a22114719a3c7e5a838f16eeb8043` | `a23d2433e4a03245434fbe87ff5cf5421e59a4d445b4ba10a2f9292b9195fc01` |

## 5. Plano de auditoria/correção após registro deste baseline

- [ ] Reconciliação de código e contrato nos caminhos divergentes entre GitHub e Hatchable; confirmar a fonte de verdade por arquivo.
- [ ] Testes isolados para parsing, regras de preço/afiliado, idempotência, limites, claim, retries, resultados Telegram, timeout incerto, imagens/captions e callbacks.
- [ ] Auditar cada rota API: autenticação, validação de entrada, tenant isolation, rate-limit, método permitido, semântica de resposta e logs sem segredo.
- [ ] Auditar todos os provedores externos por estado `IMPLEMENTED / CREDENTIALS_MISSING / AUTHORIZED / READ_TESTED / DELIVERY_VERIFIED / UNSUPPORTED`.
- [ ] Executar build, suíte unitária/E2E, auditoria de dependências e verificação de acessibilidade quando código for alterado.
- [ ] Revalidar acesso e readiness em produção em contexto claramente identificado, sem misturar usuário teste com proprietário.
- [ ] Teste de envio Telegram real somente em destino confirmado pela conta e com uma oferta real aprovada e preço oficial confirmado; registrar o message ID de retorno sem expor token nem enviar falsa oferta demonstrativa.
- [ ] Depois de reconciliar e passar verificações, publicar e comparar os hashes de produção com o commit correspondente.

## 6. Definição de “100%” usada nesta auditoria

“100%” significa que cada capacidade anunciada tem: implementação identificada; pré-requisitos e limitações explícitos; verificação por teste apropriado; autenticação/isolamento verificados; evidência de integração externa quando aplicável; nenhuma ação reportada como sucesso sem comprovante. Capacidades que dependem de aprovação de terceiros ou credenciais do titular ficam em estado bloqueado até a prova real; não serão marcadas 100% só porque existe um formulário ou endpoint.

## 7. Correções e verificação após o baseline — 19/10/2026

### Corrigido e publicado

- **Telegram com imagem:** os despachantes `/api/jobs/telegram` e `/api/n8n/telegram-tick` montavam URLs de imagem privadas para a Bot API. Ambos agora solicitam a URL pública temporária da publicação aprovada. A rota de mídia continua verificando o estado da publicação; não libera imagens privadas em geral.
- **Inventário de testes Lomadee:** substituídos testes antigos que exigiam endpoints/cabeçalhos diferentes do conector implementado. A nova cobertura verifica o host e `x-api-key`, limita recursos/ações suportados e exige projeção allowlist sem dados pessoais em pedidos.
- **Contrato de despacho Telegram:** adicionada cobertura para a URL pública nos dois despachantes e para manter mídia privada como padrão fora de uma publicação autorizada.
- **Implantação Hatchable v320:** publicada em 19/10/2026 às 03:03 UTC após dry-run sem erros. Manifesto v320 confirmado como live. Não foram alterados dados de ofertas, credenciais ou destinatários e nenhum envio manual de teste foi disparado.
- **Configuração de IA:** o detector de credencial ausente agora considera o código e a mensagem retornados pelo gateway, para que uma resposta de setup 412 não seja mascarada como falha genérica 502. OpenAI, Gemini e modo local permanecem disponíveis; nenhum foi removido.
- **Implantação Hatchable v321:** publicada em 19/10/2026. O gate do endpoint de vídeo foi verificado sem gerar conteúdo pago: chamada pública recebeu 401 e membro com entrada inválida recebeu 400 antes de qualquer chamada de provedor.

### Verificações executadas

- `node --test`: **119/119 aprovados**.
- Playwright E2E: **3/3 aprovados**, incluindo páginas/fluxos acessíveis, responsividade em 375/768/880/1024/1440 px, controles de WhatsApp e oferta com upload.
- `node scripts/check-source.mjs`: **123 arquivos JavaScript verificados**.
- `git diff --check`: sem erros de whitespace.
- Dry-run Hatchable: **0 erros**, 3 avisos preexistentes no streaming de `/api/jobs/api-health.js` (SSE é bufferizado pelo runtime); esses avisos não fazem parte do fluxo Telegram.
- Depois da v320: `/api/readiness` e `/api/admin/telegram-diagnostics` responderam HTTP 200 no contexto administrativo; os 5 cron jobs (`telegram`, `hourly`, `autopilot`, `social`, `api-health`) estavam ativos e com zero erros nos últimos 7 dias.
- Diagnóstico agregado do Telegram: uma conexão ativa, um destino, 29 entregas `PUBLISHED`, uma entrega `WAITING_CONFIRMATION` e 144 eventos n8n processados nas últimas 24h. O item incerto não foi reenviado.
- Erros das 82 funções nas últimas 24h: dois timeouts Lomadee (504, ~8s), dois 500 sociais `ReferenceError: api is not defined` registrados antes da v319, e um 502 de vídeo IA causado pela chave OpenAI ausente. Na v321 o classificador foi corrigido; uma nova chamada inválida ao endpoint retornou 400 sem invocar IA. O GET social atual responde 200; seus rascunhos continuam bloqueados por autorização Meta ausente.
- Smoke de autorização em produção: `/api/data` como anônimo recebeu 401; `/api/jobs/telegram` como anônimo recebeu 404 (scheduler-only); `/api/ai/video-ia` como anônimo recebeu 401. A matriz automatizada maior foi limitada pelo controle de chamadas do Hatchable (429 `Too Many Attempts`) e não foi considerada uma validação bem-sucedida; os outros gates ainda precisam de execução por lotes menores.

### Estado operacional ainda pendente

O produto está **funcionando parcialmente**, não em 100% operacional. A readiness administrativa continua `SETUP_REQUIRED` (88% interna; 63% operacional). Os bloqueios que impedem a publicação automática de novas ofertas no Telegram são:

1. **0 ofertas com preço oficial validado nas últimas 24h**;
2. **0 regras de afiliado ativas**, sem marketplace/tag operacional para transformar a oferta em publicação elegível;
3. a leitura de produtos da **Lomadee retorna 504 após cerca de 8 segundos**; não tratamos timeout como autenticação válida nem como falha local resolvida;
4. a publicação social segue bloqueada até a autorização oficial Meta; dois erros de GET por referência indefinida foram registrados antes da v319 e o GET voltou a responder 200;
5. faltam configurações externas adicionais para recursos opcionais: chave OpenAI na configuração do projeto, Runway API, Amazon Creators e números WhatsApp validados. Gemini/OpenAI continuam selecionáveis; a correção de IA deixa a falta de chave visível como setup pendente.

O Telegram está configurado e tem prova histórica de envio; os cron jobs estão ativos. Porém, a execução observada do autopilot avaliou 49 ofertas e enfileirou zero. Portanto, esta rodada corrige o caminho de imagem e torna explícito o erro de setup da IA, mas não transforma ofertas antigas/sem preço atual ou sem afiliado válido em mensagens. Isso preserva a checagem de preço e a rastreabilidade do link.

### Limites da conclusão

Os testes locais e as verificações administrativas comprovam contratos e estado da conta naquele instante; não provam aprovação de APIs de terceiros nem entregas futuras. Não foram disparadas ofertas artificiais para o canal real. A publicação externa automática só pode ser declarada operacional depois que existir uma oferta elegível com preço recente, regra de afiliado ativa e recibo oficial de mensagem. Também permanecem para rodadas específicas: auditoria de permissões/isolamento em todas as 82 funções, validação de cada marketplace e Meta/TikTok/Kwai com contas autorizadas, e confirmação do registro `WAITING_CONFIRMATION` antes de qualquer reenvio.

## 8. Conferência da alteração publicada com o branch

A v321 está live e os três arquivos que receberam correção foram comparados por SHA-256 com o worktree após o commit `84e87d3`. Os arquivos completos ainda divergem entre Hatchable e GitHub; não fazer sincronização integral nem substituir nenhum deles em bloco. A lógica específica corrigida está presente nas duas versões, mas existem diferenças anteriores fora desta alteração.

| Arquivo | GitHub/worktree (`84e87d3`) | Hatchable v321 | Estado do trecho corrigido |
|---|---|---|---|
| `api/jobs/telegram.js` | `b0937d0440e2f3c8c2f556de317ad9c210253d8532f8de0eaf4152281d3953fc` | `e61419ffea7ddfbc971745c64acf18cd7d2e80c3e2988260c49bb99de4495352` | Ambos pedem URL pública temporária para mídia aprovada |
| `api/n8n/telegram-tick.js` | `69148d060d5ce5c72e456870c6e2401dba353e7c03df48b78381f4984c81694b` | `40ef25107e0fc5cb4476f0ebe373ccfe68028a116a85dac9bd9cc8ae92ad944c` | Ambos pedem URL pública temporária para mídia aprovada |
| `lib/media.js` | `7007c45ae69a87fc52dcc4c5821bd54eceefeebe0e42366e623cd9f07bfb3170` | `bb467771de0f8d385c818b6127f1bf51956edcff02c4eb90798e4c4e72b8c07a` | Ambos detectam falta de chave na mensagem/código e respondem estado de setup |

**Observação:** os hashes de GitHub nessa tabela devem ser relidos antes da próxima atualização, pois mudanças posteriores no branch os invalidam. A diferença integral já existia no baseline; esta rodada conciliou somente os trechos necessários e não apagou divergências preexistentes. O projeto segue sem sincronização global Hatchable ↔ GitHub.
