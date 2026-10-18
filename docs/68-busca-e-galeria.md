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

### Ilustração institucional para medicamentos sem foto

Em 18/10/2026 o titular forneceu arte de caixa Wimifarma e pediu fundo transparente e remoção da indicação `30 comprimidos`. Após correção expressa, os demais elementos foram preservados: logo completa, G/Genérico, texto de receita, instruções laterais e cores. Foi usado o editor de imagens integrado; o resultado escolhido foi convertido para WebP de 640 × 533 px, com alpha, em `public/brand/medicamento-sem-foto.webp`. Prompt final: preservar a arte original, retirar somente a linha de quantidade e extrair a caixa com transparência. A apresentação SVG recorta a silhueta para impedir halos periféricos, sem redesenhar a logo.

`ProductImagePlaceholder` e `image-placeholder.ts` centralizam o fallback exclusivamente visual. Categoria de medicamento, genérico, ético ou Farmácia Popular e flags administrativas já existentes identificam quando usar a caixa. Perfumaria, higiene, suplementos e classificação ausente mantêm o ícone neutro. Cards e detalhe identificam a arte como `Imagem ilustrativa`; os textos do desenho não substituem a classificação, embalagem ou conservação do item vendido. Informações do produto continuam no cadastro/descrição.

Aplicado na lista, correlatos, autocomplete, lateral da busca, detalhe, carrinho, checkout, dock de compra, avaliações da conta e sugestões da Miauby. Fotos reais continuam prioritárias; se todas as fotos da galeria falharem, o detalhe usa a ilustração. A seção de medicamentos da home aceita cadastros sem foto; regras de destaque e separação de imagens privadas permanecem.

A ilustração não é gravada em `Product.imageUrl` nem vira foto de produto em metadados, feed ou pedidos. Imagens Rx reais continuam privadas. Não altera compras, saldos, cotas, estoques ou classificação de receita.

Validação da ilustração: 699 testes gerais, 324 de segurança, lint, typecheck, Prisma e build passaram; revisão independente sem achado pendente. WebP com alpha validado, 35.132 bytes. Auditoria de dependências de produção sem vulnerabilidades; os cinco alertas de desenvolvimento já documentados permanecem fora desta alteração visual.

A conferência por GET real detectou que o arquivo novo, criado com modo `600`, havia sido copiado para o runner como root: HEAD retornava 200, mas a leitura da imagem pelo usuário `nextjs` falhava com 400. Ajustado `COPY public` para `--chown=nextjs:nodejs`, mantendo a aplicação sem root; a correção imediata limitou-se ao proprietário desse arquivo. A validação deve ler os bytes como usuário da aplicação e fazer GET, não confiar somente em HEAD.

## Verificação e operação

- Regressões: consulta com dose/marca/decimal, URL de Enter, identidade de componentes, parametrização/paginação, ranking lateral e privacidade; CRUD/galeria/exclusão e proteções comerciais existentes.
- `scripts/catalog-search-audit.ts`: leitura do catálogo e sondas PostgreSQL com dados sintéticos, sem pedidos ou mutações.
- Aplicar a migração antes de subir a nova aplicação. Não há alteração de preços, ofertas, cotas, estoques, saldos ou pedidos.
- Para catálogo amplo, acompanhar latência e plano de consulta; índices especializados de texto permanecem evolução futura quando o volume justificar.

Verificações locais desta entrega: 697 testes gerais, 324 de segurança e 15 regressões de busca passaram. Lint, typecheck, Prisma e build passaram. A revisão independente confirmou as correções de dose decimal, identidade de substâncias e SKU. Auditoria de dependências de produção sem vulnerabilidades; auditoria completa conserva cinco alertas high em ferramentas de desenvolvimento, sem alteração de dependências nesta tarefa. O build inicial revelou duas frases em codificação inválida no seletor; arquivo normalizado para UTF-8 antes da repetição bem-sucedida.

## Implantação e conferência real

Código `f9b465d`, enviado ao GitHub e construído na VPS em 18/10/2026. Backup PostgreSQL validado antes da migração; imagem anterior preservada para rollback. Migração aplicada e aplicação saudável em `/api/health`. Hashes dos produtos (desconsiderando o novo campo vazio) e das ofertas permaneceram iguais; a contagem de pedidos não mudou.

Auditoria somente leitura encontrou 11 produtos para `losartana 50mg`, um para `losartana 50 mg (corus)` e oito relacionados para `corus`; sondas de doses decimais passaram também no PostgreSQL real. Não há apresentação de losartana + hidroclorotiazida publicada neste catálogo, portanto a consulta retorna zero até cadastro e validação próprios.

Chrome real: selo visual ausente no detalhe, Adicionar/Comprar disponíveis; Enter do header abriu os 11 resultados; Enter da busca móvel abriu Corus e outras apresentações. Lateral apresentou `Relevantes para sua busca`, sem inventar vendas. Em viewport 390 × 844, documento de 375 px, sem transbordamento horizontal; dimensão temporária restaurada. Galeria múltipla recebeu teste interativo com dados sintéticos, sem acrescentar imagens ou produtos fictícios em produção. Nenhum pedido, cobrança, envio ou postagem foi realizado.
