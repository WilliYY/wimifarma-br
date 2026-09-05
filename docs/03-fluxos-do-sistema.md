# 03 - Fluxos do Sistema

## O Que Esta Parte Faz

Este documento descreve os fluxos reais existentes hoje e os fluxos planejados que ainda nao estao completos.

## Fluxo Publico Atual

1. Usuario acessa `/`.
2. Ve o video institucional/comercial e um espaco grande reservado para anuncio principal.
3. Pode clicar em WhatsApp para iniciar atendimento.
4. Pode acessar paginas publicas basicas como `/ofertas`, `/farmacia-popular`, `/sobre` e `/contato`.
5. A rota `/ofertas` continua existindo, mas nao aparece no menu principal enquanto a home estiver focada em anuncio.

Arquivos principais:

- `src/components/site/home-page.tsx`
- `src/components/site/site-header.tsx`
- `src/components/site/floating-whatsapp.tsx`
- `src/lib/site.ts`

## Fluxo de WhatsApp

O WhatsApp e o canal principal de conversao. O site deve facilitar o pedido, mas a confirmacao de preco, disponibilidade, receita e entrega continua humana.

O link centralizado em `src/lib/site.ts` usa o numero `+55 44 98413-4971` e a mensagem padrao "Olá, tudo bem? Gostaria de falar sobre medicamentos ou da Farmácia Popular". Esse link deve ser reaproveitado pelos botoes publicos e administrativos.

Arquivos:

- `src/lib/whatsapp.ts`
- `src/lib/site.ts`
- `src/app/api/whatsapp/route.ts`
- `src/features/whatsapp/schema.ts`

## Fluxo de Carrinho e Checkout

1. Cliente clica em `Comprar` em um produto elegivel da vitrine ou pagina de produto.
2. O carrinho fica salvo no navegador e permite alterar quantidade ou remover itens.
3. Em `/checkout`, o cliente informa identificacao, escolhe entrega em Ivate-PR ou retirada na loja e indica Pix, cartao na entrega/retirada ou dinheiro.
4. A revisao mostra contato, atendimento, pagamento e itens antes do envio.
5. `POST /api/pedidos` valida os dados com Zod e consulta novamente produto, status, estoque e preco no PostgreSQL.
6. O pedido e seus itens sao gravados como snapshots em `Order` e `OrderItem`, com status `PENDING`. O estoque nao e baixado antes da confirmacao humana.
7. A equipe acompanha `/admin/pedidos` e avanca andamento e pagamento apenas pelas transicoes permitidas; cada alteracao gera auditoria sem dados pessoais no metadata.
8. Itens com receita ou Farmacia Popular nao entram no checkout e continuam no WhatsApp.

O checkout nao coleta dados de cartao, nao gera Pix e nao aprova pagamento. A forma escolhida e apenas uma preferencia ate a farmacia confirmar o pedido.

Arquivos:

- `src/components/site/cart-provider.tsx`
- `src/components/site/cart-page.tsx`
- `src/components/site/checkout-page.tsx`
- `src/features/orders/checkout.ts`
- `src/app/api/pedidos/*`
- `src/app/admin/pedidos/page.tsx`
- `src/components/admin/orders-panel.tsx`

## Fluxo de Login

1. Usuario acessa `/login`.
2. A tela exibe blocos de entrar e cadastrar.
3. Login Google, quando configurado, e destinado apenas a clientes e retorna para `/login`.
4. No primeiro login Google, o sistema cria ou atualiza um `Customer` pelo e-mail/identificador Google.
5. Apos login de cliente, o header publico mostra o nome vindo da conta Google e um botao `Sair`.
6. Cliente logado pode clicar no nome no header e acessar `/minha-conta`.
7. Cadastro por formulario cria `Customer` com email, telefone e senha.
8. Cliente por email/senha entra em `/minha-conta`; admin por Credentials entra em `/admin/dashboard`.
9. Logout publico encerra a sessao e redireciona para `/`.

Arquivos:

- `src/components/site/customer-auth-page.tsx`
- `src/components/site/customer-account-panel.tsx`
- `src/features/auth/auth.ts`
- `src/lib/validations/auth.ts`
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/app/api/minha-conta/*`

## Fluxo Minha Conta

1. Cliente autenticado acessa `/minha-conta`.
2. A pagina carrega o `Customer` da sessao e bloqueia usuarios administrativos.
3. A aba `Usuario` salva nome, telefone, endereco, bairro, cidade e observacoes em um unico botao `Salvar`.
4. A aba `Senha` permite criar senha para conta Google ou trocar senha existente.
5. A opcao de redefinicao por email aparece como ponto preparado, mas depende de provedor de envio de email.
6. A aba `Cashback` mostra saldo e ultimas movimentacoes se houver `CashbackAccount`.

Arquivos:

- `src/app/(site)/minha-conta/page.tsx`
- `src/components/site/customer-account-panel.tsx`
- `src/app/api/minha-conta/route.ts`
- `src/app/api/minha-conta/password/route.ts`
- `src/app/api/minha-conta/register/route.ts`

## Fluxo Admin Atual

1. Usuario autenticado acessa `/admin/dashboard`.
2. A pagina valida permissao server-side pela rota antes de renderizar o modulo.
3. `AdminShell` monta sidebar e header.
4. Links aparecem conforme role (`ADMIN`, `MANAGER`, `STAFF`) usando o mesmo mapa de permissao das paginas.
5. `ADMIN` ve tambem modulos sensiveis como `API e Senhas`, temas, configuracoes, cashback e clube.
6. `Criar ADM` e `Criar colaborador` permitem criar acessos reais com email, senha temporaria, role, listagem e bloqueio/reativacao.
7. `Cupons` permite criar cupons reais com nome/codigo, tipo de desconto, validade por duracao em dias, limite de uso e contador de pessoas/usos registrados.
8. Muitas telas ainda sao placeholders com descricao de futuro modulo.

Arquivos:

- `src/components/admin/admin-shell.tsx`
- `src/components/admin/module-placeholder.tsx`
- `src/features/auth/permissions.ts`
- `src/components/admin/admin-users-panel.tsx`
- `src/components/admin/coupons-panel.tsx`
- `src/app/api/admin/usuarios/*`
- `src/app/api/cupons/route.ts`
- `src/app/admin/*/page.tsx`

## Fluxo API e Senhas

1. Administrador acessa `/admin/api-senhas`.
2. Preenche nome, servico, identificador, segredo e notas opcionais.
3. A API `/api/admin/api-senhas` valida com Zod e cifra segredo/notas antes de gravar.
4. A listagem retorna apenas metadados; o segredo fica mascarado na UI.
5. Ao clicar em revelar, `/api/admin/api-senhas/[id]/reveal` descriptografa e registra auditoria.
6. Exclusao usa `/api/admin/api-senhas/[id]` e tambem registra auditoria.

Arquivos:

- `src/app/admin/api-senhas/page.tsx`
- `src/components/admin/secret-vault-panel.tsx`
- `src/app/api/admin/api-senhas/route.ts`
- `src/lib/secret-vault.ts`

## Fluxo de Catalogos e Imagens

1. Administrador ou gerente acessa `Produtos / Catalogo` em `/admin/catalogos`; a lista e os filtros aparecem primeiro, e `Novo produto` abre o formulario em uma janela dedicada.
2. Preenche os dados do produto e escolhe entre enviar uma nova foto ou reutilizar uma imagem da biblioteca.
3. Opcionalmente, `Sugerir dados` envia somente nome, marca, EAN e categorias existentes para `/api/produtos/sugestoes`. O Gemini pesquisa identificacao exata, apresentacao, composicao e categoria, prioriza Anvisa e fabricante e usa lojas apenas para corroborar dados comerciais. A resposta inclui descricao factual normalmente entre 140 e 220 caracteres, principios ativos, termos objetivos de busca, confianca, alertas e ate oito fontes.
4. Alta confianca exige ao menos uma fonte oficial da Anvisa ou do fabricante e preenche apenas campos vazios. Resultado sustentado somente por lojas e rebaixado e exige aplicacao manual; todos os campos continuam editaveis e devem ser comparados com embalagem, bula ou registro antes de salvar.
5. Antes de salvar, pode abrir `Ajustar foto` para recortar, reposicionar, ampliar ou girar. O ajuste gera no navegador uma copia quadrada em WebP, de ate 1600 x 1600 px e com fundo branco; imagens pequenas nao sao ampliadas e a original nao e alterada.
6. Uma nova foto aceita JPG, PNG, WebP ou AVIF de ate 10 MB. A remocao de fundo e opcional e usa primeiro o servico local U-2-Net; `REMOVE_BG_API_KEY` permanece apenas como alternativa externa quando a URL local nao estiver configurada.
7. Quando a IA remove o fundo, a API aplica fundo branco antes de gerar o WebP final. Em todos os uploads, valida o arquivo, corrige a orientacao, limita a 2000 px sem ampliar imagem pequena e aplica compressao progressiva quando o resultado ultrapassa aproximadamente 1,2 MB.
8. O arquivo final fica em `/public/uploads/products`, preservado no volume `wimifarma-br-uploads`, e seus metadados ficam em `ProductImage` no PostgreSQL. Como o upload ja sai dimensionado, comprimido e convertido para WebP, as miniaturas administrativas usam a URL persistida diretamente, sem uma segunda otimizacao pelo Next.js.
9. A biblioteca permite buscar, selecionar e excluir imagens sem uso. `Ajustar uma copia` preserva a imagem existente e cria um novo upload, evitando alterar produtos ja associados. Imagens em uso ficam protegidas contra exclusao.
10. A tela cria o produto com status de rascunho, publicado ou arquivado; o slug e gerado automaticamente e a criacao registra auditoria.
11. A lista permite buscar por nome, marca, SKU ou EAN, filtrar por categoria e status e classificar por data, nome, estoque ou preco.
12. Clicar na imagem ou nos dados de um produto, assim como usar `Editar produto`, abre um formulario individual preenchido com os dados atuais. A area clicavel aceita teclado e permanece separada dos controles de destaque. A imagem existente e preservada quando nao for trocada; a atualizacao usa `updatedAt` para impedir que uma edicao antiga sobrescreva outra mais recente e registra auditoria.
13. Na propria lista de produtos, `Destacar` coloca um item publicado e com foto na primeira posicao livre de `Melhores ofertas`, e `Remover destaque` o retira. Em `/admin/ofertas`, o usuario continua escolhendo e reorganizando manualmente as 10 posicoes.
14. O salvamento da vitrine e atomico, impede produto repetido e registra `PRODUCT_SHOWCASE_UPDATED`. Arquivar ou voltar um produto para rascunho remove sua posicao.
15. A home consulta somente produtos publicados, com foto e `featuredPosition`, usando nome, categoria, descricao, precos e WebP reais. Posicoes sem selecao continuam como espacos de consulta pelo WhatsApp.
16. O cadastro e a edicao permitem informar principios ativos e termos de busca/indicacao separados por virgula; a API normaliza esses dados no `searchText` sem alterar a grafia exibida.
17. Enquanto o cliente digita pelo menos dois caracteres, `/api/produtos/busca` retorna produtos publicados com foto, preco e principios ativos, alem de correlatos do primeiro resultado.
18. Enter, setas ou clique abrem `/produto/[slug]`; a pagina apresenta os dados e correlatos, mas deixa claro que correlacao nao significa substituicao e envia a confirmacao final ao WhatsApp.

Arquivos:

- `src/components/admin/products-catalog-panel.tsx`
- `src/app/api/produtos/route.ts`
- `src/app/api/produtos/[id]/route.ts`
- `src/app/api/produtos/sugestoes/route.ts`
- `src/app/api/admin/uploads/produtos/route.ts`
- `src/app/api/admin/imagens-produtos/*`
- `src/components/admin/product-image-editor.tsx`
- `src/features/product-images/service.ts`
- `src/features/products/schema.ts`
- `src/features/products/ai-suggestions.ts`
- `src/components/admin/featured-products-panel.tsx`
- `src/app/api/ofertas/vitrine/route.ts`
- `src/features/offers/showcase.ts`
- `src/features/products/public-search.ts`
- `src/app/api/produtos/busca/route.ts`
- `src/components/site/site-search.tsx`
- `src/app/(site)/produto/[slug]/page.tsx`

## Fluxo da Pagina de Produto e Avaliacoes

1. O cliente abre `/produto/[slug]` a partir da busca, da vitrine ou dos produtos relacionados.
2. A pagina carrega somente produto `ACTIVE` e exibe foto real ampliavel, marca, nome, precos, economia, estoque, descricao, principios ativos, SKU/EAN quando cadastrados e correlatos.
3. Produtos comuns podem receber quantidade e seguir para o carrinho. Produto com receita, Farmacia Popular ou sem estoque continua no atendimento por WhatsApp.
4. O simulador de entrega normaliza o CEP localmente. CEP de Ivate entre `87525-000` e `87527-999` informa entrega gratis; outros CEPs orientam consulta pelo WhatsApp. Retirada permanece gratis, e prazo/estoque dependem de confirmacao da equipe.
5. A pagina nao inventa galeria, avaliacao, frete ou disponibilidade. Sem dados reais, apresenta o estado correspondente de forma explicita.
6. `POST /api/produtos/[id]/avaliacoes` exige sessao `CUSTOMER`, produto publicado e um pedido `COMPLETED` do proprio cliente contendo o produto.
7. Cada cliente mantem uma avaliacao por produto. Novo envio atualiza nota e comentario; o nome publico e abreviado e o pedido nao e exposto.
8. O link de login usa retorno local validado para levar o cliente de volta a secao de avaliacoes sem aceitar redirecionamento externo ou caminho administrativo.
9. A rota publica gera descricao SEO sem cortar palavras, URL canonica e JSON-LD `Product` apenas com os dados visiveis do cadastro. Produtos `ACTIVE` entram automaticamente no sitemap; rascunhos e arquivados nao entram.

Arquivos principais:

- `src/app/(site)/produto/[slug]/page.tsx`
- `src/components/site/product-image-viewer.tsx`
- `src/components/site/product-purchase-panel.tsx`
- `src/components/site/delivery-estimator.tsx`
- `src/components/site/product-review-form.tsx`
- `src/app/api/produtos/[id]/avaliacoes/route.ts`
- `src/features/products/product-detail.ts`
- `src/app/sitemap.ts`
- `src/features/auth/customer-redirect.ts`

## Fluxo de APIs

1. Cliente chama endpoint em `src/app/api`.
2. APIs de negocio executam `requireAdminApi`; APIs mais sensiveis podem executar `requireAdminOnlyApi`.
3. Sem sessao valida, retornam `401`.
4. Com sessao `ADMIN` ou `MANAGER`, executam consulta, criacao ou atualizacao com validacao Zod.

Arquivos:

- `src/features/auth/permissions.ts`
- `src/app/api/produtos/route.ts`
- `src/app/api/produtos/[id]/route.ts`
- `src/app/api/ofertas/route.ts`
- `src/app/api/clientes/route.ts`
- `src/app/api/cupons/route.ts`
- `src/app/api/roleta/route.ts`
- `src/app/api/cashback/route.ts`
- `src/app/api/whatsapp/route.ts`
- `src/app/api/admin/api-senhas/route.ts`

## Fluxo Docker/Deploy

1. Criar `.env` a partir de `.env.example`.
2. Build do app.
3. Subir Postgres.
4. Rodar migrations.
5. Rodar seed.
6. Subir app.
7. Validar `/api/health`.
8. Nginx Proxy Manager aponta para `wimifarma-br-app:3000`.

## Regras a Preservar

- Nao apresentar pedido pendente como compra confirmada.
- Nao prometer disponibilidade sem atendimento.
- Nao abrir APIs administrativas ao publico.
- Nao usar dados reais de clientes.

## Riscos

- Usuario cliente ser redirecionado para area admin por regra incompleta.
- Colaborador acessar rota de administrador se novo modulo for criado sem registrar permissao server-side.
- Segredo administrativo ser exposto em print, log ou resposta de listagem.
- Redefinicao de senha por email parecer ativa antes de haver provedor de email configurado.

## Pendencias

- Implementar envio real de email para redefinicao de senha.
- Implementar CRUD real nos modulos admin.
- Integrar as paginas publicas secundarias restantes com dados reais do banco.

## Evolucao

Cada novo fluxo importante deve ganhar documentacao propria ou nova secao aqui.
