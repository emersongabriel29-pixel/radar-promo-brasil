# Testes e critérios de aceite

## Scripts encontrados no GitHub main
npm run build; npm test; npm run test:e2e; npm audit --audit-level=moderate; npm run check:release (sequência completa). Conferir package.json do ambiente a testar: GitHub e Hatchable divergiam na auditoria de 08/11/2026.

## Camadas
Unitários; integração com mocks/sandbox; banco e migrações; filas e concorrência; scheduler/timezone; E2E e autorização; carga e backpressure; segurança.

## Testes seguros
Fixtures, sandbox e destinos autorizados. Não publicar, enviar mensagens reais, gerar transações, consumir créditos desnecessários ou modificar dados reais sem autorização.

## Aceite
Resultado reproduzível; sem regressões; falhas isoladas; fila persiste e retoma sem duplicidade; limites externos respeitados; consumo medido; logs sem segredos; rollback documentado; commit e deploy identificados; rotas verificadas.

Relatar data, ambiente, commit, comando, exit code, resumo e falhas. “Não executado” não é “aprovado”.