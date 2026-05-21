# 02 - Banco de Dados

## O Que Esta Parte Faz

O banco guarda usuarios administrativos, produtos, ofertas, cupons, leads, clientes, roleta, cashback, contatos WhatsApp, auditoria e tentativas de login.

## Arquivos Envolvidos

- Schema: `prisma/schema.prisma`
- Migration inicial: `prisma/migrations/20260507030000_init/migration.sql`
- Seed: `prisma/seed.ts`
- Cliente Prisma: `src/lib/prisma.ts`
- Prisma config: `prisma.config.ts`
- Output gerado: `src/generated/prisma` (ignorado pelo Git)

## Modelos Prisma

- `User`: usuarios administrativos e colaboradores.
- `Product`: catalogo de produtos.
- `Offer`: ofertas comerciais.
- `Coupon`: cupons.
- `Lead`: contatos comerciais ainda nao consolidados.
- `Customer`: clientes consolidados.
- `SpinWheelCampaign`: campanhas de roleta.
- `SpinWheelPrize`: premios da roleta.
- `SpinWheelAttempt`: tentativas da roleta.
- `CashbackAccount`: conta de cashback por cliente.
- `CashbackTransaction`: movimentacoes de cashback.
- `WhatsAppContact`: contatos ou mensagens recebidas pelo WhatsApp.
- `AuditLog`: historico de acoes.
- `LoginAttempt`: tentativas de login para rate limit simples.

## Regras de Negocio a Preservar

- Nao usar dados reais de clientes em seed.
- Produtos e ofertas podem existir como dados demonstrativos, mas devem ser claramente ficticios.
- Cashback nao deve alterar saldo real sem regra aprovada.
- Roleta nao deve ficar ativa comercialmente sem limites e validacoes.
- `User.email`, `Product.slug`, `Offer.slug`, `Coupon.code` e campos unicos devem continuar protegendo duplicidade.

## Decisoes Tecnicas

- PostgreSQL 17 e Prisma 7.
- Prisma Client gerado em `src/generated/prisma`.
- Uso de `@prisma/adapter-pg` e `pg`.
- Campos de dinheiro usam `Decimal`.
- Seed cria admin inicial, produto demonstrativo, oferta demonstrativa, cupom demonstrativo e campanha de roleta inativa.

## Riscos ao Alterar

- Alterar schema sem criar/aplicar migration.
- Usar `prisma db push` em producao sem planejamento.
- Apagar volume do Postgres em producao.
- Criar seed com senha fraca ou dados reais.
- Alterar enums sem revisar APIs e UI.

## Pendencias

- Definir politica real de criacao de admins e colaboradores.
- Definir regras reais de estoque, validade e disponibilidade.
- Criar auditoria para mutacoes administrativas reais.
- Definir regras comerciais de cashback.
- Definir limites reais da roleta.

## Evolucao

Quando o admin ganhar CRUD real, registrar aqui:

- novas tabelas;
- novas migrations;
- relacoes entre modelos;
- indices importantes;
- decisoes de integridade;
- politicas de backup e restauracao.
