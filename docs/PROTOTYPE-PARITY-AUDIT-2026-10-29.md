# Auditoria de paridade — protótipo Cupom Radar × Radar Promo Brasil

**Data da verificação:** 2026-10-29  
**Branch de auditoria:** `codex/prototype-parity-review-20261029`  
**Base verificada:** `main` em `fc3d559d2a1cddd451b897d718d5238dee3a7f0e`  
**Protótipo isolado:** `codex/cupom-radar-prototype` em `1b34c25e5c874b5fd96fd6ef6e572b7f085a07c7`  
**Objetivo:** identificar código e comportamento demonstrado que faltam ou diferem no produto real, sem copiar estados falsos nem interferir nas integrações.

## Conclusão executiva

O protótipo **não é só uma imagem**: contém uma aplicação HTML/CSS/JavaScript executável, 13 rotas internas por hash, formulários, validação de URL, geração de rascunho local, prévia de modelos, filtro de ofertas, alternância Fila/Lista, remoção de rascunhos, análise manual de texto, detecção de repetição em memória, preview de Story, vitrine de bio link e telas de relatório/integrações. O teste Playwright do protótipo exercita navegação, formulário, modelo, copiador e menu móvel.

Mas o código confirma também que essas operações são **demonstrações locais**: os produtos são fixtures sintéticas, o modelo usa `localStorage`, a fila e a deduplicação vivem apenas na sessão, o agendamento não cria um job, o Story não gera arquivo de imagem e nenhuma API externa é chamada. Portanto, os fluxos são referências concretas de UX e cenários de teste — não código de backend pronto para produção.

O Radar em `main` já possui uma estrutura de produto diferente e mais ampla: sete áreas principais (Central, Radar, Ofertas, Publicações, Canais, Relatórios e Configurações), submódulos como Monitoramento 24h, Modo clone, Criação rápida, Curador de ofertas, Estúdio de IA, Agente Radar Social, filas/agendamento, grupos/canais, segurança/LGPD, integrações e vitrine. A estratégia correta é **adaptar os casos de interação aos componentes e contratos existentes**, e não substituir o menu ou importar o protótipo inteiro.

## Inventário arquivo a arquivo do protótipo

| Arquivo / grupo | Conteúdo observado | Uso recomendado |
| --- | --- | --- |
| `prototype/index.html` | Shell, sidebar com 13 destinos, aviso explícito de demonstração, cabeçalho, aviso acessível e toast | Referência de hierarquia de navegação e comunicação de estado; não substituir a navegação oficial de sete áreas |
| `prototype/app.js` | Renderizadores para Painel, Gerar postagem, Ofertas/cupons, Modelos, Fila, Lista, Copiador, Agendamentos, Canais, Stories, Bio link, Relatórios e Integrações | Fonte para cenários de teste e estados UX; nenhuma função deve ser copiada como se tivesse persistência ou integração real |
| `prototype/styles.css` | Estilos visuais compactos do protótipo | Recriar somente padrões aprovados usando tokens/componentes do Radar; não importar CSS inteiro |
| `tests/prototype.test.cjs` | Cinco cenários Playwright do próprio protótipo | Adaptar cenários equivalentes aos testes do Radar; os testes atuais não validam o Radar |
| `scripts/serve-prototype.cjs` | Servidor estático local para a demo | Não integrar à aplicação de produção |
| `package.json` / `package-lock.json` do protótipo | Dependências e comando de teste isolados | Não mesclar dependências por causa do protótipo |
| `screenshots/prototype-desktop.png`, `prototype-mobile.png` | Capturas desktop/mobile | Referência visual apenas |
| `investigation/INVENTARIO-FUNCIONAL.md`, `INVENTARIO-FRONTEND.md` | Evidências observáveis, limitações e fluxos | Manter como documentação de investigação |
| `investigation/ARQUITETURA-INFERIDA.md`, `ESPECIFICACAO-PROXIMA-FASE.md`, `LIMITACOES-E-BLOQUEIOS.md` | Arquitetura inferida, contratos propostos e bloqueios | Usar como requisitos a validar; não confundir inferência com API oficial |
| `investigation/evidence/*.json` e scripts | Capturas e análise estática da referência pública | Evidência de pesquisa; não é código executável do Radar |
| `README.md`, `PROXIMOS-PASSOS.md`, `COMPARACAO-COM-RADAR-PROMO.md` | Contexto, plano e comparação anteriores | Atualizar conforme esta matriz, preservando a separação entre protótipo e produção |

## Matriz de paridade por comportamento

Legenda: **Presente em main** = há estrutura/fluxo no código principal; **Parcial** = existe UI ou uma parte, mas não foi comprovada a paridade completa; **Ausente/não comprovado** = não há evidência suficiente no `main` atual; **Demo apenas** = existe no protótipo, sem operação real.

| Capacidade | Protótipo | Radar `main` observado | Classificação e ação |
| --- | --- | --- | --- |
| Navegação e painel | 13 destinos internos; dashboard sintético | Sete áreas oficiais e submódulos no `public/radar.js` | **Presente com arquitetura diferente.** Preservar menu atual; adaptar hierarquia, estados vazios e acessibilidade quando necessário |
| Criar postagem | Formulário manual; URL validada; rascunho local | Existe Criação rápida e fluxos de oferta/publicação | **Parcial quanto à experiência do protótipo.** Portar cenários de URL inválida, rascunho, erro e sucesso para E2E do Radar |
| Ofertas e cupons | Três produtos inventados; filtro local | Área Ofertas e submódulo Ofertas e cupons no Radar | **Presente, mas não usar fixtures da demo.** Validar filtros com dados de teste do Radar |
| Modelos de mensagem | Edição, placeholders e persistência em `localStorage` por navegador | A documentação anterior menciona CRUD persistente em worktree local, mas esse trabalho não está demonstrado no `main` verificado | **Ausente/não comprovado em main.** Prioridade alta: implementar por conta/loja com API, autorização, persistência e migração; nunca reutilizar `localStorage` como fonte de verdade |
| Fila e Lista | Alternância visual e rascunhos em array de sessão | Publicações contém Filas e agendamento; Radar mantém `queues` e `schedules` na estrutura de UI | **Presente em estrutura, paridade operacional a testar.** Adaptar testes de alternância, itens vazios, remoção, estado e persistência |
| Agendamentos | “Agendar localmente” apenas navega e mostra toast | Existe submódulo Filas e agendamento | **Presente em estrutura, não presumir equivalência.** Testar persistência, timezone, estados e cron em testes sem envio real |
| Copiador / modo clone | Parser local de texto e duplicata só em `Set` de sessão; não lê grupos | Radar expõe Modo clone; a recepção/curadoria de mensagens precisa ser avaliada por endpoint e branch, não só pelo nome da tela | **Parcial; backend integrado não comprovado apenas pela UI de main.** Validar origem autorizada, parsing, dedupe persistente, aprovação e isolamento de canais |
| WhatsApp / Telegram | Tela de desconectado; nenhuma API | Radar tem área Canais e grupos/conexões; PRs/branches podem conter mudanças ainda não integradas | **Parcial/depende da integração e da branch.** Não alterar o caminho Shopee nem considerar tela como prova de envio |
| Stories / redes sociais | Preview vertical; não gera imagem nem publica | Radar tem Estúdio de IA, Tráfego e redes sociais e Agente Radar Social | **Presente em módulos relacionados; paridade visual não comprovada.** Adaptar revisão/preview usando mídia real já gerada, sem inventar arquivo |
| Bio link / vitrine | Vitrine local sem URL pública | Radar tem Conta, vitrine e planos | **Parcial/presente em estrutura.** Verificar URL pública e métricas reais antes de afirmar paridade |
| Relatórios | Cliques e comissões de exemplo | Radar tem Relatórios e estruturas para métricas | **Presente em estrutura; dados demo não reutilizáveis.** Cobrir origem, intervalo, vazio e ausência de eventos |
| Saúde de integrações | Matriz estática de “não testada” | Radar tem Configurações/Integrações e estado de saúde | **Parcial.** Estado deve vir de verificação real e separar conectividade, autenticação e operação funcional |
| Busca de ofertas | Filtro de texto client-side em três fixtures | Área de ofertas já existe | **Caso de teste reaproveitável.** Testar busca real e estado sem resultados sem inserir produtos fictícios em produção |
| Validação de URL | Aceita somente HTTP/HTTPS antes de gerar rascunho | Contratos e adaptadores de links existem no Radar | **Requisito a cobrir.** Testar protocolos proibidos, URL malformada e domínios autorizados nos módulos apropriados |
| Feedback e acessibilidade | Toast, `aria-live`, `aria-current`, menu móvel com `aria-expanded` | UI do Radar tem renderização própria | **Melhoria de UX/testes.** Verificar teclado, labels, foco, estados de loading/erro e overflow mobile sem substituir o design system |

## Recursos que não devem ser transplantados

- Fixtures como “Fone Bluetooth com estojo”, preços fictícios, relatórios de exemplo e status estáticos.
- Chave `localStorage` `investigationTemplate`, array `state.queued` e `Set` `state.seen` como substitutos de banco de dados, fila ou deduplicação persistente.
- O “agendamento” de demonstração, que não agenda job real.
- O botão de Story, que só exibe toast e não gera arquivo.
- Nomes de provedores ou status de conectividade sem credenciais, permissões e chamada comprovada.
- Servidor estático, dependências e CSS isolados do protótipo como se fossem parte do app.
- Código de referência pública como se fossem APIs privadas ou contratos oficiais do Cupom Radar.

## Plano de integração seguro e critérios de aceite

1. **Modelos de mensagem (prioridade alta):** confirmar se há migration/API correspondente em branches revisáveis; caso contrário, desenhar a implementação em cima do modelo de conta/loja já usado pelo Radar. Exigir CRUD autenticado, escopo por conta, validação de placeholders, preview, testes de isolamento e migração reversível.
2. **Testes de criação de postagem:** portar cenários de URL inválida, rascunho, preview e navegação; fixtures só em testes; nenhuma chamada externa.
3. **Fila/Lista/Agendamento:** confirmar transições e persistência reais, cancelar/remover com autorização, timezone, idempotência e retry; cron testado em ambiente de teste.
4. **Modo clone:** comprovar fluxo desde origem autorizada até item pendente de revisão; deduplicação persistente e idempotente; nenhum envio automático durante QA.
5. **Stories, vitrine e relatórios:** reaproveitar somente layout/estados de UX, conectando-os às APIs e dados existentes; origem e período visíveis nas métricas.
6. **Saúde de integração:** estados baseados em eventos reais e sanitizados; nunca inferir sucesso de publicação a partir de HTTP 200/handshake.
7. **Regressão:** build, testes unitários, E2E desktop/mobile, auditoria de dependências e testes de segurança; revisar especialmente Shopee, Telegram, Mercado Livre/Lomadee, cron e publicação agendada.

## Estado de branches e limites desta auditoria

- `main` verificado em `fc3d559d2a1cddd451b897d718d5238dee3a7f0e`.
- O protótipo permanece em `codex/cupom-radar-prototype`, commit `1b34c25e5c874b5fd96fd6ef6e572b7f085a07c7`, e está **6 commits atrás e 2 à frente** de `main`; os dois commits à frente são documentação/artefatos de investigação, não evidência de paridade com produção.
- PR #94 continua aberto contra `main`. PR #99 é draft empilhada sobre PR #94 e está divergente de `main`; não usar sua CI como prova de que esta branch isolada foi testada.
- Esta branch de auditoria parte de `main`; não altera a branch do protótipo nem PR #94/#99.
- Não foi feito merge, deploy Hatchable, alteração de credenciais, publicação de oferta, envio de mensagem ou execução de workflow de produção.
- A auditoria do código demonstra a implementação da **demo**; ela não prova que as mesmas capacidades funcionem no Radar. O relatório não declara integração concluída sem testes reais.
