# Capturador Multiplataforma v1.1.2

## Instalação
1. Baixe o ZIP desta branch e extraia-o.
2. Abra `chrome://extensions`, habilite **Modo do desenvolvedor** e clique em **Carregar sem compactação**.
3. Selecione a pasta que contém `manifest.json`.

## Integração com a API standalone do Radar
1. Configure a URL HTTPS completa da API, terminando em `/api/data` (por exemplo, `https://seu-dominio/api/data`).
2. Em produção standalone, informe o valor de `STANDALONE_API_TOKEN` no campo Bearer. Esse token deve ter sido configurado no servidor e ter pelo menos 32 caracteres.
3. Abra uma página de produto suportada, clique em **Capturar página atual**, revise os dados e informe um link de afiliado HTTPS válido.
4. Clique em **Enviar oferta ao Radar**. O capturador envia `entity: "offer"` e os campos no nível superior do JSON, conforme o contrato de `api/data.js`.
5. Confira a resposta e confirme a oferta no catálogo do Radar. Resposta HTTP 2xx indica que a API aceitou a solicitação; a confirmação no catálogo é a verificação final.

## Autenticação e hospedagem
- O servidor standalone em produção exige `STANDALONE_API_TOKEN`, `STANDALONE_AUTH_SECRET` e `STANDALONE_USER_ID`. O token Bearer deve corresponder a `STANDALONE_API_TOKEN`.
- A rota `/api/data` hospedada no Hatchable usa a autenticação de membro da plataforma. O token standalone não autentica essa rota. Não cole senhas, cookies nem segredos em issues ou mensagens públicas.
- A URL deve apontar para o servidor que realmente hospeda a API. O repositório não determina por si só o domínio de produção.
- O capturador envia a oferta ao catálogo, mas não publica automaticamente no Telegram ou WhatsApp. Publicação segue o fluxo de aprovação e os conectores oficiais.
- O link de afiliado e a imagem precisam usar HTTPS. A API pode rejeitar duplicatas (HTTP 409) ou dados inválidos.
- Ofertas locais e configurações ficam no armazenamento da extensão; exportar JSON não é o mesmo que sincronizar com o servidor.

## Diagnóstico
- **401/403:** confira token, ambiente e autenticação.
- **404:** confirme domínio e caminho `/api/data`.
- **409:** a API identificou uma oferta duplicada.
- **Erro de rede/CORS:** confirme HTTPS, permissões de acesso e política de origem do servidor.
- **2xx sem oferta no catálogo:** confira a conta autenticada e o catálogo; não considere apenas o status HTTP como prova de persistência.

A captura depende do HTML público/visível de cada loja e precisa ser validada em páginas reais. A extensão não cria links afiliados nem contorna autenticação de lojas.
