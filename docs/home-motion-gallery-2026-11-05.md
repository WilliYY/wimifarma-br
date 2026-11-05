# Home: galeria de vídeos e duas fileiras de medicamentos

## Composição e interação

Os atalhos de Ofertas, Infantil e demais categorias continuam no início. O antigo banner rotativo foi substituído por uma galeria de seis animações fornecidas pelo lojista. Depois dela vêm duas fileiras de medicamentos e a faixa original “Suas marcas favoritas, aqui.”. O componente e os estilos das marcas permanecem intactos. A sequência restante é Cuidados, Pix, Menores preços, Club e avaliações; a antiga Farmacinha foi movida para as duas fileiras, sem uma terceira repetição abaixo do Pix.

A galeria usa quadros uniformes 3:4 e `object-fit: contain`: rótulos e embalagens não são cortados. Mouse, toque e teclado percorrem as mídias, com fade nas extremidades e sem setas. Clique ou Enter abre um player ampliado, com controles, fechamento por Escape e retorno de foco ao item. Os links usam as rotas de pesquisa/categoria existentes; não criam preço, estoque ou cadastro de produto.

Até duas prévias visíveis podem reproduzir ao mesmo tempo. Fora da tela, em aba oculta, durante o player ampliado, com movimento reduzido ou economia de dados, a galeria mantém pôsteres estáticos. Há controle de pausa. GIFs futuros são suportados, inclusive com pôster estático quando a reprodução automática está desativada.

## Medicamentos

`buildHomeCollections` acrescenta `medicines` sem reservar itens antes das três coleções anteriores. A seleção contém até 40 IDs únicos, em rotação diária determinística por Brasília, com estoque vendável, preço positivo, foto validada e classificação OTC explicitamente consistente. Receita comum, antimicrobianos, controlados, Farmácia Popular, classificação inconsistente e ruptura ficam fora. Escassez não é completada com higiene ou produtos fictícios.

Os primeiros 20 itens compõem a fileira superior, movendo-se para a direita; os demais, até 20, compõem a inferior, para a esquerda. O movimento de 11 CSS px/s é independente da quantidade de quadros, com `translate3d` e sem renderização React por frame. Hover, foco, arraste, toque, visibilidade, aba oculta, pausa manual e movimento reduzido suspendem o avanço. Arraste não aciona compra; cópias visuais do loop conservam ações e ficam fora da ordem de tabulação.

A variante `medicine-rail` tem largura de 276 px no celular e 320 px nas telas maiores. Foto e identificação ficam lado a lado; nome e composição completos, preço, unidade e ações continuam disponíveis. Adicionar/Comprar ficam lado a lado, com alvos de 44 px. Na fixture sintética conferida, a mediana e o máximo de altura foram 243 px; apresentações reais mais longas podem aumentar a altura para preservar o conteúdo.

## Selo de frete

O selo “Frete grátis*” comunica um benefício condicional e não uma cotação gratuita confirmada. Ele aparece somente em produtos disponíveis, sem receita, fora da Farmácia Popular e sem atendimento assistido obrigatório. Nos cartões comuns, o selo fica junto ao OFF, e “Ver frete” continua como a ação única. Nos cartões compactos, o selo é a própria ação de consulta no cabeçalho. A área dos selos conserva o alinhamento com ou sem desconto.

O diálogo informa que CEP, itens do pedido e modalidade determinam o benefício. A API existente continua calculando o preço/prazo; consulta paga não vira gratuita por causa do selo. As regras de logística, margem, transportadora, estoque, pagamento e checkout não foram alteradas. A expressão “Frete grátis nesta cotação” permanece reservada ao resultado real `benefit.status === "free"`.

## Mídias e próximas entregas

As seis animações de produtos — Wimi B Complex, creme para mãos WimiLab, Dove Original, NIVEA Creme, Principia GL-01 e NC-10 — foram convertidas em MP4 H.264/yuv420p, sem áudio, com faststart e resolução de até 540 px de largura. Os seis vídeos somam 366.894 bytes e os seis pôsteres WebP, 104.006 bytes: 470.900 bytes ao todo, antes do protocolo HTTP. Os GIFs originais foram preservados fora do repositório e os derivados foram decodificados integralmente. Não se copiou material promocional de terceiros. A animação com uma pessoa segurando caixas ficou separada até conferir as apresentações exibidas, conforme a exclusão de medicamentos com receita das vitrines.

Padrão para novas artes: **1080 × 1440 px (3:4)**, produto e rótulo inteiros, margem de segurança de 10%, loop de 5–8 segundos, sem áudio e sem preço/estoque embutidos. Preferir MP4 H.264 de até 2 MB e enviar também uma capa WebP/JPG; GIF pode ser entregue para gerar uma versão leve. Formatos diferentes são encaixados sem corte.

Para adicionar um item, incluir o MP4/GIF e o pôster em `public/media/home`, depois acrescentar a entrada tipada em `src/features/home-media/items.ts`, com título, apresentação, destino e ação. Não inserir alegações terapêuticas, ofertas ou disponibilidade não conferidas.

Referências de composição: a captura Panvel fornecida pelo lojista e a [galeria oficial de fotos e vídeos da Sephora](https://www.sephora.com/community/gallery). A referência foi usada para organização e interação; as artes publicadas são as fornecidas pelo lojista.

## Verificação e publicação

Os primeiros testes da galeria reproduziram a ausência do componente; depois passaram os cenários de seis larguras, mouse, teclado, player, foco, limite de reprodução, pausa, tela e movimento reduzido. A seleção/fileiras passou em 20 cenários, incluindo Chromium, toque nativo, compra, frete, escassez e dimensões. Um teste adicional reproduziu o desalinhamento de fotos quando OFF e frete quebravam linha no celular; o cabeçalho e a ação dos cartões comuns foram ajustados para manter o alinhamento.

Os resultados finais de lint, tipos, testes, revisão e CI devem ser registrados na entrega. Preparação local e imagem construída anteriormente não comprovam publicação desta feature. A execução anterior APP13 foi mantida em HOLD após a nova solicitação; seus arquivos, imagens e eventual transporte parcial não autorizam repetir execução ou reutilizar janela expirada. Esta alteração de interface não exige outra migration além da estrutura de catálogo que já estava pendente na publicação anterior.

### Fechamento local

- Tipos globais passaram com heap de 4096 MB, após completar a fixture de compras com `medicines: []`. Lint, Prisma generate/validate e `git diff --check` passaram. O heap padrão de aproximadamente 1 GB havia sido insuficiente; o teste não foi apresentado como erro de tipos nem alterou a configuração permanente do projeto.
- Os 560 testes de segurança passaram. A galeria passou nos cinco cenários Chromium, incluindo Save-Data, aba oculta, toque e GIF futuro; as regras e a integração da home passaram. O erro `__name` encontrado em um getter da fixture foi corrigido na simulação, sem mudar a lógica ou aumentar tempos.
- A revisão independente encontrou um problema de foco no campo de quantidade de uma cópia visível. A regressão reproduziu o foco inativo antes da correção; depois, o cenário Chromium passou com edição da quantidade para 5, carrinho real da fixture, posição visual preservada e foco do frete correto. O parecer incremental terminou sem achados pendentes.
- A compatibilidade inicial teve 22 de 26 cenários aprovados e quatro falhas: a frase introdutória do diálogo mencionava gratuidade mesmo quando a consulta recusava o produto. O texto foi tornado neutro; a reexecução dos nove testes do diálogo passou, preservando as proibições de promessa de entrega para ruptura, controle e produto arquivado. Nenhuma asserção foi afrouxada.
- Auditoria de produção: 7 alertas, sendo 3 low e 4 moderate. Auditoria completa: 12 alertas, sendo 3 low e 9 moderate. Ambas retornaram zero high/critical; nenhum pacote foi modificado. Os relatórios integrais permanecem nos resultados da tarefa. Isso não representa garantia de ausência de vulnerabilidades.
- Capturas de galeria e fileiras em celular/desktop foram inspecionadas. Fontes das marcas, atalhos e rodapé não tiveram alterações. A suite completa do CI e a compilação/publicação da imagem desta feature são etapas posteriores ao fechamento local.
