# Comparação do preço por fralda

O cartão compartilhado de vitrines, catálogo, busca e relacionados mantém o preço atual do pacote em destaque e apresenta o valor por fralda na linha auxiliar. Exemplo sintético: R$ 116,73 por 78 fraldas resulta em R$ 1,50 por fralda; R$ 117,98 por 88 resulta em R$ 1,34. A quantidade do pacote fica no nome e no rótulo acessível do grupo de preço.

O cálculo informativo usa o mesmo valor em centavos do carrinho, incluindo promoção vigente e sem antecipar Pix ou benefícios. Apenas o comparativo é arredondado; adicionar ou comprar continua cobrando um SKU completo. Não compara tamanhos diferentes nem afirma equivalência de modelos.

Sem contagem estruturada no DTO, o helper `diaperPackageUnitPrice` exige produto identificado como fralda, uma única quantidade explícita em unidades/fraldas e preço válido. Números de tamanho, faixa de peso corporal, contagens conflitantes, kits, multiplicadores e campanhas leve/pague não são usados como divisor. Medicamentos e outros tipos de produto ficam fora. Sem apresentação inequívoca, mantém `Para 1 unidade.`; não presume uma unidade por pacote.

Arquivos: `src/features/products/diaper-unit-price.ts`, seu teste, `src/components/site/public-product-card.tsx` e `product-card-actions.test.ts`. Não há alteração de banco, produto, estoque, checkout, cálculo de frete ou dependências.

Validação dirigida cobre centavos, apresentação, casos ambíguos, promoção, preço/quantidade no carrinho e alinhamento em 320/390/1280 px. A fixture identifica corretamente as fraldas como `prescriptionType: UNREVIEWED`; reutilizar a configuração medicinal `ORDINARY` bloqueava corretamente o comparativo. Evidências finais e estado de publicação serão registrados após a integração.
