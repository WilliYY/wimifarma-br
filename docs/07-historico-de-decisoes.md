# 07 - Historico de Decisoes

## 2026-09-01 - Primeira camada de hardening e backup automatico

- Decisao: remover `adm / adm`, aplicar cabecalhos seguros, validacao de origem e rate limit nas APIs, atualizar dependencias compativeis e automatizar backup diario validado.
- Motivo: reduzir risco imediato de invasao e perda de dados sem alterar regras comerciais nem introduzir checkout.
- Impacto: `src/features/auth/auth.ts`, `src/middleware.ts`, `next.config.ts`, dependencias, workflow de seguranca, Dependabot, `ops/*` e documentacao operacional.
- Riscos/cuidados: o limitador em memoria nao substitui WAF; Cloudflare, MFA, copia externa, alertas e pentest continuam pendentes. O Prisma de desenvolvimento mantem 3 alertas altos sem correcao compativel com Prisma 7.

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

## 2026-07-15 - Vitrine Melhor oferta na home

- Decisao: adicionar uma vitrine fixa `Melhor oferta` entre o video principal e a faixa de campanhas, com 15 espacos de produto e grade 5x3 no desktop.
- Motivo: permitir comecar a divulgar produtos na primeira pagina sem depender ainda do catalogo/admin definitivo.
- Impacto: `src/components/site/home-page.tsx`, `README.md`, `docs/10-layout-e-experiencia.md`.
- Riscos/cuidados: os produtos 06 a 15 sao espacos temporarios com preco `Consulte`; trocar por dados reais ou integrar ao banco antes de tratar como catalogo final.

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

## 2026-06-29 - Criacao real de cupons no admin

- Decisao: substituir o placeholder `Cupons` por tela real de criacao e listagem usando o modelo `Coupon` existente.
- Motivo: permitir cadastrar cupom com nome/codigo, tipo, validade por dias ativos, limite de uso e contador de pessoas/usos registrados.
- Impacto: `src/app/admin/cupons`, `src/components/admin/coupons-panel.tsx`, `src/app/api/cupons/route.ts`, `src/features/coupons/schema.ts`.
- Riscos/cuidados: o contador atual representa usos registrados no cupom; ainda nao existe tabela separada para identificar pessoas unicas por cupom.

## 2026-07-17 - Cadastro de produtos com imagens WebP persistentes

- Decisao: substituir o placeholder de catalogos por cadastro real de produtos e converter imagens enviadas para WebP no servidor.
- Motivo: manter fotos de produtos leves e padronizadas sem exigir tratamento manual antes do envio.
- Impacto: `src/components/admin/products-catalog-panel.tsx`, APIs de produtos e upload, `docker-compose.yml` e volume `wimifarma-br-uploads`.
- Riscos/cuidados: imagens ficam fora do Git e precisam entrar no backup; a vitrine publica ainda depende de integracao futura com os produtos do banco.

## 2026-08-28 - Logo animada vetorial no header

- Decisao: substituir o GIF do header pelo SVG animado da marca, removendo o fundo azul original e mantendo o ciclo continuo de quatro segundos.
- Motivo: preservar nitidez em qualquer densidade de tela, melhorar o enquadramento e integrar a marca diretamente a faixa escura do cabecalho.
- Impacto: `public/brand/logo-animada.svg`, `src/components/site/site-header.tsx` e docs de layout.
- Riscos/cuidados: manter o `viewBox` e a proporcao da arte; futuras edicoes nao devem recolocar fundo nem ampliar a imagem a ponto de cortar a animacao.

## 2026-08-30 - Biblioteca e tratamento profissional de imagens de produtos

- Decisao: manter os arquivos no volume proprio da aplicacao, registrar metadados em `ProductImage` e preservar `Product.imageUrl` para compatibilidade. Novos produtos podem reutilizar uma imagem por `imageAssetId`.
- Motivo: evitar uploads repetidos, padronizar WebP, controlar peso e permitir administrar fotos diretamente no cadastro de produtos.
- Exibicao: miniaturas de uploads persistentes usam a URL WebP direta, pois o arquivo ja foi otimizado no envio; isso evita cache intermediario desatualizado logo apos cadastrar uma foto.
- Remocao de fundo: usar a API do remove.bg somente quando `REMOVE_BG_API_KEY` estiver configurada; o processamento local com Sharp continua responsavel por orientacao, dimensoes e compressao.
- Impacto: schema/migration Prisma, APIs de imagens, upload, formulario de catalogos, Docker Compose, `.env.example` e documentacao operacional.
- Riscos/cuidados: remocao de fundo envia a foto ao provedor externo e pode consumir creditos; arquivos e banco precisam entrar juntos no backup; conversao nao recupera detalhes ausentes em uma foto de baixa resolucao.

## 2026-08-30 - Proporcao padrao do banner principal

- Decisao: padronizar o hero da home em `8:3` nas telas grandes, com exibicao maxima de `1280 x 480 px`, mantendo altura fluida abaixo do breakpoint `lg`.
- Motivo: permitir que futuras campanhas tenham um enquadramento previsivel sem cortar o video vertical nem comprometer a leitura em celulares.
- Padrao de arquivo: arte principal em `1920 x 720 px`, WebP e ate 350 KB; quando houver criativo exclusivo para celular, usar `1080 x 1350 px`, WebP e ate 250 KB.
- Riscos/cuidados: manter informacoes importantes dentro da area segura central; evitar texto incorporado na imagem quando ele puder permanecer em HTML; nao reutilizar a arte horizontal no celular sem validar o recorte.

## 2026-09-02 - Remocao local de fundo e editor de imagens

- Decisao: substituir como padrao o envio de fotos ao remove.bg por um servico interno `rembg` com modelo `u2net`, mantendo remove.bg apenas como alternativa, e adicionar recorte, zoom e rotacao antes do upload.
- Motivo: permitir remocao de fundo sem credito por imagem, manter a foto dentro do servidor e padronizar o enquadramento dos produtos. O resultado da IA recebe fundo branco e a edicao de uma imagem da biblioteca sempre cria uma copia.
- Impacto: `Dockerfile.rembg`, `background-removal/server.py`, `docker-compose.yml`, `src/features/product-images/service.ts`, editor e seletor de imagens do admin.
- Riscos/cuidados: o modelo usa aproximadamente 1 GB de RAM carregado e aumenta o tempo/tamanho do build; o servico deve continuar sem porta publica, fixo em `u2net` e limitado a arquivos de 10 MB. A remocao automatica pode exigir ajuste manual em embalagens transparentes ou bordas muito finas.

## 2026-09-02 - Classificacao e edicao individual de produtos

- Decisao: adicionar busca, filtros por categoria/status, ordenacao e edicao individual no catalogo administrativo.
- Motivo: permitir localizar e manter produtos conforme o catalogo crescer, sem precisar recriar registros para corrigir preco, estoque, classificacao ou imagem.
- Impacto: painel de catalogos, schema de validacao, `PATCH /api/produtos/[id]`, testes de classificacao e documentacao.
- Riscos/cuidados: a API exige a versao `updatedAt` carregada pelo formulario e retorna conflito quando outra pessoa alterou o produto primeiro; o slug atual e preservado durante a edicao.

## 2026-09-03 - Produtos reais na vitrine Melhores ofertas

- Decisao original: usar `Product.featuredPosition` para selecionar e ordenar manualmente ate 15 produtos na home. O limite foi substituido pela decisao de carrossel com 10 destaques registrada abaixo. O catalogo oferece `Destacar` e `Remover destaque` para alteracao rapida, enquanto `/admin/ofertas` preserva o controle completo da ordem.
- Motivo: impedir publicacao automatica de todo o catalogo e dar controle operacional sobre quais itens aparecem, sem duplicar nome, preco ou imagem em outro cadastro.
- Impacto: schema/migration Prisma, painel e API de vitrine, atalho em `Produtos / Catalogo`, consulta server-side da home, cards publicos, testes e documentacao.
- Riscos/cuidados: somente produtos publicados e com foto podem ser escolhidos; posicoes sao exclusivas, o salvamento e atomico e a venda continua direcionada ao WhatsApp.

## 2026-09-03 - Busca publica com produtos e correlatos

- Decisao: substituir os exemplos locais da busca por produtos `ACTIVE` do PostgreSQL, com autocomplete por nome e dados farmaceuticos cadastrados, pagina individual e correlatos.
- Motivo: permitir que o cliente encontre um item real, veja foto e preco durante a digitacao e consulte produtos proximos sem sair do fluxo da farmacia.
- Impacto: novos campos `activeIngredients`, `searchTerms` e `searchText` em `Product`, API publica de busca, cadastro administrativo, busca desktop/mobile e rota `/produto/[slug]`.
- Riscos/cuidados: principios ativos e termos devem ser preenchidos com base no cadastro oficial do produto; correlato significa apenas proximidade de busca, nunca substituicao terapeutica, e disponibilidade/preco continuam sujeitos a confirmacao humana pelo WhatsApp.

## 2026-09-04 - Carrossel com dez destaques na home

- Decisao: reduzir a vitrine publica de 15 para 10 posicoes e exibi-la em carrossel, com cinco cards por pagina no desktop, setas, arraste por mouse e gesto horizontal em telas de toque.
- Motivo: manter os cards em tamanho legivel sem alongar a home e permitir que o cliente percorra duas sequencias de cinco ofertas.
- Impacto: contrato e testes da vitrine, consulta server-side da home, painel administrativo de destaques, cards publicos e documentacao.
- Riscos/cuidados: posicoes antigas acima de 10 sao ignoradas e deixam de contar como destaque; ao salvar a organizacao da vitrine, a API limpa qualquer posicao antiga antes de gravar a selecao atual.

## 2026-09-04 - Sugestoes fundamentadas para cadastro de produtos

- Decisao: adicionar um assistente opcional de catalogo usando Gemini em duas etapas: pesquisa com Google Search e estruturacao validada por Zod. O resultado inclui confianca, alertas e fontes; somente alta confianca preenche automaticamente campos vazios.
- Motivo: reduzir trabalho manual em categoria, descricao, principios ativos e termos de busca sem transformar a resposta do modelo em verdade automatica.
- Impacto: formulario de produtos, nova API administrativa, contrato e testes em `src/features/products/ai-suggestions.ts`, rate limit, ambiente e documentacao.
- Riscos/cuidados: produto ambiguo, apresentacao incompleta ou fonte ausente exige revisao da embalagem ou bula; a IA nao define receita, Farmacia Popular, dose, posologia, substituicao, preco ou estoque. Textos que excedam os limites do formulario sao reduzidos de forma defensiva sem invalidar os demais campos. Para `gemini-2.5-flash`, o raciocinio interno e desativado nas duas chamadas curtas para evitar que consuma o limite antes de concluir a pesquisa ou o JSON. O recurso exige `GEMINI_API_KEY` somente no `.env` do VPS.
