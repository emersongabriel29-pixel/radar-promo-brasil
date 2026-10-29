# Capturador Multiplataforma v1.5.0

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
- Configure o endpoint HTTPS real da API.
- O Bearer Token só funciona se o destino aceitar esse método. A rota Hatchable `/api/data` usa autenticação de membro e não aceita automaticamente token standalone.
- Respostas HTTP 2xx indicam aceitação da solicitação, não comprovam publicação nem persistência final. Confira o catálogo.
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
- A autenticação Bearer da extensão é compatível com instalações standalone configuradas para API token. Em hospedagem Hatchable com sessão de membro, chamadas cross-origin da extensão podem exigir um fluxo de autorização específico.
- Consulte `INTEGRACOES_MARKETPLACES.md` para capacidades, rotas e limitações por loja.
