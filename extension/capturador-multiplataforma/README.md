# Capturador Multiplataforma v1.3.0

## Busca automática de cupons (v1.3.0)\n- Depois de capturar ou informar o nome de um produto, clique em **Buscar cupons automaticamente**.\n- A extensão abre uma pesquisa web com o nome do produto, loja e termos de cupom/desconto, priorizando resultados de Promobit, Pelando, Cuponomia, Melhores Cupons e Cupom.org.\n- A extensão não aplica cupons nem garante que um código ainda esteja ativo; confira validade, elegibilidade, valor mínimo e regras na página de origem antes de publicar ou comprar. A busca depende do mecanismo de pesquisa e da disponibilidade dos sites.\n\n## Instalação
1. Baixe o ZIP desta branch e extraia-o.
2. Abra `chrome://extensions`, habilite **Modo do desenvolvedor** e clique em **Carregar sem compactação**.
3. Selecione a pasta que contém `manifest.json`.

## Captura automática
- Nome, preço, preço anterior, imagem e URL são extraídos dos metadados públicos, JSON-LD e elementos visíveis da página.
- Categoria é obtida de metadados e breadcrumbs da loja. Se não houver informação confiável, o campo fica vazio para revisão; a API do Radar também classifica pelo título e descrição.
- Sub_id/canal é lido de parâmetros conhecidos da URL quando disponíveis; caso contrário, usa o canal padrão salvo na configuração, por exemplo `telegram`.
- O link de afiliado é reaproveitado quando a URL atual contém parâmetros de rastreamento reconhecíveis. Também é possível configurar um modelo HTTPS que contenha `{url}` e opcionalmente `{subId}`.
- **Não existe um formato universal de link afiliado.** O modelo precisa ser fornecido e validado pelo programa de afiliados usado. Quando a plataforma exige uma API oficial, essa API e suas credenciais precisam ser integradas; a extensão não inventa links nem confirma comissões por conta própria.

## API e autenticação
- Configure o endpoint HTTPS real da API.
- O campo Bearer só funciona se a API de destino aceitar esse método. A rota Hatchable `/api/data` usa autenticação de membro (`req.member`) e não aceita automaticamente um token standalone.
- A extensão envia `subId` e o backend o persiste em `offers.sub_id`; a migração `041_offer_sub_id.sql` adiciona a coluna e o índice no banco standalone. Em ambientes já existentes, confirme que as migrações foram aplicadas antes de enviar ofertas.
- O envio da oferta não publica automaticamente no Telegram/WhatsApp. A publicação segue o fluxo de aprovação e conectores oficiais.

## Diagnóstico
- **401/403:** autenticação recusada.
- **404:** endpoint/domínio incorreto.
- **409:** possível oferta duplicada.
- **Erro de rede/CORS:** confira endpoint, CORS e permissões.
- Resposta HTTP 2xx indica que a API aceitou a solicitação; confirme no catálogo se a oferta foi gravada.

A captura depende da estrutura pública das páginas e deve ser testada em páginas reais de cada loja.
