# Limitações e bloqueios

1. **Dashboard autenticado:** requisição atual sem sessão termina em `/login`. A captura HTML antiga é estática e não foi reutilizada como sessão. Nenhum teste funcional autenticado foi feito.
2. **Código privado/backend:** não há acesso autorizado a repositório do Cupom Radar, banco, endpoints internos ou configurações. Bundle compilado não recupera esses componentes.
3. **REA via CDP:** conexão atual à porta 9222 recusada; ponte local 8787 também não estava ativa. O modo launch do CLI REA funcionou para a página pública, sem perfil persistente.
4. **Tamanho da análise histórica:** limite de resposta MCP interrompeu a entrega completa da análise. Evidência foi exportada localmente; o conteúdo bruto grande e dados sensíveis não foram copiados para relatórios.
5. **Captura HTML:** representa apenas um estado de dashboard; sem inputs, formulários ou respostas runtime. Contém um elemento pessoal, sanitizado nos resultados.
6. **webEmbedding:** o classificador marcou a homepage aberta como `authenticated-app-surface/needs_session`; o cabeçalho do site também impede reuso via iframe. A captura inteira foi interrompida por segurança, não por falta de acesso público.
7. **Morph:** falhas de dependências/transpilação impediram emissão de componentes utilizáveis. A saída examinada é placeholder.
8. **AI Website Cloner:** é template orientado a agente, sem comando autônomo; seu resultado depende do agente/browser configurado.
9. **PROMOLINKS:** ausência de licença explícita impede reutilização do código. Workflow, banco, Docker, APIs e envio não foram executados.
10. **Integrações do Cupom Radar:** nomes em marketing/FAQ não comprovam autenticação, operação ou disponibilidade. Sem conta autorizada e credenciais de teste, não é possível validar marketplace, canal ou analytics.
11. **Privacidade:** relatórios preservam contagens e rótulos; não contêm tokens, cookies, nome, telefone ou endereço de email capturado.

Esses bloqueios não impedem a especificação nem o protótipo independente; impedem alegar paridade completa ou funcionamento real de serviços protegidos.
