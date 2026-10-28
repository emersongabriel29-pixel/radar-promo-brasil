# Capturador Multiplataforma — Radar Promo Brasil (v1.1.0)

## Instalação
1. Baixe o ZIP da branch e extraia-o.
2. Abra chrome://extensions, habilite Modo do desenvolvedor e clique Carregar sem compactação.
3. Selecione esta pasta (a que contém manifest.json).
4. Abra uma página de produto compatível e clique no ícone da extensão.

## Envio ao backend
1. Abra o Radar em outra aba e confirme o endpoint real de importação com o código do backend/deploy. O endpoint NÃO deve ser adivinhado.
2. No popup, informe a URL HTTPS completa do endpoint, por exemplo apenas como formato: https://SEU-DOMINIO/api/data. Substitua pelo domínio real.
3. Se a API tiver autenticação Bearer especificamente para integração, informe esse token. Não use senha da conta, cookie de sessão ou segredo Supabase no campo.
4. Capture produto, revise campos, informe link de afiliado HTTPS, imagem HTTPS e preço válido.
5. Clique Enviar oferta ao Radar. A extensão exibe o status HTTP e salva o resultado local para auditoria.

## Limitações importantes
- O payload entity=offer e data é uma integração candidata, não certificada. Confira o contrato do endpoint de produção antes de usar.
- Se o endpoint aceitar apenas sessão do navegador, o envio pode falhar por CORS/autenticação. Não reutilize nem copie cookies de sessão.
- Resposta HTTP 2xx não prova que a oferta aparece no catálogo: confira o catálogo e logs do backend.
- Preços e links são capturados de páginas e devem ser revisados. Captura não cria link de afiliado.
- A extração pode falhar conforme a loja, país, variante de página ou proteção anti-bot.
- Não testado em produção; não declarar pronto antes de validar as cinco lojas e um cadastro real.
