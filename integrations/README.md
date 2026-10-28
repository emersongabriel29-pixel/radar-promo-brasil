# Integrações externas do Radar Promo Brasil

Este diretório é o ponto de entrada para a modularização gradual das integrações. Não mova arquivos de produção para cá em lote: cada migração precisa ser pequena, reversível e coberta por testes.

## Estrutura prevista

Cada provedor deve ficar isolado em sua própria pasta:

```text
integrations/
  telegram/
    README.md
    adapter.js
    adapter.test.js
  whatsapp/
  amazon/
  mercado-livre/
  shein/
  temu/
  magalu/
  shared/
```

Crie somente as pastas que tiverem implementação real. Não mantenha cópias paralelas da mesma lógica.

## Contrato de cada integração

- Exportar uma interface pequena e documentada; não importar rotas ou arquivos privados de outro provedor.
- Receber dependências (cliente HTTP, relógio, logger e configuração) por parâmetros quando viável, facilitando testes sem chamadas reais.
- Validar e normalizar dados na fronteira; nunca confiar em payload externo.
- Não registrar tokens, segredos, cookies ou URLs que contenham credenciais.
- Preservar a URL de afiliado original, a menos que uma regra de rastreamento explícita e testada exija outra coisa.
- Definir timeouts, limites de tentativas e tratamento de erros; retentativas devem ser idempotentes.
- Nunca publicar automaticamente uma oferta importada sem passar pelas validações e regras de aprovação já existentes.

## Processo seguro de migração

1. Mapear o comportamento atual e as dependências do provedor.
2. Criar testes de caracterização antes de mover código.
3. Extrair uma única integração por PR, mantendo um adaptador de compatibilidade no caminho antigo.
4. Executar build, testes unitários, testes de integração simulados, E2E e auditoria de dependências.
5. Comparar o comportamento antes/depois; não alterar outros provedores no mesmo PR.
6. Remover o caminho antigo somente após confirmar que todas as chamadas foram migradas.

## Regra de proteção

Uma mudança em um provedor não deve editar código de outro provedor. Código compartilhado só deve ser alterado quando necessário e com testes que cubram todos os consumidores. Mudanças de banco, autenticação, filas ou publicação exigem revisão de impacto separada.

## Proteções aplicadas ao fluxo API → oferta → publicação

- Webhook público do Telegram falha fechado se `TELEGRAM_WEBHOOK_SECRET` não estiver configurado com pelo menos 32 caracteres.
- A assinatura é comparada sem interromper a comparação no primeiro caractere divergente; cabeçalhos duplicados e corpos que não sejam objetos são rejeitados.
- Erros internos de banco/provedor não são devolvidos na resposta pública.
- Mensagens recebidas não são publicadas automaticamente: a oferta entra pendente, exige revisão e só pode ser publicada após aprovação e verificação oficial de preço conforme as regras compartilhadas de elegibilidade.
- A importação limita o texto processado, restringe a origem a destinos ativos ou monitores explicitamente autorizados e usa fingerprint por conta para evitar duplicações.
- O job de publicação usa contexto `scheduler`, reivindica a publicação antes de enviar, filtra por conta e mantém entregas incertas em `WAITING_CONFIRMATION` para evitar duplicar mensagens.
- Os segredos do bot são recuperados pelo mecanismo de segredos do projeto; não devem ser colocados no banco em texto puro, nos logs ou em mensagens de erro.
- As proteções precisam ser confirmadas no ambiente publicado, inclusive configuração do segredo do webhook, permissões do scheduler e teste de envio real em canal de homologação.
