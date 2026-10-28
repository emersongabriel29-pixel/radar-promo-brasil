# Protótipo independente do Cupom Radar

Demonstração local baseada em fluxos observáveis publicamente. Este diretório foi mantido isolado do código executável do Radar Promo Brasil.

## Executar localmente

Requisitos: Node.js 20 ou superior e npm. Para executar os testes E2E, é necessário Google Chrome instalado; alternativamente, defina `CHROME_PATH` para o executável do Chromium/Chrome disponível.

```powershell
cd prototypes/cupom-radar-investigation
npm ci --ignore-scripts
npm test
npm run serve
```

O servidor escuta somente em `127.0.0.1:4175` por padrão. Para mudar a porta, defina a variável `PORT` antes de executar `npm run serve`.

## Escopo

- Navegação, painel, formulário de postagem, ofertas sintéticas, modelos locais, Fila/Lista, copiador manual, agendamento demonstrativo, canais, Stories, bio link, relatórios e integrações desconectadas.
- Cinco testes Playwright verificam navegação, validação, armazenamento local, estado de duplicidade e responsividade.
- As capturas em `screenshots/` mostram somente o protótipo desktop e mobile.

Todos os dados são fictícios. O protótipo não conecta a APIs, banco de dados, marketplaces, contas sociais ou canais de mensagem; não converte links afiliados nem envia publicações. O editor de modelos grava no `localStorage` deste navegador, enquanto Fila, agenda, relatórios e integrações são estados demonstrativos.

O protótipo foi construído manualmente. Não contém código privado, credenciais, tokens, cookies, HTML capturado do site, screenshots do site de referência ou ativos de marca do Cupom Radar.

O pacote de investigação e a comparação com o Radar Promo estão em [`investigation/`](investigation/README.md) e em [COMPARACAO-COM-RADAR-PROMO.md](COMPARACAO-COM-RADAR-PROMO.md).
