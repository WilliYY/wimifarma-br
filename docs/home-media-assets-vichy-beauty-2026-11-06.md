# Novas animações da galeria — 06/11/2026

Foram adicionadas duas animações fornecidas pelo lojista: Vichy Minéral 89 e uma composição de produtos de beleza. Na revisão de 07/11, o card da Vichy ocupa a quarta posição, logo depois do institucional do Thiago, preservado em terceiro. A apresentação passa a ser “Linha Vichy”, com legenda “Cuidados para sua pele” e destino no catálogo filtrado somente pela marca Vichy, incluindo suas diferentes linhas. Os nomes dos arquivos e a imagem do frasco preservam a mídia original; o texto do card se refere à linha e não anuncia uma apresentação específica ou sua disponibilidade.

A Vichy recebe prévia contínua enquanto estiver visível e o movimento for permitido. Ela compartilha com o institucional as duas vagas existentes de vídeo, sem aumentar a quantidade máxima de decodificadores ativos. Os demais vídeos usam as vagas que estiverem livres. Movimento reduzido, economia de dados, aba oculta e descarregamento fora da tela permanecem respeitados. O vídeo leve já existente e seu pôster não foram modificados.

## Preparação

Os arquivos originais foram preservados. Somente os quatro derivados públicos abaixo entram no repositório; os nomes e caminhos dos documentos particulares que continham os GIFs não são expostos.

| Derivado público | Dimensões | Duração | Tamanho |
| --- | --- | --- | --- |
| `public/media/home/vichy-mineral89.mp4` | 540 × 720 | 1,26 s | 101.133 bytes |
| `public/media/home/vichy-mineral89.webp` | 540 × 720 | Pôster estático | 25.756 bytes |
| `public/media/home/ritual-beleza.mp4` | 540 × 720 | 2,8 s | 42.926 bytes |
| `public/media/home/ritual-beleza.webp` | 540 × 720 | Pôster estático | 18.092 bytes |

Os MP4 são H.264/yuv420p, silenciosos e preparados para carregamento progressivo (`faststart`). O player existente usa repetição infinita, carregamento por visibilidade e orçamento de reprodução compartilhado. Novas entradas não aumentam o número máximo de vídeos simultâneos.

A animação Vichy preserva os 18 quadros de 70 ms; um recorte remove apenas espaço vazio ao redor, mantendo o frasco, a arte e sua sombra completos. A composição de beleza preserva os sete quadros de 400 ms, cada um repetido em dois quadros do vídeo a 5 fps. A imagem horizontal permanece inteira no primeiro plano; uma cópia desfocada do mesmo quadro preenche o fundo vertical. Nenhum rótulo, pessoa ou produto foi gerado por IA.

## Validação e rastreabilidade

As duas animações foram decodificadas integralmente com FFmpeg `-xerror`, e os pôsteres foram inspecionados visualmente. O enquadramento 3:4 está incorporado aos arquivos, preservando o comportamento `contain` dos cards.

O manifesto de origem, SHA-256, filtros, conversão reproduzível e capturas ficam fora do Git em `D:/Codex-outputs/wimifarma-br/gallery-circular-2026-11-06/`. Os GIFs originais, os dois primeiros WebP animados e o vídeo institucional aprovado não foram modificados.

A aprovação local de mídia não comprova publicação: a fonte final, CI, imagem da aplicação e smoke público desta atualização precisam de validação própria.
