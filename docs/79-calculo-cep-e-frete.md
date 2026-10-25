# 79 - Cálculo de CEP e frete no produto e no delivery

Atualização de 25/10/2026: a política por CEP e contribuição do [documento 107](107-frete-cep-e-contribuicao.md) substitui o limite universal de R$ 99,90 citado nos registros históricos abaixo. Falta de perfil logístico e falta de cobertura têm diagnósticos distintos; não houve liberação de medidas ou carga sem revisão.

Correção de 19/10/2026, limitada ao simulador público e à quantidade compartilhada da página de produto. Não altera transportadoras, preços, estoque, perfis logísticos ou regras de compra.

## Causa e reprodução

`DeliveryEstimator` chamava apenas `getDeliveryAvailability`, uma verificação local de CEP. Um CEP nacional válido, como 80010-000, recebia “Entrega pelo site ainda nao disponivel para este CEP” sem consulta ao frete real. O mesmo componente era usado no produto e em `/delivery`.

A consulta pública de endereço respondeu HTTP 200 para Ivaté, Curitiba e São Paulo. A API de frete já retornava PAC e SEDEX para um produto elegível; outro produto respondeu HTTP 422 porque seu perfil ainda não estava liberado. Essa recusa é específica da mercadoria, não prova de ausência de cobertura do CEP.

## Comportamento corrigido

- No produto, consultar `/api/fretes/cotacao` com somente o produto exibido, seu preço atual e a quantidade selecionada. O contexto local `ProductQuantityProvider` liga os controles de compra ao simulador sem modificar o DOM ou o carrinho.
- Em `/delivery`, usar os itens e quantidades do carrinho. Com carrinho vazio, orientar a escolher produtos, sem inventar preço ou negar atendimento à cidade.
- CEP incompleto não faz chamada. Ivaté e o CEP aprovado de Douradina usam a política existente de entrega local gratuita, sujeita à confirmação do endereço completo.
- Fora da área local, reutilizar `createCheckoutQuote`: exibir transportadora, preço e prazo estimados, incluindo preparação. A regra existente de gratuidade usa o subtotal simulado; descontos e composição final são reconfirmados no checkout.
- Alterar CEP, produto, preço, quantidade ou carrinho invalida o resultado anterior. A consulta pendente é cancelada; uma resposta antiga não pode voltar à tela. A nova consulta exige ação do cliente.
- Preservar mensagens de preço/estoque alterado, perfil não liberado, indisponibilidade do provedor e falta de opção para o carrinho. Itens de atendimento assistido não recebem promessa automática de envio nacional.

O simulador não escolhe o serviço do pedido, não cria cobrança ou reserva e não compra etiqueta. O checkout continua responsável por revalidar o frete assinado e os dados comerciais. As permissões de transporte por produto e as regras de receita permanecem no servidor.

## Validação

Regressão de navegador escrita antes da implementação comprovou a falha: a consulta nacional não gerava POST. Testes sintéticos cobrem preço/prazo retornados, produto isolado do carrinho, quantidade, edição durante consulta, erros de perfil/estoque, CEP incompleto, entrega local e consulta do carrinho em `/delivery`. A verificação final de testes, build, auditoria e produção deve acompanhar o registro da entrega; exemplos antigos de preços não são garantia de tarifa atual.
