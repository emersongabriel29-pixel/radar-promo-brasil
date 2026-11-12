# Migração do banco do Radar Promo Brasil para Supabase
Data da auditoria: 12/11/2026

> Registro histórico da auditoria inicial de criação do projeto. O estado operacional atualizado, incluindo schema reconstruído, ponte, segurança e pendências, está em [STATUS-SUPABASE-RADAR-2026-11-12.md](STATUS-SUPABASE-RADAR-2026-11-12.md).

## Objetivo e regra de segurança

O titular solicitou que o Supabase passe a ser o banco de dados do Radar Promo Brasil. A migração deve preservar o comportamento atual, os dados, filas, credenciais, integrações, rotinas e histórico. Não desligar nem esvaziar o PostgreSQL atual do Hatchable antes da validação e do corte controlado.

## Projeto Supabase de destino criado

- Nome: Radar Promo Brasil
- Project ref: `runnmpzkomcdawwzuift`
- Região: `sa-east-1` (São Paulo, Brasil)
- URL: `https://runnmpzkomcdawwzuift.supabase.co`
- Estado na criação: `ACTIVE_HEALTHY`
- Estimativa retornada para o projeto: US$ 0/mês
- O projeto existente Feiraê (`atnwxxyaxlsnlfulhums`) não foi reutilizado nem alterado.
- Estado inicial verificado: nenhuma tabela pública e nenhuma migration aplicada.

## Origem atual

- Aplicação e banco atuais: Hatchable, projeto `proj_1Xj94QxQmCam`.
- Versão de produção no início desta etapa: v667.
- Snapshot do schema retornou 68 tabelas.
- Diretório de migrations do Hatchable contém 74 arquivos SQL (inclui prefixos repetidos e históricos; não aplicar cegamente em ordem lexical no destino).
- Busca no código encontrou 99 arquivos de rota importando `db` do SDK `hatchable`, 486 chamadas `db.query(` e 4 pontos de uso de `db.transaction(`.
- O runtime Hatchable é V8 isolado; não é um host Node tradicional e não instala pacotes npm no deploy. A camada de banco atual está acoplada ao SDK Hatchable, portanto trocar apenas uma URL ou uma variável não migra a aplicação.

## Evidências e bloqueios encontrados

- O projeto Supabase de destino está saudável, mas vazio: 0 tabelas e 0 migrations.
- O snapshot de schema do Hatchable está disponível, mas não inclui chaves estrangeiras; a consulta complementar via `information_schema` excedeu o statement timeout do banco atual.
- A cota mensal do banco Hatchable já havia sido excedida e as funções estão pausadas até 02/12/2026. Uma consulta de introspecção também foi cancelada por statement timeout. Não foi possível exportar os dados, validar FKs nem medir o volume das tabelas.
- Nenhum dado foi exportado ou importado nesta etapa.
- Nenhuma chave, senha, token, credencial ou connection string foi copiada para este documento ou para o Git.

## Arquitetura de migração a validar

A documentação atual do Supabase permite conexão PostgreSQL a partir de Edge Functions usando driver Deno Postgres e a variável gerenciada `SUPABASE_DB_URL`. Para funções serverless, a recomendação é usar pooler em modo transação, com pool pequeno, SSL e prepared statements desativados quando aplicável.

A implementação precisa escolher e testar uma camada server-to-server segura entre as rotas Hatchable e o Postgres Supabase. Não expor chave service-role, senha de banco ou token privilegiado no navegador, HTML público ou GitHub. Não criar endpoint público de SQL arbitrário sem autenticação forte, validação de parâmetros, proteção contra replay e limitação de operações. A camada deverá preservar o contrato atual de `db.query` e `db.transaction` ou substituir cada chamada com operações equivalentes verificadas.

## Plano obrigatório antes do corte

1. Restaurar o acesso/limite do banco Hatchable ou obter exportação completa e consistente por meio suportado.
2. Inventariar as 68 tabelas, colunas, tipos, defaults, PKs, FKs, índices, constraints, sequences, triggers, funções e extensões realmente utilizadas. Comparar schema vivo com todas as migrations e resolver divergências sem aplicar migrations históricas cegamente.
3. Medir contagens e volume por tabela; exportar dados em lotes com cursor, incluindo filas, ofertas, publicações, contas, integrações e eventos. Preservar IDs e sequências.
4. Classificar dados sensíveis e validar as chaves de criptografia atuais antes de copiar credenciais cifradas. Não regenerar ou perder chaves sem plano de compatibilidade.
5. Criar migrations Supabase versionadas, com RLS habilitado nas tabelas expostas. O projeto não deve conceder acesso público por padrão; as tabelas novas não são automaticamente expostas pela Data API a partir da mudança de 30/10/2026.
6. Implementar a camada de conexão segura e adaptar os 99 arquivos de rota, incluindo os 4 pontos transacionais. Preservar semântica SQL, locks, SKIP LOCKED, transações, resultados, timeouts e isolamento por account_id.
7. Executar testes em ambiente isolado: contratos de cada rota, filas concorrentes, idempotência, webhooks, OAuth, publicação simulada sem enviar mensagens reais, RLS, carga e recuperação.
8. Importar dados e comparar contagens, amostras, relações e sequências entre origem e destino.
9. Fazer leitura sombra e, depois, janela de corte com backup recente, congelamento breve de escritas, delta final, smoke tests e plano de rollback para o Hatchable.
10. Somente após aprovação dos testes, apontar produção para Supabase. Manter o banco Hatchable intacto e disponível para rollback até a estabilidade ser comprovada.

## Estado desta etapa

- [x] Criado projeto Supabase dedicado em São Paulo, separado do Feiraê.
- [x] Confirmado custo estimado inicial de US$ 0/mês.
- [x] Confirmado que o destino está saudável e vazio.
- [x] Inventariada a superfície de acoplamento ao SDK Hatchable (68 tabelas, 99 rotas, 486 queries, 4 pontos transacionais, 74 arquivos SQL).
- [ ] Exportar e validar dados de origem — bloqueado pelo limite/timeout do banco Hatchable.
- [ ] Recriar schema, constraints e dados no Supabase.
- [ ] Configurar e validar conexão segura entre Hatchable e Supabase.
- [ ] Adaptar e testar todas as rotas.
- [ ] Executar cutover de produção e rollback testado.

**Estado operacional:** a aplicação continua usando o banco Hatchable. A criação do projeto Supabase não alterou o banco de produção nem transferiu tráfego. Não declarar a migração concluída até cumprir todos os itens acima.
