# Inventário funcional e paridade observável

Legenda de evidência: **OD** observado diretamente; **RP** reproduzido no protótipo; **TF** testado funcionalmente; **I** inferido; **B** bloqueado por autenticação ou falta de evidência. “Observado” significa presença em página/FAQ/HTML, não integração validada.

| Módulo | Evidência e classificação | Protótipo/teste | Limite |
|---|---|---|---|
| Dashboard e navegação | OD: captura HTML autenticada antiga; B: rota atual `/dashboard` redireciona a `/login` | RP+TF: dashboard sintético, navegação | Não comprova dados ou ações do painel real |
| Gerar postagem | OD: CTA pública e FAQ sobre criar postagem; captura HTML aponta rota | RP+TF: formulário local valida URL e salva rascunho | Sem API real, enriquecimento ou publicação |
| Produtos e ofertas | OD parcial: FAQ e nomes de módulos; I: catálogo/importação | RP+TF: lista de itens fictícios e busca local | Sem catálogo ou preço real |
| Marketplaces Shopee/Amazon/ML/Magalu/SHEIN | OD: homepage divulga suporte e FAQ aborda API Shopee | RP: cartões informativos sem estado conectado | Credenciais, aprovação e operações reais não verificadas |
| Link de afiliado | OD: mensagens de marketing e FAQ; I: conversão do produto | RP: link fica local e não é convertido | Nenhuma API/conta afiliada conectada |
| Cupons e modelos | OD parcial em marketing/FAQ e captura | RP+TF: modelo editável, persistência local e preview | Regras/validade não conectadas a fonte externa |
| Curadoria e deduplicação | OD: marketing descreve copiador e FAQ descreve modos; I: regra exata | RP+TF: parser manual e marca duplicata na sessão | Sem monitoramento de grupos, storage remoto ou afiliado |
| Modo Copiador | OD: homepage e rótulos do dashboard | RP+TF: entrada de texto e detecção local | Não lê mensagens nem publica |
| Modos Fila e Lista | OD: FAQ e dashboard capturado | RP+TF: alternância e itens locais | Sem fila de servidor ou agendamento real |
| Agendamento | OD: homepage fala em programar/publicar | RP: intenção local ilustrativa | Não executa tarefa em background |
| WhatsApp e Telegram | OD: FAQ de conexão/canais e marketing menciona WhatsApp | RP+TF: cartões desconectados, sem envio | Nenhuma credencial, QR, envio ou integração testada |
| Redes sociais | OD parcial: marketing mostra formatos e canais; B para publicar autenticado | RP: formatos de conteúdo | APIs/permissões não verificadas |
| Imagens e Stories | OD: marketing menciona Stories 9:16 e mídia; I para pipeline | RP: preview CSS 9:16 | Nenhuma geração real de imagem executada |
| Bio link/vitrine | OD: módulo no dashboard e URL pública de produto | RP: preview demonstrativo | Não há persistência pública nem publicação |
| Relatórios/comissões/analytics | OD: FAQ tem artigos e dashboard tem links | RP: números sintéticos rotulados | Não representam dados reais nem comissão |
| Configuração/monitoramento | OD: FAQ e menu capturado | RP: status de integração “não conectado” | Sem health check de API externa |

Os testes de navegador do protótipo passaram: cinco testes em `npm test`. Os fluxos do site de referência foram observados apenas nas páginas públicas e FAQ; painel autenticado permanece bloqueado sem conta e não foi contornado.
