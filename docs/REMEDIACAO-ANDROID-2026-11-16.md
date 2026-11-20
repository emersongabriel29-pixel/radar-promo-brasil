# Remediação Android — resultado atualizado

## Atualização — 20/11/2026: Ofertas v3 publicado

A publicação específica foi autorizada pelo proprietário e concluída. Radar Promo Ofertas v3 live, manifesto de código equivalente ao GitHub; Radar original v672 preservado. Testes de API pós-deploy retornaram 429; visibilidade personal e push seguem pendentes. Nenhum APK. Consulte [resultado e evidências](./DEPLOY-OFERTAS-V3-2026-11-20.md). Os registros abaixo descrevem as etapas anteriores.

## Incremento de comunidade — 17/11/2026

Conta, votos, comentários e avisos de respostas implementados para abertura em aba segura a partir do Flutter. Código b4991b7: 10 testes Flutter, 258 unitários e 6 de navegador aprovados; build web e auditoria de dependências aprovados, zero vulnerabilidades reportadas. Novo deploy foi recusado pela revisão automática por exigir autorização específica. Ofertas segue live na v2 e Radar na v672; WIP independente preparado. API 429, visibilidade personal, push e homologação no aparelho continuam pendentes. Veja [resultado detalhado](./COMUNIDADE-ANDROID-2026-11-17.md). Nenhum APK novo.

## Resultado após autorização — 16/11/2026

Publicações autorizadas concluídas: Radar Promo Brasil **v672** e Radar Promo Ofertas **v2**, ambas live. As cinco tabelas próprias do backend independente foram confirmadas no schema após a publicação.

A cópia do catálogo para o Supabase foi concluída e reconciliada. Corte da leitura: 2026-11-17 01:07:00.968172+00 (UTC). As contagens e as assinaturas MD5 agregadas por registro/ID coincidem nos dois bancos para todas as colunas transferidas:

| Tabela | Origem no corte | Destino | Conteúdo comparado |
|---|---:|---:|---|
| accounts | 2 | 2 | Igual |
| categories | 22 | 22 | Igual |
| coupons | 1 | 1 | Igual |
| offers | 10.360 | 10.360 | Igual |

Foram confirmados 55 lotes: três para as tabelas-base e 52 para ofertas, com até 200 registros por lote. Zero conflitos de inserção. Nenhuma linha original foi atualizada ou apagada. Não houve troca do banco ativo. Objetos de imagem permanecem no armazenamento original; suas referências foram preservadas.

O ambiente executor voltou a funcionar. O ZIP Flutter existente foi recuperado, revisado e extraído: 37 arquivos. O código foi incorporado em mobile/radar_promo_ofertas. O workflow de APK encontrado no ZIP foi arquivado como texto; apenas análise e testes estão habilitados. A análise Flutter terminou sem problemas e os testes existentes passaram no [CI Flutter 43994639891](https://github.com/emersongabriel29-pixel/radar-promo-brasil/actions/runs/43994639891), sobre o commit de recuperação f58a4ceec436a07a1564044f07d18246f9b42d09. O workflow não executa build de APK.

Permanecem limites externos: APIs Hatchable ainda retornam 429 usage_limit; o backend independente continua com visibilidade personal e exige alteração pelo titular para acesso externo. Os avisos de deploy sobre ausência de import direto de db/auth são estáticos: o acesso ao banco ocorre por lib/api.js e a identidade por access='user'/req.user; login chama o cliente de autenticação injetado. A execução real de login e das rotas continua não homologada por causa da quota e da visibilidade.

O login nativo Flutter, a sincronização de favoritos, votos, comentários e notificações ainda precisam ser conectados às rotas novas e testados. Não se declara o aplicativo finalizado e nenhum APK foi gerado.


---

## Registro histórico anterior à autorização

# Remediação Android e backend independente — 16/11/2026

Estado final desta rodada: correções implementadas em branch e WIP, testes aprovados; publicação recusada pela revisão automática. Produção permanece Radar Promo Brasil v671 e Radar Promo Ofertas v1. A migração de dados para Supabase não foi concluída.

## Mudanças implementadas no código

- Radar Promo Ofertas: migration 0001_community cria cinco tabelas próprias, sem dados fictícios: favoritos, votos, comentários, preferências e caixa de notificações.
- Autenticação de usuários finais por e-mail e chave de acesso via plataforma; página de login própria. Não se criam senhas ou contas no Radar original.
- Rotas privadas /api/favorites, /api/votes, /api/comments/manage, /api/notifications e /api/account; leitura pública de feed, detalhes e comentários.
- Identidade de escrita vem da sessão, nunca de userId enviado pelo cliente. Favoritos e votos têm chave única por usuário/oferta. Alteração e exclusão de comentários exigem autoria. Comentários têm tamanho máximo e limitação transacional por usuário. O conteúdo deve ser renderizado como texto, não HTML.
- Notificações possuem consentimento explícito e leitura individual. Envio push não está configurado nem é declarado concluído.
- Proxy de ofertas valida configuração e contrato, rejeita origem inesperada, não segue redirects, trata indisponibilidade e quota da origem sem inventar ofertas. Usa timeout_ms, conforme o runtime Hatchable.
- Detalhes consultam a oferta por id na origem, respeitando as mesmas regras do feed.
- Feed original: geração de URLs temporárias assinadas de imagem com TTL de 300 segundos, removendo chaves internas da resposta. Falha na assinatura preserva a oferta, com imagem HTTPS original quando houver. Não se alteram status, filtros comerciais, preços, filas ou publicações.
- Paginação do feed ganha desempate por id. Apenas leitura; nenhuma mutação de ofertas.
- Fonte do backend independente versionado em independent/radar-promo-ofertas/, com o mesmo caminho relativo no projeto Hatchable independente.
- Testes Node/PGlite adicionados para contratos, isolamento entre usuários, idempotência, votos, comentários e consentimento, além de URLs de imagens. Fixtures vivem apenas no banco em memória dos testes.

## Preservação e divergências

Antes desta rodada, o WIP do Radar original diferia da v671 em api/admin/supabase-health.js e lib/supabase-db.js. São mudanças preexistentes; foram preservadas e copiadas para a branch, sem sobrescrever suas versões por arquivos antigos. lib/radar-db.js e api/admin/db-provider-health.js também são registrados a partir do WIP atual.

O feed e os helpers relevantes são reconciliados explicitamente. Isso não equivale a sincronização integral de todos os arquivos históricos GitHub/Hatchable. Rotas antigas de mídia presentes no GitHub são preservadas; o novo feed deixa de depender delas. Não ativar migração de banco por esse motivo.

## Dados originais e Supabase

Consulta read-only ao Hatchable original nesta rodada: 2 contas, 10.360 ofertas, 22 categorias e 1 cupom. Portanto, há dados reais na origem; as tabelas vazias consultadas anteriormente eram a cópia no Supabase.

O schema das quatro tabelas foi comparado. Foram criados no Supabase apenas os metadados privados de checkpoint de migração, com RLS e sem acesso de anon/authenticated. Nome da migração remota: rpo_catalog_snapshot_compatibility. Nenhum dado da origem foi apagado ou atualizado.

Uma tentativa de transferência não produziu lote confirmado; a verificação posterior mostrou zero registros nas quatro tabelas de destino e no checkpoint. Não declarar migração concluída e não ativar cutover. O motivo completo da resposta de recusa não ficou disponível no parser da chamada; não presumir sucesso nem repetir a operação em massa.

## Limites externos ainda existentes

- Ambiente executor indisponível: não foi possível extrair ou transferir o ZIP Flutter. O projeto Flutter não foi recriado nem substituído; não existe app vazio para simular conclusão.
- GitHub Actions executa o código no repositório, mas não tem acesso automático aos anexos privados da conversa.
- run_function no Hatchable ainda retorna 429 usage_limit, com franquia de banco de duas horas esgotada. Não há mudança de cobrança disponível pelos conectores; não se contorna esse limite.
- O backend independente está com visibilidade personal. O dry-run informa que o titular precisa mudar a visibilidade em Settings para permitir usuários externos; isso não é alterável por MCP.
- O login nativo Flutter, a entrega push e os fluxos ponta a ponta no Android ainda dependem da recuperação do fonte e da capacidade de execução.
- Nenhum APK gerado. A configuração Android continua sem etapa de build de APK.

## Rotas e semântica

| Rota | Métodos | Acesso | Contrato |
|---|---|---|---|
| /api/offers | GET | Público | Feed real paginado; sem cache público |
| /api/offers/:id | GET | Público | Oferta elegível na origem ou 404 |
| /api/favorites | GET, POST, DELETE | Usuário | offerId para incluir/remover; leitura dos próprios registros, até 100 |
| /api/votes | GET, POST, DELETE | Usuário | offerId; value +1/-1; substitui voto anterior |
| /api/comments | GET | Público | offerId e page; 30 itens visíveis por página |
| /api/comments/manage | POST, PUT, DELETE | Usuário | offerId/body para criar; id/body para editar; id para remover |
| /api/notifications | GET, PUT, POST | Usuário | enabled boolean para consentimento; id para marcar como lida |
| /api/account | GET | Usuário | Dados da própria sessão |

Os limites de listagem de favoritos e notificações estão explícitos e ainda não têm cursor de histórico. A caixa de notificações começa vazia, pois nenhum evento fictício é criado.

## Validação e implantação

O primeiro dry-run detectou uma exportação duplicada em community.js; ela foi corrigida. O segundo dry-run passou, com avisos esperados sobre leituras públicas e sobre visibilidade personal. Não houve envio de e-mail de login durante testes.

Fonte de verdade por escopo: WIP Hatchable para arquivos originais já existentes; novos arquivos compartilhados conservados iguais no GitHub e nos respectivos projetos. Versões efetivamente publicadas e resultados CI devem constar no adendo final.

## Rollback

Código: reverter o commit desta rodada ou restaurar a versão anterior do projeto. Tabelas novas: manter os dados e desativar as rotas em caso de rollback; não apagar tabelas depois de uso real. Checkpoint Supabase vazio permanece privado. Nenhuma mudança de banco ativo ou exclusão de dados originais foi executada.

## Adendo final — validação e autorização de produção

Commit de código: 60e8087eef5b914233065ee95d21b392ba663a98.
CI: [execução 43983201094](https://github.com/emersongabriel29-pixel/radar-promo-brasil/actions/runs/43983201094), concluída com sucesso. Logs confirmam 255 testes Node aprovados, zero falhas, incluindo a nova suíte do backend, e 3 testes de navegador aprovados. Build e npm audit também passaram. Esses testes usam banco em memória; não são prova de integração real na hospedagem.

Conferência de bytes: 17 arquivos do backend independente mais o feed original e seu novo helper de imagens foram lidos após a escrita; os 19 correspondem integralmente ao conteúdo preparado. O módulo principal da comunidade também foi relido no GitHub e corresponde ao mesmo conteúdo.

Dry-run original: passou sem avisos. Dry-run independente: passou, com avisos esperados de leitura pública e a exigência operacional de mudar a visibilidade personal para permitir usuários externos.

A tentativa de deploy do backend independente foi recusada pela revisão automática:
> Deploys and publishes new authenticated routes, migrations, and public files to the live independent backend; resolving issues did not explicitly authorize this production-impacting publication or its schema/auth side effects.

Não houve nova tentativa de contornar essa recusa nem publicação do Radar original após ela. get_project confirmou v1/zero tabelas no independente e v671 no original. As tabelas próprias existem no arquivo de migração preparado; ainda não foram aplicadas ao backend.

Escopo concreto para aprovação:
1. Publicar o backend independente v2, ativando autenticação de usuários, aplicando cinco tabelas novas e disponibilizando oito rotas.
2. Publicar a correção de leitura do feed no Radar original v672, com URLs assinadas, filtro opcional de id e desempate de paginação; o WIP preserva também as duas correções administrativas Supabase preexistentes documentadas acima.
3. Transferir um snapshot das quatro tabelas de catálogo para o Supabase conforme [plano revisável](./MIGRACAO-CATALOGO-SUPABASE.md), sem exclusões, sem sobrescrever conflitos e sem mudar o banco ativo. Esta terceira etapa exige reconciliação antes de qualquer conclusão.

Mesmo com aprovação, a quota de execução e a extração do ZIP Flutter continuam sendo bloqueios externos. Não há autorização implícita para comprar plano, alterar faturamento, tornar o projeto público ou gerar APK.
