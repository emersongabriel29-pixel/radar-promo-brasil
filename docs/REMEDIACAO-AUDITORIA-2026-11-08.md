# Remediação da auditoria — 08/11/2026

## Baseline e análise de impacto antes de editar

Solicitação: corrigir os erros e problemas encontrados na auditoria; manter código e documentação no GitHub e Hatchable. Fonte inicial: PR #193, commit 59c432594a4fb4f784806d0c108e773aa83b9a9f; produção Hatchable v664. Trabalho isolado em codex/audit-remediation-20261108. Os arquivos envolvidos serão comparados com o WIP antes da escrita. Diferenças de adapter e funcionalidades hosted serão preservadas, sem sobrescrita global.

Correções previstas:

- Envelope AliExpress: rejeitar erro de negócio mesmo com HTTP 200, sem alterar a credencial para VALIDATED após falha. Helper puro compartilhado com os workers e testes dos contratos de sucesso/falha. Risco médio, sem mudança do formato de sucesso válido.
- Medicamentos: preservar catálogo/registro, impedir novo enqueue e claim/publicação de filas existentes, inclusive caminhos sociais. Não bloquear acessórios nem produtos +18 globalmente. Risco médio/alto; testar o predicado real no banco e ausência de chamadas aos conectores.
- Ingestão: persistir o lote bruto e cursor, processar em lotes limitados e permitir retomada; nunca descartar o excedente de 50 nem executar loop ilimitado. Migration aditiva, compatível com dados anteriores; sem backfill/limpeza de ofertas. Risco alto; validar em memória antes de considerar produção.
- Qualidade: substituir expectativas comerciais obsoletas por testes comportamentais da regra vigente; preservar aprovação explícita da extensão, isolamento por fonte/conta e teste de segurança. Tornar fixtures de backup independentes.
- Filas: distinguir falhas transitórias recuperáveis de resultados incertos; WAITING_CONFIRMATION exige conferência no destino e não será reenviado automaticamente. Nenhum lote real será reprocessado sem quantidade, critério, impacto e recuperação documentados.

Salvaguardas: não executar workers/envios reais durante testes, não alterar segredos, não renovar tokens nem criar custos. Sem migrations destrutivas. Rollback por reversão do código; eventual nova tabela de inbox pode permanecer sem uso para preservar lotes, sem DROP de dados. Só publicar com checks pertinentes aprovados e comparação do escopo entre plataformas.

Pendências externas: AWS/SSM, Ollama, WhatsApp, credenciais/escopos e backup real dependem de infraestrutura e configuração seguras. Correção de software não será apresentada como resolução desses acessos.

## Correções implementadas e verificadas

- AliExpress: HTTP 200 com resp_code 405 agora falha explicitamente, sem validar credencial como saudável; quatro caminhos do worker e teste da integração usam o mesmo contrato.
- Medicamentos: catálogo preservado, bloqueio no enqueue, seleção, claim atômico, revisão, publicação social e redirect histórico. Acessórios e +18 têm testes de permissão.
- Extensão: PENDING exige opt-in explícito; aprovação manual continua permitida. Fluxo social usa score apenas na ordenação e remove teto diário comercial da geração; pausa, janela operacional, aprovação, autorização e cadência continuam vigentes. Lote limitado a 20 por execução.
- Ingestão: inbox persistente com payload integral, cursor, lease, próxima tentativa e resumo por conta. Resposta expõe batchId/pending/complete; GET /api/ingestion/status consulta o lote com isolamento de conta. Cron scheduler-only no minuto 35 retoma até dois lotes limitados; orçamento global 45 segundos. Não há descarte silencioso após 50 itens. Migration 068 aditiva ainda exige implantação para existir no banco hosted.
- Entrega: falha explícita mantém RETRY com backoff e retry_after do provedor; resultado incerto permanece WAITING_CONFIRMATION. Quando falta orçamento, somente claims não enviados com token e conta corretos retornam para RETRY. Não houve reprocessamento dos 144 FAILED nem dos quatro incertos encontrados.
- Backup: formato v2 descobre tabelas da conta e ordena pelas FKs; verificador restaura em PGlite isolado e aceita v1 legado. Portabilidade remove campos de credenciais. O limite de volume continua explícito (413), sem truncamento silencioso. Não equivale a backup completo da plataforma: identidade, segredos, uploads além do escopo e tabelas globais exigem backup da hospedagem.
- Testes: fixtures de backup independentes; expectativas comerciais antigas substituídas por verificações do comportamento vigente. Concorrência/idempotência, estado incerto e isolamento continuam cobertos.

## Validação e implantação

Build: 209 arquivos verificados; três testes E2E aprovados; npm audit sem vulnerabilidades. Suíte comportamental final: 258/258 aprovados, zero falhas, incluindo restauração v1/v2 e liberação por token. Equivalência dos arquivos registrada em audit-evidence/2026-11-08/remediation-validation.json. Testes usam banco isolado e conectores simulados; não executam envios reais.

Branch de remediação baseada no PR #193: codex/audit-remediation-20261108. Código e documentos espelhados no WIP Hatchable a partir do commit 58dd247dc6190e6709756a1147859cf5162436d8; 41/41 hashes SHA-256 conferidos. CI 42517572938 aprovada, dry-run sem erros/avisos (próxima versão 665). Recibo: audit-evidence/2026-11-08/remediation-sync-receipt.json. Atualização final deste relato e recibo é documental. Produção observada permanece v664 até implantação explícita e verificação dos pré-requisitos; WIP/dry-run não demonstram correção em produção.

Rollback: reverter o commit da remediação e desativar o cron de ingestão se implantado. Preservar a tabela ingestion_batches e seus lotes; não executar DROP. A migração não altera registros existentes. Antes de implantação, preservar a versão anterior e reconciliar diferenças reais hosted/GitHub; antes de recuperação de fila, definir quantidade, filtros, backup e conferência dos incertos.

## Pendências que esta correção não resolve

- Credenciais/escopos ausentes ou vencidos: Mercado Livre, Magalu, Rakuten, Amazon, Admitad e Awin; confirmar contrato/permissões AliExpress. Não houve troca nem renovação de segredos.
- Configuração real de AWS/SSM, Ollama e WhatsApp.
- Backup/restore real completo da hospedagem, recuperação assistida do backlog, causa dos erros externos de workers e reconciliação dos crons reais.
- CSP do site hosted, que atualmente não aplica toda a política do servidor standalone; os E2E existentes usam bypassCSP e não aprovam esse requisito.
- Reconciliação dos 30 arquivos com diferenças reais entre hospedagem e GitHub e PRs históricos; não sobrescrever adaptações legítimas.
- Aceite operacional das 35 seções: o relatório de auditoria permanece histórico e a liberação global continua rejeitada enquanto houver bloqueios. Nenhuma seção foi aprovada só por alteração de código.


Matriz de acompanhamento: [efeito das correções nas 35 seções](./STATUS-REMEDIACAO-35-ITENS-2026-11-08.md).
