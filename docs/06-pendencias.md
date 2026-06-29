# 06 - Pendencias

## Pendencias Criticas

### Remover ou proteger login temporario `adm / adm`

- Status: aberto.
- Impacto: qualquer pessoa poderia entrar como administrador se isso estiver em producao.
- Arquivo: `src/features/auth/auth.ts`.
- Caminho sugerido: permitir somente em ambiente local por variavel explicita, ou remover totalmente e usar admin criado pelo seed.

### Bloqueio real por permissao nas paginas admin

- Status: resolvido em 2026-06-02.
- Impacto anterior: o menu filtrava links por role, mas as paginas ainda precisavam de guard por rota.
- Arquivos: `src/components/admin/admin-shell.tsx`, `src/app/admin/*/page.tsx`.
- Resolucao: `adminRoutePermissions`, `requireAdminPageRoute` e `requireAdminPageRole` centralizam a permissao server-side por modulo.

## Pendencias Altas

### Atualizar dependencias com alertas do `npm audit`

- Status: resolvido em 2026-05-23.
- Impacto anterior: `npm audit --audit-level=moderate` apontava alerta alto no Next.js e alerta moderado em dependencia transitiva de lint.
- Arquivos: `package.json`, `package-lock.json`.
- Resolucao: `next` e `eslint-config-next` foram atualizados para `15.5.18`; `brace-expansion` transitivo foi atualizado para `5.0.6`; `npm audit --audit-level=moderate` passou sem vulnerabilidades.

### Permissoes granulares nas APIs

- Status: parcialmente iniciado.
- Impacto: `requireApiRole` e `requireAdminOnlyApi` existem, mas varios endpoints ainda usam `requireAdminApi` com `ADMIN` e `MANAGER` de forma geral.
- Arquivo: `src/features/auth/permissions.ts`.
- Caminho sugerido: revisar endpoint por endpoint e aplicar `requireApiRole(["ADMIN"])`, `requireApiRole(["ADMIN", "MANAGER", "STAFF"])` conforme regra real.

### Rotacionar segredo OAuth exposto

- Status: aberto.
- Impacto: o client secret do Google OAuth apareceu em captura de tela durante a configuracao.
- Arquivos: Google Cloud e `.env` do servidor.
- Caminho sugerido: gerar novo client secret no Google Cloud depois de concluir a configuracao, atualizar o `.env` do servidor e nunca salvar esse valor no Git.

### Cadastro real de clientes

- Status: parcialmente resolvido em 2026-05-24.
- Impacto: login Google e cadastro por email/telefone/senha criam/atualizam `Customer`; ainda falta verificacao de email e redefinicao real por email.
- Arquivos: `src/components/site/customer-auth-page.tsx`, `src/components/site/customer-account-panel.tsx`, `src/features/customers`, `src/app/api/minha-conta/*`.

### Redefinicao de senha por email

- Status: aberto.
- Impacto: a area do cliente mostra a acao, mas o envio automatico depende de configurar um provedor de email e fluxo de token seguro.
- Arquivos: futura API de reset, `.env.example`, docs de autenticacao.
- Caminho sugerido: definir provedor de email, criar token de reset com expiracao e auditar solicitacoes.

### Google OAuth real

- Status: fluxo de login/logout validado em producao em 2026-05-23; persistencia real de cliente implementada em 2026-05-23.
- Impacto: botao consulta os providers do Auth.js e inicia Google quando `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` existem no servidor; login Google cria sessao `CUSTOMER`, grava/atualiza `Customer` e nao acessa admin.
- Arquivos: `src/features/auth/auth.ts`, `prisma/schema.prisma`, `.env.example`, `src/components/site/customer-auth-page.tsx`.
- Caminho sugerido: rotacionar o segredo OAuth exposto durante a configuracao e testar bloqueio/consentimento quando houver area real de cliente.

### CRUD real no admin

- Status: parcialmente resolvido em 2026-06-29.
- Impacto: criacao de ADM e colaborador ja cria usuarios reais com email, senha, role, listagem e bloqueio/reativacao; cupons ja cria registros reais com validade e contador de uso; catalogos, ofertas, temas, cashback e clube ainda seguem como modulos em evolucao.
- Arquivos: `src/app/admin/*`, `src/components/admin/admin-users-panel.tsx`, `src/components/admin/coupons-panel.tsx`, `src/app/api/admin/usuarios/*`, `src/app/api/cupons/route.ts`, `src/components/admin/module-placeholder.tsx`.

## Pendencias Medias

### Site publico usar dados do banco

- Status: aberto.
- Impacto: home esta temporariamente focada em anuncio e nao exibe cards estaticos; catalogo/ofertas ainda precisam vir do banco quando essa vitrine voltar.
- Arquivos: `src/components/site/home-page.tsx`, `src/app/(site)/page.tsx`.

### Auditoria de mutacoes

- Status: aberto.
- Impacto: `AuditLog` existe, mas mutacoes reais ainda nao registram tudo.
- Arquivos: `prisma/schema.prisma`, `src/app/api/*`.

### Politica do cofre `API e Senhas`

- Status: aberto.
- Impacto: o cofre salva segredos cifrados, mas ainda falta politica formal de rotacao, backup, exportacao segura e troca de `SECRET_VAULT_KEY`.
- Arquivos: `src/lib/secret-vault.ts`, `src/app/api/admin/api-senhas/*`, `docs/09-deploy-e-ambiente.md`.

### Roleta real

- Status: aberto.
- Impacto: modelos existem, mas fluxo publico esta redirecionando para ofertas.
- Arquivos: `src/app/(site)/roleta/page.tsx`, `src/app/api/roleta/route.ts`, `src/features/spin-wheel/schema.ts`.
- Regra: nao ativar comercialmente sem limites, probabilidades, antifraude e auditoria.

### Cashback real

- Status: aberto.
- Impacto: modelos/API inicial e resumo na area do cliente existem, mas sem regra comercial aprovada.
- Arquivos: `src/app/api/cashback/route.ts`, `src/features/cashback/schema.ts`, `src/components/site/customer-account-panel.tsx`.

### Testes automatizados

- Status: aberto.
- Impacto: validacoes atuais sao lint/typecheck/build, mas nao ha testes de unidade/e2e documentados.

## Pendencias Baixas

### Docs antigos nao numerados

- Status: mantidos por compatibilidade.
- Arquivos: `docs/arquitetura.md`, `docs/roadmap.md`, `docs/regras-de-negocio.md`, `docs/producao-checklist.md`, `docs/deploy-oracle.md`, `docs/modulos.md`.
- Caminho sugerido: manter ou futuramente substituir por referencias aos docs numerados.

### Conteudo institucional final

- Status: aberto.
- Impacto: textos, telefone, horario e imagens definitivas ainda podem precisar ajuste.

## Riscos Gerais

- Projeto errado aberto no Docker Desktop (`wimifarma-com` em vez de `wimifarma-br`).
- Senhas de exemplo usadas no servidor.
- Nginx Proxy Manager fora da rede `wimifarma-br-network`.
- Dados reais em seed/testes.
