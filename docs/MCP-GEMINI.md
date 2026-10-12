# MCP remoto do Radar Promo Brasil (Hatchable)

O Radar Promo Brasil expõe um servidor MCP remoto nativo pelo Hatchable. A configuração `[mcp] enabled = true` e os arquivos em `mcp/*.js` são publicados junto com a aplicação. O endpoint é:

```text
https://radar-promo-brasil.hatchable.site/mcp
```

O endpoint usa o fluxo OAuth do Hatchable; não crie nem compartilhe tokens manualmente. No cliente MCP, adicione a URL acima e conclua a autorização no navegador com a conta que tem papel de proprietária ou administradora do projeto. A autorização é revogável na aba MCP do console do Hatchable.

## Ferramentas expostas

- `categorize_product`: classifica produto apenas dentro da lista de categorias fornecida. Usa o modelo Gemini configurado no Hatchable.
- `generate_promo_draft`: gera um rascunho a partir de fatos fornecidos. Usa Gemini e não publica ofertas nem envia mensagens.
- `validate_offer_facts`: valida a estrutura básica de uma oferta e o formato HTTPS do link. Não verifica preço, estoque, frete ou validade em tempo real.

As ferramentas estão restritas a `admin` (proprietária/administradora). Não há ferramentas MCP para publicar ofertas, enviar mensagens, comprar produtos, alterar credenciais ou modificar integrações.

## Conectar clientes

### Claude Desktop / Claude Code

Adicione um servidor MCP remoto pela URL `https://radar-promo-brasil.hatchable.site/mcp` e conclua o OAuth. No Claude Code, a configuração pode ser iniciada com:

```bash
claude mcp add --transport http radar-promo-brasil https://radar-promo-brasil.hatchable.site/mcp
```

Se o cliente solicitar autorização, abra o navegador e aprove o acesso ao projeto.

### OpenAI / ChatGPT via API

Na Responses API, configure um MCP remoto com `server_url` igual à URL acima e permita somente as ferramentas necessárias. O cliente deve completar o fluxo de autorização suportado pelo ambiente; não copie tokens de sessão ou cookies. Para usar MCP em um produto ChatGPT específico, confira a disponibilidade de conectores/MCP no plano e nas configurações da conta.

### Outros clientes compatíveis

Use a mesma URL MCP e conclua o OAuth do Hatchable. O protocolo é independente do modelo; o cliente pode usar Claude, OpenAI ou outro modelo compatível. A geração de texto feita dentro das ferramentas deste projeto usa Gemini.

## Custos e limites

- O MCP e o endpoint não substituem o modelo de IA.
- A classificação e a geração de texto chamam o alias `gemini` pelo gateway do Hatchable; o custo/quota depende da chave Google configurada, do plano e das condições atuais do Google/Hatchable.
- A validação estrutural não chama IA.
- Nenhuma ferramenta publica nem envia mensagens; o resultado de geração é apenas rascunho.
- A disponibilidade do Gemini em modalidade gratuita não é ilimitada e deve ser conferida na conta do provedor e no painel de uso do Hatchable.

## Verificação operacional

1. Confirmar no Hatchable que o projeto está na versão publicada atual e que a aba MCP lista as três ferramentas.
2. Adicionar a URL no cliente e concluir o OAuth.
3. Testar `validate_offer_facts` com dados fictícios.
4. Testar `categorize_product` e `generate_promo_draft` com dados fictícios, confirmando os registros no painel de uso de IA.
5. Não enviar os rascunhos a canais reais sem aprovação humana e conferência dos dados oficiais.

Segredos, tokens e cookies não devem ser colocados no GitHub nem em prompts.
