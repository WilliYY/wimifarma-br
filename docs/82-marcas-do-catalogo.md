# 82 — Marcas do catálogo na home

## Comportamento solicitado

Em 19/10/2026, o lojista pediu uma faixa de marcas semelhante à referência fornecida, abrangendo perfumaria, medicamentos e os demais segmentos. Cada cartão abre os itens da respectiva marca. Novas marcas entram automaticamente quando um produto é publicado.

A home consulta as marcas de todos os produtos `ACTIVE`, incluindo os que não têm foto, estão indisponíveis ou exigem receita. A consulta seleciona somente `brand`, sem custos, ofertas, dados de clientes ou alteração de classificação. Marcas nulas/vazias são omitidas; maiúsculas, acentos, pontuação e espaços equivalentes são agrupados. A navegação não cria marcas a partir do nome do produto nem promete estoque.

O cache React compartilha a leitura dentro da requisição. As rotas são dinâmicas: publicação, mudança de marca ou retirada do último produto ativo aparecem na próxima abertura/atualização da página, sem precisar editar uma lista fixa, reconstruir o app ou cadastrar logo.

## Navegação e identidade

- Destino: `/catalogo?marca=<nome>&ordem=preco-asc`. O servidor resolve as grafias completas equivalentes e usa igualdade no campo de marca; não pesquisa por substring, nome, princípio ativo ou descrição.
- Marca, grupo e ordenação permanecem na paginação de 24 itens. O catálogo identifica a marca selecionada e oferece `Limpar marca`. Marca desconhecida resulta em lista vazia.
- As regras de preço comercial, estoque, receita, fotografias e checkout continuam nos serviços existentes. O bloco de marcas é navegação, sem declaração de parceria oficial ou de disponibilidade de todos os itens.
- A lista vem integralmente do catálogo. Onze marcas com assets conferidos têm prioridade visual; as demais seguem em ordem alfabética. Marca nova sem logo aparece pelo nome e possui o mesmo link funcional. Se uma imagem falhar, o nome também permanece disponível.

## Direção visual e acessibilidade

Direção de varejo claro, usando Barlow, tokens existentes e cartões cinza arredondados como na referência. Identidade das marcas preservada; não foram desenhadas ou geradas logos por IA. DFII 14: impacto 3, adequação 5, viabilidade 4, desempenho 4, risco 2.

Uma linha com rolagem horizontal nativa, encaixe dos cartões, toque, teclado e setas de 44 px. Limites desabilitam as setas; não há reprodução automática. Movimento reduzido elimina a rolagem suave. Links têm nome acessível e foco visível. Nenhuma marca publicada significa ausência do bloco. Header e animação da logo, atalhos existentes e 128 bolhas do rodapé preservados.

Os cartões aparecem após a campanha principal e antes do Club. `BrandCarousel` recebe apenas `PublicBrand[]` (`key`, `name`, `href`). Destinos não são pré-carregados em massa. Imagens locais, WebP lossless, carregamento sob demanda e dimensões reservadas evitam requisições a fabricantes durante a navegação.

## Logos oficiais e origem

Consulta às páginas e assets oficiais em 19/10/2026. Onze WebP totalizam **89.818 bytes**, com até 480 × 240 px, sem ampliação de bitmaps, preservando contorno, cores e proporções. Teuto e Germed usam suas versões negativas sobre fundo escuro. Identificação contextual dos produtos comercializados; os direitos continuam pertencendo aos titulares. Não foi presumida licença aberta ou parceria comercial.

| Marca / arquivo em `public/brands` | Página oficial | Asset de origem |
| --- | --- | --- |
| Nivea — `nivea.webp` | [Nivea](https://www.nivea.com.br/) | [PNG oficial](https://img.nivea.com/-/media/niveax/icons/logos/brandmark_600x332.png?rx=1&ry=0&rw=598&rh=331&hash=ABF18454704B4190F047E3A6E9FBA17D) |
| Dove — `dove.webp` | [Dove](https://www.dove.com/br/home.html) | [PNG oficial](https://assets.unileversolutions.com/v1/116206019.png?im=AspectCrop=(252,60);Resize=(252,60)) |
| Vichy — `vichy.webp` | [Vichy](https://www.vichy.com.br/) | [PNG oficial](https://www.vichy.com.br/-/media/project/loreal/brand-sites/vchy/shared/baseline/emails/logovichy2x.png) |
| La Roche-Posay — `la-roche-posay.webp` | [La Roche-Posay](https://www.laroche-posay.com.br/) | [PNG oficial](https://www.laroche-posay.com.br/-/media/project/loreal/brand-sites/lrp/shared/baseline/identity/lrp_logo.png) |
| CeraVe — `cerave.webp` | [CeraVe](https://www.cerave.com.br/) | [SVG oficial](https://www.cerave.com.br/-/media/project/loreal/brand-sites/cerave/americas/br/scx/cerave_logo/cerave-header-logo-nm-en.svg) |
| L'Oréal Paris — `loreal-paris.webp` | [L'Oréal Paris](https://www.loreal-paris.com.br/) | [SVG oficial](https://www.loreal-paris.com.br/-/media/project/loreal/brand-sites/oap/shared/baseline/navigationext/loreal-paris-black-logo.svg) |
| ISDIN — `isdin.webp` | [ISDIN](https://www.isdin.com/pt-BR/) | [PNG oficial](https://www.isdin.com/assets/img/logo_isdin.png?v=1498480878) |
| EMS — `ems.webp` | [EMS](https://www.ems.com.br/) | [PNG oficial](https://www.ems.com.br/wp-content/uploads/2024/08/LOGO-EMS.png) |
| Teuto — `teuto.webp` | [Teuto](https://www.teuto.com.br/) | [SVG oficial](https://www.teuto.com.br/wp-content/uploads/2026/04/Logo-Teuto-Branco.svg) |
| Germed — `germed.webp` | [Germed](https://germedpharma.com.br/) | [PNG oficial](https://germedpharma.com.br/wp-content/themes/germed-subir/dist/img/logo-cabecalho.png) |
| Sandoz — `sandoz.webp` | [Sandoz](https://www.sandoz.com/br-pt/) | [SVG oficial](https://sandoz-com-br.cms.sandoz.com/sites/default/files/custom_site_configuration/Rebranding-Header.svg) |

Origens e hashes dos arquivos ficam no relatório local `outputs/marcas-2026-10-19/fontes.json`. Os logos foram inspecionados em uma prancha de conferência. Originais, scripts e capturas temporárias não entram no Git. Dove exigiu User-Agent/Referer do site oficial no download público; o site da Wimifarma serve a cópia local e não depende desses cabeçalhos.

## Verificação e arquivos

Os testes de `brands.test.ts`, `storefront.test.ts` e `home-shortcuts.test.ts` passaram (8/8). Cobrem agrupamento, marca nova, igualdade completa, marca inexistente, filtros combinados, paginação e seleção de publicados sem restrição de foto/receita/estoque. Lint e TypeScript passaram após a integração. Revisão independente sem achados.

Arquivos: componente `brand-carousel.tsx`, helpers `brands.ts`/`brand-logos.ts`, consulta e testes de `storefront`, home, rota/página de catálogo e onze logos. README, histórico 07, documentos 10/13 e este contrato registram a entrega. Build, auditorias e conferência pública ficam registrados ao concluir a publicação.
