# Novas animações da galeria — 06/11/2026

Foram adicionadas duas animações fornecidas pelo lojista: Vichy Minéral 89 e uma composição de produtos de beleza. As entradas seguem os sete cards existentes; o institucional do Thiago permanece em terceiro. O destino de cada card é uma categoria de cuidados com o rosto ou de perfumaria, sem promessa de disponibilidade dos produtos representados.

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
