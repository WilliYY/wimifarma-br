# 40 - Asaas: configuração e próxima homologação

## Estado confirmado em 05/10/2026

A conta Wimifarma aparece aprovada no painel Asaas. A página de integrações não possui chaves e o botão **Gerar chave de API** permanece desabilitado. O motivo específico não foi exposto pela interface; aprovação da conta não comprova liberação dessa operação. Não foi criado token, webhook, cliente ou cobrança nesta configuração.

Em **Pagamentos** da Wimifarma foram registrados dois contratos manuais, observados no painel da própria conta, com validade de sete dias e auditoria:

| Método | Tarifa observada | Primeiro recebimento registrado | Uso atual |
| --- | --- | --- | --- |
| Cartão à vista | 1,99% + R$0,49 por venda | 32 dias | Comparação administrativa de 1x |
| Pix dinâmico | Gratuito, ilimitado na tela da conta | 0 dias | Comparação administrativa, sem antecipação |

Para R$100, o comparador mostrou R$2,48 de custo e R$97,52 líquidos no cartão, e R$0 de custo no Pix. São estimativas com contratos válidos, não recebimentos executados. A gratuidade do Pix dinâmico não deve ser confundida com tarifa de Pix manual/estático.

A tela também informou cartão 2–6x em 2,49% + R$0,49 e 7–12x em 2,99% + R$0,49, com promoção até 04/01/2027. Essas faixas não foram registradas como parcelamento homologado. A tarifa fixa é por venda parcelada, não multiplicada por parcela; antecipação e prazo de liquidação de toda a venda precisam de conferência própria. A promoção pode deixar de valer para recebimentos posteriores ao seu término.

## Como será usado

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
