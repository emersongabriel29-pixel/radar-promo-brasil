# Radar Promo Ofertas — execução das 25 auditorias

Retomada do prompt mestre, a partir de `5d7d0983f07b79ed177209cc8fc5deb162ec8184`, mesma branch `fix/android-consolidation-20261126` e PR #221. Este registro atualiza a matriz anterior em ANDROID-AUDIT-2026-11-26.md sem apagar suas evidências históricas. Não é autorização para gerar APK intermediário nem declaração de homologação integral.

## Inventário de entrada e limites

Main `1adc8791bd488c4f20a561ee9f10a852b6b257f3`; PR aberto no commit inicial acima. Hatchable v674/v3 reconfirmados; GET público auxiliar /api/offers retornou 429 usage_limit. Consulta read-only Supabase reconfirmou 10.360 ofertas, 22 categorias, zero históricos de preço e dois registros de backup. Projeto preservado: runnmpzkomcdawwzuift. Nenhuma alteração de dados ou credenciais nesta execução. Esses limites não são confundidos com ausência de código Flutter, nem impedem as tarefas independentes de UI.

## Etapa 1 — auditorias 01, 03, 04, 07, 21 e 22

Diagnóstico: ThemeData duplicado no main com tipografia e tamanhos de componentes herdados de maneira desigual. O código não tinha regra explícita de redução de movimento para as transições de páginas.

Análise de impacto: extrair apenas a definição do tema/paleta para lib/design/radar_theme.dart, mantendo export de RadarPalette pelo main para compatibilidade. Não alterar modelos, preferências, APIs, navegação ou callbacks. Aplicar os mesmos tokens semânticos em ambos os temas, TextTheme central, alvos padrão de 48 dp, campos/diálogos/botões padronizados. O wrapper de transição delega ao builder original de cada plataforma no modo normal, retornando o conteúdo diretamente quando o sistema pede redução de movimento. Nenhuma fonte remota ou dependência adicional.

Arquivos: lib/design/radar_theme.dart, lib/main.dart e test/design_system_test.dart (relativos ao app). Testes: contraste matemático das combinações semânticas, dimensões dos componentes, tipografia e delegação/redução de movimento. Toda a suíte existente permanece obrigatória. Resultado inicial: implementado, aguardando CI; próxima etapa de implementação somente após consultar esse resultado. Rollback por revert, sem force push.

Resultado da etapa 1: commit 0458374, run Flutter 45914430978/job 140230146249 aprovado, análise sem problemas e 73 testes aprovados. Isso valida o design system e a redução de movimento no renderizador de testes; não equivale a TalkBack ou teste em aparelho.

## Etapa 2 — auditorias 06, 08, 14, 15, 17, 18 e 24

Impacto avaliado antes de editar: os cinco tabs passam a Início/Categorias/Cupons/Favoritos/Perfil, usando as mesmas telas e rotas existentes. Buscas e alertas permanecem acessíveis no Perfil; Sobre, configurações, lojas, avisos e privacidade continuam disponíveis. PopScope devolve de Buscas ao Perfil e das demais seções ao Início, preservando o comportamento de voltar de páginas empilhadas. Cupons usa componente existente em modo embutido e filtro inicial de códigos reais carregados; duplicação do mesmo ID é consolidada, sem fabricar validade ou catálogo completo.

A busca local de favoritos ganha controller próprio para não alterar a pesquisa enviada ao feed. Buscas salvas ganham menu acessível para preço, pausa e exclusão, mantendo gesto de deslizar e long press existentes. Cores de exclusão/informação passam a semânticas para corrigir o tema escuro. Nenhuma chave de preferência, conta, endpoint, parâmetro de afiliado ou dado real alterado.

Arquivos: main.dart, screens/stores_coupons.dart, screens/preferences.dart; testes home_test, price_dialog_lifecycle_test e navigation_catalog_test. Testes antigos de busca/preço/privacidade adaptam apenas o caminho de navegação, mantendo asserções e cenários. Novos casos verificam cinco destinos, botão voltar, cópia de cupom, duplicidade de IDs, pesquisas separadas, exclusão sem swipe e navegação em telefone pequeno/paisagem/tablet com fonte 200% nos dois temas. Implementado; aguardando CI antes de avançar em código.

## Dependências externas — auditorias 19 e 20

Inspeção real do auxiliar: api/account/deletion-request.js usa access=user, requireIdentity, ensureSameOrigin e confirmação explícita para solicitar exclusão, mas retorna accountDeleted=false. Portanto é solicitação pendente, não exclusão efetiva da conta. Auth email está habilitado no hatchable.toml; segredo de integração permanece apenas declarado no servidor. Não foi criado login paralelo nem excluída conta de teste/produção. Homologação de comunidade, conta e exclusão real continua bloqueada pelo gateway com 429. Fluxos de votos/comentários e proteção antispam exigem execução após liberação da infraestrutura; não serão classificados como validados por existirem no código.
