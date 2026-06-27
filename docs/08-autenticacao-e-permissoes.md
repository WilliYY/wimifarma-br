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
- `src/app/admin/*/page.tsx`
- `src/app/api/admin/api-senhas/*`
- `prisma/schema.prisma` (`User`, `LoginAttempt`)

## Estado Atual

- Auth.js/NextAuth v5 esta configurado com JWT session.
- Provider Credentials autentica usuarios do modelo `User`.
- Google Provider so entra se `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` existirem.
- Google OAuth e reservado para clientes: sessoes Google recebem role `CUSTOMER` e nao acessam `/admin`.
- Login Google cria ou atualiza `Customer` no banco com e-mail, nome, foto, `googleSubject` e `lastLoginAt`.
- Cadastro por email/telefone/senha cria `Customer` com `passwordHash`; login de cliente por Credentials recebe role `CUSTOMER`.
- `/minha-conta` e area autenticada de cliente e nao aceita roles administrativas.
- No site publico, sessoes de cliente exibem foto/nome da conta Google no header e botao `Sair`.
- `LoginAttempt` registra falhas/sucessos para limitar tentativas.
- `/login` serve como tela de login/cadastro visual.
- Login administrativo bem-sucedido redireciona para `/admin/dashboard`.
- `Criar ADM` e `Criar colaborador` criam usuarios reais do modelo `User` com email, senha hasheada e role administrativa.
- As telas de criacao de acesso permitem listar, bloquear e reativar usuarios administrativos sem apagar historico.
- `API e Senhas` exige `ADMIN` na pagina e nas APIs.
- Paginas admin usam guard server-side por modulo, alinhado ao mesmo mapa de roles usado pelo menu.

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
- Apenas `ADMIN` pode criar, bloquear ou reativar usuarios administrativos.
- Configuracoes comerciais e cofre `API e Senhas` ficam restritos a `ADMIN`.
- Cupons e roleta ficam restritos a `ADMIN` e `MANAGER`.
- Catalogos, produtos, ofertas, clientes e dashboard aceitam `ADMIN`, `MANAGER` e `STAFF`.
- Criacao, revelacao e exclusao de segredos no cofre devem ser restritas a `ADMIN`.

## Decisoes Tecnicas

- Usar JWT strategy do NextAuth.
- Armazenar `id` e `role` no token/sessao.
- Para Google OAuth, `id` no token/sessao e o `Customer.id`, nao um `User.id` administrativo.
- Para cliente por email/senha, `id` no token/sessao tambem e o `Customer.id`.
- Sem role administrativa explicita, a sessao recebe `CUSTOMER`.
- Fotos de perfil Google sao renderizadas no header publico a partir de `lh3.googleusercontent.com`.
- API guards: `requireApiRole`, `requireAdminApi` e `requireAdminOnlyApi`.
- Page guards: `requireAdminPageRoute` e `requireAdminPageRole` redirecionam sem sessao para `/login` e roles sem permissao para `/admin/dashboard`.
- Usuarios administrativos sao criados por `/api/admin/usuarios`, que exige `ADMIN`, valida Zod, hasheia senha com bcrypt e registra `AuditLog`.
- Bloqueio/reativacao usa `/api/admin/usuarios/[id]`, impede bloquear o proprio usuario e impede deixar o sistema sem ADM ativo.
- Menu admin filtra links com base no mesmo `adminRoutePermissions` usado pelos guards server-side.

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
- Muitas APIs ainda usam permissao generica para `ADMIN` e `MANAGER`.
- `SECRET_VAULT_KEY` deve permanecer estavel; trocar a chave sem recriptografar registros impede abrir segredos antigos.
- Redefinicao de senha por email ainda nao envia email real.
- Cliente Google pode existir sem telefone; fluxos que precisam de WhatsApp devem solicitar/completar telefone antes de uso comercial.

## Pendencias

- Remover/proteger login temporario.
- Criar permissoes granulares por API nos endpoints restantes.
- Implementar token e envio real de email para redefinicao de senha.
- Registrar auditoria em acoes administrativas reais.

## Evolucao

Possivel desenho futuro:

- `requirePageRole(["ADMIN"])` para paginas admin.
- `requireApiRole(["ADMIN", "MANAGER"])` para endpoints.
- Tela real de usuarios com status ativo/bloqueado.
- Convite de colaborador por email com senha temporaria.
- Reset de senha seguro.
- 2FA para administradores, se necessario.
