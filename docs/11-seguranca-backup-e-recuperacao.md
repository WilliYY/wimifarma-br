# 11 - Seguranca, Backup e Recuperacao

## Objetivo

Registrar as protecoes ja aplicadas, o procedimento de backup e os controles que ainda dependem de servicos externos. Este documento nao substitui pentest nem revisao periodica.

## Protecoes Ativas no Aplicativo

- O acesso temporario `adm / adm` foi removido. Administradores devem existir no PostgreSQL com senha usando `bcrypt`.
- Falhas de login por credencial sao registradas em `LoginAttempt` e bloqueadas apos 8 tentativas em 15 minutos.
- `src/middleware.ts` rejeita mutacoes cross-site fora do Auth.js e aplica limites por IP nas APIs.
- As rotas administrativas e APIs reservadas validam sessao e role no servidor.
- As entradas das APIs usam Zod e as consultas usam Prisma, sem SQL concatenado.
- A sugestao de catalogo exige sessao `ADMIN` ou `MANAGER`, limita chamadas por IP, trata nome/categoria como dados nao confiaveis, valida a resposta do Gemini e nao envia dados de clientes, preco, estoque ou imagens ao provedor.
- Cookies do Auth.js usam as protecoes seguras do framework em producao.
- O site envia CSP, HSTS em producao, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` e `Permissions-Policy`.
- A CSP permite `unsafe-eval` somente no servidor de desenvolvimento porque o compilador do Next depende disso; o build de producao nao recebe essa permissao.

O rate limit do middleware e uma barreira complementar em memoria. Ele nao substitui protecao DDoS, WAF ou limitacao distribuida na borda.

## Protecoes Ativas no Servidor

- PostgreSQL sem porta publicada no host.
- Aplicacao publicada somente em `127.0.0.1:3001`, atras do Nginx Proxy Manager.
- SSH com chave publica e senha desabilitada.
- `fail2ban` para tentativas repetidas no SSH.
- Atualizacoes automaticas de seguranca do Ubuntu ativas.
- `.env` com permissao `600` no servidor.
- Logs Docker com rotacao por tamanho e quantidade.

O servidor e compartilhado com outros sistemas. Portas administrativas existentes nao devem ser fechadas sem testar antes um caminho alternativo por VPN ou Cloudflare Access.

## Backup Automatico

O timer `wimifarma-br-backup.timer` executa diariamente por volta de 02:30, com atraso aleatorio de ate 15 minutos.

Cada backup contem:

- `database.dump`: dump PostgreSQL em formato custom;
- `uploads.tar.gz`: volume `wimifarma-br-uploads` com imagens de produtos;
- `app.env`: segredos necessarios para recuperar autenticacao e cofre;
- `SHA256SUMS`: integridade dos tres arquivos.

Destino padrao:

```text
/home/ubuntu/backups/wimifarma-br/daily/AAAAMMDDTHHMMSSZ
```

Retencao local padrao: 14 dias. Diretorios e arquivos sao criados com acesso restrito ao usuario `ubuntu`.

Comandos operacionais:

```bash
sudo systemctl status wimifarma-br-backup.timer --no-pager
sudo systemctl start wimifarma-br-backup.service
sudo journalctl -u wimifarma-br-backup.service -n 100 --no-pager
./ops/verify-wimifarma-br-backup.sh /home/ubuntu/backups/wimifarma-br/daily/AAAAMMDDTHHMMSSZ
```

O backup local protege contra erro de deploy, mas nao contra perda total da VPS. Ainda e obrigatorio criar uma copia externa cifrada e testar restauracao trimestralmente.

## Recuperacao

Restauracao e uma operacao destrutiva e deve ocorrer somente em janela de manutencao.

1. Verificar `SHA256SUMS`, `pg_restore --list` e o arquivo de uploads com `ops/verify-wimifarma-br-backup.sh`.
2. Tirar um novo backup de emergencia do estado atual.
3. Parar apenas `wimifarma-br-app`; nao remover volumes.
4. Restaurar primeiro o dump em um banco temporario e validar tabelas, usuarios e produtos.
5. Restaurar o banco oficial somente depois da validacao e de aprovacao explicita.
6. Restaurar uploads preservando uma copia do volume atual.
7. Subir a aplicacao e testar `/api/health`, login, admin, produtos e imagens.

Nao usar `docker compose down -v`, `prisma migrate reset` ou exclusao manual de volume em producao.

## Dependencias

Dependabot abre atualizacoes semanais. O workflow `.github/workflows/security.yml` executa Prisma validate, typecheck, lint e bloqueia vulnerabilidades criticas conhecidas.

Em 2026-09-01, `npm audit` ficou sem vulnerabilidades criticas. Permaneceram 3 alertas altos ligados ao `prisma` de desenvolvimento e `deepmerge-ts`; nao existe correcao compativel com Prisma 7 no registro consultado. A ferramenta nao recebe entrada publica em runtime. Nao usar `npm audit fix --force`, pois ele propoe downgrade principal para Prisma 6.

## Pendencias Externas

### Prioridade alta

- Migrar o DNS para Cloudflare e ativar proxy, protecao DDoS gerenciada, WAF e rate limiting na borda.
- Impedir acesso direto ao IP de origem depois que o proxy estiver validado.
- Proteger `/admin/*` com MFA via Cloudflare Access ou implementar TOTP/WebAuthn no aplicativo.
- Enviar backup cifrado para um segundo provedor ou local fisico.
- Configurar monitoramento externo de disponibilidade, erros e alertas de backup.

### Prioridade recorrente

- Revisar Dependabot e `npm audit` semanalmente.
- Testar restauracao trimestralmente.
- Rotacionar chaves e credenciais quando houver exposicao ou troca de responsavel.
- Fazer pentest antes de integrar cobranca online e depois de mudancas relevantes em autenticacao, checkout ou APIs.
- Revisar portas administrativas da VPS e restringi-las por VPN ou Access sem interromper outros sistemas.
## Dados de Carrinho e Pedidos

- O carrinho usa `localStorage` apenas para identificadores, nomes, imagens, precos exibidos e quantidades; nao guarda sessao, senha ou dados de pagamento.
- `POST /api/pedidos` valida entrada, origem, volume de requisicoes, status do produto, estoque, restricoes e preco atual no servidor.
- Nome, telefone, e-mail opcional e endereco de entrega sao dados pessoais e devem aparecer apenas no checkout e no painel autenticado.
- A preferencia de pagamento nao inclui numero de cartao, CVV, senha, chave Pix do cliente ou dados bancarios.
- Auditorias de mudanca de status guardam identificadores e estados, sem copiar dados pessoais do pedido.
- Backups do PostgreSQL passam a incluir pedidos e devem seguir os mesmos controles de acesso, retencao e restauracao testada.
