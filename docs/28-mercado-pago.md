# 28 - Mercado Pago: checkout e homologação

## Decisão e escopo

O lojista escolheu Checkout Transparente / Bricks e pagamento na finalização do checkout, antes da confirmação operacional da farmácia (29/09/2026). A integração usa a API Orders e Card Payment Brick oficial, com Pix dinâmico e cartão em uma parcela. O gateway inicia desativado; configuração de teste aparece somente para ADMIN. A publicação do código não comprova homologação nem habilita cobrança real.

Itens com receita e Farmácia Popular continuam fora do checkout. O atendimento e a preparação do pedido continuam humanos. O módulo de frete é independente: não compra etiquetas nem emite nota fiscal. O contrato logístico está em `27-melhor-envio.md`.

## Configuração

1. Cadastrar aplicação Wimifarma no Mercado Pago, Checkout Transparente via Orders. O titular realiza validações de identidade e aceita os termos apresentados pelo provedor.
2. Usar o vendedor de teste e as credenciais correspondentes. Em `/admin/pagamentos`, salvar Public Key, Access Token e assinatura secreta do webhook, ambiente **teste**, pagamento público desativado. O servidor consulta `/users/me`, verifica Brasil e a marca `test_user`; não deduz o ambiente pelo prefixo da chave.
3. Configurar somente o evento **Order (Mercado Pago)**, URL `https://wimifarma.com.br/api/pagamentos/mercado-pago/webhook`, no ambiente correspondente. IPN e Pagamentos legacy não são usados.
4. ADMIN testa pelo checkout com dados fictícios e e-mail de comprador `@testuser.com`, sem cashback. Pedidos de teste não têm cliente real vinculado, não reservam estoque, não geram cashback e não podem avançar para preparação/entrega.
5. Homologar cartão aprovado/recusado, Pix, webhook assinado, atualização/recarregamento, duas abas, expiração e falha de rede. Guardar evidências sem tokens ou dados de cartão. Nunca usar cartão real para simular sucesso.
6. Após homologação, cadastrar credenciais de produção com o pagamento desativado, configurar webhook de produção e só então ativar explicitamente. Alterações concorrentes usam revisão otimista; histórico de produção impede troca livre da conta para preservar notificações e conciliação.

## Fluxo e segurança

- `POST /api/pedidos` fixa produtos, preços, desconto e frete no servidor, cria `Order` e `OnlinePayment` atomicamente. A chave de checkout evita duplicar pedidos. O cliente segue para `/checkout/pagamento/[id]` e pode retomar pelo histórico da própria conta.
- Acesso exige o proprietário autenticado ou cookie HttpOnly, SameSite e Secure em HTTPS, assinado para aquele pedido/tentativa; homologação exige ADMIN adicionalmente. Respostas financeiras são `private, no-store`.
- Antes de enviar ao gateway, lock do pedido e atualização condicional dos produtos reservam estoque em produção. Falha/cancelamento confirmado libera a reserva uma única vez; aprovação consome a reserva. Reembolso não presume devolução física da mercadoria.
- Um pedido tem uma tentativa financeira e uma chave de idempotência. O corpo imutável da requisição fica cifrado para recuperar uma resposta incerta. Nunca criar outra cobrança com chave diferente enquanto a primeira estiver sem confirmação. Dados cifrados da requisição são apagados após uma resposta canônica conciliada.
- Valor/referência do pedido, moeda, conta recebedora e identificador remoto são conferidos em toda conciliação. Somente pagamento `processed/accredited` vira pago. Eventos antigos ou repetidos não revertem o estado nem repetem baixa/devolução de estoque.
- Webhook valida HMAC SHA-256, identificador e timestamp (tolerância de dez minutos); o corpo recebido não determina aprovação. O servidor consulta a Orders API autenticada. Falhas temporárias retornam 503 para nova entrega do provedor.
- O navegador consulta a cada 30 segundos enquanto aguarda. Manutenção no processo consulta até vinte pendências por minuto, com intervalo de cinco minutos por registro. Pedido sem tentativa expira após trinta minutos. Reenvio incerto conserva chave/corpo por até uma hora; depois exige conferência humana, mantendo estoque reservado.
- Reembolso/contestação e cancelamento financeiro são realizados no painel do Mercado Pago e sincronizados. O admin da loja não pode marcar um pagamento online como pago. Reembolso parcial fica destacado e bloqueia a preparação, exigindo conferência manual dos benefícios e valores.
- Access Token e assinatura ficam no cofre AES-256-GCM existente (`SECRET_VAULT_KEY`), nunca em Git, logs ou respostas ao navegador. `AUTH_SECRET` protege o acesso de convidado. Não trocar chaves sem plano de migração.
- Cartão é digitado nos campos seguros do SDK oficial; a aplicação recebe somente token e dados necessários do pagador, nunca número/CVV. CSP libera os hosts do SDK somente na rota de pagamento. Pix é renderizado localmente a partir do código retornado pelo provedor, sem imagem remota arbitrária.
- APIs de mutação exigem origem, JSON limitado a 16 KB e limite por IP/processo. Produção com várias réplicas deve evoluir o limite para armazenamento compartilhado. HTTP do provedor usa host fixo, TLS, timeout e redirecionamentos bloqueados; erros externos são saneados.

## Operação e limites

- Pagamento confirmado permite atendimento; cashback continua condicionado a pedido **concluído e pago**. Reembolso integral/contestação usa a reversão existente. Reembolso parcial exige revisão humana, sem ajuste automático proporcional de cashback nesta fase.
- Para falha de rede prolongada, conferir o pedido e a referência no Mercado Pago antes de nova cobrança ou ajuste de estoque. Não alterar manualmente o banco para forçar aprovação.
- Ao desligar novos pagamentos, manter credenciais e webhook para reconciliar os existentes. Não remover a migration para voltar ao fluxo manual.
- Compra sem valor restante após cashback deve seguir atendimento, sem cobrança de valor zero. Parcelamento, boleto, captura manual, estorno pelo admin e múltiplas contas recebedoras não fazem parte desta entrega.
- A chave pública e Access Token devem ser da mesma aplicação/ambiente; o teste real do Brick é necessário além da validação `/users/me`.

## Arquivos e validação

Módulo `src/features/payments`, APIs `/api/admin/pagamentos`, `/api/pagamentos/[id]` e webhook, componentes `payment-panel`/`online-payment`, checkout, histórico e administração dos pedidos, CSP, instrumentação e migration `20260929170000_mercado_pago_orders` (aditiva: método ONLINE e duas tabelas).

Comandos: `npm.cmd test`, `npm.cmd run test:shipping`, `npm.cmd run test:payments`, `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run build`, `npm.cmd run prisma:validate`, `npm.cmd audit --audit-level=moderate`.

`scripts/payment-db-audit.ts` exige banco descartável `wimifarma_payment_test` em `127.0.0.1` e `PAYMENTS_DB_TEST=isolated-disposable`. Usar PostgreSQL separado, sem rede externa, volume ou credenciais de produção. O teste usa apenas dados sintéticos e provedor simulado, cobrindo estoque concorrente, notificações duplicadas, reembolso e retomada da mesma cobrança incerta. Não executá-lo contra a base da loja.

Validação local em 30/09/2026: 153 testes existentes, 10 de frete e 9 de pagamentos aprovados; lint, build e Prisma validate aprovados. Auditoria npm aponta dois alertas altos preexistentes nas cadeias `fast-uri` e `brace-expansion`; nenhuma dependência/lockfile foi alterada nesta integração. O segundo alerta foi publicado após a revisão logística. Não aplicar `audit fix` indiscriminadamente nesta tarefa.

Publicação em 30/09/2026: commits `b4f7e0b`, `5b61880` e `ec2385b` enviados ao GitHub e publicados no VPS. Backup de banco, uploads e configuração verificado antes da migration; 16 migrations aplicadas, app e PostgreSQL saudáveis. `/api/health` confirmou `ok: true`; acesso anônimo à configuração de pagamentos e webhook sem assinatura retornaram 401. O painel administrativo foi aberto com a sessão autorizada. Pagamento público permanece desativado.

Ensaio de banco aprovado em PostgreSQL 17 descartável, sem rede externa e sem volumes de produção: checkout idempotente, disputa pelo último item, eventos repetidos/antigos, reembolso, liberação única de estoque, retomada incerta e cancelamento. O provedor nesse ensaio é simulado; não substitui a homologação no Mercado Pago.

Aplicação e webhook de teste configurados no Mercado Pago com o evento **Order (Mercado Pago)**. Em 30/09 o titular colou o Access Token diretamente no painel; a conexão foi salva e validada pelo servidor no Mercado Pago. Segredos permanecem cifrados, sem registro em documentação, screenshot ou Git. Testes de Pix/cartão com o provedor e ativação de produção continuam pendentes. Não interpretar credenciais criadas como pagamento homologado.

O teste visual identificou o Brick preso no carregamento: o SDK oficial faz uma requisição prévia a `secure-fields.mercadopago.com` e usa `api-static.mercadopago.com` como alternativa antes de preencher o `src` dos iframes. Ambos precisam de `connect-src` e `frame-src`. A correção limita esses hosts à rota de pagamento e mantém as demais páginas restritas; teste de regressão em `security-policy.test.ts`. Evidência do comportamento no código oficial `https://sdk.mercadopago.com/js/v2`, consultado em 30/09/2026.

O ensaio em PostgreSQL isolado detectou incompatibilidade do adapter Prisma com retorno `void` de `pg_advisory_xact_lock` via `$queryRaw`. Os locks de checkout, configuração de pagamento e renovação do frete usam `$executeRaw`, mantendo o lock transacional sem desserializar esse retorno. A falha foi encontrada antes de aplicar a migration na base real.

3DS não foi habilitado nesta entrega. A API Orders documenta `config.online.transaction_security.validation = never` como padrão quando omitido. Habilitar `on_fraud_risk` exige implementar e testar a autenticação adicional, inclusive `action_required/pending_challenge`, antes de ativar essa opção; não tratar esse estado como aprovação.

Homologação no navegador em 30/09: cartão oficial `APRO` aprovado, resultado persistido após recarregamento, sem reserva de estoque real e com requisição cifrada removida após conciliação. O ensaio `OTHE` revelou o envelope HTTP 402 da Orders API: a ordem foi criada e a transação recusada, mas a resposta canônica está em `data`. O adaptador passa a aceitar esse envelope exclusivamente no POST de criação e após validação estrutural; continuam obrigatórias as conferências de conta, referência, valor e identificador antes de alterar o pedido. Respostas incompletas, moeda diferente de BRL ou outros erros permanecem incertos, sem liberar estoque indevidamente. O campo atual `currency` também é validado, preservando compatibilidade com `currency_id`.

Em 01/10, a versão `4a8567b` foi publicada e o health confirmado. O simulador oficial retornou 401 mesmo após reconferir a assinatura de teste. Rejeições passam a registrar somente um código fixo de motivo (`PAYMENT_WEBHOOK_REJECTED`), sem URL, cabeçalhos, assinatura, corpo ou credenciais. Isso permite distinguir ausência/formato, expiração e divergência do HMAC sem enfraquecer a validação; resposta externa continua genérica.

Diagnóstico concluído em 01/10: o simulador assina `data.id` preservando maiúsculas/minúsculas. Enviar o mesmo ID em minúsculas retornou 200 e conciliou a recusa consultando a ordem canônica (o corpo fictício do simulador dizia aprovado e foi corretamente ignorado). O SDK Node oficial, revisão `99857f33aaa037bea3423a9a9cb8c092d5c7f229`, também preserva o valor no manifesto HMAC. Removida a conversão indevida para minúsculas; a consulta subsequente à Orders normaliza o ID somente depois de validar a assinatura. Testes cobrem assinaturas válidas nos dois formatos e rejeitam alteração de caixa após assinatura.

Pix de homologação gerado pelo gateway, QR Code/copia e cola exibidos e preservados no recarregamento. Não houve transferência real nem confirmação artificial de pagamento. Credenciais de produção ativadas no portal em 01/10, com aceite explícito do titular; conexão da loja ainda em teste enquanto a homologação termina.

## Referências oficiais

- https://github.com/mercadopago/sdk-nodejs/blob/99857f33aaa037bea3423a9a9cb8c092d5c7f229/src/utils/webhook/index.ts

- https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-api/create-order/post

- https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-integration/cards
- https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-integration/pix
- https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/notifications
- https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-management/status/order-status
- https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-management/integrate-3ds
- https://github.com/mercadopago/sdk-js/blob/main/docs/bricks/card-payment.md

Comparação: Payment Brick com Payments API foi considerado, mas a aplicação cadastrada e documentação atual usam Orders com Card Payment Brick. O SDK oficial hospedado v2 cuida dos campos de cartão; servidor usa `fetch`, Zod e criptografia já existentes. Nenhum pacote adicional ou biblioteca de pagamento comunitária foi instalado. Falha do gateway mantém o pedido pendente; o atendimento manual continua disponível para novas compras.
