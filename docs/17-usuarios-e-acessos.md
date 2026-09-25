# Usuarios Wimifarma

## Padrao de acesso rapido ao painel (2026-09-23)

- O cabecalho publico exibe o atalho textual **Painel admin** para `/admin/dashboard` no celular, tablet e desktop. Desde 2026-09-25, no desktop ele integra o cartao da conta, abaixo do nome/saldo; no celular ocupa a largura do grupo de controles.
- A visibilidade e calculada no servidor com `canAccessAdminRole` e `adminRoutePermissions["/admin/dashboard"]`: ADMIN, MANAGER e STAFF. Visitantes, CUSTOMER e perfis desconhecidos nao recebem o atalho.
- Reutilizar sempre a permissao da rota de destino; nao criar uma lista paralela de perfis nem conceder acesso pela simples exibicao do botao. As rotas administrativas continuam validando a sessao e suas permissoes no servidor.
- Preservar os acessos a Minha conta, carrinho e Sair, a logo oficial e a altura do cabecalho. O atalho tem texto visivel, icone decorativo e foco por teclado, sem menu adicional ou JavaScript novo.
- Implementacao: `src/components/site/site-header.tsx`. Ao alterar o cabecalho, conferir contas internas com e sem cadastro de cliente vinculado, alem de clientes comuns e visitantes.
- Em telas abaixo de 390px, Minha conta usa um icone com nome acessivel para manter todos os controles dentro da tela; nome/saldo permanecem na pagina da conta e reaparecem no cabecalho a partir de 390px. Entre 768px e 1023px a logo ocupa 128px e o formulario de busca pode encolher (`min-w-0`), preservando espaco para digitar e para os controles.
- Padrao visual dos perfis internos (2026-09-25): cartao branco com borda discreta, foto/nome/saldo e atalho vermelho integrado. Carrinho e Sair ficam centralizados verticalmente com o cartao; Sair usa icone com nome acessivel e tooltip. O layout da conta comum permanece igual e nao recebe o cartao administrativo nem o atalho.

### Validacao do atalho

- Ajuste de 2026-09-25: `node scripts/header-access-audit.mjs` aprovado em 70 cenarios, acrescentando 1280, 1536 e 1920px e verificacoes geometricas do alinhamento entre cartao, carrinho e Sair. Inclui ausencia do atalho no HTML de visitantes, CUSTOMER e perfil desconhecido. `npm.cmd run typecheck`, ESLint dos arquivos alterados e `git diff --check` aprovados.
- `node scripts/header-access-audit.mjs` apos o build: 49 cenarios aprovados (visitante, CUSTOMER, ADMIN, ADMIN com cliente vinculado, MANAGER, STAFF e perfil desconhecido; larguras 320, 360, 390, 640, 768, 1024 e 1440px).
- A auditoria renderiza o componente real com sessoes sinteticas: verifica visibilidade, destino, foco de teclado, Minha conta/Sair, altura constante, controles dentro da tela e largura util da busca. Nao acessa banco ou envia requisicoes externas.
- `node node_modules/tsx/dist/cli.mjs --test src/features/auth/customer-session.test.ts`: 3 testes aprovados, incluindo rebaixamento e bloqueio de acesso. `node node_modules/eslint/bin/eslint.js .`, `npm.cmd run build` (incluindo tipos) e `git diff --check` aprovados; JavaScript inicial da home permanece 206 kB.
- Arquivos: cabecalho, ajuste de largura em `site-search.tsx`, auditoria acima, este contrato, `docs/10-layout-e-experiencia.md`, `docs/07-historico-de-decisoes.md` e lembrete em `AGENTS.md`. Sem migration ou alteracao de contas/permissoes/dados comerciais.

## Contrato aprovado em 2026-09-16

- `/admin/usuarios` e `GET/PATCH /api/admin/pessoas` exigem ADMIN; nunca enviam senha, hash, documento, subject Google ou token.
- Lista paginada de 20 pessoas, busca por nome/email, filtros de perfil/status, hierarquia e ultimo login bem-sucedido. Nao rastreia visitantes anonimos ou presenca online.
- Ranking por valor efetivamente pago (`Order.totalCents`, apos descontos, incluindo entrega) ou numero de pedidos: somente COMPLETED + PAID, excluindo cancelados e reembolsados. Compras de convidado nao sao atribuidas por mera coincidencia de email.
- Perfis ADMIN, MANAGER, STAFF e CUSTOMER. A mudanca exige confirmacao explicita na tela e auditoria atomica no banco. Sem exclusao de pessoas/historico.
- User.customerId e um vinculo opcional, unico e explicito com Customer. A mesma pessoa aparece uma vez, preservando pedidos, avaliacoes e carteira.
- Google concede privilegios somente com email verificado, subject correspondente e vinculo administrativo criado por ADMIN. Sem promocao automatica por email ou dominio. Uma sessao antiga de cliente precisa de novo login Google para assumir novos privilegios.
- Token guarda identidade do cliente separada do ID administrativo. Roles e bloqueios sao relidos do banco. Democao Google volta ao cliente; sessao administrativa por senha perde acesso ate novo login.
- Contas promovidas pelo Google usam um marcador nao autenticavel no campo passwordHash. Senha de cliente nunca desbloqueia esse acesso administrativo; Google continua obrigatorio. Contas locais promovidas mantem senha protegida e sincronizada entre os dois cadastros.
- Alteracoes administrativas usam advisory lock transacional comum, inclusive o endpoint antigo de bloquear/reativar. Revalidam o ADMIN dentro da transacao, impedem auto-rebaixamento/auto-bloqueio, perda do ultimo ADMIN e atualizacao com versao antiga.
- Login `adm / adm` permanece removido. Nao ha senha publica ou bypass de producao.

## Carrinho

O painel continua nao modal: pagina rolavel, sem backdrop bloqueador. Clique fora fecha pelo Radix com animacao lateral de 300ms; foco por teclado fora nao fecha automaticamente. Escape, X e links internos continuam fechando. Movimento reduzido respeitado.

## Publicacao e validacao

Migration aditiva `20260916120000_user_customer_access`. Fazer backup verificado antes de aplicar. Testar autenticacao, revogacao, concorrencia, ranking, isolamento e layout com dados sinteticos no banco descartavel. Promocao inicial do proprietario somente apos conferir o cadastro Google solicitado, em transacao auditada. MFA aplicativo permanece pendente; proteger a conta Google com verificacao em duas etapas.

## Evidencias locais

- `npm test`: 97 testes aprovados; build com lint/TypeScript e `prisma validate` aprovados; `npm audit --audit-level=moderate`: zero vulnerabilidades.
- `scripts/users-access-audit.ts`: API reservada, versao antiga rejeitada, promocao/rebaixamento/bloqueio Google, preservacao da identidade de cliente, concorrencia de dois administradores e ranking financeiro aprovados.
- Playwright: edicao de perfil e telas 320/390/768/1440 sem overflow ou erros JS; carrinho fecha por clique fora e Escape, permite rolar/navegar e respeita movimento reduzido.
- `ops/grant-google-admin.sql` testado com rollback: identidade errada rejeitada, repeticao idempotente e vinculo Google-only unico.
- QA usa banco descartavel em `127.0.0.1:55439/cashback_test`, servidor `127.0.0.1:3010` e o mesmo `AUTH_SECRET` sintetico nos dois processos. Nunca copiar a chave de producao para o teste.
- O retorno `void` de `pg_advisory_xact_lock` precisou de cast para `text` para ser desserializado pelo Prisma; a transacao e o lock foram preservados.
- Backup anterior a publicacao validado em `/home/ubuntu/backups/wimifarma-br/pre-users-release/20260917T013857Z`. Snapshot financeiro anterior: zero pedidos, avaliacoes e carteiras.

## Evidencias de producao

- Publicado o commit `49cff39` em 2026-09-16 (2026-09-17 UTC), com build app/tools, aplicacao das duas migrations aditivas e recriacao do app. Nova execucao confirmou 13 migrations sem pendencias.
- Container `wimifarma-br-app` saudavel e `/api/health` com HTTP 200. Sem sessao, `/admin/usuarios` redireciona para `/login` (307) e `/api/admin/pessoas` retorna 401.
- Cadastro Google do proprietario conferido e promovido em transacao auditada (`OWNER_GOOGLE_ADMIN_GRANTED`). Leitura posterior confirmou ADMIN ativo, vinculo com o cliente original e acesso Google-only. Nenhuma senha publica foi criada.
- A sessao antiga nao ganha privilegios automaticamente: o proprietario deve sair e entrar novamente pelo Google. O login interativo real permanece a conferir pelo titular; o fluxo de sessao Google foi validado com identidades sinteticas no ambiente isolado.
- Playwright anonimo em producao, nas larguras 390/1440, confirmou abertura da cesta e fechamento por clique fora, sem overflow horizontal ou erros JavaScript. Testes locais tambem cobrem Escape, rolagem, navegacao e movimento reduzido.
- Banco de QA sem fixtures ao encerrar; servidor local, tunel SSH e container descartavel encerrados. Nenhum dado financeiro real foi alterado para validacao.
- Cuidado operacional: manter verificacao em duas etapas na conta Google; MFA proprio da aplicacao continua pendente.
