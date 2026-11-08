# Admitad — ficha técnica observada

## Evidência no projeto
Arquivo `api/integrations/admitad.js` (247 linhas). A rota usa `https://api.admitad.com`, OAuth com client_credentials e refresh_token, criptografia AES-GCM de credenciais no banco e escopos `advcampaigns advcampaigns_for_website deeplink_generator websites`.

## Operações presentes
- Obter token e renovar quando expirar.
- Consultar campanhas e feeds de produto.
- Ler feed XML apenas do host oficial `export.admitad.com`, sem expor URL autenticada.
- Gerar deeplink com Website ID, campanha e SubIDs.
- Pré-visualização de feed não salva nem publica produtos.

## Controles
Feed limitado a 2 MB; HTTPS; host allowlist; timeout; URL de destino HTTPS; link gerado precisa ser HTTPS de domínio Admitad autorizado. O código não habilita publicação automática.

## Estado operacional
Não apareceu credencial ADMITAD no inventário de credenciais de produção consultado em 08/11/2026. Portanto: implementada, mas não configurada/validada nesta conta. Confirmar documentação oficial, permissões e limites da conta antes de habilitar.