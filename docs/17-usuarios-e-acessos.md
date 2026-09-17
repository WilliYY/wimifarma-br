# Usuarios Wimifarma

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
- Backup anterior a publicacao validado em `/home/ubuntu/backups/wimifarma-br/pre-users-release/20260916T175014Z`. Snapshot financeiro anterior: zero pedidos, avaliacoes e carteiras.

Publicacao em producao e promocao real ainda pendentes de verificacao.
