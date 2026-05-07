# Wimifarma BR

Framework inicial da plataforma comercial Wimifarma BR, uma farmacia em Ivate-PR.

O projeto nasce como uma base profissional para site publico, landing page vendedora, admin reservado, ofertas, produtos, clientes, cupons, roleta promocional, WhatsApp, auditoria e cashback futuro.

## Stack

- Next.js 15 App Router
- TypeScript
- Tailwind CSS 4
- Shadcn/ui style components
- Prisma 7
- PostgreSQL 17
- Auth.js/NextAuth v5
- Zod
- React Hook Form
- Docker e Docker Compose

Tambem estao instalados: Framer Motion, GSAP, Lenis, TanStack Table, Recharts, date-fns, bcryptjs, lucide-react, sonner, sharp e qrcode.

## Rodar localmente no Windows

```powershell
cd C:\Projetos\wimifarma-br
npm.cmd install
copy .env.example .env
npm.cmd run dev
```

Abra:

```text
http://localhost:3000
```

Se quiser usar Docker local na porta separada da Candy English:

```powershell
docker compose up -d postgres
docker compose --profile tools run --rm migrate
docker compose --profile tools run --rm seed
docker compose up -d app
```

Health local via Docker:

```powershell
curl.exe http://127.0.0.1:3001/api/health
```

## Validacoes

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run prisma:validate
npm.cmd audit --audit-level=moderate
```

## Produção no Ubuntu

Projeto recomendado no servidor:

```text
/home/ubuntu/projetos/wimifarma-br
```

Comandos:

```bash
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

## Containers

- App: `wimifarma-br-app`
- Postgres: `wimifarma-br-postgres`
- Database: `wimifarma_br`
- User: `wimifarma_user`
- Volume: `wimifarma-br-postgres-data`
- Porta local: `127.0.0.1:3001:3000`

O Postgres nao e exposto publicamente.

## Nginx Proxy Manager

No Proxy Host:

```text
Domain Names: wimifarma.com.br, www.wimifarma.com.br
Scheme: http
Forward Hostname/IP: wimifarma-br-app
Forward Port: 3000
Websockets Support: ligado
Block Common Exploits: ligado
SSL: Request a new SSL Certificate
Force SSL: ligado
HTTP/2: ligado
```

Se o Nginx Proxy Manager nao encontrar `wimifarma-br-app`, conecte o container dele na rede do projeto:

```bash
docker network connect wimifarma-br-network nginx-proxy-manager-app-1
```

## Git

```powershell
git add .
git commit -m "Initialize Wimifarma platform framework"
git push -u origin main
```
