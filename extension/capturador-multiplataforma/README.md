# Capturador Multiplataforma v1.5.0

## Captura ao copiar link
- O content script observa o evento de cópia nas páginas HTTP/HTTPS e extrai somente uma URL do texto exposto nesse evento.
- Quando encontra um link, pode abrir o destino em nova aba e, após o carregamento, extrair título, preço, preço anterior, imagem, categoria, marketplace e URL do produto.
- O link originalmente copiado é preservado como link de afiliado para revisão. A extensão não garante elegibilidade nem comissão.
- O botão “Ler link copiado agora” oferece leitura explícita do clipboard, após clique do usuário. Não há monitoramento contínuo da área de transferência.
- Se a página copiar via API sem disparar evento `copy`, use o botão de leitura explícita.

## Modos
- **Assistido:** captura e salva como rascunho local para revisão.
- **Automático:** captura e salva localmente sem exigir clique em “Capturar página atual”.
- **Inteligente:** modo preparado para envio à API conforme as opções de configuração. O envio automático permanece desativado por padrão.

## Marketplaces
O domínio final carregado é identificado como Mercado Livre, Amazon, Temu, SHEIN, Magalu ou Outra. A extração usa metadados públicos, JSON-LD e DOM; pode exigir ajustes se a loja mudar a página.

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
- Não usa endpoints privados nem contorna bloqueios.
- Links encurtados e redirecionamentos dependem de a navegação chegar a uma página de produto compatível.
- Preços e imagens podem não estar disponíveis em todas as páginas; revise os dados antes de enviar.