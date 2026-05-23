# 10 - Layout e Experiencia

## O Que Esta Parte Faz

Documenta a experiencia visual atual do site publico e os cuidados ao alterar layout principal.

## Arquivos Envolvidos

- `src/components/site/home-page.tsx`
- `src/components/site/site-header.tsx`
- `src/components/site/site-footer.tsx`
- `src/components/site/floating-whatsapp.tsx`
- `src/components/site/page-hero.tsx`
- `src/components/site/customer-auth-page.tsx`
- `src/app/globals.css`
- `public/brand/logo-wimifarma.svg`
- `public/brand/delivery-truck.gif`
- `public/brand/delivery-truck.png`
- `public/favicon.svg`
- `src/app/icon.svg`
- `public/videos/thiago-cansado.mp4`

## Estado Atual

- Header fixo com faixa vermelha, caminhaozinho com deslocamento animado, logo ancorada no canto esquerdo, busca, WhatsApp, login/cadastrar e nav.
- Banner principal atual e video da Wimifarma com controles integrados de pausar e som.
- Home esta temporariamente focada em anuncio: abaixo do video existe uma tela grande vazia reservada para banner.
- Categorias em bolinhas, cards de medicamentos e vitrines de destaque nao aparecem na home nesta fase.
- O link `Ofertas` nao aparece no menu principal enquanto a home estiver focada em anuncio.
- Fundo usa efeito suave tipo nuvens/farmacia para nao ficar totalmente branco.
- Botao flutuante de WhatsApp fica no canto inferior direito.
- Login/cadastro usa dois blocos: entrar e cadastrar.
- O selo superior da tela de login foi removido para deixar o titulo direto.
- A logo atual usa o SVG novo da Wimifarma, com recorte para header/footer e versoes de icone/favicon atualizadas.

## Regras de Design

- Vermelho e cor principal.
- Branco e base visual.
- Verde deve apoiar WhatsApp e Farmacia Popular.
- Evitar excesso de informacao sobre o video.
- Logo nao deve ficar cortada nem presa em bolha desnecessaria.
- Logo do header deve ficar alinhada ao canto esquerdo da janela e nao deve invadir a busca.
- Layout deve ser responsivo e nao gerar barra lateral horizontal.
- Animacoes devem ser leves e nao prejudicar performance.
- O caminhaozinho da faixa superior deve manter fundo transparente, andar em uma pista curta e nao aumentar demais a altura do header.
- Para o anuncio principal da home, dimensao recomendada em desktop: 1920x840 px, proporcao 16:7. Se houver arte mobile separada, usar 1080x1350 px, proporcao 4:5.
- Manter informacoes importantes do anuncio no centro da arte para evitar cortes em telas menores.

## Decisoes Tecnicas

- Framer Motion usado para entradas suaves.
- `lucide-react` usado para icones.
- Produtos demonstrativos usam visuais CSS, nao fotos reais.
- Video fica em `public/videos/thiago-cansado.mp4`.

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
