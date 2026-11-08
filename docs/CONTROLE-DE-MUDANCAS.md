# Controle de mudanças e documentação obrigatória

## Regra permanente

Toda alteração no Radar Promo Brasil DEVE produzir uma atualização documental na mesma tarefa. Não existe exceção para “mudança pequena”, hotfix, refatoração, ajuste visual, alteração de prompt, troca de configuração, mudança de cron ou correção emergencial. Se a alteração não mudar o comportamento documentado, registrar no changelog técnico que a documentação funcional foi revisada e não exigiu mudança, explicando o motivo.

## Escopo obrigatório

Aplica-se a:
- código de frontend, backend, bibliotecas e rotas;
- contratos de API, payloads, validações e permissões;
- integrações, credenciais (somente nomes/escopos; nunca valores), webhooks e provedores;
- IA, prompts, modelos, fallback, classificadores e limites de consumo;
- banco, schema, índices, constraints, migrações e backfills;
- filas, workers, cron, recorrência, retries, idempotência e publicação;
- categorias, subcategorias, regras, palavras-chave e filtros;
- segurança, autenticação, autorização, privacidade e LGPD;
- interface, navegação, acessibilidade, assets e design system;
- testes, CI, dependências, hospedagem, deploy e rollback;
- a própria documentação.

## O que atualizar em cada mudança

1. Índice e documento de domínio afetado.
2. Registro de mudanças com data, motivação, arquivos/rotas/tabelas afetados e impacto.
3. Contrato operacional/API quando houver mudança de entrada, saída, permissão ou estado.
4. Banco/migração quando schema ou dados mudarem, incluindo estratégia de compatibilidade e rollback.
5. Integração quando mudar provedor, autenticação, endpoint, limites, status ou teste.
6. Operação quando mudar fila, cron, worker, retry, janela, limite ou recuperação.
7. Matriz de testes com testes executados, resultado real e itens não testados.
8. Estado de sincronização GitHub/Hatchable, commit, versão implantada e divergências.

## Registro mínimo por mudança

- Data/hora (UTC) e responsável/agente.
- Solicitação/objetivo e razão técnica.
- Fonte de verdade definida para a tarefa.
- Arquivos, rotas, componentes, tabelas, migrações e configurações afetados.
- Comportamento anterior e novo comportamento.
- Riscos, segurança, compatibilidade e impacto em dados.
- Testes executados e evidências; testes não executados e motivo.
- Deploy: não realizado/realizado, versão, commit e resultado.
- Sincronização: GitHub, Hatchable e estado comprovado.
- Rollback ou recuperação aplicável.

## Fluxo obrigatório

**Antes:** identificar projeto/repositório/branch; consultar commit GitHub e versão Hatchable; comparar arquivos relevantes; definir fonte de verdade; ler regras e documentação do domínio.

**Durante:** fazer mudança mínima e reversível; não sobrescrever divergências; preservar integrações e dados; não executar publicação real, gasto, migração destrutiva ou alteração de segredo sem autorização específica.

**Depois:** atualizar docs na mesma alteração; revisar diff; executar testes apropriados; dry-run; sincronizar explicitamente os arquivos documentais e de código; implantar apenas se autorizado; validar versão/commit e rotas; registrar evidências.

## Critério de conclusão

Uma alteração só pode ser marcada como concluída quando implementação, documentação e evidências estiverem coerentes. Se documentação foi atualizada mas os testes/deploy não foram executados, classificar como “documentado, não homologado”. Se Hatchable e GitHub divergirem, classificar como “documentação/código parcialmente sincronizados” e listar os arquivos.

## Integridade documental

- Não inventar endpoints, limites, respostas, estados, status de integração ou testes.
- Distinguir implementado, configurado, conectado, validado e homologado.
- Datar toda evidência; não reutilizar uma evidência histórica como prova atual.
- Nunca registrar tokens, cookies, chaves, segredos, dados pessoais ou payloads sensíveis.
- Documentação pública nunca deve conter detalhes operacionais privados, IDs de conta, tokens ou informações de segurança exploráveis.
- Alterações em documentos devem atualizar o índice e manter links válidos.

## Modelo de entrada no changelog

| Data UTC | Mudança | Escopo | Testes/evidência | GitHub commit | Hatchable versão | Estado |
|---|---|---|---|---|---|---|
| 2026-11-08 | Instituída política de documentação obrigatória e criada baseline documental | Governança/documentação | Inventário Hatchable v655; dry-run documental sem erros/avisos | A registrar após commit | v653 (sem deploy documental) | Em reconciliação |


## Regra Master de ofertas e fluxos ponta a ponta

A especificação normativa é [REGRA-MASTER-E-FLUXOS-PONTA-A-PONTA.md](./REGRA-MASTER-E-FLUXOS-PONTA-A-PONTA.md). Ela prevalece sobre instruções antigas de score mínimo, desconto mínimo, limite de publicações/dia, cooldown comercial ou filtros de categoria/+18. Score, desconto, comissão, avaliação, idade, categoria e confiança de IA são informativos; não podem descartar ou estacionar uma oferta.

A única limitação interna de processamento é a capacidade/quota real da hospedagem. Ao atingir o limite, persistir cursor/checkpoint, preservar o item e reagendar automaticamente em lotes, sem descarte e sem one-shot por oferta. Nenhuma oferta pode ficar sem causa, responsável e próxima ação. Falhas externas e requisitos técnicos devem ser registrados e recuperados sem inventar dados ou burlar políticas/autorização do provedor.

Toda alteração em regras de elegibilidade, classificação, descoberta, links, publicação, retries, cron ou dados deve atualizar a Regra Master e o documento do domínio na mesma tarefa. Não zerar backlog por atualização SQL em massa sem reconciliação, idempotência, checkpoint e rollback.

| 2026-11-08 | Regra Master e mapa dos fluxos ponta a ponta; identificação dos gates legados | Governança, descoberta, classificação, IA, links, autopilot, filas e entrega | Consulta read-only: 8.020 ofertas e filas por provedor; dry-run documental sem erros/avisos; nenhum teste funcional nesta etapa | 626a850a8a49b4a1f29c2646199bef4932b1c3c1 | v657 (publicação documental desta tarefa) | Documentado; implementação funcional e homologação pendentes |


| 2026-11-08 | Implementação inicial da Regra Master v1 | Elegibilidade, autopilot, entrega versionada, Shopee, Lomadee, AliExpress, Amazon, extensão e migração 066 | Dry-run Hatchable ok, 0 erros/avisos; testes unitários adicionados mas não executados; nenhuma mensagem manual enviada | commits sequenciais da implementação v1; consultar histórico GitHub main | draft para v659 | Código e documentação preparados; homologação real e reconciliação do backlog pendentes |


| 2026-11-08 | Ajustes finais da política Master v1: restrição externa AliExpress isolada, Shopee incompletos recuperáveis, helper e testes ampliados | Elegibilidade e retomada de descoberta | Dry-run Hatchable 0 erros/avisos; 4.036 ofertas elegíveis sem publicação identificadas em consulta read-only; nenhum worker ou envio manual acionado | commits finais em GitHub main; consultar histórico | draft para v659 | Pronto para deploy documental/funcional; testes npm e homologação externa ainda não executados |


| 2026-11-08 | Fallback de publicação textual sem imagem | Dispatchers Telegram e Canal do WhatsApp, entrega Master | Dry-run de deploy sem erros/avisos; nenhum dispatcher acionado manualmente | commits 9016ef3, 64dbf37, ba838c5 | draft para v659 | Código preparado; homologação real de canal pendente |


| 2026-11-08 | Fallback de texto após falha de mídia e correção de métrica do autopilot | Telegram, Canal do WhatsApp e métricas da fila | Dry-run sem erros/avisos; nenhum envio manual acionado | commits 53b871b, 3d31757, 84b5109, 2278ab3 | draft para v660 | Código preparado; validação real do canal aguarda operação programada |


| 2026-11-08 | Cadência contínua sem one-shot no fluxo de ofertas | Autopilot 15 min, extensão 15 min, Telegram 5 min, lote Telegram 10, mídia 2,5s | Dry-run de deploy sem erros/avisos; configuração DB interval=5/batch=10 confirmada; nenhum worker de envio acionado manualmente | commits f8f881c, cc32df4, 7e05e80, 79911ba, 926b25b, 6614dc3, f45489e, d28cc59 | draft para v661 | WhatsApp externo sem conexão/destinos; APIs externas ainda não homologadas ponta a ponta |


| 2026-11-08 | Cadência compatível com Free e wake-up central sem one-shot por produto | Autopilot cron horário, extensão minuto 50, Telegram cron horário + wake-up por lote; batch Telegram 12 | Dry-run aceitou cron horário e rejeita <1h no plano Free; scheduler DB interval=5/batch=12 confirmado | commits da configuração v661 no GitHub main | draft para v661 | Frequência limitada pelo plano Free; WhatsApp sem conexão e destinos ativos |


| 2026-11-08 | Reconciliação de 26 falsos duplicados e migração gradual de 2.329 publicações legacy | Migration 067, canonical_offer_id, status DUPLICATE_MERGED, restauração de 9 variantes e promoção Master por lote no Telegram | Consulta read-only confirmou 17 duplicatas exatas com canônico e 9 variantes únicas; 0 publicações nas duplicatas; 0 validation REJECTED após transação; dry-run sem erros/avisos | commit 1853074480a9e4e4e79b23f9f75734c4dfc2b4c8 e migration 067 | draft para v663 | Aguardando deploy v663; dispatch automático depende do cron/one-shot e conexão Telegram ativa |


| 2026-11-08 | Aumento do lote técnico do autopilot para 200 e dispatcher Telegram para 14 | lib/autopilot, cache de imagem, worker WhatsApp, settings de publicação | Dry-run anterior sem erros/avisos; configuração DB batch=14/interval=5 confirmada; sem alteração de filtro de elegibilidade | commits 04dae24a, fc1a1059, 7551724f | draft para v664 | Próximo deploy; homologação de WhatsApp bloqueada por ausência de conexão |
