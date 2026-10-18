# Busca de produtos e galeria

## Escopo de 18/10/2026

- Removidos os selos visuais `Exige receita` no detalhe e `Receita` no autocomplete. A classificação, a compra normal de receita comum e a conferência farmacêutica antes da dispensação continuam conforme `45-pedido-online-e-conferencia-de-receita.md`. Controlados e produtos assistidos conservam suas regras.
- Enter, Encontrar e o link de todos os resultados abrem `/busca?q=...`. Clicar numa sugestão continua abrindo o detalhe. Busca vazia/sem resultado não aciona mensagens externas.
- A página mostra somente produtos ativos cadastrados, com 24 resultados por página. Termos podem estar em posições diferentes: nome, marca, princípio ativo, dose, EAN e termos cadastrados. Não cria sinônimos clínicos, produtos ou associações ausentes do catálogo.

## Consulta e relacionamento

O serviço `search-catalog.ts` usa SQL parametrizado para filtrar e paginar no PostgreSQL; não carrega o catálogo inteiro no navegador. Todos os termos precisam corresponder. Nome exato/início do nome recebem prioridade. `50 mg` e `50mg` são aceitos. Doses explícitas também são comparadas ao nome original, preservando vírgula/ponto decimal: `5mg` não corresponde a `2,5mg` ou `12,5mg`.

Correlatos usam componentes completos dos princípios ativos cadastrados, com normalização de acentos. A equivalência nominal explícita desta etapa é `losartana potássica`/`losartana`. Não se infere identidade pela primeira palavra de um sal ou ácido. Associações com mais de um componente têm seção própria e não são apresentadas como substituição. Dosagens e apresentações permanecem identificadas em cada produto.

A lateral usa produtos disponíveis encontrados na consulta. O título `Mais vendidos nesta busca` exige quantidades de pedidos `COMPLETED` e `PAID`, sem pagamentos de ambiente de teste. Sem essas vendas, mostra `Relevantes para sua busca`, sem popularidade fictícia. Não expõe dados de clientes. Resultados de busca têm `noindex,follow`; páginas canônicas de produtos permanecem como antes.

## Direção visual

Composição editorial comercial, com identidade vermelha da Wimifarma, tipografia e tokens existentes. Título com termo pesquisado, respiro entre seções, navegação por âncoras e lateral compacta em desktop; no celular a lateral vem após os resultados. Sem animações adicionais. DFII de referência: impacto 4 + adequação 4 + viabilidade 4 + desempenho 4 − risco de consistência 3 = 13.

## Fotos

`Product.imageUrl` continua sendo a capa usada pelos cards e checkout. A migração aditiva `20261018120000_product_gallery` cria `imageUrls`, inicialmente vazio, para extras ordenadas. O cadastro pode ter até seis fotos distintas no total. O painel reutiliza a biblioteca pública; não busca nem inventa fotos extras automaticamente.

O servidor deduplica e confere extras na biblioteca sob a trava do catálogo. Uma foto usada somente como extra também impede exclusão da biblioteca. Omissão preserva extras na edição; `[]` remove. Galeria com miniaturas, seleção por teclado, ampliação e falha isolada por URL: uma foto quebrada não impede as demais.

Fotos de distribuidores Rx continuam privadas conforme `67-catalogo-distribuidores-piloto.md`. Extras não aceitam URLs privadas e os DTOs públicos removem todos os arrays Rx; HTML e metadados não os expõem. Fotos adicionais só aparecem quando cadastradas e permitidas para publicação.

## Verificação e operação

- Regressões: consulta com dose/marca/decimal, URL de Enter, identidade de componentes, parametrização/paginação, ranking lateral e privacidade; CRUD/galeria/exclusão e proteções comerciais existentes.
- `scripts/catalog-search-audit.ts`: leitura do catálogo e sondas PostgreSQL com dados sintéticos, sem pedidos ou mutações.
- Aplicar a migração antes de subir a nova aplicação. Não há alteração de preços, ofertas, cotas, estoques, saldos ou pedidos.
- Para catálogo amplo, acompanhar latência e plano de consulta; índices especializados de texto permanecem evolução futura quando o volume justificar.

Verificações locais desta entrega: 697 testes gerais, 324 de segurança e 15 regressões de busca passaram. Lint, typecheck, Prisma e build passaram. A revisão independente confirmou as correções de dose decimal, identidade de substâncias e SKU. Auditoria de dependências de produção sem vulnerabilidades; auditoria completa conserva cinco alertas high em ferramentas de desenvolvimento, sem alteração de dependências nesta tarefa. O build inicial revelou duas frases em codificação inválida no seletor; arquivo normalizado para UTF-8 antes da repetição bem-sucedida.
