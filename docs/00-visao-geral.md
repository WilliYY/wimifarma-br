# 00 - Visao Geral

## O Que o Sistema Faz

Wimifarma BR e a base de uma plataforma comercial para uma farmacia em Ivate-PR. O sistema combina site publico, chamadas para WhatsApp, catalogo/ofertas, login, painel administrativo, APIs internas, PostgreSQL e modulos preparados para evolucao.

O foco atual e usar a home como vitrine de anuncio e facilitar atendimento local. A venda final ainda acontece por WhatsApp e atendimento humano.

## Arquivos e Rotas Envolvidos

- Site publico: `src/app/(site)`
- Home: `src/components/site/home-page.tsx`
- Header e footer: `src/components/site/site-header.tsx`, `src/components/site/site-footer.tsx`
- Login/cadastro visual: `src/components/site/customer-auth-page.tsx`
- Admin: `src/app/admin`, `src/components/admin`
- APIs: `src/app/api`
- Banco: `prisma/schema.prisma`, `prisma/seed.ts`
- Configuracoes: `.env.example`, `docker-compose.yml`, `Dockerfile`

## Regras de Negocio a Preservar

- WhatsApp e o canal principal de conversao nesta fase.
- Nao implementar checkout ou pagamento online agora.
- Nao usar dados reais de clientes em exemplos, seed ou testes.
- Farmacia Popular deve orientar e chamar para confirmacao, sem prometer disponibilidade automatica.
- Roleta e cashback existem como estrutura futura, sem ativacao comercial real.
- O projeto nao deve ser misturado com Candy English nem com o projeto antigo `wimifarma-com`.

## Decisoes Tecnicas Ja Tomadas

- Next.js App Router como base.
- Separacao entre site publico, admin, APIs, features, banco e docs.
- Prisma 7 com PostgreSQL 17.
- Docker Compose com app e Postgres.
- Nginx Proxy Manager deve acessar `wimifarma-br-app:3000`.
- PostgreSQL nao deve ficar exposto publicamente.

## Riscos ao Alterar

- Confundir `wimifarma-br` com `wimifarma-com` local.
- Quebrar o Docker ao alterar nomes de container, volume ou network.
- Tornar dados administrativos acessiveis a usuarios comuns.
- Deixar credenciais temporarias em producao.
- Prometer compra/pagamento sem o modulo existir.

## Pendencias

Ver `docs/06-pendencias.md`.

## Evolucao Futura

O projeto pode crescer para CRUD real de catalogos, ofertas, usuarios, clientes, cupons, roleta, cashback, clube de fidelidade, auditoria, relatorios e integracoes externas. Cada nova fase deve atualizar os docs correspondentes.
