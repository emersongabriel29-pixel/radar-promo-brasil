# Auditoria e plano de integração — Lomadee

Data: 10/10/2026. Projeto: `emersongabriel29-pixel/radar-promo-brasil`.

## Resultado executivo

**Status: integração preparada para cadastro de credencial; ainda não conectada nem homologada.** Esta alteração adiciona Lomadee à lista de provedores de credenciais por conta. Ela não afirma que a chave foi testada, não faz chamadas à Lomadee, não gera links de afiliado e não publica ofertas.

## Auditoria do SDK oficial

Repositório inspecionado: https://github.com/lomadee/lomadee-sdk

- Pacote: `@thelomadee/sdk`, versão `0.2.5` declarada no `package.json`.
- Implementação TypeScript, dependência Axios, build TypeScript e publicação npm.
- A autenticação configurada no cliente é o cabeçalho `x-auth-key`; ambiente padrão `production`, com opção `staging`.
- Domínios/endpoints encontrados no código:
  - Afiliados: listar, consultar, criar cadastro e atualizar perfil.
  - Comissões: listar, consultar, criar, atualizar e excluir registros.
  - Pedidos/transações: listar, consultar, criar, atualizar e excluir registros.
  - Central de conteúdo: listar conteúdos/links/arquivos.
  - Termos: consultar termos e gerenciar aceite.
- **Não encontramos no SDK inspecionado métodos explícitos de catálogo de produtos, busca de ofertas ou geração/conversão de link de afiliado.** O endpoint da Central de Conteúdo pode listar links existentes, mas isso não equivale a uma API de criação de deep links de produto.
- O README do repositório contém apenas o comando de instalação; o código-fonte foi necessário para determinar o escopo acima.

Fontes:
- https://github.com/lomadee/lomadee-sdk
- https://github.com/lomadee/lomadee-sdk/blob/main/package.json
- https://github.com/lomadee/lomadee-sdk/blob/main/src/client.ts
- https://github.com/lomadee/lomadee-sdk/blob/main/src/domains/affiliates.ts
- https://github.com/lomadee/lomadee-sdk/blob/main/src/domains/commissions.ts
- https://github.com/lomadee/lomadee-sdk/blob/main/src/domains/orders.ts
- https://github.com/lomadee/lomadee-sdk/blob/main/src/domains/content-center.ts
- https://github.com/lomadee/lomadee-sdk/blob/main/src/domains/terms.ts

## Compatibilidade com o Radar Promo Brasil

O Radar tem dois ambientes que não devem ser confundidos:

1. **Hatchable hospedado:** usa o SDK/runtime da plataforma e arquivos de `api/`, sem presumir que pacotes npm externos possam ser instalados no runtime.
2. **Standalone Express:** tem `package.json` próprio e pode instalar dependências npm, mas não é o runtime implantado no Hatchable.

Por isso, não foi adicionado `@thelomadee/sdk` às dependências do projeto. Antes de usar o pacote no ambiente hospedado, é preciso confirmar suporte a dependências externas no runtime. Uma implementação HTTP compatível com o contrato oficial pode ser considerada depois de validar os endpoints e as permissões da conta.

A rota `api/integrations/apis.js` agora lista Lomadee como provedor e permite guardar a credencial com o mecanismo existente de criptografia AES-GCM e isolamento por conta. Esse mecanismo **só armazena a chave**; ainda não existe um adaptador Lomadee que a leia e a use para chamar a API.

## Comparação operacional

| Plataforma/caminho | Descoberta de ofertas | Link de afiliado | Situação no Radar |
| --- | --- | --- | --- |
| Lomadee via SDK inspecionado | Não demonstrada pelo SDK | Não demonstrado método de criação; pode listar conteúdo existente | Credencial cadastrável nesta branch; adaptador e homologação pendentes |
| Mercado Livre | O projeto tem conector para anúncios via API autenticada/OAuth; permissões e respostas do provedor podem limitar chamadas | O fluxo atual não deve ser interpretado como geração oficial garantida de links comissionados | OAuth/API de anúncios não equivale à validação de comissão de afiliado |
| Shopee | Não demonstrada por este SDK da Lomadee; depende do acesso/programa utilizado | O projeto corretamente bloqueia inferir afiliação a partir de `sub_id`; usar link oficial gerado no programa autorizado | Importação de link oficial; não ativar conversão fictícia |

A Lomadee divulga marcas e condições do seu programa de afiliados em https://www.lomadee.com.br/pt-br/marcas. A presença de uma marca na lista pública não comprova, sozinha, que o usuário está aprovado para ela, que a API permite obter produtos ou que há geração de links programática.

Referências adicionais:
- https://www.lomadee.com.br/pt-br/marcas
- https://developers.mercadolivre.com.br/pt_br/gerenciar-ofertas
- https://github.com/emersongabriel29-pixel/radar-promo-brasil/blob/main/docs/AUDITORIA-2026-09-30.md
- https://github.com/emersongabriel29-pixel/radar-promo-brasil/blob/main/docs/OPERACAO-2026-10-01.md

## Plano seguro de conclusão

1. Obter credencial oficial da Lomadee e confirmar quais APIs estão habilitadas para a conta.
2. Confirmar documentação/contrato oficial para links de produto, tracking/subID, limites de taxa, paginação, erros e comissões.
3. Implementar adaptador isolado que só leia credenciais do cofre no servidor; nunca enviar a chave ao browser, n8n ou logs.
4. Implementar health check de leitura sem criar/alterar pedidos, comissões ou aceites de termos.
5. Adicionar testes unitários com respostas simuladas: autenticação, timeout, 401/403, rate limit, respostas inválidas e isolamento entre contas.
6. Adicionar a origem Lomadee à descoberta de ofertas apenas se existir endpoint oficial autorizado. Se não houver endpoint de catálogo, permitir importação manual de URLs/links oficiais.
7. Gerar ou importar link e validar redirecionamento e parâmetros de tracking com a ferramenta oficial da Lomadee.
8. Fazer uma publicação de teste apenas em destino privado/autorizado e confirmar recibo real. Não marcar como validado só porque a chave foi salva.
9. Atualizar readiness e documentação para distinguir `CONFIGURED`, `TESTED`, `READY` e `ACTION_REQUIRED`.
10. Rodar `npm run build`, `npm test`, `npm run test:e2e` e `npm audit --audit-level=moderate` no ambiente de desenvolvimento antes de integrar a branch.

## Critérios de aceite

- Nenhuma chamada externa real durante os testes automatizados.
- Nenhuma criação/alteração/exclusão de pedidos, comissões ou aceite de termos como teste de conexão.
- Segredos cifrados, por conta, não retornados pela API de configuração e não incluídos em logs.
- Erros de autenticação e limites de taxa não contornados.
- Nenhuma oferta ou link marcado como afiliado sem evidência de geração/importação oficial.
- Não publicar nem ativar a integração no ambiente de produção até concluir os testes e confirmar permissões oficiais.

## Alteração feita nesta branch

- Adicionado o provedor `LOMADEE` à lista da rota de credenciais de APIs, com link para o SDK oficial.
- Mantidos o isolamento por conta e o armazenamento cifrado já existentes.
- Não foram adicionadas dependências, não foram alterados segredos e não foram enviados anúncios/mensagens.
