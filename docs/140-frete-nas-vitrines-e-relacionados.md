# 140 — Consulta de frete nas vitrines e nos relacionados

## Conferência e ajuste — 02/11/2026

A conferência pública encontrou `Ver frete` nos 24 cartões da primeira página do catálogo, nos nove resultados de sabonete Rexona e nos 24 cartões de Medicamentos. Os 45 cartões de produto da home não tinham essa ação; os oito relacionados na ficha também não ofereciam o atalho. A ficha já tinha o simulador por CEP. A contagem da home separa os 15 artigos de avaliações dos cartões de produto. Os números são da observação datada, não um contrato fixo de quantidade.

O pedido atual amplia o comportamento descrito na primeira versão do documento 132:

- As vitrines da home e os produtos relacionados passam a usar a opção `showShippingEstimate` do cartão existente.
- A home mantém um único `CatalogShippingProvider` compartilhado entre as vitrines, com CEP somente em memória durante a página. Relacionados usam um provider na sua própria superfície.
- A consulta abre o mesmo diálogo, considera uma unidade e só envia a solicitação após o cliente preencher e confirmar o CEP. Abrir o diálogo não adiciona produto ao carrinho nem consulta a transportadora automaticamente.
- Fechamento, retorno de foco, troca de produto, cancelamento de resposta antiga, arraste, teclado e preferência de movimento reduzido preservam os contratos existentes.

Catálogo, busca, ofertas, categorias, marcas e simulador direto da ficha mantêm suas integrações. Cartões informativos de medicamentos em pesquisas por assunto continuam sem ações comerciais.

## Cálculo e elegibilidade

Não há mudança de API, preço, estoque, cadastro físico, classificação de carga ou aprovação de transporte. Produtos sem estoque, removidos ou assistidos conservam os estados do documento 139. Não se atribui frete grátis genérico a todos os itens.

Na amostra real, as simulações nacionais de sabonete, medicamento, shampoo e fralda retornaram HTTP 200 com sete, duas, sete e sete opções, respectivamente. São estimativas, sujeitas a data/CEP/quantidade/serviço e às revisões logísticas existentes. Sabonete para Ivaté retornou modo local; losartana sem estoque retornou HTTP 409, sem opções. Nenhum pedido, pagamento, etiqueta ou ativação logística foi criado.

Evidência inicial: `outputs/frete-superficies-2026-11-02/api-qa.json`. A ampliação da interface permanece em validação até o registro de publicação abaixo.
