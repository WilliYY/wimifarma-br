# Wimifarma BR

Plataforma comercial da Wimifarma, farmacia em Ivate-PR. O projeto nao e WordPress, nao depende de HostGator e nao deve ser misturado com Candy English.

## Objetivo

Criar uma base moderna e evolutiva para site publico, ofertas, catalogo, atendimento via WhatsApp, login, painel administrativo, APIs internas, banco de dados e modulos futuros como cupons, roleta promocional controlada e cashback.

Nesta fase o sistema prioriza conversao por WhatsApp. Nao existe checkout nem pagamento online implementado.

## Stack

- Next.js 15 com App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Componentes estilo shadcn/ui
- Prisma 7 com PostgreSQL 17
- Auth.js / NextAuth v5
- Zod
- React Hook Form
- Docker e Docker Compose
- Framer Motion, GSAP, Lenis
- TanStack Table, Recharts, date-fns
- bcryptjs, lucide-react, sonner, sharp, qrcode

## Status Atual

- Site publico com home temporariamente focada em anuncio: video principal, espaco grande reservado para banner e chamada para WhatsApp.
- Rotas publicas basicas criadas: `/`, `/ofertas`, `/farmacia-popular`, `/delivery`, `/sobre`, `/contato`, `/roleta`, `/login`.
- A rota `/ofertas` continua existindo, mas nao aparece no menu principal enquanto a home estiver focada em anuncio.
- `/roleta` publica redireciona para `/ofertas`; a roleta real fica pendente para fase futura.
- Login/cadastro visual existe em `/login`.
- Login administrativo usa Auth.js Credentials e direciona para `/admin/dashboard`.
- Painel admin existe como estrutura inicial com placeholders de modulos.
- APIs reservadas existem e exigem sessao `ADMIN` ou `MANAGER`.
- Prisma schema, migration inicial e seed existem.
- Docker Compose oficial usa `wimifarma-br-app` e `wimifarma-br-postgres`.
- Pendencia critica: o login temporario `adm / adm` existe para desenvolvimento e deve ser removido ou protegido antes de producao.

## Instalacao Local

No Windows:

```powershell
cd C:\Projetos\wimifarma-br
npm.cmd install
copy .env.example .env
```

Edite o `.env` local e troque os valores de exemplo. Nunca suba `.env` real para o Git.

## Rodar em Desenvolvimento

Uso recomendado para mexer em layout, telas e componentes:

```powershell
cd C:\Projetos\wimifarma-br
npm.cmd run dev
```

Abra:

```text
http://localhost:3000
```

Observacao: `localhost:3002` pode ser outro projeto local chamado `wimifarma-com`; nao confundir com `wimifarma-br`.

## Rodar com Docker Local

Use Docker quando quiser testar mais perto da producao:

```powershell
cd C:\Projetos\wimifarma-br
docker compose up -d postgres
docker compose --profile tools run --rm migrate
docker compose --profile tools run --rm seed
docker compose up -d app
curl.exe http://127.0.0.1:3001/api/health
```

O app fica em:

```text
http://127.0.0.1:3001
```

## Comandos Principais

```powershell
npm.cmd run dev
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run prisma:validate
npm.cmd run prisma:generate
npm.cmd run prisma:deploy
npm.cmd run prisma:seed
npm.cmd audit --audit-level=moderate
```

Se o `npm audit` falhar por certificado no Windows:

```powershell
$env:NODE_OPTIONS='--use-system-ca'
npm.cmd audit --audit-level=moderate
```

## Estrutura de Pastas

```text
src/app/(site)        Rotas publicas
src/app/admin         Rotas administrativas
src/app/api           APIs internas
src/components/site   Componentes do site publico
src/components/admin  Shell e componentes do painel
src/components/ui     Componentes base
src/components/motion Componentes de animacao
src/features          Schemas e logica por modulo
src/lib               Prisma, env, site config e helpers
src/types             Tipos globais e dominio
src/hooks             Hooks reutilizaveis
prisma                Schema, migration e seed
docs                  Memoria longa do projeto
public                Assets publicos, logo e videos
```

## Variaveis de Ambiente

Base em `.env.example`. Valores reais devem ficar apenas no `.env` local ou no servidor.

| Variavel | Uso |
| --- | --- |
| `APP_HOST_BIND` | Bind da porta local Docker, normalmente `127.0.0.1`. |
| `APP_PORT` | Porta local do app Docker, normalmente `3001`. |
| `NEXTAUTH_URL` | URL publica usada pelo Auth.js. |
| `AUTH_URL` | URL base usada pelo Auth.js. |
| `AUTH_SECRET` | Segredo forte do Auth.js. Obrigatorio em producao. |
| `NODE_OPTIONS` | Limite/ajuste de memoria do Node. |
| `POSTGRES_DB` | Nome do banco. |
| `POSTGRES_USER` | Usuario do banco. |
| `POSTGRES_PASSWORD` | Senha do banco. Nao versionar. |
| `DATABASE_URL` | String de conexao do Prisma. |
| `ADMIN_NAME` | Nome do admin criado pelo seed. |
| `ADMIN_EMAIL` | Email do admin criado pelo seed. |
| `ADMIN_PASSWORD` | Senha inicial do admin. Trocar sempre. |
| `ADMIN_RESET_PASSWORD` | Permite resetar senha via seed quando `true`. |
| `GOOGLE_CLIENT_ID` | OAuth Google futuro. |
| `GOOGLE_CLIENT_SECRET` | OAuth Google futuro. |

## Docker Oficial

- App: `wimifarma-br-app`
- Postgres: `wimifarma-br-postgres`
- Database: `wimifarma_br`
- User: `wimifarma_user`
- Volume: `wimifarma-br-postgres-data`
- Network: `wimifarma-br-network`
- Porta local: `127.0.0.1:3001:3000`

O PostgreSQL nao deve ter porta publica.

## Deploy Oracle Ubuntu

Pasta recomendada:

```text
/home/ubuntu/projetos/wimifarma-br
```

Primeiro deploy:

```bash
cd /home/ubuntu/projetos
git clone https://github.com/WilliiY/wimifarma-br.git wimifarma-br
cd /home/ubuntu/projetos/wimifarma-br
cp .env.example .env
nano .env
docker compose build
docker compose up -d postgres
docker compose --profile tools run --rm migrate
docker compose --profile tools run --rm seed
docker compose up -d app
curl http://127.0.0.1:3001/api/health
```

Atualizacao:

```bash
cd /home/ubuntu/projetos/wimifarma-br
git pull
docker compose build app
docker compose --profile tools run --rm migrate
docker compose up -d app
docker compose ps
curl http://127.0.0.1:3001/api/health
```

## Nginx Proxy Manager

Proxy Host:

```text
Domain Names: wimifarma.com.br, www.wimifarma.com.br
Scheme: http
Forward Hostname/IP: wimifarma-br-app
Forward Port: 3000
Websockets Support: ligado
Block Common Exploits: ligado
SSL: Let's Encrypt
Force SSL: ligado
HTTP/2: ligado
```

Se o Nginx Proxy Manager nao resolver `wimifarma-br-app`, conecte o container dele na rede do projeto:

```bash
docker network connect wimifarma-br-network nginx-proxy-manager-app-1
```

## Documentacao

A pasta `docs/` e a memoria longa do projeto. Comece por:

- `docs/00-visao-geral.md`
- `docs/01-arquitetura.md`
- `docs/02-banco-de-dados.md`
- `docs/03-fluxos-do-sistema.md`
- `docs/04-padroes-de-codigo.md`
- `docs/05-comandos.md`
- `docs/06-pendencias.md`
- `docs/07-historico-de-decisoes.md`
- `docs/08-autenticacao-e-permissoes.md`
- `docs/09-deploy-e-ambiente.md`
- `docs/10-layout-e-experiencia.md`

## Cuidados

- Nao versionar `.env` real.
- Nao colocar senha real no repositorio.
- Nao usar dados reais de clientes em seed, teste ou exemplo.
- Nao implementar checkout/pagamento nesta fase.
- Nao misturar este projeto com `candy-english` ou `wimifarma-com`.
- Antes de producao, resolver as pendencias de seguranca em `docs/06-pendencias.md`.
