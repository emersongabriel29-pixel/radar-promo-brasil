# Auditoria Android — Radar Promo Ofertas — 16/11/2026

**Resultado: aplicativo não homologado; cobertura das 23 áreas registrada, com 16 avaliações parciais, 6 bloqueadas e 1 adiada por decisão do usuário. Nenhuma das 23 áreas foi aprovada integralmente.**

Esta auditoria inspecionou código e inventários acessíveis, execuções de CI, metadados e consultas somente de leitura no Supabase. Ela não substitui a inspeção do ZIP Flutter nem os testes Android que não puderam ser executados. A indisponibilidade local foi confirmada novamente nesta tarefa. Não foi gerado APK.

## Escopo, versões e preservação

- Repositório: emersongabriel29-pixel/radar-promo-brasil.
- Branch auditada: android/github-actions-build, commit de código/configuração 9b893e577593d104fa253187f6e005226e3ccd0b.
- Main observada: a6ec44374fcf0915cb37940679af79c9cef6bfd8.
- Radar Promo Brasil: Hatchable v671. Radar Promo Ofertas independente: Hatchable v1.
- A auditoria usou as duas plataformas como fontes distintas e registrou divergências. Não presume sincronização automática.
- Nenhuma API, configuração, segredo, tabela, dado, cron, fila ou deploy de produção foi alterado nesta auditoria. Apenas documentos desta branch são atualizados.
- O ZIP Flutter, o ZIP de referência Pelando e o APK antigo não foram abertos nesta tarefa. Não foi possível verificar sua identidade visual, licença, dependências ou integridade interna.
- O produto deve usar dados reais e implementação própria. Fixtures dos testes isolados não foram gravadas no produto.

## Evidências técnicas

| ID | Verificação | Resultado real |
|---|---|---|
| E01 | Inventário recursivo da branch | Sem pubspec.yaml, mobile/ ou projeto Android. |
| E02 | Arquivos, funções e schema do backend independente | Uma rota /api/offers, configuração de origem e segredo; zero tabelas próprias. |
| E03 | Cron do backend independente | Nenhuma tarefa cadastrada. |
| E04 | Código do feed original e helper de imagens | Leitura realizada; contrato resumido e dependência de mídia identificados. |
| E05 | Testes de API no Hatchable | Proxy e origem bloqueados com 429 usage_limit; sem resposta funcional de sucesso. |
| E06 | CI web do commit auditado | Run [43977738954](https://github.com/emersongabriel29-pixel/radar-promo-brasil/actions/runs/43977738954): npm ci, build, test, npm audit e Playwright concluídos com sucesso. É CI Node/web, não Flutter. |
| E07 | Workflow Android | Sem geração de APK; não executou no histórico consultado. |
| E08 | Supabase: schema e permissões de tabelas | 68 tabelas public + 2 private, todas com RLS. Sem privilégios SELECT, INSERT, UPDATE, DELETE ou TRUNCATE para anon/authenticated nessas tabelas. |
| E09 | Supabase: rotinas privilegiadas | Nenhuma rotina SECURITY DEFINER em public/private no resultado consultado. Não é uma auditoria de todos os papéis, schemas e objetos possíveis. |
| E10 | Supabase: contagens agregadas | accounts=0, offers=0, categories=0 e coupons=0. Não são contagens do banco original Hatchable. |
| E11 | Supabase: ponte e migrações | 85 migrações listadas; radar-db-bridge ativa v2. Fonte index.ts implantado coincide com o GitHub consultado; JWT desativado, com autenticação própria por assinatura no código. |
| E12 | Teste isolado do proxy sem configuração | Código disponível executado com config stub: 503 RADAR_CONNECTION_NOT_CONFIGURED. Sem acesso à rede ou segredo real. |
| E13 | Teste isolado do helper de imagens | Código disponível retornou /api/media/offer/audit-fixture. O inventário e manifesto implantados não contêm as rotas de mídia correspondentes. Não é teste de download de imagem real. |
| E14 | Advisors Supabase | Segurança: 70 ocorrências informativas de RLS sem policy; desempenho: 36 FKs sem cobertura, 91 índices sem uso e 3 grupos duplicados; health sem alertas. |

O harness mais amplo para testar o proxy não pôde ser executado neste ambiente por falta da classe URL no avaliador. Apenas os testes E12 e E13 foram efetivamente concluídos; isso não substitui execução do handler real na hospedagem.

## Achados priorizados

| ID | Prioridade | Achado | Evidência e consequência | Próxima ação |
|---|---|---|---|---|
| A01 | Bloqueante | Fonte Flutter indisponível para auditoria | A branch não contém o projeto mobile. O ZIP não pôde ser extraído nesta sessão. Não se pode aprovar telas, dependências, permissões ou comportamento Android. | Recuperar e revisar o projeto existente antes de qualquer nova implementação. |
| A02 | Bloqueante | Backend independente incompleto para a comunidade | Apenas /api/offers está presente; não há tabelas próprias ou APIs de favoritos, votos, comentários, conta e notificações. Isso não prova ausência de funções locais no Flutter. | Definir e implementar os contratos e persistência no backend independente. |
| A03 | Alta | GitHub e Hatchable divergem | O feed implantado existe no Hatchable e não no inventário da branch; os arquivos de mídia existem no GitHub e não no inventário implantado; o helper Supabase difere entre plataformas. | Reconciliar por arquivo e versão, sem sobrescrever a origem de produção. Não declarar sincronização. |
| A04 | Alta | Imagens armazenadas não têm caminho utilizável comprovado | O feed chama hydrateImages sem opção pública. Teste isolado confirmou retorno de caminho relativo /api/media/offer/...; a rota correspondente não aparece no projeto implantado. O proxy não converte esse caminho para uma URL absoluta. | Definir rota de leitura autorizada para o feed e URL utilizável pelo app; testar com imagem real sem abrir acesso indiscriminado. |
| A05 | Bloqueante operacional | Execução de APIs bloqueada por quota | Testes GET no proxy e na origem retornaram 429 usage_limit. Não houve resposta de sucesso nem confirmação da rejeição de token inválido. | Restabelecer a capacidade de execução e repetir testes de leitura e autenticação. Não contornar quotas. |
| A06 | Alta | Supabase ainda não constitui cópia operacional comprovada | Contagens diretas no Supabase: accounts=0, offers=0, categories=0 e coupons=0. Há schema e migrações, mas esses dados não estão presentes nesse banco. | Reconciliar dados com a origem e validar migração e restauração antes de ativar mudança de banco. Não inferir que o Radar original perdeu dados. |
| A07 | Média | Tratamento incompleto de configuração e resposta no proxy | A construção inicial da URL fica fora do try/catch; o JSON da origem é repassado sem validação do contrato. São achados estáticos, sem exploração ou carga em produção. | Tratar URL inválida, formalizar o formato aceito e retornar erro controlado para resposta incompatível. |
| A08 | Média | Contrato funcional insuficiente para detalhes e cupons | O feed contém dados resumidos e couponCode, mas não descreve regras completas de cupom, validade, detalhes ou entidades da comunidade. | Definir contrato do backend independente e refletir os tipos no Flutter. |
| A09 | Média | Políticas de cache divergentes | Origem marca private/no-store; proxy responde com cache público de curta duração. Isso é divergência de política, não vazamento de dados comprovado. | Definir política explícita de atualização e privacidade; testar ofertas retiradas e dados vencidos. |
| A10 | Média | Feed não participa automaticamente da troca de banco | A origem importa db diretamente do SDK Hatchable. Um adaptador selecionável está presente em lib/radar-db.js, mas esse feed não o utiliza. | Documentar o banco de cada rota e revisar a migração antes de qualquer cutover; valor ativo da configuração não foi verificado. |
| A11 | Média | Validação Android ainda não executável e não reprodutível por SDK | Fonte e lockfile Flutter ausentes; SDK definido como stable, actions por tags. Os únicos runs encontrados são do CI web. | Importar fonte, fixar SDK compatível e dependências; executar testes Flutter. Revisar pinagem das actions. |
| A12 | Baixa/Média | Pontos de atenção de desempenho no Supabase | Advisors: 36 chaves estrangeiras sem índice de cobertura, 91 índices sem uso observado e 3 grupos de índices duplicados. Ausência de uso não prova inutilidade, especialmente com tabelas vazias. | Medir consultas reais; verificar dependências antes de qualquer alteração de índice. Nenhum índice foi removido. |

Prioridade expressa impacto na prontidão desta entrega; não equivale a classificação formal de vulnerabilidade.

## Matriz das 23 auditorias

| Nº | Área | Estado | O que foi verificado | O que falta para concluir |
|---|---|---|---|---|
| 1 | Código-fonte e versões | Parcial | Inventário recursivo da branch: nenhum pubspec.yaml, android/ ou diretório mobile. O ZIP Flutter e o APK anterior foram identificados, mas não extraídos nesta auditoria. | Recuperar e revisar o ZIP existente; importar sem substituir o projeto por um scaffold vazio. |
| 2 | Arquitetura e isolamento | Parcial | Projetos separados confirmados: Radar Promo Brasil v671 e Radar Promo Ofertas v1. O segundo contém somente o proxy GET de ofertas e não contém tabelas. | Definir persistência e identidade dos usuários no backend independente; manter o Radar original somente como origem autorizada de leitura. |
| 3 | Referência funcional Pelando | Bloqueada | ZIP recebido, porém seu conteúdo não pôde ser aberto pelo runtime indisponível. Nenhuma tela ou código interno foi analisado. | Mapear fluxos após extração, usando implementação e identidade próprias. |
| 4 | Feed automático | Parcial | Proxy de leitura existe; nenhum cron no backend independente. O teste da API foi bloqueado por 429 usage_limit. Ausência de cron não prova falta de atualização por polling no Flutter, pois o fonte não foi lido. | Validar atualização no aplicativo, paginação, retomada e esgotamento do feed com dados reais. |
| 5 | Busca | Parcial | Proxy encaminha q; origem aplica ILIKE em título ou fonte. Não há evidência de busca em descrição, cupom ou comentários. | Validar contrato e UX de busca, acentos, consulta vazia e paginação. |
| 6 | Categorias | Parcial | Proxy encaminha category; origem filtra por igualdade de nome. Não há endpoint próprio de listagem de categorias no backend independente. | Definir origem da lista e identidade estável; testar nomes e filtros combinados. |
| 7 | Detalhes e links | Parcial | Feed entrega campos resumidos e affiliateUrl, sem rota própria de detalhes no backend independente. Problema de imagem identificado em A04. | Conferir tela de detalhes, URLs completas, parâmetros afiliados e ofertas removidas. |
| 8 | Cupons | Parcial | Feed inclui couponCode, mas não fornece contrato completo de regras e validade do cupom. Nenhuma API própria de cupons no backend independente. | Implementar contrato real e testar restrições, cópia e expiração; não presumir que código preenchido significa cupom válido. |
| 9 | Favoritos | Parcial | Nenhuma rota ou tabela de favoritos no backend independente. Persistência local no Flutter desconhecida. | Inspecionar fonte e definir armazenamento, isolamento por usuário, remoção e sincronização. |
| 10 | Votos | Parcial | Nenhuma rota ou tabela de votos no backend independente. score e radarScore são métricas da origem e não comprovam votos da comunidade. | Definir voto único por usuário, mudança de voto, consistência e proteção contra abuso. |
| 11 | Comentários e moderação | Parcial | Nenhuma rota ou tabela de comentários, denúncias ou moderação no backend independente. | Definir autorização, paginação, edição, exclusão, denúncias e limites operacionais. |
| 12 | Cadastro, login e conta | Parcial | Configuração independente possui apenas radar_api_url e segredo de integração; nenhuma configuração [auth] ou rota própria de conta foi encontrada. | Inspecionar eventual autenticação externa do Flutter e definir conta, sessão, recuperação e exclusão. |
| 13 | Notificações | Parcial | Nenhuma rota, tabela, cron ou configuração de entrega de notificações foi identificada no backend independente. SDKs e notificações locais do Flutter não foram inspecionados. | Verificar consentimento, tokens, preferências, entrega e navegação a partir do alerta. |
| 14 | Contratos de API | Parcial | Contrato do feed lido no código; proxy repassa JSON sem validar seu formato. Respostas reais com dados não puderam ser obtidas por limite de execução. | Formalizar tipos, valores nulos, erros, detalhes, datas, paginação e caminhos absolutos de imagens. |
| 15 | Banco e Supabase | Parcial | Consultas read-only e advisors executados. 68 tabelas public e 2 private com RLS; sem SELECT ou escrita para anon/authenticated nas tabelas verificadas. Contagens de accounts, offers, categories e coupons iguais a zero no Supabase. | Reconciliar a migração com a origem antes de qualquer cutover; validar backup/restauração e isolamento do futuro backend de usuários. |
| 16 | Segurança | Parcial | Token da origem permanece no servidor pelo código do proxy; origem HTTPS restrita por hostname. Ponte Supabase implantada corresponde ao fonte GitHub consultado e implementa assinatura e replay protection. Sem inspeção de segredos no ZIP nem pentest. | Revisar fonte Android e fluxos de autorização; testar rejeições reais quando execução estiver disponível. |
| 17 | Privacidade | Bloqueada | Sem AndroidManifest, inventário de SDKs e fluxos de conta acessíveis; não é possível avaliar coleta e permissões do aplicativo. | Mapear dados, serviços de terceiros, retenção e exclusão após leitura do fonte. |
| 18 | Rede, cache e offline | Bloqueada | Políticas HTTP dos servidores foram lidas, mas o comportamento do aplicativo não pôde ser exercitado. A origem usa private/no-store e o proxy muda para cache público de curta duração. | Decidir política coerente e testar internet lenta, indisponibilidade, cache vencido e retomada no aplicativo. |
| 19 | Desempenho e acessibilidade | Bloqueada | Nenhum app executado ou widget Flutter disponível para inspeção. Advisors Supabase geraram pontos de atenção de índices, sem benchmark do aplicativo. | Medir rolagem, imagens, memória e acessibilidade em cenários reais. |
| 20 | Compatibilidade Android | Bloqueada | Sem manifesto, Gradle, minSdk/targetSdk ou execução em aparelho acessíveis. | Validar versões Android, permissões, telas, lifecycle e serviços em segundo plano. |
| 21 | GitHub Actions e dependências | Parcial | CI web passou no commit 9b893e5: build, testes, npm audit e Playwright. Workflow Android não executou. Está sem comando de geração de APK; usa Flutter stable ainda não fixado e actions referenciadas por tags. | Importar fonte, fixar SDK compatível, revisar lockfile e executar flutter analyze/flutter test. CI web verde não homologa Flutter. |
| 22 | Testes completos e prontidão | Bloqueada | Dois testes isolados foram executados com código disponível; integração real bloqueada por quota. Não há prova de fluxos Android ponta a ponta. | Concluir os contratos e o produto, testar jornadas reais e registrar falhas e evidências por versão. |
| 23 | Entrega Android | Adiada por decisão do usuário | Nenhum APK novo foi gerado. Workflow revisado não contém flutter build apk. | Somente após prontidão funcional confirmada: assinatura, instalação, atualização e pacote final. |

## Contrato atualmente observável do feed

Método GET, com page, limit (máximo 60 na origem), q, category e sort. Ordenações conhecidas: recent, discount e score. Retorno descrito pelo código: source, generatedAt, page, limit, total, hasMore e offers.

Campos selecionados para cada oferta: id, title, source, currentPrice, originalPrice, imageUrl, imageStorageKey, affiliateUrl, discountPercent, radarScore, score, couponCode, createdAt, category, categoryIcon e subcategory. Os tipos efetivos do JSON, números decimais e campos nulos precisam ser confirmados com uma resposta real. O proxy atual não normaliza esse payload.

O feed seleciona ofertas APPROVED/PUBLISHED da conta de origem ativa e exige correspondência com verificação recente de preço OFFICIAL_API nas últimas 24 horas. Essa condição é descrita, não modificada nem homologada por esta auditoria. Nenhum filtro, oferta ou dado foi alterado.

## Interpretação correta do Supabase

RLS habilitado sem policies é informativo neste caso. As consultas também confirmaram revogação de privilégios de tabela dos papéis anon/authenticated; portanto, o achado não deve ser apresentado como prova de exposição pública. Tampouco comprova isolamento de dados pelo caminho privilegiado da ponte ou autorização do futuro backend de usuários.

A ponte é um componente servidor-servidor. Seu código possui assinatura HMAC, janela temporal e registro de nonce; a igualdade do fonte implantado com o GitHub foi verificada. Não houve teste autenticado real de assinatura, replay ou transação nesta tarefa. O papel usado pela conexão, a restauração de backup e a configuração ativa de troca de banco não foram homologados.

Orientações oficiais dos advisors:

- [RLS habilitado sem policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
- [Chaves estrangeiras sem índice de cobertura](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys)
- [Índices sem uso observado](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)
- [Índices duplicados](https://supabase.com/docs/guides/database/database-linter?lint=0009_duplicate_index)

## Sequência de resolução e critérios de aceite

1. Recuperar o fonte Flutter existente e inspecionar estrutura, dependências, configuração e identidade antes de importar.
2. Reconciliar feed, imagens e banco entre GitHub e Hatchable preservando versões válidas e sem ativar migração para tabelas vazias.
3. Definir e implementar conta e recursos da comunidade no backend independente, com autorização e persistência.
4. Concluir as telas e o comportamento offline com dados reais; manter erros e estados vazios explícitos.
5. Restabelecer execução de APIs e validar respostas, autenticação, isolamento e jornadas completas.
6. Fixar toolchain, executar Flutter analyze/test, testar em aparelho e avaliar acessibilidade, desempenho e privacidade.
7. Somente após confirmação de prontidão: preparar assinatura, gerar APK e testar instalação e atualização.

A API funcionar isoladamente, CI web verde, banco com schema ou ponte implantada não tornam o aplicativo pronto. Nenhum desses sinais foi tratado como aprovação geral.

## Registro e rollback

Esta entrega adiciona relatório e evidências agregadas em docs/, atualiza o índice e o controle de mudanças e mantém a PR 202 como rascunho. O commit documental fica registrado no histórico da branch e da PR. Fonte de verdade documental: GitHub nesta branch.

Documentos ainda não espelhados no Hatchable; nenhuma equivalência total declarada. Rollback documental: reverter o commit desta auditoria. Não há alterações de dados para desfazer.
