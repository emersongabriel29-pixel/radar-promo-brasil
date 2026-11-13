# Radar Promo Brasil — correção de segurança e roteamento (12/11/2026)

## Evidências confirmadas na produção

- O grupo Casa & Lar permaneceu ACTIVE e com category_id correto.
- A consulta global encontrou 75 ofertas medicamentosas vinculadas a 96 publicações: 84 READY e 2 RETRY (86 ainda não enviadas), além de 10 publicações PUBLISHED. As 86 pendentes estavam distribuídas em quatro grupos; 11 READY estavam no Casa & Lar, 5 no Baby & Kids, 5 no Tech & Eletrônicos e 65 no grupo geral Ofertas.
- Foram confirmadas três publicações históricas incompatíveis no Casa & Lar: kit de unhas de gel, escova desembaçadora automotiva e aromatizador para carro. As mensagens externas já publicadas não são apagadas nem reescritas por esta correção.
- A reconciliação identificou 38 publicações pendentes com categoria da oferta diferente da categoria do grupo, distribuídas entre Auto, Casa & Lar, Moda & Beleza e Tech & Eletrônicos; todas foram colocadas em BLOCKED_ROUTING, sem apagar os registros.
- A amostra de 40 publicações pendentes continha ofertas legítimas de Casa & Lar e exigia correção pontual, não reclassificação em massa.

## Causas corrigidas no código

1. api/jobs/lomadee-link-queue.js reabria itens BLOCKED_SAFETY a cada execução e classificava o registro bruto sem fallback para o título persistido. A reabertura foi removida e o classificador recebe row.title/row.product_url como fallback.
2. lib/category-classifier.js não tinha regras de intenção explícita para unhas/manicure nem para acessórios e limpeza automotiva. Foram adicionadas regras específicas de alta confiança antes das regras genéricas, evitando que termos incidentais como “decoração”, “casa” ou “carro” determinem o nicho.
3. api/jobs/telegram.js promovia publicações legadas READY sem repetir o filtro de medicamentos nem validar o vínculo entre categoria do produto e categoria do grupo. A promoção agora aplica ambas as verificações.
4. lib/delivery.js agora exige correspondência entre offers.category_id e promo_groups.category_id para destinos de nicho. Destinos gerais (cat-gerais), grupos sem categoria e mensagens sem oferta continuam permitidos.
5. lib/product-safety.js ampliou a lista de marcas de medicamentos e atualizou a versão da política.
6. public/radar.js apresenta rótulos legíveis para bloqueios de segurança e roteamento.

## Limites de operação

- Nenhuma oferta, publicação ou histórico é apagado.
- Nenhuma mensagem é enviada ou removida do Telegram/WhatsApp.
- Nenhum worker, API de marketplace ou encurtador é acionado por esta correção.
- Publicações já efetivamente enviadas permanecem como PUBLISHED para preservar o histórico real; a correção de categoria não desfaz mensagens externas.
- As 86 publicações medicamentosas não enviadas foram colocadas em BLOCKED_SAFETY; as 38 publicações pendentes com divergência de categoria foram colocadas em BLOCKED_ROUTING, com motivo, sem excluir dados.

## Validação necessária após sincronização

- Executar o validador de deploy do Hatchable.
- Confirmar que os exemplos “dicas de unhas de gel”, “escova desembaçadora para-brisa automotivo” e “cheirinho para carro” classificam respectivamente como Moda e beleza, Auto/Moto e Auto/Moto.
- Confirmar que Allegra, Allestra, Adipept e Dipirona são bloqueados pela política de medicamentos.
- Confirmar que a elegibilidade bloqueia medicamento e divergência entre categoria do produto e categoria do grupo, mantendo o grupo geral e mensagens manuais elegíveis.
- Consultar novamente os registros pendentes e os estados de quarentena sem executar publicação.

## Validação pós-deploy — 12/11/2026

- Hatchable v670 foi publicado como LIVE; 343 arquivos e 135 funções foram implantados, sem avisos no resultado do deploy.
- CI do GitHub: build, npm test, npm audit e Playwright E2E concluídos com sucesso no commit de código do PR #200.
- O smoke test read-only de /api/automation/simulate retornou HTTP 429 usage_limit: limite mensal de 2,0 horas de banco atingido. Portanto, a classificação funcional pós-deploy não foi confirmada por endpoint em produção; não presumir normalidade até a quota voltar ou a migração de banco ser concluída.
- Nenhum worker ou mensagem externa foi acionado durante o teste.
