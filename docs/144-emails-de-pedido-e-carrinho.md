# E-mails de pedido e lembrete de carrinho

A confirmação entra na fila junto com a compra. Os e-mails seguintes acompanham **Confirmado**, **Em separação**, **Pronto para retirada** ou **Pronto para envio**, **Saiu para entrega**, **Concluído** e **Cancelado**. Retirada não passa pela saída para entrega. Se o pedido avançar antes do processamento, a fila descarta a etapa desatualizada. Pagamento pendente aparece como tal.

O destinatário precisa ser a conta ativa titular do pedido e ter o mesmo endereço do checkout. A prova vem da confirmação em Minha Conta ou de um novo login Google com perfil verificado e endereço Gmail exato. Compras de visitantes e endereços alternativos no checkout ficam sem envio automático. O e-mail inicial mostra nome e quantidade dos itens comuns cuja classificação permite divulgação na criação e no envio. A lista completa, incluindo itens que revelem dados de saúde, fica em **Minha conta → Pedidos**.

O lembrete depende de autorização para o carrinho atual. A opção começa desmarcada. O cliente pode desligá-la no carrinho ou pelo link do e-mail. A fila prepara uma mensagem genérica depois de 24 horas sem alterações sincronizadas. Compra, esvaziamento sincronizado, retirada da autorização e itens inelegíveis suprimem o envio. Apenas carrinhos de higiene e perfumaria classificados e disponíveis no estoque próprio são elegíveis. O modelo convida a voltar e conferir preço e estoque.

## Operação

- `CUSTOMER_ORDER_EMAIL_MODE=enabled` liga os e-mails do pedido. `CUSTOMER_CART_EMAIL_MODE=enabled` liga o lembrete. Cada modo começa desligado e exige `BREVO_API_KEY`, `BREVO_SENDER_EMAIL=pedidos@emails.wimifarma.com.br` e `BREVO_SENDER_NAME=Wimifarma`.
- Aplique `20261113110000_customer_commerce_email` antes de publicar o app. O processo Node verifica a fila a cada 30 segundos, com reserva atômica por evento. Nova tentativa só ocorre após falha anterior à chamada. Resposta incerta fica em `UNCERTAIN`. Aceitação pela Brevo não comprova entrega.
- A outbox guarda referências. O registro de carrinho guarda o endereço confirmado e IDs de itens para revalidar a elegibilidade. Remove IDs ao cancelar ou reservar para submissão, e remove registros expirados após um dia. Antes de chamar a Brevo, o worker reconfirma estado e identidade. Uma submissão já iniciada pode ser aceita mesmo após mudança de pedido ou cancelamento.
- Homologue com o endereço interno e dados sintéticos. Confira confirmação, etapa, lembrete, descadastro e ausência de marca do provedor na caixa de entrada antes de ativar. A fila registra resultados sem e-mail, conteúdo ou chave nos logs.
- Os e-mails têm identidade oficial e rodam em separado dos avisos Miauby no WhatsApp. Os disparos do WhatsApp seguem [97](97-operacao-admin-e-etapas-whatsapp.md).

O lembrete com incentivo é comunicação comercial. O link de descadastro aparece em HTML e texto. [Classificação das mensagens na Brevo](https://help.brevo.com/hc/en-us/articles/360021196220-What-are-the-differences-between-marketing-transactional-and-automation-emails) · [Descadastro no carrinho abandonado](https://help.brevo.com/hc/en-us/articles/9741388688402-Do-I-need-to-add-an-unsubscribe-link-to-my-emails).
