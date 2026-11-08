# Ciclo de vida e validação de ofertas

## Estados conceituais
DISCOVERED → NORMALIZED → PENDING_VALIDATION → VALIDATED ou BLOCKED_WITH_REASON → PENDING_AFFILIATE_LINK → LINK_READY → PENDING_APPROVAL → SCHEDULED → SENT_CONFIRMED. Falhas recuperáveis e terminais preservam estado anterior, motivo, tentativa e próxima ação. Adaptar aos enums existentes; não criar migração sem auditoria.

## Evidências
Origem, IDs externos, URL original/afiliada, SubID, preço, moeda, desconto, disponibilidade, imagem, título, categoria, timestamps e fonte de cada campo.

## Validação
Preço e horário de fonte confiável; desconto somente com referência comprovável; frete/estoque não inventados; URL HTTPS e destino coerente; rastreamento preservado; imagem acessível e permitida; produto conforme regras de segurança e canal; duplicidade sem apagar origem secundária.

## Bloqueios
Código e motivo legível, data, regra aplicada e revisão possível. Ausência de informação pode significar pendência, não reprovação automática.

## Atualização
Alterações de preço, estoque, URL e campanha atualizam snapshot e histórico. Cache tem TTL por dado e não apresenta dado vencido como atual.

Oferta descoberta/validada não equivale a pronta para publicar.