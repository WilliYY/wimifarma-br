# Regras de Negocio

## WhatsApp

O WhatsApp e o canal principal de conversao nesta fase. O site deve reduzir atrito e levar o cliente para atendimento humano.

## Ofertas

Ofertas podem ter produto associado, preco original, preco promocional, status, validade, destaque e texto de WhatsApp.

## Cupons

Cupons podem ter codigo, descricao, tipo de desconto, validade, limite de uso e contador de usos. O contador atual indica usos registrados no cupom; identificacao unica de pessoas por cupom ainda depende de fluxo futuro de pedido/cliente.

## Farmacia Popular

A pagina orienta o cliente e chama para confirmacao. O sistema nao deve prometer disponibilidade automatica sem validacao da equipe.

## Roleta

A roleta deve registrar campanha, premio, telefone, cliente quando existir, status e metadados. Probabilidades e limites precisam ser configuraveis antes de ativar campanha real.

## Cashback

Cashback por produto usa percentual inicial de 2%, configuravel pelo ADMIN. Clientes autenticados acumulam pendencia no pedido e recebem credito somente apos conclusao e pagamento confirmado. Cancelamentos/reembolsos anulam ou estornam o beneficio, sem duplicacao. Produtos anteriores ficam desabilitados e pedidos anteriores nao recebem credito retroativo. Resgate online ainda nao implementado. Contrato e limites em `docs/15-cashback-produtos.md`.

## Dados reais

Nao usar dados reais em seed, testes ou exemplos.
