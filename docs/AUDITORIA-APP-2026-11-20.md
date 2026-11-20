# Auditoria completa do aplicativo — Radar Promo Ofertas

**Data: 20/11/2026. Parecer: REPROVADO para produção.** O APK instala e navega, mas a experiência principal de ofertas e comunidade não está homologada. A auditoria cobriu o aplicativo, o APK entregue, o backend independente e os pontos de conexão com Radar/Supabase. Os bloqueios são explícitos; não houve teste de compra, publicação em canais ou envio de e-mail/código real.

## Fontes e limites

- Fonte de verdade para correções Flutter: branch android/github-actions-build, HEAD inicial 82ca19dfa1c04a281db361c713d4d9be65824643. GitHub main a6ec44374fcf0915cb37940679af79c9cef6bfd8. PR 202.
- Hatchable: Radar Promo Brasil v672; Radar Promo Ofertas v3. Os 21 arquivos de código/configuração/migração do independente coincidem com o manifesto v3. O feed original consultado no WIP coincide com GitHub antes da correção.
- 52 arquivos de fonte/configuração/testes/documentação examinados, além do manifesto, metadados Supabase, logs/artefato do CI e vídeo de 106,39s enviado pelo proprietário. O vídeo não contém áudio útil; não foi inferida narração.
- APK auditado: Radar_Promo_Ofertas_0.3.0_arm64_teste.apk; 18.421.380 bytes; SHA-256 0796423d3afa05cc26fb6e55565534d2267c36c274b35beda1c5383609a3b3b2. Assinatura de desenvolvimento v2 verificada no CI; package br.com.radarpromo.radar_promo_ofertas e launcher MainActivity.
- Leitura do código não comprova comportamento de APIs externas; scan por padrões não garante ausência de todos os segredos; nenhuma classificação de conformidade legal foi emitida. O Radar original foi examinado nos pontos do feed/ponte/banco; não é homologação individual de todos os seus conectores de afiliados.

## Bloqueadores prioritários

1. **P0 — Feed inacessível:** leitura real /api/offers continua em 429 usage_limit (2,1h usadas no orçamento mensal Free de 2,0h). /api/account também retorna 429, antes da verificação funcional do gate. Não repetir em ciclo nem afirmar fluxo autenticado aprovado.
2. **P0 — Acesso público bloqueado:** Ofertas tem visibilidade personal. O proprietário precisa alterar para public no console se o aplicativo for para visitantes: https://hatchable.com/console/projects/radar-promo-ofertas. A plataforma exige esse passo humano.
3. **P0 — Filtro de ID quebrado no feed original:** a construção SQL deixou de incluir o prefixo $ no placeholder. Afeta detalhe público e verificação de oferta real usada antes de votos, favoritos e comentários. Corrigido em código nesta rodada; a versão live v672 continua com o defeito até publicação autorizada e validação.
4. **P1 — Supabase é uma cópia parcial, não o fluxo ativo completo do aplicativo:** catálogo com 10.360 ofertas, mas offer_price_history tem zero registros e rpo_* não existem nesse Supabase. Comunidade importa db do SDK Hatchable, e o endpoint público original também o importa diretamente. O switch de lib/radar-db.js não controla esse endpoint. Não houve cutover nesta auditoria.
5. **P1 — Regra do feed exige histórico oficial nas últimas 24h, preço original e status APPROVED/PUBLISHED:** no snapshot Supabase faltam os históricos necessários. Há ainda tensão com a Regra Master que rejeita estacionamento por metadados. Não foi removida essa política silenciosamente nem fabricado histórico de validação; precisa de reconciliação explícita do fluxo.
6. **P1 — Publicação/atualização Android:** APK usa certificado Android Debug gerado pelo ambiente de build, sem continuidade de assinatura comprovada. Não está preparado para loja nem para garantir atualização in-place de builds futuros.
7. **P1 — Recursos incompletos:** push, alertas de buscas, catálogo completo de categorias, exclusão de conta e moderação/denúncia não estão finalizados. Comunidade é aberta no navegador, não uma implementação integralmente nativa.

## Matriz de 30 áreas

| Área | Situação | Evidência e limite |
|---|---|---|
| Identidade e versões | Conferido | GitHub main a6ec443; branch 82ca19d; Ofertas v3; Radar v672. |
| Equivalência backend GitHub/live | Conferido | 21/21 arquivos de código/configuração/migração independentes com hash igual ao manifesto v3. |
| Instalação, ícone e navegação | Conferido no vídeo | APK abre no Android do proprietário; cinco abas navegáveis. Não comprova todas as funções. |
| Integridade do APK | Conferido | SHA-256 igual ao CI; assinatura v2; launcher; API24+; engine ARM64; 18.421.380 bytes. |
| Assinatura e atualização | Pendente | Certificado Android Debug do runner; sem identidade de assinatura de produção persistente validada entre builds. |
| Versão em Sobre | Correção em código | 0.2.0 fixo substituído por metadados do pacote Android; APK entregue ainda contém a tela anterior. |
| Layout e acessibilidade | Parcial | Vídeo confirma uso normal; regressão 360px/1,8x preparada; TalkBack, paisagem e múltiplos aparelhos pendentes. |
| Compilação nativa | A validar nesta rodada | CI ampliado com compilação debug para verificar ponte nativa de versão; sem distribuição por esse workflow. |
| Feed real | Bloqueado | GET /api/offers público retorna 429 usage_limit; vídeo mostra falta de acesso. |
| Atualização automática | Parcial | Carga inicial, botão e pull-to-refresh existentes; sem atualização periódica/retomada ou serviço em segundo plano. |
| Busca, ordenação e paginação | Implementado, não homologado | Parâmetros enviados, erros tratados e deduplicação por ID; quota impede fluxo real. |
| Categorias | Correção em código | Removidos nomes fixos divergentes; usa nomes exatos das ofertas carregadas. Catálogo completo independente de paginação ainda não existe. |
| Favoritos | Parcial | Locais persistentes/offline; favoritos da conta separados, limitados a 100 sem paginação; sem sincronização automática. |
| Preço, desconto e data | Correção em código | Valores não finitos saneados, desconto limitado, preço desconhecido e data ausente explícitos; não inventa data atual. |
| Detalhes, cupons e filtro ID | Correção crítica em código | SQL original usava o.id=4 em vez de parâmetro $4. Teste PostgreSQL em memória verifica ID com busca/categoria/conta. |
| Links de afiliados | Parcial | HTTPS e ausência de userInfo exigidos no Flutter; query/SubIDs preservados em testes. Conversão, atribuição e compra real não testadas. |
| Imagens | Parcial | URLs assinadas TTL300 e fallback; chaves internas ocultas; cópia salva pode ter URL expirada e sem cache offline. |
| Login e sessão | Configurado, bloqueado | Conta em Custom Tabs/SDK oficial, sem copiar cookies para Dart; barreira personal e quota impedem homologação código/passkey. |
| Votos | Implementado, bloqueado | Upsert -1/+1 e autoria testados em memória; requireRealOffer afetado pelo erro SQL; operação real não validada. |
| Comentários e abuso | Parcial | Autoria, limites, XSS por textContent e respostas testados em memória; denúncia/moderação e exclusão de conta ainda sem fluxo de produto. |
| Avisos e push | Parcial | Inbox/prefs/respostas implementados no backend; push e alertas de buscas em segundo plano ausentes. |
| Supabase e continuidade de dados | Parcial | 2 contas, 22 categorias, 1 cupom, 10.360 ofertas; sem price_history nem rpo_*; feed e comunidade continuam dependentes do SDK DB Hatchable. |
| Autorização e RLS | Parcial | SQL parametrizado filtra autoria; Hatchable sem regras declarativas rpo_*. Supabase RLS ligado, tabelas catálogo sem grants anon/authenticated e sem policies: fechado, não exposição comprovada. |
| Privacidade e ciclo de dados | Parcial, texto corrigido | Aviso antigo negava conta/comentários; atualizado no código. Retenção, exclusão de conta e cópias em avisos exigem desenho/validação. |
| Segredos e permissões APK | Conferido no escopo | INTERNET e permissão interna receiver; cleartext/backup desativados; padrões de JWT/sb_secret/chaves privadas não encontrados no scan delimitado. |
| Erros, quota e observabilidade | Parcial | Erros de acesso/quota traduzidos, timeout e Retry-After existentes; bloqueio de plataforma impede diagnóstico funcional dentro do handler. |
| Desempenho do banco | Pendências registradas | Advisors: 36 FKs sem índice, 90 índices sem uso observado, 3 pares de índices duplicados. Sem remoções automáticas. |
| Testes e cobertura | Parcial | Histórico CI verde não detectou SQL ID inválido; regressão positiva/negativa e casos Flutter ampliados nesta rodada. Testes reais continuam bloqueados. |
| Identidade visual e propriedade | Conferido no escopo | Código próprio recuperado; nenhum código/asset Pelando introduzido nesta auditoria. Não é parecer jurídico/forense sobre terceiros. |
| Implantação e documentação | Controlado | Correções em branch e, após testes, WIP. Sem deploy, troca de banco, segredo, gasto, mensagens ou novo APK de distribuição nesta auditoria. |

## Correções preparadas nesta rodada

- Placeholder SQL de ID corrigido com parâmetros para busca, categoria, ID e conta; teste reproduz o erro anterior como controle negativo.
- Versão em Sobre passa a ler PackageInfo da própria instalação Android via canal nativo, sem nova dependência nem versão duplicada no Dart.
- Categorias deixam de usar rótulos fixos sem correspondência e exibem nomes reais do conjunto carregado. Não há categoria inventada para mascarar a falha do feed.
- Valores numéricos não finitos/negativos normalizados sem quebrar o parse; ausência de preço e data torna-se explícita, sem R$0,00 nem data atual fabricada.
- Estado de erro deixa de aparecer como consulta bem-sucedida com zero ofertas; paginação/total são reiniciados.
- Texto de privacidade passa a explicar a conta/comunidade e a separação de dados locais. Transparência de links de afiliados foi mantida.
- Referência técnica a APIs removida da faixa inicial e orientações de preço simplificadas.
- Cabeçalho adaptado para largura reduzida e fonte ampliada. Teste 360px/1,8x preparado.
- CI Android passa a compilar um APK debug apenas para verificar o código nativo da versão, sem distribuição desse artefato. O APK já entregue não foi substituído nesta auditoria.

## Supabase: verificações atuais

Contagens reais: accounts 2; categories 22; coupons 1; offers 10.360. Maior created_at das ofertas: 11/11/2026; maior updated_at: 13/11/2026. Isso descreve o snapshot copiado, não comprova perda nem a atualidade da origem Hatchable, inacessível pela quota. Sem grants diretos anon/authenticated nem policies nas quatro tabelas; RLS ligado. Não habilitar exposição direta sem políticas apropriadas.

Advisors de segurança: 72 tabelas com RLS ligado e sem políticas (INFO), coerente com acesso público fechado. Performance: 36 FKs sem índice (INFO), 90 índices sem uso observado (INFO), 3 pares duplicados (WARN). Índice sem uso observado não é prova de inutilidade; índices ligados a constraints ou rotinas podem ser necessários. Nenhuma exclusão foi realizada.

Referências dos advisors: [RLS sem política](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [FKs sem índice](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys), [índices sem uso](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index), [índices duplicados](https://supabase.com/docs/guides/database/database-linter?lint=0009_duplicate_index).

## Plano de fechamento

1. Concluir testes desta rodada e registrar evidências. Publicar somente a correção revisada do feed e o aplicativo atualizado após autorização aplicável; manter hashes/versões identificáveis.
2. Restabelecer capacidade de execução e acesso público. Não alterar billing automaticamente nem usar workaround para a barreira de visibilidade.
3. Completar a migração Supabase com todas as tabelas e dependências do fluxo, usuários/sessões adequados, armazenamento, políticas e reconciliação de alterações posteriores ao snapshot; testar em ambiente isolado antes de cutover.
4. Validar com dados reais permitidos: feed, filtros, detalhes, links/SubIDs, login, votos, comentários, favorito da conta, inbox e consentimento. Nenhuma compra ou mensagem externa sem autorização.
5. Homologar assinatura persistente, atualização do APK, acessibilidade, rotinas de privacidade/moderação e push. Só então emitir aceite de produção.

## Testes e implantação desta rodada

Em execução no momento deste registro inicial. O adendo final registrará o resultado consultado do GitHub Actions. Correções em branch não representam APK novo nem deploy. Nenhuma alteração de dados, segredos, visibilidade, plano ou banco ativo foi feita. Rollback: reverter somente os arquivos desta auditoria na branch/WIP; não apagar tabelas nem dados.

### Execução intermediária

Código af4db40: CI web 44731567555 aprovado — build, 260 testes unitários (incluindo reprodução do erro anterior e SQL corrigido), 6 de navegador e audit sem vulnerabilidades reportadas. Flutter 44731567590 parou na análise por três prefer_const_constructors; testes e compilação dessa execução não foram executados. Ajustes de const preparados e validação repetida antes do parecer final.

Observação de arquitetura: /api/account não executa consultas SQL no seu handler e também ficou sob 429. A dependência de autenticação/execução do Hatchable precisa ser considerada no cutover; apenas trocar o driver de banco não comprova remoção do bloqueio de plataforma.

### Fonte ampliada: falha reproduzida e corrigida

Execução Flutter 44731891201 (595edb0): análise aprovada, 14 testes passaram e o teste novo 360px/1,8x encontrou overflow horizontal de 134px no controle de ordenação. Layout dos controles reorganizado com largura limitada e seleção adaptável; o teste não foi removido nem relaxado. Compilação nativa dessa execução foi pulada por causa da falha. O workflow regular passa a validar Android em PRs e pushes na main, evitando dois builds iguais em cada push da branch com PR aberta; compilação solicitada de distribuição permanece separada.
