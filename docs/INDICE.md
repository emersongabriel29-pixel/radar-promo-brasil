# Documentação oficial — Radar Promo Brasil

> Estado observado em 08/11/2026. Fonte de verdade técnica: código efetivamente verificado, schema e snapshot funcional consultado no Hatchable v658; implementação da Regra Master v1 preparada para publicação v659; GitHub `main` com baseline do código em `a6215ee2264cb70741fa27075f4584c526d93e2f`; os commits seguintes desta sessão registram a documentação e a implementação versionada. Este índice é a porta de entrada; documentos históricos não substituem a auditoria atual.

## Regra obrigatória

**Toda alteração deve ser registrada na documentação na mesma tarefa e antes de ser considerada concluída.** Consulte [CONTROLE-DE-MUDANCAS.md](./CONTROLE-DE-MUDANCAS.md). A regra vale para código, API, UI, configuração, integrações, banco/migrações, automações, testes, segurança, documentação e implantação.

## Documentos vigentes

- [Regra Master e fluxos ponta a ponta](./REGRA-MASTER-E-FLUXOS-PONTA-A-PONTA.md)
- [Controle de mudanças e documentação obrigatória](./CONTROLE-DE-MUDANCAS.md)
- [Auditoria do estado real — 08/11/2026](./AUDITORIA-ESTADO-2026-11-08.md)
- [Arquitetura e limites de execução](./ARQUITETURA-ESTADO-2026-11-08.md)
- [Inventário de rotas e funções implantadas](./INVENTARIO-ROTAS-2026-11-08.md)
- [Inventário técnico completo: 121 rotas, 53 módulos, 71 migrações](./INVENTARIO-TECNICO-COMPLETO-2026-11-08.md)
- [Banco de dados e migrações](./BANCO-DADOS-2026-11-08.md)
- [Operação, filas, crons e recuperação](./OPERACAO-2026-11-08.md)
- [Integrações e IA Gemini](./INTEGRACOES-IA-2026-11-08.md)
- [Matriz de testes e critérios de aceite](./MATRIZ-TESTES-2026-11-08.md)
- [Regra Hatchable ↔ GitHub](./HATCHABLE-GITHUB-SYNC-RULE.md)
- [Release e procedimento de publicação](./RELEASE.md)

## Fontes históricas

- [Auditoria de 30/09/2026](./AUDITORIA-2026-09-30.md): registro histórico, não retrato do estado atual.
- [Documentação de operação 01/10/2026](./OPERACAO-2026-10-01.md): consultar junto com a auditoria atual.
- [Revezamento WhatsApp](./WHATSAPP-REVEZAMENTO.md): procedimento específico; revalidar antes de executar.

## Regra de leitura

Quando houver conflito entre documentação e execução, não presumir que a documentação está certa: abrir achado, inspecionar código/schema/logs, corrigir a fonte correspondente e registrar a reconciliação. Status de integração só pode ser declarado após prova do fluxo real permitido. Nenhum documento transforma recurso planejado em funcionalidade implementada.
