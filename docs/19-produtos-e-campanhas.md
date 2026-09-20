# Produtos e campanhas

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
