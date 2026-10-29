# Capturador Multiplataforma v1.6.1

## Captura ao copiar link
- O content script observa o evento de cópia nas páginas de marketplaces compatíveis e extrai somente uma URL do texto exposto nesse evento.
- Quando encontra um link de marketplace reconhecido, pode abrir o destino em nova aba e, após o carregamento, extrair título, preço, preço anterior, imagem, categoria, loja e URL do produto.
- O link originalmente copiado é preservado como link de afiliado para revisão. A extensão não garante elegibilidade nem comissão.
- O botão “Ler link copiado agora” oferece leitura explícita do clipboard, após clique do usuário. Não há monitoramento contínuo da área de transferência.
- Se a página copiar via API sem disparar evento `copy`, use o botão de leitura explícita.

## Modos
- **Assistido:** captura e salva como rascunho local para revisão.
- **Automático:** captura e salva localmente sem exigir clique em “Capturar página atual”.
- **Inteligente:** captura e salva; se “Enviar automaticamente à API” estiver habilitado, tenta enviar quando os campos obrigatórios estiverem válidos.
- A configuração inicial é assistida e o envio automático começa desativado.

## Marketplaces compatíveis
Mercado Livre, Amazon, Shopee, AliExpress, Temu, SHEIN e Magalu. A identificação usa o domínio final carregado. A extração utiliza metadados públicos, JSON-LD e DOM; pode exigir ajustes se a loja mudar sua página. Links curtos e redirecionamentos dependem de o navegador chegar a uma página de produto compatível.

## Instalação
1. Extraia o ZIP.
2. Abra `chrome://extensions`, habilite **Modo do desenvolvedor** e clique em **Carregar sem compactação**.
3. Selecione a pasta que contém `manifest.json`.

## API
- Configure o endpoint HTTPS `/api/extension-offers` e o token Bearer exclusivo gerado no painel do Radar.
- O envio usa `credentials: omit`: não depende de cookies nem de sessão do navegador.
- Não use o token da extensão em `/api/data` nem como credencial de marketplace.
- HTTP 201 confirma recebimento como rascunho; a oferta fica `PENDING` e precisa ser revisada no catálogo. Não há publicação automática.
- O capturador não publica diretamente no Telegram/WhatsApp; segue o fluxo de aprovação e publicação do Radar.

## Privacidade e limites
- A extensão não lê senhas, cookies ou tokens dos marketplaces.
- O observador só processa texto disponibilizado pelo evento `copy`; a leitura direta do clipboard acontece apenas após clique no botão.
- A extensão limita sua permissão aos domínios dos marketplaces compatíveis.
- Não usa endpoints privados nem contorna bloqueios.
- Preços e imagens podem não estar disponíveis em todas as páginas; revise os dados antes de enviar.

## Conectores por marketplace

A interface permite configurar endpoint HTTPS independente para Mercado Livre, Amazon, Shopee, AliExpress, SHEIN, Temu e Magalu. Os endpoints devem apontar para adaptadores do backend do Radar que implementem o contrato documentado em `INTEGRACOES_MARKETPLACES.md`. Os segredos oficiais ficam no servidor, nunca na extensão. Configurar um endpoint não ativa por si só acesso à API oficial; são necessárias credenciais, aprovação e implementação do adaptador no servidor.

## Integração com APIs oficiais do Radar
- O painel da extensão usa a URL-base/token da API central e chama as rotas existentes `/api/integrations/{marketplace}`; não é necessário criar um endpoint genérico por loja.
- Amazon, Shopee e AliExpress têm operações de leitura e geração de links implementadas no backend, sujeitas às credenciais e permissões de cada programa.
- Mercado Livre, SHEIN, Temu e Magalu têm fluxos que distinguem OAuth/conta de links de afiliado; onde não há API pública de geração validada, a extensão orienta a importar o link oficial gerado no portal.
- Credenciais oficiais ficam criptografadas no backend. O token da extensão autentica no Radar, não no marketplace.
- A autenticação Bearer desta integração vale exclusivamente para o envio de ofertas em `/api/extension-offers`; não autentica as rotas dos conectores de marketplace. A conexão individual de Amazon, Shopee, AliExpress e demais lojas permanece uma etapa separada.
- Consulte `INTEGRACOES_MARKETPLACES.md` para capacidades, rotas e limitações por loja.


## Envio HTTPS para o Radar (configurado)

- O campo do token não bloqueia o formulário quando a seção de configuração está recolhida; salve o token pela própria seção de configuração.
- O token `rpb_ext_` é exclusivo para recebimento de ofertas. A área de conectores na extensão é informativa; configure e opere as APIs de marketplace pelo painel do Radar, com as credenciais oficiais de cada programa.

- Endpoint de ofertas: `https://radar-promo-brasil.hatchable.site/api/extension-offers`.
- O endpoint é específico da extensão e não usa a rota web `/api/data`, que exige sessão de membro.
- No painel do Radar, abra **Integrações → Extensão Capturador Multiplataforma → Gerar / renovar token da extensão**. Copie o token exibido uma única vez.
- Na extensão, abra **Configuração da API**, mantenha o endpoint HTTPS acima e cole o token. Salve a configuração.
- O token é individual por conta; o backend armazena somente SHA-256 e permite revogar/rotacionar pelo painel. O token fica em `chrome.storage.local` restrito a contextos confiáveis do Chrome.
- Ofertas recebidas são criadas como `PENDING`, com `validation_status=PENDING` e `storefront_visible=false`. A extensão não publica nem aprova automaticamente.
- O backend limita a 30 ofertas por minuto por conta e rejeita token ausente/revogado, links que não sejam HTTPS e ofertas duplicadas.
- A rota de recebimento foi testada com token válido: HTTP 201; a oferta de teste foi removida após a verificação e o token de teste foi revogado. Sem token, a rota responde HTTP 401.

**Atenção:** o token acima autentica apenas o envio de ofertas ao Radar. As ações de consulta/geração nas APIs de cada marketplace continuam dependendo de autenticação e permissões próprias; não reutilize o token da extensão como credencial de marketplace.
