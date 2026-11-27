# APK novo solicitado — Radar Promo Ofertas0.3.2+5

O usuário solicitou explicitamente “Não, gere um novo”, após ser informado de que as25auditorias ainda não estão integralmente homologadas. Esta nova instrução autoriza uma compilação de teste agora; não autoriza declarar auditorias concluídas ou APK definitivo de produção.

Entrada3fa7d09, mesma branch fix/android-consolidation-20261126 e PR221; main1adc879. Hatchable674/3 reconfirmados; não serão modificados backend, banco, credenciais ou critérios do feed. Fonte de verdade do Flutter: branch de desenvolvimento, código já validado com99testes. Identificador e certificado existentes preservados.

Impacto: acrescentar temporariamente ao workflow existente uma compilação de teste condicionada exclusivamente a push desta branch com mensagem de commit única desta solicitação. Nenhum workflow automático de auditoria comum passa a gerar APK. O bloco será removido após entrega/falha diagnosticada. Não declarar audits_validated=true nem contornar o guard do release.

Se os secrets existentes de assinatura estiverem disponíveis no CI, compilar release com a chave existente/pin. Caso indisponíveis, gerar build debug explicitamente de teste e assiná-lo localmente com o mesmo PKCS12 original recuperado, fora do GitHub, verificando o certificado e integridade com apksigner. Esse teste não será apresentado como produção, e o guard de release permanecerá inalterado. Nenhuma chave/senha será adicionada ao repositório, artefato ou logs.

Build arm64, versão0.3.2/code5, pacote br.com.radarpromo.radar_promo_ofertas. Após compilar, verificar manifesto, assinatura, SHA256 e tamanho reais; instalação/atualização em aparelho não será afirmada sem execução. Limitações de feed vazio, quota429, conta/comunidade, push e exclusão efetiva permanecem. Não publicar ofertas/mensagens nem alterar plano.

## Resultado verificado

Compilação no commit b7a1c6eae234ca9278f5461a9ea032008314445e, push run45970410330/job140409170915, aprovada. Análise e99testes Flutter, recursos e verificações Gradle aprovados antes do build. Secrets de assinatura não estavam disponíveis no CI: foi compilado APK debug de teste e assinado localmente com a chave PKCS12 original, sem enviar credenciais ao GitHub ou alterar o guard do release.

- Aplicativo: Radar Promo Ofertas.
- Versão:0.3.2; versionCode5.
- Identificador:br.com.radarpromo.radar_promo_ofertas.
- Build:debug de teste, debuggable=true, testOnly=false; não é release definitivo de produção.
- Arquitetura do engine Flutter:arm64-v8a. Bibliotecas auxiliares também contêm outras ABIs, sem tornar esse engine universal.
- minSDK24/Android7; targetSDK36.
- Tamanho:83.201.166bytes (83,2MB decimais).
- SHA256:d8bccf4a41168529b4caf9984a692c0a768db6b32de89406a9cbdb170b7d8476.
- Certificado SHA256:c5f6176299c7cf0775050e36c84c1ac54e605a22b3d1c687f1ef541729fcd5a4, igual ao APK0.3.1 e ao pin preservado.
- apksigner verify --verbose --print-certs:aprovado, um signatário. ZIP íntegro; bibliotecas nativas não comprimidas alinhadas em16KB após assinatura. usesCleartextTraffic=false.

Instalação/atualização no aparelho não executadas. Compatibilidade da assinatura foi verificada no binário, sem afirmar preservação de dados instalada. Atualizar sobre versão com mesmo certificado, evitando desinstalar para não apagar dados locais. Feed atual pode permanecer vazio e conta/comunidade seguem limitadas pela quota429; push em segundo plano e exclusão efetiva continuam pendentes.

O gatilho pontual e os passos temporários de build foram removidos após esta compilação; workflow de auditoria volta ao conteúdo anterior, sem APK automático. Não houve geração de AAB, publicação de oferta/mensagem, alteração de backend/banco/plano ou nova assinatura. O APK de teste tem checksum diferente do artefato intermediário do CI porque recebeu a assinatura original localmente.

[Workflow aprovado](https://github.com/emersongabriel29-pixel/radar-promo-brasil/actions/runs/45970410330). Entrega confirmada: [Baixar Radar_Promo_Ofertas_0.3.2_arm64_teste.apk](https://chatgpt.com/library?file_id=libfile_335fac1f38d88191a6a340c248597588&account_id=personal). Arquivo salvo e metadados locais aplicados; não é o artefato debug com assinatura temporária do CI.

