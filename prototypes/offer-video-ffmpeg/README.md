# Protótipo local de vídeo de ofertas — Radar Promo Brasil

Este diretório é um experimento isolado, sem integração com as rotas, a base de dados, o scheduler, o n8n ou os conectores de marketplace do Radar.

## Por que existe

O Radar já tem uma tela de Radar Vídeo IA e uma prévia no navegador, além de fluxos existentes para provedores de vídeo. Este protótipo avalia uma alternativa simples, local e sem API paga para produzir um MP4 vertical com a imagem original do produto e textos sobrepostos. Não substitui nem altera os recursos existentes.

## Requisitos

- Node.js 22 ou posterior (usa módulos nativos; não adiciona dependências npm).
- FFmpeg instalado e disponível no PATH. Se necessário, defina `FFMPEG_PATH` com o caminho do executável.
- Uma imagem de produto local em PNG, JPG/JPEG ou WebP.
- Opcional: fonte TrueType local compatível. Defina `--font /caminho/fonte.ttf`; por padrão, o FFmpeg usa a fonte padrão do sistema.

## Uso

Na raiz do repositório:

```bash
node prototypes/offer-video-ffmpeg/render.mjs \
  --input ./produto.jpg \
  --output ./oferta.mp4 \
  --title "Nome do produto" \
  --price "R$ 49,90" \
  --cta "Confira os detalhes no link da publicação" \
  --duration 15
```

Opções:
- `--input`: imagem local original.
- `--output`: caminho do MP4 de saída; não pode ser o mesmo arquivo da imagem.
- `--title`: título obrigatório, até 120 caracteres.
- `--price`: preço opcional, até 50 caracteres. Só informe preço previamente confirmado.
- `--cta`: chamada para ação, até 100 caracteres.
- `--duration`: 10, 15, 20 ou 30 segundos (padrão 15).
- `--font`: caminho opcional para fonte TTF.

## Saída e limites

- MP4 H.264, 720×1280 (9:16), 30 fps, sem áudio.
- Faz um movimento de zoom discreto na imagem; não gera novas cenas ou avatar por IA.
- O texto é escrito em arquivos temporários e usado com `expansion=none`; o comando é executado sem shell.
- Só aceita caminhos de arquivos locais e não faz requisições HTTP.
- Não lê links de afiliados, não verifica preços, não envia o arquivo para serviços externos e não publica nada.
- Não adiciona dependências, não altera variáveis de ambiente, credenciais, tabelas ou integrações do Radar.
- O resultado é um rascunho e precisa de revisão visual/manual antes de qualquer uso.

## Testes

```bash
node --test prototypes/offer-video-ffmpeg/render.test.mjs
```

Os testes cobrem parsing de argumentos, validações e construção segura do comando. Eles não substituem um teste de renderização real com FFmpeg instalado. Este protótipo não deve ser implantado na Hatchable nem no servidor de produção sem uma decisão e uma integração separadas.
