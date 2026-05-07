# Deploy Oracle Ubuntu

## Pasta

```bash
mkdir -p /home/ubuntu/projetos/wimifarma-br
cd /home/ubuntu/projetos/wimifarma-br
```

## Primeiro deploy

```bash
git clone https://github.com/WilliiY/wimifarma-br.git .
cp .env.example .env
nano .env
docker compose build
docker compose up -d postgres
docker compose --profile tools run --rm migrate
docker compose --profile tools run --rm seed
docker compose up -d app
curl http://127.0.0.1:3001/api/health
```

## Atualizacao

```bash
cd /home/ubuntu/projetos/wimifarma-br
git pull
docker compose build app
docker compose --profile tools run --rm migrate
docker compose up -d app
docker compose ps
```

## Nginx Proxy Manager

Use:

```text
Forward Hostname/IP: wimifarma-br-app
Forward Port: 3000
```

Se necessario:

```bash
docker network connect wimifarma-br-network nginx-proxy-manager-app-1
```
