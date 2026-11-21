# Remotion — protótipo isolado de vídeo de ofertas

**Status: protótipo de código; não instalado, não renderizado, não integrado ao Radar.**

Este projeto fica isolado de Hatchable e do runtime principal. Usa somente dados sintéticos e não chama APIs, bancos, afiliados, Telegram, WhatsApp ou providers de IA.

## Composição
- 1080×1920 vertical e 1920×1080 horizontal
- 30 FPS, 15 segundos
- Branding Radar Promo Brasil
- Título, loja fictícia, preço anterior, preço atual, desconto, economia, cupom e CTA
- Animações simples sem assets remotos

## Dependências pinadas
Remotion e CLI: 4.0.545 (release upstream consultada em 2026-11-21). React e TypeScript também pinados no package.json. Antes de instalação/renderização, revisar licença e requisitos de uso do Remotion, gerar lockfile e executar em worker isolado com limites de CPU/RAM/tempo, armazenamento temporário e sem secrets.

## Execução local futura
1. Instalar Node compatível em ambiente isolado.
2. `npm install` e gerar lockfile; revisar dependências.
3. `npm run start` para preview.
4. Renderizar apenas com os dados demonstrativos.
5. Validar dimensões, render, tamanho, recursos e limpeza dos artefatos.

Não importar este package para Hatchable. A integração futura deve ser um worker/serviço separado, autenticado, com jobs idempotentes, limite de concorrência, retries, retenção e feature flag.
