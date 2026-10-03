# Miauby: alertas comerciais por WhatsApp

## Escopo e operação

A Miauby do site mantém seu chat de catálogo. Os avisos comerciais usam o canal WhatsApp já conectado no projeto separado `wimifarma-com`, através de uma ponte exclusiva. Não compartilham banco, contatos de clientes, comandos financeiros ou token interno amplo do legado.

O proprietário autorizou receber alertas no seu próprio WhatsApp terminado em **1531**. O destino é fixo no servidor da ponte e não pode ser alterado pelo navegador ou pelo payload. A página `/admin/miauby` e sua API são exclusivas de ADMIN; colaboradores e clientes não acessam suas configurações ou histórico.

- **Carrinho:** envia um resumo sem identificação do visitante depois de 30 segundos sem alteração. O servidor confere produtos, estoque e preços. Um cookie HttpOnly assinado, válido por 24 horas, agrupa os avisos por navegador em janelas de dez minutos. Existe espera adicional de 15 segundos na fila; esvaziar o carrinho cancela avisos ainda pendentes. Não significa abandono nem compra. Alterações atualizam somente o resumo que ainda não teve tentativa de envio.
- **Pedido recebido:** entra na fila na mesma transação que registra o pedido. Não representa aprovação do pagamento.
- **Pagamento confirmado:** entra na fila somente após conciliação autenticada do gateway que muda o pedido para PAID. Webhooks repetidos não duplicam esse aviso. Pagamentos combinados manualmente não são apresentados como confirmação do gateway.
- **Teste:** botão administrativo envia um aviso explicitamente fictício ao mesmo destino, sem criar pedido, cobrar, comprar etiqueta ou alterar estoque.

O carrinho vazio sincroniza somente o cancelamento de avisos pendentes, inclusive ao reabrir o site; não cria um aviso de WhatsApp. Repetições do mesmo estado já sincronizado são dispensadas. Uma atualização em andamento invalida o estado anterior: se o cliente esvaziar novamente o carrinho, o cancelamento aguarda essa atualização para evitar um resumo pendente com produtos removidos.

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

## Publicação e conferência em 03/10/2026

- BR: implementação `138198c` e ajuste de exportação de rota `0af467c`. Ponte legada: `5a1ef9d`. Ambos enviados ao GitHub, compilados no Linux e publicados. O build inicialmente identificou uma constante exportada indevidamente na rota Next.js; ela foi mantida interna antes da publicação.
- Backup privado de ambientes e banco BR em `/home/ubuntu/backups/wimifarma-br/pre-miauby-release/20261003T115230Z`; imagens anteriores preservadas para rollback. Migração aditiva aplicada, 17 migrações concluídas. App saudável e `/api/health` HTTP 200; API administrativa sem sessão retorna 401.
- Testes: geral 155, pagamentos 12, frete 18 e Miauby 37 aprovados; lint sem avisos, typecheck e Prisma validate aprovados. Casos de acesso usam autorização real e rejeitam visitantes, CUSTOMER, STAFF e MANAGER antes de consultar o histórico ou enviar avisos. Legado: 70 testes e build aprovados. PostgreSQL descartável confirmou reserva única em 25 chamadas concorrentes, deduplicação após aceitação, retomada de bloqueio e quarentena de envio incerto.
- Compra fictícia em PostgreSQL isolado passou: estoque concorrente, checkout idempotente, gateway simulado, avisos únicos de pedido/pagamento, conciliação repetida, estorno, cancelamento e falha incerta. Nenhuma transação monetária ou etiqueta foi criada em produção.
- Canal real: status privado retornou conexão ativa, destinatário mascarado e nenhum bloqueio. Opções salvas pelo painel ADMIN. O botão de teste registrou SENT com ID do provedor; a mensagem foi também observada recebida na conversa Miauby Wimifarma do WhatsApp do proprietário às 09:02 (Brasília).
- Aviso real de carrinho observado às 09:08 na mesma conversa, com uma unidade Dove e subtotal do catálogo. O item já existente no navegador do proprietário foi preservado; nenhuma compra, reserva de estoque ou etiqueta foi criada para essa conferência.
- Mercado Pago: consulta autenticada somente de leitura a `/users/me` confirmou conta correspondente, MLB, ambiente produção e pagamento público habilitado. A homologação oficial Pix/cartão continua documentada em `28-mercado-pago.md`; não foi substituída por cobrança fictícia em produção.
- Melhor Envio: simulação real, sem contratação, de Ivaté para CEP 01001-000 com pacote fictício de 1 kg, 20 × 15 × 10 cm e valor de R$ 10 retornou PAC R$ 23,24 / até 9 dias úteis e SEDEX R$ 26,88 / até 5 dias úteis, incluindo preparação. Preços são específicos do ensaio e podem mudar. Cotação nacional pública permanece desligada: medidas reais, conservação e aceitação das mercadorias ainda precisam de conferência pelo responsável.
- Inspeção sintética da interface confirmou 320/390/768/1440 px sem overflow. Em produção, texto, controles e histórico foram conferidos pelo DOM. A extensão não capturou screenshots (timeout) nem aplicou efetivamente o viewport móvel; não tratar essa tentativa como prova visual de mobile em produção.
- `npm audit --audit-level=moderate`, com certificados do sistema, apontou sete vulnerabilidades HIGH em dependências existentes, incluindo `brace-expansion` e `fast-uri`. Nenhuma dependência foi adicionada ou alterada nesta tarefa; correção do conjunto requer mudança própria e nova validação.
