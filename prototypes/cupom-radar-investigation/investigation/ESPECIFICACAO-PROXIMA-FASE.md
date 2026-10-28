# Especificação técnica para a próxima fase

Esta especificação é independente da implementação do Radar Promo Brasil; nenhuma mudança foi feita nele nesta investigação.

## Objetivo

Transformar fluxos observados e validados em capacidades próprias, mediante autorização e integração com o repositório-alvo em uma fase posterior. O sistema de referência fornece requisitos de produto observáveis, não código ou contratos privados.

## Contratos mínimos propostos

### Produto importado

`ProductDraft`: origem declarada, URL original, título, imagem opcional, moeda, preço atual e anterior opcionais, cupom opcional, timestamp de coleta e metadados de proveniência. Todos os campos externos precisam de validação; preço deve carregar fonte e momento da verificação.

### Link afiliado

Adaptador por provedor, com capacidades explícitas (`resolve`, `convert`, `validate` quando a API oficial suportar), classificação de erro (credencial, permissão, limite, indisponibilidade, entrada inválida) e nunca registrar token. Não usar cookies de sessão de navegador ou endpoints internos.

### Curadoria

Resultado estruturado com estado `candidate | approved | rejected`, motivos, chave idempotente, proveniência e horário. Deduplicação persistida por produto/origem/destino com restrição única e operação idempotente; permitir revisão humana antes de publicar.

### Publicação/agendamento

Rascunho de publicação contém conteúdo, mídia, destino, canal, horário UTC, estado e chave idempotente. Adaptadores externos só habilitam publicação quando credenciais/configuração e autorização explícitas existirem. Testes devem usar mocks ou destinos de sandbox; produção não é ambiente de QA.

### Saúde de integração

Registrar eventos de verificação reais: conectividade, autenticação e operação funcional separadas; timestamp, duração, contagem amostral, código categorizado e mensagem sanitizada. Não inventar taxa de sucesso sem eventos suficientes.

## Sequência de validação

1. Definir ambiente local/homologação e fixtures sem credenciais reais.
2. Validar parser e normalizador com amostras sintéticas de cada loja.
3. Testar idempotência e concorrência de deduplicação no storage selecionado.
4. Testar geração de texto/mídia isolada e aprovação manual.
5. Testar adaptadores com mocks baseados apenas em documentação oficial vigente.
6. Obter credenciais de sandbox/aprovação externas antes de qualquer leitura real.
7. Fazer teste de ponta a ponta sem publicação externa; depois, se autorizado, usar canal de teste separado.

## Critérios de aceite

- Operação repetida com mesma chave não duplica produto/publicação.
- Falhas de API são categorizadas, retentativas têm backoff e não publicam duas vezes.
- Segredos ficam em backend/secret store e não aparecem em logs.
- Estado de cada integração distingue desconectado, conexão, autenticação, operação e erro.
- UI identifica dados sintéticos e não apresenta métricas inventadas.
- Testes de navegador cobrem loading, sucesso, validação, erro e viewport móvel.

## Bloqueios que exigem acesso autorizado

Operações reais de marketplaces/canais exigem aprovação, documentação e credenciais de sandbox ou próprias. Comportamentos internos de dashboard, backend, analytics e regras privadas do Cupom Radar não podem ser confirmados por esta pesquisa pública; devem ser projetados como produto próprio, sem alegar clonagem interna.
