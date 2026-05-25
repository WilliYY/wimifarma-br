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
- `public/favicon.svg`
- `src/app/icon.svg`
- `public/videos/thiago-cansado.mp4`
- `public/videos/thiago-poster.svg`

## Estado Atual

- Header fixo com faixa vermelha de frete gratis, caminhaozinho com deslocamento animado, faixa escura integrada a logo animada sem fundo ancorada no canto esquerdo, selo Farmacia Popular ao lado da logo em telas largas, busca, WhatsApp, login/cadastrar e nav.
- Menu principal destaca a rota ativa em telas largas para deixar claro em qual aba o usuario esta.
- Quando ha sessao de cliente, o header troca `Login / Cadastrar` pelo nome da conta Google e um botao `Sair`.
- O nome do cliente no header abre `/minha-conta`.
- `/minha-conta` usa abas para usuario, senha e cashback; dados de entrega ficam junto com usuario em um unico formulario.
- Banner principal atual e video da Wimifarma em uma vitrine responsiva com acabamento claro, chamada para WhatsApp, texto comercial sobre medicamentos e Farmacia Popular, poster de carregamento e controles integrados de pausar e som.
- Home esta temporariamente focada em anuncio: o primeiro bloco de conteudo ja e a vitrine com video; abaixo dela existe uma tela grande vazia reservada para banner.
- Categorias em bolinhas, cards de medicamentos e vitrines de destaque nao aparecem na home nesta fase.
- O link `Ofertas` nao aparece no menu principal enquanto a home estiver focada em anuncio.
- Fundo usa efeito suave tipo nuvens/farmacia para nao ficar totalmente branco.
- Botao flutuante de WhatsApp fica no canto inferior direito.
- Login/cadastro usa dois blocos: entrar e cadastrar.
- Cadastro comum inclui telefone e cria conta de cliente.
- O selo superior da tela de login foi removido para deixar o titulo direto.
- A logo do header usa o GIF animado sem fundo em `public/brand/logo-animada.gif` sobre faixa escura; o SVG da Wimifarma permanece disponivel para outros pontos e o favicon voltou para a versao anterior usada antes da troca visual.
- Paginas `Farmacia Popular`, `Sobre` e `Contato` usam hero com respiro abaixo do header fixo, cards informativos e CTAs para WhatsApp sem prometer disponibilidade automatica.
- Rodape usa a logo com nome Wimifarma, navegacao, dados de atendimento e WhatsApp, sem texto de plataforma em construcao.

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

## Riscos ao Alterar

- O header fixo pode cobrir conteudo se paddings forem alterados.
- Video vertical pode criar laterais vazias; usar composicao visual sem cortar conteudo importante.
- `scale` da logo pode cortar se o container mudar.
- Elementos muito largos podem criar scroll horizontal.
- Cards brancos demais perdem contraste.

## Pendencias

- Ajustar dados reais de telefone, horarios e endereco.
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
