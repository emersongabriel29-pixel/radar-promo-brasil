# Radar Promo Brasil — correção de segurança e roteamento (12/11/2026)

## Evidências confirmadas na produção

- O grupo Casa & Lar permaneceu ACTIVE e com category_id correto.
- Havia 36 publicações READY e 1 RETRY ligadas a ofertas medicamentosas; os títulos incluíam Allegra, Allestra, Adipept e Dipirona.
- Foram confirmadas publicações históricas incompatíveis no Casa & Lar: kit de unhas de gel, escova desembaçadora automotiva e aromatizador para carro. As mensagens externas já publicadas não são apagadas nem reescritas por esta correção.
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
- Registros pendentes comprovadamente incompatíveis devem ser colocados em estados explícitos BLOCKED_SAFETY/BLOCKED_ROUTING, com motivo, sem excluir dados.

## Validação necessária após sincronização

- Executar o validador de deploy do Hatchable.
- Confirmar que os exemplos “dicas de unhas de gel”, “escova desembaçadora para-brisa automotivo” e “cheirinho para carro” classificam respectivamente como Moda e beleza, Auto/Moto e Auto/Moto.
- Confirmar que Allegra, Allestra, Adipept e Dipirona são bloqueados pela política de medicamentos.
- Confirmar que a elegibilidade bloqueia medicamento e divergência entre categoria do produto e categoria do grupo, mantendo o grupo geral e mensagens manuais elegíveis.
- Consultar novamente os registros pendentes e os estados de quarentena sem executar publicação.
