# 08 - Autenticacao e Permissoes

## O Que Esta Parte Faz

Controla login, sessao e permissao de acesso a APIs e painel administrativo.

## Arquivos Envolvidos

- `src/features/auth/auth.ts`
- `src/features/auth/permissions.ts`
- `src/features/auth/components/admin-login-form.tsx`
- `src/components/site/customer-auth-page.tsx`
- `src/components/site/site-header.tsx`
- `src/types/next-auth.d.ts`
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/components/admin/admin-shell.tsx`
- `src/app/admin/api-senhas/page.tsx`
- `src/app/api/admin/api-senhas/*`
- `prisma/schema.prisma` (`User`, `LoginAttempt`)

## Estado Atual

- Auth.js/NextAuth v5 esta configurado com JWT session.
- Provider Credentials autentica usuarios do modelo `User`.
- Google Provider so entra se `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` existirem.
- Google OAuth e reservado para clientes: sessoes Google recebem role `CUSTOMER` e nao acessam `/admin`.
- No site publico, sessoes de cliente exibem o nome da conta Google no header e botao `Sair`.
- `LoginAttempt` registra falhas/sucessos para limitar tentativas.
- `/login` serve como tela de login/cadastro visual.
- Login administrativo bem-sucedido redireciona para `/admin/dashboard`.
- `API e Senhas` exige `ADMIN` na pagina e nas APIs.

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
- Criacao, revelacao e exclusao de segredos no cofre devem ser restritas a `ADMIN`.

## Decisoes Tecnicas

- Usar JWT strategy do NextAuth.
- Armazenar `id` e `role` no token/sessao.
- Sem role administrativa explicita, a sessao recebe `CUSTOMER`.
- API guards: `requireApiRole`, `requireAdminApi` e `requireAdminOnlyApi`.
- Menu admin filtra links com base em roles.

## Configuracao Google OAuth

No Google Cloud, criar credencial OAuth do tipo Aplicativo da Web:

- Origem JavaScript autorizada: `https://wimifarma.com.br`
- URI de redirecionamento autorizada: `https://wimifarma.com.br/api/auth/callback/google`

Depois salvar no `.env` do servidor:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Se o client secret for exposto em print ou conversa, rotacionar a credencial no Google Cloud antes de considerar a integracao pronta.

## Riscos

- Login temporario `adm / adm` existe em `src/features/auth/auth.ts` e precisa ser removido/protegido antes de producao.
- Menu filtrado nao substitui permissao server-side por pagina.
- Muitas APIs ainda usam permissao generica para `ADMIN` e `MANAGER`.
- `SECRET_VAULT_KEY` deve permanecer estavel; trocar a chave sem recriptografar registros impede abrir segredos antigos.
- Cadastro/login de cliente ainda nao persiste cliente no banco.

## Pendencias

- Remover/proteger login temporario.
- Criar guard server-side por rota admin.
- Criar permissoes granulares por API nos endpoints restantes.
- Implementar cadastro real de cliente.
- Implementar persistencia real de cliente para sessoes Google.
- Registrar auditoria em acoes administrativas reais.

## Evolucao

Possivel desenho futuro:

- `requirePageRole(["ADMIN"])` para paginas admin.
- `requireApiRole(["ADMIN", "MANAGER"])` para endpoints.
- Tela real de usuarios com status ativo/bloqueado.
- Convite de colaborador com senha temporaria.
- Reset de senha seguro.
- 2FA para administradores, se necessario.
