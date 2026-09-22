# 10 - Layout e Experiencia

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
- A busca do header consulta produtos publicados do banco com atraso curto durante a digitacao. O autocomplete mostra foto, nome, preco normal/promocional, principio ativo e correlatos; setas mudam a selecao e Enter abre `/produto/[slug]`. Sem resultado, Enter mantem a consulta pelo WhatsApp.
- Sugestoes da busca ficam acima da navegacao e do conteudo. Apenas a decoracao botanica possui recorte; a faixa de controles permite transbordamento. O dialogo mobile usa portal no `body` para nao ficar limitado pelo `backdrop-filter` do header e fecha ao passar para o breakpoint desktop, restaurando a rolagem.
- No celular, um botao de busca abre um dialogo de tela cheia com campo e resultados. Em larguras pequenas, a logo reduz de forma responsiva e os quatro controles de carrinho, conta, saida e busca permanecem visiveis com alvo de toque de 44 px.
- Menu principal destaca a rota ativa em telas largas para deixar claro em qual aba o usuario esta.
- Quando ha sessao, o header troca `Login / Cadastrar` por foto/nome abreviado da conta e um botao `Sair`. Perfis internos usam os rotulos curtos `Admin`, `Gerente` ou `Equipe`; clientes exibem apenas o primeiro nome, mantendo o nome completo na dica e no rotulo acessivel. No desktop, localizacao, WhatsApp, carrinho, conta e saida permanecem centralizados verticalmente na mesma linha.
- O nome da conta no header abre `/minha-conta`, que redireciona perfis internos para o painel administrativo.
- `/minha-conta` usa abas para usuario, senha e cashback; dados de entrega ficam junto com usuario em um unico formulario.
- Banner principal: tres campanhas com quatro embalagens reais por composicao. Dove, NIVEA e Rexona em cuidados/perfumaria; Huggies e Johnson’s na linha infantil. `HeroProductStage` monta fotos independentes em HTML/CSS, preserva rotulos e recorta apenas margens vazias dos frascos. No desktop, texto e fotos ocupam colunas; no celular, as embalagens aparecem acima do texto. Controles de anterior, proximo, pausa e indicadores permanecem; swipe horizontal nao captura rolagem vertical. Foco, ponteiro, movimento reduzido, aba oculta e saida da area visivel interrompem a rotacao automatica.
- Campanha de avaliacao usa `Sua opinião vale mais.` e CTA `Compartilhar minha experiência`. O 1% aparece como beneficio secundario, com compra concluida/paga, primeira avaliacao por produto elegivel, base de uma unidade, qualquer nota e link `Como funciona`. `/cashback` segue a mesma comunicacao; contrato financeiro preservado.
- As oito fotos distintas somam 159.488 bytes em WebP. Somente as quatro da campanha ativa sao montadas; a primeira recebe prioridade. As duas primeiras campanhas compartilham as mesmas URLs e cache. `sizes` responsivo e qualidade 84 no Next Image; sem ampliar fontes pequenas nem gerar marcas por IA. Proveniencia em `13-assets-institucionais.md`. As artes sem marca `hero-*-v2.webp` ficam apenas como historico, fora da renderizacao.
- Home esta temporariamente focada em anuncio: o primeiro bloco e o carrossel de campanhas; entre ele e a faixa de campanhas aparece a vitrine `Melhores ofertas`, com cabecalho direto, CTA para WhatsApp, chips de campanha e carrossel responsivo com 10 espacos de produto. Os cards seguem um unico padrao branco de e-commerce, com selo promocional, imagem centralizada, nome, avaliacao real ou estado `Novo`, marca, preco, economia e acao circular. O desktop exibe cinco cards por vez e avanca em grupos de cinco por seta ou arraste; telas menores adaptam a quantidade visivel e preservam o gesto de toque. O cabecalho nao exibe contadores de ofertas ativas ou vagas nem texto descritivo.
- Categorias em bolinhas nao aparecem na home nesta fase; os 10 lugares da vitrine sao alimentados pelo banco e ordenados manualmente em `/admin/ofertas`.
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
- O painel do produto usa preco por unidade, economia, cashback estimado e total atualizado por quantidade. A galeria tem ampliacao de 100% a 200%, rolagem centralizada, suporte a teclado e estado para imagem ausente/quebrada. Compartilhamento usa o recurso nativo ou copia a URL sem parametros; cada produto reinicia seus controles. Ausencia de nota aparece como `Sem avaliacoes`, sem inferir novidade. Atalhos para detalhes, entrega, avaliacoes e relacionados respeitam o header fixo.
- Os controles de quantidade e compra usam cursor de acao, resposta visual de `hover`/clique, foco visivel e movimentos curtos que respeitam `prefers-reduced-motion`; estados desabilitados preservam o cursor de bloqueio.
- `Comprar agora` adiciona a quantidade selecionada ao carrinho e segue ao checkout somente para produtos comuns elegiveis. Receita, Farmacia Popular e falta de estoque continuam no atendimento por WhatsApp.
- O checkout usa progresso conectado em quatro etapas, cartoes de entrega/pagamento com selecao clara, formulario de endereco responsivo com autofill controlado e resumo contextual fixo no desktop. As transicoes sao curtas, os controles mantem foco visivel e nenhuma etapa sugere cobranca online.
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
