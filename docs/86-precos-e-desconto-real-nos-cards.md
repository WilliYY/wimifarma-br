# 86 — Preços e desconto real nos cards

## Pedido e limites — 20/10/2026

O lojista pediu mais destaque comercial, com “de/por” e percentual nos produtos. A referência não é aumentada artificialmente para simular oferta. O percentual ADMIN do distribuidor é acréscimo sobre o custo e continua privado; não é utilizado como desconto.

O card compara preços cadastrados com a condição real já aprovada de 3% no Pix. Não houve alteração de preço no banco, acréscimo, promoção, estoque, pedido, gateway ou regra de cobrança.

## Apresentação

- Produtos compráveis exibem referência riscada com “De”, valor em destaque com “Por” e “no Pix”, preço sem desconto Pix e a condição visível “Para 1 unidade.”
- Sem promoção cadastrada, a referência é o preço normal atual, disponível sem o desconto Pix. O selo mostra o percentual da constante `PIX_DISCOUNT_PERCENT`, compartilhada com o checkout.
- Havendo promoção real, `price` é a referência e `promotionalPrice` é a base atual. O percentual da promoção e os 3% Pix permanecem separados: R$ 100,00 por R$ 80,00, com Pix de R$ 77,60, não é anunciado como 23% OFF.
- Exemplo do sabonete: preço normal R$ 3,44 e preço de uma unidade no Pix R$ 3,34. Não há preço anterior fictício ou promessa de que a referência foi praticada historicamente.
- O cálculo usa `pixDiscountCents()` em centavos. Não há uma segunda fórmula monetária ou percentual configurável criado para essa apresentação.
- A prévia de cashback usa o valor unitário exibido, após o Pix, e continua estimada antes do resgate de saldos. Nenhum benefício é creditado pelo card.
- Itens sem estoque, Farmácia Popular, controlados e demais produtos que exigem atendimento assistido não recebem essa prévia de Pix. Aplica-se a mesma `requiresPurchaseAssistance()` das ações de compra. Uma redução arredondada a zero não gera comparação ou selo Pix.

O componente comum cobre os cards da home, catálogo, resultados completos da busca e relacionados. Autocomplete e detalhe continuam apresentando seus preços regulares; o checkout confirma a condição de pagamento selecionada.

Direção visual: varejo claro, com preço vermelho em destaque e selo Pix verde, preservando Barlow, fotografias, ações e estrutura dos cards. DFII 14 (impacto 3, adequação 5, implementação 4, desempenho 4, risco 2). Sem dependências, animações, tokens globais ou alterações no header/rodapé.

## Carrinho e arredondamento

`CartProduct.unitPriceCents` permanece no preço atual antes do Pix. `originalPriceCents` existe somente para uma promoção real cadastrada, não para representar Pix. O desconto continua sendo aplicado uma única vez no checkout, sobre o subtotal líquido após cashback/WimiCoins e sem desconto no frete, conforme [83](83-desconto-pix.md).

A condição unitária não deve ser multiplicada para reconstruir o total do pedido. Exemplo de centavos: uma unidade de R$ 0,17 aparece como R$ 0,16 no Pix; três unidades somam R$ 0,51 e ficam em R$ 0,49 com o arredondamento canônico do subtotal. A condição “Para 1 unidade.” evita confundir essa referência com a cobrança de várias unidades. Frete e resgates continuam sendo calculados no checkout.

## Arquivos e validação

- Interface: `src/components/site/public-product-card.tsx`.
- Regressão de navegador: `src/components/site/product-card-actions.test.ts`. O fixture prepara bundle/CSS antes da navegação e compila o CSS atual para capturas, sem depender de um build local antigo.
- Documentação: README e documentos 07, 10, 83 e este documento 86.
- RED: quatro testes anteriores aprovados e três novos cenários falharam antes da implementação.
- GREEN: 17 testes focados de card, Pix e política de compra passaram. Sete testes do card passaram novamente com capturas em 320, 390 e 1280 px, incluindo ações existentes, referência verdadeira, promoção/Pix separados, valores originais do carrinho, itens assistidos/indisponíveis e arredondamento de centavos.
- Revisão independente aprovou os dois arquivos sem achados acionáveis. Captura inicial do card inspecionada.
- `npm.cmd run test:security`: 420/420; `git diff --check` passou.
- `npm.cmd audit --omit=dev --audit-level=high --json`: zero vulnerabilidades. A auditoria completa continua com cinco alertas altos já existentes no ferramental de desenvolvimento (`@next/eslint-plugin-next`, `eslint-config-next`, `braces`, `fast-glob`, `micromatch`), zero críticos. Nenhuma dependência foi alterada.
- Build Linux com lint/TypeScript e conferência publicada serão registrados após a execução.

Capturas ficam em `outputs/precos-2026-10-20`, fora do Git. Ensaios usam dados sintéticos e rede interceptada, sem pedidos, cobranças ou mensagens reais. O hook não forneceu um novo escopo temporário; foi criado um escopo exclusivo com `task_cleanup.py init`, usado pelo executor e destinado à limpeza explícita ao concluir.
