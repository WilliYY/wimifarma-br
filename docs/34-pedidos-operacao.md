# 34 - Organização do painel de pedidos

## Apresentação operacional

`/admin/pedidos` separa os pedidos carregados em filtros de situação, com contadores e busca por número, cliente, telefone ou produto. O filtro de status operacional continua disponível e combina com a situação selecionada. Trocar a situação limpa apenas o filtro de status; a busca permanece.

- **Pedidos feitos:** pedidos `PENDING`, inclusive os já pagos que ainda aguardam confirmação operacional.
- **Em andamento:** pedidos `CONFIRMED`, `PREPARING`, `READY` e `OUT_FOR_DELIVERY`.
- **Concluídos:** pedidos `COMPLETED` sem cancelamento ou estorno financeiro.
- **Cancelados / estornados:** pedido `CANCELED`, pagamento `CANCELED`/`REFUNDED` ou tentativa online `FAILED`, `CANCELED`, `REFUNDED`/`DISPUTED`. Esses estados prevalecem na classificação visual para evitar apresentar um pedido financeiramente encerrado na fila de preparação.

Os contadores representam somente os registros carregados pelo painel, não uma consulta integral ao histórico. Os filtros não alteram dados, permissões, estoque, cashback ou transições do pedido. Status operacional e estado financeiro aparecem separados em cada card.

## Pagamentos e alertas

Os cards usam mais espaço para número, total, cliente, atendimento e itens. O estado financeiro permanece no cabeçalho. Referência e detalhes do Mercado Pago ficam recolhidos em **Detalhes do pagamento**, acessível por teclado.

Os avisos de homologação, confirmação incerta (`UNKNOWN`/`SUBMITTING`) e reembolso parcial ficam sempre visíveis. Estados incertos e reembolso parcial não são classificados como cancelamento. Pedidos de teste não podem avançar para preparação; pagamentos online continuam dependentes do provedor e das restrições existentes.

Cancelamentos e estornos online continuam no painel Mercado Pago, com conciliação posterior. O link de consulta abre a área de atividades da conta; não inicia cobrança nem reembolso. As ações existentes de andamento e pagamento manual e os controles da API não foram alterados. Contratos: `12-carrinho-checkout-pedidos.md` e `28-mercado-pago.md`.

## Validação

`src/features/orders/admin-presentation.test.ts` cobre todos os estados operacionais, pagamento pago/pendente, cancelamento, estorno, contestação, falha, incerteza, reembolso parcial e busca. Execução direcionada: `node --import tsx --test src/features/orders/admin-presentation.test.ts`.

Nenhum schema, regra financeira, dependência ou fluxo de gateway foi criado nesta mudança.
