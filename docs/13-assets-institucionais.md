# 13 - Assets institucionais

## Sobre

- Arquivo: `public/banners/sobre-atendimento.webp`.
- Dimensoes: 1920 x 646 px; 62610 bytes.
- Origem: imagem criada com a ferramenta ImageGen em 2026-09-08, modo geracao de imagem nova.
- Direcao do prompt: fotografia panoramica natural em farmacia brasileira clara, farmaceutico de jaleco com detalhe vermelho conversando com mulher mais velha; pessoas a direita, espaco claro a esquerda para texto; sem marcas ou texto na imagem.
- Uso: cena ilustrativa, nao fotografia de funcionarios ou clientes da Wimifarma.

## Contato

- Arquivo: `public/banners/contato-conversa.webp`.
- Dimensoes: 1200 x 1600 px; 68502 bytes.
- Autoria: cottonbro studio, Pexels.
- Fonte: https://www.pexels.com/photo/smiling-woman-in-white-long-sleeve-shirt-holding-black-phone-5081391/
- Licenca consultada em 2026-09-08: https://www.pexels.com/license/
- Uso permitido em site comercial, com redimensionamento e conversao WebP. A foto nao representa depoimento, endosso ou cliente real da Wimifarma.

## Exibicao

- Ambas exibem a legenda `Imagem ilustrativa` e texto alternativo.
- Titulos, botoes, endereco e demais textos ficam em HTML, separados da imagem.
- Imagens locais com `next/image`, `sizes` responsivo e prioridade apenas no hero acima da dobra.
- Preservar rostos ao ajustar enquadramento; validar desktop, tablet e celular antes de substituir os arquivos.
- No tablet, Sobre separa a foto acima do texto; Contato reserva metade da faixa para o retrato. Em desktop compacto, a foto de Sobre permanece na lateral para nao comprometer o contraste da leitura.

## Validacao da entrega

- Conferencia visual em navegador nas larguras de 320, 390, 768, 1024 e 1440 px, incluindo recorte das fotos, leitura e ausencia de transbordamento horizontal nas paginas.
- Ancora de canais, destinos WhatsApp/Maps/e-mail e abertura de perguntas frequentes por teclado conferidos, sem enviar mensagens.
- `npm.cmd run lint`, `npm.cmd run typecheck` e `npm.cmd test`: aprovados; 53 testes passaram.
- A API de visitas local retornou `P1001` por falta de acesso ao host PostgreSQL `postgres`. Essa limitacao do ambiente local nao foi tratada como validacao de banco; o servidor deve ser conferido apos o deploy.
