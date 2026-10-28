# Capturador Multiplataforma — Radar Promo Brasil

Extensão Chrome Manifest V3 para tentar capturar dados visíveis/metadados públicos de páginas de produto de Mercado Livre, Amazon, Temu, SHEIN e Magalu.

## Instalação
1. Baixe/clique em Code > Download ZIP do repositório e extraia.
2. Acesse chrome://extensions e ative Modo do desenvolvedor.
3. Clique em Carregar sem compactação e selecione a pasta extension/capturador-multiplataforma.
4. Abra uma página de produto, clique na extensão, use Capturar página atual e confira os campos.
5. Salve a oferta; ela fica no armazenamento local do navegador.

## Funcionalidades
- Captura tentativa de título, preço, preço anterior, imagem, URL canônica, SKU e marca.
- Campos manuais para link de afiliado, Sub_id, categoria e observações.
- Lista local, exclusão, exportação JSON e cópia de mensagem.
- Sem publicação automática.

## Integração com o Radar
Esta versão ainda não envia para o backend do Radar: não foi configurado nem validado um endpoint de importação autorizado. O arquivo JSON exportado pode ser usado como etapa intermediária até integrar o endpoint real.

## Limitações
A captura depende da estrutura de cada página e pode falhar ou exigir ajustes por loja. Captura de produto não cria link de afiliado. Cole o link oficial quando necessário. Não lê cookies/tokens, não contorna CAPTCHA e não automatiza ações protegidas. Testes em páginas reais ainda são necessários.
