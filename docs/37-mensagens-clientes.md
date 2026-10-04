# 37 - Mensagens canônicas para clientes

## Escopo desta etapa

O painel Miauby ADMIN integra uma prévia de seis eventos, seleção WhatsApp/e-mail e cópia local. Cada exemplo é marcado como TESTE e fictício; não envia nada. Alertas já existentes ao proprietário também passam a incluir valores dos itens/subtotal/frete/descontos, preservando destinatário fixo e estados reais.

`src/features/communications/customer-messages.ts` prepara uma representação única para WhatsApp e e-mail: saudação da Miauby, evento, número do pedido, subtotal, frete, descontos, total, modalidade, estados reais e cashback informado. Os itens, quando autorizados, mostram quantidade, preço unitário e total. O texto do WhatsApp é o mesmo do e-mail; o HTML escapa o conteúdo recebido. Os assuntos são genéricos e nunca incluem produtos ou inferências de saúde.

É um gerador puro, sem envio, fila, banco, cadastro de contatos ou cálculo de benefícios. A ponte WhatsApp atual continua destinada ao proprietário, conforme `30-miauby-whatsapp-comercio.md`. E-mails continuam sem provedor conectado, conforme `33-emails-clientes.md`. Não há automação de clientes ativada nesta entrega.

## Eventos e verdade comercial

| Evento | Condição e conteúdo |
| --- | --- |
| `CART_ABANDONED` | Carrinho não vazio, sem pedido criado/conversão e pagamento pendente. Lembrete de continuidade; preço e estoque devem ser revalidados no retorno. |
| `ORDER_RECEIVED` | Pedido registrado; informa seu estado atual. Pagamento pendente não vira confirmação de pagamento. |
| `PIX_CREATED` | Pedido pendente, não expirado e página HTTPS da própria aplicação, autorizada para o destinatário e protegida pela autenticação existente. Orienta consultar o QR real; não cria QR, código Pix ou pagamento. |
| `PAYMENT_REMINDER` | Apenas pagamento pendente, sem cancelamento, reembolso, expiração ou pedido concluído. |
| `PAYMENT_CONFIRMED` | Apenas `PAID`, com estado confirmado na fonte confiável. O renderizador não confirma gateway nem altera o pedido. |
| `POST_SALE` | Apenas `COMPLETED` + `PAID`; solicita opinião sincera e aceita qualquer nota. Explica o bônus possível de 1% nos produtos elegíveis, sem conceder crédito. |

Pedidos cancelados e pagamentos cancelados/reembolsados não geram essas mensagens. A integração deve entregar um snapshot atual obtido no servidor, e revalidá-lo antes do envio. O parâmetro `paymentExpired` deve ser calculado da expiração real do gateway; nenhum relógio ou gateway é consultado pelo gerador.

Todos os valores são centavos inteiros seguros. O subtotal deve corresponder aos itens, o total de cada item ao preço unitário vezes a quantidade, e o total final ao subtotal mais frete menos descontos. Descontos são linhas explícitas; não subtrair novamente dos totais. Cashback previsto não é saldo. Cashback creditado só aparece com pedido concluído e pago, usando valor já lançado informado pelo servidor. Saldo ausente permanece ausente; saldo negativo por estorno é preservado. Esta etapa não cria Wimicoins, saldo, avaliações ou benefícios.

## Privacidade e autorização da futura integração

Por padrão, o corpo omite nomes dos produtos e informa apenas a quantidade de unidades. `includeItems: true` exige `recipientVerified: true`; essa opção só pode ser configurada pelo servidor depois de conferir o titular e a autorização para receber detalhes naquele canal. Os parâmetros não substituem verificação de identidade. Para visitantes, o contato deve ser verificado e vinculado legitimamente ao pedido antes de qualquer envio. Não usar apenas coincidência de telefone/e-mail para vincular compras a contas.

O link Pix exige `paymentPage.authorizedForRecipient`, destinatário verificado e `trustedOrigin` proveniente da configuração do servidor. Usa a rota existente `/checkout/pagamento/{orderId}`, com ID vinculado ao snapshot, sem query, fragmento ou credenciais no URL. Autorização de acesso continua obrigatória na API: conta titular ou cookie assinado do navegador que criou o pedido. Conhecer o ID não autoriza visualização. Visitantes sem esse acesso não recebem um link inventado: o evento não produz mensagem nessa etapa.

Não segmentar por diagnóstico, medicamento, receita ou princípio ativo. Não incluir dados clínicos no assunto, metadados de campanhas ou logs. Mensagens transacionais e marketing devem manter finalidades, controles e consentimentos separados; carrinho abandonado e convites promocionais de pós-venda dependem da autorização aplicável e da supressão por descadastro. Não importar clientes existentes como inscritos.

Antes de ativar entregas, implementar conta/remetente autenticados, consentimento e supressão, destinatário verificado, cancelamento ao comprar/esvaziar, limites de frequência, idempotência por pedido/evento, auditoria mínima e quarentena de envio incerto sem repetição automática. Testar primeiro com destinatário interno autorizado e dados sintéticos. Nenhuma compra deve depender do sucesso de comunicação.

Avaliações permanecem autênticas. Não gerar avaliações fictícias nem exigir cinco estrelas. O bônus existente considera notas de 1 a 5 igualmente e exige as condições de `16-cashback-avaliacoes-resgate.md`, incluindo primeira avaliação e exclusão de produtos com receita/Farmácia Popular. Não há incentivo para Google Maps.

## Validação

Testes puros em `src/features/communications/customer-messages.test.ts`: consistência monetária, estados de pagamento, bloqueio de cancelados/expirados, privacidade, escape HTML, acesso ao link Pix, saldo não inventado e convite de avaliação autêntica. Execução: `node node_modules/tsx/dist/cli.mjs --test src/features/communications/customer-messages.test.ts`. Nenhum teste envia mensagens nem consulta dados reais.
