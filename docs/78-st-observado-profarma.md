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

Regressões cobrem ausência/retorno de ST, zero explícito, valores inválidos, mesmo EAN, MIP, perfumaria/higiene, estoque físico, importação e perda de ST entre reserva e pagamento.

## Implantação verificada

Código `dd31610` enviado ao GitHub e publicado na VPS em **19/10/2026, às 22h de Brasília**. Backup custom validado, migração aditiva sem backfill, imagem anterior preservada e aplicação saudável. PostgreSQL e proxy compartilhado não foram reiniciados.

- `npm.cmd run test:suppliers`: **98 aprovados**. `npm.cmd run test:security`: **387 aprovados**. Mais **39 testes** direcionados de criação de checkout, schema do pedido, catálogo e busca passaram. Lint, typecheck, Prisma validate e build passaram. Revisão independente do código e dos scripts operacionais aprovada após corrigir casos de classificação desconhecida/persistida e fixtures de QA.
- Auditoria de produção: **zero vulnerabilidades**. Auditoria completa: **cinco high de desenvolvimento** em `braces`, `micromatch`, `fast-glob`, `@next/eslint-plugin-next` e `eslint-config-next`, sem alteração forçada de dependências.
- QA PostgreSQL vazio, separado da produção e com dados somente sintéticos: migração, alternativa ANB para mesmo EAN, checkout, reserva, impedimento de iniciar pagamento sem ST, retorno com zero explícito, custo sem ST duplicado, importação dry-run/apply e classificação persistida nula passaram. Sem chamada externa. Pedidos e reservas de teste mantiveram seus valores; nenhum pagamento real foi criado.
- Produção: hashes de todos os produtos, ofertas (desconsiderando somente a nova coluna nula), usuários, clientes, pedidos, itens e reservas permaneceram iguais. **377 produtos** mantidos. **304 cosméticos disponíveis**; nenhuma data de observação/validade, preço, foto, cota ou estoque físico foi alterado nesta entrega.
- **33 produtos de medicamento** tinham oferta Profarma com ST ainda não registrado. **23** possuíam alternativa elegível e **10** estavam sem oferta elegível no momento da conferência. Isso não constitui nova consulta aos fornecedores: ofertas legadas não ganharam comprovação retroativa.
- Leitura HTTPS real: revisão de carrinho de **375 produtos ativos em 13 lotes**, com preços, origem e quantidade de compra conferidos; sem exposição de custos/ST. Home, login, categoria Dermo, página e busca de cosmético responderam corretamente. Nenhum pedido, cobrança, compra no fornecedor ou mensagem foi criado em produção.

Arquivos alterados: schema/migração Prisma; domínio, schemas e testes de `supplier-catalog` e `supplier-planning`; importador e auditoria sintética; API ADMIN de ofertas; painéis de produto/oferta/planejamento. Documentação: README e documentos 01/06/07/68/78. Provas privadas em `outputs/st-profarma-2026-10-19`, fora do Git/build. A rotina existente continua `PAUSED` e o ST pendente exige observação real antes de voltar à seleção.
