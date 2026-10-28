# Integrações de afiliados com custo adicional zero

Este documento define a estratégia para adicionar provedores ao Radar Promo Brasil sem contratar SaaS ou API comercial.

## Estado da avaliação

| Plataforma | Candidato | Licença/condição | Decisão |
| --- | --- | --- | --- |
| Mercado Livre | [Afilimax/mercado-livre-provider](https://github.com/Afilimax/mercado-livre-provider) | MIT; depende de sessão autenticada e cookies | Elegível para integração experimental, após revisão e teste |
| SHEIN | [davisinfroy/shein-affiliate-api](https://github.com/davisinfroy/shein-affiliate-api) | README descreve Playwright e cookie de sessão; não foi encontrada licença explícita | Não incorporar até esclarecer licença e validar o programa brasileiro |
| Temu | [Busca por geradores no GitHub](https://github.com/search?q=temu+affiliate+link+generator&type=repositories) | Nenhum gerador gratuito com licença permissiva e compatibilidade brasileira foi confirmado | Não incorporar; usar ferramenta oficial disponível na conta até nova validação |

## Regras de implementação

1. Nunca criar um link de afiliado acrescentando parâmetros arbitrários e presumindo que gera comissão.
2. Não guardar cookies, tokens nem segredos em código, no frontend ou no Git.
3. Credenciais devem ficar em variáveis de ambiente/cofre do servidor e ser criptografadas quando persistidas.
4. Não publicar links convertidos até validar o domínio de destino, o produto e o identificador de afiliado.
5. Se a conversão falhar, expirar a sessão ou retornar um resultado ambíguo, manter a oferta pendente para revisão; não substituir silenciosamente pelo link comum.
6. Manter deduplicação e as validações existentes do Radar. Não criar limite diário arbitrário; respeitar apenas limites reais da plataforma, hospedagem e credenciais.
7. O custo adicional de software pode ser zero, mas servidor, tráfego e eventuais serviços externos continuam sujeitos às condições atuais.

## Plano para Mercado Livre

O candidato Afilimax é uma biblioteca Node.js com licença MIT que recebe a tag e cookies de sessão para solicitar um link curto de afiliado. Antes de ativá-la em produção, implementar e validar:

- carregamento seguro da credencial no backend;
- conversão de URL de produto brasileira (mercadolivre.com.br / meli.la);
- rejeição de URLs de outros domínios e de respostas sem link válido;
- teste com link de afiliado gerado na conta do Radar;
- tratamento de expiração de sessão e erros sem publicar link não confirmado;
- testes automatizados sem credenciais reais.

Referências:
- https://github.com/Afilimax/mercado-livre-provider
- https://github.com/Afilimax/afilimax-cli

## Critério de aceite

A integração só pode ser marcada como concluída após executar testes com credenciais fornecidas pelo proprietário da conta e confirmar que o link resultante abre o produto correto e mantém o rastreamento de afiliado. A documentação e os testes em ambiente simulado, por si sós, não comprovam conversão real nem comissão.
