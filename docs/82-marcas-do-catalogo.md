# 82 — Marcas do catálogo na home

## Apenas identidade da marca — 26/10/2026

Esta decisão substitui a alternativa por foto de produto de 25/10, mantida no histórico abaixo. Cada cartão usa exclusivamente logo oficial local conferido ou nome legível. Nunca usa embalagem, foto do produto ou imagem inferida do fabricante. Falha do logo preserva o nome e o mesmo link. `getPublicBrands` deixa de consultar `imageUrl`/`imageAsset` e de validar arquivos de fotos, retornando apenas as identidades filtradas. `PublicBrand.imageUrl` permanece opcional por compatibilidade, mas não é preenchido pelo builder nem usado na renderização.

KitKat é uma marca de chocolates da Nestlé no Brasil, conforme a [página da marca](https://www.nestle.com.br/marcas/chocolates/kitkat) e o [catálogo de marcas Nestlé Professional](https://www.nestleprofessional.com.br/marcas). A distinção é marca versus fabricante: não se troca automaticamente KitKat por Nestlé, Huggies por Kimberly-Clark ou Johnson’s por Johnson & Johnson. As grafias Kit Kat/KitKat formam um cartão KitKat e consultam todos os valores originais equivalentes; Nestlé permanece separada. Regras existentes de títulos completos, apresentação/dosagem, nomes comerciais de medicamentos e agrupamento Johnson’s/Baby são preservadas.

Quatro logos oficiais acrescentados em `public/brands`, WebP lossless, proporção preservada e sem ampliar bitmaps:

| Marca / arquivo | Dimensões | Bytes | Fonte oficial / original |
| --- | --- | --- | --- |
| Huggies — `huggies.webp` | 130 × 27 | 830 | [Huggies Brasil](https://www.huggies.com.br/cancelar-inscricao), [PNG](https://www.huggies.com.br/-/media/feature/huggies/emea/ua/navigation/logo/huggies-logo.png) |
| Huppy Baby — `huppy-baby.webp` | 480 × 221 | 51.774 | [Fabricante Ever Green](https://www.evergreen.com.br/huppy-baby), [arte original](https://static.wixstatic.com/media/c23d53_eb2a54183cbb4ee681db082281697d69~mv2.png/v1/fill/w_734,h_338,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/huppy.png) |
| Intimus — `intimus.webp` | 480 × 134 | 29.466 | [Intimus](https://www.promo.intimus.com.br/app/), [PNG](https://www.promo.intimus.com.br/static/logo-lg-c5c9f3f4b1349842cf34579ffc634382.png) |
| KitKat — `kitkat.webp` | 255 × 255 | 15.760 | [Nestlé Professional](https://www.nestleprofessional.com.br/marcas), [PNG](https://www.nestleprofessional.com.br/sites/default/files/styles/np_brand_logo_list/public/2023-02/Logo-kitkat.png?itok=6biTY8xa) |

Hydraporin mantém o nome: não foi localizado um logo avulso oficial validado nesta consulta. Não foi usado recorte de produto nem logo redesenhado. Direitos permanecem com os titulares, sem alegação de parceria. Novas marcas elegíveis continuam aparecendo por nome enquanto não houver asset conferido.

Regressões cobrem a ausência de requisições de fotos de produto, nomes após erro de logo, gestos existentes, agrupamento KitKat nas duas direções e separação de Nestlé. Dados e filtros originais do catálogo permanecem preservados.

Publicado no app em `1749a08`. Conferência em 1280 e 390 px: 97 marcas, nenhuma foto de produto na faixa, quatro logos novos carregados e KitKat em um único cartão. Seu link abriu `/catalogo?marca=KitKat&ordem=preco-asc`, com o produto da marca. Os quatro WebP retornaram HTTP 200 e hashes idênticos aos arquivos locais. Capturas e validações em `outputs/home-categories-brands-2026-10-26/`, fora do Git. Lint, TypeScript, build, 42 testes direcionados e 485 de segurança aprovados; auditorias mantêm somente o moderado preexistente `fast-uri`.

## Identidade única e foto alternativa — 25/10/2026

Cada cartão representa uma marca, sem título completo, dosagem ou apresentação de produto. Johnson’s e Johnson’s Baby passam a formar um único cartão Johnson’s; o filtro canônico e os links antigos incluem ambas as grafias, sem incluir Johnson & Johnson. Esta decisão substitui a separação descrita no histórico abaixo. Não há agrupamento genérico por fabricante ou por semelhança de imagem.

A descrição legada “Natural Baby Wipes Mãe e Filho” aparece como Natural Baby, preservando a busca pelo valor original. Referência comercial: [CDA, lenços Natural Baby, EAN 7896064490818](https://www.cdadistribuidora.com.br/lencos-umedecidos-natural-baby-wipes-mae-e-filho-50-folhas-1571-1). Registros cujo campo marca repete o nome completo ou contém quantidade/dosagem saem somente da vitrine; os produtos e seus dados permanecem preservados.

Logos locais já conferidos têm prioridade. Na ausência de logo, o cartão usa uma foto pública de produto da própria marca, com o nome da marca abaixo. Exige vínculo correspondente à biblioteca, caminho local de produto e arquivo válido, usando `validatedHomePhotos`; não usa imagens privadas, remotas, ilustrativas, de laboratório, medicamentos ou Farmácia Popular. A escolha é determinística. Valida-se inicialmente uma candidata por marca; se falhar, procuram-se alternativas apenas nos grupos afetados. Uma primeira foto ausente não elimina uma marca com outra foto válida.

Sem logo conferido ou foto válida, a marca aguarda fora dessa faixa, mantendo seus produtos e filtros disponíveis no catálogo. Marcas novas com imagem elegível entram automaticamente. Falha de mídia no navegador tenta a alternativa disponível e preserva o nome e o link acessível. Não há novos assets, importação, alteração de preço/estoque, ou alegação de parceria.

O DTO `PublicBrand` acrescenta apenas `imageUrl` opcional. O carrossel mantém arraste, toque, teclado, setas, movimento reduzido e carregamento sob demanda. As regressões cobrem aliases nas duas direções, título indevido, mídia inválida, seleção estável e alternativa após falha, além dos filtros e gestos existentes.

## Johnson’s e Pampers — 23/10/2026

Acrescentados os logos oficiais de Johnson’s e Pampers para as marcas já publicadas. As grafias `Johnson’s` e `Johnson’s Baby` usam a mesma arte, mantendo seus filtros separados; `Pampers` recebe seu próprio asset. São apenas três entradas no mapa visual existente, sem mudança na inclusão automática, na ordem ou em produtos/preços/estoque. Não usar o logo corporativo Johnson & Johnson para representar a linha Johnson’s.

| Arquivo | Dimensões | Bytes | Fonte oficial |
| --- | --- | --- | --- |
| `johnsons.webp` | 464 × 200 | 23.352 | [Marcas Kenvue](https://www.kenvue.com/brands), [PNG original](https://kenvue-production-kenvue.s3.us-east-1.amazonaws.com/brightspot/b9/a5/a4e3e24c8d95495eb16377fc8dfb/10cfeeb2-5040-4218-a3c1-21fdea744994-2x.png) |
| `pampers.webp` | 480 × 218 | 8.360 | [Pampers Brasil](https://www.pampers.com.br/), [SVG original](https://images.ctfassets.net/t4odg9b4leib/H6pilwZxMcCa3D9SpWHcS/8747be80a2dce51bd950d5e892a718bc/Pampers_Logo_Revamp__2_.svg) |

WebP lossless; Johnson’s sem ampliação e Pampers rasterizado do vetor. Proporções, letras e cores preservadas; carregamento continua local e sob demanda. Marcas pertencem aos respectivos titulares, sem declaração de parceria.

A conferência de catálogo desta tarefa não demonstra linhas completas: entre os sete nomes da referência, havia 3 Dove, 3 Johnson’s/Johnson’s Baby, 23 L’Oréal Paris, 1 Pampers e 2 Ducray (grupo Pierre Fabre), além de 48 La Roche-Posay, 37 Vichy e 16 CeraVe do grupo L’Oréal. Não foram encontrados produtos ativos sob Novo Nordisk ou Rexona. Contagens são datadas, não comprovam disponibilidade atual de fornecedor. Nenhum produto foi adicionado para preencher lacunas.

As 32 capas de Dove, Johnson’s, Pampers, Ducray e L’Oréal Paris responderam HTTP 200, decodificaram como WebP e foram revisadas em prancha; permaneceram preservadas. As demais 101 capas das três marcas dermatológicas não fizeram parte desta revisão visual. Evidências, hashes e limitações em `outputs/linhas-e-fotos-2026-10-23/`, fora do Git.

Validação local desta alteração: 19 testes existentes de marcas e busca aprovados; TypeScript, lint, `git diff --check` e 484 testes de segurança aprovados. Os dois novos assets passaram pela inspeção visual. Estado de CI, build e publicação deve ser conferido na evidência final da tarefa; a preparação não comprova ativação.

## Arraste e identidade das marcas — 20/10/2026

O carrossel permite arrastar com o mouse, inclusive iniciando no logo ou link. A captura começa após seis pixels, com encaixe e rolagem suave suspensos durante o gesto. Soltar/cancelar limpa a captura; arrastar não abre o catálogo. Clique comum, Enter, Tab, setas e movimento reduzido são preservados. Toque continua com rolagem horizontal nativa e permite rolar a página verticalmente.

Nomes comerciais de medicamentos saíram desta faixa. A lista agrupa todas as grafias de marca e avalia classificação estruturada `MEDICINE`, necessidade de receita e categoria medicinal. Um único registro medicinal oculta todo o grupo, exceto identidades farmacêuticas reconhecidas. Vinte e um laboratórios são reconhecidos explicitamente; 22 nomes comerciais atuais também ficam bloqueados quando seus metadados estão incompletos. Não há inferência de fabricante pelo nome do medicamento, nem alteração em dados dos produtos ou no filtro direto do catálogo.

Marcas novas de itens não medicinais continuam aparecendo automaticamente. Laboratório novo em produtos medicinais precisa de conferência de identidade antes da inclusão na lista reconhecida. O modelo não contém um campo separado de fabricante: um medicamento futuro totalmente malclassificado, sem qualquer indicação medicinal e fora da lista de nomes já triados, não pode ser identificado só pelo texto `brand`; a classificação de cadastro continua necessária. Nova Química e Neo Química são identidades diferentes e não são agrupadas.

Adicionados 17 logos oficiais, 108.078 bytes, em WebP lossless, com até 480 × 240 e sem ampliação. Somados aos onze originais, são 28 assets locais. Legrand, Medquímica e Clear usam fundo escuro para preservar a legibilidade dos arquivos fornecidos. As marcas continuam pertencendo aos respectivos titulares; não há declaração de parceria.

Na conferência do site publicado em 20/10/2026, a faixa apresentou 32 marcas/laboratórios, com 28 logos. Os 22 nomes comerciais identificados não apareceram na navegação. Quatro marcas permaneceram pelo nome: Eurofarma, Merck e Kit Kat tiveram originais bloqueados por HTTP 403; Wyeth não teve arquivo oficial inequívoco localizado. Esses resultados são da consulta desta tarefa, não um limite fixo de marcas.

| Novo logo em `public/brands` | Página | Original |
| --- | --- | --- |
| Aché — `ache.webp` | [Página oficial](https://www.ache.com.br/) | [Arquivo de origem](https://www.ache.com.br/wp-content/themes/ache/dist/img/LOGO-Ach%C3%A9.svg) |
| Althaia — `althaia.webp` | [Página oficial](https://althaia.com.br/) | [Arquivo de origem](https://althaia.com.br/wp-content/uploads/2024/12/Layer-1.svg) |
| Biolab Farma — `biolab.webp` | [Página oficial](https://www.biolabeco.com.br/marcas-biolab/) | [Arquivo de origem](https://www.biolabeco.com.br/wp-content/uploads/2024/08/Logo_Novo_Biolab_Farma-720x312.png) |
| Biosintética — `biosintetica.webp` | [Página oficial](https://www.biosintetica.com.br/) | [Arquivo de origem](https://www.biosintetica.com.br/assets/images/svg/logo.svg) |
| Cimed — `cimed.webp` | [Página oficial](https://cimedremedios.com.br/wp-json/wp/v2/media?search=logo&per_page=30) | [Arquivo de origem](https://cimedremedios.com.br/wp-content/uploads/2026/04/logo_cimed_preta.png) |
| Geolab — `geolab.webp` | [Página oficial](https://www.geolab.com.br/) | [Arquivo de origem](https://www.geolab.com.br/wp-content/uploads/2025/11/logo_geolab_oficial.svg) |
| Legrand — `legrand.webp` | [Página oficial](https://legrandpharma.com.br/) | [Arquivo de origem](https://legrandpharma.com.br/wp-content/themes/legrandpharma-theme/assets/img/logo-legrand.webp) |
| Medley — `medley.webp` | [Página oficial](https://www.medley.com.br/) | [Arquivo de origem](https://www.medley.com.br/dam/jcr:ecac2d78-4855-4b0c-ab86-2fb693413420/Camada_1__.2025-08-14-21-32-07.png) |
| Medquímica — `medquimica.webp` | [Página oficial](https://medquimica.ind.br/) | [Arquivo de origem](https://medquimica.ind.br/wp-content/uploads/logo-medquimica.png) |
| Momenta — `momenta.webp` | [Página oficial](https://momentafarma.com.co/) | [Arquivo de origem](https://momentafarma.com.co/momenta/logo/thumb-logo.png) |
| Nova Química — `nova-quimica.webp` | [Página oficial](https://www.novaquimicaonline.com.br/) | [Arquivo de origem](https://www.novaquimicaonline.com.br/img/nova_gen_logo.png) |
| Organon — `organon.webp` | [Página oficial](https://www.organon.com/brazil/) | [Arquivo de origem](https://www.organon.com/brazil/wp-content/themes/organon/images/organon-logo.svg) |
| Pharlab — `pharlab.webp` | [Página oficial](https://www.pharlab.com.br/) | [Arquivo de origem](https://www.pharlab.com.br/wp-content/uploads/2026/04/logo_Pharlab_juntossomossaude_box_2026.png) |
| Torrent Pharma — `torrent.webp` | [Página oficial](https://www.torrent.com.br/) | [Arquivo de origem](https://www.torrent.com.br/uploads/new-logo.png) |
| Clear — `clear.webp` | [Página oficial](https://www.clearhaircare.com/br/home.html) | [Arquivo de origem](https://assets.unileversolutions.com/v1/1235064.png) |
| Ducray — `ducray.webp` | [Página oficial](https://www.ducray.com/pt-br) | [Arquivo de origem](https://www.ducray.com/var/dfp/storage/images/1/0/7/0/21540701-46-por-BR/c90d4c1c157f-logo_du_x1-png) |
| Neutrogena — `neutrogena.webp` | [Página oficial](https://www.neutrogena.com.br/) | [Arquivo de origem](https://images.ctfassets.net/3zfcttr0ztpr/6uWyv7yvvOwX27cDZ8cl17/b40d59dfe5dff6cdb5fbe3f6dd8d072b/ba82c4ab-4216-4bcd-a420-b274012e3a18_079f01a4-a34f-4b4b-9720-9b92fbb24523_Prev.jpg?w=628) |

O site do Biolab anuncia Biolab Farma, mas o download oficial fornecido ainda contém a assinatura “Farmacêutica”; a arte foi preservada. Momenta usa a versão disponível no site regional oficial. Fontes, hashes e dimensões constam em `outputs/marcas-arraste-2026-10-20/fontes.json`, com prancha revisada, fora do Git.

Validação desta atualização: 18 testes direcionados (incluindo gestos reais de mouse e toque em Chromium), 420 testes de segurança, TypeScript e revisão independente aprovados. A conferência com CSS construído em 390 e 1440 px verificou rolagem horizontal, página vertical, estilos durante o arraste, ausência de navegação acidental e de transbordamento da página. A suíte completa também é exigida pela CI antes da ativação. Cabeçalho, marca da farmácia e bolhas do rodapé preservados.

Lint aprovado. Auditoria de produção sem vulnerabilidades; auditoria completa com cinco alertas altos existentes na cadeia de desenvolvimento de `braces`/ESLint, sem críticos. Nenhuma dependência alterada nem correção forçada fora do escopo.

Publicação: código `82f9fb8`, imagem com revisão OCI correspondente e app `healthy`, sem reinícios. CI [39446166177](https://github.com/WilliYY/wimifarma-br/actions/runs/39446166177) aprovou os 966 testes da suíte completa, Prisma, TypeScript, lint e auditorias de bloqueio. Build Docker aprovado. Conferência em Chromium de produção, em 1440 e 390 px: arraste e toque sem navegação acidental, sem erros de página ou transbordamento; clique em Aché abriu o catálogo com a marca correta. Os 17 novos WebP retornaram HTTP 200 com SHA-256 idêntico aos arquivos locais. Provas em `outputs/marcas-arraste-2026-10-20/publicado.json` e capturas `publicado-1440.png`/`publicado-390.png`, fora do Git. Nenhum pedido ou mensagem enviado.

## Comportamento solicitado

Em 19/10/2026, o lojista pediu uma faixa de marcas semelhante à referência fornecida, abrangendo perfumaria, medicamentos e os demais segmentos. Cada cartão abre os itens da respectiva marca. Novas marcas entram automaticamente quando um produto é publicado.

A home consulta as marcas de todos os produtos `ACTIVE`, incluindo os que não têm foto, estão indisponíveis ou exigem receita. A consulta seleciona `brand`, `category`, `requiresPrescription` e `catalogClassification`, apenas para verificar a identidade da marca, sem custos, ofertas, dados de clientes ou alteração da classificação. Não usa `distinct` somente por marca, pois isso ocultaria registros medicinais conflitantes. O cliente recebe apenas `key`, `name` e `href` após a filtragem. Marcas nulas/vazias são omitidas; maiúsculas, acentos, pontuação e espaços equivalentes são agrupados. A navegação não cria marcas a partir do nome do produto nem promete estoque.

O cache React compartilha a leitura dentro da requisição. As rotas são dinâmicas: publicação, mudança de marca ou retirada do último produto ativo aparecem na próxima abertura/atualização da página, sem precisar editar uma lista fixa, reconstruir o app ou cadastrar logo.

## Navegação e identidade

- Destino: `/catalogo?marca=<nome>&ordem=preco-asc`. O servidor resolve as grafias completas equivalentes e usa igualdade no campo de marca; não pesquisa por substring, nome, princípio ativo ou descrição.
- Marca, grupo e ordenação permanecem na paginação de 24 itens. O catálogo identifica a marca selecionada e oferece `Limpar marca`. Marca desconhecida resulta em lista vazia.
- As regras de preço comercial, estoque, receita, fotografias e checkout continuam nos serviços existentes. O bloco de marcas é navegação, sem declaração de parceria oficial ou de disponibilidade de todos os itens.
- A lista parte do catálogo, com os filtros de identidade descritos na atualização de 26/10. As onze marcas originais mantêm prioridade visual; as demais seguem em ordem alfabética. Marca elegível sem logo aparece pelo nome; fotos de produtos não são alternativas de logo. Se a mídia falhar no navegador, o nome e o link permanecem disponíveis.

## Direção visual e acessibilidade

Direção de varejo claro, usando Barlow, tokens existentes e cartões cinza arredondados como na referência. Identidade das marcas preservada; não foram desenhadas ou geradas logos por IA. DFII 14: impacto 3, adequação 5, viabilidade 4, desempenho 4, risco 2.

Uma linha com rolagem horizontal nativa, encaixe dos cartões, toque, teclado e setas de 44 px. Limites desabilitam as setas; não há reprodução automática. Movimento reduzido elimina a rolagem suave. Links têm nome acessível e foco visível. Nenhuma marca publicada significa ausência do bloco. Header e animação da logo, atalhos existentes e 128 bolhas do rodapé preservados.

Os cartões aparecem após a campanha principal e antes das vitrines de produtos. `BrandCarousel` recebe `PublicBrand[]` (`key`, `name`, `href`); o campo legado `imageUrl` é ignorado. Destinos não são pré-carregados em massa. Logos locais, carregamento sob demanda e dimensões reservadas evitam requisições a fabricantes durante a navegação.

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

Arquivos: componente `brand-carousel.tsx`, helpers `brands.ts`/`brand-logos.ts`, consulta e testes de `storefront`, home, rota/página de catálogo e onze logos. README, histórico 07, documentos 10/13 e este contrato registram a entrega.

## Publicação e conferência final

Código no commit `5cdf46a` (`feat(catalog): add automatic brand navigation`), incluído na imagem publicada `b4441e9`. Conferência concluída em 19/10/2026, horário de Brasília: app `running / healthy`, revisão OCI `b4441e968a28da4c578a1182498b7f049defd7a5`. O checkout do servidor já incluía também a documentação `ec14966`. A publicação aproveitou a atualização simultânea das vitrines; nenhuma versão anterior foi recolocada no ar.

- Build de produção passou em worktree isolada no commit `5cdf46a`, incluindo compilação, verificação de tipos e geração de páginas. Lint, TypeScript e `prisma:validate` também passaram. Treze testes direcionados de marcas, catálogo, atalhos e coleções passaram; os 400 testes de segurança passaram.
- A suíte completa nessa revisão executou 884 testes: 883 passaram e um teste existente de quantidade no carrinho excedeu o tempo de navegação do navegador. O arquivo `product-card-actions.test.ts` foi reexecutado isoladamente, com os quatro cenários aprovados. Não houve alteração do teste ou do carrinho para esta entrega; a execução completa não é registrada como integralmente aprovada.
- Auditoria de dependências de produção: zero vulnerabilidades. Auditoria completa: cinco alertas high em ferramentas de desenvolvimento (`@next/eslint-plugin-next`, `braces`, `eslint-config-next`, `fast-glob`, `micromatch`), zero critical. Permanecem fora do escopo desta mudança.
- Consulta pública confirmou 29 links de marcas. As 29 páginas iniciais retornaram as contagens esperadas e o primeiro produto de cada uma teve sua marca conferida nos dados estruturados. A Nivea retornou 132 produtos distintos em seis páginas; marca inexistente retornou lista vazia. Onze logos responderam com HTTP 200 e `image/webp`, somando 89.818 bytes. Nenhuma falha nesse verificador.
- Conferência no navegador desktop: aparência da faixa, avanço/retorno das setas, clique na EMS com seis produtos, clique na Nivea com 132 produtos e passagem para a página 2 mantendo a marca. A captura local final está em `outputs/marcas-2026-10-19/marcas-publicadas.png`, fora do Git. Não foi feita conferência visual em dispositivo móvel nesta entrega.

Não houve alteração em dados de produtos, preços, estoque, pagamentos, permissões ou infraestrutura compartilhada. A inclusão automática depende de o produto estar publicado e possuir a marca preenchida; sem logo no registro local, a marca aparece pelo nome.
