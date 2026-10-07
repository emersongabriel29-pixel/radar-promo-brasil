# Radar Promo Brasil

Painel privado para organizar ofertas afiliadas, gerar conteúdo com fatos verificados, preparar filas e integrar entregas via Telegram, n8n e Meta. O projeto usa JavaScript sem compilação no Hatchable e oferece um adaptador Express/PGlite para desenvolvimento e operação privada standalone.

## Interface e recursos

Sete áreas: Central, Radar, Ofertas, Publicações, Canais, Relatórios e Configurações. Estúdio de IA, tráfego e Agente Radar Social ficam nas abas de Ofertas. A skill UI/UX Pro Max está incluída em `.codex/skills/ui-ux-pro-max/`, com versão e licença preservadas; seu sistema visual adaptado está em `design-system/radar-promo-brasil/MASTER.md`.

O fluxo de entrega é oferta validada → aprovação → destino oficial ativo → fila e janela → conector → confirmação oficial. Uma tentativa com resultado incerto fica em `WAITING_CONFIRMATION`, exigindo conferência no destino antes de qualquer reenvio.

Imagens enviadas guardam a chave do arquivo e renovam a URL de acesso na leitura/entrega. Tokens de bot e Meta são vinculados a uma conta. Regras de autopilot começam pausadas com score 85, desconto 15%, limite de cinco publicações por dia e cooldown de 120 minutos.

## Executar e verificar

Requer Node.js 22 ou posterior, npm e Python 3 para pesquisas da skill.

```bash
npm ci
npm run dev
npm run build
npm test
npx playwright install chromium
npm run test:e2e
npm audit --audit-level=moderate
```

`build` apenas verifica a sintaxe dos arquivos; não produz um bundle. Os testes de navegador usam banco em memória, com scheduler e provedores externos desativados. `npm run check:release` reúne essas verificações. A CI repete os testes e bloqueia vulnerabilidades a partir da severidade moderada.

O processo lê variáveis de ambiente; `.env.example` documenta os nomes e não é carregado automaticamente. Para usar um arquivo local de variáveis, configure seu gerenciador de processos ou execute `node --env-file=.env server.js` em uma instalação de desenvolvimento.

## Produção standalone

Use HTTPS no proxy, `NODE_ENV=production`, `PUBLIC_APP_URL`, `STANDALONE_USER_ID` e `STANDALONE_AUTH_SECRET` aleatório com pelo menos 32 caracteres. O painel privado usa cookie assinado HttpOnly/Secure/SameSite=Strict ou bearer para clientes da API. Mutações com cookie exigem origem correta. O servidor recusa inicializar produção sem identidade/segredo. Ele não implementa cadastro comercial multiusuário.

Guarde o diretório PGlite e os uploads em volumes duráveis com backup externo. Migrações são transacionais, registradas por checksum e interrompem a inicialização quando falham. Bancos locais antigos sem histórico de migrações precisam de backup e reconciliação do schema antes do primeiro upgrade; não marque migrações como aplicadas sem verificar o banco.

Para o fallback de cartão local, instale Chromium. Opcionalmente configure `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. O scheduler local mantém tarefas no banco e utiliza uma credencial interna, inacessível nas rotas HTTP externas. O scheduler do Hatchable é gerenciado pela plataforma.

## Hospedagem Hatchable

Implante somente `api/`, `lib/`, `pages/`, `public/`, migrações adicionais e o manifesto compatível. O SDK, autenticação, armazenamento e browser são os serviços da plataforma. Não copie o adaptador `hatchable/`, o servidor Express nem o `package.json` standalone para o projeto hospedado. Valide com `dry_run_deploy`, use migrações adicionais e execute smoke tests após a implantação.

O repositório atual é público no GitHub; o painel operacional continua privado e as rotas de gestão usam `member`. A vitrine pública só expõe ofertas explicitamente publicadas. Imagens de upload não são servidas por `/uploads`: o painel usa uma rota autenticada e a vitrine usa uma rota pública que verifica conta, publicação e status da oferta.

## Integrações e limites

- Telegram exige token próprio e bot autorizado no destino. Cadastro não comprova entrega; o conector grava o identificador oficial quando publica.
- n8n usa HMAC, timestamp de até cinco minutos e chave derivada por conta. Repita o mesmo `eventId` em falhas; eventos processados retornam a resposta original. O resultado deve corresponder a uma publicação em envio e incluir `externalMessageId` quando `PUBLISHED`; `UNKNOWN` exige reconciliação.
- Afiliados precisam de identificação/validação na plataforma oficial. Amazon e Mercado Livre montam parâmetros configurados, sem garantir comissão. Shopee exige link gerado pela plataforma de afiliados; `sub_id` isolado não converte um produto em afiliado.
- Mercado Livre exige OAuth e chave de criptografia; Meta exige permissões oficiais, token, IDs e teste da conta. Vídeos dependem de Runway. IA usa os provedores habilitados no Hatchable; o adaptador local oferece Gemini para texto e fallback de cartão para imagem.
- Captura automática de monitores e execução de mensagens recorrentes permanecem bloqueadas quando não existe executor validado. Os cadastros e o planejamento são preservados.
- Relatórios de vendas dependem dos dados oficiais importados. Planos/assinaturas não constituem um checkout de cobrança implementado.
- Controles de privacidade registram solicitações e preferências; execução de retenção, exportação e exclusão precisa de um processo operacional definido.

O diagnóstico `/api/readiness` verifica a configuração da conta e a confirmação recente de entrega. Seus percentuais não certificam segurança, conformidade ou prontidão integral de produção. Consulte `docs/AUDITORIA-2026-09-30.md` e `docs/RELEASE.md` para evidências e etapas pendentes.
