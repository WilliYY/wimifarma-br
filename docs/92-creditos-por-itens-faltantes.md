# 92 — Crédito por item faltante

## Autorização e escopo — 20/10/2026

O lojista pediu que a diferença de uma unidade indisponível na distribuidora pudesse virar crédito para compra futura, com uso semelhante ao cashback. A proposta é feita por ADMIN para um item de pedido pago; o titular escolhe crédito ou solicita reembolso. Não há concessão automática, emissão em lote, alteração dos mínimos de frete ou criação de movimentos financeiros em produção durante o desenvolvimento.

O crédito de compra tem conta e livro próprios (`StoreCreditAccount`/`StoreCreditTransaction`), separados de cashback promocional e WimiCoins. Sem saque, transferência, expiração ou bonificação adicional. A escolha não elimina a alternativa de reembolso prevista no CDC, arts. 35 e 51. Solicitar reembolso registra a solicitação para a equipe; não significa que o gateway devolveu o dinheiro.

## Contrato financeiro

- Snapshots de preço, quantidade e descontos originais são preservados. `OrderItemShortage` registra o intervalo de unidades, o rateio original, a versão e o aceite. `shortageQuantity` informa quantas unidades não serão entregues após aceite.
- Valores em centavos inteiros. De cada unidade faltante, só o líquido efetivamente pago em dinheiro gera crédito novo; cashback, WimiCoins e crédito anterior voltam às carteiras originais. O desconto Pix não vira crédito.
- Acumuladores de restituição e benefícios anulados no pedido impedem que um cancelamento devolva novamente parcelas já restituídas. Ganhos de cashback/Coins não incidem sobre unidades faltantes. Reembolso financeiro confirmado revoga apenas a emissão nova, inclusive se já utilizada; saldo negativo impede novos resgates.
- Mero cancelamento de status com pagamento ainda PAID não revoga crédito de dinheiro aceito. Reembolso parcial sem vínculo comprovado com a falta exige revisão e bloqueia uso de crédito afetado.
- Locks seguem pedido → Customer → cashback → crédito de compra → WimiCoins → ofertas de distribuidor. Chaves únicas, comparação de versão e auditoria tornam repetição idempotente.
- Reserva da unidade faltante é liberada sob lock da oferta; quantidade já consumida é reduzida apenas no controle interno do distribuidor. Não se presume devolução física nem se aumenta estoque da farmácia.

## Interfaces e permissões

- `POST /api/pedidos/[id]/faltas`: ADMIN propõe `orderItemId`, `quantity` e `expectedUpdatedAt`. O servidor calcula todos os valores; nenhum valor financeiro é aceito do navegador.
- `POST /api/minha-conta/pedidos/[id]/faltas`: cliente ativo decide `shortageId`, `version`, `decision` (`ACCEPT_CREDIT`/`REQUEST_REFUND`); aceite requer `consent: true`. O pedido deve pertencer à sessão.
- `GET /api/minha-conta/creditos`: saldo e extrato do próprio cliente, sem cache público. Checkout usa `storeCreditRedeemCents` com seleção explícita e identidade revalidada.
- O administrativo mostra a quantidade original e a quantidade para entrega, proposta/decisão e situação financeira. A conta mostra proposta e escolhas, saldo e extrato. Mensagens distinguem solicitação, crédito efetivo e revisão.

## Limites operacionais

- A falta é parcial: ao menos uma unidade do pedido precisa continuar entregável. Falta integral exige cancelamento/reembolso pelo fluxo de atendimento, incluindo a conferência do frete.
- Proposta pendente, solicitação de reembolso ou crédito em revisão impedem marcar o pedido pronto, em entrega ou concluído. Solicitar reembolso não libera parcialmente o pedido nem executa estorno. Não há comando administrativo para resolver/desbloquear reembolso parcial sem vínculo entre a operação financeira e os itens. A equipe acompanha no gateway; quando aplicável, o caminho disponível é cancelamento/reembolso integral com sincronização financeira.
- O checkout reserva crédito explicitamente, após cashback/WimiCoins e antes do Pix. Novos ganhos consideram o líquido efetivamente pago. Frete conserva as regras existentes; o limiar líquido considera os três descontos.
- A cobrança online integralmente coberta por saldos mantém a restrição já existente do checkout: atendimento assistido para concluir, sem declarar pagamento de valor zero aprovado por gateway.
- Não há notificação comercial automática, saque, transferência ou ferramenta de ajuste manual de saldo. A proposta aparece na conta do titular e no administrativo do pedido.

## Verificação

Testes de rateio/centavos, carteiras combinadas, IDs alheios, ADMIN exclusivo, consentimento, replay, concorrência, excesso de quantidade, cancelamento posterior, reembolso após crédito usado e proteção de estoque. Integração deve usar PostgreSQL descartável e dados sintéticos, com conferência de interface no celular/desktop e revisão independente. Migração é aditiva; não preenche créditos de clientes existentes.

PostgreSQL 17 isolado aprovou seis grupos transacionais com dados sintéticos: rateio e rejeições, aceite concorrente/replay com uma única emissão, crédito gasto seguido de reembolso, restituição única de resgate cancelado, liberação parcial de reservas ACTIVE/CONSUMED, ganhos apenas do entregue, solicitação de reembolso sem crédito e checkout Pix de R$ 10 com R$ 1 de crédito resultando em R$ 8,73. Todas as migrações foram aplicadas na base descartável. Contêiner e túnel de QA encerrados após o teste.

Auditoria de interface dos componentes reais com APIs sintéticas passou em 320/390/1280 px, incluindo consentimento, clique repetido, troca de conta, atualização do saldo, revisão, conflito e ausência de transbordamento. Revisão financeira independente corrigiu rótulos antecipados de restituição; regressão visual confirma texto futuro na proposta e ausência de devolução anunciada ao solicitar reembolso.

Validação local: `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run prisma:validate`, 436 testes de `test:security`, testes das rotas de crédito/estado do pedido e auditorias de banco/interface aprovados. A suíte completa revelou duas fixtures antigas incompletas (consulta da nova carteira e AppRouter); ambas foram corrigidas e revalidadas isoladamente. A validação completa final também será exigida na CI antes da publicação.

`npm.cmd audit --omit=dev --audit-level=high`: zero vulnerabilidades. Auditoria completa mantém cinco alertas altos de desenvolvimento em `braces`, `micromatch`, `fast-glob`, `@next/eslint-plugin-next` e `eslint-config-next`, sem críticos e sem alteração de dependências nesta entrega.

Publicação em andamento; evidências finais serão registradas após conclusão. Nenhum pedido ou movimento financeiro real foi criado para testar.
