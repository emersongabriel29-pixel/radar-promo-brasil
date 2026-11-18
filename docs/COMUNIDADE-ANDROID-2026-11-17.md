# Comunidade no Flutter — Radar Promo Ofertas

Registro de 17/11/2026 (Brasil). Implementação em desenvolvimento, sem APK.

## Fonte de verdade e preservação

Antes das alterações: GitHub main a6ec44374fcf0915cb37940679af79c9cef6bfd8; branch android/github-actions-build a27666959d9442d5e13e476d7756d99865f662da. Radar Promo Brasil v672; Radar Promo Ofertas v2. O Flutter da branch é a fonte para o aplicativo. lib/community.js e api/comments/manage.js do backend independente foram comparados com o Hatchable e estavam equivalentes. Nenhum código do Radar original, segredo ou dado de produção foi alterado nesta etapa.

## Implementação

- Flutter: menu Minha conta / Notificações; botão Votos e comentários nos detalhes; URLs HTTPS fixas e IDs validados. Usa url_launcher já existente, LaunchMode.inAppBrowserView (Android Custom Tabs), sem nova dependência. Sessão mantida no navegador, sem copiar cookie ou token para Dart. Não há callback que finja autenticar o feed HTTP nativo.
- Páginas próprias community.html, community.css, community-client.js e community-ui.js: conta, favoritos da conta, votos, leitura paginada, criação, edição e exclusão dos próprios comentários, respostas, preferências e caixa de entrada. Favoritos locais seguem separados; nenhum upload automático.
- Login oficial existente mantido com correções de tradução.
- GET /api/comments/manage é autenticado e retorna somente os comentários do próprio autor na mesma página pública (30 itens), sem divulgar IDs de usuário.
- POST /api/comments/manage aceita replyToId opcional. Comentário e aviso são inseridos na mesma transação. Somente o autor do comentário respondido, na mesma oferta, com consentimento ativo, recebe um aviso; autores não recebem avisos de si mesmos. Chave de deduplicação por resposta. Sem fan-out, backfill, push ou envio de e-mail.
- A caixa de entrada é consultada quando aberta ou atualizada. Não há push Android configurado.

## Segurança e erros

Texto do usuário é renderizado por textContent; controle de autoria permanece no servidor. Login mantém o retorno relativo validado. Cliente usa credentials same-origin, cache no-store, redirect error e timeout de 15 segundos; mensagens específicas para sessão expirada e quota. Comentário digitado permanece em caso de falha no envio. Não há retry automático de escritas nem dados fictícios na aplicação. Fixtures são exclusivas dos testes interceptados/em memória.

## Validação e implantação

Dois testes locais do cliente JS aprovados. O Chromium local não iniciou por restrição de socket do executor; a validação de navegador foi realizada no GitHub Actions. Flutter SDK ausente localmente; análise e testes passaram no workflow existente. Nenhum APK é gerado por esse workflow.

GET /api/offers real voltou a retornar 429 usage_limit: 2,0 horas mensais de banco consumidas no plano Free. Não repetimos chamadas em ciclo nem alteramos plano. Autenticação real com código, passkeys, escrita/avisos em produção e teste no aparelho permanecem não homologados. Visibilidade personal do projeto Ofertas também exige decisão do proprietário no console para acesso público.

Os resultados do CI e a tentativa de publicação estão registrados nos adendos abaixo. Código testado com fixtures não representa homologação externa.

## Arquivos e recuperação

mobile/radar_promo_ofertas/lib/main.dart; lib/services/community.dart; test/community_test.dart. Backend independente: public/community.*, public/community-ui.js, public/community-client.js, public/login.html; lib/community.js e api/comments/manage.js. Testes tests/rpo-community-client.test.mjs, tests/radar-ofertas-backend.test.mjs e tests/e2e/rpo-community.spec.js.

Sem migração de schema. Recuperação: reverter somente o commit desta etapa na branch e publicar a versão anterior do backend independente quando permitido; não excluir tabelas/dados. Os avisos já gravados permanecem privados na tabela existente.

## Resultado dos testes no commit b4991b7

GitHub Actions Flutter 44225359067, job 134537094308: flutter analyze sem erros e 10 testes aprovados; nenhuma geração de APK. CI web/backend 44225359005, job 134537094235: npm run build, npm test, npm audit --audit-level=moderate e 6 testes de navegador aprovados. Os testes da comunidade interceptam toda a origem e não fazem escritas de produção nem enviam e-mails.

Dry-run do Hatchable independente: zero erros. Avisos: visibilidade personal; cinco tabelas sem política declarativa de linha (isolamento aplicado nos WHERE parametrizados e testes de autoria); três rotas de leitura públicas intencionais (feed, detalhes e comentários). Políticas declarativas exigem avaliação específica do produtor de avisos entre usuários e não foram ativadas sem teste real. Não confundir esses testes em memória com validação da plataforma sob quota.

## Resultado da publicação e sincronização

Publicação deste novo incremento recusada pela revisão automática de aprovação: a autorização anterior foi considerada referente às publicações já executadas, sem clareza para este deploy específico em ambiente live compartilhado. Não houve nova versão. O proprietário precisa autorizar explicitamente publicar as sete alterações preparadas no backend Radar Promo Ofertas (próxima versão prevista: v3). Código b4991b7 testado e preservado na PR 202, ainda draft; main não foi alterada.

Após a tentativa, versão Ofertas v2 confirmada; Radar original v672 confirmado. Sete arquivos de código do backend foram relidos e comparados byte a byte entre GitHub e WIP Hatchable: iguais. A equivalência refere-se a esses arquivos preparados, não à versão live nem à sincronização integral dos projetos. Nenhuma API de produção foi usada para criar comentários, votos ou avisos de teste.

Próxima ação segura após autorização específica: publicar o WIP independente revisado, confirmar a nova versão e testar leitura. Homologação de login/código/passkeys, operações autenticadas e avisos reais depende do fim do 429 e da visibilidade adequada; teste em aparelho e push continuam pendentes. Não gerar APK até prontidão do aplicativo.

A conferência documental encontrou históricos diferentes em INDICE.md e CONTROLE-DE-MUDANCAS.md do espelho do Radar original; seus registros prévios foram preservados, acrescentando somente a atualização desta tarefa. No Ofertas, esses dois arquivos e ANDROID-BUILD.md estavam ausentes no caminho esperado e foram criados. O relatório novo, as evidências e os documentos Android atualizados são espelhados sem sobrescrever os históricos divergentes. Não se declara sincronização integral dos índices/controles antigos.
