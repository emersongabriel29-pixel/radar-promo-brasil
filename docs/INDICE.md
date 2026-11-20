# Documentação oficial — Radar Promo Brasil

> Estado observado em 08/11/2026. Fonte de verdade técnica: código efetivamente verificado, schema e snapshot funcional consultado no Hatchable v658; implementação da Regra Master v1 preparada para publicação v659; GitHub `main` com baseline do código em `a6215ee2264cb70741fa27075f4584c526d93e2f`; os commits seguintes desta sessão registram a documentação e a implementação versionada. Este índice é a porta de entrada; documentos históricos não substituem a auditoria atual.

## Regra obrigatória

**Toda alteração deve ser registrada na documentação na mesma tarefa e antes de ser considerada concluída.** Consulte [CONTROLE-DE-MUDANCAS.md](./CONTROLE-DE-MUDANCAS.md). A regra vale para código, API, UI, configuração, integrações, banco/migrações, automações, testes, segurança, documentação e implantação.

## Auditoria Android — 16/11/2026

- [Relatório das 23 áreas](./AUDITORIA-ANDROID-2026-11-16.md): 16 parciais, 6 bloqueadas e entrega adiada; aplicativo não homologado.
- [Evidências agregadas](./evidence/android-audit-2026-11-16.json): inventários, verificações, testes e achados, sem dados pessoais ou segredos.

## Android em preparação

- [Desenvolvimento Android — Radar Promo Ofertas](./ANDROID-BUILD.md): fonte recuperado, análise e testes aprovados na recuperação; geração de APK removida até prontidão.

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


## Remediação Android — 16/11/2026

- [Correções do backend independente, imagens e estado da migração](./REMEDIACAO-ANDROID-2026-11-16.md). Este documento atualiza os achados da auditoria sem transformar pendências em itens aprovados.

- [Plano revisável de transferência do catálogo](./MIGRACAO-CATALOGO-SUPABASE.md): sem exclusão, sem sobrescrita de conflitos e sem cutover automático.


## Fonte Flutter recuperado

- [Recuperação do projeto Android existente](../mobile/radar_promo_ofertas/docs/RECUPERACAO-2026-11-16.md): código recuperado, workflow de análise/testes e limites atuais. Geração de APK desativada.


## Resultado autorizado — publicações e catálogo

- [Estado atual da remediação](./REMEDIACAO-ANDROID-2026-11-16.md): versões v672/v2 publicadas, dados copiados e reconciliados, fonte Flutter recuperado e testes aprovados.
- [Evidências agregadas](./evidence/approved-deployments-and-catalog-2026-11-16.json).
- [Desenvolvimento Android](./ANDROID-BUILD.md): validação atual aprovada; geração de APK desativada.

## Comunidade Android — 17/11/2026

- [Conta, votos, comentários e avisos no Flutter](./COMUNIDADE-ANDROID-2026-11-17.md): implementação, limites da sessão, testes e estado da implantação.

## Publicação autorizada — 20/11/2026

- [Radar Promo Ofertas v3](./DEPLOY-OFERTAS-V3-2026-11-20.md): versão live, manifesto conferido, API 429, acesso público e homologação pendentes; sem APK.

## APK de teste solicitado — 20/11/2026

- [Geração Android autorizada](./ANDROID-BUILD.md): build ARM64 0.3.0+3 em andamento; consultar resultado posterior, não homologado.

- APK 0.3.0 de teste gerado em 20/11/2026; [hash, compatibilidade e evidência de compilação](./ANDROID-BUILD.md#resultado-do-apk-solicitado--20112026).

## Auditoria completa do aplicativo — 20/11/2026

- [Auditoria de 30 áreas do APK/Flutter/backend/Supabase](./AUDITORIA-APP-2026-11-20.md): parecer reprovado para produção, bloqueios reais e correções em validação.

- [Evidências agregadas da auditoria](./evidence/app-audit-2026-11-20.json): testes, hashes, comparação live e consultas read-only; resultado final registrado.

## APK 0.3.1 solicitado

- [Compilação e assinatura persistente](./ANDROID-BUILD.md): fonte auditada, sem nova implantação do backend; consultar resultado final.
