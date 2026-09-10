# 07 - Historico de Decisoes

## 2026-09-10 - Gestao completa de cupons com historico protegido

- Decisao: lista operacional com edicao em modal, calendario de inicio/fim, pausa e exclusao confirmada; manter o modelo Coupon sem migration.
- Integridade: revisao obrigatoria em PATCH/DELETE, transacoes com auditoria atomica e isolamento Serializable. Cupons usados preservam condicoes; exclusao bloqueada para usos ou premios vinculados.
- Compatibilidade: duracao em dias continua aceita no POST legado. Datas explicitas incluem todo o ultimo dia em UTC-03. Contador rotulado como usos, nao pessoas unicas.
- Escopo: nao ativa descontos no checkout nem regras da roleta. Detalhes e testes em `docs/14-cupons-admin.md`.

## 2026-09-10 - Carrossel de marcas na faixa de perfumaria

- A faixa Dove foi substituida por `PerfumeryCarousel`: Dove, Rexona e NIVEA com imagens locais, identidade visual por marca e consulta WhatsApp contextual. Mantida a posicao entre as duas vitrines.
- Rotacao de sete segundos apenas enquanto a faixa esta visivel, com setas, indicadores e pausa. Foco e acao manual interrompem a rotacao; movimento reduzido desativa o automatico. Arraste horizontal e toque preservam o scroll vertical e bloqueiam cliques acidentais.
- Nenhum preco, estoque, selo de parceria ou desconto foi criado. Embalagens sao referencias visuais da marca; versoes disponiveis devem ser confirmadas com a farmacia. Fontes em `docs/13-assets-institucionais.md`.
- Auditoria: `node scripts/perfumery-carousel-audit.mjs`, configuravel por `AUDIT_BASE_URL` e `AUDIT_OUTPUT_DIR`. Cobre marcas, imagens, links, ciclo, pausa, teclado, arraste e quatro larguras. Sem banco, API ou dependencias novas.
- Auditoria local aprovada em 320, 390, 768 e 1440 px (12 estados): imagens carregadas, sem transbordamento, navegacao por mouse/teclado/toque, pausa e bloqueio de abertura do WhatsApp apos arraste. Uma rota temporaria sem dados foi usada devido ao PostgreSQL local indisponivel e removida antes da publicacao.

## 2026-09-10 - Faixa superior com tres campanhas rotativas

- `AnnouncementBar` substitui o anuncio unico por frete local, Farmacia Popular e cashback `Em breve`. Cores, icones e grafismos leves diferenciam as campanhas, sem imagens externas ou novas dependencias.
- Altura preservada em 40 px. Rotacao a cada seis segundos com setas e controle de pausa; foco interrompe a rotacao ate acao explicita. Ponteiro e aba oculta pausam temporariamente; movimento reduzido desativa a troca automatica.
- Removida desta faixa a promessa de frete nacional acima de R$ 99,90: o checkout vigente permite apenas entrega em Ivate-PR ou retirada. Nenhuma regra comercial, API ou banco foi alterada.
- Auditoria reproduzivel: `node scripts/announcement-bar-audit.mjs`, usando `AUDIT_BASE_URL` e, opcionalmente, `AUDIT_OUTPUT_DIR`. Verifica tres avisos, destinos, ciclo, pausa, teclado, movimento reduzido e geometria em 320, 390, 768 e 1440 px.
- Validacao local: auditoria aprovada nos 12 estados responsivos, sem erros de pagina; `lint`, `typecheck`, 53 testes e `git diff --check` aprovados. O primeiro clique na pausa tem teste proprio, cobrindo a ordem entre foco e evento de ponteiro.

## 2026-09-10 - Sobreposicao da busca publica corrigida

- Causa reproduzida: `overflow-hidden` na faixa principal recortava o autocomplete, e o `backdrop-filter` do header limitava o dialogo mobile a 132 px de altura.
- Recorte transferido para a decoracao, com camadas explicitas na faixa de controles e no formulario. Busca mobile renderizada em portal no `body`, fora do contexto do header.
- Ao mudar para desktop, o dialogo mobile fecha e libera a rolagem. Foco, Escape, sugestoes e destinos comerciais preservados; sem mudanca de API ou banco.
- Validacao local: pontos superior, central e inferior do autocomplete sem obstrucao em 1024 e 1440 px; dialogo com altura total de 844 px no mobile de 390 px, Escape restaurando foco e rolagem, e fechamento automatico ao passar para desktop. `lint`, `typecheck`, `git diff --check` e 53 testes aprovados. Busca no banco conferida separadamente em producao, pois o PostgreSQL local nao esta disponivel.

## 2026-09-09 - Foto de atendimento farmaceutico no Contato

- A foto generica de conversa foi substituida por uma cena ilustrativa propria de farmaceutica atendendo pelo celular, com expressao natural, jaleco e ambiente de farmacia.
- WebP local de 1920 x 720 px e 63452 bytes, sem textos gravados. O hero usa composicao panoramica e ponto focal explicito para preservar o rosto no recorte responsivo; Sobre e os canais de atendimento nao mudam.
- Origem e direcao do prompt em `docs/13-assets-institucionais.md`. Sem banco, APIs, dependencias ou regras comerciais alteradas.

## 2026-09-09 - Segunda vitrine com dez posicoes e arraste pelos cards

- `HomeProductCarousel` passa a manter dez posicoes, usando `SHOWCASE_SLOT_COUNT`, independentemente da quantidade de medicamentos publicados. Vagas sao consultas comerciais explicitas, sem duplicar itens nem criar catalogo ficticio.
- O mouse captura o ponteiro somente apos ultrapassar o limiar do arraste. Fotos e nomes aceitam o gesto; um clique simples continua abrindo o produto e botoes de compra nao iniciam arraste.
- Durante o arraste, snap e rolagem suave ficam suspensos. Setas percorrem a quantidade visivel; o carrossel tambem aceita setas do teclado e respeita movimento reduzido. Eventos de toque continuam com rolagem nativa.
- Verificacao local com 0, 1 e 12 produtos: dez posicoes, cinco visiveis em 1440 px, navegacao de ida e volta e arraste sobre link sem navegar. Sem transbordamento em 320 e 390 px. Fixture temporaria removida antes do commit; nenhum dado de banco alterado.

## 2026-09-08 - Sobre e Contato com fotografia e canais diretos

- Duas fotografias distintas substituem os antigos paineis institucionais: atendimento presencial em Sobre e conversa por celular em Contato. Imagens ilustrativas, sem alegar que representam clientes ou funcionarios reais.
- Componente compartilhado `InstitutionalHero` mantém textos acessiveis, carregamento prioritario da foto e enquadramento responsivo. Assets WebP locais evitam requisicoes a provedores de imagens durante a visita.
- Contato preserva WhatsApp, Maps e e-mail como cartoes clicaveis e adiciona perguntas frequentes nativas. Sobre mantém links para ofertas, Farmacia Popular e entrega.
- Sem novas dependencias, alteracoes de banco, APIs, autenticacao, checkout ou regras de entrega. Origem das imagens registrada em `docs/13-assets-institucionais.md`.

## 2026-09-07 - Cabecalho claro com divisao curva

- A faixa principal do header passa a manter o fundo escuro apenas atras da logo Wimifarma e do selo Farmacia Popular, encerrando em uma curva com contorno vermelho.
- Busca, carrinho, conta e demais acoes ficam sobre fundo claro com arte botanica WebP de baixa opacidade, posicionada atras dos controles e sem interceptar cliques.
- Alturas, pontos de quebra, alvos de toque e comportamento da busca foram preservados para evitar regressao no desktop e no celular.

## 2026-09-07 - Banner humano na Farmacia Popular

- O painel de orientacao do hero da pagina `Farmacia Popular` passa a usar uma fotografia ilustrativa propria de atendimento em farmacia, sem marcas, textos gravados ou promessa de disponibilidade.
- A arte e servida em WebP `1200 x 720 px` com 42 KB; logo, chamada e avisos continuam em HTML para preservar nitidez, acessibilidade e leitura no celular.
- Os blocos de documentos, confirmacao humana e separacao apos conferencia permanecem visiveis e sem alteracao nas regras comerciais.

## 2026-09-07 - Hero com tres campanhas fotograficas

- O video principal foi retirado da home e substituido por tres banners proprios para medicamentos, perfumaria e mae e bebe, inspirados na organizacao de categorias de grandes redes sem copiar campanhas ou marcas.
- As artes mostram pessoas, nao contem texto ou produtos identificaveis e sao servidas em WebP `1920 x 720 px`, entre 50 e 70 KB; chamadas e botoes continuam em HTML para manter legibilidade, SEO e acessibilidade.
- O carrossel troca a cada 6,5 segundos, oferece setas, indicadores, pausa e gesto horizontal, interrompe durante interacao e desativa o autoplay quando o usuario prefere movimento reduzido.
- Os CTAs levam para as ofertas reais ou para consultas especificas no WhatsApp; nenhuma disponibilidade, indicacao clinica ou promocao foi inventada.

## 2026-09-07 - Faixa Dove e segunda vitrine de medicamentos

- A home passa a separar ofertas e avaliacoes com uma faixa Dove compacta e clicavel para consulta no WhatsApp.
- Um segundo carrossel lista automaticamente ate dez medicamentos publicados com imagem, sem inventar itens ou disponibilidade.
- O componente reutiliza o card comercial publico e preserva as regras existentes de carrinho, receita e Farmacia Popular.

## 2026-09-07 - Miauby conversacional com Gemini e catalogo real

- Decisao: transformar a Miauby em assistente conversacional responsiva, usando Gemini no servidor, memoria curta da propria conversa e ate quatro produtos publicados relacionados como contexto e atalhos.
- Motivo: permitir perguntas uteis no site e busca assistida sem inventar catalogo, preco, estoque ou orientacao clinica.
- Impacto: novo avatar WebP transparente, painel flutuante, `/api/miauby`, logica testavel em `src/features/miauby`, politica de privacidade e documentacao de arquitetura, seguranca, ambiente, layout e fluxos.
- Riscos/cuidados: conversa nao e persistida; pergunta e historico curto podem ser enviados ao Google. A interface proibe dados sensiveis, emergencias e dados financeiros evidentes usam resposta local, e qualquer orientacao clinica ou confirmacao comercial continua com a equipe.

## 2026-09-06 - Rolagem vertical nativa no site publico

- Decisao: retirar a camada global do Lenis do layout publico e manter a rolagem vertical nativa do navegador.
- Motivo: eliminar um ponto intermediario que podia deixar a rolagem indisponivel de forma intermitente, especialmente apos navegacao, redimensionamento ou uso em dispositivos de toque.
- Impacto: apenas o mecanismo de rolagem global do site publico; animacoes de componentes, carrosseis e `scroll-behavior` do CSS permanecem inalterados.
- Riscos/cuidados: a rolagem perde a interpolacao artificial do Lenis, mas preserva mouse, trackpad, teclado, toque e recursos de acessibilidade do navegador.

## 2026-09-06 - Paginas institucionais orientadas a atendimento

- Decisao: redesenhar `Contato` e `Sobre` com hierarquia mais clara, identidade visual de farmacia, cartoes de acao inteiros clicaveis e caminhos diretos para WhatsApp, Maps, e-mail, ofertas, Farmacia Popular e delivery.
- Motivo: tornar os canais de atendimento e os servicos locais mais faceis de reconhecer no desktop e no celular, seguindo padroes recorrentes de farmacias digitais sem copiar uma marca concorrente.
- Impacto: hero institucional compartilhado, paginas publicas `Contato` e `Sobre` e documentacao de layout.
- Riscos/cuidados: nenhum horario, volume de atendimento ou promessa comercial foi inventado; precos, estoque, entrega, receita e Farmacia Popular continuam sujeitos a confirmacao da equipe.

## 2026-09-06 - Compra direta e carrossel de correlatos no produto

- Decisao: ampliar a pagina individual com acao primaria `Comprar agora`, acao secundaria de carrinho, barra fixa de compra apos a primeira dobra e carrossel horizontal de ate dez correlatos reais.
- Motivo: aproximar a experiencia de compra do padrao atual de farmacia digital sem duplicar checkout, criar galeria ficticia ou alterar as restricoes comerciais existentes.
- Impacto: painel de compra, botao flutuante do WhatsApp, cards de correlatos, consulta server-side da pagina de produto e documentacao de layout/fluxo.
- Riscos/cuidados: a compra direta ainda gera apenas pedido pendente; receita, Farmacia Popular e falta de estoque continuam no WhatsApp; avaliacoes exigem compra concluida; a galeria mostra somente a imagem real cadastrada.

## 2026-09-06 - Cards padronizados e avaliacoes verificadas na home

- Decisao: aproximar os cards de `Melhores ofertas` do padrao visual de e-commerce farmaceutico, mantendo cinco itens visiveis no desktop, e incluir um segundo carrossel alimentado somente por avaliacoes publicadas de compras concluidas.
- Motivo: melhorar leitura de imagem, nome, marca, nota, preco e acao sem transformar depoimentos inventados em prova social falsa.
- Impacto: consulta server-side da home, contrato publico da vitrine, cards, botao compacto de compra, carrossel de avaliacoes e documentacao de layout/fluxo.
- Riscos/cuidados: estrelas e comentarios dependem de dados reais; nomes permanecem abreviados; quando nao ha avaliacao, a interface mostra `Novo` no produto e um estado vazio no carrossel.

## 2026-09-05 - Correcao responsiva, performance e metadados por rota

- Decisao: manter todos os controles do header acessiveis em celulares pequenos, substituir o segundo carregamento do video pelo poster leve, aplicar cache ao MP4, renderizar hero e primeira vitrine sem atraso de animacao e definir canonical, titulo e compartilhamento proprios para cada pagina publica indexavel.
- Motivo: corrigir corte da busca em 360 px, reduzir disputa de rede no carregamento inicial e impedir que paginas institucionais sejam interpretadas como duplicatas da home.
- Impacto: header, botao de carrinho, hero da home, fonte local com `next/font`, configuracao de headers, metadados das rotas publicas, contraste do rodape, teste automatizado e documentacao de layout.
- Riscos/cuidados: o video principal continua em autoplay e loop por decisao visual; futuras trocas do arquivo devem preservar o poster leve e revisar a politica de cache. Paginas de conta, carrinho e checkout continuam com `noindex`.

## 2026-09-04 - Carrinho e checkout de pedido pendente

- Decisao: permitir compra de produtos elegiveis por carrinho e checkout, gravando `Order` e `OrderItem` para confirmacao humana e operacao em `/admin/pedidos`.
- Motivo: reduzir atrito entre vitrine e pedido sem simular uma integracao financeira ainda inexistente.
- Impacto: rotas `/carrinho`, `/checkout`, `/privacidade`, APIs `/api/pedidos*`, modelos Prisma, painel administrativo, rate limit, cards publicos, testes e documentacao.
- Riscos/cuidados: o servidor recalcula preco e valida estoque; pedido nasce pendente e nao baixa estoque; nao ha coleta de cartao, geracao de Pix ou aprovacao automatica; receita e Farmacia Popular continuam no WhatsApp; politica juridica e gateway permanecem pendentes.

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

## 2026-09-04 - Pagina comercial de produto e avaliacoes verificadas

- Decisao: transformar `/produto/[slug]` em uma pagina completa de produto, com foto ampliavel, compra por quantidade, frete local, detalhes, avaliacoes de compradores e correlatos, mantendo as restricoes regulatorias e o checkout pendente ja existente.
- Motivo: permitir que o cliente leia e compare informacoes reais antes de colocar um item no carrinho, sem depender apenas do card da vitrine.
- Impacto: pagina e componentes publicos do produto, carrinho com quantidade inicial, modelo/migration `ProductReview`, API de avaliacao, retorno seguro apos login, rate limit, politica de privacidade, testes e documentacao.
- Riscos/cuidados: avaliacao exige pedido concluido e nao e anonimizada internamente; nome publico e abreviado. O frete automatico cobre apenas a faixa operacional de Ivate e nao promete prazo. Produtos com receita/Farmacia Popular continuam no WhatsApp, e nenhum pagamento e aprovado pela pagina.

## 2026-09-05 - Pesquisa farmacologica rigorosa e SEO de produtos

- Decisao: reforcar o assistente Gemini para conferir identificacao, apresentacao, composicao e categoria em fontes rastreaveis, gerar descricao factual normalmente entre 140 e 220 caracteres e conceder alta confianca somente quando houver fonte oficial da Anvisa ou do fabricante. Cada produto publicado tambem recebe metadados proprios, URL canonica, JSON-LD `Product` e entrada dinamica no sitemap.
- Motivo: reduzir sugestoes genericas ou sustentadas somente por lojas e dar ao Google conteudo individual, consistente e tecnicamente indexavel sem repetir palavras-chave artificialmente.
- Impacto: `src/features/products/ai-suggestions.ts`, testes de sugestao e SEO, `src/features/products/product-detail.ts`, pagina publica do produto, sitemap e documentacao.
- Riscos/cuidados: a IA continua sendo assistente e nao fonte sanitaria definitiva; divergencia de EAN, registro, apresentacao ou composicao exige conferencia manual. Dados estruturados aumentam a elegibilidade para resultados enriquecidos, mas nao garantem exibicao nem posicao no Google.
