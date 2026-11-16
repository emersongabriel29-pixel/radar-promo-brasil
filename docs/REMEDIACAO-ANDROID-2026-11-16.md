# Remediação Android e backend independente — 16/11/2026

Estado inicial desta rodada: correções preparadas; dry-run do backend independente passou; testes CI do novo código e publicação ainda pendentes neste registro. Consulte o adendo final desta tarefa.

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
