# 03 - Fluxos do Sistema

## O Que Esta Parte Faz

Este documento descreve os fluxos reais existentes hoje e os fluxos planejados que ainda nao estao completos.

## Fluxo Publico Atual

1. Usuario acessa `/`.
2. Ve o video institucional/comercial e um espaco grande reservado para anuncio principal.
3. Pode clicar em WhatsApp para iniciar atendimento.
4. Pode acessar paginas publicas basicas como `/ofertas`, `/farmacia-popular`, `/sobre` e `/contato`.
5. A rota `/ofertas` continua existindo, mas nao aparece no menu principal enquanto a home estiver focada em anuncio.

Arquivos principais:

- `src/components/site/home-page.tsx`
- `src/components/site/site-header.tsx`
- `src/components/site/floating-whatsapp.tsx`
- `src/lib/site.ts`

## Fluxo de WhatsApp

O WhatsApp e o canal principal de conversao. O site deve facilitar o pedido, mas a confirmacao de preco, disponibilidade, receita e entrega continua humana.

O link centralizado em `src/lib/site.ts` usa uma mensagem padrao curta de pedido de informacoes e deve ser reaproveitado pelos botoes publicos e administrativos.

Arquivos:

- `src/lib/whatsapp.ts`
- `src/lib/site.ts`
- `src/app/api/whatsapp/route.ts`
- `src/features/whatsapp/schema.ts`

## Fluxo de Login

1. Usuario acessa `/login`.
2. A tela exibe blocos de entrar e cadastrar.
3. Login Google, quando configurado, e destinado apenas a clientes e retorna para `/login`.
4. Login administrativo usa Credentials via NextAuth.
5. Login/cadastro de cliente ainda nao persiste cliente no banco.
6. Se o login administrativo passa, redireciona para `/admin/dashboard`.

Arquivos:

- `src/components/site/customer-auth-page.tsx`
- `src/features/auth/auth.ts`
- `src/lib/validations/auth.ts`
- `src/app/api/auth/[...nextauth]/route.ts`

## Fluxo Admin Atual

1. Usuario autenticado acessa `/admin/dashboard`.
2. `AdminShell` monta sidebar e header.
3. Links aparecem conforme role (`ADMIN`, `MANAGER`, `STAFF`).
4. Muitas telas sao placeholders com descricao de futuro modulo.

Arquivos:

- `src/components/admin/admin-shell.tsx`
- `src/components/admin/module-placeholder.tsx`
- `src/app/admin/*/page.tsx`

## Fluxo de APIs

1. Cliente chama endpoint em `src/app/api`.
2. APIs de negocio executam `requireAdminApi`.
3. Sem sessao valida, retornam `401`.
4. Com sessao `ADMIN` ou `MANAGER`, executam consulta ou criacao com validacao Zod.

Arquivos:

- `src/features/auth/permissions.ts`
- `src/app/api/produtos/route.ts`
- `src/app/api/ofertas/route.ts`
- `src/app/api/clientes/route.ts`
- `src/app/api/cupons/route.ts`
- `src/app/api/roleta/route.ts`
- `src/app/api/cashback/route.ts`
- `src/app/api/whatsapp/route.ts`

## Fluxo Docker/Deploy

1. Criar `.env` a partir de `.env.example`.
2. Build do app.
3. Subir Postgres.
4. Rodar migrations.
5. Rodar seed.
6. Subir app.
7. Validar `/api/health`.
8. Nginx Proxy Manager aponta para `wimifarma-br-app:3000`.

## Regras a Preservar

- Nao prometer compra online.
- Nao prometer disponibilidade sem atendimento.
- Nao abrir APIs administrativas ao publico.
- Nao usar dados reais de clientes.

## Riscos

- Usuario cliente ser redirecionado para area admin por regra incompleta.
- Colaborador acessar rota de administrador se souber a URL.
- Fluxo de cadastro parecer funcional antes de persistir no banco.

## Pendencias

- Implementar cadastro real de cliente.
- Implementar login Google real.
- Implementar regras de role por rota admin.
- Implementar CRUD real nos modulos admin.
- Integrar site publico com dados reais do banco.

## Evolucao

Cada novo fluxo importante deve ganhar documentacao propria ou nova secao aqui.
