# 40 - Asaas: configuração e próxima homologação

## Atualização confirmada em 07/10/2026

O botão **Gerar chave de API** foi liberado. A tela de criação foi aberta no Chrome conectado, com nome, expiração opcional e uma permissão separada para saques. A geração, confirmação de segurança e envio da nova credencial foram deixados ao titular, conforme a política da ferramenta de navegador. A orientação é manter **saques desmarcados**. Não houve contratação de plano nem cobrança.

Isso supera o bloqueio observado nos dias anteriores, mas não comprova uma chave criada ou conexão homologada. A consulta de tarifas existente e o checkout Mercado Pago permanecem como antes; nenhum roteamento automático para Asaas foi ativado.

### Integração adequada ao checkout da Wimifarma

A pesquisa oficial de 07/10 confirmou que o Asaas [não oferece tokenização de cartão no front-end](https://docs.asaas.com/docs/pci-dss). Para manter PAN/CVV fora do servidor da Wimifarma, cartão Asaas deve usar a [página hospedada e redirecionamento](https://docs.asaas.com/docs/link-do-checkout-e-redirecionamento-do-cliente). Portanto, o checkout embutido existente permanece com Mercado Pago; não substituir seus campos por coleta de dados de cartão própria.

O [QR Pix estático](https://docs.asaas.com/reference/criar-qrcode-estatico) pode ser criado por pedido com valor fixo, `expirationSeconds: 7200`, `allowsMultiplePayments: false` e `externalReference`. Segundo [conciliação oficial](https://docs.asaas.com/docs/o-que-e-qr-code-estatico), a cobrança nasce ao receber o pagamento; a associação precisa conferir `payment.pixQrCodeId`, conta e valor, inclusive tentativas repetidas e vencidas. Isso é um contrato diferente de cobrança Pix dinâmica. A [central Asaas](https://central.ajuda.asaas.com/hc/pt-br/articles/32040230167067-Quais-s%C3%A3o-as-taxas-para-receber-via-Pix) anuncia até 100 recebimentos mensais gratuitos por chave ou QR estático; do 101º em diante vale a condição da conta. Não transformar essa franquia em tarifa Pix dinâmica zero nem ativar uma escolha financeira sem confirmar o contrato e o consumo da franquia.

Antes de usar esse fluxo, homologar com [conta e chave sandbox próprias](https://docs.asaas.com/docs/sandbox). Webhook valida segredo separado `asaas-access-token`, persiste `event.id` único e responde HTTP **200**, conforme a [FAQ específica](https://docs.asaas.com/docs/faq-de-webhooks). Retorno de navegador não confirma pagamento. `PAYMENT_CONFIRMED` e `PAYMENT_RECEIVED` distinguem confirmação e saldo disponível; tratar estorno/chargeback. Resultado incerto exige reconciliação antes de repetir uma cobrança, inclusive em outro provedor.

Não há vantagem comprovada que exija um terceiro gateway agora: primeiro concluir chave, conexão, tarifa efetiva e homologação Asaas. A documentação pesquisada não comprova cobrança real, QR gerado, expiração bancária ou taxa específica desta conta.

## Estado confirmado em 05/10/2026

A conta Wimifarma aparece aprovada no painel Asaas. A página de integrações não possui chaves e o botão **Gerar chave de API** permanece desabilitado. O motivo específico não foi exposto pela interface; aprovação da conta não comprova liberação dessa operação. Não foi criado token, webhook, cliente ou cobrança nesta configuração.

Em **Pagamentos** da Wimifarma foram registrados dois contratos manuais em 05/10, com validade de sete dias e auditoria. A conferência de 06/10 corrigiu a interpretação da tela de Pix:

| Método | Tarifa observada | Primeiro recebimento registrado | Uso atual |
| --- | --- | --- | --- |
| Cartão à vista | 1,99% + R$0,49 por venda | 32 dias | Comparação administrativa de 1x |
| Pix recebido por cobrança | Não confirmado | Não confirmado | Excluir tarifa zero da comparação até confirmar o contrato |

Para R$100, o comparador mostrou R$2,48 de custo e R$97,52 líquidos no cartão. O retorno histórico de R$0 no Pix não é confiável: a gratuidade estava na aba Movimentações financeiras (pagamentos/transferências), sem comprovar recebimento comercial. O painel agora permite retirar tarifas manuais sem alterar a conexão Mercado Pago; a retirada e sua validação constam no documento 43. Nenhum recebimento foi executado.

A tela também informou cartão 2–6x em 2,49% + R$0,49 e 7–12x em 2,99% + R$0,49, com promoção até 04/01/2027. Essas faixas não foram registradas como parcelamento homologado. A tarifa fixa é por venda parcelada, não multiplicada por parcela; antecipação e prazo de liquidação de toda a venda precisam de conferência própria. A promoção pode deixar de valer para recebimentos posteriores ao seu término.

## Como será usado

Conferência de 06/10: dados comerciais, documentos e conta aprovados; plano atual Básico. A tela Taxas → Integrações informa API e integrações gratuitas. Não contratamos plano mensal, subconta, antecipação ou serviço pago. Mesmo assim, Gerar chave de API permanece desabilitado, sem motivo exposto. A liberação depende do Asaas. Detalhes em [43-frete-estimado-e-validacao-asaas.md](43-frete-estimado-e-validacao-asaas.md).

1. Conectar a chave da conta aprovada ao cofre existente, sem expor a credencial no Git ou devolver seu conteúdo ao navegador. A consulta atual é somente de tarifas: revisão a cada seis horas, validade de 24 horas e histórico de mudanças. Contratos manuais não se atualizam sozinhos.
2. Homologar criação de cobrança, QR Pix, cartão, notificações autenticadas, idempotência, expiração, recusas e estornos em sandbox antes da ativação pública.
3. Persistir o provedor escolhido no pedido antes da primeira cobrança. Só comparar gateways ativos e tarifas válidas para valor, parcelas e prazo aceitos pelo lojista. O menor percentual isolado não determina o menor custo.
4. Confirmar pagamento pelo provedor e alimentar o mesmo histórico, cashback e mensagens da Wimifarma. Redirecionamento de sucesso não equivale a pagamento aprovado. Resultado incerto não permite cobrar novamente em outro gateway.

O checkout público continua usando Mercado Pago. Registrar uma tarifa Asaas no comparador não altera essa decisão e não habilita roteamento financeiro automático.

## Limites de interface e Pix

A documentação oficial oferece checkout hospedado e links de cobrança. Cartão pode ser digitado no ambiente seguro do Asaas; não foi encontrada uma alternativa oficial equivalente aos Bricks para manter campos embutidos. A aplicação da Wimifarma não deve começar a receber PAN/CVV para imitar esse comportamento. Essa escolha de experiência precisa ser resolvida antes da integração de cobrança.

No checkout Asaas, `minutesToExpire: 120` limita a sessão, mas não comprova expiração bancária do QR Pix em duas horas. A API de QR possui regras próprias relacionadas a vencimento e chave Pix. O prazo de duas horas já usado pelo Mercado Pago não deve ser anunciado para Asaas sem confirmação do contrato e teste do provedor.

## Próxima ação necessária na conta

O titular deve verificar dados comerciais de atividade/faturamento, validação de identidade e Token App/SMS; se completos, pedir ao suporte Asaas a liberação do botão de chave API. Nenhum dado financeiro ausente foi inventado. Quando a operação estiver liberada, a geração e confirmação da credencial devem ser concluídas pelo titular. Depois, conectar em **Pagamentos → Conectar consulta de tarifas Asaas**, sem enviar a chave pela conversa.

Essa etapa depende do próprio Asaas e da confirmação de segurança do titular. O trabalho que já foi feito — consulta de tarifas preparada, contratos manuais, simulação e documentação — permanece utilizável enquanto isso.

## Fontes oficiais

- [Chaves API e requisitos](https://docs.asaas.com/docs/chaves-de-api) e [geração pelo painel](https://central.ajuda.asaas.com/hc/pt-br/articles/33618186066331-Como-gerar-uma-nova-chave-de-API-no-Asaas).
- [Tarifas da própria conta](https://docs.asaas.com/reference/recuperar-taxas-da-conta) e [preços/tarifa fixa por venda](https://www.asaas.com/precos-e-taxas). Valores específicos acima foram observados na tela autenticada da conta.
- [Promoção de três meses](https://central.ajuda.asaas.com/hc/pt-br/articles/32095332785947-Regulamento-Promo%C3%A7%C3%A3o-3-meses-de-taxas-reduzidas).
- [Checkout cartão](https://docs.asaas.com/docs/checkout-para-cart%C3%A3o-de-cr%C3%A9dito), [link e redirecionamento](https://docs.asaas.com/docs/link-do-checkout-e-redirecionamento-do-cliente), [FAQ/expiração de sessão](https://docs.asaas.com/docs/faq-do-asaas-checkout) e [QR Pix](https://docs.asaas.com/reference/obter-qr-code-para-pagamentos-via-pix).
