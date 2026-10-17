# Auditoria de repositórios públicos para links de afiliados

**Data:** 2026-10-17  
**Projeto auditado:** Radar Promo Brasil  
**Escopo:** geração/conversão de links, dados de produto, rastreabilidade de afiliados e possíveis conectores.

## Conclusão executiva

A revisão não encontrou um pacote que deva ser copiado diretamente para produção neste momento. O Radar já possui validação de URLs, regras de afiliados por marketplace, bloqueio do autopilot quando não há método de afiliado validado, histórico de preço oficial e importação Lomadee usando endpoints próprios do provedor. O ganho mais seguro é preservar essas barreiras e adotar, quando houver uma integração aprovada, adaptadores isolados por provedor com testes de contrato.

**Nenhum código dos repositórios externos listados abaixo foi copiado ou instalado por esta auditoria.** Isso evita introduzir dependências, licenças ou fluxos de autenticação não validados. A documentação registra a decisão e os próximos passos para que a escolha seja rastreável.

## Comparação

### 1. Garimpei API RESTful

- Repositório: https://github.com/jglucian0/garimpei-api-rest
- O README descreve extração de preço, título, imagem e link, roteamento por marketplace, links curtos, armazenamento de cookies e API protegida por chave.
- **Risco relevante:** o README anuncia técnicas de evasão de anti-bot e coleta de cookies/sessões de marketplace. Isso exige uma análise jurídica/de termos e de segurança independente; não é adequado importar ou operar esses mecanismos sem autorização explícita da plataforma.
- **Decisão:** não incorporar scraping, bypass anti-bot, extensão coletora de cookies nem encurtador desse projeto. Reutilizar apenas o conceito geral de normalizar os dados de produto e separar conectores por marketplace, já compatível com a arquitetura atual.

### 2. Afilimax Mercado Livre Provider

- Repositório: https://github.com/Afilimax/mercado-livre-provider
- O README descreve um provider para gerar links curtos do Mercado Livre, com dependência peer de `@afilimax/core`, tag de afiliado e cookies de sessão.
- **Riscos/pendências:** depende de cookies de sessão e de um pacote peer separado; não foi demonstrado nesta auditoria que o fluxo é compatível com as credenciais e permissões atuais da conta Radar, nem que o pacote está aprovado para uso em produção. Uma descrição no README não comprova autorização oficial ou funcionamento atual.
- **Decisão:** não instalar nem enviar cookies da conta para esse provider. Antes de considerar integração, exigir documentação oficial atual, licença, revisão de dependências, teste isolado e confirmação de que o método de geração é permitido pela plataforma. Preferir OAuth/API oficial disponível à conta.

### 3. AffiliateLinksGenerator

- Repositório consultado: https://github.com/viniferp/AffiliateLinksGenerator
- A API do GitHub retornou que o repositório está vazio, portanto não há código para avaliar ou integrar.
- **Decisão:** descartado até que exista código, licença e documentação verificáveis.

### 4. BridgeAPI

- Repositório: https://github.com/EvandroSchechtel/BridgeAPI
- O README apresenta um monorepo de conectores MCP, incluindo WhatsApp Business API e Mercado Livre, além de gateway e dashboard. Os pacotes são apresentados como v0.1.0; o README também informa que os hooks de confiança ainda são no-op na primeira fase e lista itens do roadmap não concluídos.
- **Risco/limitação:** um conector MCP não é automaticamente um adaptador compatível com o backend/n8n do Radar. Antes de uso, é necessário verificar publicação e integridade do pacote, licença, endpoints, permissões, tratamento de erros, limites, testes e credenciais. Para WhatsApp, deve-se priorizar a Cloud API oficial e as regras do canal.
- **Decisão:** não adicionar o monorepo inteiro ao Radar. Pode ser reavaliado como serviço/conector separado somente após prova de funcionamento em sandbox e análise de segurança. Não substitui a configuração pendente do canal WhatsApp no Radar.

## Estado encontrado no Radar Promo Brasil

Arquivos e documentação verificados nesta revisão:

- `lib/validation.js`: valida URLs HTTPS e diferencia URLs de imagem direta; normaliza nomes de marketplaces.
- `lib/autopilot.js`: exige preço verificado por fonte oficial recente, URL de afiliado HTTPS e método de afiliado ativo antes de enfileirar ofertas automaticamente; impede duplicidade por destino/oferta e respeita cooldown/limite diário.
- `api/jobs/lomadee.js`: consulta a API da Lomadee, valida campos do produto, gera URL curta pela rota do provedor e registra ofertas sem duplicar fingerprints.
- `lib/offer-images.js`: resolve imagens armazenadas por rotas próprias do Radar.
- `README.md`: documenta que uma tag/sub-ID isolada não transforma um link comum em link afiliado e que Amazon/Mercado Livre não garantem comissão apenas pela montagem de parâmetros.

Isso significa que o principal gap não é simplesmente “gerar uma URL”: é validar a atribuição de comissão por rede, comprovar a fonte oficial do preço e testar o link de ponta a ponta sem publicar uma oferta real.

## Recomendações priorizadas

1. **Manter a barreira de publicação existente.** Não liberar autopilot por haver apenas uma URL de produto ou um parâmetro `sub_id`.
2. **Criar adaptadores isolados por provedor apenas quando houver acesso aprovado.** Interface sugerida: validar credencial, converter URL de produto em link rastreável, consultar estado/expiração quando suportado e devolver diagnóstico sem registrar segredos.
3. **Mercado Livre:** usar OAuth/API oficial e os endpoints autorizados para a conta. Testar em ambiente controlado a conversão, redirecionamento final, parâmetros de atribuição e retorno de erros. Não usar cookies copiados de navegador como atalho.
4. **Amazon:** só montar links com o identificador de associado confirmado e dentro das regras vigentes do programa. A preferência de identificador digitada no cadastro não prova aprovação nem habilitação.
5. **Shopee e demais redes:** exigir link gerado ou validado pela própria rede de afiliados; guardar o SubID por campanha/canal sem inventar tags.
6. **WhatsApp:** manter a integração separada da geração de links. Validar a Cloud API oficial ou outro provedor expressamente escolhido, credenciais armazenadas em cofre/n8n, destino autorizado e entrega em sandbox antes de habilitar envios reais.
7. **Testes de contrato:** para cada provedor, cobrir URL válida/inválida, produto sem imagem, link não afiliado, credencial inválida, timeout, rate limit, duplicidade e preservação do SubID. Testes não devem publicar mensagens nem consumir operações pagas.
8. **Licença e cadeia de suprimentos:** antes de reutilizar código externo, confirmar arquivo LICENSE, dependências, atividade/manutenção, avisos de segurança e compatibilidade de licença. A existência pública de um repositório não autoriza automaticamente copiar seu código.

## Resultado desta auditoria

- **Código externo instalado/copied:** não.
- **Mudança funcional de produção nesta auditoria:** nenhuma; esta alteração é documentação e não modifica a lógica do serviço.
- **Próximo trabalho técnico recomendado:** revisar a implementação e os contratos atuais de cada rede (começando por Mercado Livre), implementar somente o adaptador para o qual existam credenciais oficiais e permissões verificáveis e testar em sandbox antes de liberar a fila.


### 5. Afilimax CLI

- Repositório: https://github.com/Afilimax/afilimax-cli
- O README descreve uma CLI modular com provedores para Amazon, Mercado Livre, Shopee, AliExpress e Magalu. Para Amazon e Mercado Livre, depende de cookies/sessões; para Shopee e AliExpress, declara credenciais de desenvolvedor/afiliado.
- **Decisão:** não instalar a CLI no servidor de produção como solução pronta. É uma ferramenta interativa local, e a parte baseada em cookies/navegador não é adequada para execução confiável em backend. Os provedores que declaram API oficial podem servir como referência para desenhar testes de contrato, após validação da documentação e da licença de cada pacote.

### 6. Afilimax Amazon Browser Provider

- Repositório: https://github.com/Afilimax/amazon-browser-provider
- O README usa Puppeteer, cookies de sessão, SiteStripe, stealth e declara resolução de CAPTCHA.
- **Decisão:** não incorporar. Automação de navegador, stealth e tratamento de CAPTCHA elevam o risco operacional e de conformidade; preferir as ferramentas oficiais do programa Amazon Associates e validar a tag aprovada.

### 7. Afilimax AliExpress Provider

- Repositório: https://github.com/Afilimax/aliexpress-provider
- O README declara integração com AliExpress Open Platform por `appKey`, `appSecret` e `trackingId`, com assinatura HMAC-SHA256, dependendo de `@afilimax/core`.
- **Decisão:** é o candidato mais promissor do conjunto para uma avaliação técnica futura porque declara usar a Open Platform em vez de cookies de navegador. Ainda não foi integrado: é necessário confirmar licença e código, verificar que o endpoint e as permissões correspondem ao acesso concedido à conta Radar, testar credenciais em sandbox e auditar armazenamento/rotação de segredos e respostas da API. Não colocar segredos em código ou testes versionados.

### 8. Afilimax Message Text Parser

- Repositório: https://github.com/Afilimax/message-text-parser
- O README descreve parser de mensagens de ofertas de canais Telegram específicos, com extração de título, preço, URL e cupom; declara licença MIT.
- **Decisão:** não adicionar a dependência ao caminho de publicação sem testes. O projeto é orientado a formatos de canais específicos e pode falhar em mensagens de outros grupos. Se a ingestão de mensagens recebidas virar requisito, primeiro criar fixtures anonimizadas e testar precisão, falsos positivos, URLs maliciosas, preços e cupons; então comparar com um parser próprio pequeno.


## Integração de código de terceiro (PR de avaliação)

Foi adicionado um adaptador experimental inspirado em `@afilimax/aliexpress-provider@0.1.0`, sob licença MIT, com atribuição e cópia da licença em `public/licenses/AFILIMAX-ALIEXPRESS-PROVIDER-MIT.txt`.

- Código adaptado: `lib/afilimax-aliexpress-provider.js`.
- Ação explícita: `generateLinkAfilimax` em `api/integrations/aliexpress.js`.
- Testes sem rede: `tests/afilimax-aliexpress-provider.test.mjs`.
- O adapter não é chamado pelo autopilot, não publica ofertas e exige a confirmação `legacyApiAcknowledged=true` já prevista no fluxo de credenciais.
- Valida a URL de entrada e o host do link retornado, aplica timeout e não imprime segredos nem o corpo bruto de erros.
- **Limitação importante:** o provider externo declara HMAC-SHA256 e o endpoint `api-sg.aliexpress.com/sync`, mas a documentação pública da Affiliate API está marcada como descontinuada. Os testes de unidade não provam que a conta do usuário ainda tem permissão ou que o contrato da API funciona em produção. A ação deve continuar experimental até um teste real, autorizado e sem publicação.

A implementação foi adaptada, não instalada como dependência npm: isso evita introduzir uma cadeia de dependências e mantém o código compatível com o runtime V8 do Hatchable. O provider oficial legado já existente permanece inalterado.


## Verificação operacional em 2026-10-17 (após auditoria)

Testes de leitura/diagnóstico executados no Hatchable, sem publicar ofertas nem enviar mensagens reais:

- `POST /api/messages/parse-preview` com texto fictício de oferta Amazon: **HTTP 200**; reconheceu marketplace, preços e URL; manteve `requiresManualReview=true` e `autoPublish=false`.
- `POST /api/messages/parse-preview` com URL comum do Mercado Livre: **HTTP 200**; identificou que não havia evidência suficiente de link de afiliado e manteve revisão manual.
- `GET /api/mercadolivre/products?q=fone%20bluetooth`: **HTTP 200**; catálogo retornou resultados de descoberta, mas sem preços/IDs de anúncios individuais confiáveis em todos os resultados. O próprio endpoint alerta que busca de anúncios retornou 403 nessa conexão. Não tratar resultados de catálogo como ofertas prontas para publicação.
- `GET /api/integrations/amazon`: **HTTP 412** porque não há credenciais da Amazon Creators API cadastradas na conta.
- `POST /api/telegram/incoming` com payload fictício: **HTTP 503** porque falta `TELEGRAM_WEBHOOK_SECRET`. Nenhuma mensagem foi enviada nem importada pelo teste.
- `GET /api/readiness`: **HTTP 200**, estado `SETUP_REQUIRED`. Antes da correção, o painel confundia um bot de envio ativo com ingestão de mensagens Telegram pronta. A rota agora mostra separadamente **Telegram (envio)**, **Importação recebida do Telegram** e **Amazon Creators API**, com ações específicas para os bloqueios.
- Validação Hatchable antes do deploy: **0 erros e 0 avisos**. Publicado como versão **v291**.

### Próximas ações externas necessárias

1. Configurar `TELEGRAM_WEBHOOK_SECRET` no cofre de segredos do Hatchable e então registrar/verificar o webhook do bot.
2. Inserir as credenciais aprovadas da Amazon Creators API (Credential ID, Credential Secret e Partner Tag) na integração segura e executar o teste somente leitura.
3. Para Mercado Livre, concluir a regra de afiliado e validar link oficial de afiliado e anúncio individual; a saúde OAuth/API não significa que a regra de atribuição esteja ativa.
4. Validar WhatsApp/n8n e a vitrine apenas quando forem configurados. O autopilot permanece bloqueado enquanto não houver regra de afiliado ativa e preço oficial verificado recentemente.

Esses bloqueios dependem de credenciais/permissões da conta e não devem ser simulados com valores fictícios. O deploy não alterou filas, não aprovou ofertas e não ativou publicação automática.
