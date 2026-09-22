# Minha conta: painel e acompanhamento de pedidos

## Objetivo e contrato

- Renovar `/minha-conta` com visão geral, histórico de pedidos, dados pessoais, segurança e cashback; preservar os formulários existentes.
- Mostrar apenas pedidos vinculados ao `customerId` da sessão. Compras feitas sem login não são associadas por nome, email ou telefone.
- O acompanhamento representa o status atual registrado pela equipe. Não há GPS, prazo estimado ou datas individuais de cada etapa no banco; não inventar esses dados.
- Diferenciar entrega e retirada, incluindo cancelamento, pagamento e resumo dos itens/preços registrados na compra. Pagamento continua sujeito à confirmação humana.
- Histórico paginado (8 pedidos), filtros e atualização manual, com estados de vazio/erro/carregamento. Nenhuma escrita em pedidos ou nova tabela.
- Usar identidade oficial Wimifarma, layout acessível e responsivo, sem dependência adicional ou imagem pesada.

## Implementação

- `src/components/site/customer-account-panel.tsx`: painel com navegação responsiva, visão geral, progresso dos dados pessoais, cashback, avaliações, suporte e formulários; falhas de rede permitem nova tentativa. Identidade com `BrandSignature` oficial.
- `src/components/site/customer-order-history.tsx`: fotos, quantidades e valores da compra, etapas, detalhes expansíveis por teclado, filtros, paginação e ajuda pelo WhatsApp com o número do pedido (envio fica a cargo do cliente).
- `src/features/orders/customer-orders.ts` e `customer-orders-service.ts`: apresentação por modalidade, parâmetros limitados e projeção explícita sem notas internas/dados de contato. Todas as consultas incluem o cliente da sessão; utilizam o índice existente `(customerId, createdAt)`.
- `GET /api/minha-conta/pedidos?filter=all&page=1`: filtros `all`, `active`, `completed`, `canceled`; páginas de 1 a 1000, oito pedidos por página. Conta ativa obrigatória, sem cache compartilhado (`private, no-store`) e `noindex`. Respostas 401 (sem conta ativa), 400 (parâmetros inválidos), 503 (consulta temporariamente indisponível).
- Sem migração, dependência adicional, pagamento online ou mudança em estados comerciais. Os horários mostrados são de criação/atualização do pedido, no fuso `America/Sao_Paulo`, e não de cada etapa.

## Validação

Testar isolamento entre clientes, seleção mínima de dados, paginação/filtros e todas as etapas de acompanhamento; verificar o componente real com dados fictícios em 320, 390, 768 e 1440 px. Não criar pedidos ou alterar dados comerciais em produção. Executar testes, lint, typecheck, build, Prisma validate e auditoria de dependências antes de publicar.

`npm.cmd run audit:account` requer servidor local em `127.0.0.1:3017` para obter o cabeçalho e CSS reais. O painel privado usa somente fixtures em `scripts/fixtures/account-data.ts`; alterações de cadastro/senha são interceptadas e jamais enviadas ao servidor. Verifica filtros, paginação, atualização de status, detalhes por teclado, conta vazia, salvamento e recuperação de falhas.

## Limites

Não associa compras antigas ou anônimas automaticamente. Não oferece localização ao vivo, código de transportadora ou previsão de chegada. O cliente pode atualizar o acompanhamento manualmente; a equipe continua responsável pelos estados no admin.

## Evidências locais — 2026-09-22

- `npm.cmd test`: 143 testes aprovados, incluindo regras e proteção do histórico.
- `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run prisma:validate` e `npm.cmd run build`: aprovados. Rota `/minha-conta`: 15,4 kB, primeiro carregamento JS 145 kB, incluindo código compartilhado.
- `npm.cmd audit --audit-level=moderate` com `NODE_OPTIONS=--use-system-ca`: zero vulnerabilidades.
- `npm.cmd run audit:account`: 320, 390, 768 e 1440 px; histórico, etapas, filtros, paginação, detalhes por teclado, formulários, conta vazia e recuperação de falhas aprovados, sem overflow ou escritas comerciais.
- Build local: API sem sessão retorna 401 com `private, no-store`; `/minha-conta` redireciona para `/login` (307). O teste visual privado usa fixtures; não acessa histórico de clientes reais.
