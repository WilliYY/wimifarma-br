# 01 - Arquitetura

## O Que Esta Parte Faz

A arquitetura organiza a plataforma em camadas para evitar mistura entre site publico, painel administrativo, APIs, modulos de negocio e banco.

## Camadas

```text
src/app/(site)        Rotas publicas e paginas de marketing/comerciais
src/app/admin         Rotas reservadas do painel
src/app/api           Endpoints internos
src/components/site   Componentes do site publico
src/components/admin  Componentes do admin
src/components/ui     Componentes base reutilizaveis
src/components/motion Componentes de animacao
src/features          Schemas Zod e contratos por modulo
src/lib               Prisma, env, site config e helpers
src/types             Tipos globais e dominio
prisma                Banco de dados
docs                  Memoria longa
public                Assets publicos
```

## Rotas Publicas

- `/`
- `/ofertas`
- `/farmacia-popular`
- `/delivery`
- `/sobre`
- `/contato`
- `/roleta`
- `/login`

Observacao: `/roleta` publica redireciona para `/ofertas` nesta fase.

## Rotas Admin

- `/admin`
- `/admin/login`
- `/admin/dashboard`
- `/admin/api-senhas`
- `/admin/ofertas`
- `/admin/produtos`
- `/admin/clientes`
- `/admin/cupons`
- `/admin/roleta`
- `/admin/cashback`
- `/admin/configuracoes`
- `/admin/criar-adm`
- `/admin/criar-colaborador`
- `/admin/catalogos`
- `/admin/temas`
- `/admin/club-wimifarma`

Muitas rotas admin ainda sao placeholders.

## APIs

- `/api/health`
- `/api/auth/[...nextauth]`
- `/api/ofertas`
- `/api/produtos`
- `/api/clientes`
- `/api/cupons`
- `/api/roleta`
- `/api/cashback`
- `/api/whatsapp`
- `/api/admin/api-senhas`
- `/api/admin/api-senhas/[id]`
- `/api/admin/api-senhas/[id]/reveal`

As APIs de negocio usam `requireAdminApi`. O cofre `API e Senhas` usa `requireAdminOnlyApi` e deve responder segredos apenas no endpoint de revelacao.

## Infraestrutura

- `Dockerfile`: build standalone do Next.
- `docker-compose.yml`: app, postgres, migrate e seed.
- `prisma.config.ts`: config do Prisma.
- `.env.example`: contrato de configuracao.

## Decisoes Tecnicas

- Separacao por feature para facilitar crescimento.
- APIs reservadas ficam em `src/app/api`.
- Rotas administrativas sensiveis podem usar subpastas em `src/app/api/admin`.
- Banco fica atras do app e nao exposto publicamente.
- App Docker usa `output: standalone` do Next.

## Riscos ao Alterar

- Criar logica de negocio diretamente em componentes sem passar por `features` ou `lib`.
- Duplicar regras de permissao em varios lugares.
- Alterar nomes Docker e quebrar Nginx Proxy Manager.
- Fazer rotas publicas dependerem de banco sem tratar falha.

## Pendencias

- Criar guard por permissao nas paginas admin, nao apenas no menu.
- Diferenciar permissoes por endpoint nos modulos restantes.
- Implementar CRUDs reais nos placeholders admin.

## Evolucao

Adicionar novos docs especificos quando surgirem modulos maiores: integracoes, auditoria, financeiro, performance, testes, seguranca e painel administrativo.
