# Willian na quinta posição da galeria

## Conteúdo e destino

O lojista forneceu três fotografias suas com produtos de perfumaria e cuidados pessoais. A entrada `willian-perfumaria` ocupa a quinta posição, mantendo o institucional do Thiago em terceiro e “Linha Vichy” em quarto. O título é “Willian · Perfumaria”, a legenda é “Seu cuidado de perto” e o clique abre o catálogo com `grupo=beauty`. A mídia não anuncia preço, estoque, oferta ou indicação terapêutica.

## Preparação dos arquivos

As fotografias originais tinham959×1280px e rótulos/logo espelhados. A correção horizontal é aplicada ao quadro inteiro, sem reconstruir rosto, mãos, produtos ou ambiente. Cada foto é redimensionada proporcionalmente para um quadro540×720px, com no máximo um pixel lateral de preenchimento. Pessoas e produtos permanecem inteiros. Não há áudio, imagem gerada por IA, fundo reconstruído ou preço embutido. O componente sobrepõe somente a assinatura oficial completa da Wimifarma na área superior livre; essa marca reutiliza a arte oficial e não altera as fotografias.

| Arquivo | Uso | Dimensões | Quadros/cadência | Bytes |
| --- | --- | --- | --- | --- |
| `public/media/home/willian-perfumaria-loop-v1.webp` | Animação pública | 540×720 | 3×1000ms, loop0/infinito | 117.302 |
| `public/media/home/willian-perfumaria.webp` | Pôster estático | 540×720 | 1 | 45.436 |
| `Willian-perfumaria.gif`, fora do Git | GIF para entrega | 540×720 | 3×1000ms, loop0/infinito | 547.879 |

Os derivados públicos não recebem EXIF/localização das fotografias. O arquivo original continua preservado. Manifesto privado com SHA-256, versão do encoder, orientação e conversão reproduzível ficam em `D:/Codex-outputs/wimifarma-br/willian-fifth-2026-11-07/`. Somente os dois WebPs públicos entram no repositório.

## Reprodução e desempenho

A entrada usa `kind=gif` e `continuousPreview=true`. Aumentar apenas o limite de imagens animadas para três permite que ela reproduza quando os dois vídeos contínuos, Thiago e Vichy, estão visíveis. Um terceiro vídeo dependeria de uma vaga que nesse cenário não existe. O novo WebP tem três fotos a1fps; o número máximo de vídeos simultâneos continua dois. O limite deliberado passa a ser dois vídeos e três imagens animadas elegíveis, com pôsteres para movimento reduzido/economia de dados e suspensão por teclado, Escape, aba oculta e saída da tela.

Os dois primeiros WebPs e os vídeos existentes não são alterados. Arraste, navegação circular, links diretos e assinatura oficial são preservados. O arquivo leve reduz a transferência do novo item; isso não representa garantia de ausência de lentidão em qualquer dispositivo.

## Verificação e publicação

O encoder decodifica os três quadros de cada animação, verifica dimensões, repetição infinita, ausência de EXIF e duraçõesANMF de1000ms. O teste de regressão precisa comprovar a quinta imagem animando com os dois vídeos contínuos, preservando fontes/elementos durante rotação e arraste, limite de mídia e preferências de acessibilidade. Há também conferência visual da orientação, enquadramento e marca.

Mídia gerada e verificação local não comprovam publicação. O commit combinado com o ajuste de consulta de envio exige CI, build Linux da imagem e smoke público próprios, sem reutilizar a imagemAPP26 ou sua janela de operação. A mudança não exige migration, cadastro de produto, nova regra de frete, preço ou habilitação de transporte.
