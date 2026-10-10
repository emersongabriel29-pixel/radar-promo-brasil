# Regra obrigatória: consistência entre Hatchable e GitHub

## Estado conhecido da integração

O projeto Radar Promo Brasil existe no Hatchable e no repositório GitHub `emersongabriel29-pixel/radar-promo-brasil`. A existência de conexão entre as plataformas **não significa sincronização bidirecional automática**. O fluxo observado anteriormente exportava alterações do Hatchable para o GitHub, mas não garantia que alterações feitas diretamente no GitHub voltassem ao Hatchable.

Até que a sincronização bidirecional seja confirmada por teste real e documentação da plataforma, trate os dois ambientes como fontes que podem divergir.

## Procedimento obrigatório antes de alterar código

1. Identificar a plataforma e o projeto exatos onde a alteração será feita.
2. Consultar a versão/commit mais recente do GitHub e a versão implantada e os arquivos atuais do Hatchable.
3. Verificar se existem alterações pendentes ou divergentes antes de editar. Não presumir que uma plataforma contém automaticamente as mudanças da outra.
4. Definir explicitamente qual versão é a fonte de verdade para a tarefa atual e preservar alterações válidas dos dois lados.
5. Fazer as alterações de forma controlada e registrar o que mudou, em qual plataforma, e qual commit/versão contém a alteração.
6. Depois da alteração, conferir os arquivos correspondentes nas duas plataformas. Se não houver sincronização automática confirmada, reconciliar as mudanças explicitamente; nunca sobrescrever um lado cegamente.
7. Antes de publicar, executar os testes disponíveis e confirmar que o código implantado corresponde ao conteúdo esperado. Registrar a versão/commit implantado.
8. Se não for possível verificar equivalência, declarar claramente a divergência e bloquear a afirmação de que está sincronizado ou pronto para produção.

## Regras de segurança

- Nunca copiar segredos, tokens ou credenciais entre plataformas em documentação, commits ou mensagens.
- Não criar uma automação que sobrescreva arquivos ou faça deploy sem detectar conflitos e sem validar o destino.
- Não afirmar que a integração funciona só porque o projeto aparece conectado ou porque um deploy foi concluído.
- Toda falha de sincronização deve ser registrada com os arquivos afetados, os commits/versões conhecidos e o próximo passo seguro.

## Critério para considerar sincronizado

Só marcar como sincronizado depois de comparar o conjunto de arquivos relevantes e confirmar que as alterações pretendidas estão presentes nos dois lados, sem mudanças pendentes conhecidas. Um deploy bem-sucedido, isoladamente, não comprova sincronização com o GitHub.

## Melhoria de plataforma solicitada

É desejável uma integração oficial Hatchable ↔ GitHub bidirecional com estado visível, commits/versões associados, detecção de conflitos, aviso de alterações pendentes e confirmação do commit/versão que será implantado. Até que isso exista e seja validado, o procedimento manual acima é obrigatório.
