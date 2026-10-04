# Referências para provedores e taxas de pagamento

Pesquisa em **04/10/2026**, exclusivamente em fontes oficiais públicas. Os números abaixo são preços de referência, não condições negociadas da Wimifarma. Nenhuma conta foi aberta, credencial foi consultada ou cobrança foi criada nesta pesquisa. Mercado Pago continua sendo o provedor contratado; seu contrato operacional está em `28-mercado-pago.md`.

## Comparação das alternativas

| Provedor | Cartão à vista | Cartão em 3x, custo absorvido pela loja | Recebimento e antecipação | Pix e boleto | Condições e fontes |
| --- | --- | --- | --- | --- | --- |
| Asaas | 2,99% + R$ 0,49 | 3,49% + R$ 0,49 sobre a venda | Cartão D+32; parcelado recebido em parcelas. Antecipação adicional a partir de 1,25% ao mês, sujeita a análise, com recebimento em até dois dias úteis | Cobrança Pix R$ 1,99; boleto pago R$ 1,99 | Conta/manutenção gratuitas. Promoção de novos clientes: 90 dias, 1,99% + R$ 0,49 à vista, 2,49% + R$ 0,49 em 2–6x, Pix/boleto R$ 0,99. [Preços](https://www.asaas.com/precos-e-taxas), [prazo e antecipação](https://www.asaas.com/cobranca-cartao) |
| Efí | 3,49% | 3,99% para recebimento parcelado em 2–6x | À vista até 31 dias; parcelado uma parcela a cada 31 dias. Para receber o total: 3,49% mais 1,29% a cada parcela antecipada; não equivaler a um adicional único | Pix dinâmico via API 1,19%; boleto/Bolix pago R$ 3,45 | Abertura/manutenção e integração API gratuitas; condições podem variar por negociação. [Tarifas](https://sejaefi.com.br/tarifas) |
| PagBank | Referência genérica de venda online: 3,99% + R$ 0,40 em 30 dias ou 4,99% + R$ 0,40 em 14 dias | Consultar simulação autenticada; a tabela pública genérica não resolve o custo de 3x da conta | Plano contratado, bandeira e juros absorvidos alteram custo. Link de pagamento tem oferta própria e começa em cinco dias, com recebimento na hora sujeito a análise | Link: Pix 0,99% após promoção; boleto disponível, tarifa contratual a confirmar | Não misturar taxas de maquininha, link e Checkout/API. [Venda online](https://pagbank.com.br/para-seu-negocio/maquininhas/taxas-e-tarifas), [link](https://pagbank.com.br/para-seu-negocio/online/link-de-pagamento/), [taxas do checkout](https://faq.pagbank.com.br/duvida/quais-sao-as-taxas-de-uso-do-checkout/1968) |
| Stripe | 3,99% + R$ 0,39 para cartão nacional | Parcelamento brasileiro em 3x não comprovado nas fontes consultadas; não apresentar como disponível | Prazo e antecipação da conta precisam de confirmação; não comparar como recebimento imediato | Pix 1,19%, somente por convite; boleto R$ 3,45 | Plano Payments padrão sem mensalidade ou configuração; recursos adicionais podem cobrar. Google Pay/Apple Pay disponíveis; cartões locais limitados a Visa/Mastercard na fonte brasileira. [Preços](https://stripe.com/br/pricing), [métodos brasileiros](https://support.stripe.com/questions/accepted-payment-methods-in-brazil?locale=pt-BR) |

No link PagBank, a oferta consultada anuncia 0% à vista Visa/Mastercard e Pix por 30 dias ou até R$ 5.000 vendidos. Após a promoção, publica 4,20% à vista, 13,88% em 6x e 21,20% em 12x. O 3x promocional publicado é 7,08% Visa/Mastercard e 8,81% nas demais bandeiras. Isso não comprova a tarifa regular de 3x nem a condição do Checkout/API da farmácia. [Fonte](https://pagbank.com.br/para-seu-negocio/online/link-de-pagamento/).

Pagar.me foi considerado, mas a página oficial de oferta não forneceu condições atuais verificáveis nesta consulta. Sem proposta comercial, não é possível afirmar tarifa, ausência de mensalidade ou vantagem sobre as opções acima. [Oferta oficial](https://www.pagar.me/oferta).

## Recomendação e comparação correta

**Priorizar Asaas como alternativa para cartão**, condicionado a aprovação cadastral, acesso da conta, homologação e aceite do prazo. A API permite consultar tarifas reais. Em venda de R$ 100, a referência regular equivale a R$ 3,48 à vista ou R$ 3,98 em 3x, sem antecipação. Os valores são cálculos sobre a tabela, não uma cotação da conta. Receber três parcelas posteriormente não equivale a receber o total agora. [Tabela e simulador](https://www.asaas.com/precos-e-taxas).

Para Pix, uma tarifa fixa pode ser pior em compras pequenas: R$ 1,99 equivale a 3,98% de R$ 50. Não existe um provedor universalmente mais barato. Comparar valor final após cashback/frete, método, parcelas, bandeira, custo fixo, prazo, antecipação, promoção vigente e disponibilidade homologada. Tarifas de recebimento por chave/QR estático não substituem a tarifa de cobrança dinâmica integrada. [Asaas](https://www.asaas.com/precos-e-taxas), [Efí](https://sejaefi.com.br/tarifas).

Para ampliar carteiras digitais, PagBank é candidato adicional: seu checkout hospedado documenta cartão, Pix, boleto e carteiras. A escolha deve usar a tarifa autenticada desse produto. A disponibilidade de cada método depende da conta e do dispositivo. [Checkout e Link API](https://developer.pagbank.com.br/docs/checkout), [métodos do link](https://pagbank.com.br/para-seu-negocio/online/link-de-pagamento/).

## Consulta automática das tarifas

O Asaas documenta **`GET /v3/myAccount/fees/`**, sem corpo, com chave no header **`access_token`**. Produção: `https://api.asaas.com`; sandbox: `https://api-sandbox.asaas.com`. A operação recupera condições da conta autenticada, descontos e prazos. O OpenAPI consultado foi atualizado em 08/09/2026; API v3.0.0. [Contrato](https://docs.asaas.com/reference/recuperar-taxas-da-conta).

Campos do contrato:

- `payment.creditCard`: `operationValue`, `oneInstallmentPercentage`, `upToSixInstallmentsPercentage`, `upToTwelveInstallmentsPercentage`, `upToTwentyOneInstallmentsPercentage`, os correspondentes `discount*Percentage`, `discountExpiration` e `daysToReceive`.
- `payment.pix`: `fixedFeeValue`, `fixedFeeValueWithDiscount`, `percentageFee`, `minimumFeeValue`, `maximumFeeValue`, `discountExpiration`, `monthlyCreditsWithoutFee` e `creditsReceivedOfCurrentMonth`. O contrato admite taxa fixa ou percentual; não converter automaticamente uma condição desconhecida em Pix gratuito.
- `payment.bankSlip`: `defaultValue`, `discountValue`, `expirationDate`, `daysToReceive`.
- `anticipation.creditCard`: `detachedMonthlyFeeValue` e `installmentMonthlyFeeValue`. São condições mensais de antecipação, não o custo total antecipado de qualquer venda.

Os exemplos numéricos do OpenAPI não são preços vigentes. Promoções exigem data válida, e a condição precisa considerar liquidação depois da expiração. Dados faltantes/ambíguos exigem revisão; manter o último registro válido como desatualizado, sem declarar sincronização bem-sucedida. Registrar origem e data da consulta. Sem credencial, uma tabela pública permanece referência manual, não tarifa da conta. [Contrato](https://docs.asaas.com/reference/recuperar-taxas-da-conta), [regulamento da promoção](https://central.ajuda.asaas.com/hc/pt-br/articles/32095332785947-Regulamento-Promo%C3%A7%C3%A3o-3-meses-de-taxas-reduzidas).

**Limite:** `POST /v3/anticipations/simulate` exige uma cobrança ou parcelamento existente (`payment`/`installment`) e não funciona no sandbox. Não é uma cotação garantida antes de criar a cobrança. Não solicitar antecipação financeira automaticamente só para descobrir preço. [Simulação](https://docs.asaas.com/reference/simular-antecipa%C3%A7%C3%A3o).

PagBank também oferece **`GET /charges/fees/calculate`** com Bearer token, `value`, `payment_methods`, `max_installments`, `max_installments_no_interest`, BIN e `show_seller_fees`. O objetivo documentado é simular taxas de transação e juros de parcelamento. Validar produto, bandeira e condições retornadas antes de usar como tarifa negociada. [Contrato](https://developer.pagbank.com.br/reference/consultar-taxas-transacao).

Não foi comprovada API pública equivalente para consultar previamente toda a tabela negociada de Stripe, Efí ou Mercado Pago. Não afirmar inexistência; usar condição confirmada manualmente quando não houver integração contratualmente verificada. Não raspar telas privadas ou tratar promoções de marketing como tarifa autenticada.

## Integração segura do Asaas

Usar **checkout hospedado**: `POST /v3/checkouts`, autenticação `access_token`, `billingTypes` com `PIX`/`CREDIT_CARD`, `chargeTypes` com `DETACHED`/`INSTALLMENT`, `externalReference`, `items` e callbacks. Para limitar 3x, `installment.maxInstallmentCount = 3`. A resposta documenta `id`, `link` e `status`. Validar host/HTTPS do `link` retornado; há exemplos oficiais divergentes entre URL com caminho e URL com query, portanto não construir a URL presumindo um formato único. Nenhum PAN/CVV passa pelo servidor da loja. [Criar checkout](https://docs.asaas.com/reference/criar-novo-checkout), [fluxo](https://docs.asaas.com/docs/asaas-checkout).

O Checkout Asaas consultado aceita somente Pix/cartão. Boleto exige fluxo separado de cobrança: `POST /v3/payments`, `billingType = BOLETO`, cliente cadastrado, valor, vencimento e referência. Retorna `invoiceUrl` e `bankSlipUrl`. Não prometer boleto, débito ou carteiras nesse Checkout apenas porque outros produtos Asaas os oferecem. [Boleto](https://docs.asaas.com/docs/cobrancas-via-boleto).

Webhooks usam segredo próprio no header **`asaas-access-token`**, separado da chave API. Eventos de checkout incluem `CHECKOUT_PAID`, `CHECKOUT_CANCELED`, `CHECKOUT_EXPIRED`; `id` do evento permite idempotência. O payload contém `account.id` e `checkout.id`. A entrega pode repetir. Callback de sucesso serve à navegação e não confirma financeiramente o pedido. [Eventos](https://docs.asaas.com/docs/checkout-events), [segurança](https://docs.asaas.com/docs/about-webhooks).

`GET /v3/payments?checkoutSession=<id>` permite localizar as cobranças canônicas vinculadas ao checkout. Conferir conta, checkout, referência, valor, método e estado no provedor, inclusive parcelas e eventos de estorno/contestação. Conservar a mesma cobrança em falha incerta; não trocar de gateway para cobrar novamente sem resolver a primeira. [Listagem](https://docs.asaas.com/reference/list-payments).

## Pendências e condição de encerramento

A pesquisa recomenda um candidato; não comprova conta apta para a farmácia, cobrança homologada ou taxa contratual. Não foi localizada autorização específica de atividade farmacêutica nas fontes consultadas. Confirmar enquadramento com o provedor, preservando itens com receita/Farmácia Popular fora do checkout conforme `28-mercado-pago.md`.

Para ativar: aprovação da conta, credenciais no cofre existente, consulta autenticada de tarifas, decisão sobre recebimento/antecipação, testes de pagamento/recusa/expiração/recarregamento/duplicação/estorno e ativação explícita. Roteamento só pode selecionar provedores realmente conectados, homologados e aptos ao método. A leitura de tarifas não habilita cobrança.
