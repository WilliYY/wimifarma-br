# Logo animada original — 2026-09-23

## Referência aprovada

Arquivo fornecido pelo lojista: `LOGO ANIMADA WIMIFARMA - FUNDO AZUL.svg`. Usar a própria sequência de montagem, sem fundo azul. Esta instrução substitui o efeito genérico de flutuação/brilho aplicado em 2026-09-22. Não redesenhar letras, contorno ou símbolo.

SHA-256 da fonte: `ed0b85b7c45dc464f29cd7a5cd76c3828da1ab84fa0050db19c5daa0a5a26dc3`.

## Otimização sem perda

- Original: **215.247 bytes**. Derivado `public/brand/logo-wimifarma-animated.svg`: **78.492 bytes**, redução de **63,5%**. Gzip de referência: 57.557 bytes, condicionado à compressão HTTP do servidor.
- A fonte já combinava cápsula vetorial e imagem raster de 1024 × 1024. A resolução foi preservada. O PNG embutido foi reencodado em WebP **lossless**, com igualdade dos pixels RGBA decodificados verificada pelo script.
- Removidos gradiente/retângulo azul, comentários, declaração CSS inválida redundante e duas definições sem uso. Preservados viewBox, coordenadas, máscaras, filtros, curvas, timings e cinco keyframes do ciclo de 4 segundos.
- Arquivo autocontido: nenhum script, fonte externa ou solicitação de imagem adicional. Não foi convertido para vídeo/GIF nem interpolado para simular maior resolução.
- A tentativa de PNG com `effort` ativava paleta/quantização no encoder; descartada após a comparação detectar diferenças. A versão final usa lossless e passou na comparação também no navegador.

## Cabeçalho e acessibilidade

`site-header.tsx` usa `<picture>`: animação original no modo normal; `logo-wimifarma-compact.webp` no modo de movimento reduzido. A seleção é nativa do navegador, sem JavaScript e sem preload que baixe a variante errada. Dimensões do cabeçalho e nome acessível do link preservados. O SVG também possui fallback estático completo quando aberto diretamente com movimento reduzido.

A animação original passa pelas fases de símbolo, expansão da cápsula e montagem do nome. Essa sequência foi expressamente escolhida pelo lojista. Banners, assinatura institucional e rodapé continuam usando a marca completa estática.

## Reprodução e validação

```powershell
node scripts/prepare-animated-logo.mjs "<caminho>/LOGO ANIMADA WIMIFARMA - FUNDO AZUL.svg"
node scripts/animated-logo-audit.mjs "<caminho>/LOGO ANIMADA WIMIFARMA - FUNDO AZUL.svg"
node scripts/brand-ui-audit.mjs
```

- Comparados **9 momentos** entre 0 e 3990 ms: pixels da animação otimizada idênticos aos da fonte com o fundo removido. Transparência e marca estática completa com movimento reduzido aprovadas.
- `eslint` dos arquivos alterados, `tsc --noEmit` e `npm.cmd run build` aprovados. JavaScript inicial da home permanece em 206 KB, sem dependência nova.
- Auditoria responsiva local aprovada: cinco páginas × quatro larguras (320/390/768/1440), seleção do SVG original/estático conforme movimento, seis campanhas preservadas, sem overflow ou erro de JavaScript. Nenhuma escrita comercial.
- Capturas de teste em `artifacts/animated-logo-qa/`, fora do Git. Fonte original preservada; nenhum cadastro ou banco alterado.
