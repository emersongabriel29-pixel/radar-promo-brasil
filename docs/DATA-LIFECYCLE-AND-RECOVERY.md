# Dados, retenção, backup e recuperação

Definir retenção por classe: payload bruto, oferta, snapshots de preço, eventos, logs, publicações, cliques, conversões e auditoria. Não excluir globalmente sem análise de dependências e obrigações.

Usar chaves estáveis, constraints, transações e migrações versionadas. Auditar órfãos, duplicidade, índices, tamanho e consultas lentas.

Backups documentam frequência, retenção, criptografia, localização, permissões e custo. Backup só é válido após teste de restauração. Definir RPO/RTO com base em capacidade real, sem inventar metas.

Recuperação: delimitar falha; conter; preservar snapshot/logs; restaurar isolado; validar schema/contagens/constraints; reconciliar filas/eventos; retomar gradualmente; verificar duplicidade; registrar causa-raiz.

Migração destrutiva exige autorização explícita e backup validado.