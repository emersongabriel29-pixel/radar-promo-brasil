# Arquitetura observada — 08/11/2026

## Visão geral

O Radar é um painel privado de operação de afiliados com captura/ingestão, validação, categorização, enriquecimento de IA, montagem de mensagem, aprovação, fila e entrega por canais autorizados. A arquitetura hospedada é serverless no Hatchable: páginas em `pages/`, API em `api/`, código compartilhado em `lib/`, assets em `public/`, configuração em `hatchable.toml` e migrações SQL em `migrations/`.

O GitHub também contém um adaptador standalone Express/PGlite para desenvolvimento e operação privada. Esse adaptador não deve ser copiado para o bundle Hatchable; o runtime de hospedagem usa SDK próprio. O projeto Hatchable não executa build npm, não usa ORM, não possui filesystem persistente entre requisições e exige handlers default e declaração `access` nas rotas.

## Fluxo de oferta

1. Origem/API/entrada manual/extension entrega dados candidatos.
2. Normalização e validação de preço, URL HTTPS, loja, categoria, cupom, imagem e metadados.
3. Persistência vinculada a `account_id`, deduplicação/fingerprint e histórico de preço.
4. Enriquecimento opcional de título por IA, sem conceder à IA autoridade para inventar preço, estoque, desconto, frete ou urgência.
5. Composição determinística de mensagem com `lib/promo-message.js` e `formatPromo`.
6. Aprovação e seleção de grupo/destino elegível.
7. Fila, agendamento, janela, cooldown e controle de idempotência.
8. Conector externo; somente receipt oficial confirma aceitação. Resultado incerto deve ir para `WAITING_CONFIRMATION` e reconciliação antes de retry.

## Limites e princípios

- Isolamento por conta é obrigatório; consultas e relações precisam validar account_id.
- Segredos ficam em cofres/variáveis seguras, nunca em docs, frontend ou logs.
- Não presumir que cadastro de API = autenticação = operação validada.
- Não presumir que execução de scheduler = publicação entregue.
- Não disparar mensagens reais durante testes sem autorização.
- Não usar scraping ou automação que contorne CAPTCHA/controles de acesso.
- Manter integrações desacopladas para que falha de uma origem não interrompa as demais.

## Organização funcional do painel

Navegação funcional prevista: Central, Radar, Ofertas, Publicações, Canais, Relatórios e Configurações. Estúdio de IA, conteúdo e tráfego devem permanecer organizados dentro da área de Ofertas, preservando o fluxo e a identidade do projeto.

## Runtime e restrições Hatchable

Consultar `AGENTS.md` gerado pela plataforma para a lista atual de regras de deploy. Estado observado: 121 rotas API, 9 páginas, 53 módulos lib, 15 assets e 71 arquivos de migração. O número de arquivos pode mudar entre WIP e deployment. `dry_run_deploy` em 08/11/2026 aprovou o snapshot corrente sem erros ou avisos, com previsão de v654; não foi feito deploy nesta auditoria.

## Standalone

O modo standalone tem ciclo próprio: Node.js 22+, Express, PGlite, volumes persistentes, HTTPS/proxy, segredo de sessão forte e identidade configurada. As migrações standalone usam checksum e transação. Não assumir equivalência de comportamento entre PGlite e PostgreSQL gerenciado sem executar a suíte correspondente.
