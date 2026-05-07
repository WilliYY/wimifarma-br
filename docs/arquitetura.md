# Arquitetura

A Wimifarma BR usa Next.js App Router com separacao clara entre site publico, admin, APIs, features e banco.

## Camadas

- `src/app/(site)`: paginas publicas e landing page.
- `src/app/admin`: painel reservado.
- `src/app/api`: endpoints internos.
- `src/features/*`: schemas Zod e logicas por modulo.
- `src/components/*`: UI compartilhada.
- `src/lib/prisma.ts`: acesso ao banco com Prisma 7 e adapter PostgreSQL.
- `prisma/schema.prisma`: modelos persistentes.

## Decisao inicial

Checkout e pagamento nao entram agora. O fluxo comercial inicial e: pagina publica, oferta, chamada para WhatsApp, atendimento humano e registro posterior.
