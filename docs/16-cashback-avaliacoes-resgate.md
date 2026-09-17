# 16 - Bonus por avaliacao e uso do cashback

## Regra aprovada

Em 2026-09-14 o lojista aprovou 1% extra sobre uma unidade efetivamente paga, uma unica vez por cliente/produto avaliado, independentemente da nota, com saldo utilizavel no proximo pedido pelo site. Esta decisao substitui a restricao anterior de resgate online indisponivel; nao habilita gateway, saque ou transferencia.

- Apenas cliente autenticado e ativo com pedido COMPLETED + PAID do produto. Sem associar contas por email/telefone do pedido. Produto com receita ou Farmacia Popular nao recebe bonus.
- Primeira nova avaliacao: 1% sobre o preco unitario do snapshot, abatida a parcela de cashback usada. Quantidade maior nao multiplica bonus. Para quantidade com centavos indivisiveis, base unitaria liquida truncada ao centavo, depois bonus arredondado ao centavo mais proximo.
- Exemplo: unidade de R$ 20 gera R$ 0,20. Produto gratuito apos desconto nao gera credito. Produto com base muito pequena pode arredondar para zero.
- Todas as notas de 1 a 5 seguem a mesma regra. Opiniao negativa nao e rejeitada pela nota. Conteudo exibido como texto, sem HTML; publica identificacao do incentivo quando houve bonus. Sem avaliacoes ficticias ou envio de incentivos para Google Maps.
- Atualizar avaliacao antiga nao gera credito retroativo. Editar, reenviar, trocar nota ou comprar o mesmo produto novamente nao concede outro bonus. Edicao preserva pedido original e estado de publicacao.
- Bonus soma ao cashback de compra dos produtos configurados. O percentual normal continua com padrao de 2%; elegibilidade e configuracao ADMIN preservadas.

## Uso no checkout

- Cliente escolhe usar o saldo na etapa Pagamento. Sem selecao automatica ou consentimento financeiro restaurado do rascunho. Pode abater ate o subtotal dos produtos, sem frete.
- Servidor confere conta, saldo, produtos, preco, estoque e restricoes. Nao aceita total, saldo, percentual ou credito calculado pelo navegador. Valor solicitado deve ser inteiro em centavos.
- Desconto distribuido proporcionalmente pelos itens com maiores restos, preservando a soma exata. Novos creditos de compra e avaliacao incidem apenas no valor liquido pago, evitando bonus sobre o proprio cashback.
- Enviar pedido reserva saldo atomicamente e registra DEBIT no extrato. RESERVED sai do saldo disponivel, mas lifetimeRedeemed so muda em COMPLETED + PAID (REDEEMED).
- Cancelamento de pedido/pagamento ou reembolso integral retorna saldo uma vez (RETURNED). Nao ha expiracao automatica de pedidos reservados; a equipe pode cancelar pelo painel.
- Reembolso/cancelamento do pedido que gerou bonus estorna compra e avaliacao uma vez. Se o credito ja foi gasto, saldo pode ficar negativo; novo uso exige saldo disponivel positivo. Nao apagar/zerar saldo para esconder estornos.
- Total do pedido ja inclui desconto; painel ADMIN mostra valor e estado da reserva. Mesmo pedido integralmente coberto por cashback depende da confirmacao humana, sem marcar pagamento automaticamente.
- Resgate parcial configuravel, vencimentos, devolucao parcial, saque e transferencia continuam fora do escopo.

## Persistencia e concorrencia

Migration aditiva `20260914180000_review_cashback_redemption` adiciona snapshots do bonus em ProductReview, desconto em OrderItem, valor/estado de resgate e chave/hash de idempotencia em Order. Defaults zero/NONE preservam registros existentes. Sem seed, credito retroativo ou alteracao de saldos existentes pela migration.

- Pedido existente e bloqueado antes da carteira. Carteira usa SELECT FOR UPDATE para serializar avaliacoes, reservas e liquidacoes do cliente. Gravacao e auditoria na mesma transacao.
- EventKey `review:<customerId>:<productId>:CREDITED` e unico, inclusive se o registro editavel da avaliacao for removido. Lancamento guarda referencia ao pedido para estorno independente da avaliacao.
- EventKey de reserva/devolucao usa ID do pedido; repeticoes nao acumulam movimentacoes.
- Checkout autenticado recebe UUID de tentativa + hash do corpo validado, guardados em Order. Repetir mesmo envio retorna o mesmo pedido; corpo diferente ou outra conta com a mesma chave retorna conflito. A chave e conferida antes de revalidar preco/estoque numa repeticao.
- Navegador conserva apenas UUID/hash da tentativa em sessionStorage (fallback em memoria), sem dados pessoais adicionais; limpa depois do sucesso para permitir nova compra identica. Nenhuma repeticao automatica de POST em resposta incerta.
- Cliente anonimo nao pode resgatar cashback; o checkout antigo sem os novos campos continua compativel.

## Interface e APIs

- Banner principal anuncia 1%, mantem fotografia e carrossel existentes e leva a `/minha-conta/avaliacoes`.
- `/cashback` publica regras; lista privada de compras para avaliar em paginas de 24 produtos, apenas compras concluidas/pagas da conta.
- POST `/api/produtos/[id]/avaliacoes` retorna `data.awardedCents`; exige identidade de cliente ativa (inclusive vinculada a administrador) e compra concluida/paga. Status 401/403/404/409/422 e falha temporaria 503 JSON.
- POST `/api/pedidos` aceita `cashbackRedeemCents` (default zero) e `checkoutRequestId` (UUID obrigatorio para resgate). Continua registrando pedido pendente, sem cobranca online.
- GET `/api/minha-conta/cashback` acrescenta `reservedCents`; saldo, pendencias e extrato privados/no-store.
- Evento local `wimifarma:cashback-updated` atualiza o saldo do cabecalho apos avaliacao/pedido.
- Cards mostram apenas o valor monetario estimado, como `R$ 0,20 de cashback`, sem repetir percentual ou `por unidade`. Detalhes apontam para as regras de resgate atuais.
- Selo de frete fica compacto, sem legenda visual; condicoes permanecem no texto acessivel, titulo e consulta de entrega. Mudanca visual nao altera cobertura ou regra de frete.
- Reforco do lojista em 2026-09-15: avaliacao apenas de produto adquirido pela propria conta. A API confere vinculo no banco, pedido concluido/pago e unicidade do bonus; ocultar o formulario nao e a unica protecao.

## Validacao e publicacao

- Testes de calculo em `review-rewards.test.ts` incluidos em `npm test`. Test-first: dois testes falharam antes da implementacao e passaram depois.
- `scripts/review-cashback-audit.ts`: somente PostgreSQL descartavel `cashback_test` em `127.0.0.1:55439`, app local `127.0.0.1:3010`, usuarios sinteticos. Cada contexto simula um IP de documentacao; nao altera rate limit de producao.
- Rodar tambem auditoria existente `scripts/cashback-audit.ts`, lint, typecheck, build, Prisma validate e npm audit. Capturas em `artifacts/review-cashback-audit`, ignoradas no Git.
- Publicacao exige backup validado, build app/tools, migration e recriacao do app. Rollback deve manter esquema/lancamentos e considerar reservas abertas; nao voltar a uma versao que ignore estorno de beneficios sem reconciliacao.
- Validacao local em 2026-09-16: 97 testes unitarios aprovados; build/lint/TypeScript, Prisma validate e audit de dependencias aprovados (zero vulnerabilidades). Auditoria integrada de bonus/resgate repetida apos a mudanca de identidades e aprovada, com fluxos concorrentes, estorno, rollback, notas negativas e telas 320/390/768/1024/1440.
- Publicacao verificada em 2026-09-16 (2026-09-17 UTC), commit `49cff39`: imagens app/tools construidas, migrations de bonus/resgate e vinculo de acessos aplicadas e app recriado. Nova execucao confirmou 13 migrations sem pendencias.
- Backup anterior validado em `/home/ubuntu/backups/wimifarma-br/pre-users-release/20260917T013857Z` (banco, uploads e configuracao). Container saudavel, `/api/health`, `/` e `/cashback` com HTTP 200; carteira privada sem sessao retorna 401. Nenhum pedido, avaliacao ou saldo real foi criado para testes.
- As tres auditorias integradas (cashback existente, bonus/resgate e usuarios/acessos) passaram no ambiente descartavel, depois encerrado e removido. Playwright em producao confirmou o banner de 1%, clique fora da cesta e telas 390/1440 sem overflow ou erros JavaScript.
