# 111 — Expansão de medicamentos e preços dos novos cadastros

## Regra comercial autorizada em 25/10/2026

O lojista respondeu diretamente: **“50% em genéricos/similares e 10% nas marcas éticas”**. A regra vale para os novos medicamentos desta expansão, sobre o custo final unitário da distribuidora, incluindo os tributos e condições comerciais aplicáveis. São acréscimos sobre custo, não margens sobre faturamento nem descontos ao consumidor.

- Genérico comprovado pela apresentação: `supplierMarkupBps: 5000`.
- Similar sem enquadramento como marca ética: `supplierMarkupBps: 5000`.
- Marca ética com segmento comprovado: `supplierMarkupBps: 1000`. O segmento comercial não substitui a classificação regulatória: uma marca ética pode ter registro de similar.
- Segmento ou classificação ainda ambíguos: manter pendente, sem escolher o percentual pela distribuidora ou pelo nome do fabricante.
- Produtos já cadastrados conservam seus percentuais. Não há reprecificação em massa, mudança do fallback técnico do importador ou extensão dos 35% de novas marcas não medicamentosas aos medicamentos.

O cálculo e o arredondamento devem seguir o domínio existente. A apresentação continua sujeita ao teto CMED comprovado. Se o preço com o acréscimo autorizado superar esse teto, aguardar custo menor; não reduzir o percentual automaticamente. Essa decisão preserva a orientação anterior do lojista de manter a margem. Não criar preço anterior fictício, desconto inventado ou promoção a partir do desconto da distribuidora.

## Pesquisa e identidade

O pedido atual contém 111 famílias, transcritas das cinco imagens, além da conferência das marcas chamadas informalmente de “Eze”. A coleta começa por laboratório, incluindo genéricos, similares, marcas éticas, associações e apresentações, sem tratar a planilha antiga como limite do catálogo.

Cada apresentação nova deve receber pesquisa em ANB, Profarma, GAM e DM. A comparação usa o mesmo GTIN e a mesma dose, forma e quantidade. Não substituir uma associação por outra: ezetimiba isolada, ezetimiba com sinvastatina e ezetimiba com rosuvastatina exigem identidades próprias. “Eze” aparece em diferentes marcas e não identifica sozinho um medicamento.

A busca inicial por ingrediente/nome não encontrou correspondência confirmada para as 111 entradas, mas não é uma auditoria exaustiva por marca e EAN. A fonte CMED oficial reutilizada identifica candidatos documentais, sem comprovar disponibilidade comercial. Antes de criar, repetir a deduplicação contra todos os produtos, inclusive excluídos e estoque físico. As três associações ezetimiba/sinvastatina já encontradas no catálogo devem ser preservadas.

Preço, ST, disponibilidade e data pertencem à observação efetiva de cada fonte. Traço não é zero, ausência de resultado não prova falta de estoque e nova leitura de um arquivo antigo não renova a cotação. Na Profarma, medicamento sem ST numérico permanece fora da seleção, conforme [78](78-st-observado-profarma.md). O preço final já inclui ST; na GAM, “Líquido + Imposto” é custo final, sem identificar automaticamente o imposto genérico como ST ou somá-lo novamente. Quantidade por caixa não comprova mínimo de compra nem saldo. Limites diários e campanhas condicionais exigem conferência antes da seleção.

Continuam os contratos de receita, publicidade, imagem e publicação: medicamentos sujeitos a prescrição usam a ilustração institucional pública; uma embalagem disponível na distribuidora não autoriza sua exposição pública. Publicação exige classificação individual, revisão, QA, backup, concessão exclusiva vigente, aplicação única e prova pública. A autorização comercial não equivale à concessão técnica de produção.

## SantaCruz: rota em avaliação

O pedido mais recente autoriza investigar uma rota mais estável. Isso não reativa uma integração nem invalida a suspensão da coleta rotineira. O [manual oficial do Pedido Eletrônico, seção 4.9](https://stcruz.com.br/wp-content/uploads/2023/10/Manual-PedidoEletronico.pdf) descreve **Relatórios → Produto → laboratório → Filtrar → Imprimir/visualizar**. Esse relatório é uma alternativa à rolagem repetida do digitador; sua compatibilidade e exportação na instalação atual ainda precisam ser comprovadas.

A instalação 13.0.003 permitiu observar resultados de EZE, mas o controle da janela e a exportação não foram confiáveis. Não foi obtido arquivo CSV/Excel validado nem confirmada a data de sincronização comercial. A data exibida junto à versão não foi presumida como atualização de preços e estoque. O manual de conversão para Excel de pedidos não comprova exportação de catálogo. Não houve compra, quantidade digitada ou pedido enviado às distribuidoras.

## Evidências desta etapa

As transcrições, autorização direta, observações comerciais, fontes oficiais e pendências ficam em `outputs/medicamentos-grade111-chat5-2026-10-25`, fora do Git. As contagens de pesquisa não são contagens de produtos publicados. Este documento registra a regra e a preparação; não comprova inclusão em produção.
