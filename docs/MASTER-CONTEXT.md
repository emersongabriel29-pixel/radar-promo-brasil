# Radar Promo Brasil — contexto mestre e regras permanentes

> Documento de continuidade. Atualize fatos verificados sem apagar o histórico relevante. Este documento não substitui o código, os logs operacionais, as auditorias detalhadas nem a regra de sincronização Hatchable ↔ GitHub.

## 1. Identificação inequívoca

- Projeto: **Radar Promo Brasil**.
- Repositório: https://github.com/emersongabriel29-pixel/radar-promo-brasil
- Branch principal: `main`.
- Aplicação Hatchable: https://radar-promo-brasil.hatchable.site
- ID do projeto Hatchable: `proj_1Xj94QxQmCam`.
- Não confundir com Feiraê, OfertaHub ou qualquer outro projeto.

## 2. Objetivo do produto

Descobrir, organizar, validar, enriquecer, classificar e encaminhar ofertas de afiliados para destinos autorizados, com rastreabilidade de origem, links e SubIDs, controle de filas, prevenção de duplicidade, aprovação quando necessária e operação sustentável.

Princípios de produto:
- Preservar ofertas, histórico, integrações e funcionalidades existentes.
- Manter os fluxos das APIs e suas filas isolados quando seus contratos forem diferentes.
- Não publicar ofertas nem enviar mensagens reais durante testes sem autorização explícita.
- Não considerar cadastro de integração como prova de funcionamento.
- Não descartar ofertas válidas apenas para reduzir filas ou melhorar métricas.
- Não introduzir limites artificiais ou regras de bloqueio sem requisito e evidência.
- Manter segurança, conformidade com as plataformas e rastreabilidade.

## 3. Regra mestra: não alucinar

É proibido inventar, presumir ou apresentar como fato algo que não tenha sido observado ou sustentado por evidência.

### 3.1 Estados de conhecimento obrigatórios

Classifique cada afirmação relevante como uma destas situações:
- **VERIFICADO:** observado diretamente em arquivo, resposta de ferramenta, log, teste ou configuração identificável.
- **HISTÓRICO:** registrado anteriormente, mas ainda não reconfirmado no estado atual.
- **INFERÊNCIA:** interpretação plausível; deve ser identificada como hipótese e acompanhada da justificativa.
- **NÃO VERIFICADO:** não foi possível obter evidência suficiente.
- **BLOQUEADO:** depende de acesso, credencial, permissão, serviço externo ou decisão.
- **FALHOU:** teste ou operação foi executado e retornou falha, com resultado registrado.

Nunca converter HISTÓRICO, INFERÊNCIA ou NÃO VERIFICADO em VERIFICADO sem nova evidência.

### 3.2 Regras de evidência

Para toda conclusão técnica importante, registre:
- fonte exata (arquivo/caminho, endpoint, ferramenta, log ou teste);
- branch, commit, versão ou ambiente observado;
- data/hora e fuso, quando disponíveis;
- trecho, hash, identificador ou resultado que sustenta a conclusão;
- limites da verificação.

Não invente hashes, IDs, rotas, endpoints, nomes de tabelas, métricas, contagens, resultados de teste, APIs oficiais, permissões ou estados de deploy.

Se uma ferramenta não fornecer um dado, escreva **“não disponível nesta verificação”**. Se a evidência for parcial, descreva exatamente o que foi e o que não foi observado.

Não diga “testado”, “corrigido”, “sincronizado”, “implantado”, “funcional”, “seguro” ou “concluído” sem evidência específica que sustente essa palavra.

Não confunda:
- código escrito com código testado;
- integração cadastrada com integração validada;
- commit com deploy;
- deploy com sincronização;
- oferta capturada com oferta validada;
- oferta validada com oferta publicada;
- publicação solicitada com entrega confirmada;
- clique com conversão;
- conversão reportada com comissão aprovada.

### 3.3 Fontes externas e APIs

- Consulte documentação oficial antes de afirmar contratos, endpoints, limites ou capacidades de APIs.
- Não invente endpoints ou contorne CAPTCHA, controles de acesso ou proteções antiautomação.
- Separe comportamento documentado pelo fornecedor de comportamento observado no Radar.
- Registre código HTTP, resposta relevante e contexto sem expor tokens, cookies, chaves ou dados pessoais.
- Se a documentação oficial não estiver disponível, declare a limitação e não improvise uma API.

## 4. Regra de continuidade e memória técnica

Antes de cada nova sessão, auditoria ou alteração:
1. Ler este documento.
2. Ler `docs/AUDIT-LEDGER.md`.
3. Ler `docs/CHANGE-IMPACT-LOG.md`.
4. Consultar a auditoria anterior pertinente e a documentação de release/sincronização.
5. Conferir o estado atual real do GitHub e do Hatchable, separadamente.
6. Identificar objetivo, etapa, decisões, restrições, resultados, pendências e próximo passo.
7. Distinguir fatos atuais de registros históricos.
8. Continuar do último ponto comprovado, sem reiniciar etapas concluídas desnecessariamente.

Ao encerrar uma etapa, atualizar os registros antes de considerar o trabalho encerrado. Não apagar entradas antigas: corrigir por adendo datado e explicar a evidência que motivou a revisão.

## 5. Regra absoluta de preservação

Não excluir, sobrescrever, substituir ou modificar indiscriminadamente:
- arquivos, funções, componentes, rotas e endpoints;
- tabelas, colunas, índices, registros e migrations;
- ofertas, filas, históricos e vínculos;
- credenciais, integrações, configurações e agendamentos;
- regras de classificação, destinos, canais e controles de segurança.

Antes de qualquer alteração:
1. Identificar precisamente o problema e sua causa raiz.
2. Ler o conteúdo atual e conferir o estado nas duas plataformas.
3. Mapear dependências e consumidores da função/arquivo/dado.
4. Identificar impactos diretos e indiretos.
5. Avaliar regressões, duplicidade, perda de dados e aumento de custos/chamadas.
6. Comparar alternativas menos invasivas.
7. Definir comportamento que deve permanecer inalterado.
8. Definir testes, critérios de sucesso e plano de reversão.
9. Obter autorização quando a ação for de risco elevado ou irreversível.

É proibido apagar dados, executar migrations destrutivas, substituir arquivos cegamente ou remover funcionalidades para contornar sintomas sem autorização explícita.

## 6. Análise preventiva de efeitos colaterais

Antes de escrever ou alterar código, elaborar uma análise de impacto com:
- problema e causa raiz;
- objetivo e resultado esperado;
- arquivos, funções, rotas e tabelas envolvidos;
- dependências e consumidores;
- APIs, filas, canais e agendamentos afetados;
- efeitos diretos e indiretos previstos;
- riscos de regressão, concorrência, duplicidade e perda;
- impacto em chamadas, limites, latência e custos;
- compatibilidade retroativa;
- alternativas menos invasivas;
- testes de unidade, integração, regressão e operação;
- rollback e condições para interromper a mudança.

Classificação:
- **BAIXO:** isolado, reversível e com dependências conhecidas.
- **MÉDIO:** afeta dependências conhecidas e exige regressão direcionada.
- **ALTO:** pode afetar múltiplos módulos, integrações ou fluxos de produção.
- **CRÍTICO:** pode causar perda de dados, exposição de segredo, interrupção relevante ou ação externa irreversível.

Mudanças de alto risco exigem isolamento, revisão e testes ampliados. Mudanças críticas exigem autorização explícita e salvaguardas antes de qualquer execução.

Se o impacto não puder ser determinado, não presumir segurança: interromper a alteração e registrar o que falta descobrir.

## 7. Preservação de integrações, filas e publicações

### 7.1 Integrações
Tratar cada integração de acordo com seu contrato e seu fluxo próprio. Uma alteração em uma API não deve modificar outra por acidente. Verificar autenticação, renovação, endpoints oficiais, paginação, limites, erros, retries, links, SubIDs, dados recebidos e resultados.

Integração só pode ser classificada como:
- Não implementada.
- Implementada, mas não configurada.
- Configurada, mas não validada.
- Testada com sucesso.
- Bloqueada por acesso, credencial ou limitação externa.

### 7.2 Filas e ofertas
Preservar estados e transições existentes. Verificar, quando presentes, estados como `READY_FOR_LINK`, `BLOCKED_SAFETY`, pendentes, validados, aprovados, publicados e falhos. Não presumir que esses estados cubram todas as filas: conferir o schema e o código atual.

- Não apagar ofertas para reduzir backlog.
- Não misturar filas independentes.
- Não converter falha transitória em bloqueio permanente.
- Não reprocessar sem idempotência e proteção contra duplicidade.
- Não alterar estado sem entender suas regras e consumidores.
- Preservar histórico e vínculo com a API de origem.

### 7.3 Canais
Testar sem enviar mensagens a consumidores. Não realizar publicação real sem autorização explícita. Estados incertos de entrega devem ser reconciliados no destino antes de qualquer reenvio; não presumir que uma falha de resposta signifique que a mensagem não foi entregue.

## 8. GitHub ↔ Hatchable: verificação separada

A conexão entre as plataformas não prova sincronização bidirecional.

Antes de alterar código:
1. Identificar branch e commit do GitHub.
2. Identificar versão implantada e manifesto de arquivos do Hatchable.
3. Conferir os arquivos envolvidos em ambos.
4. Identificar diferenças e mudanças pendentes.
5. Definir a fonte de verdade para a tarefa.
6. Preservar alterações válidas de cada lado.

Depois:
1. Comparar novamente os arquivos modificados.
2. Registrar commit e versão.
3. Executar validações apropriadas.
4. Confirmar implantação separadamente, se autorizada.
5. Registrar divergências restantes.

Seguir integralmente `docs/HATCHABLE-GITHUB-SYNC-RULE.md`. Nunca afirmar sincronização se os arquivos relevantes não foram comparados nos dois lados.

Documentação interna em `docs/` no GitHub não deve ser copiada para o Hatchable por conveniência. Antes de replicá-la, verificar se o destino e a plataforma aceitam esse tipo de arquivo e se ele pertence ao bundle hospedado. Não publicar documentação privada em `public/` apenas para contornar restrições de caminho.

## 9. Processo obrigatório de mudança

Fluxo:
**CONTEXTO → DIAGNÓSTICO → EVIDÊNCIAS → ANÁLISE DE IMPACTO → PREVISÃO → PLANO → AUTORIZAÇÃO (quando necessária) → ALTERAÇÃO MÍNIMA → TESTES → REVISÃO DO DIFF → VALIDAÇÃO → REGISTRO.**

Não pular etapas. Se o diagnóstico demonstrar que não é necessário alterar código, não alterar.

Preferir mudanças pequenas, isoladas, compatíveis e reversíveis. Não misturar correções independentes em uma mudança difícil de revisar.

## 10. Testes e validação

Consultar primeiro os scripts reais do `package.json`. Executar apenas comandos existentes e adequados ao escopo, por exemplo:
- `npm run build`
- `npm test`
- `npm run test:e2e`
- `npm audit --audit-level=moderate`

Registrar comando, ambiente, data, resultado e saída relevante. Não afirmar aprovação se o teste não foi executado, foi interrompido ou não teve resultado consultado.

Após mudanças, testar também os fluxos dependentes e funcionalidades que precisam permanecer intactas. Testes de produção não podem publicar ofertas, enviar mensagens, gerar cobranças ou alterar dados reais sem autorização.

## 11. Ações que exigem autorização explícita

- excluir ou sobrescrever dados/arquivos importantes;
- executar migration destrutiva ou irreversível;
- alterar segredos ou credenciais de produção;
- publicar conteúdo real ou disparar mensagens;
- realizar gastos, contratar serviços ou assumir compromissos;
- executar deploy quando não houver autorização aplicável;
- fazer mudanças críticas ou irreversíveis.

Não interpretar um “faça tudo” genérico como autorização para ações externas de alto risco.

## 12. Comandos curtos e continuidade

“Faça”, “continue”, “resolva”, “termine”, “tente novamente” e “ok” significam retomar a última tarefa pendente documentada, respeitando o escopo e as autorizações já dadas. Não reiniciar o projeto, não trocar de repositório, não repetir perguntas respondidas e não ampliar o escopo por conta própria.

Se faltar dado essencial, fazer uma pergunta direta. Se houver caminho seguro que não dependa dele, executar apenas esse caminho.

## 13. Formato obrigatório de encerramento

Toda etapa deve registrar:
- projeto e auditoria;
- objetivo e etapa;
- estado inicial e fontes consultadas;
- fatos verificados, históricos, inferências e itens não verificados;
- arquivos analisados e alterados;
- mudanças e justificativas;
- análise de efeitos colaterais;
- testes executados e resultados reais;
- funcionalidades preservadas e regressões verificadas;
- branch e commit;
- versão Hatchable e estado de deploy;
- divergências e limitações;
- riscos e pendências;
- próxima etapa exata.

Status permitido: **CONCLUÍDA**, **PARCIALMENTE CONCLUÍDA**, **BLOQUEADA** ou **NÃO INICIADA**. Justificar o status com evidências.

## 14. Estado de referência observado na criação deste documento

Registro pontual de 07/11/2026; não tratar como estado permanente:
- GitHub `main`: commit observado `2d34776aaf12ee14f1f639546ab52eaf00dce7e9`, mensagem “Fix category-safe Telegram routing for Casa & Lar (#168)”.
- Hatchable `proj_1Xj94QxQmCam`: versão observada 638, status live; manifesto do deployment indicava 269 arquivos e 129 funções.
- O inventário Hatchable consultado listou 270 arquivos no projeto; essa contagem de inventário não deve ser confundida com a contagem do deployment.
- O README e `docs/HATCHABLE-GITHUB-SYNC-RULE.md` foram consultados.
- Os três documentos de continuidade foram inexistentes no GitHub antes desta criação.
- O inventário Hatchable consultado não apresentou diretório `docs/`. A interface de escrita Hatchable disponível nesta sessão restringe destinos a `public/`, `api/`, `migrations/` e arquivos de configuração específicos.
- Nenhum deploy foi realizado como parte da criação desta documentação.

Reconferir todos esses valores antes de qualquer tarefa futura.

## 15. Regra final

**Não alucinar. Não presumir. Não apagar. Não sobrescrever cegamente. Não quebrar. Não esquecer.**

Pensar antes de alterar; prever antes de executar; preservar antes de otimizar; testar antes de aprovar; comparar antes de sincronizar; validar antes de implantar; registrar antes de encerrar.

A evolução do Radar só é bem-sucedida quando o objetivo novo é alcançado sem sacrificar o que já funcionava, e quando cada afirmação pode ser sustentada por evidência.
