# Deploy e sincronização GitHub ↔ Hatchable

GitHub e Hatchable são independentes até prova de sincronização bidirecional. Deploy não prova sincronização.

## Antes
Confirmar repositório/branch/commit; projeto/versão/manifesto Hatchable; comparar arquivos relevantes; detectar arquivos exclusivos e mudanças pendentes; definir fonte de verdade; criar branch e preservar mudanças válidas.

## Depois
Comparar novamente; executar testes; dry-run Hatchable quando aplicável; revisar erros/warnings; deploy somente autorizado; confirmar versão live e rotas; registrar commit, versão, arquivos e divergências.

Não copiar arquivos em massa cegamente. Não substituir package.json, migrations, cron ou funções sem comparar. Não declarar sincronizado se houver divergência.

Estado de 08/11/2026: package.json divergente, diferenças em arquivos de cron/integração examinados e docs ausente do inventário Hatchable. Ver KNOWN-STATE-2026-11-08.md.

## Divergência intencional de package.json e localização da documentação
A comparação de conteúdo confirmou que `hatchable.toml`, `api/jobs/hourly.js`, `api/jobs/shopee.js` e `api/jobs/lomadee-link-queue.js` coincidem exatamente entre Hatchable v645 e GitHub main. `package.json` diverge: GitHub contém scripts de build/test/e2e/audit para desenvolvimento; Hatchable contém apenas `node --test` e metadados de atualização. Não sobrescrever o manifesto do runtime com o package de desenvolvimento sem validar o contrato de deploy. O Hatchable aceita gravação apenas em `public/**`, `api/**`, `migrations/**` e arquivos raiz permitidos; não aceita `docs/**` como caminho de projeto. Não publicar documentos operacionais privados em `public/` para simular sincronização. A documentação mestre permanece versionada no GitHub.


## Versões finais após correção
GitHub main recebeu os merges #181, #182 e #183. Hatchable está live na v647. A lógica `lib/recurrences.js` foi comparada byte a byte entre main e Hatchable após o deploy. A documentação mestre completa está no GitHub; não foi copiada para `public/` do Hatchable para não expor detalhes operacionais/segurança.
