# Awin — ficha técnica observada

## Evidência no projeto
Arquivo `api/integrations/awin.js` (146 linhas). Base `https://api.awin.com`; autenticação Bearer com token e Publisher ID numérico.

## Operações presentes
- Testar acesso e consultar programas por relacionamento e país.
- Consultar programas aprovados/pendentes/outros estados.
- Gerar deeplink com advertiserId e destinationUrl HTTPS.
- Ler feed JSONL de anunciante e locale.

## Segurança e validação
Token armazenado criptografado; URL HTTPS; IDs numéricos; feed limitado a 2 MB; parsing de JSONL; não publica ofertas. Deeplink só é retornado quando há URL HTTPS.

## Estado operacional
Nenhuma credencial AWIN apareceu no inventário de produção consultado em 08/11/2026. Implementada, mas não configurada/validada. Confirmar permissões de publisher, anunciante, Link Builder e feeds na documentação oficial vigente.