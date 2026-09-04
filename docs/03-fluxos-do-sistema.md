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
3. Antes de salvar, pode abrir `Ajustar foto` para recortar, reposicionar, ampliar ou girar. O ajuste gera no navegador uma copia quadrada em WebP, de ate 1600 x 1600 px e com fundo branco; imagens pequenas nao sao ampliadas e a original nao e alterada.
4. Uma nova foto aceita JPG, PNG, WebP ou AVIF de ate 10 MB. A remocao de fundo e opcional e usa primeiro o servico local U-2-Net; `REMOVE_BG_API_KEY` permanece apenas como alternativa externa quando a URL local nao estiver configurada.
5. Quando a IA remove o fundo, a API aplica fundo branco antes de gerar o WebP final. Em todos os uploads, valida o arquivo, corrige a orientacao, limita a 2000 px sem ampliar imagem pequena e aplica compressao progressiva quando o resultado ultrapassa aproximadamente 1,2 MB.
6. O arquivo final fica em `/public/uploads/products`, preservado no volume `wimifarma-br-uploads`, e seus metadados ficam em `ProductImage` no PostgreSQL. Como o upload ja sai dimensionado, comprimido e convertido para WebP, as miniaturas administrativas usam a URL persistida diretamente, sem uma segunda otimizacao pelo Next.js.
7. A biblioteca permite buscar, selecionar e excluir imagens sem uso. `Ajustar uma copia` preserva a imagem existente e cria um novo upload, evitando alterar produtos ja associados. Imagens em uso ficam protegidas contra exclusao.
8. A tela cria o produto com status de rascunho, publicado ou arquivado; o slug e gerado automaticamente e a criacao registra auditoria.
9. A lista permite buscar por nome, marca, SKU ou EAN, filtrar por categoria e status e classificar por data, nome, estoque ou preco.
10. `Editar` abre um formulario individual preenchido com os dados atuais. A imagem existente e preservada quando nao for trocada; a atualizacao usa `updatedAt` para impedir que uma edicao antiga sobrescreva outra mais recente e registra auditoria.
11. Na propria lista de produtos, `Destacar` coloca um item publicado e com foto na primeira posicao livre de `Melhores ofertas`, e `Remover destaque` o retira. Em `/admin/ofertas`, o usuario continua escolhendo e reorganizando manualmente as 10 posicoes.
12. O salvamento da vitrine e atomico, impede produto repetido e registra `PRODUCT_SHOWCASE_UPDATED`. Arquivar ou voltar um produto para rascunho remove sua posicao.
13. A home consulta somente produtos publicados, com foto e `featuredPosition`, usando nome, categoria, descricao, precos e WebP reais. Posicoes sem selecao continuam como espacos de consulta pelo WhatsApp.
14. O cadastro e a edicao permitem informar principios ativos e termos de busca/indicacao separados por virgula; a API normaliza esses dados no `searchText` sem alterar a grafia exibida.
15. Enquanto o cliente digita pelo menos dois caracteres, `/api/produtos/busca` retorna produtos publicados com foto, preco e principios ativos, alem de correlatos do primeiro resultado.
16. Enter, setas ou clique abrem `/produto/[slug]`; a pagina apresenta os dados e correlatos, mas deixa claro que correlacao nao significa substituicao e envia a confirmacao final ao WhatsApp.

Arquivos:

- `src/components/admin/products-catalog-panel.tsx`
- `src/app/api/produtos/route.ts`
- `src/app/api/produtos/[id]/route.ts`
- `src/app/api/admin/uploads/produtos/route.ts`
- `src/app/api/admin/imagens-produtos/*`
- `src/components/admin/product-image-editor.tsx`
- `src/features/product-images/service.ts`
- `src/features/products/schema.ts`
- `src/components/admin/featured-products-panel.tsx`
- `src/app/api/ofertas/vitrine/route.ts`
- `src/features/offers/showcase.ts`
- `src/features/products/public-search.ts`
- `src/app/api/produtos/busca/route.ts`
- `src/components/site/site-search.tsx`
- `src/app/(site)/produto/[slug]/page.tsx`

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

- Nao prometer compra online.
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
