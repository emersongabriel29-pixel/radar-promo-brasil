# Radar Promo — inventário e proposta de navegação antes do redesign

**Status:** documentação prévia; nenhuma alteração visual ou funcional foi aplicada nesta etapa.  
**Estado de referência:** Hatchable v318; branch `codex/radar-video-ia-runway-20261018`, commit `0bd741c`.  
**Objetivo registrado:** separar Ofertas, IA, Redes e Publicações, criar uma identidade visual profissional perceptível e preservar integralmente telas, operações, integrações, configurações e rotas.

## 1. Resposta à auditoria anterior

A v318 agrupou os sete destinos principais em três cabeçalhos (`Operação`, `Análise`, `Gestão`) e alterou de forma pontual a cor do estado ativo e o destaque dos ícones. Não houve redesign integral do layout, novo sistema visual aplicado à experiência inteira, nem separação interna dos cinco itens de `Ofertas`. O cabeçalho e as ações continuam com a mesma estrutura; portanto, é correto dizer que a aparência geral ficou muito parecida com a anterior. Esta etapa registra a diferença entre o escopo entregue e a identidade visual mais forte solicitada agora.

## 2. Mapa atual, observado no código

A navegação é gerada por `NAV`, `GROUPS`, `groupPage()`, `switchGroup()` e `show()` em `public/radar.js`. O clique em `Ofertas` abre cinco abas planas dentro da mesma faixa. Os rótulos de grupo Operação/Análise/Gestão classificam apenas os sete destinos superiores; não classificam as cinco áreas internas de Ofertas.

| Área visível | Conteúdo atual | Ações e comportamento documentados |
|---|---|---|
| Central | Painel de operação | Indicadores, saúde/prontidão, atividade e atalhos para oferta e monitoramento. |
| Radar | Monitoramento 24h; Modo clone; Criação rápida | Configurar/executar fontes, analisar mensagem/link, revisar dados e preparar oferta. O Modo Copiador tem etapa manual de revisão. |
| Ofertas | Ofertas e cupons; Curador de ofertas; Estúdio de IA; Tráfego e redes sociais; Agente Radar Social | As cinco abas são atualmente irmãs no mesmo grupo. Detalhamento abaixo. |
| Publicações | Filas e agendamento | Preparar, agendar e acompanhar publicações, recorrências, estado e confirmação por conector. |
| Canais | Grupos e canais; Gestão de leads | Cadastrar e consultar destinos, plataformas, categorias, capacidade/consentimento e leads. |
| Relatórios | Relatórios | Desempenho e eventos efetivamente disponíveis. |
| Configurações | Segurança e LGPD; Integrações; Conta, vitrine e planos | Segurança, credenciais/conexões, consentimento, saúde, conta, vitrine, portabilidade e operações relacionadas. |

### 2.1 Inventário das abas que hoje ficam misturadas em Ofertas

| Aba atual | Responsabilidade real | Ações/integrações existentes | Categoria indicada para a nova organização |
|---|---|---|---|
| Ofertas e cupons | Cadastro, revisão e gestão do catálogo da conta; modelos de mensagens | Abrir/editar oferta, preço, cupom, imagem, link oficial, estado e exemplos de mensagem; dados em `/api/data` | **Ofertas** |
| Curador de ofertas | Avaliação de ofertas aprovadas por regras, pontuação e análise opcional de IA | `runCurator()` em `/api/radar/autopilot`; `runAiCurator()` em `/api/radar/curator-ai`; a primeira avaliação é baseada em regras e score, a segunda usa IA; não aprova/publica | **Ofertas**, com sinal explícito “regras + IA” no item, evitando esconder a ferramenta de quem trabalha no catálogo |
| Estúdio de IA | Criar texto promocional, cupons, legendas, posts, anúncios, roteiro, carrossel, imagem e vídeo | `/api/ai/studio`, `/api/ai/image`, `/api/ai/promo`, mídia/jobs; modelos Gemini/OpenAI/Claude e Runway conforme configuração; fila de mídia e artefatos | **IA** |
| Tráfego e redes sociais | Campanhas/UTM/orçamento, cupons de campanha e conexões IG/FB/e-mail | `/api/growth`; criar campanha/cupom, configurar OAuth/conexões, testar e-mail; não equivale à fila de posts sociais | **Redes e campanhas** |
| Agente Radar Social | Configurar posts sociais, revisão humana, fila/ritmo e agente especialista | `/api/social/autopilot`, `/api/agents/social-media.js`, geração de fila e legenda, aprovação/execução; conexão Meta é separada; mantém aprovação obrigatória por padrão | **Redes e campanhas**, agrupado com os fluxos de publicação social; sinalizar IA no título/descrição do agente |

### 2.2 Ações do cabeçalho que parecem parte de Ofertas

- **`Conexões`:** hoje fica no cabeçalho de todas as áreas e leva a `show('integrations')`. É um atalho global para Integrações. Não é submenu de Ofertas e não deve desaparecer; no redesign, manter o acesso global ou torná-lo contextual sem aumentar passos para configurar conexões.
- **`+ Nova oferta`:** hoje fica no cabeçalho de todas as áreas e chama `openOffer()`. Também há ação equivalente dentro da tela Ofertas. É um atalho global redundante; preservar o mesmo handler, modal, validações e disponibilidade. A proposta visual pode torná-lo contextual e manter um ponto de criação claro dentro de Ofertas.

## 3. Destino de navegação proposto para revisão

A proposta separa os conteúdos pela tarefa do usuário e não pela implementação interna:

- **Ofertas:** Ofertas e cupons; Curador de ofertas (com indicação de análise por regras e opção com IA).
- **IA:** Estúdio de IA; adicionar um acesso claro ao Radar Vídeo IA existente (`/radar-video-ia`), que hoje é uma página/rota própria e não aparece como uma das cinco abas de Ofertas.
- **Redes e campanhas:** Tráfego e redes sociais; Agente Radar Social.
- **Publicações:** manter “Filas e agendamento” na área principal Publicações; apresentar relação/atalho para fila social sem fundir filas diferentes nem alterar os conectores.
- **Conexões:** continuar global no cabeçalho e manter também o destino em Configurações > Integrações.
- **Nova oferta:** manter o caminho funcional `openOffer()` e a ação visível dentro do contexto Ofertas; decidir no protótipo se o atalho global do cabeçalho fica persistente ou contextual. Esta escolha visual não autoriza remover o fluxo/modal existente.

A classificação de Curador fica em Ofertas porque sua entrada, métricas e resultados são centrados no catálogo e inclui dois modos diferentes (regras e IA); a interface deve declarar esses modos para não induzir que toda análise use modelo generativo. O Agente Radar Social fica em Redes porque suas ações gerenciam perfil, calendário, pacote de publicação, conexão, aprovação e fila social; o uso de IA aparece como característica e continua preservado.

## 4. Inventário visual e crítica documentada

### Identidade existente

- Marca/título: Radar Promo Brasil.
- Base cromática: azul e navy; azul de ação próximo a `#235fce`, navy `#152b40`, superfícies claras `#f4f6f8`, verde para sucesso e acentos suaves.
- Tipografia declarada: Manrope para interface e DM Mono para dados/identificadores.
- Componentes presentes: lateral escura, cabeçalho branco, cartões claros, botões, tabelas, abas horizontais, modal, toasts e navegação móvel com drawer.
- Requisitos existentes: skip link, foco visível, navegação por teclado, `aria-current`, foco/fechamento do drawer, responsividade, axe e `prefers-reduced-motion`.

### Por que a v318 pode parecer igual

- Os mesmos sete botões, cabeçalho, grade, cartões, hierarquia, dimensões e superfícies principais foram mantidos.
- O CSS novo da v318 limita-se a títulos dos grupos e estados ativos da navegação.
- A tela interna de Ofertas continua uma faixa horizontal com cinco abas planas; falta separação visual e semântica entre catálogo, IA e marketing/publicação social.
- “Conexões” e “+ Nova oferta” seguem sempre juntos no cabeçalho, mesmo em contextos onde apenas um é relevante.
- O nome “Tráfego, cupons e redes sociais” mistura três conceitos; a seção inclui campanhas, cupons de campanha e conexões de canais. A proposta deve separar rótulos e blocos sem duplicar/remover operações.

### Direção visual a especificar antes de codificar

Aplicar uma linguagem profissional consistente com o azul do Radar Promo, mas com hierarquia mais evidente: seções nomeadas por objetivo; ícones consistentes; cartões e estados com contraste acessível; títulos e subtítulos que expliquem a tarefa; ações principais contextuais; navegação móvel legível. A escolha de cores por categoria deve ser secundária ao azul principal e nunca ser a única forma de comunicar estado. A especificação visual final (tokens, layout, componentes e breakpoints) precisa ser registrada e validada antes de editar os arquivos de interface.

## 5. Registro funcional e contratos que não podem mudar

- Preservar todos os ids de rota/aba atuais, hashes, `data-action`, `NAV`, `GROUPS`, modais e handlers, salvo migração documentada com aliases que mantenham links antigos válidos.
- Preservar os cinco destinos atuais dentro de Ofertas em alguma localização nova; acrescentar o Radar Vídeo IA sem substituir o Estúdio ou o fluxo social.
- Preservar as ações globais `show('integrations')` e `openOffer()` e toda a semântica de criação/revisão.
- Preservar chamadas, permissões e payloads das rotas de catálogo, curadoria, IA, mídia, campanhas, redes sociais e publicações; não renomear tabelas, migrações, jobs, segredos ou configuração.
- Preservar conexão por conta e `account_id`, dados isolados, credenciais secretas, padrões de aprovação humana, limites e estados de entrega incerta.
- Preservar links diretos (`#offers`, `#studio`, `#growth`, `#socialagent`, `#queues`, etc.) com a seleção visual correta após qualquer reorganização.
- Não tornar ativos novos destinos sociais, publicação automática ou chamadas pagas por efeito da reorganização.

## 6. Matriz de regressão obrigatória antes e depois do redesign

| Grupo de verificação | Comportamento a documentar/provar antes e revalidar depois |
|---|---|
| Navegação | Todos os 7 destinos e 14 subitens atuais; cada botão aciona a tela certa, deep link restaura seleção, histórico e hash funcionam. |
| Ações do cabeçalho | Conexões abre Integrações; Nova oferta abre o mesmo formulário/modal com os mesmos campos e validações. |
| Catálogo | Criar, revisar, editar, aprovar/reprovar, filtrar e abrir oferta; imagens, preço, cupom, links e modelos permanecem. |
| Curadoria | Rodar score/regras e curadoria de IA em separado; nenhum modo aprova ou publica implicitamente. |
| IA/mídia | Texto, imagem e vídeo, seleção explícita de modelo, credenciais/custos, armazenamento, fila, erro, retry e estado do trabalho. |
| Campanhas e cupons | Criar/editar campanha e cupom, UTM, dados de canal e conexão; ações de e-mail continuam acessíveis. |
| Redes sociais | Configurar Meta, selecionar oferta/arte, gerar legenda/rascunho, revisão, aprovação, fila e status; nenhum envio real em teste de layout. |
| Publicações | Filas, recorrências, horários, limites, escolha de destino, estados, idempotência e prova oficial continuam. |
| Configurações e segurança | Todas as integrações, credenciais, segredos, conta, vitrine, LGPD, exportação, backup, consentimento e health checks continuam. |
| Acessibilidade/responsividade | Mouse/teclado, foco, leitor de tela, axe, 375/768/880/1024/1440 px, zoom e safe-area; menu não cobre conteúdo nem ação principal. |
| Não regressão de dados | Comparar diff de interface versus API/DB/config; validar ausência de mudança em payloads, jobs, esquema, permissões e integrações. |

## 7. Estado da auditoria e gate de mudança

A auditoria anterior não é uma auditoria completa de cada fluxo do produto. A v318 cobriu a organização visual dos sete destinos principais, os submenus exercitados por E2E e a revisão manual do Copiador; não concluiu uma inspeção manual autenticada de cada função, serviço e integração externa. A conta de produção continua `SETUP_REQUIRED`, com 0 ofertas aprovadas, 0 destinos utilizáveis e 0 filas ativas, sem conexão Meta ativa nem credencial Runway. Portanto, testes de entrega real permanecem impossíveis sem configuração, e a prontidão não deve ser declarada 100%.
### Matriz de auditorias — cobertura real até v318

| Auditoria | Estado | Evidência / o que falta |
|---|---|---|
| Inventário de funcionalidades e APIs | **Documentado, estático** | O inventário técnico e este mapa cobrem os domínios, telas, rotas e invariantes identificados no repositório/produção. Ainda requer validação manual de cada ação autenticada. |
| Design, identidade e navegação | **Parcial; precisa refazer** | v318 só agrupou os sete destinos e deu destaque aos grupos/estado ativo. Não é redesign completo. Este documento registra a crítica e a nova IA a validar antes de implementar. |
| Regressão de navegação/responsividade/acessibilidade | **Automatizada e aprovada** | 3 E2E, sete áreas, submenus, modo móvel, breakpoints e axe. Não substitui avaliação visual autenticada em todas as páginas nem teste manual em leitor de tela real. |
| Catálogo e fluxo de ofertas | **Parcial** | Suite E2E cobre criação/revisão simulada; prontidão real encontrou 0 ofertas aprovadas. Não houve transação/publicação real. |
| Curadoria determinística e por IA | **Inspecionada no código; execução real incompleta** | Rotas e separação entre regras e IA mapeadas; falta executar em conta autenticada com ofertas reais e verificar saída/credenciais sem publicar. |
| Estúdio de IA e provedores | **Parcial** | UI/rotas/modelos inventariados. Não foram exercitados Gemini/OpenAI/Claude/Runway com credenciais reais; Runway não tem chave e chamadas pagas não foram iniciadas. |
| Redes sociais, Meta e agente social | **Parcial** | Código, fila e aprovação revistos; endpoint de estado retornou `PAUSED`, revisão obrigatória e nenhuma conexão. Falta OAuth, oferta aprovada e publicação de teste consentida. |
| Publicações, filas e agendamento | **Parcial** | Contratos e readiness mapeados; zero fila/destino e nenhum comprovante recente. Não foi possível comprovar entrega real. |
| Integrações com marketplaces/mensageria | **Parcial** | Endpoints e arquivos inventariados, mas não houve teste autenticado completo de cada conector. Credenciais e permissões específicas ainda faltam ou precisam de validação individual. |
| Segurança, LGPD, sessão e isolamento de conta | **Revisão estática/parcial** | Regras e rotas foram catalogadas; gate público retornou 401. Não houve pentest, teste multi-conta sistemático ou execução autenticada de todas as operações de exportação/backup/retensão. |
| Relatórios, analytics e consistência dos dados | **Inventariado; teste funcional completo pendente** | Rotas e superfícies identificadas; falta validar casos com eventos reais e comparar resultados com fontes dos provedores. |
| Release e dependências | **Aprovada para o branch verificado** | Build, 110 testes, 3 E2E e `npm audit` passaram. Isso não significa que credenciais, publicação ou todos os serviços externos estejam operacionais. |


A documentação atual [RADAR-FUNCTIONAL-INVENTORY.md](RADAR-FUNCTIONAL-INVENTORY.md) registra inventário técnico de páginas, domínios, endpoints e invariantes. Este arquivo completa o mapa específico de menu, conteúdo, ações globais, crítica visual, proposta de separação e critérios de aceitação do redesign.

**Gate:** este documento não altera aplicação, CSS, menu nem comportamento. O passo de implementação só começa depois de registrar um protótipo/especificação visual final e executar comparação explícita de toda a matriz acima. A mudança será considerada aditiva: nenhum item listado poderá desaparecer; correções encontradas durante a auditoria serão feitas e revalidadas.