# APK novo solicitado — Radar Promo Ofertas0.3.2+5

O usuário solicitou explicitamente “Não, gere um novo”, após ser informado de que as25auditorias ainda não estão integralmente homologadas. Esta nova instrução autoriza uma compilação de teste agora; não autoriza declarar auditorias concluídas ou APK definitivo de produção.

Entrada3fa7d09, mesma branch fix/android-consolidation-20261126 e PR221; main1adc879. Hatchable674/3 reconfirmados; não serão modificados backend, banco, credenciais ou critérios do feed. Fonte de verdade do Flutter: branch de desenvolvimento, código já validado com99testes. Identificador e certificado existentes preservados.

Impacto: acrescentar temporariamente ao workflow existente uma compilação de teste condicionada exclusivamente a push desta branch com mensagem de commit única desta solicitação. Nenhum workflow automático de auditoria comum passa a gerar APK. O bloco será removido após entrega/falha diagnosticada. Não declarar audits_validated=true nem contornar o guard do release.

Se os secrets existentes de assinatura estiverem disponíveis no CI, compilar release com a chave existente/pin. Caso indisponíveis, gerar build debug explicitamente de teste e assiná-lo localmente com o mesmo PKCS12 original recuperado, fora do GitHub, verificando o certificado e integridade com apksigner. Esse teste não será apresentado como produção, e o guard de release permanecerá inalterado. Nenhuma chave/senha será adicionada ao repositório, artefato ou logs.

Build arm64, versão0.3.2/code5, pacote br.com.radarpromo.radar_promo_ofertas. Após compilar, verificar manifesto, assinatura, SHA256 e tamanho reais; instalação/atualização em aparelho não será afirmada sem execução. Limitações de feed vazio, quota429, conta/comunidade, push e exclusão efetiva permanecem. Não publicar ofertas/mensagens nem alterar plano.

Resultado: aguardando compilação real e validação do arquivo.
