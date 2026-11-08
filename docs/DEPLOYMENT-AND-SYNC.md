# Deploy e sincronização GitHub ↔ Hatchable

GitHub e Hatchable são independentes até prova de sincronização bidirecional. Deploy não prova sincronização.

## Antes
Confirmar repositório/branch/commit; projeto/versão/manifesto Hatchable; comparar arquivos relevantes; detectar arquivos exclusivos e mudanças pendentes; definir fonte de verdade; criar branch e preservar mudanças válidas.

## Depois
Comparar novamente; executar testes; dry-run Hatchable quando aplicável; revisar erros/warnings; deploy somente autorizado; confirmar versão live e rotas; registrar commit, versão, arquivos e divergências.

Não copiar arquivos em massa cegamente. Não substituir package.json, migrations, cron ou funções sem comparar. Não declarar sincronizado se houver divergência.

Estado de 08/11/2026: package.json divergente, diferenças em arquivos de cron/integração examinados e docs ausente do inventário Hatchable. Ver KNOWN-STATE-2026-11-08.md.