# 12 - Carrinho, Checkout e Pedidos

## Escopo Entregue

- Carrinho persistente no navegador, com quantidade, remocao e resumo.
- Checkout em quatro etapas: identificacao, entrega/retirada, pagamento e revisao.
- Entrega gratuita limitada a Ivate-PR e retirada na Wimifarma.
- Preferencias de pagamento: Pix, cartao na entrega/retirada e dinheiro.
- Pedido pendente no PostgreSQL, com snapshot de produto, preco e quantidade.
- Painel `/admin/pedidos` com busca, filtro, dados operacionais e transicoes controladas.

## Regras de Seguranca e Negocio

- O navegador envia o preco esperado apenas para detectar alteracao; o banco e a fonte de verdade.
- O servidor recusa produto inexistente, nao publicado, sem estoque suficiente, com preco alterado, com receita ou Farmacia Popular.
- O pedido nasce `PENDING`, com pagamento `PENDING`, e nao reduz estoque automaticamente.
- Nenhum numero de cartao, CVV, senha bancaria ou chave Pix do cliente e solicitado ou armazenado.
- A equipe deve confirmar disponibilidade, total e atendimento antes de orientar o pagamento.

## Estados

Pedido: `PENDING`, `CONFIRMED`, `PREPARING`, `READY`, `OUT_FOR_DELIVERY`, `COMPLETED`, `CANCELED`.

Pagamento: `PENDING`, `PAID`, `CANCELED`, `REFUNDED`.

As transicoes permitidas ficam em `src/features/orders/checkout.ts`; saltos e alteracoes depois de estados terminais sao recusados pela API. A atualizacao usa o estado anterior como condicao para impedir sobrescrita silenciosa quando duas pessoas operam o mesmo pedido.

## Avaliacoes Verificadas

- Somente uma sessao de cliente com pedido `COMPLETED` pode avaliar um produto presente naquele pedido.
- Cada cliente possui no maximo uma avaliacao por produto e pode atualizar nota e comentario.
- A pagina publica mostra apenas avaliacoes publicadas, com nome abreviado e sem numero do pedido ou outros dados pessoais.
- A API limita nota, tamanho do comentario e frequencia de envios. Moderacao administrativa e denuncia de conteudo ficam para uma proxima fase se o volume justificar.

## Proxima Fase

Escolher e homologar gateway/adquirente, definir Pix dinamico, antifraude, conciliacao, estorno, nota fiscal, reserva de estoque, frete fora de Ivate e fluxo regulatorio para medicamentos com receita. Essa fase exige contrato, credenciais no servidor, revisao juridica e testes em sandbox antes de producao.
