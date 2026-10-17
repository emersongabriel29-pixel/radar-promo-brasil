# Radar Promo Brasil — Paridade funcional com a referência Cupom Radar

## Regras de execução
- Custo adicional zero: não introduzir serviços pagos nem novas dependências pagas.
- Preservar integrações existentes.
- Não publicar ofertas reais durante desenvolvimento/testes sem autorização explícita.
- Não declarar uma função operacional sem teste de ponta a ponta com evidência.
- Usar APIs oficiais; não contornar CAPTCHA, sessão, limites ou controles de acesso.
- Manter mudanças alinhadas entre GitHub e Hatchable. Esta especificação não autoriza commit/push nem deploy de produção.
- UI em pt-BR; manter termos oficiais como Black Friday e OFF.

## Escopo funcional solicitado

### 1. Marketplaces e afiliados
- Shopee, Amazon, Mercado Livre, SHEIN, Magalu e redes disponíveis (Lomadee, Rakuten, Awin, Admitad/AliExpress quando elegíveis).
- Estados separados: não configurada, credenciais inválidas, leitura validada, elegibilidade comercial confirmada, link rastreável comprovado e publicação habilitada.
- Gerar link afiliado somente quando API oficial autorizar e retornar link rastreável.
- Não confundir consulta de catálogo com autorização comercial nem OAuth com escopos concedidos.
- Validar preço atual/anterior, disponibilidade, imagem e URL por fonte oficial; registrar histórico e data.
- Recalcular desconto e bloquear oferta vencida, inconsistente, duplicada ou sem rastreamento.

### 2. Criador de postagem
- Colar URL ou selecionar produto importado; gerar texto, preço, desconto, CTA, link afiliado e imagem original autorizada.
- Modelos personalizáveis por loja, canal e grupo; prévia editável e Link Preview.
- Fallback de texto quando imagem falhar; recorte de imagem somente quando permitido.
- Stories/Status vertical 9:16 com templates de marca; arte gerada apenas para produto/datas especiais conforme regras do projeto.

### 3. Filas, listas e agenda
- Filas por marketplace/categoria e listas com limite configurável, prioridade real, deduplicação por destino e retentativas limitadas.
- Agendamento por horário/dia e modo 24/7 quando habilitado; janelas específicas somente quando configuradas.
- Intervalos/limites por destino, idempotência e dry-run separado de envio real.
- Estados auditáveis: pronta, agendada, enviando, publicada, retentativa, bloqueada e falha.

### 4. WhatsApp e Telegram
- Telegram: validar bot, ID oficial, permissões e entrega em destino de teste.
- WhatsApp: pareamento/conector suportado, validar conexão e grupos; rotação de até cinco números apenas entre conexões validadas, com intervalo e fallback.
- Envio em massa com prévia, confirmação explícita, limite por lote e proteção contra repetição.
- Menção a todos somente se o conector oferecer suporte e o usuário habilitar.
- Respeitar termos, consentimento, privacidade e políticas antispam. Não prometer QR/API não suportados.
- Ping n8n não equivale a prova de entrega de mensagem.

### 5. Modo Copiador / monitoramento
- Fontes e destinos próprios com autorização explícita.
- Monitoramento contínuo só por fonte/API/conector autorizado; registrar última execução e erros.
- Extrair ofertas e converter links por API oficial; falha ou falta de autorização manda para revisão, nunca publica link do concorrente como próprio.
- Deduplicação por fingerprint, auditoria de origem e pausa imediata.
- Não acessar grupos privados de terceiros nem contornar controles da plataforma.

### 6. Grupos, leads e relatórios
- Métricas verificáveis de entrada/saída, membros, ocupação, cliques, publicações, falhas e entregas.
- CPL só quando custos reais e eventos únicos forem registrados; separar estimativas de dados confirmados.
- Hash de identificadores, retenção mínima e controles LGPD.
- Não registrar comissão/venda como confirmada sem relatório oficial do programa.

### 7. Redes sociais e vitrine
- Preparar posts/stories, calendário e aprovação; publicação automática somente após OAuth e permissões oficiais.
- Vitrine pública com configuração, visibilidade e teste de link real.
- Importação Collshp não equivale à publicação da vitrine Radar.

### 8. Conta, planos e cobrança
- Exibir planos/limites como configuração de produto; não cobrar sem provedor de checkout validado.
- Checkout, assinatura, cancelamento e reembolso precisam de provedor real e webhooks idempotentes; nunca simular pagamento aprovado.
- Sem provedor autorizado, cobrança permanece desabilitada e claramente sinalizada.

## Critérios globais de aceite
1. Dry-run sem erros/avisos.
2. Testes unitários/integração: válido, inválido, duplicado, sem autorização e timeout.
3. Evidência do provedor para preço oficial e link rastreável.
4. Teste de envio apenas a destino de teste; sem disparos reais durante desenvolvimento.
5. Isolamento por conta, segredos protegidos e logs sem tokens.
6. Readiness verde apenas com evidência recente de configuração, preço e entrega.
7. Sem commit/push ou deploy de produção sem autorização explícita e verificação da sincronização GitHub/Hatchable.

## Ordem de execução
1. Confiabilidade das integrações; preço oficial e link afiliado.
2. Criador, prévia, modelos e stories.
3. Filas, agenda, prioridade, idempotência e relatórios de entrega.
4. WhatsApp/n8n e rotação com conexões validadas; Telegram verificado separadamente.
5. Modo Copiador apenas com fontes autorizadas e conversão oficial.
6. Relatórios de grupos/leads, redes sociais, vitrine e pagamentos.
7. Suíte integral de aceitação antes de produção.