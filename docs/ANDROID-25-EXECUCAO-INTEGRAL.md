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

Resultado da etapa 2: commit 3b67845, run Flutter 45914856775/job 140231516139 aprovado, análise sem problemas e 83 testes aprovados. Navegação, cupons, exclusão acessível, busca separada e seis cenários de tamanho/tema com fonte 200% validados em widgets.

## Etapa 3 — auditorias 08, 15, 16 e integração de leitura

Causa do catálogo parcial: o cliente só conhece nomes presentes nas páginas do feed; a Edge Function existente não expõe catálogo. O banco contém categorias reais mesmo sem ofertas atuais elegíveis. Solução menos invasiva: acrescentar catalog=1 ao mesmo endpoint e função, somente GET, com paginação limitada por capacidade e conta fixa do servidor, sem criar outro backend, tabela ou política. Respostas normais de ofertas e seus critérios de atualidade permanecem intactos. Metadados de categorias/lojas não serão apresentados como ofertas disponíveis nem como prova de preço atual.

Fonte de verdade: radar-offers-feed v2, verify_jwt=false já existente, fonte recuperado do projeto Supabase correto e guardado em supabase/functions/radar-offers-feed/ para restauração. Changelog e documentação oficial de conexão Postgres consultados. Advisor reconfirmou 83 avisos INFO de RLS sem policies; nenhuma abertura de policies ou troca de credenciais será feita. Implantação reversível da função existente autorizada no escopo do prompt mestre, somente após testes de contrato e comparação do hash da versão ainda implantada. Rollback: reimplantar exatamente os dois arquivos v2 preservados; sem mutação de dados.

Teste de contrato da etapa 3 executado localmente: `node --test tests/android-edge-catalog.test.mjs`, 5/5 aprovados. A suíte executa o handler real em sandbox, substituindo somente conexão SQL e Deno.serve: conta fixa/parametrização, paginação, rejeição de escrita/consulta inválida, preservação de critérios do feed normal e erro sem detalhes privados. Ponto de restauração v2: commit d1504927ea0aaf1c99a39ee5a92022e372c65cb4. Nenhuma tabela ou política precisa ser alterada.

Implantação da função existente: radar-offers-feed v3, commit 816f281. Hash v2 reconferido imediatamente antes do deploy; JWT permanece no estado anterior. Chamadas HTTP reais após deploy: catalog=1&limit=60 retornou 200, **13 nomes distintos de categorias e 3 lojas da conta de publicação**, hasMore=false; feed normal limit=1 retornou 200 e zero ofertas; catalog inválido retornou 400. O total global de 22 categorias no banco não foi confundido com o catálogo dessa conta. Preços antigos não foram liberados e nenhum registro foi gravado.

Cliente passa a consultar catalog=1 em carga independente, com o mesmo transporte, timeout, tratamento de erro e pausa HTTP já testados. Categorias deixam de depender da página de ofertas; catálogo paginado permite carregar a próxima página sem loop automático. Na falha, nomes de ofertas já carregadas continuam acessíveis e o estado parcial é informado. Lojas recebidas entram nas opções do filtro, que continua explicitamente aplicado às ofertas carregadas. Testes adicionais cobrem contrato, deduplicação de nomes, resposta inválida, página vazia e categoria disponível com feed vazio. Aguardando CI Flutter antes da próxima etapa de código.

CI da integração do catálogo: run 45915512622 aprovou analyze, 86 testes passaram e um teste de tela pequena não localizou uma orientação abaixo do viewport (lista preguiçosa agora também contém o estado de catálogo). Ajustado o teste para rolar verticalmente até o mesmo texto, mantendo a asserção e a verificação de ausência de exceções. Nenhum teste ou validação de segurança removido.

Resultado da etapa 3 no cliente: commit 36490a7, run Flutter 45915676468/job 140234171112 aprovado, análise sem problemas e 87 testes aprovados. Categoria de catálogo sem oferta elegível e manutenção do contrato anterior confirmadas na suíte.

## Etapa 4 — auditorias 02, 05, 06, 09, 10, 11, 12, 13, 18, 21, 22, 23, 24 e 25

Análise de impacto: abertura de loja recebe somente um callback opcional para testes, mantendo launchUrl/externalApplication como padrão e preservando a URI integral. Isso permite verificar bloqueio de cliques concorrentes e falha de abertura sem navegar para lojas reais. Nenhum destino ou regra de autorização alterado. Barras das páginas secundárias acompanham a fonte ampliada em vez de cortar títulos no toolbar fixo; tokens e dependências mantidos.

Testes acrescentados: jornada de link com SubID codificado e estado de abertura; destino inseguro desabilitado; paginação e consolidação de IDs; cache offline identificado como potencialmente desatualizado. Matriz adicional exercita detalhes, catálogo, buscas, preferências e privacidade em 320 dp/paisagem/tablet, claro/escuro, fonte 200% e movimento reduzido. Somada à matriz dos cinco destinos, cobre as telas existentes no renderizador de widgets, sem afirmar comportamento em aparelho.

Evidências visuais: o CI renderiza os próprios widgets de produção em 393x852, carrega Roboto do SDK fixado e grava nove telas por tema. Manifestos identificam commit, dimensões, dados fictícios explícitos e real_device=false. Isso é captura do renderizador de testes, não mockup conceitual nem evidência de oferta real ou instalação Android. Não há baseline Golden homologada; não será criada aprovação artificial por gerar e aceitar a mesma imagem. Artefato de PNGs retido por três dias para evitar acúmulo.

O workflow também executa aapt2 compile sobre os recursos XML Android sem gerar APK ou AAB. Isso valida sintaxe/compilação de recursos, não instalação, ligação completa do app, assinatura ou comportamento do launcher. Todos os builds de APK permanecem condicionados à opção manual, que não foi acionada. Testes e recursos desta etapa aguardam CI antes de conclusão.
