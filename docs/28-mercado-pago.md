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

Aplicação e webhook de teste configurados no Mercado Pago com o evento **Order (Mercado Pago)**. O formulário da loja foi preparado em modo teste; a conexão depende de concluir o preenchimento do Access Token pelo titular e obter validação do servidor. A ferramenta de navegador não consegue ler/copiar esse campo privado, portanto não há credencial em documentação, screenshot ou Git. Testes de Pix/cartão com o provedor e ativação de produção continuam pendentes. Não interpretar credenciais criadas como pagamento homologado.

O ensaio em PostgreSQL isolado detectou incompatibilidade do adapter Prisma com retorno `void` de `pg_advisory_xact_lock` via `$queryRaw`. Os locks de checkout, configuração de pagamento e renovação do frete usam `$executeRaw`, mantendo o lock transacional sem desserializar esse retorno. A falha foi encontrada antes de aplicar a migration na base real.

3DS não foi habilitado nesta entrega. A API Orders documenta `config.online.transaction_security.validation = never` como padrão quando omitido. Habilitar `on_fraud_risk` exige implementar e testar a autenticação adicional, inclusive `action_required/pending_challenge`, antes de ativar essa opção; não tratar esse estado como aprovação.

## Referências oficiais

- https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-integration/cards
- https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-integration/pix
- https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/notifications
- https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-management/status/order-status
- https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-management/integrate-3ds
- https://github.com/mercadopago/sdk-js/blob/main/docs/bricks/card-payment.md

Comparação: Payment Brick com Payments API foi considerado, mas a aplicação cadastrada e documentação atual usam Orders com Card Payment Brick. O SDK oficial hospedado v2 cuida dos campos de cartão; servidor usa `fetch`, Zod e criptografia já existentes. Nenhum pacote adicional ou biblioteca de pagamento comunitária foi instalado. Falha do gateway mantém o pedido pendente; o atendimento manual continua disponível para novas compras.
