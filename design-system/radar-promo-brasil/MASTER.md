# Sistema visual — Radar Promo Brasil

UI/UX Pro Max 2.13.0, revisão upstream `09170eec67eefd46a7ae85de61b40c194020f997`, incorporado em `.codex/skills/ui-ux-pro-max/`. Fonte: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill. Licença MIT preservada.

A pesquisa `analytics dashboard dense` sustenta o estilo Data-Dense Dashboard. As sugestões genéricas de landing page e troca de fontes foram adaptadas ao painel existente: navegação operacional, identidade azul e tipografia já adotada têm prioridade.

## Tokens

| Uso | Valor |
| --- | --- |
| Ação e foco | `#1769e0` |
| Fundo | `#f5f7fb` |
| Superfície | `#ffffff` |
| Texto principal | `#14243b` |
| Texto secundário | `#52647b` |
| Borda | `#d8e1ec` |
| Fontes | Manrope; números/indicadores em DM Mono; fallback system-ui |
| Raio | 8px em controles, 12–18px em cartões |
| Alvo interativo | mínimo 44px |
| Breakpoint do menu | até 900px: gaveta; a partir de 901px: lateral |

## Navegação

| Área | Recursos |
| --- | --- |
| Central | métricas e próximos passos |
| Radar | monitoramento, clone e criação rápida |
| Ofertas | ofertas/cupons, Estúdio de IA, tráfego, Agente Radar Social |
| Publicações | filas e planejamento |
| Canais | grupos, canais e leads |
| Relatórios | cliques, vendas e comissões |
| Configurações | segurança, integrações, conta e vitrine |

## Interação

- Ícones SVG de navegação; emojis apenas como conteúdo, categorias ou modelos de promoção.
- Foco visível, labels associados, diálogo com nome/descrição, contenção de foco e Escape.
- Menu acessível em 375, 768 e 880px; nenhuma faixa sem botão de acesso.
- Preservar entradas quando a operação falha; impedir envio repetido enquanto o formulário está ocupado.
- Exibir falhas parciais de carregamento e integração pendente. Não apresentar ausência de dados como sucesso.
- Respeitar `prefers-reduced-motion` e áreas seguras de dispositivos móveis.
- Não usar a abertura do compartilhamento do navegador como prova de entrega.

## Uso local

```bash
python3 .codex/skills/ui-ux-pro-max/scripts/search.py 'analytics dashboard dense' --design-system -p 'Radar Promo Brasil' --format markdown
python3 .codex/skills/ui-ux-pro-max/scripts/search.py 'keyboard focus modal' --domain ux
```

Nenhuma configuração global ou API key é necessária. Recomendações geradas devem ser revisadas contra este sistema e contra os fluxos reais do produto.
