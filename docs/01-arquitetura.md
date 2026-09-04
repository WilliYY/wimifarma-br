# 01 - Arquitetura

## O Que Esta Parte Faz

A arquitetura organiza a plataforma em camadas para evitar mistura entre site publico, painel administrativo, APIs, modulos de negocio e banco.

## Camadas

```text
src/app/(site)        Rotas publicas e paginas de marketing/comerciais
src/app/admin         Rotas reservadas do painel
src/app/api           Endpoints internos
src/components/site   Componentes do site publico
src/components/admin  Componentes do admin
src/components/ui     Componentes base reutilizaveis
src/components/motion Componentes de animacao
src/features          Schemas Zod e contratos por modulo
src/lib               Prisma, env, site config e helpers
src/types             Tipos globais e dominio
prisma                Banco de dados
docs                  Memoria longa
public                Assets publicos
```

## Rotas Publicas

- `/`
- `/ofertas`
- `/farmacia-popular`
- `/delivery`
- `/sobre`
- `/contato`
- `/roleta`
- `/login`
- `/minha-conta`
- `/carrinho`
- `/checkout`
- `/privacidade`

Observacao: `/roleta` publica redireciona para `/ofertas` nesta fase.

## Rotas Admin

- `/admin`
- `/admin/login`
- `/admin/dashboard`
- `/admin/api-senhas`
- `/admin/ofertas`
- `/admin/produtos`
- `/admin/clientes`
- `/admin/cupons`
- `/admin/roleta`
- `/admin/cashback`
- `/admin/configuracoes`
- `/admin/criar-adm`
- `/admin/criar-colaborador`
- `/admin/catalogos`
- `/admin/temas`
- `/admin/club-wimifarma`
- `/admin/pedidos`

Muitas rotas admin ainda sao placeholders.

## APIs

- `/api/health`
- `/api/auth/[...nextauth]`
- `/api/minha-conta`
- `/api/minha-conta/register`
- `/api/minha-conta/password`
- `/api/ofertas`
- `/api/ofertas/vitrine`
- `/api/produtos`
- `/api/produtos/[id]`
- `/api/produtos/sugestoes`
- `/api/clientes`
- `/api/cupons`
- `/api/roleta`
- `/api/cashback`
- `/api/whatsapp`
- `/api/visitas`
- `/api/pedidos`
- `/api/pedidos/[id]`
- `/api/admin/api-senhas`
- `/api/admin/api-senhas/[id]`
- `/api/admin/api-senhas/[id]/reveal`

As APIs de negocio usam `requireAdminApi`. O cofre `API e Senhas` usa `requireAdminOnlyApi` e deve responder segredos apenas no endpoint de revelacao.

`POST /api/pedidos` e publico, recebe somente os dados necessarios ao pedido e tem limite especifico de requisicoes. O servidor ignora o preco como fonte de verdade, consulta novamente os produtos e valida status, estoque, restricoes e preco. `PATCH /api/pedidos/[id]` exige perfil administrativo autorizado e limita as transicoes de status.

## Infraestrutura

- `Dockerfile`: build standalone do Next.
- `Dockerfile.rembg` e `background-removal/server.py`: servico interno de remocao de fundo com U-2-Net.
- `docker-compose.yml`: app, remocao de fundo, postgres, migrate e seed.
- `prisma.config.ts`: config do Prisma.
- `.env.example`: contrato de configuracao.

## Decisoes Tecnicas

- Separacao por feature para facilitar crescimento.
- APIs reservadas ficam em `src/app/api`.
- Rotas administrativas sensiveis podem usar subpastas em `src/app/api/admin`.
- Banco fica atras do app e nao exposto publicamente.
- App Docker usa `output: standalone` do Next.
- A IA de imagens recebe somente upload pela rede Docker interna; nao publica porta no host nem aceita URLs remotas ou escolha de modelo pelo cliente.
- A sugestao de dados de produto usa Gemini somente no servidor, faz uma pesquisa fundamentada antes da estruturacao, valida a resposta com Zod e nunca envia preco, estoque, imagem ou dados de cliente ao provedor.

## Riscos ao Alterar

- Criar logica de negocio diretamente em componentes sem passar por `features` ou `lib`.
- Duplicar regras de permissao em varios lugares.
- Alterar nomes Docker e quebrar Nginx Proxy Manager.
- Fazer rotas publicas dependerem de banco sem tratar falha.

## Pendencias

- Criar guard por permissao nas paginas admin, nao apenas no menu.
- Diferenciar permissoes por endpoint nos modulos restantes.
- Implementar CRUDs reais nos placeholders admin.

## Evolucao

Adicionar novos docs especificos quando surgirem modulos maiores: integracoes, auditoria, financeiro, performance, testes, seguranca e painel administrativo.

## Busca Publica de Produtos

- `GET /api/produtos/busca?q=` consulta apenas produtos `ACTIVE` e devolve no maximo seis resultados e quatro correlatos.
- `Product.searchText` guarda uma versao normalizada para busca; `activeIngredients` e `searchTerms` preservam os valores exibidos e orientam a correlacao.
- `src/features/products/public-search.ts` concentra normalizacao, ordenacao de resultados e pontuacao dos correlatos.
- O autocomplete fica em `src/components/site/site-search.tsx`; o Enter abre `/produto/[slug]`, onde a disponibilidade continua sendo confirmada pelo WhatsApp.
- A busca movel abre em dialogo de tela cheia para preservar espaco no header e manter teclado, foco e resultados visiveis.

## Pagina de Produto e Avaliacoes

- `/produto/[slug]` e server-rendered e consulta produto publicado, correlatos, resumo de notas e as oito avaliacoes publicadas mais recentes.
- Componentes client isolam zoom da imagem, quantidade/carrinho, simulacao local de CEP e formulario de avaliacao; precos, estoque e elegibilidade continuam validados no servidor.
- `POST /api/produtos/[id]/avaliacoes` usa a sessao Auth.js e a relacao `ProductReview -> Customer + Order + Product` para provar compra concluida.
- O redirecionamento de cliente apos login passa por `getSafeCustomerCallbackUrl`, que aceita somente destino local fora de `/admin`, `/api` e `/login`.
