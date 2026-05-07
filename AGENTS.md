# AGENTS.md

## Projeto

Wimifarma BR e uma plataforma comercial para uma farmacia em Ivate-PR. Nao e WordPress, nao depende de HostGator e nao deve ser misturada com Candy English.

## Regras

- Nao versionar `.env` real.
- Nao colocar senha real no repositorio.
- Nao usar dados reais de clientes em seed, testes ou exemplos.
- Manter site publico, admin, features, APIs e banco separados.
- Nao implementar checkout/pagamento nesta fase.
- Preferir WhatsApp como conversao inicial.
- Usar nomes Docker exclusivos da Wimifarma.

## Estrutura

- `src/app/(site)`: rotas publicas.
- `src/app/admin`: rotas reservadas.
- `src/app/api`: APIs internas.
- `src/components/site`: componentes da landing e paginas publicas.
- `src/components/admin`: shell e componentes do admin.
- `src/components/ui`: componentes base estilo shadcn/ui.
- `src/features`: contratos e logica por modulo.
- `src/lib`: utilitarios, Prisma, configuracoes e helpers.
- `prisma`: schema e seed.
- `docs`: arquitetura, producao e roadmap.

## Validacao antes de entrega

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run prisma:validate
npm.cmd audit --audit-level=moderate
```
