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

Resultado da etapa 4: 99 testes Flutter aprovados no job 140238057030, analyze aprovado e aapt2 compile aprovado no run 45916859368, commit 4e4c957ca568b503c5ffde3e763883721bfdc7da. A primeira execução tinha falha operacional (rg ausente no runner), corrigida com find. A revisão das capturas detectou Ahem em textos e ícones ausentes: tipografia agora herda Roboto explicitamente e o teste carrega MaterialIcons. A correção foi novamente analisada e testada; não houve remoção de testes. Etapas de build/upload de APK ficaram skipped.

## Matriz consolidada das 25 auditorias

Os caminhos abaixo são relativos a mobile/radar_promo_ofertas/, exceto quando identificado. Evidência T = suíte Flutter de 99 casos/run 45916859368; C = cinco contratos Node do handler; R = aapt2 compile; V = renderizações de widgets com fixtures explícitas. V não representa aparelho, dados de produção ou Golden de referência homologada. A classificação é da auditoria completa exigida, incluindo os limites descritos, e não apenas do código escrito.

| Nº / auditoria | Problema e causa | Correção / arquivos envolvidos | Verificação e resultado | Pendência / status |
| --- | --- | --- | --- | --- |
| 01 Identidade visual | Tokens e temas distribuídos, aplicação irregular da marca | design/radar_theme.dart; main.dart mantém símbolo radar, azul, verde e identidade existente | T contraste/temas; V claro e escuro | Avaliação no launcher/aparelho. **Parcialmente concluída** |
| 02 Logo, ícone e abertura | Ícones e splash exigiam adaptação Android; validação anterior parcial | Recursos radar_foreground, radar_monochrome, adaptive v26/v33, styles v31 já preservados; workflow acrescenta compilação XML | R aprovado; pacote anterior inspecionado | Máscaras, splash Android real e atualização instalada. **Implementada, aguardando validação** |
| 03 Paleta | Risco de cores fixas e contraste inadequado | design/radar_theme.dart; cores de mensagem semânticas em preferences.dart | T testa contraste AA das combinações centrais nos dois temas | WCAG integral por tela/aparelho não comprovada. **Parcialmente concluída** |
| 04 Tipografia | TextTheme desigual e toolbar fixo com fonte ampliada | design/radar_theme.dart; toolbars main.dart/preferences.dart/stores_coupons.dart; Roboto explícito | T 200% em telefone/paisagem/tablet, sem exceções | Escalas além de 200%, Android real. **Parcialmente concluída** |
| 05 Hierarquia | Preço e cupom precisavam destaque; CTA distante | Preservados preço destacado, desconto calculado e CTA inferior em main.dart; nova navegação Cupons | T detalhes/jornada; V | Oferta real atual indisponível para homologação. **Parcialmente concluída** |
| 06 Responsividade | Controles/títulos com risco de corte e navegação estreita | Tokens, toolbar variável, menus de buscas e matriz de telas principais/secundárias | T cobre 320dp,640x360,1024x768, claro/escuro e fonte200% | Insets/teclado físico/orientação Android em aparelho. **Parcialmente concluída** |
| 07 Design system | ThemeData duplicado no main | design/radar_theme.dart centraliza ThemeData, ColorScheme, TextTheme, formas, campos, botões e transições; export antigo compatível | T sem regressões e contraste/tamanho dos tokens | Aplicação integral validada por widgets; revisão final visual depende do aparelho. **Implementada, aguardando validação** |
| 08 Início e feed | Feed real sem elegibilidade atual; catálogo dependia da página | main.dart pagina/deduplica/cache sinalizado; catálogo independente via services/api.dart | T paginação/cache; HTTP real feed200/vazio e catálogo200 | Não liberar preços antigos; investigar coleta/histórico e gateway429. **Parcialmente concluída** |
| 09 Cards | Campos opcionais e URLs poderiam gerar apresentação enganosa | Preservado models/offer.dart e cards main.dart; imagem compartilhada, preço validado e favoritos | T dados incompletos/valores inválidos; V fixtures | Frete/popularidade só quando houver origem verificável; feed real vazio. **Parcialmente concluída** |
| 10 Imagens | Origens relativas/backend e falhas de rede | offer_image.dart preserva proporção, placeholder sem produto fictício, decode limitado, erro e HTTPS | T URLs inválidas/ausentes; inspeção de código | Fluxo de imagem real com oferta elegível e teste de memória Android pendentes. **Parcialmente concluída** |
| 11 Preços e economia | Valores inválidos, desconto não comprovado e ausência de histórico | models/offer.dart/main.dart preservam validação, BRL e cálculos somente com preço anterior válido | T preços inválidos/ausentes e ida/volta serialização | Supabase tem zero históricos; veracidade de preço atual externo não homologada. **Parcialmente concluída** |
| 12 Detalhes | CTA distante, risco de link alterado e interação concorrente | main.dart CTA inferior, cópia/favoritos, callback opcional para teste mantendo abertura externa original | T preserva URI/SubID integral; falha restaura botão | Abertura real da loja/instalação e conteúdo atual. **Parcialmente concluída** |
| 13 Botões/interações | Cliques concorrentes e áreas reduzidas | Tema48dp, estados busy/desabilitado, ação de apagar busca acessível | T confirma uma abertura durante chamada pendente e rejeita destino inseguro | Teste de toque/TalkBack Android. **Parcialmente concluída** |
| 14 Navegação | Menu sem Cupons e Perfil; acesso por gestos em buscas | main.dart cinco destinos; Perfil preserva conta, buscas, alertas, lojas, notificações e privacidade; PopScope | T cinco destinos/voltar e persistência de navegação | Deep links e navegador externo reais. **Implementada, aguardando validação** |
| 15 Busca | Favoritos compartilhavam controller do feed; catálogo incompleto | main.dart controller separado; API preserva dedup/backoff e estados assíncronos; catálogo separado | T pesquisa local não altera feed/não requisita; APIs/paginação | Busca real por marca depende do conteúdo indexado/origem. **Parcialmente concluída** |
| 16 Categorias/filtros | Categorias limitadas às ofertas carregadas | services/api.dart/main.dart + supabase/functions/radar-offers-feed/index.ts: catalog=1 paginado da conta fixa | C5/5; T categoria sem ofertas; HTTP13 categorias/3lojas | Loja é explicitamente filtro das ofertas carregadas; novos filtros requerem suporte real. **Parcialmente concluída** |
| 17 Cupons | Acesso fraco e duplicação do mesmo ID | screens/stores_coupons.dart integrado ao tab; código exato, dedup e condições desconhecidas informadas | T cópia/dedup/ausência de códigos; V | Validade e aplicabilidade na loja não testadas com cupom real. **Parcialmente concluída** |
| 18 Favoritos/buscas/alertas | Risco de perda de entradas locais e recursos confundidos com conta | Preservada persistência existente/entradas ilegíveis; menus acessíveis; favoritos pesquisáveis separadamente | T persistência, notificações negadas, dedup e confirmação de entrega | Push e segundo plano com app encerrado não homologados; atualização instalada pendente. **Parcialmente concluída** |
| 19 Comunidade | Fluxos dependem do backend/navegador e gateway429 | Inspecionadas rotas existentes e testes de links; nenhum voto/comentário/publicação real enviado | T valida destinos/codificação, não operação real autenticada | Antispam, permissões e fluxo completo real. **Bloqueada** |
| 20 Login/cadastro/perfil | Auth hospedada; exclusão é solicitação, não exclusão efetiva | Perfil mantém fluxos existentes; account/deletion-request inspecionado (requireIdentity/same-origin/accountDeleted=false) | T links/login sem token na URL; inspeção backend | Gateway429; sessão/recuperação/exclusão efetiva e privacidade integral. **Bloqueada** |
| 21 Temas | Campos/ícones fixos e inconsistências | design/radar_theme.dart; main.dart; preferences.dart; componentes existentes preservados | T ambos os temas e V18 telas | Inspeção visual de aparelho/diálogos e imagens reais. **Implementada, aguardando validação** |
| 22 Movimento | Transição ignorava preferência do sistema | RadarReducedMotionTransitions delega normalmente e elimina transição quando solicitado | T movimento normal/reduzido e telas com redução ativada | Fluidez e preferência Android no aparelho. **Implementada, aguardando validação** |
| 23 Erros/carregamento | 429, respostas inválidas, cache confundido com atual | services/api.dart e main.dart preservam pausa/timeout/erro específico; catálogo com retry e estado parcial | T Retry-After/data HTTP, concorrência, cache offline, vazio vs falha | Disponibilidade real do Hatchable continua bloqueada por cota. **Parcialmente concluída** |
| 24 Acessibilidade | Alvos pequenos, exclusão só por gesto, textos cortados | Tema48dp, labels, menus e toolbars adaptáveis; main/preferences | T contraste central, fonte200%, destinos e telas secundárias | TalkBack, ordem de foco real e WCAG2.2AA integral não comprovados. **Parcialmente concluída** |
| 25 Desempenho/conversão | Rede duplicada, imagens grandes e ausência de métricas reais | Preservados coalescing, paginação, cache e decode limitado; testes de jornada afiliada | T dedup/rede/cache/links; sem métricas inventadas | Inicialização, memória, bateria, tamanho release e aparelho intermediário. **Parcialmente concluída** |

## Preservação, restauração e entrega

- Mesmo repositório, branch e PR; nenhum merge em main, force push, exclusão de arquivo ou dado, migração, mudança de credencial ou envio externo real. Nenhuma dependência de aplicativo adicionada nesta execução.
- Supabase final: offers10360/categories22/offer_price_history0/operational_backups2, iguais à entrada. Contagem não comprova igualdade byte a byte de todos os dados ou restauração de backup; nenhum teste de restauração foi executado.
- A fonte da função existente foi lida novamente após implantação: v3 ACTIVE e arquivos index.ts/deno.json exatamente iguais à versão implantada/versionada, hash do bundle a95ea58dee17ccc790b5629512635071f94f4cc0df92c55a571d6e8bf4a69745. Rollback v2 está no commit d1504927ea0aaf1c99a39ee5a92022e372c65cb4.
- Hatchable principal v674 e auxiliar v3 reconfirmados, sem deploy do backend. Documentação privada atualizada separadamente; isso não significa sincronização bidirecional ou implantação de Flutter no Hatchable. As divergências históricas e backend específico de cada projeto foram preservados.
- Auditoria de segurança: npm audit moderado retornou zero vulnerabilidades. Advisors Supabase: 83 INFO de RLS sem políticas, não tratados como autorização para abrir acesso. Fluxos autenticados e segurança integral de produção continuam pendentes de execução real. Nenhuma service role adicionada ao cliente.
- APK histórico 0.3.1_arm64 foi somente lido para metadados: 18.452.287 bytes; SHA256 b32de273f22bdb8f427169e739ac74ba5c4d816f8019ca22181915997fe16511; versão0.3.1/code4, pacote br.com.radarpromo.radar_promo_ofertas, minSDK24, targetSDK36, cleartext=false. Não é um APK novo ou prova de integridade criptográfica da assinatura nesta execução.
- Fonte atual ainda declara pubspec0.2.0+2 e Gradle release com assinatura debug. A entrega definitiva requer versionCode superior a4 e assinatura compatível com o certificado existente; não foi trocada chave nem acessado arquivo privado de assinatura. Esses itens precisam ser resolvidos e validados na etapa final autorizada, sem divulgar segredos.
- Nenhum APK/AAB novo gerado. Sem link de instalação definitivo, Release, tamanho de build novo ou checksum inventado. A validação final em aparelho, atualização preservando dados, conta, feed atual e assinatura impedem conclusão integral das25.

Decisões sem orientação adicional: manter blue/radar existente; extração pequena do tema com export compatível; cinco tabs solicitados com buscas no Perfil; catálogo somente leitura na mesma função/conta e rollback versionado; lojas explicitamente locais; evidências rotuladas de widgets com fixtures; retenção3dias; não alterar políticas/dados/contas para contornar limites.


## Evidências finais consultadas

- [Código Flutter e recursos Android aprovados](https://github.com/emersongabriel29-pixel/radar-promo-brasil/actions/runs/45916859368): pub get/analyze/test99/aapt2 aprovados; APK skipped.
- [Backend CI aprovado](https://github.com/emersongabriel29-pixel/radar-promo-brasil/actions/runs/45916859358): build215 arquivos JS, Node259 testes, e2e3 testes, npm audit sem vulnerabilidades. E2E usa ambiente local de testes, não representa publicação no WhatsApp/Telegram ou validação da infraestrutura de produção.
- [18 capturas de widgets, dois manifestos](https://github.com/emersongabriel29-pixel/radar-promo-brasil/actions/runs/45916859368/artifacts/15163195203), retenção3dias. Inspeção direta de feed claro, detalhes escuros, categorias/cupons/perfil/buscas claros e preferências/privacidade escuros: textos e ícones legíveis após correção do carregamento de fontes. As imagens são das telas reais com dados de teste explicitamente rotulados. Não existe comparação antes/depois de aparelho ou baseline Golden aprovada.
- Execução local: build e Node passaram; e2e inicialmente falhou porque Chromium estava ausente. A tentativa de instalar Chromium não completou por falha de download. O mesmo e2e passou3/3 no CI com Chromium instalado. npm audit executado separadamente localmente:0 vulnerabilidades. Esses resultados não foram confundidos.
- Flutter local não foi iniciado novamente após bloqueio automático de inicialização do SDK que tentava acessar metadados da máquina. Usado CI autorizado como alternativa; nenhuma tentativa de contornar a restrição.

## Bloqueios que impedem a entrega definitiva

1. Hatchable auxiliar retorna429 usage_limit e impede homologação de conta/comunidade; sem contratação ou aumento de plano.
2. Feed Supabase normal retorna200 sem ofertas elegíveis; zero histórico de preços. Catálogo real foi corrigido sem habilitar ofertas/preços antigos. A coleta/validação de ofertas precisa produzir dados atuais verificáveis.
3. Assinatura release está configurada como debug no Gradle, e versão do fonte é inferior ao APK histórico. Corrigir e validar usando a mesma chave/certificado, sem substituição automática, é condição da etapa final. Nenhum APK debug foi apresentado como definitivo.
4. Não há validação de instalação/atualização/TalkBack/desempenho em aparelho nesta execução. Nem push com app encerrado nem exclusão efetiva da conta foram implementados/homologados por esta rodada.

Resultado global: as25 áreas têm diagnóstico e evidência/limitação registrados; **nenhuma das25 está declarada integralmente concluída e validada** segundo os critérios completos do prompt.18 parcialmente concluídas,5 implementadas aguardando validação,2 bloqueadas. Nenhuma não iniciada. A contagem é da matriz acima, não porcentagem de conclusão nem promessa de comportamento em produção.


## Arquivos e histórico técnico

Inventário por caminho/tamanho/hash em [evidence/android-25-source-inventory.json](./evidence/android-25-source-inventory.json). Diff da retomada:21 arquivos antes desta atualização documental; nenhum removido. Foram adicionados tema, cinco arquivos de teste Flutter, contrato Node e fonte da função existente. Sem dependências Flutter/npm alteradas. Código validado:4e4c957ca568b503c5ffde3e763883721bfdc7da. O commit que contém este relatório é uma atualização documental posterior, sem alterar o código testado.


## Continuidade — preparação segura de versão e assinatura

Entrada975272c, PR#221 e main1adc879 reconfirmados; Hatchable v674/v3 inalterados. GET auxiliar continua429:2.1h de banco utilizadas para cota2.0h. Fonte de verdade do app: branch de desenvolvimento; documentação privada Hatchable comparada pelo hash238873da. Sem alteração do backend, dados ou plano.

Impacto avaliado: pubspec passa de0.2.0+2 para0.3.2+5, superior ao APK histórico realmente inspecionado0.3.1/code4; identificador e dados locais inalterados. Gradle deixa de atribuir chave debug ao release. Reutiliza key.properties privado/variáveis de ambiente, verifica disponibilidade da chave privada e SHA256 do certificado contra pin existente. Falhas são genéricas e não imprimem caminhos, aliases, senhas ou exceções de keystore. Todas as tarefas release dependem da verificação. Debug e testes continuam disponíveis sem chave de produção; nenhum certificado é substituído.

Certificado público extraído do bloco v2 do APK histórico: c5f6176299c7cf0775050e36c84c1ac54e605a22b3d1c687f1ef541729fcd5a4, igual ao pin. Isso identifica o certificado embutido; não substitui verificação criptográfica completa do APK. O arquivo validation/apk-signature.txt refere-se a outro artefato de debug e foi preservado como histórico, não adotado como identidade de release.

Workflow passa a preparar exclusivamente release final assinado, APK e AAB, condicionado a generate_apk=true E audits_validated=true, false por padrão. Secrets apenas referenciados por nome, sem cadastro/alteração nesta tarefa. Não acionado. CI adiciona configuração Gradle e teste negativo de ausência de credenciais sem compilar app; resultados aguardando execução. README corrigido para retirar instruções antigas de release debug/workflow inexistente. Rollback por revert desta alteração, sem mudança de dados/credenciais.

Documentação oficial consultada: https://docs.flutter.dev/deployment/android e https://developer.android.com/studio/publish/app-signing . A compilação e a validação instalada continuam restritas à etapa final do prompt mestre.
