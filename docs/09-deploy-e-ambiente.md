# 09 - Deploy e Ambiente

## O Que Esta Parte Faz

Documenta como o projeto roda localmente, via Docker e no servidor Ubuntu/Oracle.

## Arquivos Envolvidos

- `.env.example`
- `.gitignore`
- `.dockerignore`
- `Dockerfile`
- `docker-compose.yml`
- `next.config.ts`
- `prisma.config.ts`
- `README.md`

## Ambientes

### Desenvolvimento local com npm

Recomendado para ajustar layout e telas rapidamente:

```powershell
npm.cmd run dev
```

URL:

```text
http://localhost:3000
```

### Docker local

Recomendado para testar parecido com producao:

```powershell
docker compose up -d postgres
docker compose --profile tools run --rm migrate
docker compose --profile tools run --rm seed
docker compose up -d app
```

URL:

```text
http://127.0.0.1:3001
```

### Producao Ubuntu

Pasta recomendada:

```text
/home/ubuntu/projetos/wimifarma-br
```

Rotina operacional solicitada para agentes: salvo pedido contrario, apos finalizar alteracoes no projeto, fazer commit local, push para o GitHub e atualizar o servidor com `git pull` nessa pasta.

## Docker Oficial

- Container app: `wimifarma-br-app`
- Container postgres: `wimifarma-br-postgres`
- Rede: `wimifarma-br-network`
- Volume: `wimifarma-br-postgres-data`
- Porta host se necessaria: `127.0.0.1:3001:3000`

Postgres nao expoe porta no host.

## Nginx Proxy Manager

O proxy deve apontar para:

```text
wimifarma-br-app:3000
```

Se nao resolver, conectar o container do Nginx Proxy Manager:

```bash
docker network connect wimifarma-br-network nginx-proxy-manager-app-1
```

## SEO Tecnico

O App Router gera `robots.txt` e `sitemap.xml` em `src/app/robots.ts` e `src/app/sitemap.ts`.
As rotas administrativas, APIs e `/minha-conta` ficam bloqueadas para robos; as rotas publicas basicas entram no sitemap.

## Variaveis de Ambiente

Usar `.env.example` como contrato, mas nunca como senha final.

Obrigatorias em producao:

- `AUTH_SECRET`
- `SECRET_VAULT_KEY`
- `NEXTAUTH_URL`
- `AUTH_URL`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `ADMIN_NAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

`SECRET_VAULT_KEY` deve ser definida antes do primeiro uso do modulo `API e Senhas`. Se ela mudar depois de salvar segredos, os registros antigos precisarao ser recriptografados com planejamento.

## Regras de Negocio a Preservar

- `.env` real nunca entra no Git.
- Senhas de exemplo devem ser trocadas no servidor.
- `AUTH_URL` e `NEXTAUTH_URL` devem apontar para dominio real com HTTPS.
- Secrets de OAuth, APIs e senhas administrativas devem ficar no `.env` do servidor ou no cofre admin cifrado.
- Banco nao deve ser publico.
- Em atualizacoes com novas migrations, reconstruir tambem o servico `migrate` antes de rodar `docker compose --profile tools run --rm migrate`.

## Riscos

- Rodar comandos no projeto local errado (`wimifarma-com`).
- Usar senha de exemplo em producao.
- Nginx Proxy Manager fora da rede do app.
- Apagar volume de producao sem backup.
- DNS ainda propagando e SSL falhando temporariamente.

## Pendencias

- Documentar rotina de backup.
- Documentar restore.
- Documentar monitoramento e logs.
- Definir checklist de troca de secrets quando sair de desenvolvimento.
- Definir rotina de rotacao e recuperacao para `SECRET_VAULT_KEY`.

## Evolucao

Criar docs especificos para:

- backup e restauracao;
- observabilidade;
- hardening do Ubuntu;
- rotina de deploy com rollback.
