# Confiabilidade do dashboard

Atualizado em 24/10/2026.

O dashboard apresenta contagens consultadas no banco durante a renderização. A data da consulta aparece em horário de Brasília; recarregar a página atualiza os indicadores comerciais. Somente o card de presença online possui atualização periódica. Uma falha de consulta é apresentada como indisponibilidade, sem simular zero.

## Significado dos indicadores

- **Produtos cadastrados:** registros de produtos e quantidade com status `ACTIVE`.
- **Campanhas ativas:** campanhas `Offer` com status `ACTIVE` dentro da vigência. Não é a quantidade de produtos com desconto no catálogo.
- **Clientes cadastrados:** registros de `Customer`; habilitados são aqueles com status `ACTIVE`. Não mede pessoas online ou compradores.
- **Cupons usados:** soma de `usesCount`, acompanhada da quantidade de cupons habilitados e vigentes.
- **Contatos via WhatsApp:** registros de `WhatsAppContact`, sem inferir pedidos ou conversões.
- **Navegadores registrados:** identificadores de `SiteVisit`, acompanhados dos vistos nas últimas 24 horas. Não representa pessoas únicas.
- **Pedidos registrados:** registros de `Order`, em todos os estados, excluindo pedidos associados a `OnlinePayment.environment = test`.
- **Compras concluídas e pagas:** pedidos com `status = COMPLETED` e `paymentStatus = PAID`. Pagamentos manuais sem `OnlinePayment` são aceitos. Havendo pagamento online, exige ambiente `production`, status `PAID`, `financialReviewReason = null` e ausência de `partial`, `disput`, `chargeback` e `refund` em `statusDetail`, sem diferenciar maiúsculas. Um pedido com método `ONLINE` sem confirmação online não entra nessa contagem.

Pedidos e compras são separados em **com conta vinculada** (`customerId != null`) e **sem conta vinculada** (`customerId = null`). A segunda condição não comprova ausência de login: a exclusão de uma conta pode desvincular pedidos antigos. Não há associação por e-mail ou telefone, criação automática de cadastro, identificação pública ou soma financeira.

As contagens são agregações de leitura, sem alterações no banco. Consultas independentes podem refletir transições concorrentes durante a renderização; não constituem fechamento financeiro.

## Acesso e limites

A autorização da página e dos indicadores existentes permanece preservada. Os indicadores de pedidos usam a matriz de `/admin/pedidos`. O atalho administrativo do cabeçalho e as permissões dos cupons não são alterados.

O card de consulta ao banco comprova somente a conclusão das consultas do resumo. Não verifica gateway, frete, disponibilidade comercial ou saúde completa da aplicação. Os componentes genéricos de gráfico e tabela permanecem disponíveis; apenas as demonstrações “Interesse comercial” e “Roadmap modular” saíram do dashboard.

## Validação

O teste `src/features/analytics/dashboard-metrics.test.ts`, executado pelo runner `tsx`, cobre o contrato dos filtros, separação de pedidos/compras e vínculos, base vazia e propagação de falha do banco. Não exige banco real nem dados pessoais. A validação local não comprova funcionamento em produção.
