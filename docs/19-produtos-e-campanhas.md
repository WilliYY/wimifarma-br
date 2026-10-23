# Produtos e campanhas

## Revisão de 2026-10-09: pessoas e campanhas por marca

As campanhas agora apresentam pessoas, embalagens reais e pouco texto. Dove tem autocuidado, Rexona tem movimento ao ar livre e NIVEA tem cuidado corporal, com cenas próprias e assinatura da Wimifarma. A primeira campanha apresenta o catálogo; o cashback permanece nas áreas próprias. Fotos acima do texto no celular; animações da logo e do rodapé preservadas. A revisão abaixo permanece histórica. Contrato atual em [59-banners-pessoas-e-produtos.md](59-banners-pessoas-e-produtos.md).

## Revisão de 2026-10-08: composição e identidade da loja

As três campanhas da home agora usam painel vermelho, assinatura oficial completa e produtos reais maiores. Perfumaria recebe a mesma assinatura e seleção pelo nome da marca. Arquivos de imagem, textos, destinos e regras comerciais continuam existentes; pausas e movimento reduzido foram preservados. A composição anterior descrita abaixo é um registro histórico. Decisão e validação atual em [58-banners-varejo-wimifarma.md](58-banners-varejo-wimifarma.md).

## Revisao de 2026-09-20: marcas e marketing de avaliacao

- Banner e `/cashback`: `Sua opinião vale mais.` convida a compartilhar experiencias. O 1% extra e secundario, com condicoes e link para as regras; qualquer nota recebe o mesmo tratamento. Nenhuma regra de cashback ou dado comercial mudou.
- Quatro embalagens reais em cada campanha. Dove, NIVEA e Rexona em cuidados/perfumaria; Huggies e Johnson’s na linha infantil. Fotos individuais em `HeroProductStage`, CSS responsivo, fontes locais e sem marcas sintetizadas por IA. Fontes em `13-assets-institucionais.md`.
- Arquivos: `home-page.tsx`, `hero-product-stage.tsx`, `hero-product-stage.module.css`, `src/app/(site)/cashback/page.tsx`, seis WebP em `public/banners/products/`; README e docs 07, 10, 13, 16 e este documento.
- Oito fontes distintas (incluindo dois WebP existentes) somam **159.488 bytes**, reducao de **41,2%** frente aos 271.374 bytes da revisao anterior. As duas primeiras campanhas compartilham imagens; as infantis so carregam quando exibidas.
- Playwright local: tres campanhas em 320, 390, 768, 1024 e 1440 px; quatro imagens carregadas por campanha, sem overflow horizontal, erro JavaScript ou HTTP >= 400. Conferidos links, toque real via CDP, setas, movimento reduzido e consistencia de `/cashback`.
- Primeira campanha: **18.629 bytes** de imagens no desktop 1440/DPR 1 e **35.567 bytes** no celular 390/DPR 3. A segunda campanha nao repetiu downloads; imagens infantis ausentes das requisicoes iniciais. Sao bytes dos corpos das imagens otimizadas, nao peso total da pagina. O primeiro banner tem mais bytes que a arte unica anterior, mas o conjunto completo e menor e as marcas sao reais.
- Nenhuma dependencia, migration, API, pedido ou saldo novo. Preview e scripts locais removidos antes da entrega; capturas de QA nao versionadas.
- Gates desta revisao: `node node_modules/eslint/bin/eslint.js .`, `node node_modules/typescript/bin/tsc --noEmit`, `npm.cmd run build` e `git diff --check` passaram. Build final sem rota de preview. Testes de dominio, Prisma validate e audit ja haviam passado na entrega anterior desta mesma tarefa; esta revisao nao altera dominio, schema ou dependencias.
- Publicacao de `00403c2` em 2026-09-20: push, `git pull --ff-only`, `docker compose build app` e `docker compose up -d --no-deps app`. Imagem anterior preservada como `wimifarma-br-app:pre-brand-fb12679`. Playwright repetiu as tres campanhas nas cinco larguras no site publico, sem erros ou overflow; `/cashback` respondeu 200 e manteve a mesma comunicacao. No servidor, as imagens iniciais transferiram 18.095 bytes em 1440/DPR 1 e 34.728 bytes em 390/DPR 3. Nenhum pedido ou avaliacao foi enviado.

## Registro da revisao anterior — 2026-09-19

Os resultados abaixo descrevem a entrega anterior. As composicoes sem marca foram substituidas em 2026-09-20, conforme a revisao acima.

## Resultado

- `/produto/[slug]`: galeria sem miniatura redundante, zoom 100–200% centralizado e rolável, fallback de imagem, compartilhamento nativo/clipboard, preço por unidade, economia, cashback estimado e total por quantidade. Navegação por âncoras e painel fixo preservam quantidade e respeitam o header.
- Sem avaliações não implica produto novo. Produtos restritos mantêm WhatsApp; estoque zero não oferece compra. Cashback continua condicionado às regras existentes. Nenhum preço, estoque, pedido, cliente ou regra de pagamento foi alterado.
- Home: três composições com 7–9 itens ilustrativos sem marcas ou rótulos inventados; imagem inteira no celular e texto HTML ao lado no desktop. Apenas a campanha ativa é montada. Movimento reduzido, foco, ponteiro, aba oculta e saída do viewport suspendem a rotação.
- Perfumaria: `sizes` corrigido para a largura real da arte Dove; foto e texto separados no celular. As imagens existentes de marcas foram preservadas.
- A faixa inferior rasterizada virou cartões HTML, legíveis no celular. Temas e atendimento consultivo preservados, sem criar datas ou condições comerciais.

## Arquivos

- `src/app/(site)/produto/[slug]/page.tsx`
- `src/components/site/product-image-viewer.tsx`
- `src/components/site/product-share-button.tsx`
- `src/components/site/product-purchase-panel.tsx`
- `src/components/site/product-cashback.tsx`
- `src/components/site/delivery-estimator.tsx`
- `src/components/site/home-page.tsx`
- `src/components/site/perfumery-carousel.tsx` e `.module.css`
- `next.config.ts`: qualidades 75 (padrão) e 84 (campanhas) explicitamente permitidas.
- Três WebP `public/banners/hero-*-v2.webp`; proveniência e prompts em `13-assets-institucionais.md`.

## Referências e decisões

- [Droga Raia: página de produto](https://www.drogaraia.com.br/losartana-potassica-50-mg-teuto-generico-30-comprimidos-revestidos.html): referência de organização de conteúdo, sem copiar alegações clínicas, preços ou regras comerciais.
- [Baymard: imagens adicionais e miniaturas](https://baymard.com/research-articles/always-use-thumbnails-additional-images): imagens devem ser acessíveis e facilmente identificadas. Como o cadastro atual possui apenas uma imagem, não foram criadas miniaturas ou ângulos fictícios.
- Barlow, cores existentes, componentes Radix e Next Image preservados. Nenhuma dependência nova, API ou migration.

## Validação realizada

Página real renderizada com um fixture exclusivamente local em memória, sem banco ou dados de clientes. Fixture e rotas de demonstração removidos antes do build.

- 108 testes existentes passaram; cobrem contratos de produto, estoque, checkout, cashback e autenticação.
- Playwright: desktop/mobile, 320, 390, 768, 1024 e 1440 px sem overflow horizontal.
- Zoom por teclado, limite 200%, área rolável, centralização, Escape e devolução do foco; compartilhamento por clipboard.
- Quantidade de 1 até o estoque de teste, total calculado em centavos e sincronizado na barra fixa; adicionar abre carrinho com a quantidade e comprar abre checkout, sem enviar pedido.
- CEP incompleto, dentro e fora da cobertura; acordeões e âncoras abaixo do header.
- Receita, Farmácia Popular, estoque zero, imagem ausente/quebrada e preço sem promoção.
- Três campanhas em cinco larguras; três marcas de perfumaria em quatro larguras; sem erros JavaScript.
- Celular 390 px com DPR 3: swipe por eventos reais de toque, setas, pausa e alteração de movimento reduzido. Só um banner solicitado inicialmente.

## Peso medido

Gates finais: `npm.cmd run build`, `node node_modules/eslint/bin/eslint.js .`, `node node_modules/typescript/bin/tsc --noEmit`, `npm.cmd run prisma:validate` e `git diff --check` concluídos com código zero. `npm.cmd audit --audit-level=moderate --json` com `NODE_OPTIONS=--use-system-ca`: zero vulnerabilidades. Lint/TypeScript via scripts npm também passaram durante a implementação.

Os três novos originais WebP somam **271.374 bytes**, contra **302.180 bytes** dos três heroes anteriores mais a faixa rasterizada removida da renderização (redução de 10,2%). Os arquivos antigos permanecem disponíveis para reversão e metadados, mas não integram esses banners visíveis.

No navegador local, a primeira imagem otimizada transferiu **15.812 bytes** em desktop 1440 px/DPR 1 e **25.754 bytes** em celular 390 px/DPR 3. São medidas da imagem, não do peso total da página; formato, cache e navegador podem alterar os valores. O carrossel não baixa antecipadamente as outras duas campanhas.

## Cuidados

- Novas fotografias são ilustrativas, com legenda, sem prometer marcas ou disponibilidade.
- Não aplicar uma camada branca sobre os produtos nem ampliar uma fonte de baixa resolução para simular detalhe.
- Não publicar fixtures, imagens PNG de geração, capturas de QA, logs ou credenciais. Somente WebP final e código entram no Git.

## Logo e formas de pagamento no mobile em 23/10/2026

A área da logo no celular usa uma cápsula com ponta direita totalmente arredondada, contorno vermelho e encaixe na borda esquerda, seguindo o acabamento do desktop. O SVG original, seu ciclo e proporções continuam intactos; o sinal de mais aparece como parte da montagem original. A alternativa estática para movimento reduzido e o atalho Painel admin mantêm seus contratos. Desktop não recebe uma nova animação.

O acordeão Formas de pagamento usa o componente apresentacional `product-payment-methods.tsx`: Pix em destaque com símbolo oficial e percentual da constante existente, cartão e dinheiro em blocos compactos. O texto explica que o desconto entra ao escolher Pix no checkout, condições de cartão são confirmadas na finalização e dinheiro depende de retirada/entrega local. Substitui a orientação antiga de Pix somente após confirmação da equipe e a afirmação de que não há campos de cartão, pois o fluxo online usa campos seguros do provedor. Nenhum campo, chamada de gateway, preço, método selecionado ou cálculo financeiro foi modificado.

Direção visual: varejo claro, cápsula da marca como assinatura e hierarquia de Pix em verde suave, com os tokens, fonte Barlow e ícones existentes. Sem dependência ou asset novo. DFII 14 (impacto 3, adequação 5, viabilidade 5, desempenho 4, risco 3). A mudança é restrita à apresentação e ao texto; não altera o Pix de 3% somente após seleção documentado em [83](83-desconto-pix.md).

Validação: 13 cenários visuais com CSS/fontes reais (sete Chromium e seis WebKit), 320/390/430 px, desktop 1440 px, ADMIN em 320 px, CUSTOMER em 390 px e movimento reduzido. Sem overflow horizontal, erros JavaScript ou escritas externas. Revisão independente recomendou reduzir o padding abaixo de 360 px para preservar folga das ações; ajuste aplicado e cenários repetidos. Onze testes direcionados e 448 de segurança aprovados; lint dos arquivos alterados, typecheck e build local aprovados. Auditoria de produção sem vulnerabilidades; completa mantém cinco HIGH de desenvolvimento registrados em [95](95-correcao-next-15-seguranca.md). Capturas e resultado publicado ficam em `outputs/mobile-logo-pagamento-2026-10-23`, fora do Git. WebKit automatizado não comprova teste em iPhone físico.

## Organização mobile em 22/10/2026

A página de produto usa espaçamentos menores abaixo de 640 px, imagem com altura limitada, nome com quebra de linha e preço de 36 px. Quantidade e total permanecem juntos; adicionar ao carrinho e comprar agora mantêm áreas de toque de pelo menos 44 px. A consulta de entrega usa uma coluna flexível para o CEP e outra para o botão.

O cabeçalho mobile preserva a marca oficial, seu ciclo original de animação e a alternativa estática para movimento reduzido. A faixa superior tem 52 px, com título e condição em duas linhas. O acesso Painel admin continua visível para as mesmas sessões autorizadas. Nenhum SVG, imagem institucional, rodapé ou regra de acesso foi alterado.

Miauby e WhatsApp usam atalhos de 44 px lado a lado no celular. Nas páginas de produto, os atalhos fechados ficam ocultos enquanto a área de compra estiver visível. Após a área de compra, ficam acima da barra de compra rápida. Com a conversa aberta, os atalhos descem para baixo do chat; a janela respeita as áreas seguras superior e inferior. `IntersectionObserver` acompanha a compra, com um `MutationObserver` temporário para conteúdo de rota carregado depois do layout; ambos são desconectados ao sair da rota. Desktop mantém a disposição vertical.

### Arquivos e validação

- Layout: `src/app/(site)/produto/[slug]/page.tsx`, `site-header.tsx`, `announcement-bar.module.css`, `product-image-viewer.tsx`, `product-purchase-panel.tsx`, `delivery-estimator.tsx` e `floating-whatsapp.tsx` em `src/components/site`.
- Regressão: `src/features/miauby/floating-mobile-ui.test.ts`, com conteúdo tardio, mudança de largura, atalhos ocultos durante a compra, geometria do chat e hit-test de Enviar. Uma falha de sobreposição foi reproduzida antes da correção e o teste passou depois.
- Fixture local com produto e conta ADMIN fictícios: Chromium em 320, 390, 430, 768 e 1440 px, mais ADMIN em 320 e 390 px; WebKit em 320 e 390 px. Nove cenários sem overflow horizontal ou erros JavaScript. Quantidade, total, carrinho e checkout conferidos sem transmitir pedidos; requisições de escrita respondidas somente no fixture local.
- Três mensagens da faixa superior conferidas com animação normal em 320 e 390 px, sem texto cortado. Capturas inspecionadas em celular e desktop. WebKit automatizado não equivale a teste em um iPhone físico.
- 54 testes direcionados passaram com `node --import tsx --test` (regressão mobile, produto, política de compra, galeria, placeholder, referência de frete e carrinho); `npm.cmd run test:security`: 444 testes passaram.
- `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run build`, `npm.cmd run prisma:validate` e `git diff --check` passaram. O build local informou indisponibilidade da configuração de bandeiras de pagamento nesse ambiente; nenhuma integração de pagamento foi alterada.
- `npm.cmd audit --omit=dev --audit-level=high --json`: zero vulnerabilidades de produção. Auditoria completa: cinco HIGH preexistentes de desenvolvimento (`@next/eslint-plugin-next`, `eslint-config-next`, `braces`, `fast-glob`, `micromatch`), preservados como pendência do documento 95; sem atualização de dependências nesta entrega.

Não há migration nem alteração comercial. Capturas e relatórios ficam em `outputs/mobile-produto-2026-10-22`, ignorados pelo Git; auxiliares de QA e navegadores de teste ficam na pasta temporária da tarefa. Publicação deve recriar somente o aplicativo, preservando a imagem anterior para reversão.
