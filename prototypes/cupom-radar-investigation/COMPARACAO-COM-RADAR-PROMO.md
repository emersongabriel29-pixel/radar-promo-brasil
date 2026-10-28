# O que o Radar Promo pode aproveitar do protótipo

Verificação em 2026-10-28. Comparei o protótipo independente com o código do Radar Promo no worktree local `codex/radar-hardcore-20261027` (base `06b4790898c09c285f8e0d1e840097425273138e`) e com o estado do GitHub `main`. As alterações locais do Radar não fazem parte deste branch do protótipo.

## Comparação por capacidade

| Área | Protótipo | Radar Promo | O que é aproveitável |
| --- | --- | --- | --- |
| Navegação e dashboard | Navegação local; conteúdo demonstrativo | Dashboard e sete áreas de navegação já integrados à aplicação | Ideias de hierarquia e apresentação, respeitando o menu e a identidade azul existentes |
| Gerar postagem | Valida entrada e cria rascunho só no navegador | Formulário de oferta, preview e geração de mensagem já existem; ficam associados à conta | Casos de validação e clareza sobre estado de rascunho |
| Ofertas e cupons | Lista e busca sintéticas | Catálogo, cupons, curadoria e persistência por conta já existem | Estados visuais vazios e exemplos de conteúdo, marcados claramente como demonstração |
| Modelos de mensagem | `localStorage` do navegador, sem isolamento entre usuários | O worktree do Radar contém CRUD persistente, escopo por conta/loja, validação e integração com preview/oferta | A prévia simples de variáveis é referência de UX; o armazenamento local do protótipo não deve ser reutilizado |
| Fila e lista | Alternância visual, sem fila de execução | Filas, recorrências, agendamento e histórico têm APIs e persistência | Testes de navegação entre modos; não reaproveitar o estado em memória |
| Copiador | Marca duplicata apenas durante a sessão | Radar tem análise de mensagem, fingerprint e fluxos de ofertas com deduplicação persistente | Mensagem didática sobre análise manual; não reaproveitar a detecção apenas em memória |
| Canais e integrações | Todos desconectados; sem chamadas externas | Radar possui adaptadores e telas para marketplaces, Telegram, WhatsApp e redes | O rótulo explícito “desconectado” é um bom padrão. A interface do Radar deve continuar baseada no estado real da integração |
| Stories e redes sociais | Preview visual sem geração/envio | Radar já tem estúdio de mídia, agente social e controle de aprovação | Composição visual responsiva e revisão de rascunhos; não reaproveitar as imagens ou os estados sintéticos |
| Bio link e relatórios | Dados e números fictícios | Vitrine pública e relatórios ligados aos dados da conta existem | Organizar os estados vazios e mostrar origem/período das métricas reais |

## Prioridades de reaproveitamento

1. **Padrões de interação**: validação visível no formulário, feedback de rascunho local, textos claros de conexão ausente e navegação acessível em viewport móvel.
2. **Casos de teste**: navegação entre módulos, entrada inválida, estado de duplicata, persistência e layout mobile — adaptados aos contratos reais do Radar.
3. **Apresentação de conteúdo**: cartões e prévias podem inspirar disposição visual, desde que implementados nos componentes e tokens do design system Radar.

## Não reutilizar como implementação funcional

O protótipo não possui backend, autenticação, isolamento por conta, APIs, banco de dados, cron, conversão de afiliados, validação oficial de preços, geração real por IA nem publicação. Seu `localStorage`, os dados sintéticos, os números de relatórios, o marcador de duplicidade em sessão e a alternância Fila/Lista não substituem os módulos operacionais do Radar.

Não encontrei nele uma integração nova que justifique substituir os adaptadores já existentes no Radar. Integrações continuam sendo consideradas disponíveis apenas quando credenciais, permissões e uma chamada oficial forem comprovadas.

## Conclusão

O protótipo agrega principalmente **referências de UX e casos E2E**, não lógica de negócio que falte ao Radar. A função com maior valor demonstrativo, modelos personalizados por loja, já tem uma implementação local mais robusta no worktree do Radar: persistida por conta e validada junto à criação da oferta. Essa implementação permanece fora deste branch isolado e ainda não foi publicada no GitHub `main` ou no Hatchable.
