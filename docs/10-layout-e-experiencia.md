# 10 - Layout e Experiencia

## Campanhas e botões do produto — 29/10/2026

Retirada da home a seção `Cuidado para cada fase`, com os cartões Dia do Genérico Barato, Dia do Idoso e Dia do Bebê, por solicitação do titular. Foram removidos também os ícones e o wrapper de animação usados exclusivamente por essa seção; os banners, vitrines, avaliações, Club e rodapé permanecem.

A revisão de botões identificou que o detalhe do produto navegava para carrinho/checkout mesmo quando o limite de 30 produtos distintos impedia a inclusão. O painel agora mostra o mesmo aviso dos cards e mantém o cliente no produto. Um item já presente continua podendo ter sua quantidade acrescida dentro do limite vigente. Os botões do painel e do dock aguardam a hidratação do carrinho; as três regressões usam dados sintéticos e não criam pedidos. Valores e limites comerciais não mudaram.

## Home compacta — 29/10/2026

A faixa inicial usa oito atalhos com ícones dentro de círculos, sem fotografias ou caixa externa: Ofertas, Infantil, Medicamentos, Vitaminas e suplementos, Dermo, Perfumaria, Higiene bucal e Cabelos. Os dois últimos usam os filtros existentes `assunto=oral` e `assunto=hair`, dentro de `grupo=beauty`. Oito destinos distintos, sem criar categorias persistentes. Círculos de 60 px no celular e 72 px a partir de 640 px; os oito cabem a partir de 1024 px e a faixa pode ser arrastada horizontalmente no celular. Os ícones têm movimentos independentes de até 3 px e 4 graus, suspensos fora da tela, na aba oculta e com movimento reduzido.

O banner principal ocupa 250 px no celular, 280 px no tablet e 300 px no desktop. As três campanhas preservam a logo completa, cenas e embalagens originais, com recorte responsivo e até duas embalagens visíveis na composição compacta. As chamadas levam ao catálogo correspondente. Foram retirados os seletores com nomes, setas e controle de pausa da faixa inferior, conforme solicitação do titular. A troca automática ocorre a cada 6,5 segundos com transição de opacidade de 340 ms; toque horizontal, arraste com mouse e setas do teclado continuam disponíveis. Arrastar não abre o link, e o gesto vertical continua rolando a página. Foco, ponteiro em interação, aba oculta, saída da tela e movimento reduzido suspendem a rotação; painéis inativos ficam `inert` e fora da leitura assistiva. Ao trocar pelo teclado dentro de um link, o foco volta ao contêiner antes de ocultar o painel.

Não há mudança no cabeçalho, sua animação/compactação, no atalho administrativo, nas vitrines comerciais, no rodapé ou nas condições de compra. `HeroProductStage` usa o modo compacto apenas no banner principal; outras campanhas conservam sua composição.

## Custo das animações visíveis e do cabeçalho — 27/10/2026

O diagnóstico em Chromium isolado identificou dois custos distintos: as bolhas visíveis animavam `width`, `height` e `bottom`, provocando layout contínuo; a transição do cabeçalho publicava `--site-header-offset` na raiz a cada altura intermediária observada, invalidando os consumidores de uma propriedade herdada.

As 128 bolhas mantêm o gerador, os nomes das duas animações, o `ease-in`, durações, atrasos, fases e o filtro `wimifarma-footer-blob`. O tamanho de layout agora é fixo. A escala parte do centro superior e a translação percorre a mesma distância que o `bottom` original, mantendo a caixa visual em cada instante. A comparação automatizada usa as propriedades geométricas originais como referência em 390, 768 e 1440 px, incluindo o trecho final de redução do tamanho. Pausa fora da tela, retomada, aba oculta e movimento reduzido continuam preservados. Esta conversão substitui a preservação literal das propriedades dos keyframes registrada em 26/10, mantendo seu efeito visual.

O cabeçalho mantém a transição CSS de 280 ms, a logo original e os controles. Durante o redimensionamento, a altura intermediária é aplicada localmente apenas aos consumidores de `--site-header-offset`, identificados pelas classes que usam essa propriedade. Os painéis fixos acompanham cada medição, inclusive após mudança de largura ou de conteúdo, sem salto final nem reserva de altura obsoleta. Após 80 ms sem nova medição, a raiz recebe a altura final e os estilos locais anteriores são restaurados. Temporizador e estilos temporários também são limpos ao desmontar. Contenção de layout e estilo limita o trabalho do cabeçalho sem recortar sugestões, logo ou menus; nenhum `contain: paint` é aplicado. Os controles de busca, conta e Painel admin mantêm seus contratos.

Uma observação temporária de inserções DOM inclui painéis que montam durante a transição, preservando o valor e a prioridade do estilo inline de cada consumidor uma única vez. A observação não acompanha alterações de atributos, não publica alturas adicionais na raiz e termina junto com os estilos locais, ao estabilizar ou desmontar.

Regressões e perfis comparativos ficam em `outputs/motion-precision-2026-10-27/`, fora do Git. Passaram 18 cenários do cabeçalho e quatro do rodapé, incluindo montagem tardia de consumidor, restauração de estilo com prioridade, redimensionamento e descarte. Lint, typecheck e build passaram no candidato final. A suíte de segurança exigida pelo projeto passou com 491 testes; auditoria de produção não apontou high/critical. A auditoria completa mantém um alerta moderado preexistente em `fast-uri`, sem alteração de dependências. Revisão independente aprovada.

A geometria das bolhas foi comparada em sete fases, para cada uma das 128 bolhas nas três larguras, com diferença máxima inferior a 0,05 px. Na fixture, layouts visíveis do rodapé passaram de 70/46/42 para zero em 1,2 s; isso não representa todo o site. A amostra pública anterior à implantação registrou 75/51 layouts em 1,4 s na página inteira em 390/1440 px. A comparação posterior usa o mesmo script, navegador isolado e bloqueio de visitas/mutações. As amostras não comprovam ausência universal de engasgos; o filtro SVG visível continua exigindo composição/pintura.

Publicação de `55585e2`: somente app atualizado, com a imagem anterior preservada para recuperação. Imagem nova `sha256:e5eab5b0a415eae1dc262adbc0b3ac7432299ac20e5f13343f13e3350b53a72f`, saudável e sem reinícios inesperados. Saúde local/HTTPS respondeu 200 e a API administrativa recusou anônimo com 401. PostgreSQL manteve identidade, imagem e início.

No mesmo roteiro público após a implantação, o rodapé passou de 75/51 para zero layouts nas duas amostras de 1,4 s. Ao recolher o cabeçalho, o tempo de recálculo de estilos caiu de 212,3 para 63,7 ms no celular e de 271,6 para 112,8 ms no desktop; escritas na raiz passaram de quatro/três para uma por direção. As alturas expandidas de 117/206 px e compacta de 65 px foram preservadas, com 128 bolhas e zero erros de página. A quantidade de layouts do cabeçalho aumentou nas amostras (10→22 e 7→15); não se afirma que seu redimensionamento eliminou layout ou que esses números comprovem FPS universal. Capturas públicas em 390/1440 px conferidas visualmente. Provas: `live-before.json`, `live-after.json`, comparação e `deploy-proof.json` na pasta de evidências indicada acima.

## Suavidade das marcas e custo do rodapé — 26/10/2026

A faixa de marcas troca escrita de rolagem por quadro por deslocamento fracionário da trilha, com transferência para rolagem nativa durante interação. O botão Pausar/Retomar foi removido a pedido do lojista; foco, hover, gestos, movimento reduzido e visibilidade continuam respeitados. Contrato em [82](82-marcas-do-catalogo.md).

O rodapé mantém as 128 bolhas, gerador, tempos, trajetórias, keyframes e filtro originais. Uma camada cliente pequena suspende as animações fora da área próxima à tela ou com a aba oculta, sem remontar as bolhas. A retomada antecipa a entrada em 200 px e mantém a fase. Contenção de layout/estilos na camada decorativa não recorta pintura nem oculta o transbordamento superior. Esta mitigação reduz trabalho desnecessário; não garante ausência de engasgos com o filtro visível em qualquer equipamento. Contrato em [61](61-avaliacoes-e-rodape.md).

## Produto sem faixas de atendimento e avaliações públicas — 26/10/2026

A página individual não exibe a faixa “Cuidado de perto, também online.”, os três benefícios de atendimento, estrelas, chamadas para avaliar, contador, opiniões ou formulário público. Produto/entrega, correlatos, navegação e informações permanecem. O espaço inferior da barra fixa passa às informações, última seção. Avaliações existentes não foram apagadas; Avaliar/Editar funciona em `minha-conta/avaliacoes` para compras elegíveis, com um formulário por seleção. A home mantém seus depoimentos reais e links para o produto sem a antiga âncora. Detalhes e limites em [68](68-busca-e-galeria.md) e [16](16-cashback-avaliacoes-resgate.md).

## Correlatos antes das informações complementares — 26/10/2026

“Produtos correlatos” fica imediatamente após galeria e painel do produto escolhido, incluindo sua consulta de entrega. Benefícios de atendimento, navegação, descrição e avaliações vêm depois. Cards e critérios de correlação não mudam. Mouse arrasta também sobre imagem/link sem abrir o produto por acidente; clique, toque, quantidade, setas e teclado são preservados. Reserva inferior da barra de compra acompanha a última seção. Contrato em [68](68-busca-e-galeria.md).

## Banner Pix com foco na oferta — 26/10/2026

Atualização de 29/10/2026: banner movido para o intervalo entre “Cuidados para o seu dia a dia” e “Farmacinha”, com composição compacta, botão destacado, símbolo Pix em movimento curto e brilho espaçado. A versão atual pausa fora da tela, em aba oculta e durante hover/foco, removendo animações com movimento reduzido. Não altera preços ou escolha de pagamento; direção anterior abaixo mantida como histórico. Contrato atualizado em [83](83-desconto-pix.md).

Faixa em verde profundo, percentual amplo em verde claro e chamada “3% OFF no Pix”, com logo completa sobre branco, condição curta e CTA “Aproveitar”. Retira o texto promocional secundário e o QR decorativo; preserva percentual, destino e condição de escolha Pix no checkout. CSS local, uma coluna no celular e três a partir de 768 px, sem novos assets ou scripts. Contrato em [83](83-desconto-pix.md).

## Marcas em largura total com movimento contínuo — 26/10/2026

A faixa mantém apenas “Suas marcas favoritas, aqui.”, centralizado; o eyebrow e o subtítulo são removidos. Os cartões percorrem lentamente a largura da página em loop, mantendo logos/nome e os mesmos filtros. Mouse, toque, teclado e setas continuam disponíveis. O movimento cessa durante hover/foco/gestos, fora da área visível, em aba oculta e com movimento reduzido. A sequência acessível não repete marcas; listas curtas ficam estáticas. Contrato em [82](82-marcas-do-catalogo.md).

## Categorias com símbolos livres e identidade das marcas — 26/10/2026

“Encontre seu cuidado” apresenta seis símbolos livres, sem fotos, círculos ou caixa externa. Os ícones representam Ofertas, Infantil, Medicamentos, Vitaminas e suplementos, Dermo e Perfumaria, com nomes legíveis abaixo e os mesmos destinos. A faixa ocupa toda a largura da página; o banner seguinte mantém seu limite e suas margens. Esta direção substitui os círculos com fotos e a grade de cartões descritos no histórico.

A faixa rola horizontalmente com mouse, toque, teclado e setas de 44 px, mantendo a página vertical livre. Arraste a partir de seis pixels não navega; clique e Enter continuam abrindo o catálogo. Entrada e hover são leves e respeitam movimento reduzido; foco, largura responsiva e ausência de requisições de fotos têm regressões. O componente ignora `imageUrl` dos atalhos; não há dependência, consulta ou asset adicional. Contrato em [88](88-faixa-categorias-visual.md).

Na faixa separada de marcas, embalagem de produto deixa de ser alternativa de logo. Logos oficiais são locais; ausência ou falha mantém nome e link. KitKat é marca Nestlé, preservada como identidade própria, com Kit Kat/KitKat agrupados sem juntar Nestlé ou outras marcas do fabricante. Quatro logos oficiais adicionados; fontes e limites em [82](82-marcas-do-catalogo.md).

## Farmácia Popular com foco no atendimento — 23/10/2026

A página usa hero com título amplo, verde de apoio, foto maior sem textos sobre os rostos e CTA principal para o WhatsApp existente. “Como funciona” leva às três etapas em lista ordenada; documentos ficam reunidos em um checklist, com confirmação da equipe antes da separação. O acesso às ofertas permanece ao final. Metadata, regras do programa, disponibilidade, retirada/entrega e atendimento assistido são preservados; não há formulário, consulta automática, nova promessa comercial ou integração.

Direção: institucional acolhedora, com Barlow, superfícies claras, verde e cores existentes. DFII 15: impacto 4, adequação 5, implementação 4, desempenho 5, risco 3. Composição em duas colunas no desktop e uma no celular; texto principal a partir de 16 px, CTAs de 52 px e foco visível. O CSS é local em `popular.module.css`, sem JavaScript, fonte, dependência ou imagem nova. Preservados selo oficial, `BrandSignature`, imagem ilustrativa existente, animação do cabeçalho e as 128 bolhas do rodapé.

Prévia com página e estilos reais em 320, 390, 768 e 1440 px: sem overflow, uma H1, três etapas, imagens carregadas e CTAs sem corte. Evidências e publicação em `outputs/farmacia-popular-ui-2026-10-23/`, fora do Git.

## Cinco produtos por fileira no catálogo — 23/10/2026

Catálogo, ofertas e categorias que compartilham `CatalogPage` exibem cinco cartões por fileira a partir de 1280 px. O conteúdo passa a ter limite de 1680 px, com lateral de 220 px e espaçamento menor entre cartões no desktop, para preservar a leitura das fotos, preços e ações. Telas menores usam uma coluna abaixo de 380 px, duas até 767 px e três de 768 a 1279 px. Não há mudança de paginação, filtros, produtos, preços ou fluxo de compra.

## Categorias da home em cartões — 23/10/2026

A faixa Ofertas, Infantil, Medicamentos, Vitaminas e suplementos, Dermo e Perfumaria passa a usar cartões com o título “Encontre seu cuidado” e um atalho adicional “Ver catálogo”. Ofertas tem fundo vermelho; as demais categorias usam superfície clara, ícones consistentes e nomes inteiros. Os seis destinos existentes e a ordenação por preço crescente permanecem intactos.

A grade apresenta duas colunas no celular, três a partir de 640 px e seis a partir de 1024 px. Todas as categorias ficam disponíveis sem rolagem horizontal. Cartões têm pelo menos 118 px de altura no celular; o link do catálogo tem 44 px. Links mantêm nomes acessíveis, foco visível e navegação pelo teclado. `prefers-reduced-motion` remove a transição e o deslocamento de hover.

Direção: navegação de varejo enxuta, com Barlow, cores e ícones existentes. DFII 15: impacto 4, adequação 5, implementação 4, desempenho 4, risco 2. O destaque de Ofertas orienta a leitura sem percentual ou promessa comercial adicional. CSS fica no módulo do componente; nenhuma fonte, dependência ou imagem é acrescentada. A foto de fundo, os botões de rolagem, `ResizeObserver` e estado de rolagem deixam de ser necessários. Cabeçalho, animação da logo, rodapé, preços, seleção diária das vitrines e checkout não são alterados.

Verificação visual local em 320, 390, 768, 1024 e 1440 px: seis cartões sem recorte ou overflow, destinos preservados e foco de teclado visível. Evidências e conferência da publicação ficam em `outputs/home-categories-2026-10-23/`, fora do Git.

## Atalhos compactos no cabeçalho — 23/10/2026

Conforme ajuste posterior do lojista, o atalho WhatsApp foi retirado do cabeçalho público. O atendimento continua pelo atalho inferior existente, integrado à Miauby no celular. O espaço liberado fica disponível para a busca.

Maps e Sair usam somente ícones também em telas largas, mantendo rótulos acessíveis e tooltips. Maps conserva 56 px e Sair 44 px, sem expansão por texto. O Maps preserva o endereço no tooltip e sua faixa de visibilidade atual. Conta/saldos, acesso Painel admin, ações e animações permanecem nos contratos atuais.

Entre 360 px e o breakpoint `sm`, o espaçamento entre blocos passa de 4 para 2 px para manter o botão de busca dentro da tela com sessão de cliente.

## Farmacinha com 15 itens — 2026-10-20

A antiga faixa “Medicamentos isentos de prescrição” passa a “Farmacinha”, com apoio “Cuidado em casa”. Como havia apenas três MIPs confirmados, o lojista autorizou completar a faixa com primeiros socorros e cuidados. A coleção prioriza medicamentos sem receita confirmados e produtos de higiene/cuidados classificados, com fotos válidas, disponibilidade e seleção sem repetição entre vitrines. Não altera cadastro, preços ou restrições de receita. Contrato em [75](75-catalogo-vitrines-e-compra-distribuidor.md).

Publicado em `fd680f4`, com push/pull e build Docker aprovados. Passaram nove testes de seleção, auditoria visual dos componentes em 390/1280 px, 442 testes de segurança, typecheck, ESLint e [CI 39472348875](https://github.com/WilliYY/wimifarma-br/actions/runs/39472348875) com 992 testes e auditorias. Produção sem vulnerabilidades; alertas preexistentes do ferramental de desenvolvimento permanecem acompanhados na auditoria completa. Conferência do HTML publicado: Farmacinha com 15 produtos, preservando os três MIPs originais e acrescentando 12 cuidados; Cuidados e Menores preços com 15 cada, total de 45 produtos sem repetição. Home e saúde HTTP 200, app saudável e zero reinícios. Imagem anterior preservada em `wimifarma-br-app:pre-farmacinha-20261020T181357Z`. Evidências em `outputs/farmacinha-2026-10-20`, fora do Git; sem pendências deste ajuste.

## Categoria Medicamentos unificada — 2026-10-20

O catálogo reúne os nomes cadastrados `Medicamento` e `Medicamentos` em um único filtro público “Medicamentos”. O filtro mantém os nomes originais na consulta para incluir todos os produtos, inclusive novas importações com a variante singular. Links de categoria e sitemap usam `/categorias/medicamentos`; o endereço singular redireciona permanentemente, preservando parâmetros de paginação. Categorias específicas e cadastros originais permanecem preservados. Alterações em `storefront.ts`, `seo.ts` e `next.config.ts`; regressão cobre agrupamento, variantes e consulta conjunta.

Publicado em `22f982d`, com commit/push, pull e build Docker aprovados. Passaram 20 testes focados, 442 de segurança, typecheck, ESLint e [CI 39464526711](https://github.com/WilliYY/wimifarma-br/actions/runs/39464526711) com 990 testes e auditorias. Produção sem vulnerabilidades; auditoria completa mantém os cinco alertas altos preexistentes no ferramental de desenvolvimento, sem críticos. App saudável, zero reinícios e imagem anterior preservada. Conferência do HTML público: apenas um filtro “Medicamentos”, 212 itens reunidos (antes 1 + 211), total do catálogo preservado em 594. Endereço antigo HTTP 308, inclusive `pagina=2` preservada; catálogo e destino plural HTTP 200. Sem migração ou alteração dos cadastros/pedidos. Evidências em `outputs/medicamentos-categoria-2026-10-20`, fora do Git; sem pendências deste ajuste.

## Textos curtos no catálogo — 2026-10-20

O catálogo geral usa o título “Produtos” e a frase “Encontre o que você precisa.”. O grupo Dermo mantém o título e usa “Cuidados para sua pele.”; os demais grupos usam “Confira os produtos desta categoria.”. As descrições de SEO, filtros, categorias e navegação permanecem como estavam. Mudança textual em `src/app/(site)/catalogo/page.tsx`, a pedido do lojista para reduzir a introdução repetida.

Publicado em `a677d5d`, com commit/push e pull no servidor. ESLint focado e `git diff --check` aprovados; 420 testes de segurança locais e [CI 39451466263](https://github.com/WilliYY/wimifarma-br/actions/runs/39451466263) com Prisma, TypeScript, lint, 967 testes e auditorias aprovados. Auditoria de produção sem vulnerabilidades; completa mantém os cinco alertas altos anteriores no ferramental de desenvolvimento, sem críticos. Build Docker Linux aprovado e imagem anterior preservada; app saudável, zero reinícios. Catálogo geral e Dermo conferidos em 1280/390 px: textos esperados, SEO preservado, HTTP 200, sem transbordamento ou erro JavaScript. Capturas em `outputs/textos-catalogo-2026-10-20`, fora do Git; sem operações comerciais reais. Não há pendências deste ajuste textual.

## Fotografia suave na faixa de categorias — 2026-10-20

Os seis atalhos recebem um painel com fotografia institucional ilustrativa em baixa opacidade, sobreposição clara e círculos com contorno e profundidade discreta. Os ícones vermelhos e os nomes mantêm prioridade visual. CSS local e imagem responsiva; sem novas promessas de confiança ou selos. Destinos, ordem, rolagem, setas e movimento reduzido preservados. Direção e validação em [88](88-faixa-categorias-visual.md).

## Preço e economia nos cards — 2026-10-20

Cards compartilhados pela home, catálogo, busca e relacionados mostram “de/por” usando referências reais e valor Pix com condição explícita de uma unidade. Selo verde distingue o Pix; promoção cadastrada conserva seu percentual próprio. Preço sem Pix permanece visível e o carrinho recebe a base anterior ao desconto. Sem alteração da grade, ações, imagens ou identidade. Contrato em [86](86-precos-e-desconto-real-nos-cards.md).

## Pagamentos e consultas no rodapé — 2026-10-20

Pix com 3%, bandeiras automáticas do Mercado Pago com alternativa em texto e seção de consultas à Anvisa. Links de reputação ficam agrupados, sem estrelas ou selos não comprovados. As marcas quebram em linhas no celular; o carregamento da consulta usa `Suspense` sem bloquear o restante. Corpo branco, logo completa e animação original das 128 bolhas preservados. Contrato em [84](84-rodape-pagamentos-e-consultas.md).

## Banner e economia no Pix — 2026-10-19

Faixa verde clara após as marcas e antes da primeira vitrine, logo oficial completa, percentual em vermelho e ação para o catálogo. O checkout destaca 3% no Pix e discrimina o valor economizado; cartão/dinheiro retiram a redução da prévia. Contrato, arredondamento e conferência responsiva em [83](83-desconto-pix.md).

## Faixa de marcas — 2026-10-19

A home apresenta cartões de marcas após a campanha principal e antes do Club. Marcas publicadas vêm do banco, abrangendo perfumaria, medicamentos e demais segmentos; o cliente abre somente os itens da marca selecionada. Rolagem nativa por toque/teclado e setas, logos oficiais e nome para marcas novas sem asset. Direção, limites, fontes e regressões em [82-marcas-do-catalogo.md](82-marcas-do-catalogo.md).

## Quantidade digitada nos cards — 2026-10-19

Depois de adicionar o produto, o número entre os botões de menos e mais é um campo editável de quantidade de caixas, com teclado numérico no celular e foco visível. Aceita somente dígitos inteiros, atualiza o carrinho imediatamente e mantém essa quantidade ao comprar. Letras, sinais e separadores decimais são rejeitados; zero é ajustado para uma caixa e valores acima do limite usam `orderQuantityLimit`, preservando estoque físico e compra sob demanda. É possível apagar para redigitar; sair do campo vazio restaura a última quantidade válida. O botão de menos continua removendo a última unidade. Produtos assistidos ou indisponíveis mantêm os fluxos existentes. Regressões de navegador em `src/components/site/product-card-actions.test.ts`.

## Consulta de CEP e frete — 2026-10-19

Produto e `/delivery` consultam as opções reais por transportadora fora da área local, com os mesmos serviços do checkout. No produto, a quantidade selecionada alimenta o simulador; no delivery, a consulta usa o carrinho. Estados vazios e erros não são apresentados como ausência definitiva de cobertura do CEP. Detalhes e limites em [79](79-calculo-cep-e-frete.md).

## Atalhos exclusivos de catálogo — 2026-10-19

A faixa circular da home reúne somente Ofertas, Infantil, Medicamentos, Vitaminas e suplementos, Dermo e Perfumaria. Ofertas abre `/ofertas`; os demais links usam `/catalogo?grupo=...&ordem=preco-asc`, preservando agrupamento por categoria, preço crescente e paginação. Uma categoria ainda vazia abre o estado vazio do próprio catálogo, sem WhatsApp ou nova aba. Farmácia Popular e Delivery foram retirados somente dessa faixa; suas páginas e demais acessos continuam disponíveis.

`buildHomeShortcuts()` não depende mais do telefone nem da existência momentânea de produtos. A home também dispensa a consulta de categorias que alimentava esse fallback. Componente, ícones e rótulo acessível foram ajustados para os seis destinos; arraste, setas e movimento reduzido mantêm o comportamento existente. Regressões verificam todos os destinos internos, os grupos reconhecidos e a ausência dos dois serviços e de links externos.

Publicado em `677d440`: quatro testes de atalhos/agrupamento/ordenação, 385 testes de segurança, TypeScript, ESLint dos arquivos alterados e build Docker aprovados; auditoria de dependências de produção sem alertas. Os seis links retornaram HTTP 200 no site publicado, inclusive categorias vazias. Conferência no Chrome confirmou seis destinos internos na mesma aba e ausência de transbordamento horizontal. App saudável, com imagem anterior preservada; não houve migração, edição de estoque/preço, pedido ou pagamento. README, documento 75 e fixtures de QA acompanham a mudança. Evidências HTTP locais em `outputs/atalhos-categorias-2026-10-19/live-results.json`.

## Campanha do Club - 2026-10-13

Banner redesenhado como campanha de fidelidade: vermelho sólido da Wimifarma, título curto em Barlow, CTA branco e cartão ilustrativo escuro com a logo oficial completa. Uma moeda dourada com coroa acompanha o cartão; não representa saldo, prêmio automático ou cartão de pagamento. Composição assimétrica e tipografia forte substituem o fundo pastel, a borda dourada e o texto extenso. Direção de varejo contemporâneo; DFII15 (impacto4, adequação5, implementação4, desempenho5, risco3).

O texto informa produtos participantes, WimiCoins combináveis com cashback e adesão gratuita sem mensalidade. A conversão monetária foi retirada deste banner; regras e valores necessários no checkout permanecem intactos. Membro abre benefícios; visitante segue para login; conta autenticada sem adesão usa confirmação explícita. Estados de consulta, adesão, falha e nova tentativa preservados pelo mesmo hook/API.

O banner tem camada própria para impedir que as nuvens decorativas das seções vizinhas cubram o vermelho. Cabeçalho, menus e diálogos continuam acima dele; as nuvens permanecem nas seções originais.

Somente `src/components/site/club-banner.tsx` muda na aplicação, sem dependências ou imagens novas. Cores usam os tokens existentes, a logo conserva proporções e contorno, e os elementos decorativos não capturam interação. Botões têm foco visível e pelo menos48px; movimento reduzido remove inclinações e deslocamentos de hover. Header e suas animações, 128 bolhas do rodapé, saldos e regras comerciais preservados. QA e publicação registrados no relatório local `outputs/club-campaign-2026-10-13/`.

Publicação: `53feb66` e correção de camada `4fac43a`, somente app, com imagem anterior preservada em `wimifarma-br-app:club-campaign-rollback-20261013`. Build/tipos, ESLint, diff, 282 testes de segurança e auditoria de produção sem vulnerabilidades aprovados. 24 cenários sintéticos em320/390/768/1440px cobrem membro, visitante, não membro, falha, carregamento e adesão em andamento; adesão explícita e nova tentativa conferidas. Página produtiva validada nas mesmas quatro larguras, com logo carregada, CTA48px e sem overflow. App/PG saudáveis, zero reinícios e health200. Capturas ficam fora do Git; nenhuma adesão, compra ou movimentação de saldo real criada para esta conferência.

## Catálogo administrativo enxuto - 2026-10-13

O lojista pediu prioridade ao trabalho com produtos, sem mensagens sobre tarefas automáticas. A listagem de `/admin/catalogos` não exibe mais o quadro sobre descoberta no Google, sitemap, fonte Shopping ou sua configuração. Esses processos e suas rotas continuam funcionando; o componente de orientação sem uso foi removido. Diagnósticos e ações manuais permanecem no botão `SEO e marketing` de cada produto.

A abertura reúne ações de cadastro, vitrine e lixeira, seguida por um resumo compacto dos quatro indicadores. Pesquisa, categoria, status e ordenação compartilham uma faixa responsiva. As linhas usam fotos menores, nome, publicação, preço, estoque e ações em duas colunas; estoque zero recebe destaque visual. Carregamento usa travessão nos indicadores para não sugerir uma contagem definitiva antes da resposta.

Direção utilitária: hierarquia curta, tipografia Barlow e cores existentes, com vermelho na ação principal e no contorno superior. Densidade controlada, sem novas animações, fontes ou dependências. DFII: impacto 3, adequação 5, implementação 4, desempenho 4, risco 2; total 14. Permissões, filtros, cadastro, edição, destaque, exclusão confirmada, fotos e dados comerciais preservam os fluxos existentes.

Validação: 219 testes e 267 testes de segurança, lint, typecheck e build aprovados; revisão independente sem achados acionáveis. Preview sintético em 320, 375 e 1440 px conferiu nomes e marcas longos, pesquisa por SKU, categoria/status combinados, menor estoque, criação/edição e cancelamento sem salvar. Nenhum overflow nas linhas ou na página. Auditoria de produção sem vulnerabilidades; cinco alertas altos preexistentes nas dependências de desenvolvimento permanecem registrados. Evidências locais em `outputs/catalog-ui-2026-10-13/`, fora do Git.

Publicado em `2a9fc22`, com reconstrução somente da aplicação. Conferência autenticada em `/admin/catalogos`: quatro produtos, indicadores reais, antigo quadro ausente e busca por Dove retornando um resultado; limpar filtros restaura os quatro itens. Desktop de 1920 px e celular de 375 px sem overflow; imagens visíveis carregadas e ações móveis de pelo menos 44 px. `/api/health`, sitemap e fonte de produtos respondem HTTP 200; app e PostgreSQL saudáveis. Nenhum produto foi salvo, destacado ou excluído. `/admin/produtos` permanece uma rota antiga e não é a listagem do menu atual.

## Atalhos circulares da home - 2026-10-12

O lojista pediu a retirada do bloco visível `Farmácia Wimifarma em Ivaté-PR` e de sua descrição. A home agora inicia com oito atalhos circulares antes das campanhas: Ofertas, Infantil, Medicamentos, Vitaminas e suplementos, Dermo, Perfumaria, Farmácia Popular e Delivery. O H1 acessível permanece como `Wimifarma`, sem ocupar espaço visual; metadados, dados estruturados e informações institucionais são preservados.

Direção visual: navegação de varejo com círculos claros, ícones de contorno no vermelho da Wimifarma e nomes legíveis, mantendo Barlow e as cores existentes. A referência fornecida orienta apenas a disposição; não são copiados a marca de outra loja, cupom ou percentual de desconto. Viabilidade: impacto 4, adequação 5, implementação 4, desempenho 4, risco 3; DFII 14.

`HomeShortcuts` permite toque, rolagem horizontal, teclado e setas de 44 px quando há conteúdo fora da tela. No desktop, os oito atalhos cabem em uma linha. Links têm foco visível e os movimentos respeitam `prefers-reduced-motion`; não há rotação automática.

As categorias vêm de `getPublicCategories()` no servidor. `buildHomeShortcuts()` usa os slugs realmente disponíveis e prioriza nomes equivalentes. Se o assunto não tiver categoria publicada, seu atalho abre uma consulta pelo WhatsApp, identificada no nome acessível e na dica do link. Não há slug inventado ou promessa de estoque. Ofertas, Farmácia Popular e Delivery usam suas páginas existentes. Cupons não são apresentados enquanto não houver destino público funcional.

Arquivos: `home-shortcuts.tsx`, `features/products/home-shortcuts.ts` e testes, `home-page.tsx`, rota pública da home e fixture de QA. Header, animação original da logo, 128 bolhas do rodapé, produtos, pedidos e pagamentos mantêm seus contratos.

Validação local: 219 testes e 267 testes de segurança aprovados, lint, typecheck e build sem falhas. Revisão independente sem achados acionáveis. Preview com componentes e estilos reais conferido em 1280, 390 e 320 px: oito atalhos, rolagem restrita à faixa, setas até o limite e foco visível por teclado. Auditoria de produção sem vulnerabilidades; auditoria completa mantém cinco alertas altos nas dependências de desenvolvimento, sem alteração de dependências nesta entrega.

Publicação de `bd11dfa`: somente a aplicação foi reconstruída e recriada. App e PostgreSQL saudáveis, zero reinícios inesperados e `/api/health` com HTTP 200 e `ok: true`. No navegador público, desktop e celular exibem os oito atalhos sem o antigo bloco e sem overflow da página; Medicamentos abre `/categorias/medicamento` com dois produtos. Infantil, Vitaminas e suplementos, Dermo e Perfumaria usam a consulta pelo WhatsApp porque não há categoria publicada correspondente. A fonte da logo animada e as 128 bolhas foram conferidas na página. Capturas e relatório local em `outputs/home-shortcuts-2026-10-12/`, fora do versionamento.

## Atalho administrativo - 2026-09-23

O cabecalho publico inclui **Painel admin** para perfis autorizados, no celular e no desktop. Desde 2026-09-25, o atalho integra o cartao da conta no desktop, com carrinho e Sair alinhados ao centro; no celular ocupa a largura dos controles. Esse acabamento e exclusivo de ADMIN, MANAGER e STAFF: a conta comum permanece igual, sem atalho administrativo. A regra usa a permissao de `/admin/dashboard` no servidor e esta documentada em `docs/17-usuarios-e-acessos.md`. Preservar esse acesso visivel em futuras alteracoes do layout.

## Assinatura oficial dos banners - 2026-09-21

Home, perfumaria, paginas institucionais, Farmacia Popular e Delivery usam `BrandSignature`. Cabecalho exibe permanentemente a logo completa, substituindo fases de animacao com cruz isolada. Rodape reutiliza o mesmo asset leve. Regra e evidencia: `docs/23-identidade-visual-wimifarma.md`.

## Delivery com pessoas e consulta de CEP - 2026-09-21

`/delivery` recebe cena residencial ilustrativa, catalogo/WhatsApp em destaque, consulta de CEP reutilizada, etapas do pedido e FAQ acessivel. Sem placeholders administrativos ou horarios inventados. Imagem WebP de 122.176 bytes; contrato, prompt e verificacao em `docs/22-delivery-visual.md`.

## O Que Esta Parte Faz

Documenta a experiencia visual atual do site publico e os cuidados ao alterar layout principal.

## Arquivos Envolvidos

- `src/components/site/home-page.tsx`
- `src/components/site/hero-product-stage.tsx` e `.module.css`
- `src/components/site/site-header.tsx`
- `src/components/site/announcement-bar.tsx`
- `src/components/site/announcement-bar.module.css`
- `scripts/announcement-bar-audit.mjs`
- `src/components/site/perfumery-carousel.tsx`
- `src/components/site/perfumery-carousel.module.css`
- `scripts/perfumery-carousel-audit.mjs`
- `src/components/site/site-search.tsx`
- `src/components/site/site-nav.tsx`
- `src/components/site/site-footer.tsx`
- `src/components/site/floating-whatsapp.tsx`
- `src/components/site/page-hero.tsx`
- `src/components/site/customer-auth-page.tsx`
- `src/app/globals.css`
- `public/brand/logo-wimifarma.svg`
- `public/brand/logo-animada.svg`
- `public/brand/farmacia-popular.webp`
- `public/brand/delivery-truck.gif`
- `public/brand/delivery-truck.png`
- `public/brand/maps-pin-icon.svg`
- `public/banners/products/*.webp`, `nivea-care.webp` e `rexona-care.webp`
- `public/favicon.svg`
- `src/app/icon.svg`

## Estado Atual

- Header fixo com faixa de avisos de 40 px: frete gratis em Ivate-PR a partir de R$ 99,90, Farmacia Popular e cashback em produtos selecionados. `AnnouncementBar` alterna automaticamente a cada sete segundos, sem setas, indicadores clicaveis ou botao de pausa. Caminhao com estrada em movimento, pulso de saude e presente com moedas diferenciam os tres temas. Links abrem entrega, programa e Minha Conta. Foco, ponteiro e aba oculta pausam temporariamente, com retomada automatica; movimento reduzido mantem o aviso estatico. A faixa principal e dividida: logo animada e selo Farmacia Popular ficam no bloco escuro com termino curvo vermelho, enquanto busca e acoes ficam sobre fundo claro com decoracao botanica discreta, sem bloquear leitura ou cliques.
- A busca do header consulta produtos publicados do banco com atraso curto durante a digitacao. O autocomplete mostra foto pública permitida, nome, preço e princípio ativo. Enter e Encontrar abrem `/busca?q=...`, inclusive durante carregamento ou sem resultados; clicar em uma sugestão abre o produto. O rodapé do autocomplete também oferece todos os resultados. Não há abertura automática de WhatsApp.
- Sugestoes da busca ficam acima da navegacao e do conteudo. Apenas a decoracao botanica possui recorte; a faixa de controles permite transbordamento. O dialogo mobile usa portal no `body` para nao ficar limitado pelo `backdrop-filter` do header e fecha ao passar para o breakpoint desktop, restaurando a rolagem.
- No celular, um botao de busca abre um dialogo de tela cheia com campo e resultados. Em larguras pequenas, a logo reduz de forma responsiva e os quatro controles de carrinho, conta, saida e busca permanecem visiveis com alvo de toque de 44 px.
- Menu principal destaca a rota ativa em telas largas para deixar claro em qual aba o usuario esta.
- Quando ha sessao, o header troca `Login / Cadastrar` por foto/nome abreviado da conta e um botao `Sair`. Perfis internos usam os rotulos curtos `Admin`, `Gerente` ou `Equipe`; clientes exibem apenas o primeiro nome, mantendo o nome completo na dica e no rotulo acessivel. No desktop, localizacao, WhatsApp, carrinho, conta e saida permanecem centralizados verticalmente na mesma linha.
- O nome da conta no header abre `/minha-conta`, que redireciona perfis internos para o painel administrativo.
- `/minha-conta` usa abas para usuario, senha e cashback; dados de entrega ficam junto com usuario em um unico formulario.
- Banner principal: tres campanhas com quatro embalagens reais por composicao. Dove, NIVEA e Rexona em cuidados/perfumaria; Huggies e Johnson’s na linha infantil. `HeroProductStage` monta fotos independentes em HTML/CSS, preserva rotulos e recorta apenas margens vazias dos frascos. No desktop, texto e fotos ocupam colunas; no celular, as embalagens aparecem acima do texto. Controles de anterior, proximo, pausa e indicadores permanecem; swipe horizontal nao captura rolagem vertical. Foco, ponteiro, movimento reduzido, aba oculta e saida da area visivel interrompem a rotacao automatica.
- Campanha de avaliacao usa `Sua opinião vale mais.` e CTA `Compartilhar minha experiência`. O 1% aparece como beneficio secundario, com compra concluida/paga, primeira avaliacao por produto elegivel, base de uma unidade, qualquer nota e link `Como funciona`. `/cashback` segue a mesma comunicacao; contrato financeiro preservado.
- As oito fotos distintas somam 159.488 bytes em WebP. Somente as quatro da campanha ativa sao montadas; a primeira recebe prioridade. As duas primeiras campanhas compartilham as mesmas URLs e cache. `sizes` responsivo e qualidade 84 no Next Image; sem ampliar fontes pequenas nem gerar marcas por IA. Proveniencia em `13-assets-institucionais.md`. As artes sem marca `hero-*-v2.webp` ficam apenas como historico, fora da renderizacao.
- A home começa pelos atalhos circulares, seguidos pelo carrossel de campanhas. Entre ele e a faixa de campanhas aparece a vitrine `Melhores ofertas`, com cabecalho direto, CTA para WhatsApp, chips de campanha e carrossel responsivo com 10 espacos de produto. Os cards seguem um unico padrao branco de e-commerce, com selo promocional, imagem centralizada, nome, avaliacao real ou estado `Novo`, marca, preco, economia e acao circular. O desktop exibe cinco cards por vez e avanca em grupos de cinco por seta ou arraste; telas menores adaptam a quantidade visivel e preservam o gesto de toque. O cabecalho nao exibe contadores de ofertas ativas ou vagas nem texto descritivo.
- Categorias e serviços aparecem nos atalhos circulares; os 10 lugares da vitrine continuam alimentados pelo banco e ordenados manualmente em `/admin/ofertas`.
- Depois da vitrine, a home exibe um carrossel responsivo com ate 10 avaliacoes publicadas de compras verificadas. Cada depoimento mostra nota real, comentario, nome publico abreviado e link para o produto; quando nao ha registros, aparece somente o estado vazio transparente.
- O link `Ofertas` nao aparece no menu principal enquanto a home estiver focada em anuncio.
- Fundo usa efeito suave tipo nuvens/farmacia para nao ficar totalmente branco.
- A fonte Barlow e servida localmente pelo `next/font`, sem folha externa bloqueando a primeira pintura. O hero e a vitrine `Melhores ofertas` sao renderizados imediatamente; a primeira campanha recebe prioridade e as demais usam carregamento otimizado pelo `next/image`.
- Botao flutuante de WhatsApp fica no canto inferior direito, com tamanho reduzido no celular, e nao aparece nas telas de login ou Minha Conta para nao cobrir formularios.
- Miauby aparece acima do WhatsApp no desktop e no celular com avatar WebP transparente proprio. Ao clicar, abre um painel de conversa responsivo com perguntas rapidas, mensagens, carregamento, produtos relacionados e atalho para cada item, sem bloquear a rolagem da pagina.
- Login/cadastro usa dois blocos: entrar e cadastrar.
- Botoes Google de login/cadastro redirecionam sem trocar o texto para estado de carregamento.
- Cadastro comum inclui telefone e cria conta de cliente.
- O selo superior da tela de login foi removido para deixar o titulo direto.
- A logo do header usa o SVG vetorial animado e sem fundo em `public/brand/logo-animada.svg` sobre o bloco escuro curvo. A animacao roda em ciclo continuo, preserva a proporcao completa em diferentes larguras e o favicon permanece independente. A decoracao clara usa `public/brand/header-botanico.webp` como imagem puramente visual, com baixa opacidade e sem capturar interacoes.
- Paginas `Sobre` e `Contato` usam `InstitutionalHero`, com fotografias diferentes, texto em HTML e respiro abaixo do header fixo. No celular, foto e texto ficam empilhados; no desktop, a composicao ocupa toda a faixa, sem painel flutuante. As fotos sao identificadas como ilustrativas; origem e licenca em `docs/13-assets-institucionais.md`.
- Em `Contato`, WhatsApp, localizacao e e-mail sao cartoes inteiros clicaveis, com foco visivel e indicacao do destino. Perguntas frequentes usam `details/summary` nativos, acessiveis por teclado e sem JavaScript adicional. A faixa de entrega preserva a confirmacao humana e a cobertura atual.
- Em `Sobre`, a identidade local abre a pagina, seguida pelo endereco clicavel, principios de atendimento sem numeros ou afirmacoes inventadas e cartoes para ofertas, Farmacia Popular e delivery. Interacoes de movimento respeitam `prefers-reduced-motion`.
- `Farmacia Popular` usa hero proprio com fotografia ilustrativa de atendimento, selo oficial, orientacoes, checklist e CTA para WhatsApp sem prometer disponibilidade automatica; a arte `public/banners/farmacia-popular-atendimento.webp` tem `1200 x 720 px`, 42 KB e texto comercial separado em HTML.
- Rodape usa a logo, navegacao, dados de atendimento e WhatsApp, com texto branco de alto contraste sobre o vermelho, sem texto de plataforma em construcao nem nome repetido ao lado da logo.
- Endereco exibido no site vem de `src/lib/site.ts`: Avenida Minas Gerais, 2263 - Ivate, Parana. O link de Maps usa URL curta do Google Maps, abre em nova aba sem mapa embutido e usa o icone transparente `public/brand/maps-pin-icon.svg`.
- Faixa inferior de campanhas usa cartoes HTML com icones e links de consulta ao WhatsApp principal; `public/banners/faixa-home.webp` permanece somente nos metadados de compartilhamento.
- Metadata global inclui Open Graph e Twitter Card usando a faixa de campanhas como imagem de compartilhamento.
- Favicon e `src/app/icon.svg` usam SVG vetorial compacto do simbolo vermelho/branco da Wimifarma, sem imagem base64 embutida.
- O topo do painel administrativo possui botao `Home` para voltar ao site publico, alem de WhatsApp e sair; no celular, titulo e acoes ocupam linhas separadas para evitar cortes. O endpoint tecnico `/api/health` permanece disponivel sem aparecer como acao principal.
- O dashboard administrativo separa metricas comerciais em uma grade compacta e deixa o status operacional em card proprio para evitar linhas vazias e melhorar leitura.
- `Produtos / Catalogo` prioriza a lista em largura total, usa indicadores compactos, abre o cadastro em modal e oferece acoes diretas para editar ou destacar cada produto. A organizacao das 10 posicoes continua em `/admin/ofertas`.
- Cadastro e edição usam modal de até 1152 px, com cabeçalho e ações permanentes; somente o corpo do formulário rola. Identificação, preço/publicação e descrição ficam ao lado de fotos/prévia SEO no desktop e em sequência no celular. Peso e medidas ocupam a largura disponível abaixo, com as mesmas permissões e revisão. Todos os campos ficam acessíveis sem etapas adicionais.

## Regras de Design

- Vermelho e cor principal.
- Branco e base visual.
- Verde deve apoiar WhatsApp e Farmacia Popular.
- Evitar excesso de informacao sobre o video; a vitrine deve ter um unico CTA principal para WhatsApp.
- Logo nao deve ficar cortada nem presa em bolha desnecessaria.
- Logo animada do header deve ficar alinhada ao canto esquerdo da janela, em fundo escuro integrado ao GIF, com escala suficiente para mostrar toda a animacao sem cortar topo ou base, e nao deve invadir a busca.
- Selo Farmacia Popular do header deve ficar ao lado da logo animada apenas em telas `xl` ou maiores, sem cobrir a animacao nem apertar a busca. Em larguras intermediarias, WhatsApp, login e saida usam versoes compactas com icone.
- Layout deve ser responsivo e nao gerar barra lateral horizontal.
- Paginas internas precisam iniciar abaixo do header fixo para evitar conteudo cortado no primeiro viewport.
- Animacoes devem ser leves e nao prejudicar performance.
- A rolagem vertical do site publico usa o comportamento nativo do navegador. Animacoes visuais nao podem interceptar roda do mouse, trackpad, teclas ou gesto de toque.
- A faixa superior deve manter 40 px em todos os breakpoints, sem deslocar o conteudo nem interferir no autocomplete. No celular, duas linhas preservam titulo, condicao e valor da oferta. Grafismos sao decorativos e nao interceptam cliques; a entrada do texto termina mesmo durante pausa do movimento. O anuncio de R$ 99,90 esta limitado a Ivate-PR: nao configura frete nacional nem cria cobranca abaixo desse valor, e o checkout local continua com a regra existente. Cashback remete aos produtos habilitados, sem prometer percentual universal ou resgate online.
- Para as composicoes atuais do anuncio principal, usar fotos `3:2` de pelo menos `1536 x 1024 px`; manter textos e controles fora da imagem e conferir densidades de tela 1x e 3x.
- Manter informacoes importantes do anuncio no centro da arte para evitar cortes em telas menores.

## Decisoes Tecnicas

- Framer Motion usado para entradas suaves.
- `lucide-react` usado para icones.
- Produtos selecionados usam a imagem WebP real do catalogo com `object-contain`, centralizada sobre fundo branco neutro para que fotos ja tratadas nao formem um quadrado branco sobre a cor da oferta; apenas as posicoes ainda vazias mantem o visual CSS colorido reservado.
- A vitrine `Melhores ofertas` segue padrao de e-commerce farmaceutico com selo promocional, imagem limpa, nome, marca, avaliacao real, preco e economia. A ordem vem de `Product.featuredPosition`; produtos elegiveis seguem para o carrinho e itens restritos continuam no atendimento pelo WhatsApp.
- Depois das melhores ofertas, a home usa `PerfumeryCarousel` com campanhas Dove, Rexona e NIVEA, seguido pelo carrossel de medicamentos com dez posicoes independentes. A faixa de perfumaria tem setas, indicadores, pausa e arraste horizontal; alterna a cada sete segundos somente quando visivel. Foco e navegacao manual pausam ate nova acao no controle; ponteiro e aba oculta suspendem temporariamente; movimento reduzido desativa a rotacao. Imagens locais, textos HTML e consulta WhatsApp especifica por marca, sem precos ou disponibilidade presumidos. O gesto horizontal nao abre o link e a rolagem vertical continua liberada no toque.
- No segundo carrossel de produtos, os medicamentos publicados ocupam as primeiras posicoes; as restantes mostram cards explicitos de consulta pelo WhatsApp, sem produtos, precos ou estoque ficticios. A faixa mostra cinco cards no desktop e parte do proximo no celular. Setas avancam a quantidade visivel; o arraste funciona inclusive sobre foto e nome, com clique bloqueado apenas depois do gesto. O toque nativo, as setas do teclado e a preferencia por movimento reduzido sao preservados.
- O cadastro de produtos oferece editor responsivo em modal para enquadramento quadrado, zoom e rotacao. No celular, a area de recorte preserva espaco para os controles e os botoes ocupam a largura disponivel.
- As tres imagens do hero sao WebP leves e servidas pelo `next/image`; a primeira recebe prioridade e as demais permanecem preparadas para a proxima troca sem baixar video ou audio.
- A pagina individual usa composicao de e-commerce farmaceutico: breadcrumb, foto real ampliavel sem fabricar miniaturas, informacoes comerciais, seletor de quantidade, acoes `Adicionar ao carrinho` e `Comprar agora`, entrega/retirada, detalhes em secoes expansivas, avaliacoes verificadas e produtos relacionados.
- O painel do produto usa preco por unidade, economia, cashback estimado e total atualizado por quantidade. A galeria tem ampliacao de 100% a 200%, rolagem centralizada, suporte a teclado e estado para imagem ausente/quebrada. Medicamentos sem foto pública usam ilustração institucional transparente, identificada como ilustrativa; fotos reais continuam prioritárias e outros tipos mantêm o ícone neutro. Contrato em `68-busca-e-galeria.md`. Compartilhamento usa o recurso nativo ou copia a URL sem parametros; cada produto reinicia seus controles. Ausencia de nota aparece como `Sem avaliacoes`, sem inferir novidade. Atalhos para detalhes, entrega, avaliacoes e relacionados respeitam o header fixo.
- Os controles de quantidade e compra usam cursor de acao, resposta visual de `hover`/clique, foco visivel e movimentos curtos que respeitam `prefers-reduced-motion`; estados desabilitados preservam o cursor de bloqueio.
- `Comprar agora` adiciona a quantidade selecionada ao carrinho e segue ao checkout somente para produtos comuns elegiveis. Receita, Farmacia Popular e falta de estoque continuam no atendimento por WhatsApp.
- O checkout reúne dados, entrega e pagamento em uma página: três colunas de mesma largura e altura no desktop, duas no tablet e uma no celular. Cabeçalhos numerados, orientação curta, miniaturas da cesta e seleção com legenda organizam a leitura. Endereço compacto em quatro linhas; ordem visual e de teclado iguais, sem seletores CSS por posição. Resumo claro destaca subtotal enquanto o frete não está definido e total após entrega válida. Indisponibilidade de transportadora ou atendimento farmacêutico aparecem antes de oferecer cotação, com retirada/WhatsApp. A barra de frete grátis considera produtos após cashback, sem prometer cobertura. Cartão usa campos seguros do Mercado Pago e Pix aparece inline com prazo original de duas horas. Controles mantêm foco visível e movimento reduzido. Contrato em `32-checkout-e-confianca.md`.
- Depois que o painel principal de compra sai da tela, uma barra fixa resume produto, preco, quantidade e compra direta. O WhatsApp flutuante sobe na pagina de produto para nao cobrir essa barra.
- No mobile, compra e frete ficam em uma coluna, controles mantem alvos de toque amplos e os relacionados usam rolagem horizontal com snap e indicio do proximo item. No desktop, imagem e painel comercial dividem a primeira dobra e o carrossel mostra ate cinco produtos por vez, entre no maximo dez correlatos reais.
- Estrelas so representam avaliacoes reais vinculadas a compras concluidas. A home e a pagina de produto nao usam depoimentos inventados, seeds promocionais nem notas demonstrativas; sem registros, exibem o estado vazio correspondente.

## Riscos ao Alterar

- A faixa inferior de campanhas usa tres cartoes HTML responsivos, com os temas Dia do Generico Barato, Dia do Idoso e Dia do Bebe; nao renderiza mais o texto reduzido da imagem `faixa-home.webp`. Os contatos continuam consultivos, sem datas ou descontos novos.
- A perfumaria usa foto acima do texto no celular. `sizes` da composicao Dove considera a largura total no desktop e o recorte no celular; Rexona/NIVEA seguem embalagens existentes, sem gerar rotulos ou produtos de marca.
- Evidencias da revisao de 2026-09-19 em `19-produtos-e-campanhas.md`.

- O header fixo pode cobrir conteudo se paddings forem alterados.
- Video vertical pode criar laterais vazias; usar composicao visual sem cortar conteudo importante.
- `scale` da logo pode cortar se o container mudar.
- Elementos muito largos podem criar scroll horizontal.
- Cards brancos demais perdem contraste.

## Pendencias

- Ajustar dados reais de telefone e horarios.
- Trocar o nome antigo do estabelecimento no Google Maps quando o perfil for atualizado.
- Definir imagens/fotos reais de produtos quando houver catalogo.
- Testar visual em mobile real.
- Criar fluxo visual final para paginas secundarias.
- Validar periodicamente os termos e principios ativos usados para correlacao conforme o catalogo real crescer.

## Evolucao

### Minha conta

Painel privado renovado com identidade oficial, menu lateral no desktop e navegação horizontal no celular. Visão geral reúne cashback, pedidos em andamento e atalhos. Histórico mostra os itens e valores da compra, detalhes expansíveis e etapas reais de entrega/retirada. Contrato, API e validação em `docs/24-minha-conta-pedidos.md`.

Quando o admin de temas existir, documentar:

- quais textos podem ser alterados;
- quais banners/videos sao editaveis;
- onde salvar assets;
- como validar tamanho e formato de imagens/videos.

### Cabecalho compacto durante a rolagem

Em 26/10/2026, o lojista solicitou mais espaço de leitura durante a navegação. O cabeçalho completo permanece no topo; após 72 px de rolagem, a campanha e o menu recolhem. A faixa principal mantém a marca oficial, busca, carrinho, login/conta, Sair e o atalho textual Painel admin para os mesmos perfis autorizados. A logo reduz suas dimensões sem trocar o SVG, reiniciar sua montagem ou alterar o fallback estático. Os saldos do cabeçalho deixam de ocupar espaço no modo compacto, mas continuam disponíveis na conta.

Refinamento de proporção no mesmo dia: o link compacto continua com 44 px de altura, mas o canvas integral da logo passa a 56 px a partir de 768 px e 68 px a partir de 1024 px, centralizado verticalmente e com `object-fit: contain`. O SVG original possui área transparente vertical: restringi-lo aos 44 px reduzia a largura visível do canvas para 112,64 px em um espaço de 176 px. O canvas independente aproveita a largura do link sem deformar, cortar ou substituir a animação; não aumenta a altura da faixa. Em telas menores, a proporção existente é mantida. O espaço entre logo e Farmácia Popular recolhe junto, evitando sobra na área preta. Largura, altura, canvas, espaçamento e faixas usam 280 ms com `cubic-bezier(0.22, 1, 0.36, 1)`, com os mesmos limites de rolagem e redução de movimento.

Alinhamento móvel das sessões administrativas: abaixo de 768 px, a lupa reserva a mesma altura do atalho Painel admin (32 px) e do espaçamento de 4 px da coluna vizinha. Assim seu centro acompanha carrinho, conta e Sair, tanto no topo quanto no modo compacto, inclusive em 640–767 px quando a logo normal é mais alta. São apenas dois marcadores de layout e uma margem de 36 px; não há mudança de ordem, permissões, componentes montados ou altura do header. Visitantes, clientes comuns e desktop conservam seu alinhamento anterior. A regressão mede os quatro centros, alvos de 44 px, separação do atalho administrativo, ausência de overflow e abertura/foco da busca em sete larguras de 320 a 767 px. As medições de transição usam o relógio das animações CSS para verificar pontos intermediários sem depender da carga de CPU da máquina.

O canvas normal passa de altura percentual para alturas explícitas equivalentes (52 px no mobile e 96 px a partir de 640 px); o compacto continua em 44/56/68 px. Isso elimina a interpolação sobre a altura do link que também estava encolhendo: o teste determinístico revelou uma redução transitória para cerca de 167 px antes de estabilizar em 174 px. Os estados finais e a arte permanecem iguais; a escala percorre o intervalo entre eles sem essa oscilação. São 14 cenários de UI aprovados após o refinamento.

No botão compacto da conta móvel, o padding horizontal fica em 4 px para dar espaço ao nome Admin também com a fonte de fallback, preservando o alvo de 44 px. A regressão verifica que o texto cabe sem reticências nas sete larguras.

Ao voltar aos primeiros 8 px, o cabeçalho restaura o tamanho original. A faixa entre os dois limites preserva o estado para evitar oscilações. A compactação aguarda a saída do foco de qualquer controle que seria ocultado, incluindo Farmácia Popular e Maps. As faixas recolhidas usam `inert` e `aria-hidden`, sem recortar o autocomplete da busca. A preferência de movimento reduzido elimina a transição perceptível.

`SiteHeader` continua no servidor, incluindo autenticação, permissões e saída. Somente `SiteHeaderShell` observa a rolagem com listener passivo e `requestAnimationFrame`. Os elementos e provedores permanecem montados, preservando a busca e os recursos de saldo compartilhados. A limpeza remove listeners, observador e a propriedade CSS aplicada à raiz.

Um `ResizeObserver` publica a altura efetiva mais 16 px em `--site-header-offset`. Filtros do catálogo e busca, resumo do carrinho, painel da conta e compra do produto usam esse deslocamento, com os valores anteriores como fallback sem JavaScript. Os paddings iniciais das páginas permanecem intactos para evitar deslocamento do conteúdo ao recolher o header.

Validação direcionada do refinamento: 13 cenários hidratados incluem 27 combinações da logo (320/360/390/640/768/1024/1280/1536/1920 px, visitante/cliente/ADMIN), centralização e proporção, preservação da rolagem e do texto buscado, retorno ao topo, filtros, foco, autocomplete, Sair/Painel admin, ausência de overflow, movimento reduzido e descarte dos recursos. A transição percorre tamanhos intermediários da logo e da área preta nos dois sentidos. Revisão independente aprovada; os 70 cenários de acesso também são preservados. As auditorias completa e de produção mantêm somente o alerta moderado preexistente de `fast-uri`, sem high/critical. A publicação segue o procedimento de atualizar somente o app, com a imagem anterior preservada e conferência pública após a troca.
