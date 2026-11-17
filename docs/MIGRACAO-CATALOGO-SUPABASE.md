# Plano de transferência do catálogo para Supabase

Data: 16/11/2026. Estado atual: transferência autorizada, concluída e reconciliada; ver resultado após autorização no fim deste documento. Banco ativo não foi trocado. O procedimento e os impedimentos anteriores são preservados como histórico.

## Escopo

Origem autorizada: banco do Radar Promo Brasil no Hatchable. Destino: projeto Supabase Radar Promo Brasil já identificado. Nenhum dado será escrito no GitHub, logs públicos ou arquivos de fonte.

Referência observada: 2 contas, 22 categorias, 1 cupom e 10.360 ofertas. A origem permanece intacta. São contagens observadas, não promessa de igualdade se o banco continuar recebendo dados.

As quatro tabelas têm colunas compatíveis na comparação realizada. Os 10.360 registros de ofertas consultados têm source_monitor_id nulo, portanto essa dependência não exige alteração para o snapshot observado. Nenhuma chave estrangeira será desativada. Mudança futura nessa condição deve interromper e replanejar a transferência.

## Operação revisável

1. Confirmar projeto e permissões; reler contagens do destino e registrar baseline. No estado observado, as quatro tabelas de destino e o checkpoint estão vazios.
2. Registrar um horário de corte obtido do próprio banco de origem e um identificador de execução.
3. Ler contas, categorias, cupons e ofertas nessa ordem, em lotes de até 200 registros ordenados por id, com cursor persistido e created_at até o corte.
4. Transportar o JSON integral sem converter preços e números em ponto flutuante; usar parâmetros de banco. Mapear explicitamente todas as colunas de origem e conservar valores nulos, timestamps, IDs, links e metadados.
5. Inserir com ON CONFLICT DO NOTHING. Nunca atualizar ou apagar uma linha de destino já existente. Toda colisão deve ser listada para reconciliação; não tratar itens ignorados como migrados.
6. Gravar o cursor e as contagens na mesma transação do lote, usando private.rpo_catalog_migration_batches. A tabela já foi criada pela migração remota rpo_catalog_snapshot_compatibility e está vazia, com RLS e acesso revogado de anon/authenticated.
7. Ao retomar, usar o mesmo corte e cursor, sem reiniciar a origem e sem repetir registros confirmados.
8. Comparar IDs e assinaturas dos valores das colunas transferidas, além das contagens do snapshot. Verificar integridade referencial, colisões e eventuais alterações da origem durante a leitura. Não presumir snapshot transacional consistente entre chamadas separadas.
9. Se a origem mudou durante a cópia, registrar diferenças e planejar delta; não ativar o destino automaticamente.
10. Validar o feed real usando o banco escolhido somente após a reconciliação e uma aprovação específica de cutover. Esta transferência não o ativa.

## Recuperação

A origem não recebe alterações. O destino ganha registros em lotes idempotentes. Em falha, interromper e retomar pelo checkpoint; não apagar a origem nem truncar o destino. Antes de qualquer limpeza posterior, gerar e validar um snapshot do destino.

A migração remota aplicada nesta rodada criou apenas o checkpoint privado; não houve lote de catálogo confirmado. A verificação posterior retornou zero contas, categorias, cupons, ofertas e checkpoints no destino.

## Bloqueios históricos anteriores à autorização

A tentativa inicial de transferência não produziu lote confirmado. A publicação do backend também foi recusada pela revisão automática, exigindo aprovação explícita para efeitos em produção. Este plano torna o escopo de transferência concreto, mas não representa migração concluída.

Não se usam ofertas fictícias para preencher o destino. Dados de sessão, chaves de API e segredos não são incluídos nessa transferência do catálogo.

Objetos de imagem armazenados no Hatchable não são copiados por essa transferência de tabelas. As referências de storage devem continuar apontando para a origem preservada até uma migração própria dos objetos, com verificação de integridade. Isso é mais um motivo para não ativar cutover automaticamente.


---

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
