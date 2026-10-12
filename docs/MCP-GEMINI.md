# MCP local do Radar Promo Brasil

Este servidor expõe ferramentas de IA via Model Context Protocol (MCP), usando a chave Gemini já suportada pelo projeto. Ele não usa OpenAI API nem Anthropic API e não publica ofertas, envia mensagens ou altera o banco.

## Ferramentas disponíveis

- `categorize_product`: escolhe uma categoria apenas entre as categorias fornecidas.
- `generate_promo_text`: gera texto para WhatsApp, Telegram ou uso geral a partir de fatos verificados.

As ferramentas são somente de geração de conteúdo. O texto resultante deve continuar passando pela validação e aprovação existentes antes de ser enfileirado ou publicado.

## Requisitos e execução local

Requer Node.js 22+, dependências instaladas e uma chave Gemini permitida para uso na API.

PowerShell:
```powershell
$env:GEMINI_API_KEY="SUA_CHAVE_GEMINI"
$env:GEMINI_TEXT_MODEL="gemini-2.5-flash"
npm run mcp
```

Linux/macOS:
```bash
GEMINI_API_KEY="SUA_CHAVE_GEMINI" GEMINI_TEXT_MODEL="gemini-2.5-flash" npm run mcp
```

A chave deve ficar apenas no ambiente local/gerenciador de segredos; nunca a grave no Git, no prompt de uma ferramenta ou em arquivos públicos. Sem chave, o servidor responde com erro legível e não tenta outro provedor.

## Cliente MCP por stdio

Configure um cliente MCP local para iniciar o processo no diretório do projeto com comando `node` e argumento `mcp/server.js`. Passe `GEMINI_API_KEY` e, opcionalmente, `GEMINI_TEXT_MODEL` no ambiente do processo. O transporte usa JSON-RPC por stdin/stdout; logs não devem ser escritos em stdout.

## Limitações importantes

- Este é um servidor MCP local por stdio. Um cliente hospedado na nuvem, incluindo uma aplicação que use a OpenAI Responses API com MCP remoto, não consegue acessar o processo local diretamente.
- Para a OpenAI Responses API, seria necessário hospedar um endpoint MCP remoto com HTTPS, autenticação, controle de acesso e limites de uso. Isso não é criado por este servidor local e não deve ser exposto publicamente sem esses controles.
- MCP é o protocolo de ferramentas, não um modelo de IA nem uma forma de contornar cobrança de tokens. Este servidor usa Gemini e está sujeito aos limites e termos da conta Google.
- Não há execução de ferramentas de publicação, compra, alteração de credenciais, edição de código ou mutação de banco. Essas ações precisam de ferramentas dedicadas, autorização e confirmação.
- O limite gratuito do Gemini depende do modelo, quota e regras atuais do Google. Não há garantia de disponibilidade ilimitada ou de custo zero.

## Verificações antes de usar

1. Execute `npm run build` e `npm test`.
2. Conecte um cliente MCP local e confirme que `tools/list` mostra as duas ferramentas.
3. Faça uma chamada de teste com dados fictícios; não publique o resultado.
4. Confirme os limites de API na conta Google AI Studio.
