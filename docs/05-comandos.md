# 05 - Comandos

## O Que Esta Parte Faz

Centraliza comandos usados para desenvolvimento, validacao, Docker, deploy e diagnostico.

## Desenvolvimento Local

```powershell
cd C:\Projetos\wimifarma-br
npm.cmd install
copy .env.example .env
npm.cmd run dev
```

Abrir:

```text
http://localhost:3000
```

## Validacao Local

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run prisma:validate
npm.cmd run audit:browser
npm.cmd audit --audit-level=moderate
```

## Auditoria de Browser

```powershell
$env:AUDIT_BASE_URL='http://127.0.0.1:3001'
npm.cmd run audit:browser
```

O script usa Playwright para abrir rotas publicas em desktop, tablet e mobile, capturar console/pageerror/requestfailed e salvar screenshots em `artifacts/browser-audit`.

Se o audit falhar por certificado:

```powershell
$env:NODE_OPTIONS='--use-system-ca'
npm.cmd audit --audit-level=moderate
```

## Prisma

```powershell
npm.cmd run prisma:generate
npm.cmd run prisma:validate
npm.cmd run prisma:deploy
npm.cmd run prisma:seed
```

## Docker Local

```powershell
cd C:\Projetos\wimifarma-br
docker compose up -d postgres
docker compose --profile tools run --rm migrate
docker compose --profile tools run --rm seed
docker compose up -d app
docker compose ps
curl.exe http://127.0.0.1:3001/api/health
```

Parar Docker local da Wimifarma BR:

```powershell
docker compose down
```

Remover volume local da Wimifarma BR somente se quiser apagar o banco local:

```powershell
docker volume rm wimifarma-br-postgres-data
```

Nunca fazer isso em producao sem backup e confirmacao.

## Deploy Ubuntu

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
docker compose --profile tools build migrate
docker compose --profile tools run --rm migrate
docker compose up -d app
docker compose ps
curl http://127.0.0.1:3001/api/health
```

## Nginx Proxy Manager

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

Conectar NPM na rede se necessario:

```bash
docker network connect wimifarma-br-network nginx-proxy-manager-app-1
```

## Diagnostico

Containers:

```powershell
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

Logs:

```powershell
docker logs --tail 80 wimifarma-br-app
docker logs --tail 80 wimifarma-br-postgres
```

Uso de recursos:

```powershell
docker stats
```

Git:

```powershell
git status --short
git log --oneline -5
```

## Riscos

- Rodar comandos no projeto errado (`wimifarma-com` ou `candy-english`).
- Apagar volume de producao.
- Usar `.env.example` como `.env` em producao sem trocar senhas.
