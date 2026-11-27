# Radar Promo Ofertas — execução das 25 auditorias

Retomada do prompt mestre, a partir de `5d7d0983f07b79ed177209cc8fc5deb162ec8184`, mesma branch `fix/android-consolidation-20261126` e PR #221. Este registro atualiza a matriz anterior em ANDROID-AUDIT-2026-11-26.md sem apagar suas evidências históricas. Não é autorização para gerar APK intermediário nem declaração de homologação integral.

## Inventário de entrada e limites

Main `1adc8791bd488c4f20a561ee9f10a852b6b257f3`; PR aberto no commit inicial acima. Hatchable v674/v3 reconfirmados; GET público auxiliar /api/offers retornou 429 usage_limit. Consulta read-only Supabase reconfirmou 10.360 ofertas, 22 categorias, zero históricos de preço e dois registros de backup. Projeto preservado: runnmpzkomcdawwzuift. Nenhuma alteração de dados ou credenciais nesta execução. Esses limites não são confundidos com ausência de código Flutter, nem impedem as tarefas independentes de UI.

## Etapa 1 — auditorias 01, 03, 04, 07, 21 e 22

Diagnóstico: ThemeData duplicado no main com tipografia e tamanhos de componentes herdados de maneira desigual. O código não tinha regra explícita de redução de movimento para as transições de páginas.

Análise de impacto: extrair apenas a definição do tema/paleta para lib/design/radar_theme.dart, mantendo export de RadarPalette pelo main para compatibilidade. Não alterar modelos, preferências, APIs, navegação ou callbacks. Aplicar os mesmos tokens semânticos em ambos os temas, TextTheme central, alvos padrão de 48 dp, campos/diálogos/botões padronizados. O wrapper de transição delega ao builder original de cada plataforma no modo normal, retornando o conteúdo diretamente quando o sistema pede redução de movimento. Nenhuma fonte remota ou dependência adicional.

Arquivos: lib/design/radar_theme.dart, lib/main.dart e test/design_system_test.dart (relativos ao app). Testes: contraste matemático das combinações semânticas, dimensões dos componentes, tipografia e delegação/redução de movimento. Toda a suíte existente permanece obrigatória. Resultado inicial: implementado, aguardando CI; próxima etapa de implementação somente após consultar esse resultado. Rollback por revert, sem force push.
