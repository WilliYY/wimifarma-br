# 10 - Layout e Experiencia

## O Que Esta Parte Faz

Documenta a experiencia visual atual do site publico e os cuidados ao alterar layout principal.

## Arquivos Envolvidos

- `src/components/site/home-page.tsx`
- `src/components/site/site-header.tsx`
- `src/components/site/site-nav.tsx`
- `src/components/site/site-footer.tsx`
- `src/components/site/floating-whatsapp.tsx`
- `src/components/site/page-hero.tsx`
- `src/components/site/customer-auth-page.tsx`
- `src/app/globals.css`
- `public/brand/logo-wimifarma.svg`
- `public/brand/logo-animada.gif`
- `public/brand/farmacia-popular.webp`
- `public/brand/delivery-truck.gif`
- `public/brand/delivery-truck.png`
- `public/brand/maps-pin-icon.svg`
- `public/banners/faixa-home.webp`
- `public/favicon.svg`
- `src/app/icon.svg`
- `public/videos/thiago-cansado.mp4`
- `public/videos/thiago-poster.svg`

## Estado Atual

- Header fixo com faixa vermelha de frete gratis, caminhaozinho com deslocamento animado, faixa escura integrada a logo animada sem fundo ancorada no canto esquerdo, selo Farmacia Popular ao lado da logo em telas largas, busca, link de localizacao no Google Maps, botao WhatsApp verde com icone destacado, login/cadastrar e nav.
- Menu principal destaca a rota ativa em telas largas para deixar claro em qual aba o usuario esta.
- Quando ha sessao de cliente, o header troca `Login / Cadastrar` por foto/nome da conta Google e um botao `Sair`.
- O nome do cliente no header abre `/minha-conta`.
- `/minha-conta` usa abas para usuario, senha e cashback; dados de entrega ficam junto com usuario em um unico formulario.
- Banner principal atual e video da Wimifarma em uma vitrine responsiva com acabamento claro, chamada para WhatsApp, texto comercial sobre medicamentos e Farmacia Popular, poster de carregamento e controles integrados de pausar e som.
- Home esta temporariamente focada em anuncio: o primeiro bloco de conteudo ja e a vitrine com video; abaixo dela aparece a faixa de campanhas em `public/banners/faixa-home.webp`.
- Categorias em bolinhas, cards de medicamentos e vitrines de destaque nao aparecem na home nesta fase.
- O link `Ofertas` nao aparece no menu principal enquanto a home estiver focada em anuncio.
- Fundo usa efeito suave tipo nuvens/farmacia para nao ficar totalmente branco.
- Botao flutuante de WhatsApp fica no canto inferior direito.
- Miauby aparece como bolinha informativa acima do WhatsApp, mostrando recado de campanha, sem abrir caixa de conversa ao clicar.
- Login/cadastro usa dois blocos: entrar e cadastrar.
- Botoes Google de login/cadastro redirecionam sem trocar o texto para estado de carregamento.
- Cadastro comum inclui telefone e cria conta de cliente.
- O selo superior da tela de login foi removido para deixar o titulo direto.
- A logo do header usa o GIF animado sem fundo em `public/brand/logo-animada.gif` sobre faixa escura; o SVG da Wimifarma permanece disponivel para outros pontos e o favicon voltou para a versao anterior usada antes da troca visual.
- Paginas `Farmacia Popular`, `Sobre` e `Contato` usam hero com respiro abaixo do header fixo, cards informativos e CTAs para WhatsApp sem prometer disponibilidade automatica.
- Rodape usa a logo, navegacao, dados de atendimento e WhatsApp, sem texto de plataforma em construcao nem nome repetido ao lado da logo.
- Endereco exibido no site vem de `src/lib/site.ts`: Avenida Minas Gerais, 2263 - Ivate, Parana. O link de Maps usa URL curta do Google Maps, abre em nova aba sem mapa embutido e usa o icone transparente `public/brand/maps-pin-icon.svg`.
- Faixa de campanhas da home usa `public/banners/faixa-home.webp` e o clique abre o WhatsApp principal.
- Metadata global inclui Open Graph e Twitter Card usando a faixa de campanhas como imagem de compartilhamento.
- Favicon e `src/app/icon.svg` usam SVG vetorial compacto do simbolo vermelho/branco da Wimifarma, sem imagem base64 embutida.
- O topo do painel administrativo possui botao `Home` para voltar ao site publico, alem de Health, WhatsApp e sair.

## Regras de Design

- Vermelho e cor principal.
- Branco e base visual.
- Verde deve apoiar WhatsApp e Farmacia Popular.
- Evitar excesso de informacao sobre o video; a vitrine deve ter um unico CTA principal para WhatsApp.
- Logo nao deve ficar cortada nem presa em bolha desnecessaria.
- Logo animada do header deve ficar alinhada ao canto esquerdo da janela, em fundo escuro integrado ao GIF, com escala suficiente para mostrar toda a animacao sem cortar topo ou base, e nao deve invadir a busca.
- Selo Farmacia Popular do header deve ficar ao lado da logo animada apenas quando houver espaco suficiente, sem cobrir a animacao nem apertar a busca.
- Layout deve ser responsivo e nao gerar barra lateral horizontal.
- Paginas internas precisam iniciar abaixo do header fixo para evitar conteudo cortado no primeiro viewport.
- Animacoes devem ser leves e nao prejudicar performance.
- O caminhaozinho da faixa superior deve manter fundo transparente, andar em uma pista curta e nao aumentar demais a altura do header.
- Para o anuncio principal da home, dimensao recomendada em desktop: 1920x840 px, proporcao 16:7. Se houver arte mobile separada, usar 1080x1350 px, proporcao 4:5.
- Manter informacoes importantes do anuncio no centro da arte para evitar cortes em telas menores.

## Decisoes Tecnicas

- Framer Motion usado para entradas suaves.
- `lucide-react` usado para icones.
- Produtos demonstrativos usam visuais CSS, nao fotos reais.
- Video fica em `public/videos/thiago-cansado.mp4`, roda em loop e usa `public/videos/thiago-poster.svg` para evitar tela escura antes do carregamento.
- O video principal foi recomprimido de forma conservadora, mantendo resolucao e audio, para reduzir peso sem alterar a composicao visual.

## Riscos ao Alterar

- O header fixo pode cobrir conteudo se paddings forem alterados.
- Video vertical pode criar laterais vazias; usar composicao visual sem cortar conteudo importante.
- `scale` da logo pode cortar se o container mudar.
- Elementos muito largos podem criar scroll horizontal.
- Cards brancos demais perdem contraste.

## Pendencias

- Ajustar dados reais de telefone e horarios.
- Trocar o nome antigo do estabelecimento no Google Maps quando o perfil for atualizado.
- Definir arte real do anuncio principal da home.
- Definir imagens/fotos reais de produtos quando houver catalogo.
- Testar visual em mobile real.
- Criar fluxo visual final para paginas secundarias.
- Integrar busca com dados reais.

## Evolucao

Quando o admin de temas existir, documentar:

- quais textos podem ser alterados;
- quais banners/videos sao editaveis;
- onde salvar assets;
- como validar tamanho e formato de imagens/videos.
