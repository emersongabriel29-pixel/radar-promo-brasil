# Protótipo de investigação

Este protótipo vive exclusivamente em `prototype/` e usa dados fictícios. Não é conectado ao Cupom Radar, Radar Promo, marketplaces, WhatsApp, Telegram ou redes sociais. Não importa cookies, não solicita credenciais e não envia mensagens.

## Requisitos e execução

- Node.js 24 (ambiente testado: v24.22.0)
- npm 11 (ambiente testado: v11.19.1)
- Chromium pelo Playwright do projeto para testes automatizados.

```powershell
cd prototypes/cupom-radar-investigation
npm ci --ignore-scripts
npm test
npm run serve
```

O servidor de demonstração usa `127.0.0.1:4175`. `npm test` executa `node --test tests/prototype.test.cjs` e Playwright contra o protótipo local.

## Fluxos implementados e testados

- Navegação de dashboard e menu móvel.
- Formulário de geração de rascunho com validação de URL permitida; persiste apenas no navegador local.
- Busca local por ofertas sintéticas.
- Modelo de mensagem editável, preview de placeholders e armazenamento em `localStorage`.
- Alternância visual Fila/Lista e intenção de agendamento sem executor de background.
- Copiador manual com marcação de duplicidade apenas na sessão atual.
- Preview de Story em 9:16, bio link e relatório com dados sintéticos.
- Cartões de integração explicitamente desconectados.

Resultado reproduzido em 2026-10-27: 5 testes passaram, 0 falharam. Capturas: `screenshots/prototype-desktop.png` e `screenshots/prototype-mobile.png`.

## O que não implementa

Não importa produtos reais, não valida preço, não converte links afiliados, não agenda trabalhos reais, não gera mídia por IA, não possui login/backend, não envia para canais e não reproduz módulos privados. A interface não reutiliza logo ou imagens protegidas do Cupom Radar.

## Origem do código

O protótipo foi escrito manualmente com base em evidências públicas e rótulos observáveis. Nenhum componente funcional foi gerado pelo Morph, webEmbedding, AI Website Cloner ou PROMOLINKS. O único resultado Morph examinado é um placeholder, não incorporado ao protótipo.
