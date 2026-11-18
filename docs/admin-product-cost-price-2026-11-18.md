# Custo, venda e comparação de distribuidoras no catálogo

## O que aparece no painel

O resumo da linha separa **custo utilizado** e **venda**, com a distribuidora da oferta escolhida. Em “Ações e ajuste rápido”, o administrador vê os dois cartões lado a lado e pode abrir a comparação/edição de custos ou o ajuste de venda e classificação. Os demais perfis continuam sem acesso ao custo e às operações financeiras reservadas ao ADMIN.

A fonte é `supplierPricing` da consulta protegida de produtos. Essa oferta já foi resolvida pelo servidor: EAN/apresentação, disponibilidade, custo, tributação, teto aplicável, datas e política de quantidade. A escolha prioriza uma oferta vigente elegível e depois o custo. Uma oferta bruta mais barata pode estar fora das condições necessárias; a interface não refaz essa escolha por conta própria.

## Conferência vencida e continuidade

O catálogo permite, conforme a política de continuidade registrada no documento 94, usar a última oferta elegível vencida quando não houver atualização. O painel descartava esse resultado pelo horário, mostrando “Indisponível” mesmo quando o servidor já havia selecionado a oferta em continuidade. Agora preserva custo e venda resolvidos e mostra **“Conferência vencida · em continuidade”**. Datas não são renovadas. Se o servidor não selecionar oferta, o painel continua sem inventar custo ou preço de venda.

## Editar custo e preço

- **Distribuidora:** o custo pertence à oferta do fornecedor e pode ser revisado na comparação, com código, EAN e dados da conferência. O custo informado é final por unidade, já incluindo ST; não se soma ST novamente.
- **Venda da distribuidora:** segue calculada pelo acréscimo sobre o custo selecionado. O ajuste mostra a prévia e usa a operação existente, com versão do produto, bloqueio para pedidos em aberto e teto aplicável. Não foi criado preço absoluto manual para esse canal.
- **Loja física:** mantém a edição de preço normal e promocional existente. Este módulo não ganhou um campo de custo de aquisição de estoque próprio.

A comparação só consulta ofertas quando é aberta. Cada fornecedor mostra custo cadastrado, situação da conferência e dados de disponibilidade. A marcação **“Usada na venda”** vem da seleção fornecida pelo catálogo. A revisão preenche apenas dados existentes, sem inventar código, saldo ou ST. Disponibilidade, ST e renovação da cota precisam ser conferidas novamente; salvar sem marcar disponibilidade registra a oferta como indisponível. Salvar continua sendo uma conferência manual com a validade e os limites já existentes.

Após salvar, a listagem recarrega custo e venda. Se a atualização visual falhar depois da gravação, a mensagem informa que a oferta foi salva e pede recarregar; não apresenta a gravação como desfeita.

## Limites da alteração

Sem nova API, migration, dependência, alteração de permissão ou nova regra de seleção/preço. As rotas continuam validando ADMIN ativo, identidade, concorrência, datas, ST/CMED e reservas. Nenhum custo, preço, oferta, estoque ou pedido real foi alterado para validar esta entrega. Dados de testes e prévias são sintéticos.
