# Produtos e campanhas — revisão de 2026-09-19

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
