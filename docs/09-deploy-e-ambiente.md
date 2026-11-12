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
- Container de remocao de fundo: `wimifarma-br-background-removal`
- Container postgres: `wimifarma-br-postgres`
- Rede: `wimifarma-br-network`
- Volume: `wimifarma-br-postgres-data`
- Volume de imagens: `wimifarma-br-uploads`
- Porta host se necessaria: `127.0.0.1:3001:3000`

Postgres nao expoe porta no host.

As imagens enviadas pelo admin ficam em `public/uploads/products` dentro do container e sao preservadas no volume `wimifarma-br-uploads`. Esse volume deve entrar na rotina de backup junto com o banco; atualizar ou reconstruir o container nao deve apagar as fotos.

O runner copia `public` com proprietário `nextjs:nodejs`, assim como `.next`. Isso permite servir assets novos mesmo quando o checkout Git usa modo `600`; a aplicação continua como usuário 1001, sem executar como root. Validar imagens por GET real e leitura dos bytes com o usuário da aplicação: HEAD pode passar sem comprovar acesso ao conteúdo.

Desde 2026-09-19, um rewrite `beforeFiles` encaminha `/uploads/products/:fileName` para `/api/imagens/produtos/[fileName]`. A rota le o volume dinamicamente, valida nome/assinatura WebP e usa ETag/cache imutavel. Isso evita depender do indice de arquivos publicos montado no inicio do Next. Nao criar regra no proxy que ignore essa rota nem armazenar respostas 404 em cache. Fotos antigas conservam URLs e bytes.

`BACKGROUND_REMOVAL_URL` aponta por padrao para `http://background-removal:7000`. O servico usa `rembg` com o modelo aberto `u2net`, fica somente na rede Docker interna, inicia com um worker e tem limite padrao de 2 GB de memoria. Nao publicar a porta `7000` no host.

`REMOVE_BG_API_KEY` e opcional e funciona apenas como alternativa externa quando `BACKGROUND_REMOVAL_URL` estiver vazio. A chave deve permanecer somente no `.env` do servidor e nunca no Git. Sem nenhum provedor, upload, WebP, compressao, editor e biblioteca continuam funcionando, mas o controle `Remover fundo com IA` fica desabilitado.

`GEMINI_API_KEY` ativa a Miauby e as sugestoes de cadastro de produtos. `GEMINI_MODEL` usa `gemini-2.5-flash` quando nao for informado. A sugestao de cadastro envia ao Google somente nome, marca, EAN e nomes das categorias existentes, faz uma chamada com Google Search para conferir o produto e outra para estruturar o resultado. A Miauby envia a pergunta, ate seis mensagens recentes e os dados publicos de ate quatro produtos relacionados; nao persiste a conversa no banco. Emergencias e dados financeiros evidentes nao seguem ao Gemini. A chave deve ficar apenas no `.env` do servidor; sem ela, a Miauby usa respostas locais e o cadastro manual continua funcionando.

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

`/google-products.xml` é uma fonte pública, paginada internamente, apenas com dados comerciais públicos elegíveis. Produtos novos/alterados entram a cada consulta, sem exportação manual. Falha inicial no banco retorna 503; sitemap também falha em vez de fornecer mapa parcial com sucesso.

A migration `20260922140000_product_trash` adiciona retenção de produtos. Fazer backup verificado e reconstruir `app` e `migrate` antes de aplicá-la. `PRODUCT_MAINTENANCE_ENABLED` é `true` por padrão no Docker. O hook `instrumentation.ts` inicia limpeza somente em Node de produção com essa variável ativa, após 30 segundos e a cada hora. Logs: `[products:retention] started`, `completed` ou `failed`. Desativar/recriar app interrompe novas execuções; não reverte exclusões já feitas. Contrato e QA isolado em `docs/25-seo-automatico-e-lixeira.md`.

## Auditoria Visual e Console

Instale as dependências com `npm.cmd ci` e, para as auditorias no navegador, instale o Chromium com `npx.cmd playwright install chromium`.

| Tarefa | Comando |
| --- | --- |
| Conferir busca, vitrine e apresentação de produtos | `npm.cmd run test:catalog-discovery` |
| Exercitar cadastro e edição de catálogo em base descartável | `npm.cmd run audit:catalog` com a fixture isolada |
| Diagnosticar checkout, frete e Pix em cenário sintético | `npm.cmd run audit:checkout` |
| Verificar acessibilidade da loja local | `npm.cmd run audit:accessibility` |
| Capturar telas e erros de console | `npm.cmd run audit:browser` |

`audit:checkout` intercepta as requisições e usa respostas sintéticas. O `report.json` e as capturas ficam em `outputs/checkout-shipping-review` por padrão. Para outro destino, defina `AUDIT_OUTPUT_DIR`. Para homologar transações e webhooks do provedor, siga o [roteiro do Mercado Pago](28-mercado-pago.md).

`audit:accessibility` usa axe e Chromium em rotas públicas, nos tamanhos móvel e desktop. A auditoria usa uma sessão anônima com recursos da própria origem. A saída indica a regra, a quantidade de elementos afetados e até três seletores por regra. Código `0` indica execução sem violações, `1` indica violações e `2` indica erro de execução. Use `AUDIT_BASE_URL` ou `npm.cmd run audit:accessibility -- --base-url http://127.0.0.1:3001 --route /catalogo` para direcionar a checagem. Combine o resultado com revisão por teclado e leitor de tela.

`audit:browser` aceita `AUDIT_BASE_URL` para local, Docker ou homologação e grava as capturas em `artifacts/browser-audit`, pasta ignorada pelo Git.

O workflow de segurança também roda o build Next.js em PRs, pushes para `main` e execuções manuais. Após subir o serviço, execute `bash ops/check-wimifarma-br-release.sh` na VPS com Python 3 disponível. Para conferir também o domínio público, passe `--public-url` com a URL HTTPS da loja. O script verifica `/api/health`, a home e o checkout por GET. A validação de pagamentos continua no roteiro próprio.

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
- `.env` real deve usar permissao `600` no servidor.
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

- Documentar monitoramento e logs.
- Definir checklist de troca de secrets quando sair de desenvolvimento.
- Definir rotina de rotacao e recuperacao para `SECRET_VAULT_KEY`.
- Configurar destino externo, validar a restauração isolada da cópia cifrada via Restic e configurar alerta de falha.

## Evolucao

Documentos e evolucoes:

- backup e restauracao: `docs/11-seguranca-backup-e-recuperacao.md`;
- observabilidade;
- hardening do Ubuntu;
- rotina de deploy com rollback.
