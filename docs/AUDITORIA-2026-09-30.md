# Auditoria — Radar Promo Brasil

Data: 30/09/2026 (UTC). Repositório: `emersongabriel29-pixel/radar-promo-brasil`. Base auditada: `4cb9c13a1c5616f3e0566f9eefc61a61c1ffbd4a`. Projeto Hatchable: `proj_1Xj94QxQmCam`, versão inicial 60, visibilidade privada.

## Parecer

A auditoria encontrou defeitos relevantes de execução, isolamento, publicação e interface. As correções deste release foram verificadas por testes de regras, PostgreSQL via PGlite e navegador Chromium. A configuração de serviços externos e a homologação de entrega/comissão ainda condicionam a operação integral. A aprovação técnica deste código não equivale a afirmar que todas as funções comerciais estão 100% operacionais.

## Escopo e método

Revisão das rotas API, páginas, bibliotecas, schema, migrações, adaptador standalone, manifesto de hospedagem, autenticação, dependências, automação, integração e design. Comparação com o projeto publicado, leitura de logs e tarefas agendadas, inspeção de presença de credenciais sem revelar seus valores, testes de acesso e diagnóstico da conta.

O ambiente de teste usa banco em memória e não envia promoções, e-mails ou mensagens a pessoas. Respostas de provedores usadas para testar IA/entrega são simuladas e não constituem homologação real. A análise de código não substitui testes externos de invasão, carga, restauração ou avaliação jurídica.

## Achados e correções

| ID | Prioridade | Problema observado | Correção / evidência |
| --- | --- | --- | --- |
| A01 | Alta | Servidor standalone não iniciava: export `browser` ausente | Adaptador completado e inicialização exercitada pela suíte E2E |
| A02 | Alta | Registro manual de rotas omitia partes do projeto | Descoberta automática de `api/`/`pages/`, métodos e acesso declarados |
| A03 | Alta | Migrações locais reaplicadas, erros ignorados | Histórico por checksum, transação por migração e falha fechada; teste de rollback |
| A04 | Alta | Tokens globais podiam ser utilizados por outra conta | Vínculo único por slot/provider; backfill conservador e teste entre contas |
| A05 | Alta | FKs secundárias não garantiam a mesma conta | Sete relações compostas adicionais e validação; pré-checagem no banco publicado encontrou zero relações divergentes |
| A06 | Alta | Mensagens do autopilot recebiam campos snake_case como camelCase | Normalização compartilhada, preço/link preservados e cobertura de geração |
| A07 | Alta | API e cron usavam regras/limites distintos; concorrência podia exceder o limite | Motor único, lock por conta e INSERT guardado, chave por oferta/destino/dia local; teste concorrente |
| A08 | Alta | Oferta pendente podia entrar no autopilot | Seleção apenas de oferta aprovada, marketplace configurado e destino oficial ativo |
| A09 | Alta | Publicação READY/manual ignorava horários e intervalos | Predicado e claim compartilhados para Telegram/n8n; janela normal/noturna e intervalo por destino |
| A10 | Alta | Retentativa após resposta incerta podia duplicar envios | Estados `WAITING_CONFIRMATION`, receipt oficial e bloqueio de reenvio automático incerto |
| A11 | Alta | Resultado n8n marcava qualquer publicação como entregue | Exige estado de claim, receipt, propriedade e transação de reconciliação |
| A12 | Alta | Webhook com falha ficava permanentemente duplicado; ação inválida consumia chave | Estado recuperável, lease, resposta persistida, validação da ação antes da reserva e lead idempotente |
| A13 | Alta | Preço atual era substituído pelo menor preço histórico | Preço atual separado de mínimo/máximo/média; primeira observação preservada; mensagem da fila atualizada |
| A14 | Alta | Upload armazenava apenas URL assinada com expiração | Chave persistida e URL renovada em leitura/entrega; teste com referência estável |
| A15 | Alta | Valores não finitos podiam chegar ao banco | Conversão BRL/centavos, limites inteiros e validação prévia |
| A16 | Alta | IA recebia offerId de outra conta e fatos dependiam só do prompt | Checagem de propriedade e filtro determinístico, fatos vindos de formulário/DB; teste com resposta inventada |
| A17 | Média | n8n perdia cupom e ignorava preço novo de produto conhecido | Upsert por fingerprint da conta, cupom preservado, histórico idempotente e fila atualizada |
| A18 | Média | Saúde de IA era compartilhada entre contas; cadastro equivalia a homologação | Saúde por conta com timestamp e proof de entrega; readiness explicita seu escopo |
| A19 | Média | Compartilhamento do navegador marcava publicação como entregue | Abertura do compartilhamento não muda para PUBLISHED; backend rejeita confirmação manual falsa |
| A20 | Média | `sub_id` da Shopee era apresentado como conversão de afiliado | Conversão bloqueada; importar link oficial do programa |
| A21 | Média | Timeouts não padrão de fetch eram ignorados no Node | AbortSignal nas chamadas aos provedores; timeout no e-mail |
| A22 | Média | Download de mídia sem limite de memória e redirecionamento não validado | Stream limitado, tipo permitido e validação de URLs em cada redirect |
| A23 | Média | Consentimento textual `false` era interpretado como true | Normalização de booleanos e testes para janela inválida/expirada |
| A24 | Média | Multer 2.3.0 tinha vulnerabilidade moderada no npm audit | Atualização para 2.4.0 e gate de CI na severidade moderada |
| A25 | Média | Formulários sem labels ligados/foco/modal e ações duplicáveis | Labels, diálogo semântico, foco contido, Escape, retorno do foco e estado ocupado |
| A26 | Média | CSS sobreposto escondia/cobria menu em telas menores | CSS consolidado, breakpoint 900px e correção do containing block; E2E em cinco larguras |
| A27 | Média | Texto e botões com contraste insuficiente | Cores corrigidas; axe sem violações WCAG A/AA nos estados testados |
| A28 | Média | Carregamento inicial concorrente criava contas duplicadas e escondia erros parciais | Conta atômica, starter único, inicialização sequencial e aviso visível de falha parcial |
| A29 | Média | Menu com oito áreas contrariava a organização prevista | Sete áreas; IA, conteúdo e tráfego preservados em Ofertas; E2E verifica navegação |
| A30 | Média | Ausência de revisão visual configurada no repositório | UI/UX Pro Max vendorizado, licença/proveniência, AGENTS e instruções Copilot com sistema visual adaptado |

## Evidências de validação

- `npm run build`: verificação de sintaxe de 64 arquivos JavaScript, sem compilação/bundle.
- `npm test`: 40 testes aprovados, incluindo banco real PostgreSQL via PGlite, transações, migrações, isolamento, concorrência, HMAC, credenciais, IA e sessões standalone.
- `npm run test:e2e`: duas jornadas Chromium aprovadas. Sete áreas e abas de conteúdo, modal por teclado, upload/cadastro/aprovação/atualização de oferta, validação negativa, scheduler externo bloqueado e larguras 375/768/880/1024/1440.
- axe-core com WCAG 2 A/AA e 2.1 AA: nenhuma violação nos estados exercitados. Não equivale a certificação completa de todos os estados/dados possíveis.
- `npm audit --audit-level=moderate`: zero vulnerabilidades conhecidas no conjunto instalado, inclusive desenvolvimento, na data da consulta.
- Pesquisa local do UI/UX Pro Max executada. Estilo Data-Dense Dashboard adaptado ao painel existente; recomendações genéricas de landing page não adotadas.
- Banco publicado: sete verificações de relações entre contas retornaram zero divergências antes da nova migração.
- SDK publicado: `scheduler.now`, `scheduler.at` e formato de retorno de `db.transaction` confirmados em execução de leitura.
- Baseline publicado: quatro crons ativos; 168 execuções por cron nos sete dias observados, sem 5xx registrado. Ausência de erro não prova envio ou comissão.

A CI do GitHub também executou todos os checks com sucesso no commit `ebe877d1eabb18c5064bc139b2b8f82e99a6b944` (run 36790998249). A comparação com a versão 60 preservou melhorias que existiam apenas na hospedagem: catálogo ampliado de lojas, teste de promoção com foto no Telegram, marketplaces pendentes após edição e relatório sem falso status de conformidade quando não há dados. Snapshot dos 30 arquivos substituídos em `docs/rollback/hatchable-v60.json`.

Evidências posteriores à implantação são registradas no final deste documento e em `RELEASE.md`.

## Recursos que ainda exigem configuração/homologação

| Área | Situação observada | Critério para considerar operacional |
| --- | --- | --- |
| Telegram | Um bot ativo/token presente em uma conta; outra conta sem bot; zero ofertas/publicações no snapshot inicial | Destino autorizado, oferta real aprovada e confirmação oficial de entrega na conta correta |
| Afiliados | Nenhum marketplace ativo no diagnóstico inicial; links não comprovam comissão | Identificação oficial e compra/relatório de homologação pelo programa escolhido |
| Mercado Livre | App ID, Client Secret e chave de criptografia ausentes na inspeção | Credenciais no cofre, callback registrado, OAuth e consulta autorizada bem-sucedidos |
| WhatsApp/n8n | Segredo principal ausente e nenhuma conexão ativa no diagnóstico | Conector autorizado, HMAC, idempotência, imagem/link, receipt e tratamento de UNKNOWN homologados |
| Meta | Token de Página ausente | Permissões, IDs, token da conta, teste de autorização e publicação autorizada |
| IA | Provedor de texto histórico global; estado agora passa a ser por conta | Nova geração bem-sucedida registrada pela conta; imagem/vídeo testados no provedor habilitado |
| Runway | Chave ausente | Geração, consulta assíncrona e download protegidos testados com a conta oficial |
| Monitoramento/clone | Cadastros existentes; captura automática depende de conector da origem | Executor oficial e origem autorizada. Ativação fica bloqueada até existir executor |
| Recorrência | Planejamento preservado; executor ainda não implementado | Implementar/homologar execução e cancelamento; ativação permanece bloqueada |
| Privacidade | Preferências e solicitações são registradas | Processo de retenção/exportação/exclusão, identidade do solicitante e responsabilidades definidos e exercitados |
| Planos/assinaturas | Estrutura de cadastro, sem checkout/cobrança completa | Provedor de pagamento, webhook, reconciliação e restrição por assinatura implementados se o objetivo for SaaS comercial |
| Backup e recuperação | Migração com rollback testada; restauração da hospedagem não demonstrada | Backup externo e restore em ambiente isolado com RPO/RTO acordados |
| Acesso público | Projeto privado; vitrine/link públicos sujeitos à parede de login | Titular ajusta visibilidade no console quando necessário, mantendo painel/rotas privadas protegidos |
| Capacidade | Sem teste de carga de fornecedores/produção | Teste com volume esperado e limites/custos reais monitorados |

## Riscos residuais delimitados

URLs de entrada rejeitam HTTP, credenciais embutidas, IPs literais e hosts privados reconhecíveis. DNS rebinding/egress exigem proteção da infraestrutura e não foram certificados por esta auditoria. Limites de processo local são em memória e não coordenam múltiplas réplicas; uma implantação standalone em escala precisa de identidade/limites compartilhados e banco apropriado. PGlite standalone pressupõe uma instância operadora privada.

Entrega com receipt só prova aceitação pelo provedor; não comprova leitura, venda ou comissão. Respostas incertas precisam de reconciliação no destino. Os controles de mensagens não são um parecer sobre todas as políticas ou obrigações legais.

O relatório identifica integralmente o escopo revisado e o que foi exercitado. Itens dependentes de contas, autorização, infraestrutura ou funcionalidades ausentes não foram marcados como concluídos por inferência.
