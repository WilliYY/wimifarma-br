# ST observado na seleção de medicamentos Profarma

Regra solicitada pelo lojista em 19/10/2026. Medicamentos da Profarma sem cálculo de ST informado não concorrem como oferta de compra. A regra também cobre MIP/OTC classificados como `MEDICINE`; não bloqueia fraldas, higiene ou perfumaria por ausência desse campo. Esta é uma política operacional de elegibilidade, não uma determinação de isenção tributária.

## Dados e comparação

- `SupplierCatalogOffer.substitutionTaxCents` armazena o valor unitário de ST exibido na mesma observação do preço e da disponibilidade. Traço, campo vazio e cálculo desconhecido são `null`. Zero somente quando explicitamente calculado pelo fornecedor. Valores negativos, fracionários em centavos ou acima do limite financeiro são rejeitados.
- Na Profarma, o **Preço final já inclui ST**. O novo campo comprova a conferência; não é somado novamente ao custo, ao preço ou ao frete.
- Medicamento Profarma com ST desconhecido fica fora da seleção, mesmo que o portal mostre disponibilidade. Outra oferta válida do **mesmo EAN/apresentação** pode vencer pelo menor custo final. Outros EANs continuam produtos diferentes, sem substituição automática de pedido.
- Uma observação nova sem ST remove a comprovação da anterior. Uma nova conferência real com valor numérico devolve a oferta à comparação, respeitando disponibilidade, validade, apresentação, teto e percentual ADMIN. Não renovar datas ou inferir ST a partir de outra distribuidora.
- A migração aditiva não preenche ST antigo. Ofertas legadas de medicamentos Profarma ficam pendentes até nova conferência; ofertas válidas ANB/DM e produtos físicos permanecem sob suas regras existentes. Sem alternativa elegível, o produto continua cadastrado e fica indisponível para nova compra.
- Classificação ausente, inválida ou `UNCLASSIFIED` não comprova que o item seja não medicamento: a Profarma também exige ST nesse estado pendente. Uma classificação não medicamentosa completa e validada permite a dispensa. Em produto existente, o importador usa a classificação persistida mesmo quando nula, sem presumir uma nova classificação que não será salva.

## Fluxos protegidos

O mesmo filtro atende vitrine, busca, revisão de carrinho, checkout, reserva e validação antes de iniciar pagamento. A perda da comprovação após reservar impede uma nova cobrança nessa condição; não reescreve preços, itens, reservas ou pagamentos anteriores. A liquidação de pagamento já confirmado mantém o fluxo idempotente existente.

O cadastro ADMIN aceita salvar a pendência e exibe **Sem cálculo de ST**. A cada conferência, deve informar o ST novamente; o formulário não transporta o valor anterior automaticamente. O importador aceita a observação pendente de produto existente, inclui o valor na auditoria e exige oferta elegível para criar produto novo. Dry-run e apply usam o mesmo manifesto. O simulador manual exige informar se a comparação é de medicamento.

## Operação e validação

Conferir EAN exato na ANB/Profarma/DM quando houver dúvida. O dado de uma fonte não comprova a tributação da outra. Preservar estoque `PHARMACY`, cotas, reservas, consumo, percentuais ADMIN, imagens e preços de pedidos. A rotina programada permanece pausada; a mudança não cria coletor nem renova ofertas.

Regressões cobrem ausência/retorno de ST, zero explícito, valores inválidos, mesmo EAN, MIP, perfumaria/higiene, estoque físico, importação e perda de ST entre reserva e pagamento. O registro de implantação e verificações será acrescentado após execução real.
