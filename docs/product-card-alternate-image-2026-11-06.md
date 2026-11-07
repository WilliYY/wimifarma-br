# Segunda foto nos cartões públicos — 06/11/2026

Os cartões do catálogo, busca, vitrines, relacionados e trilhos de medicamentos passam a mostrar a segunda foto pública existente quando o mouse entra no cartão. Ao sair, a capa volta imediatamente. O cartão conserva o mesmo produto, link, preço e controles de compra.

## Origem e limites

- A origem é a galeria já cadastrada em `Product.imageUrls`, na ordem existente. Os selects da home, catálogo e busca passam a incluir esse campo; o contrato `PublicProductSearchItem` o aceita opcionalmente.
- A conversão comercial existente continua filtrando imagens privadas e retirando galerias de produtos com receita. A seleção da prévia reaplica essa política e ignora a capa repetida e os arquivos ilustrativos de `/brand/`.
- Produtos com apenas uma foto, capa ausente, capa ilustrativa ou sem segunda foto elegível mantêm apenas a capa. Não são geradas imagens nem criados produtos, campos persistentes, migrações ou integrações.

## Interação e carregamento

`ProductCardSurface` mantém o próprio `<article>` como raiz DOM, incluindo os atributos dos trilhos. O contexto local comunica o hover à imagem sem acrescentar uma caixa à grade ou alterar o clique do link e dos botões.

A foto alternativa só é montada após `pointerenter` de mouse em dispositivo que corresponda a `(hover: hover) and (pointer: fine)`. Assim, cartões não visitados e produtos com uma única foto não antecipam requisições extras. Toque e teclado preservam a apresentação e navegação existentes.

A capa mantém a área reservada. A alternativa ocupa a mesma área, em camada absoluta, e só aparece depois de carregar. Falha da alternativa preserva a capa, não procura a terceira foto e não repete a tentativa na mesma montagem. A imagem alternativa é decorativa para leitores de tela; a capa mantém seu texto acessível. A troca é instantânea, sem transição ou movimento, inclusive com movimento reduzido.

## Validação

Os testes diretos de navegador usam produtos e imagens sintéticos. Cobrem cartões normal e compacto, ausência de carregamento antecipado, ordem da galeria, volta à capa, dimensões estáveis, compra por mouse/toque, duplicatas, ilustrações, receitas e erro de imagem. Testes unitários cobrem a seleção e os limites de privacidade.

Verificação direta: `node node_modules/tsx/dist/cli.mjs --test src/components/site/product-card-image.test.ts src/features/products/card-alternate-image.test.ts src/features/products/gallery.test.ts src/components/site/public-product-medicine.test.ts src/components/site/product-multipack-card.test.ts` passou com 12 testes. O ESLint direcionado aos arquivos alterados também passou.

Regressões: `node node_modules/tsx/dist/cli.mjs --test src/components/site/home-medicine-rails.test.ts src/components/site/catalog-product-card.test.ts src/components/site/product-card-actions.test.ts` passou com 18 testes, incluindo arraste, teclado, celular de 320 px, geometria das fotos, quantidades, compra e preços. A seleção unitária foi executada novamente após a normalização dos espaços da capa e passou com dois testes.

A validação local não comprova quantos produtos possuem segunda foto em produção nem publica novas fotografias. A prévia depende das imagens adicionais já conferidas e cadastradas para cada apresentação.
