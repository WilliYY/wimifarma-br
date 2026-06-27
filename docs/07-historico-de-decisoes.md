# 07 - Historico de Decisoes

Este arquivo registra decisoes tecnicas importantes. Sempre que uma decisao for tomada, alterada ou substituida, adicionar novo registro.

## 2026-05 - Framework inicial da plataforma

- Decisao: criar a base como plataforma comercial moderna, nao apenas site institucional.
- Motivo: permitir evolucao para ofertas, produtos, clientes, cupons, WhatsApp, admin, roleta e cashback.
- Impacto: `src/app`, `src/components`, `src/features`, `prisma`, `docker-compose.yml`, `docs`.
- Riscos/cuidados: evitar crescimento desorganizado e manter modulos separados.

## 2026-05 - WhatsApp como conversao principal

- Decisao: priorizar WhatsApp em vez de checkout/pagamento.
- Motivo: fase inicial depende de atendimento humano, confirmacao de estoque, preco e orientacao.
- Impacto: `src/lib/site.ts`, `src/lib/whatsapp.ts`, componentes publicos e APIs de WhatsApp.
- Riscos/cuidados: nao prometer compra automatica.

## 2026-05 - Docker Compose com nomes exclusivos

- Decisao: usar `wimifarma-br-app`, `wimifarma-br-postgres`, `wimifarma-br-network` e `wimifarma-br-postgres-data`.
- Motivo: evitar conflito com Candy English e outros projetos.
- Impacto: `docker-compose.yml`, README e docs de deploy.
- Riscos/cuidados: Nginx Proxy Manager precisa estar na mesma network para acessar `wimifarma-br-app:3000`.

## 2026-05 - PostgreSQL nao exposto publicamente

- Decisao: Postgres fica apenas na rede Docker, sem porta publica.
- Motivo: seguranca.
- Impacto: `docker-compose.yml`.
- Riscos/cuidados: administracao direta do banco deve ser feita via container, tunnel ou ambiente controlado.

## 2026-05 - Auth.js com Credentials e Google preparado

- Decisao: usar NextAuth/Auth.js v5 com provider Credentials e Google opcional.
- Motivo: permitir admin inicial e preparar login social futuro.
- Impacto: `src/features/auth/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/types/next-auth.d.ts`.
- Riscos/cuidados: login temporario `adm / adm` deve ser removido ou protegido antes de producao.

## 2026-05 - Admin como skeleton modular

- Decisao: criar painel admin com sidebar e placeholders antes de CRUD real.
- Motivo: permitir visualizar estrutura e evoluir por modulos.
- Impacto: `src/app/admin`, `src/components/admin`.
- Riscos/cuidados: placeholders nao devem ser confundidos com funcionalidades finais.

## 2026-05 - Roleta publica redireciona para ofertas

- Decisao: manter `/roleta` publica redirecionando para `/ofertas`.
- Motivo: roleta real so deve existir quando houver regras comerciais, limites e antifraude.
- Impacto: `src/app/(site)/roleta/page.tsx`.
- Riscos/cuidados: nao ativar campanha real sem validacoes.

## 2026-05-10 - Documentacao oficial numerada

- Decisao: criar docs numerados de memoria longa e transformar `AGENTS.md` em manual obrigatorio para agentes.
- Motivo: futuras conversas do Codex precisam continuar o projeto sem depender do historico antigo do chat.
- Impacto: `README.md`, `AGENTS.md`, `docs/00-*` ate `docs/10-*`.
- Riscos/cuidados: manter docs atualizados sempre que arquitetura, banco, APIs, auth, permissoes, deploy, layout ou fluxos mudarem.

## 2026-05-23 - Home temporariamente focada em anuncio

- Decisao: remover da home publica as categorias em bolinhas e vitrines estaticas de medicamentos/destaques, mantendo o video e uma tela grande vazia para anuncio principal.
- Motivo: a prioridade comercial imediata e usar a primeira pagina como vitrine de campanha/anuncio, sem distrair com catalogo demonstrativo.
- Impacto: `src/components/site/home-page.tsx`, `src/components/site/site-header.tsx`, `src/lib/site.ts`, docs de fluxo e layout.
- Riscos/cuidados: a arte do anuncio deve respeitar dimensoes responsivas; catalogo/ofertas continuam pendentes para retorno futuro com dados reais.

## 2026-05-23 - Google OAuth apenas para clientes

- Decisao: tratar login Google como sessao `CUSTOMER`, sem permissao administrativa, mantendo admin por Credentials.
- Motivo: evitar que cliente autenticado por Google receba perfil de colaborador ou acesso ao painel reservado.
- Impacto: `src/features/auth/auth.ts`, `src/types/next-auth.d.ts`, `src/components/site/customer-auth-page.tsx`, `src/components/admin/admin-shell.tsx`.
- Riscos/cuidados: cliente Google nao deve ganhar permissoes administrativas; antes de liberar recursos sensiveis de cliente, revisar consentimento e dados obrigatorios.

## 2026-05-23 - Persistencia de cliente Google

- Decisao: criar ou atualizar `Customer` durante o callback JWT do login Google, usando e-mail, nome, foto e identificador Google.
- Motivo: permitir que clientes autenticados por Google tenham identidade persistente antes dos modulos de pedidos, clube, cashback e atendimento personalizado.
- Impacto: `prisma/schema.prisma`, `prisma/migrations/20260523224500_persist_google_customers/migration.sql`, `src/features/auth/auth.ts`, docs de banco e autenticacao.
- Riscos/cuidados: naquele momento o cadastro por formulario ainda estava pendente; telefone fica opcional no banco para clientes Google, mas atendimento comercial ainda deve coletar telefone/WhatsApp quando necessario.

## 2026-05-24 - Area do cliente Minha Conta

- Decisao: criar `/minha-conta` como painel de cliente com abas para usuario, entrega, senha e cashback.
- Motivo: dar ao cliente um lugar claro para completar telefone, endereco, criar senha e consultar informacoes de beneficios sem misturar com o admin.
- Impacto: `src/app/(site)/minha-conta/page.tsx`, `src/components/site/customer-account-panel.tsx`, `src/app/api/minha-conta/*`, `src/features/auth/auth.ts`, `prisma/schema.prisma`.
- Riscos/cuidados: redefinicao por email ainda depende de provedor de email e tokens; cashback segue informativo ate haver regra comercial aprovada.

## 2026-05-23 - Cofre admin para API e senhas

- Decisao: criar o modulo administrativo `API e Senhas` para guardar credenciais sensiveis cifradas no PostgreSQL.
- Motivo: centralizar client IDs, tokens e senhas administrativas sem versionar segredos no Git nem deixar valores soltos em conversas.
- Impacto: `prisma/schema.prisma`, `src/app/admin/api-senhas`, `src/app/api/admin/api-senhas`, `src/components/admin/secret-vault-panel.tsx`, `.env.example`.
- Riscos/cuidados: apenas `ADMIN` pode criar, revelar ou excluir; `SECRET_VAULT_KEY` precisa ser mantida estavel e segura, e secrets expostos em prints devem ser rotacionados.

## 2026-06-01 - Contador anonimo de visitantes

- Decisao: registrar visitas do site publico por identificador anonimo salvo no navegador e exibir o total no dashboard admin.
- Motivo: dar ao administrador uma metrica simples de entrada no site sem depender ainda de analytics externo.
- Impacto: `prisma/schema.prisma`, `src/app/api/visitas`, `src/components/site/site-visit-tracker.tsx`, `src/app/admin/dashboard/page.tsx`.
- Riscos/cuidados: nao usar dados pessoais diretos; IP fica apenas em hash opcional e a contagem representa navegadores/dispositivos, nao pessoas verificadas.

## 2026-06-02 - SEO tecnico basico

- Decisao: adicionar `robots.txt`, `sitemap.xml`, canonical e tags de compartilhamento social no App Router.
- Motivo: evitar 404 em arquivos basicos de indexacao e apresentar a Wimifarma melhor em buscadores e compartilhamentos.
- Impacto: `src/app/robots.ts`, `src/app/sitemap.ts`, `src/app/layout.tsx`.
- Riscos/cuidados: manter admin, APIs e area do cliente fora de indexacao publica.

## 2026-06-02 - Auditoria de browser com Playwright

- Decisao: adicionar script `audit:browser` para abrir rotas reais em desktop, tablet e mobile, capturando console, erros de pagina, falhas de request e screenshots.
- Motivo: auditorias futuras nao devem depender apenas de build e inspecao estatica quando houver suspeita de hidratacao, console ou responsividade.
- Impacto: `scripts/browser-audit.mjs`, `package.json`, `.gitignore`.
- Riscos/cuidados: screenshots ficam em `artifacts/browser-audit` e nao devem ser versionados.

## 2026-06-02 - Otimizacao conservadora de assets principais

- Decisao: trocar o favicon e `src/app/icon.svg` por SVG vetorial compacto e recomprimir o video principal mantendo resolucao e audio.
- Motivo: reduzir peso inicial de assets visiveis sem alterar identidade visual nem qualidade percebida do anuncio.
- Impacto: `public/favicon.svg`, `src/app/icon.svg`, `public/videos/thiago-cansado.mp4`, docs de layout.
- Riscos/cuidados: futuras trocas de video devem comparar qualidade visual antes de comprimir de forma mais agressiva.

## 2026-06-02 - Guard server-side por modulo admin

- Decisao: centralizar `adminRoutePermissions` e fazer paginas admin validarem roles no servidor, alem do filtro visual do menu.
- Motivo: impedir acesso por URL direta a modulos que o colaborador nao deve abrir.
- Impacto: `src/features/auth/permissions.ts`, `src/components/admin/admin-shell.tsx`, `src/components/admin/module-placeholder.tsx`, paginas em `src/app/admin`.
- Riscos/cuidados: todo novo modulo admin deve ser registrado no mapa de permissoes antes de ser publicado.

## 2026-06-27 - Criacao real de ADM e colaborador

- Decisao: substituir os placeholders `Criar ADM` e `Criar colaborador` por telas reais de criacao, listagem e bloqueio/reativacao de usuarios administrativos.
- Motivo: permitir que o administrador gerencie acessos sem depender de seed ou alteracao manual no banco.
- Impacto: `src/app/admin/criar-adm`, `src/app/admin/criar-colaborador`, `src/components/admin/admin-users-panel.tsx`, `src/app/api/admin/usuarios`.
- Riscos/cuidados: senhas temporarias devem ser fortes e trocadas pelo usuario; o login temporario `adm / adm` continua pendencia critica para remover/proteger antes de producao.
