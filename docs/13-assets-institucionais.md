# 13 - Assets institucionais

## Perfumaria

- `public/banners/dove-care.webp`: composicao existente preservada na primeira campanha.
- `public/banners/rexona-care.webp`: Rexona Bamboo 150 ml, embalagem de referencia; WebP de 800 x 800 px. Fonte da imagem: https://coopsp.vtexassets.com/arquivos/ids/217112-800-auto?aspect=true&height=auto&v=637919537236000000&width=800 ; pagina: https://www.coopsupermercado.com.br/desodorante-aerosol-rexona-bamboo-150ml-s/p .
- `public/banners/nivea-care.webp`: NIVEA Milk 400 ml; WebP de 800 x 800 px. Fonte: https://www.efacil.com.br/wcsstore/ExtendedSitesCatalogAssetStore/Imagens/1000/107107_01.jpg ; pagina: https://www.efacil.com.br/loja/produto/hidratante-corporal-nivea-milk-pele-extra-seca-400ml-p107107/ .
- Referencias de categoria conferidas nos fabricantes em 2026-09-10: https://www.rexona.com/br/p/antitranspirante-rexona-feminino-aerosol-bamboo.html/07791293032498 e https://www.nivea.com.br/produtos/nivea-lo%C3%A7%C3%A3o-deo-hidratante-milk-400ml-40058083156970033.html . Nao foram reproduzidas promessas quantitativas no texto comercial da faixa.
- Fotos publicas de embalagens, nao imagens geradas nem licenca aberta presumida. Marcas e direitos pertencem aos respectivos titulares; manter apenas no contexto de identificacao dos produtos e substituir por material do fornecedor se exigido. Nenhuma alegacao de parceria oficial.
- Conversao local em WebP qualidade 85, sem alterar rotulos. Embalagens/versoes podem variar; os botoes consultam disponibilidade com a Wimifarma e nao criam produtos no catalogo.

## Sobre

- Arquivo: `public/banners/sobre-atendimento.webp`.
- Dimensoes: 1920 x 646 px; 62610 bytes.
- Origem: imagem criada com a ferramenta ImageGen em 2026-09-08, modo geracao de imagem nova.
- Direcao do prompt: fotografia panoramica natural em farmacia brasileira clara, farmaceutico de jaleco com detalhe vermelho conversando com mulher mais velha; pessoas a direita, espaco claro a esquerda para texto; sem marcas ou texto na imagem.
- Uso: cena ilustrativa, nao fotografia de funcionarios ou clientes da Wimifarma.

## Contato

- Arquivo atual: `public/banners/contato-farmaceutica.webp`.
- Dimensoes: 1920 x 720 px; 63452 bytes; WebP qualidade 85.
- Origem: imagem nova criada com a ferramenta ImageGen em 2026-09-09, modo nativo; sem uso de API externa ou chave do projeto.
- Direcao do prompt: fotografia panoramica 8:3 em farmacia brasileira clara; farmaceutica adulta de jaleco branco e blusa verde suave atendendo pelo celular, expressao calma e natural, plano medio, prateleiras de medicamentos genericos; pessoa a direita e parede clara livre a esquerda para texto HTML; sem marcas, textos, estetoscopio ou alegacoes medicas.
- Uso: cena ilustrativa, nao fotografia de funcionaria real da Wimifarma. Preservar legenda e texto alternativo.
- A foto anterior `public/banners/contato-conversa.webp` deixou de ser exibida; preservada para reversao. Autoria: cottonbro studio, Pexels; fonte: https://www.pexels.com/photo/smiling-woman-in-white-long-sleeve-shirt-holding-black-phone-5081391/ ; licenca consultada em 2026-09-08: https://www.pexels.com/license/ .

## Exibicao

- Ambas exibem a legenda `Imagem ilustrativa` e texto alternativo.
- Titulos, botoes, endereco e demais textos ficam em HTML, separados da imagem.
- Imagens locais com `next/image`, `sizes` responsivo e prioridade apenas no hero acima da dobra.
- Preservar rostos ao ajustar enquadramento; validar desktop, tablet e celular antes de substituir os arquivos.
- No celular e tablet, a fotografia panoramica fica acima do texto. Em desktop compacto, fica na lateral para preservar o contraste; em telas amplas ocupa o fundo da faixa. Contato usa ponto focal `82% top` para preservar rosto e telefone; Sobre mantem o enquadramento anterior.

## Validacao da troca de imagem em 2026-09-09

- Contato conferido visualmente em 320, 390, 768, 1024 e 1440 px: imagem carregada, rosto e telefone preservados, texto legivel e sem transbordamento horizontal.
- `npm.cmd run lint`, `npm.cmd run typecheck` e `git diff --check`: aprovados. A primeira execucao conjunta excedeu o limite de tempo da ferramenta; TypeScript foi repetido isoladamente e concluiu com codigo zero.
- Alteracao visual sem logica comercial ou dados novos; contatos e botoes preservados.

## Validacao da entrega anterior em 2026-09-08

- Conferencia visual em navegador nas larguras de 320, 390, 768, 1024 e 1440 px, incluindo recorte das fotos, leitura e ausencia de transbordamento horizontal nas paginas.
- Ancora de canais, destinos WhatsApp/Maps/e-mail e abertura de perguntas frequentes por teclado conferidos, sem enviar mensagens.
- `npm.cmd run lint`, `npm.cmd run typecheck` e `npm.cmd test`: aprovados; 53 testes passaram.
- A API de visitas local retornou `P1001` por falta de acesso ao host PostgreSQL `postgres`. Essa limitacao do ambiente local nao foi tratada como validacao de banco; o servidor deve ser conferido apos o deploy.
