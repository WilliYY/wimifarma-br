# 59 — Campanhas com pessoas e produtos

## Direção aprovada pelo pedido — 09/10/2026

O lojista pediu pessoas, melhor distribuição, menos escrita e apresentação dos produtos. Depois reforçou que Dove e outras marcas devem ter aparência de propaganda. Esta revisão substitui a direção de painel vermelho da entrega 58; aquele documento permanece como registro histórico.

Direção: fotografia de campanha, pessoa à direita, poucas embalagens reais em primeiro plano, uma frase curta e um CTA. A assinatura completa da Wimifarma continua visível. No celular, fotografia antes do texto, com enquadramento próprio por CSS. Impacto 4, adequação 5, execução 4, desempenho 4, risco 3: DFII 14.

## Referências verificadas

- [Dove Brasil](https://www.dove.com/br/home.html): campanha de sérum corporal com mulher adulta e fundo claro, texto azul-marinho. Inspira a cena de autocuidado e os tons claros; não se reproduzem alegações do sérum no óleo de banho.
- [Rexona](https://www.rexona.com/br/sobre.html): fotografia esportiva, movimento e embalagens em destaque. A referência observada inclui campanha histórica; não se transportam seus números de proteção para o produto atual.
- [NIVEA](https://www.nivea.com.br/): campanha com pessoas, diversidade, embalagens próximas do rosto, azul e branco. A composição da loja usa uma cena própria de cuidado corporal.
- Vitrines oficiais Raia/Drogasil de [cuidados com a pele](https://img.drogasil.com.br/home/vitrine/dna/beleza/desktop/CuidadosComAPeleDesktop.webp) e [perfumaria](https://img.drogasil.com.br/home/vitrine/dna/beleza/desktop/PerfumeDesktop.webp): pessoas e produto como apresentação de categoria. São referências de vitrines, não de hero principal.
- [Banner Nissei desktop](https://www.farmaciasnissei.com.br/media/estrutura/logo/REDE-NISSEI-COMUICA%C3%87%C3%83O-E-COMMREDE-NISSEI-COMUICA%C3%87%C3%83O-E-COMM-desktop-FPC-v2.webp) e [mobile](https://www.farmaciasnissei.com.br/media/estrutura/logo/REDE-NISSEI-COMUICA%C3%87%C3%83O-E-COMMREDE-NISSEI-COMUICA%C3%87%C3%83O-E-COMM-mobile-FPC-v2.webp): áreas distintas para produto e mensagem, com adaptação móvel.
- Shopify Dawn 16.0.0, commit `258f00f64365e2018ca4c62778a6bf55a5d3cd18`: [imagem responsiva e prioridade](https://github.com/Shopify/dawn/blob/258f00f64365e2018ca4c62778a6bf55a5d3cd18/sections/slideshow.liquid#L125-L150), [texto móvel abaixo da imagem](https://github.com/Shopify/dawn/blob/258f00f64365e2018ca4c62778a6bf55a5d3cd18/assets/section-image-banner.css#L330-L333) e [orientações oficiais de desempenho](https://shopify.dev/docs/storefronts/themes/best-practices/performance#images).

As imagens de referência foram observadas, sem copiar artes de concorrentes ou fabricantes para o projeto. As campanhas da Wimifarma são composições próprias; não indicam parceria oficial com fabricantes. Panvel não forneceu referência visual verificável nesta rodada.

## Implementação e contratos

- `home-page.tsx` e `home-campaign.module.css`: cuidados, beleza e mãe/bebê, com frase curta, um CTA e fotografia. A primeira ação agora abre o catálogo existente `/catalogo`; a revisão independente identificou e corrigimos o destino inexistente `/produtos` antes da publicação.
- `hero-product-stage.tsx` e `.module.css`: seleção explícita de cena e produtos por variante; três produtos nas campanhas principais, dois Dove e um produto nas campanhas Rexona/NIVEA. Proporções e rótulos dos packshots existentes são preservados por `object-fit: contain`. Mistura de fundos e contraste são feitos em CSS, sem alterar os packshots.
- `perfumery-carousel.tsx` e `.module.css`: cenas diferentes por marca, frases curtas, cores relacionadas à campanha e consulta pelo WhatsApp. Não se anunciam preços, descontos ou disponibilidade não cadastrados.
- Só a campanha ativa monta seus assets em cada carrossel. Prioridade da primeira cena, controles de pausa, foco, gestos, visibilidade da aba e movimento reduzido continuam existentes.
- O bônus de avaliação saiu do hero principal para abrir espaço à apresentação do catálogo. As regras, os saldos e as áreas próprias de cashback não foram alterados.
- A animação original da logo do cabeçalho, o atalho reservado e as 128 bolhas do rodapé não integram o diff. Nenhuma dependência, migration, API, cobrança, etiqueta ou mensagem foi criada.

## Assets e geração

Modo usado: ferramenta integrada `image_gen`, sem CLI/API própria. As fotos de pessoas são cenas ilustrativas; não representam funcionários, clientes reais nem depoimentos. Os produtos são as fotos reais já existentes no projeto. A foto de mãe com bebê continua original.

| Arquivo em `public/banners/` | Dimensões | Bytes | Origem |
| --- | --- | --- | --- |
| `hero-care-people-v3.webp` | 1920 × 720 | 46.596 | Edição de `hero-medicamentos.webp`, com logo oficial na roupa |
| `hero-beauty-people-v3.webp` | 1920 × 720 | 56.822 | Edição de `hero-perfumaria.webp`, liberando espaço para packshots |
| `rexona-people-v3.webp` | 1920 × 768 | 74.718 | Nova cena de movimento ao ar livre |
| `nivea-people-v3.webp` | 1920 × 720 | 53.854 | Nova cena de cuidado corporal |

Os quatro arquivos somam 231.990 bytes; isso não corresponde ao peso total da página nem aos bytes efetivamente transferidos pelo Next Image. Conversão Sharp WebP qualidade 82, esforço 6, sem ampliar nem cortar o original; largura máxima 1920 px. Os PNG de origem permanecem no diretório de imagens geradas do Codex, e todos os assets consumidos pelo site estão versionados no projeto.

### Prompts e invariantes

Atendimento — edição: manter as duas pessoas, rostos, postura, cenário, luz e enquadramento da foto existente. Adicionar à roupa da farmacêutica uma pequena aplicação fiel da logo oficial completa, usando `logo-wimifarma-compact.webp` como referência. Não inventar texto, rótulos ou nova identidade.

Beleza — edição: preservar a mulher, rosto, roupa branca, sorriso, prateleiras e luz da foto existente. Remover perfume e frascos em primeiro plano, deixar a mão naturalmente sobre o outro antebraço e uma área clara no centro inferior para as embalagens reais. Manter cerca de 45% da esquerda livre; sem texto nem marcas sintetizadas.

Rexona — geração: fotografia publicitária horizontal ultra-wide. Homem brasileiro adulto de aproximadamente 35 anos, pele morena, cabelo curto cacheado, roupa esportiva verde sem marca, sorriso natural após corrida leve em parque iluminado. Cabeça inteira e torso no quarto direito, com espaço acima; fundo verde desfocado, esquerda 42% clara e vazia, centro inferior limpo para o packshot real. Anatomia e textura naturais, sem axilas elevadas, manchas de suor, texto, logo, produto, embalagem, marca-d'água ou alegações. Logo Wimifarma e produto Rexona entram como assets exatos no HTML.

NIVEA — geração: fotografia publicitária horizontal ultra-wide. Mulher brasileira adulta de aproximadamente 42 anos, pele morena escura, cachos naturais, maquiagem discreta e blusa azul sem marca. Sorriso suave enquanto toca naturalmente o outro antebraço perto de janela clara; cabeça inteira e torso no quarto direito, mãos corretas, textura humana. Casa desfocada em branco e azul; esquerda 42% vazia e clara, centro inferior limpo para o NIVEA Milk real. Sem texto, logo, frasco, marca-d'água, alegações ou rótulos sintéticos. Logo e embalagem são adicionados pelo site.

## Verificação

Prévia local com os componentes reais, estilos reais, dados vazios e adaptadores de Next Image/Link. Não acessa banco, gateway ou comunicações. A fonte dessa prévia é Arial; o app mantém Barlow. A prévia verifica a composição e não substitui a verificação do Next publicado.

As três campanhas principais e as três campanhas por marca foram conferidas em 320, 768, 1024 e 1440 px sem rolagem horizontal e com uma única figura montada por carrossel. As imagens de Dove e Rexona em 320 px foram reconferidas após o carregamento, todas disponíveis. A revisão independente do código e dos assets não identificou defeitos. A inspeção produtiva será registrada após a publicação.

Gates de 09/10/2026: `npm.cmd run lint`, `npm.cmd run typecheck` e `npm.cmd run build` aprovados; `npm.cmd run test:all` com 507 testes aprovados; `npm.cmd run test:security` com 234 testes aprovados; `npm.cmd audit --omit=dev --audit-level=high` sem vulnerabilidades. A auditoria completa foi executada e preserva os cinco alertas de desenvolvimento descritos abaixo. Não houve alteração de dependências.

Pendência preexistente: cinco alertas high em ferramentas de desenvolvimento (`@next/eslint-plugin-next`, `eslint-config-next`, `fast-glob`, `micromatch`, `braces`), com correção sugerida incompatível. Não alterar dependências como parte deste trabalho visual. Tratamento em [57-correcoes-da-auditoria.md](57-correcoes-da-auditoria.md).
