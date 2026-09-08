# 10 - Layout e Experiencia

## O Que Esta Parte Faz

Documenta a experiencia visual atual do site publico e os cuidados ao alterar layout principal.

## Arquivos Envolvidos

- `src/components/site/home-page.tsx`
- `src/components/site/site-header.tsx`
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
- `public/banners/faixa-home.webp`
- `public/banners/hero-medicamentos.webp`
- `public/banners/hero-perfumaria.webp`
- `public/banners/hero-mae-bebe.webp`
- `public/favicon.svg`
- `src/app/icon.svg`

## Estado Atual

- Header fixo com faixa vermelha de frete gratis e caminhaozinho animado. A faixa principal e dividida: logo animada e selo Farmacia Popular ficam no bloco escuro com termino curvo vermelho, enquanto busca e acoes ficam sobre fundo claro com decoracao botanica discreta, sem bloquear leitura ou cliques.
- A busca do header consulta produtos publicados do banco com atraso curto durante a digitacao. O autocomplete mostra foto, nome, preco normal/promocional, principio ativo e correlatos; setas mudam a selecao e Enter abre `/produto/[slug]`. Sem resultado, Enter mantem a consulta pelo WhatsApp.
- No celular, um botao de busca abre um dialogo de tela cheia com campo e resultados. Em larguras pequenas, a logo reduz de forma responsiva e os quatro controles de carrinho, conta, saida e busca permanecem visiveis com alvo de toque de 44 px.
- Menu principal destaca a rota ativa em telas largas para deixar claro em qual aba o usuario esta.
- Quando ha sessao, o header troca `Login / Cadastrar` por foto/nome abreviado da conta e um botao `Sair`. Perfis internos usam os rotulos curtos `Admin`, `Gerente` ou `Equipe`; clientes exibem apenas o primeiro nome, mantendo o nome completo na dica e no rotulo acessivel. No desktop, localizacao, WhatsApp, carrinho, conta e saida permanecem centralizados verticalmente na mesma linha.
- O nome da conta no header abre `/minha-conta`, que redireciona perfis internos para o painel administrativo.
- `/minha-conta` usa abas para usuario, senha e cashback; dados de entrega ficam junto com usuario em um unico formulario.
- Banner principal atual e um carrossel com tres campanhas fotograficas proprias: medicamentos e cuidado diario, perfumaria e autocuidado, e mae e bebe. As imagens mostram pessoas, mantem area segura para texto em HTML e usam controles de anterior, proximo, pausa e indicadores; a troca automatica para durante interacao e respeita `prefers-reduced-motion`. Em telas a partir de `lg`, o banner usa proporcao fixa `8:3`, chegando a `1280 x 480 px`; no celular, ganha altura e recorte direcionado para preservar pessoa, texto, CTA e controles.
- As artes do banner principal usam `1920 x 720 px` em WebP, area livre a esquerda e peso entre 50 e 70 KB. Futuras campanhas devem manter a area segura, evitar texto gravado na imagem e preparar `1080 x 1350 px` em WebP somente quando o recorte responsivo nao preservar o assunto.
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
- Paginas `Sobre` e `Contato` usam hero institucional com selo contextual e respiro abaixo do header fixo. Em `Contato`, WhatsApp, localizacao e e-mail sao cartoes inteiros clicaveis, com foco visivel e indicacao clara do destino; abaixo, o fluxo em tres passos explica como agilizar o atendimento sem prometer disponibilidade. Em `Sobre`, a identidade local da Wimifarma abre a pagina, os principios de atendimento aparecem sem numeros ou afirmacoes inventadas e os cartoes de servicos levam para ofertas, Farmacia Popular e delivery. `Farmacia Popular` usa hero proprio com fotografia ilustrativa de atendimento, selo oficial, orientacoes, checklist e CTA para WhatsApp sem prometer disponibilidade automatica; a arte `public/banners/farmacia-popular-atendimento.webp` tem `1200 x 720 px`, 42 KB e texto comercial separado em HTML.
- Rodape usa a logo, navegacao, dados de atendimento e WhatsApp, com texto branco de alto contraste sobre o vermelho, sem texto de plataforma em construcao nem nome repetido ao lado da logo.
- Endereco exibido no site vem de `src/lib/site.ts`: Avenida Minas Gerais, 2263 - Ivate, Parana. O link de Maps usa URL curta do Google Maps, abre em nova aba sem mapa embutido e usa o icone transparente `public/brand/maps-pin-icon.svg`.
- Faixa de campanhas da home usa `public/banners/faixa-home.webp` e o clique abre o WhatsApp principal.
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
- O caminhaozinho da faixa superior deve manter fundo transparente, andar em uma pista curta e nao aumentar demais a altura do header.
- Para o anuncio principal da home, dimensao recomendada em desktop: 1920x840 px, proporcao 16:7. Se houver arte mobile separada, usar 1080x1350 px, proporcao 4:5.
- Manter informacoes importantes do anuncio no centro da arte para evitar cortes em telas menores.

## Decisoes Tecnicas

- Framer Motion usado para entradas suaves.
- `lucide-react` usado para icones.
- Produtos selecionados usam a imagem WebP real do catalogo com `object-contain`, centralizada sobre fundo branco neutro para que fotos ja tratadas nao formem um quadrado branco sobre a cor da oferta; apenas as posicoes ainda vazias mantem o visual CSS colorido reservado.
- A vitrine `Melhores ofertas` segue padrao de e-commerce farmaceutico com selo promocional, imagem limpa, nome, marca, avaliacao real, preco e economia. A ordem vem de `Product.featuredPosition`; produtos elegiveis seguem para o carrinho e itens restritos continuam no atendimento pelo WhatsApp.
- Depois das melhores ofertas, a home usa uma faixa Dove curta como divisor visual e um segundo carrossel com ate dez medicamentos publicados. Essa vitrine secundaria vem do catalogo real, aceita arraste e setas, mostra cinco cards no desktop e deixa parte do proximo card visivel no celular.
- O cadastro de produtos oferece editor responsivo em modal para enquadramento quadrado, zoom e rotacao. No celular, a area de recorte preserva espaco para os controles e os botoes ocupam a largura disponivel.
- As tres imagens do hero sao WebP leves e servidas pelo `next/image`; a primeira recebe prioridade e as demais permanecem preparadas para a proxima troca sem baixar video ou audio.
- A pagina individual usa composicao de e-commerce farmaceutico: breadcrumb, foto real ampliavel sem fabricar miniaturas, informacoes comerciais, seletor de quantidade, acoes `Adicionar ao carrinho` e `Comprar agora`, entrega/retirada, detalhes em secoes expansivas, avaliacoes verificadas e produtos relacionados.
- O painel principal do produto usa selo de novidade quando ainda nao ha nota, hierarquia reforcada de preco e compra, faixa de retirada/confirmacao/atendimento e um estado de avaliacoes convidativo. Depoimentos e estrelas continuam exclusivos de compras concluidas; nenhum exemplo promocional aparece como opiniao real.
- Os controles de quantidade e compra usam cursor de acao, resposta visual de `hover`/clique, foco visivel e movimentos curtos que respeitam `prefers-reduced-motion`; estados desabilitados preservam o cursor de bloqueio.
- `Comprar agora` adiciona a quantidade selecionada ao carrinho e segue ao checkout somente para produtos comuns elegiveis. Receita, Farmacia Popular e falta de estoque continuam no atendimento por WhatsApp.
- O checkout usa progresso conectado em quatro etapas, cartoes de entrega/pagamento com selecao clara, formulario de endereco responsivo com autofill controlado e resumo contextual fixo no desktop. As transicoes sao curtas, os controles mantem foco visivel e nenhuma etapa sugere cobranca online.
- Depois que o painel principal de compra sai da tela, uma barra fixa resume produto, preco, quantidade e compra direta. O WhatsApp flutuante sobe na pagina de produto para nao cobrir essa barra.
- No mobile, compra e frete ficam em uma coluna, controles mantem alvos de toque amplos e os relacionados usam rolagem horizontal com snap e indicio do proximo item. No desktop, imagem e painel comercial dividem a primeira dobra e o carrossel mostra ate cinco produtos por vez, entre no maximo dez correlatos reais.
- Estrelas so representam avaliacoes reais vinculadas a compras concluidas. A home e a pagina de produto nao usam depoimentos inventados, seeds promocionais nem notas demonstrativas; sem registros, exibem o estado vazio correspondente.

## Riscos ao Alterar

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

Quando o admin de temas existir, documentar:

- quais textos podem ser alterados;
- quais banners/videos sao editaveis;
- onde salvar assets;
- como validar tamanho e formato de imagens/videos.
