# Direção visual — espaço de trabalho de Ofertas

**Status:** especificação pré-implementação; não altera código.  
**Página/área:** `#offers` dentro do painel Radar Promo Brasil.  
**Fonte:** UI Pro Max (buscas `affiliate operations dashboard --design-system` e `navigation submenu hierarchy --domain ux`), adaptada ao produto e ao MASTER existente.

## Decisão de estilo

UI Pro Max recomenda *Minimalism & Swiss Style* para dashboards profissionais: hierarquia tipográfica clara, grid consistente, poucas decorações, foco visível e contraste mínimo 4,5:1. O padrão de landing page Hero/Features/CTA da mesma consulta não é apropriado para a área autenticada; usar uma workspace de gestão de catálogo com navegação lateral interna e painel de conteúdo.

Manter a marca azul do Radar Promo, Manrope/DM Mono e fundo navy já definidos no `MASTER.md`. A paleta sugerida pela busca (azul #2563EB, superfície #FFFFFF, fundo #F8FAFC, texto #1E293B e borda #E2E8F0) é referência compatível, não autorização para substituir tokens existentes. Reservar cores auxiliares aos rótulos das categorias; não usar cor isolada para indicar significado. Verde continua estado de sucesso; estados de atenção/erro mantêm tokens semânticos atuais.

## Estrutura visual proposta

### Navegação da área Ofertas

No desktop, trocar a faixa de cinco abas planas por uma workspace com uma coluna interna de categorias e uma área de conteúdo:

| Categoria | Destinos existentes a preservar | Contexto mostrado |
|---|---|---|
| **Ofertas** | Ofertas e cupons; Curador de ofertas | Catálogo, revisão, preços/cupom/link; curadoria determinística e análise opcional com IA claramente diferenciadas. |
| **IA** | Estúdio de IA; novo atalho para Radar Vídeo IA existente | Texto, arte, vídeo, fila de mídia, escolha explícita de provedor e custos. Roteiros locais e opções externas permanecem distintas. |
| **Redes e campanhas** | Tráfego e redes sociais; Agente Radar Social | Campanhas, UTM, cupons de campanha, conexões Meta/e-mail, perfil/calendário/postagens, aprovação e fila social. |

A seleção de categoria realça seus itens e a área de conteúdo; os destinos atuais permanecem endereçáveis (`#offers`, `#curator`, `#studio`, `#growth`, `#socialagent`). O atalho do Radar Vídeo IA aponta para a rota existente `/radar-video-ia`; não duplica nem substitui o Estúdio.

### Consistência do Radar Vídeo IA

A rota `pages/radar-video-ia.js` usa hoje tema próprio escuro (`#0c1422`), acento verde-menta (`#5ee0b5`) e fonte `system-ui`, sem um link de retorno ao painel. Isso contrasta com a identidade azul/navy, Manrope/DM Mono e superfície clara do restante do Radar Promo. Ao expor a ferramenta dentro da categoria IA, alinhar sua camada visual a esses tokens e incluir navegação de retorno para Ofertas, mantendo todos os controles, avisos de custo, canvas, download local e chamadas de API exatamente funcionais.
### Outras superfícies e atalhos

- Preservar os sete destinos principais (Central, Radar, Ofertas, Publicações, Canais, Relatórios, Configurações) e todos os respectivos subitens.
- Publicações/Filas e agendamento permanece uma área principal separada. A fila social continua no Agente Radar Social; adicionar ligação contextual quando útil sem juntar os jobs ou alterar seus estados.
- `Conexões` continua abrindo Integrações e acessível globalmente. `+ Nova oferta` continua usando `openOffer()`; sua posição pode ser contextual, mas o atalho não será removido.
- Logo, nome, menu móvel, cabeçalho, breadcrumbs/hierarquia, skip link, modal, toast, navegação por hash e retorno do histórico devem manter funcionamento.

## Regras de layout e interação

- Desktop (>900px): lateral principal existente + navegação interna de categorias de aproximadamente 220–260px + painel fluido; manter área de conteúdo de leitura ampla e evitar terceira navegação horizontal.
- Tablet/mobile (<=900px): converter categorias em seletor horizontal com alvos de pelo menos 44px ou lista compacta acessível; não adicionar drawer aninhado nem ocultar a navegação atual. Safe-area e padding inferior permanecem.
- Dentro de cada categoria, usar itens de submenu como linhas/cartões de navegação com título, descrição breve e estado; não renderizar cinco abas visualmente idênticas.
- Cabeçalho da página descreve categoria e tarefa; ação principal fica próxima do conteúdo que usa.
- Manter estados vazios, carregamento, erro parcial, feedback, labels, foco, `aria-current`, Escape, deep links e `prefers-reduced-motion`.
- Ícones SVG consistentes; emoji só pode continuar como conteúdo/modelo promocional.
- Sombras discretas, bordas claras e espaçamento consistente; sem gradientes decorativos em excesso nem identidade multicolorida que concorra com o azul.

## Critérios de aceite do redesign

- Um usuário consegue distinguir em poucos segundos catálogo, criação por IA e redes/campanhas sem abrir abas erradas.
- Os cinco destinos atuais continuam visíveis e um novo acesso ao Radar Vídeo IA leva à rota existente; sua interface usa a mesma identidade visual e oferece retorno ao painel.
- Os sete destinos principais e os 14 subitens permanecem acessíveis; nenhum id, handler, API, payload, estado, integração, configuração, job, permissão ou dado muda por causa do layout.
- Conexões e Nova oferta continuam disponíveis; links antigos e hash profundo restauram a categoria/tela correta.
- Axe sem violações nas vistas; contraste WCAG AA; foco visível e não encoberto; E2E em 375/768/880/1024/1440px sem rolagem horizontal.
- Verificação lado a lado das capturas antes/depois confirma mudança de hierarquia e composição, não apenas alteração de cor.
- Nenhum envio externo, publicação ou chamada paga é acionada por testes de layout.

## Rastreabilidade da busca UI Pro Max

A busca de sistema de design retornou estilo Minimalism & Swiss Style, apropriado para ferramentas profissionais; paleta azul/branco/cinza de contraste alto e tipografia Fira Sans/Fira Code. O MASTER do projeto mantém Manrope/DM Mono por continuidade de marca. A busca de navegação retornou uso de hierarquia semântica, navegação previsível e cuidado para que elementos fixos não encubram o conteúdo. A recomendação de landing page não foi aplicada porque o produto é uma workspace autenticada.