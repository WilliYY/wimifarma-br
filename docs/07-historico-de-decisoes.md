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
- Riscos/cuidados: cliente Google ainda nao e persistido no banco; antes de liberar recursos de cliente, implementar cadastro real e regras de consentimento.
