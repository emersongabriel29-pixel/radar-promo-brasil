# Radar Promo Brasil — registro de mudanças e análise de impacto

> Registro append-only de mudanças propostas, executadas, recusadas ou revertidas. Não apagar entradas antigas. Toda correção de registro deve ser feita por adendo datado.

## Objetivo

Prever efeitos colaterais antes de qualquer mudança, documentar o que foi realmente alterado e comprovar que o resultado correspondeu ao previsto.

Este log complementa:
- `docs/MASTER-CONTEXT.md`: regras permanentes, contexto e continuidade.
- `docs/AUDIT-LEDGER.md`: histórico sequencial das auditorias.

## Regras obrigatórias

1. Registrar a proposta antes de editar qualquer arquivo ou dado.
2. Identificar a causa raiz; se ainda não estiver confirmada, marcar como hipótese.
3. Ler o estado atual do arquivo/recurso e suas dependências.
4. Comparar GitHub e Hatchable antes de alterar código.
5. Listar efeitos diretos e indiretos, inclusive efeitos que podem ocorrer fora do arquivo editado.
6. Definir explicitamente o que não pode mudar.
7. Preferir a menor alteração reversível possível.
8. Definir testes e critérios de sucesso antes da execução.
9. Obter autorização para ações críticas, destrutivas, externas ou irreversíveis.
10. Depois, comparar o diff, executar testes e verificar efeitos observados.
11. Registrar falhas, alterações parciais e rollback; não ocultar tentativas malsucedidas.
12. Não declarar sucesso se a evidência não sustentar a conclusão.

## Classificação de risco

- **BAIXO:** alteração documental ou isolada, sem efeito no runtime/dados, reversível.
- **MÉDIO:** mudança em função ou componente com dependências conhecidas e testes disponíveis.
- **ALTO:** mudança transversal, integração, fila, scheduler, autorização, publicação ou schema.
- **CRÍTICO:** risco de perda/exposição de dados, interrupção ampla, migration destrutiva, publicação real ou ação irreversível.

A classificação deve considerar o pior efeito plausível sustentado pelo desenho do sistema, não apenas a quantidade de linhas alteradas.

## Checklist de análise antes da mudança

### A. Identidade e estado inicial
- [ ] Projeto e repositório corretos.
- [ ] Branch e commit confirmados.
- [ ] Versão e deployment Hatchable confirmados.
- [ ] Arquivos/recursos atuais lidos nas plataformas relevantes.
- [ ] Alterações pendentes e divergências identificadas.
- [ ] Auditoria anterior e decisões consultadas.

### B. Causa e objetivo
- [ ] Problema descrito de forma reproduzível.
- [ ] Causa raiz confirmada ou hipótese identificada.
- [ ] Resultado esperado mensurável.
- [ ] Escopo e itens fora do escopo definidos.

### C. Mapa de impacto
- [ ] Arquivos, funções, rotas e endpoints afetados.
- [ ] Chamadores, consumidores e dependências.
- [ ] Tabelas, colunas, índices, constraints e migrations.
- [ ] Integrações/APIs e credenciais envolvidas.
- [ ] Filas, estados, retries e idempotência.
- [ ] Agendamentos, concorrência e workers.
- [ ] Canais, destinos e risco de envio/publicação.
- [ ] Interface e fluxos de usuário.
- [ ] Chamadas, limites, latência e custo.
- [ ] Segurança, privacidade e exposição de dados.
- [ ] Compatibilidade com dados e versões anteriores.

### D. Previsão e salvaguardas
- [ ] Efeitos colaterais prováveis descritos.
- [ ] Cenários de falha previstos.
- [ ] Funcionalidades que devem permanecer intactas listadas.
- [ ] Alternativa menos invasiva considerada.
- [ ] Backup/snapshot adequado, quando necessário.
- [ ] Plano de rollback e limites de reversão definidos.
- [ ] Autorização explícita obtida, quando exigida.

### E. Plano de validação
- [ ] Testes de unidade.
- [ ] Testes de integração.
- [ ] Testes de regressão.
- [ ] Testes de segurança.
- [ ] Verificação de banco/dados.
- [ ] Verificação de filas e agendamentos.
- [ ] Verificação de chamadas/custos.
- [ ] Smoke tests sem efeitos externos reais.
- [ ] Critérios objetivos de aprovação definidos.

## Modelo de registro de mudança

Copie para cada proposta:

### CHG-[AAAA-MM-DD]-[identificador] — [descrição curta]

**1. Estado**
- Status: PROPOSTA | APROVADA | EM EXECUÇÃO | CONCLUÍDA | PARCIAL | BLOQUEADA | REVERTIDA | CANCELADA
- Data/hora e fuso:
- Solicitante/autorização:
- Auditoria relacionada:
- Projeto/repositório/branch:
- Commit inicial:
- Hatchable projeto/versão inicial:

**2. Problema e causa**
- Problema observado:
- Evidência:
- Causa raiz: CONFIRMADA | HIPÓTESE | NÃO IDENTIFICADA
- Objetivo mensurável:
- Escopo:
- Fora do escopo:

**3. Estado anterior**
- Arquivos e hashes:
- Funções/rotas:
- Dados/tabelas/estados:
- Integrações e filas:
- Comportamento atual:
- Dependências:
- Alterações locais/remotas pendentes:

**4. Previsão de impacto**
- Risco: BAIXO | MÉDIO | ALTO | CRÍTICO
- Efeito direto esperado:
- Efeitos indiretos possíveis:
- APIs afetadas:
- Filas e ofertas afetadas:
- Banco e migrations:
- Canais/publicações:
- Agendamentos/workers:
- Segurança/privacidade:
- Chamadas/limites/custos:
- Compatibilidade:
- Funcionalidades que não podem mudar:
- Alternativas consideradas:

**5. Salvaguardas**
- Backup/snapshot:
- Estratégia de idempotência:
- Plano de rollback:
- Condições para interromper:
- Autorização necessária/obtida:

**6. Execução real**
- Arquivos alterados:
- Resumo do diff:
- Alterações realizadas:
- Alterações não realizadas:
- Commit:
- Ambiente/plataforma:
- Versão implantada (se houver):

**7. Validação**
- Testes executados:
- Resultados:
- Regressões verificadas:
- Efeitos colaterais observados:
- Diferenças entre previsto e observado:
- Evidências:
- Pendências:

**8. Encerramento**
- Resultado: CONCLUÍDO | PARCIAL | BLOQUEADO | REVERTIDO
- Justificativa baseada em evidências:
- Próxima ação:
- Referências/entrada de auditoria:

---

## Registro inicial — criação dos documentos

### CHG-2026-11-07-DOCS — Criar documentação de continuidade

**1. Estado**
- Status: CONCLUÍDA NO ESCOPO DOCUMENTAL, sujeita à conferência final dos commits.
- Data: 07/11/2026.
- Projeto: Radar Promo Brasil.
- Repositório: `emersongabriel29-pixel/radar-promo-brasil`.
- Branch: `main`.
- Commit inicial observado: `2d34776aaf12ee14f1f639546ab52eaf00dce7e9`.
- Hatchable: `proj_1Xj94QxQmCam`, versão live 638 observada.

**2. Problema e objetivo**
- Problema: faltava a estrutura documental solicitada para manter contexto, histórico de auditorias e análise preventiva de mudanças.
- Objetivo: criar três documentos novos, sem alterar o código ou o comportamento operacional.

**3. Estado anterior**
- Os caminhos `docs/MASTER-CONTEXT.md`, `docs/AUDIT-LEDGER.md` e `docs/CHANGE-IMPACT-LOG.md` não existiam no GitHub `main), conforme consultas de conteúdo.
- O inventário Hatchable não apresentou diretório `docs/`.
- A interface de escrita Hatchable disponível nesta execução restringe os caminhos aceitos; não foi usado `public/` como atalho porque isso poderia expor documentação interna.

**4. Previsão de impacto**
- Risco: BAIXO.
- Efeito direto esperado: adicionar somente três arquivos Markdown no repositório GitHub.
- Efeito no runtime: nenhum esperado, pois não são arquivos executáveis nem parte do bundle Hatchable.
- Efeito em banco, integrações, filas, agendamentos, canais e credenciais: nenhum esperado.
- Funcionalidades a preservar: todas.
- Deploy: não necessário e não autorizado por esta tarefa.

**5. Salvaguardas**
- Confirmar que os caminhos não existiam antes da criação.
- Usar operação de criação, não substituição.
- Não editar arquivos existentes.
- Não copiar os documentos para diretório público do Hatchable.
- Não executar jobs, publicações ou mensagens.

**6. Execução real**
- Arquivos pretendidos:
  - `docs/MASTER-CONTEXT.md`
  - `docs/AUDIT-LEDGER.md`
  - `docs/CHANGE-IMPACT-LOG.md`
- Resultado da criação e SHAs/commits: preencher após confirmação das respostas da API GitHub.

**7. Validação**
- Testes de aplicação: não executados; não aplicáveis à criação exclusiva de Markdown.
- Validação documental: confirmar presença, branch, commit e leitura posterior dos três arquivos.
- Hatchable: sem cópia; nenhuma implantação realizada.
- Regressões: não há alteração executável prevista; ainda assim, não declarar validação operacional do app.

**8. Encerramento**
- Resultado: PARCIAL até a conferência final dos três arquivos.
- Próxima ação: reler os documentos no GitHub, registrar os commits resultantes e confirmar que não houve deploy nem alterações no Hatchable.

## Adendos

Nenhum adendo registrado até o momento.


## Adendo 2026-11-07 — confirmação final

- Os três documentos foram criados e relidos no GitHub `main`.
- Commit de criação de `docs/MASTER-CONTEXT.md`: `9746a283c53f6b2e2a03168cc2e0e8f6bba3345b`.
- Commit de criação de `docs/AUDIT-LEDGER.md`: `f8d12b52f24f4dff625ddf9b79785f217ce831d7`.
- Commit de criação de `docs/CHANGE-IMPACT-LOG.md`: `85e2a4f8fdeea2fcf4ca4e217110fe7ad08375de`.
- Último commit observado: `85e2a4f8fdeea2fcf4ca4e217110fe7ad08375de`.
- A validação documental foi concluída por leitura dos três caminhos no branch `main`.
- Não houve alteração de código executável, banco, migrations, integrações, filas, credenciais ou agendamentos. Não houve deploy nem publicação.
- Hatchable continua sem cópia destes documentos; a interface disponível não aceita `docs/` e não foi usado diretório público como substituto.
- Nenhum teste npm foi executado; não aplicável à criação exclusiva de Markdown.
- Resultado: CONCLUÍDA no escopo documental do GitHub; sincronização GitHub ↔ Hatchable não realizada nem alegada.
