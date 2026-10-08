# 58 — Banners com identidade Wimifarma

## Pedido e decisão visual — 08/10/2026

Reorganizar as campanhas da home e de perfumaria para apresentar a marca, a mensagem e os produtos com mais clareza. Usar referências de varejo farmacêutico, preservando a identidade própria e as regras comerciais existentes.

Referências consultadas: [Drogaria São Paulo](https://www.drogariasaopaulo.com.br/) e [Panvel](https://www.panvel.com/). A organização de campanhas por categoria e destino orientou a composição. Não foram copiados arquivos, preços, benefícios, selos ou logotipos dessas lojas.

Direção: painel vermelho Wimifarma, logo oficial completa, título de destaque e embalagens reais sobre fundo claro. No celular, texto antes das imagens; navegação com nomes visíveis das campanhas. Avaliação de viabilidade da direção: impacto 4, adequação 5, execução 4, desempenho 4 e risco 3; DFII 14.

## Implementação

- `home-page.tsx` e `home-campaign.module.css`: três campanhas com a mesma linguagem visual, CTA branco, condições legíveis e seleção por assunto. Altura mínima no desktop reduz mudanças entre campanhas; no celular, o conteúdo tem altura natural.
- `hero-product-stage.tsx` e `hero-product-stage.module.css`: produtos maiores, sem cartão branco interno, sem deformar proporções. `object-fit: contain` preserva as embalagens. A mistura visual do fundo usa CSS e não altera os arquivos originais.
- `perfumery-carousel.tsx` e `.module.css`: Dove, Rexona e NIVEA recebem a assinatura da farmácia, CTA vermelho e navegação pelo nome da marca. A fotografia panorâmica Dove continua original.

Apenas a campanha ativa monta suas imagens. O ajuste de `sizes` acompanha o espaço maior das embalagens. Nenhuma imagem nova, dependência, tabela, API ou configuração de gateway foi criada.

## Contratos preservados

- Logo oficial via `BrandSignature`, sem redesenho. A animação original do cabeçalho e as 128 bolhas do rodapé não integram o diff.
- Mesmos textos, destinos e disponibilidade consultiva. Não se acrescentam descontos, preços ou promessa de estoque.
- Bônus de 1% mantém condições e link `/cashback`, inclusive tratamento igual para qualquer nota. A ação principal continua em `/minha-conta/avaliacoes`.
- Pausa manual, foco, interação, aba oculta, saída de tela, gestos existentes e preferência de movimento reduzido permanecem no carrossel.
- Não altera estoque, receita, pagamento, frete, pedidos, mensagens ou dados de clientes.

## Verificação

Preview local do componente real e estilos reais, com dados vazios em memória e adaptadores locais de Next Image/Link; sem banco ou comunicações. Esse preview valida composição, não substitui a validação do app Next em produção. A fonte do fixture é Arial; o site mantém Barlow.

- As três campanhas e as três marcas foram conferidas em 320, 1024 e 1440 px: nenhuma rolagem horizontal, imagens carregadas e seleção correspondente.
- Inspeção visual adicional em 390 px e 768 px, incluindo campanha infantil e fotografia Dove. As embalagens e os textos permaneceram legíveis.
- Controles móveis das campanhas têm 44 px de largura/altura. Navegação por teclado, nomes acessíveis e estado selecionado continuam disponíveis.

Gates já concluídos: `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run test:all` (507/507), `npm.cmd run test:security` (234/234) e `git diff --check`. `npm.cmd audit --omit=dev --audit-level=high` encontrou zero vulnerabilidades.

A auditoria completa `npm.cmd audit --audit-level=moderate --json` permanece com cinco alertas high da cadeia de ferramentas: `@next/eslint-plugin-next`, `eslint-config-next`, `fast-glob`, `micromatch` e `braces`. O npm propõe downgrade incompatível para ESLint Next 14.2.35; não aplicado. Nenhuma dependência foi alterada nesta tarefa. Histórico e tratamento em [57-correcoes-da-auditoria.md](57-correcoes-da-auditoria.md).

Revisão independente dos seis arquivos de código: nenhum defeito relevante. A revisão confirmou destinos, condições, assinatura, pausa e movimento reduzido, além de ESLint direcionado e parsing PostCSS. A conferência produtiva continua sendo responsabilidade da entrega, separada da revisão.

`npm.cmd run build` concluiu com código zero: compilação Next.js 15.5.27, lint/tipos e 37 páginas estáticas. Capturas e auxiliares de preview não entram no Git.

## Publicação e conferência real

- Código `bdd3ecd` enviado ao GitHub e recebido no servidor por `git pull --ff-only`. Build Docker concluído; somente `app` recriado, sem migrations ou reinício do PostgreSQL.
- Imagem publicada: `sha256:34f7858d724994fcdb6be576e29e02cfffb071de2081643d9e56fd5b39aafd4c`. Imagem anterior preservada em `wimifarma-br-app:pre-banners-bdd3ecd` para reversão.
- Após a inicialização, `/api/health` retornou `ok: true`, home HTTP 200, container rodando e zero reinícios. A primeira consulta durante a recriação recebeu reset de conexão; a consulta posterior confirmou a saúde. Isso não representa erro de campanha.
- As três campanhas e as três marcas foram conferidas no site publicado em 390, 768 e 1440 px: imagens carregadas, tema/seleção correta e nenhuma rolagem horizontal. Fonte Barlow confirmada no banner.
- DOM produtivo conservou `logo-wimifarma-animated.svg` no cabeçalho, 128 elementos de bolhas e filtro original no rodapé. Esses arquivos não foram alterados.
- Evidência visual local em `outputs/banners-wimifarma-publicado.png`, excluída do Git. Não foram feitos pedidos, cobranças, avaliações ou envios de mensagem durante o QA.

Pendência técnica preexistente: cinco alertas high nas ferramentas de desenvolvimento, descritos acima. Não há pendência visual conhecida nesta entrega; ensaios em tamanhos específicos não garantem todos os navegadores ou dispositivos.
