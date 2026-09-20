# 13 - Assets institucionais

## Campanhas principais com marcas — 2026-09-20

`HeroProductStage` substitui as composicoes sem marca abaixo. Sao quatro fotos reais por campanha, com rotulos originais, em composicao HTML/CSS sobre fundo branco. Sem sintese de logotipos ou promessa de parceria. Oito fotos distintas totalizam **159.488 bytes**, incluindo NIVEA/Rexona ja existentes. Apenas a campanha ativa carrega; cuidados e perfumaria reutilizam URLs/cache.

Novas fotos em `public/banners/products/`: conversao Sharp WebP qualidade 88, esforco 6, maximo 800 px e `withoutEnlargement`. Next Image entrega tamanhos responsivos em qualidade 84. Nao usar uma foto pequena como fonte de uma arte grande; texto e nomes de marcas permanecem HTML.

| Arquivo | Dimensoes | Bytes | Fonte |
| --- | --- | --- | --- |
| `dove-oleo.webp` | 800 x 800 | 18518 | Foto do produto publicado no catalogo Wimifarma, oleo de banho 240 ml |
| `dove-original.webp` | 800 x 800 | 39262 | Dove/Unilever, sabonete Original 90 g |
| `johnsons-shampoo.webp` | 413 x 413 | 8804 | Johnson’s, shampoo Cabelos Claros 200 ml |
| `huggies-fraldas.webp` | 546 x 546 | 19320 | Huggies, fralda Natural Care |
| `huggies-banho.webp` | 546 x 546 | 15802 | Huggies, sabonete liquido Extra Suave |
| `huggies-condicionador.webp` | 546 x 546 | 16856 | Huggies, condicionador Extra Suave |

Fontes conferidas em 2026-09-20:

- Dove oleo: [produto da loja](https://wimifarma.com.br/produto/oleo-de-banho-dove-glicerinado-240ml); imagem `/uploads/products/product-7a8bc125-65af-4dc2-af19-3386bc432726.webp`. Copia estatica para evitar dependencia do cadastro ao exibir a campanha; nao altera o produto.
- Dove sabonete: [fabricante](https://www.dove.com/br/p/sabonete-original.html/07898422746759); imagem `https://assets.unileversolutions.com/v1/118664812.png`.
- Johnson’s: [fabricante](https://www.johnsonsbaby.com.br/produtos/shampoo/johnsons-baby-shampoo-para-cabelos-claros); imagem `https://images.ctfassets.net/j62l7jj24jl8/400jMBA5zgkhf0oswaj8jd/7f0d91ceb748b424fe73595fa08fa608/js_baby_shapoo_cabelos_claros_frente_200ml_0-pt-br?fm=png&w=800` (fonte real limitada a 413 px, sem ampliacao).
- Huggies fraldas: [fabricante](https://www.huggies.com.br/fraldas/huggies-fralda-descartavel-premium-natural-care); imagem `https://www.huggies.com.br/-/media/feature/huggies/lao/br/media/product/huggiesbr/20250205_natural-care-od_hero_g66_546x546.jpg?h=546&w=546&rev=-1&hash=E0C36345B9EE95E5DEBB083E45CB4D0C`.
- Huggies banho: [fabricante](https://www.huggies.com.br/linha-banho-baby/sabonete-liquido-huggies-extra-suave); imagem `https://www.huggies.com.br/-/media/feature/huggies/lao/br/media/product/productimages/projet_2_sabo.png?h=546&w=546&rev=-1&hash=948830E51D995F07CB4B1EA0D4211523`.
- Huggies condicionador: [fabricante](https://www.huggies.com.br/linha-banho-baby/condicionador-huggies-extra-suave-hipoalergenico); imagem `https://www.huggies.com.br/-/media/feature/huggies/lao/br/media/product/productimages/projet_1_condi.png?h=546&w=546&rev=-1&hash=CA78558BD40D9122AFD5FAC4774FE500`.

NIVEA Milk e Rexona Bamboo reaproveitam as fontes registradas na secao Perfumaria. Fotos publicas de embalagens, sem presumir licenca aberta; direitos dos titulares preservados, sem alegacao de parceria oficial. Uso contextual de identificacao; substituir por material de fornecedor se necessario. Os links comerciais consultam versoes e disponibilidade, sem cadastrar produto ou afirmar estoque. Fotos com promocao impressa e fonte insuficiente foram descartadas antes da entrega.

## Historico: campanhas sem marca — 2026-09-19 (fora da renderizacao)

Geradas com a ferramenta nativa ImageGen, sem chave/API externa do projeto. Fotografias ilustrativas, sem marcas, preços, texto incorporado ou alegações clínicas; não representam estoque cadastrado. Legenda visível em todos os tamanhos. PNGs originais permanecem fora do repositório; conversão com Sharp para WebP qualidade 84, esforço 6, sem ampliar resolução.

| Asset | Dimensões | Bytes | Origem ImageGen |
| --- | --- | --- | --- |
| `public/banners/hero-cuidados-v2.webp` | 1536 × 1024 | 75194 | `exec-5095a66a-c995-4e0d-bd0b-48dcf1f642f1.png` |
| `public/banners/hero-perfumaria-v2.webp` | 1536 × 1024 | 85068 | `exec-e4e76029-93ab-41cc-9187-8c8a844b86d0.png` |
| `public/banners/hero-infantil-v2.webp` | 1536 × 1024 | 111112 | `exec-ac1c8686-1468-4ecb-be85-cfb4db8150ee.png` |

### Prompts de produção

- **Cuidados:** premium photorealistic product still life for a Brazilian neighborhood pharmacy homepage, landscape 3:2, highest available resolution; seven unbranded everyday care packages centrally grouped: white/emerald carton without claims, white cylindrical bottle, boxed adhesive bandages, digital thermometer, cotton pad bag, clear hand gel and white pump bottle. Low ivory plinths, pale sage backdrop, diffuse daylight, natural contact shadows, all objects sharply focused, entire group inside the central 80% with 8% margins for mobile. No people, readable text, logos, medicine names, prices, loose pills, clinical claims, watermark or captions. Illustrative companion to HTML cashback campaign, not a specific medicine advertisement.
- **Perfumaria:** premium photorealistic commercial still life, landscape 3:2; nine unbranded products: blush perfume with gold cap, ivory lotion pump, rose shampoo, peach conditioner tube, white sunscreen-style tube with no SPF writing, navy deodorant aerosol, mint soap pump, cream jar and wrapped ivory soap. Blush/ivory risers, pale pink studio backdrop, small green leaf, crisp materials and edges, realistic contact shadows, entire product family within central 80%, 8% margins, no cropped caps. No people, legible text, logos, prices, claims, watermark or collage.
- **Infantil:** premium pharmacy mother-and-baby hygiene still life, landscape 3:2; eight product types: sage shampoo, cream lotion pump, yellow wash tube, white/mint diaper pack, mint baby wipes, white diaper cream tube, cotton swabs and folded white diapers. Ivory/butter-yellow risers, pale mint washcloth, calm sage/cream nursery background, soft botanical shadows, sharp seams and textures, packages inside central 80%, 8% margin. No people, feeding bottles, infant formula, food, breastmilk substitutes, legible text, logos, prices, clinical claims or watermarks.

A foto inteira usa `object-contain` em área `3:2`. Desktop reserva uma coluna para texto HTML; mobile coloca a imagem acima. O carrossel monta só a imagem ativa com `sizes` adequado, prioridade inicial e qualidade 84. A faixa inferior usa texto HTML e ícones, eliminando a redução de letras da antiga imagem `faixa-home.webp`. Arquivos antigos preservados para reversão e usos em metadados.

As embalagens Dove, Rexona e NIVEA continuam sendo as imagens existentes abaixo: não foram redesenhadas por IA. O banner Dove agora solicita largura suficiente para sua composição, e a perfumaria mobile separa imagem e texto.

## Perfumaria

- `public/banners/dove-care.webp`: composicao existente preservada na primeira campanha.
- `public/banners/rexona-care.webp`: Rexona Bamboo 150 ml, embalagem de referencia; WebP de 800 x 800 px. Fonte da imagem: https://coopsp.vtexassets.com/arquivos/ids/217112-800-auto?aspect=true&height=auto&v=637919537236000000&width=800 ; pagina: https://www.coopsupermercado.com.br/desodorante-aerosol-rexona-bamboo-150ml-s/p .
- `public/banners/nivea-care.webp`: NIVEA Milk 400 ml; WebP de 800 x 800 px. Fonte: https://www.efacil.com.br/wcsstore/ExtendedSitesCatalogAssetStore/Imagens/1000/107107_01.jpg ; pagina: https://www.efacil.com.br/loja/produto/hidratante-corporal-nivea-milk-pele-extra-seca-400ml-p107107/ .
- Referencias de categoria conferidas nos fabricantes em 2026-09-10: https://www.rexona.com/br/p/antitranspirante-rexona-feminino-aerosol-bamboo.html/07791293032498 e https://www.nivea.com.br/produtos/nivea-lo%C3%A7%C3%A3o-deo-hidratante-milk-400ml-40058083156970033.html . Nao foram reproduzidas promessas quantitativas no texto comercial da faixa.
- Fotos publicas de embalagens, nao imagens geradas nem licenca aberta presumida. Marcas e direitos pertencem aos respectivos titulares; manter apenas no contexto de identificacao dos produtos e substituir por material do fornecedor se exigido. Nenhuma alegacao de parceria oficial.
- Conversao local em WebP qualidade 85, sem alterar rotulos. Embalagens/versoes podem variar; os botoes consultam disponibilidade com a Wimifarma e nao criam produtos no catalogo.

## Sobre

- Arquivo: `public/banners/sobre-atendimento.webp`.
- Dimensoes: 1920 x 646 px; 62610 bytes.
- Origem: imagem criada com a ferramenta ImageGen em 2026-09-08, modo geracao de imagem nova.
- Direcao do prompt: fotografia panoramica natural em farmacia brasileira clara, farmaceutico de jaleco com detalhe vermelho conversando com mulher mais velha; pessoas a direita, espaco claro a esquerda para texto; sem marcas ou texto na imagem.
- Uso: cena ilustrativa, nao fotografia de funcionarios ou clientes da Wimifarma.

## Contato

- Arquivo atual: `public/banners/contato-farmaceutica.webp`.
- Dimensoes: 1920 x 720 px; 63452 bytes; WebP qualidade 85.
- Origem: imagem nova criada com a ferramenta ImageGen em 2026-09-09, modo nativo; sem uso de API externa ou chave do projeto.
- Direcao do prompt: fotografia panoramica 8:3 em farmacia brasileira clara; farmaceutica adulta de jaleco branco e blusa verde suave atendendo pelo celular, expressao calma e natural, plano medio, prateleiras de medicamentos genericos; pessoa a direita e parede clara livre a esquerda para texto HTML; sem marcas, textos, estetoscopio ou alegacoes medicas.
- Uso: cena ilustrativa, nao fotografia de funcionaria real da Wimifarma. Preservar legenda e texto alternativo.
- A foto anterior `public/banners/contato-conversa.webp` deixou de ser exibida; preservada para reversao. Autoria: cottonbro studio, Pexels; fonte: https://www.pexels.com/photo/smiling-woman-in-white-long-sleeve-shirt-holding-black-phone-5081391/ ; licenca consultada em 2026-09-08: https://www.pexels.com/license/ .

## Exibicao

- Ambas exibem a legenda `Imagem ilustrativa` e texto alternativo.
- Titulos, botoes, endereco e demais textos ficam em HTML, separados da imagem.
- Imagens locais com `next/image`, `sizes` responsivo e prioridade apenas no hero acima da dobra.
- Preservar rostos ao ajustar enquadramento; validar desktop, tablet e celular antes de substituir os arquivos.
- No celular e tablet, a fotografia panoramica fica acima do texto. Em desktop compacto, fica na lateral para preservar o contraste; em telas amplas ocupa o fundo da faixa. Contato usa ponto focal `82% top` para preservar rosto e telefone; Sobre mantem o enquadramento anterior.

## Validacao da troca de imagem em 2026-09-09

- Contato conferido visualmente em 320, 390, 768, 1024 e 1440 px: imagem carregada, rosto e telefone preservados, texto legivel e sem transbordamento horizontal.
- `npm.cmd run lint`, `npm.cmd run typecheck` e `git diff --check`: aprovados. A primeira execucao conjunta excedeu o limite de tempo da ferramenta; TypeScript foi repetido isoladamente e concluiu com codigo zero.
- Alteracao visual sem logica comercial ou dados novos; contatos e botoes preservados.

## Validacao da entrega anterior em 2026-09-08

- Conferencia visual em navegador nas larguras de 320, 390, 768, 1024 e 1440 px, incluindo recorte das fotos, leitura e ausencia de transbordamento horizontal nas paginas.
- Ancora de canais, destinos WhatsApp/Maps/e-mail e abertura de perguntas frequentes por teclado conferidos, sem enviar mensagens.
- `npm.cmd run lint`, `npm.cmd run typecheck` e `npm.cmd test`: aprovados; 53 testes passaram.
- A API de visitas local retornou `P1001` por falta de acesso ao host PostgreSQL `postgres`. Essa limitacao do ambiente local nao foi tratada como validacao de banco; o servidor deve ser conferido apos o deploy.
