# Publicação autorizada — Radar Promo Ofertas v3

Em 20/11/2026, após autorização explícita do proprietário nesta conversa, Radar Promo Ofertas v3 foi publicado com status live às 11:10:26 UTC (08:10:26 em Brasília). URL: https://radar-promo-ofertas.hatchable.site. O Radar Promo Brasil permaneceu na v672. Nenhum APK foi gerado, nenhuma mensagem externa foi enviada e nenhum comentário/voto de teste foi criado em produção.

## Conferência anterior e posterior

GitHub main: a6ec44374fcf0915cb37940679af79c9cef6bfd8. Branch android/github-actions-build: d6b82af69aeaf61a9c2055ba1758e9005c344090 antes desta atualização documental, PR 202 draft. Código da comunidade testado no commit b4991b7b4f1e19ce797562de05fb3fd824142dbe. Os sete arquivos preparados e hatchable.toml estavam byte a byte iguais ao GitHub; após publicar, seus hashes foram novamente conferidos no manifesto v3 e coincidem.

Arquivos de código publicados: api/comments/manage.js; lib/community.js; public/community-client.js; public/community-ui.js; public/community.css; public/community.html; public/login.html. As demais mudanças entre v2 e v3 eram documentação privada. Nenhuma migração nova, alteração de segredo ou cutover foi feita.

O dry-run anterior à publicação passou com zero erros. A configuração foi mantida: visibilidade personal, isolamento de autoria por filtros SQL parametrizados, três leituras públicas intencionais. A plataforma apresentou avisos de ausência de políticas declarativas de linha e de visibilidade, já documentados. O aviso de deploy sobre ausência de import direto de db nas rotas não corresponde à arquitetura: lib/api.js importa db de hatchable e o fornece aos handlers de comunidade. Esse arquivo foi relido e preservado.

## Testes e resultado real

CI do HEAD d6b82af: execução web 44226053359 e Flutter 44226053347 aprovadas, consultadas em 20/11. Evidências detalhadas do mesmo código b4991b7: Flutter 44225359067 com análise e 10 testes; web 44225359005 com build, 258 testes unitários, 6 de navegador e audit sem vulnerabilidades reportadas. Não são testes em aparelho nem homologação da sessão real.

Após publicar, GET /api/offers (anônimo, limit=1) e GET /api/comments/manage (anônimo) retornaram 429 usage_limit: 2,1 horas de banco utilizadas no orçamento mensal Free de 2,0 horas. O bloqueio ocorre antes da execução útil, portanto nem os dados do feed nem o 401 da rota autenticada puderam ser confirmados. Não repetir testes em ciclo, elevar plano ou declarar integração homologada.

Status: código publicado e manifesto validado; execução funcional bloqueada por limitação externa. Login com código, passkeys, escrita autenticada, avisos de respostas em produção e operação Android continuam sem homologação real. Push Android continua não configurado.

## Acesso público e próxima ação

O projeto segue personal/private. Visitantes comuns encontram a barreira de login do Hatchable antes do próprio login do aplicativo. A plataforma exige que o proprietário altere manualmente a visibilidade para public no console: https://hatchable.com/console/projects/radar-promo-ofertas. Essa alteração não foi feita por MCP nem por navegador.

Após regularização da quota e visibilidade, validar leituras, autenticação e operações permitidas; manter a geração de APK desativada até o aplicativo estar pronto. A PR continua draft; não houve merge na main. Documentação do resultado espelhada em WIP, preservando os históricos divergentes de índice/controle do Radar original. Não se declara sincronização integral/bidirecional.

Recuperação: reverter somente os arquivos deste incremento na branch e publicar a versão anterior revisada do backend independente se necessário; não apagar tabelas nem comentários/avisos. A versão v2 permanece no histórico de implantações.
