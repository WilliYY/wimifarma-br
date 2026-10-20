# 10 - Layout e Experiencia

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
