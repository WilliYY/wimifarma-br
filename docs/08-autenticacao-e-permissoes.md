# 08 - Autenticacao e Permissoes

## O Que Esta Parte Faz

Controla login, sessao e permissao de acesso a APIs e painel administrativo.

## Arquivos Envolvidos

- `src/features/auth/auth.ts`
- `src/features/auth/permissions.ts`
- `src/features/auth/components/admin-login-form.tsx`
- `src/components/site/customer-auth-page.tsx`
- `src/types/next-auth.d.ts`
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/components/admin/admin-shell.tsx`
- `prisma/schema.prisma` (`User`, `LoginAttempt`)

## Estado Atual

- Auth.js/NextAuth v5 esta configurado com JWT session.
- Provider Credentials autentica usuarios do modelo `User`.
- Google Provider so entra se `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` existirem.
- Google OAuth e reservado para clientes: sessoes Google recebem role `CUSTOMER` e nao acessam `/admin`.
- `LoginAttempt` registra falhas/sucessos para limitar tentativas.
- `/login` serve como tela de login/cadastro visual.
- Login administrativo bem-sucedido redireciona para `/admin/dashboard`.

## Roles

- `ADMIN`: administrador total.
- `MANAGER`: gerente/intermediario.
- `STAFF`: colaborador.
- `CUSTOMER`: cliente autenticado por Google, sem acesso administrativo.

## Regras de Negocio

- Admin pode controlar tudo.
- Colaborador deve ter acesso limitado.
- Cliente nao deve acessar painel admin.
- Login Google nao deve conceder role administrativa.
- Criacao de ADM, temas, cashback e clube devem ser restritos a `ADMIN`.

## Decisoes Tecnicas

- Usar JWT strategy do NextAuth.
- Armazenar `id` e `role` no token/sessao.
- Sem role administrativa explicita, a sessao recebe `CUSTOMER`.
- API guard inicial: `requireAdminApi`.
- Menu admin filtra links com base em roles.

## Configuracao Google OAuth

No Google Cloud, criar credencial OAuth do tipo Aplicativo da Web:

- Origem JavaScript autorizada: `https://wimifarma.com.br`
- URI de redirecionamento autorizada: `https://wimifarma.com.br/api/auth/callback/google`

Depois salvar no `.env` do servidor:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

## Riscos

- Login temporario `adm / adm` existe em `src/features/auth/auth.ts` e precisa ser removido/protegido antes de producao.
- Menu filtrado nao substitui permissao server-side por pagina.
- APIs ainda usam permissao generica para `ADMIN` e `MANAGER`.
- Cadastro/login de cliente ainda nao persiste cliente no banco.

## Pendencias

- Remover/proteger login temporario.
- Criar guard server-side por rota admin.
- Criar permissoes granulares por API.
- Implementar cadastro real de cliente.
- Implementar OAuth Google real.
- Registrar auditoria em acoes administrativas reais.

## Evolucao

Possivel desenho futuro:

- `requirePageRole(["ADMIN"])` para paginas admin.
- `requireApiRole(["ADMIN", "MANAGER"])` para endpoints.
- Tela real de usuarios com status ativo/bloqueado.
- Convite de colaborador com senha temporaria.
- Reset de senha seguro.
- 2FA para administradores, se necessario.
