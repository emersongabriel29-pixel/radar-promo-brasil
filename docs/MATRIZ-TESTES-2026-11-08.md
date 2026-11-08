# Matriz de testes e critérios de aceite

## Separação de ambientes

- Testes standalone (Express/PGlite) não equivalem a testes no runtime Hatchable.
- O inventário Hatchable consultado contém 0 pastas/arquivos de teste sob tests/; o package.json do GitHub define testes Node, Playwright e audit para o adaptador standalone.
- O dry-run Hatchable em 08/11/2026 aprovou validação estática de deploy: errors 0, warnings 0; não executa fluxos de negócio nem integrações externas.

## Comandos do repositório

Conferir sempre os scripts atuais em package.json antes de executar:

- `npm run build`: verificação de sintaxe no adaptador standalone (não é build de bundle Hatchable).
- `npm test`: testes Node declarados no projeto.
- `npm run test:e2e`: Playwright; exige browsers e ambiente configurado.
- `npm audit --audit-level=moderate`: auditoria de dependências.
- `npm run check:release`: combina as verificações declaradas no package.json.

**Nenhum desses comandos foi executado nesta auditoria.** Não reutilizar resultados de 30/09 como resultado atual.

## Smoke tests seguros pós-deploy

- Rotas privadas: confirmar 401/403 sem autenticação e acesso autorizado com conta de teste.
- Rotas de leitura: confirmar shape e tipos de resposta.
- Validação: payload inválido retorna 400 sem gravar.
- Scheduler: conferir registro e execução sem disparar publicação.
- Filas: inspecionar estados e idempotência com dados isolados.
- Gemini: usar conta/limite de teste autorizado e conferir fallback, cooldown e ausência de dados inventados.
- Canais: somente destino de teste autorizado; confirmar receipt oficial sem consumidores reais.

## Critérios de aceite

| Domínio | Evidência necessária | Não basta |
|---|---|---|
| API | contrato, auth, validação, testes positivos/negativos | rota implantada |
| Banco | schema, migração, constraints, teste de compatibilidade | arquivo SQL criado |
| IA | input factual, output filtrado, fallback, quota/log | chave configurada |
| Marketplace | autenticação e operação oficial bem-sucedida | credencial cadastrada |
| Canal | receipt oficial no destino de teste | bot adicionado/grupo cadastrado |
| Scheduler | last_fired, resultado, logs e efeitos idempotentes | cron ativo |
| Segurança | testes de autorização, isolamento e segredos | painel privado visualmente |
| Deploy | dry-run, deployment version, smoke tests e diff de manifesto | deploy status live |
| Sincronização | hashes/arquivos equivalentes e commit/versão registrados | integração GitHub conectada |

## Resultado da auditoria atual

- Dry-run Hatchable: aprovado, 0 errors, 0 warnings.
- Testes npm: não executados nesta tarefa.
- E2E: não executado nesta tarefa.
- npm audit: não executado nesta tarefa.
- Homologação de integrações: não executada nesta tarefa.
- Publicação real: não executada.
- Deploy: não executado.


## Validação final da proposta em branch

- npm run build: aprovado, 205 arquivos JavaScript. O script verifica sintaxe, não produz bundle.
- node --test tests/master-offer-flow.test.mjs tests/medication-enqueue.test.mjs: 10 aprovados, zero falhas; teste de enqueue usa banco em memória e não envia mensagem.
- npm test: 243 testes, 236 aprovados, sete falhas preexistentes mantidas. Não há liberação integral da suíte.
- npm run test:e2e: três aprovados no adapter standalone, scheduler desativado.
- npm audit --audit-level=moderate: nenhuma vulnerabilidade reportada.
- Teste adicional anterior de lib/category-classifier.test.js: nove aprovados; classificador não modificado nesta proposta.
- Nenhuma API externa/canal homologado; nenhum dry-run Hatchable disponível; sem deploy, sem merge e sem alteração de dados de produção.
- Resultado: proposta validada no escopo restrito de novo enqueue via canEnterOfferFlow, não homologada para produção.
- Commit/PR: consultar o commit e a URL do PR que contém este registro; não há versão Hatchable correspondente.
