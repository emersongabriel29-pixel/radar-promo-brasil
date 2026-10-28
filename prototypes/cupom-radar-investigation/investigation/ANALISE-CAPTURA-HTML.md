# Análise da captura HTML

Arquivo de entrada: anexo `Texto colado.txt`, disponível no momento da investigação em `%USERPROFILE%\.codex\attachments\<attachment-id>\Texto colado.txt`. Tamanho: 96.424 bytes. Título: “Dashboard - Cupom Radar”. O arquivo não foi alterado; a análise sanitizada está em `html-capture-analysis.json`.

## Estrutura observada

- 397 elementos; 27 âncoras; 11 botões; 2 imagens; 5 tags de script; 3 folhas de estilo; 11 blocos `<style>` e 6 atributos `style`.
- Não há formulário, `input`, `textarea` ou `select` na captura estática. Não há atributos de evento inline.
- 61 atributos ARIA e 162 atributos `data-*`; navegação estruturada em cabeçalho/aside/nav/main/sections.
- Títulos visíveis incluem “Seu espaço de trabalho”, “Acesso rápido” e módulos de geração de postagem, fila, copiador e aulas.
- Rótulos da navegação incluem dashboard, configuração do robô, produtos, mensagem, fila/lista, copiador, envio rápido, curadoria IA, bio link, rotacionador, relatórios, analytics, aulas, suporte e dados da conta. Alguns links da captura não têm `href`, portanto seu destino/comportamento não pode ser demonstrado pelo HTML.

## CSS, scripts e recursos

A captura referencia o bundle Nuxt público `/_nuxt/CoSWBJ4F.js`, CSS público `/_nuxt/entry.BlvPMg-Y.css` e `SupportChatPanel.DUUkKCge.css`, além de scripts inline. Uma referência de script/estilo é injetada por software de segurança local do navegador e foi omitida do relatório sanitizado. Duas imagens são referenciadas, mas não foram usadas como ativos do protótipo. O HTML contém SVG inline e CSS embutido.

## O que a captura permite concluir

É uma fotografia estática de uma tela autenticada previamente capturada. Mostra nomes de módulos, hierarquia, alguns textos e estrutura visual. Não contém os controles de entrada de seus fluxos, os estados posteriores de JavaScript, respostas de API, regras de validação, dados persistidos ou confirmação de que cada item de menu funcione.

A checagem de sensibilidade reteve somente contagens (palavras-chave de credenciais, padrões de email e telefone) e não os valores encontrados. Um texto de título pessoal foi substituído por `[PERSONAL DATA REDACTED]`. Não se reproduzem tokens, cookies, consultas de URL ou dados pessoais.

## Reprodutibilidade

O script `scripts/analyze-html-capture.cjs` produz `html-capture-analysis.json` a partir do anexo. A análise não carrega scripts externos nem usa a sessão capturada. Para validar novamente, execute `node outputs/cupom-radar-investigation/scripts/analyze-html-capture.cjs <caminho-do-anexo>` conforme os argumentos documentados no próprio script.
