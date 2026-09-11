# 15 - Cashback por produto

## Escopo

Solicitado em 2026-09-10: percentual inicial de 2%, editavel por produto, exibicao em reais na vitrine e saldo do cliente no header e perfil. Produtos existentes permanecem desabilitados. Nenhum saldo inicial ou avaliacao ficticia e criado.

## Regra implementada

- ADMIN habilita e altera cashback pelo modulo Cashback ou pelo formulario de produto. MANAGER e STAFF nao alteram percentuais. Mudancas de restricao do produto podem desabilitar a elegibilidade.
- Percentuais entre 0,01% e 100%, armazenados em pontos-base inteiros (2% = 200). Nao existem campanhas adicionais, vencimentos ou faixas de percentual nesta etapa.
- Cashback incide no preco unitario vigente, promocional quando houver, sem frete. Arredondamento por unidade ao centavo mais proximo, multiplicado pela quantidade. R$ 20,00 x 2% = R$ 0,40; tres unidades de R$ 9,99 x 2% = R$ 0,60.
- Exige cliente autenticado e ativo no momento do pedido. Email, telefone e IDs enviados no corpo nao transferem o beneficio para outra conta. Pedidos de visitantes nao acumulam nem recebem credito retroativo.
- Produtos com receita ou Farmacia Popular ficam inelegiveis, mantendo atendimento humano.
- Pedido recebe snapshot imutavel de percentual e valor em cada item e total. Alteracoes futuras no produto nao mudam pedidos ja registrados.
- PENDING: valor previsto, nao liberado. CREDITED: somente pedido COMPLETED e paymentStatus PAID, confirmados pela equipe. O site nao processa pagamentos nem considera o checkout como pagamento aprovado.
- CANCELED/REFUNDED anulam pendencias (VOIDED) ou estornam creditos (REVERSED). Repetir a acao nao gera nova movimentacao. NONE identifica pedidos sem cashback, inclusive os anteriores a esta mudanca.
- Credito e estorno atualizam saldo, total ganho liquido de estornos, lancamento e auditoria na mesma transacao da alteracao do pedido. `eventKey` unico por pedido/evento reforca idempotencia. O update do pedido mantem bloqueio de linha antes da liquidacao.
- Resgate online, saque, transferencia, vencimento, devolucao parcial e lancamentos manuais nao fazem parte desta entrega. A interface informa que resgate online esta indisponivel. Nao reduzir saldo por fora do livro de transacoes.

## APIs

- `GET /api/cashback?q=&page=1&enabled=true`: ADMIN, lista paginada de 24 produtos, total, produtos ativos habilitados e valor pendente agregado. Sem registros pessoais.
- `PATCH /api/cashback/produtos/[id]`: ADMIN, `cashbackEnabled`, `cashbackRateBps` e `expectedUpdatedAt`; revisao concorrente retorna 409; auditoria atomica.
- `POST/PATCH /api/produtos`: mesmos campos opcionais, somente ADMIN. Ausencia preserva valores em atualizacoes antigas. Produto restrito nao aceita ativacao.
- `GET /api/minha-conta/cashback`: CUSTOMER ativo, somente sessao atual, saldo, pendente e ultimos 20 lancamentos, snapshot RepeatableRead e cache privado/no-store.
- `POST /api/cashback` legado retorna 405 apos autenticacao; o antigo endpoint criava lancamentos sem atualizar saldo. Nenhum consumidor foi encontrado. GET nao retorna mais `customer: true`, evitando exposicao desnecessaria de dados e hash de senha.

## Banco e publicacao

Migration aditiva `20260910193000_product_cashback`: campos Product/Order/OrderItem, enum de estado, chave unica nullable de evento e indice cliente/estado. Constraints SQL protegem faixa e valores nao negativos. Valores antigos permanecem desabilitados/NONE/zero, lancamentos antigos preservados.

Antes de publicar: confirmar regras, backup PostgreSQL com permissoes restritas, testar restore/listagem do backup, construir imagens app/tools, executar `docker compose --profile tools run --rm migrate` e atualizar app. Nao executar seed. Rollback do app pode preservar campos adicionais; nao apagar lancamentos nem executar down migration sobre saldos reais.

## Validacao reproduzivel

- `npm.cmd test`: calculo, arredondamento, elegibilidade, estados e idempotencia logica.
- `npm.cmd run audit:cashback`: apenas banco descartavel `cashback_test` em `127.0.0.1:55439` e app local (padrao `http://127.0.0.1:3010`); nunca producao. Usuarios sinteticos com senha aleatoria, limpeza em finally.
- Auditoria cobre autenticacao, isolamento, percentuais, concorrencia, snapshot, visitante, pedido pago/concluido, estorno, rollback e interface em 320/390/768/1440 px. Capturas em `artifacts/cashback-audit`, nao versionadas.
- Executar lint, typecheck, build, prisma:validate e auditoria de dependencias antes da entrega. Registrar o resultado efetivamente observado, sem inferir sucesso apenas por artefato de build.

## Evidencias de 2026-09-10

- As 11 migrations foram aplicadas com sucesso em PostgreSQL 17 descartavel, incluindo a migration de cashback.
- 73 testes unitarios aprovados; ESLint, TypeScript e validacao Prisma aprovados.
- Build otimizado Next.js concluido com codigo de saida 0. A tentativa adicional de iniciar `next start` local foi bloqueada pelo ambiente de ferramentas; a auditoria de navegador foi executada no servidor de desenvolvimento com banco isolado, nao em producao.
- Auditoria integrada aprovada com login real de teste para ADMIN/MANAGER/STAFF/CUSTOMER, visitantes, concorrencia, estorno unico, rollback transacional e isolamento entre clientes.
- Playwright: configuracao de 2,5% persistida, campo de novo produto iniciado em 2%, R$ 0,50 exibido em produto de R$ 20 e saldo real do fixture no header/perfil. Sem overflow do documento em 320/390/768/1440 px e sem erros de pagina.
- `npm audit`: permanecem 3 alertas altos na cadeia dev `prisma -> @prisma/config -> deepmerge-ts`; nenhum novo pacote. Nao executado downgrade automatico. Pendencia ja registrada em `docs/06-pendencias.md`.

## Publicacao em 2026-09-11

- Codigo `bd557db` enviado ao GitHub e recebido via fast-forward no servidor. Imagens Docker app e migrate construidas com saida 0.
- Backup pre-migration validado por `pg_restore --list`: `/home/ubuntu/backups/wimifarma-br/pre-cashback-20260910T230913Z.dump`, SHA-256 `dc9bc91989f5690a649d499307e5285df79cb6c8ae6fe58844d682bce016e56f`.
- Migration aplicada e app recriado. Antes/depois: 2 produtos, 0 pedidos, 0 contas, saldo agregado zero; 0 produtos ativados automaticamente.
- Smoke publicado: home, saude e busca HTTP 200; APIs administrativas e carteira sem login HTTP 401; container healthy, zero reinicializacoes. Busca do produto existente retornou `cashbackEnabled=false` e `cashbackRateBps=200`.
- Banco PostgreSQL descartavel, tunel SSH, servidor local e capturas temporarias encerrados/removidos. Nenhum cliente ou pedido ficticio foi criado em producao.
