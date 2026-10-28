# Inventário do frontend observável

## Evidências consultadas

1. Site público atual, navegado em contexto limpo sem autenticação.
2. Capturas de tela em desktop e viewport móvel para página inicial e FAQ.
3. HTML anexado anteriormente, uma captura estática de dashboard autenticado, usada somente como arquivo.
4. Evidência estática REA antiga com bundles Nuxt exportados; não é fonte original.

## Interface pública atual

A página inicial pública tem 31 links, 16 botões, 14 imagens, um `select`, um iframe e não apresenta formulários no estado inicial. A FAQ tem 22 links e um botão; o botão de busca abre uma caixa de diálogo com campo de pesquisa. A busca por “WhatsApp” exibe artigos públicos de QR, canais, código de pareamento, escolha de grupos e erros de conexão. A rota `/faq/publicar` responde com título e H1 “Publicar”. No viewport de 390×844, a largura do documento permaneceu 390 px, sem rolagem horizontal.

Elementos visuais identificados nas capturas: landing page clara com navegação e hero verde/preto; FAQ em tema escuro com campo de busca e cards de categorias. Evidências visuais: `screenshots/reference-home-desktop.png`, `reference-home-mobile.png`, `reference-faq-desktop.png`, `reference-faq-mobile.png`, `reference-faq-search-whatsapp.png`.

## Rotas e acesso

- `/` e `/faq` são páginas públicas e retornaram HTTP 200.
- `/faq/publicar` é uma categoria acessível publicamente.
- Navegação direta a `/dashboard` sem sessão redirecionou para `/login` (resposta final HTTP 200). Não houve tentativa de contornar esse controle.
- A captura HTML anterior mostra âncoras para `/dashboard`, `/configuser`, `/biolinkpro`, `/aulas`, `/indicacoes`, `/faq`, `/suporte`, `/seusdados`, `/feedback`, `/postagens` e `/modo-copiador`, além de itens sem destino explícito.
- A análise estática de bundles históricos encontrou candidatos a 55 rotas e 71 caminhos `/api/`. São nomes extraídos de código público compilado, não contratos runtime confirmados.

## Estrutura visual da captura autenticada

A fotografia HTML tem cabeçalho, barra lateral, navegação agrupada, conteúdo principal e cartões de acesso rápido. Há botões de grupo “Postagens”, “Ferramentas”, “Crescimento” e “Configurações”. O layout é classificado como evidência de uma tela, não de implementação funcional. Não foi possível comparar responsividade autenticada sem acessar uma conta autorizada nesta etapa.

## Bibliotecas e recursos

Nuxt/Vue aparecem como sinais no bundle e no classificador do webEmbedding; grau de confiança dessa identificação é inferencial. O bundle Nuxt acima é diretamente referenciado na captura. Não foram determinados com confiança versão exata, framework do backend, serviço de dados ou arquitetura interna. Fontes tipográficas e assets privados não foram extraídos nem reutilizados.
