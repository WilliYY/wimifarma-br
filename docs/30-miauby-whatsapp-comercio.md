# Miauby: alertas comerciais por WhatsApp

## Escopo e operação

A Miauby do site mantém seu chat de catálogo. Os avisos comerciais usam o canal WhatsApp já conectado no projeto separado `wimifarma-com`, através de uma ponte exclusiva. Não compartilham banco, contatos de clientes, comandos financeiros ou token interno amplo do legado.

O proprietário autorizou receber alertas no seu próprio WhatsApp terminado em **1531**. O destino é fixo no servidor da ponte e não pode ser alterado pelo navegador ou pelo payload. A página `/admin/miauby` e sua API são exclusivas de ADMIN; colaboradores e clientes não acessam suas configurações ou histórico.

- **Carrinho:** envia um resumo sem identificação do visitante depois de 30 segundos sem alteração. O servidor confere produtos, estoque e preços. Um cookie HttpOnly assinado, válido por 24 horas, agrupa os avisos por navegador em janelas de dez minutos. Existe espera adicional de 15 segundos na fila; esvaziar o carrinho cancela avisos ainda pendentes. Não significa abandono nem compra. Alterações atualizam somente o resumo que ainda não teve tentativa de envio.
- **Pedido recebido:** entra na fila na mesma transação que registra o pedido. Não representa aprovação do pagamento.
- **Pagamento confirmado:** entra na fila somente após conciliação autenticada do gateway que muda o pedido para PAID. Webhooks repetidos não duplicam esse aviso. Pagamentos combinados manualmente não são apresentados como confirmação do gateway.
- **Teste:** botão administrativo envia um aviso explicitamente fictício ao mesmo destino, sem criar pedido, cobrar, comprar etiqueta ou alterar estoque.

A área mostra conexão, controles individuais e últimos 30 eventos. A foto fornecida pelo lojista foi preservada em `public/brand/miauby-avatar.webp`, com 640 × 640 px e cerca de 18 KB.

## Persistência e segurança

`MiaubyConfig` guarda as opções. `MiaubyEvent` é uma outbox persistente com chave única por pedido/tipo ou janela de carrinho. Um worker Node de produção consulta a fila a cada 30 segundos e reserva atomicamente até dez eventos. A migração é aditiva e não altera pedidos, pagamentos ou produtos.

Estados: PENDING, PROCESSING, SENT, FAILED e UNCERTAIN. SENT confirma **aceitação com identificador do provedor**, não entrega ao aparelho. O canal atual não fornece conciliação de recibos de entrega. Timeout, resposta ambígua ou interrupção durante o envio tornam o evento UNCERTAIN, sem repetição automática. Bloqueios detectados antes do envio permitem até cinco tentativas com espera progressiva. O texto fica congelado após a primeira tentativa para preservar o fingerprint da ponte.

A ponte reserva o mesmo evento em seu próprio PostgreSQL antes de invocar o transporte, protegendo contra concorrência e repetições entre processos. Avisos de carrinho pendentes expiram em dez minutos. Eventos finais SENT/FAILED no BR são removidos após 60 dias; incertos continuam disponíveis para conferência. A ponte mantém a deduplicação mesmo após a limpeza do BR.

Os avisos incluem nomes públicos dos produtos, quantidade, valores, número do pedido e modalidade de entrega. Não contêm nome, telefone, endereço, documento ou dados de cartão do cliente. Histórico e credenciais não entram no Git.

## Configuração e publicação

Criar a rede externa antes de usar o Compose de qualquer dos dois projetos:

```sh
docker network create wimifarma-miauby-bridge-network
```

Somente os serviços `wimifarma-br-app` e `wimifarma-miauw-whatsapp` participam. Não conectar bancos ou publicar nova porta.

No servidor BR, configurar `MIAUBY_COMMERCE_URL=http://wimifarma-miauw-whatsapp:3400/miauw/whatsapp/commerce`, `MIAUBY_COMMERCE_TOKEN` com segredo exclusivo de pelo menos 32 caracteres e `MIAUBY_COMMERCE_RECIPIENT_HINT` mascarado. No serviço legado, definir o mesmo token, `MIAUBY_COMMERCE_RECIPIENT` aprovado e `MIAUBY_COMMERCE_ENABLED=true`. O canal WhatsApp existente também deve estar ativo.

Publicar primeiro a ponte; aplicar a migração BR antes de recriar o app. Verificar status e enviar um teste administrativo; depois ativar as opções solicitadas. O token interno financeiro não deve ser reutilizado. Para parar os avisos, desativar o controle geral no painel; isso cancela somente eventos comerciais pendentes, preservando os comandos do bot legado.

## Validação

`npm run test:miauby`, testes de pagamentos/frete, lint, typecheck, Prisma validate e build Linux. `scripts/payment-db-audit.ts` aceita apenas banco descartável `wimifarma_payment_test` em loopback e `PAYMENTS_DB_TEST=isolated-disposable`: cria compra fictícia, usa gateway simulado e confere eventos únicos de pedido/pagamento. Essa auditoria não representa cobrança real nem nova homologação do Mercado Pago. A evidência operacional da publicação deve registrar separadamente o teste real do canal e a cotação do Melhor Envio.
