# 51 - Pagamentos Asaas: integração Sandbox aos pedidos

## Contrato do incremento

Asaas começa em homologação exclusiva de ADMIN, com conta/cofre separados e `environment: "test"`. Não ativar o gateway público, não mudar a conexão Mercado Pago nem o registro de tarifas de produção. Pix usa QR estático de valor fixo, uso único e duas horas; cartão usa checkout hospedado 1x. PAN/CVV nunca entram no servidor Wimifarma. Modelos e fontes oficiais complementam [40](40-asaas-configuracao-e-homologacao.md).

A tentativa persiste provedor, integração, instrumento e vínculo remoto antes da comunicação financeira. Pedido antigo recebe `provider`/`integrationId` Mercado Pago por padrão, sem recriar cobranças. QR Pix e sessão de checkout têm campos próprios; `providerOrderId` representa a cobrança financeira. Unicidade inclui provedor, ambiente e conta. A migração é aditiva; substitui somente o índice global de ID remoto por vínculo composto, preservando registros.

Preparação e marca de envio devem ser gravadas antes do POST. Sem garantia de idempotência oficial equivalente à do Mercado Pago, uma resposta incerta Asaas não permite segundo POST ou troca de provedor. Reconciliar por QR/sessão conhecidos; sem ID recuperável, manter a tentativa em conferência. Lista vazia de pagamentos não indica falha: QR estático ainda não pago não tem cobrança.

## Estado e notificações

`walletId` identifica a conta autenticada; não compará-lo ao `account.id` do envelope de webhook. O webhook autentica segredo próprio e persiste ID único/contexto e identificadores mínimos antes de responder 200. Nenhum payload financeiro do evento aprova o pedido por si só: buscar o estado canônico com a credencial vinculada e conferir recurso, valor e instrumento. Não guardar PAN/CVV, dados de clientes ou corpo bruto no inbox/auditoria.

Asaas não documenta timestamp de atualização da cobrança; não fabricar `providerUpdatedAt` a partir da criação, evento ou consulta. Estado pago não volta para pendente por resposta atrasada; estorno/contestação não são apagados por confirmação antiga. Pix `CONFIRMED` pode representar bloqueio cautelar e fica pendente até `RECEIVED`; cartão `CONFIRMED` representa confirmação comercial, separada de saldo disponível. Estorno parcial deriva da soma de `refunds` com estado `DONE` no snapshot atual, sem somar eventos repetidos ou splits. Pagamento após cancelamento fica em revisão, sem reativar preparação, cashback ou estoque.

Homologação tem cliente fictício sem vínculo a conta real, cashback zero, nenhuma reserva de estoque e nenhum `MiaubyEvent` comercial. Conexão válida, criação de QR e confirmação isolada de cartão já verificadas no documento 40 não substituem o ensaio integrado.

## Painel e recuperação

`GET/POST /api/admin/pagamentos/asaas-homologacao` são exclusivos de ADMIN. POST exige mesma origem, JSON estrito de até 2048 bytes e limite de dez operações/minuto. Preparar aceita ID da credencial, e-mail do responsável e revisão; criar aceita produto, instrumento e UUID persistido; consultar aceita somente ID do pedido. O preço vem do catálogo, uma unidade e máximo de R$100 fictícios. Nome, telefone e e-mail são sintéticos e o pedido não se vincula a cliente real.

A preparação cifra token, segredo próprio e URL com nonce antes do único POST de webhook. A renovação da chave na mesma wallet preserva segredo/URL; vínculos ativos impedem rotação. `hasAuthToken` comprova presença, não igualdade: a autenticação é validada nas entregas. Falha incerta de criação financeira fica `UNKNOWN`; repetir o UUID retorna o ensaio existente sem novo POST. Nenhum callback de sucesso aprova o pedido.

`POST /api/pagamentos/asaas/sandbox/webhook` confere `asaas-access-token` por comparação constante, nonce e corpo máximo de 64 KiB. Recibos duplicados mantêm o evento pendente, com identidade única. A recuperação processa dez recibos por ciclo, priorizando quem nunca foi tentado ou aguarda há mais tempo; lease/CAS evita concorrência e impede dez eventos antigos de bloquear um estorno novo. Divergências permanentes ficam `REVIEW` com auditoria sanitizada; falhas transitórias permanecem recuperáveis. Eventos de checkout cancelado/expirado ficam em revisão, pois não há GET canônico de sessão documentado para inferir encerramento financeiro.

## Validação local em 08/10/2026

- Migração executada sobre schema sintético separado em PostgreSQL 17: padrões Mercado Pago preservados, ID remoto igual entre provedores permitido, duplicidade na mesma conta recusada e recibo duplicado bloqueado. O schema e auxiliares remotos foram removidos; nenhuma tabela comercial foi alterada por esse ensaio.
- Testes de segurança/pagamentos, lint, typecheck, build e validação Prisma aprovados. Auditoria de produção: zero vulnerabilidades; auditoria completa conserva cinco high na cadeia de desenvolvimento já registrada no documento 42.
- Revisão independente corrigiu renovação de chave, prioridade da fila e diagnóstico de divergência. Rechecagem aprovou o incremento exclusivo de Sandbox. Ensaios integrados no servidor ainda precisam ser registrados abaixo; testes locais não comprovam recebimento real.

## Evidências do servidor em 08/10/2026

- Incremento `bfb294f` publicado após CI aprovada e migração aditiva. App saudável, zero reinícios, checkout HTTP 200; homologação e webhook sem autenticação retornam 401. Backup pré-migração preservado fora do repositório no servidor; imagem anterior disponível para rollback.
- Preparação Sandbox registrou webhook HTTP 200 sem modificar Mercado Pago (produção ativa, revisão 4, ciphertext preservado). Criação integrada de Pix fictício de R$4,99 no ensaio `WIM-20261008-8CB49F72`: QR/copia e cola visíveis, expiração `2026-10-08T15:38:01Z`, duas horas após criação. Lista financeira vazia é esperada antes do recebimento. Captura local: `outputs/asaas-pix-integrado-20261008.png`, não versionada.
- Cartão de R$4,99 no ensaio `WIM-20261008-2F32EF6B` foi rejeitado pelo Asaas: log de `POST /api/v3/checkouts`, 08/10 às 10:38 em Brasília, HTTP 400, `invalid_object`, valor abaixo de R$5,00. O log corresponde à referência externa persistida. O sistema reteve `UNKNOWN` sem segundo POST; a rejeição definitiva permite conferência operacional auditada dessa tentativa exata, sem converter respostas incertas genéricas em falha.
- A partir dessa evidência, cartão Asaas exige 500 centavos no adapter e antes da criação do pedido sintético; o painel explica e bloqueia valores menores. Pix permanece disponível para valores menores. Regressões comprovam rejeição antes de pedido/POST e aceitação do limite exato. Não aumentar artificialmente o total nem alterar preços do catálogo.
- Novo ensaio de R$9,99 (`WIM-20261008-5F9DE957`) recebeu HTTP 200 e sessão `ACTIVE`, mas o link oficial retornado inclui `/000/checkoutSession/show/<UUID>`. A validação local reteve `UNKNOWN` por não reconhecer esse formato. Aceitar somente esse prefixo exato no host HTTPS Sandbox, com ID correspondente, sem query ou redirecionamento; produção não aceita `/000/`. Recuperar a sessão existente com evidência do log e auditoria, sem novo POST.
- Cartão fictício confirmado na página Asaas e na API canônica (`CONFIRMED`, valor 999 centavos, sessão correspondente), sem cobrança real. A primeira notificação `PAYMENT_CREATED` trouxe ID opaco com `&` e sufixo numérico, recusado pela validação anterior com HTTP 400. Preservar esse formato exato no inbox/deduplicação, mantendo autenticação, limites e consulta canônica. Regressão cobre duplicidade, caracteres hostis e quebras de linha. Reenvio de notificação não repete a criação financeira.
- O GET financeiro confirmou também que `externalReference` do checkout não é necessariamente copiada para a cobrança (`null` neste ensaio). Exigir sessão persistida exata, conta/ambiente, valor, instrumento e ID financeiro quando conhecido; se a cobrança fornecer referência adicional, ela também deve corresponder. Não usar ausência da referência como autorização para ignorar sessão/valor ou aceitar outra cobrança.
- Os ensaios integrados conservam cliente desvinculado, reserva de estoque falsa, cashback zero e nenhum evento comercial Miauby. Recebimento Pix e conciliação automática das notificações ainda precisam ser comprovados; QR criado e webhook cadastrado não comprovam esses resultados.

## Verificações obrigatórias antes de ativar

- Concorrência, resposta incerta/crash sem segundo POST, IDs/valor/conta/ambiente divergentes, lista ambígua e QR ainda sem cobrança.
- Webhook duplicado, antecipado/fora de ordem, consulta canônica, recibo durável e efeitos financeiros uma única vez.
- Recebimento Pix, expiração, recusa de cartão, estorno parcial/integral e contestação, com dados fictícios e zero mensagens comerciais.
- Regressões Mercado Pago, testes de pagamentos/segurança, lint, typecheck, build, Prisma, auditoria de produção e revisão independente.

Roteamento público por menor custo exige ambos os gateways ativos/homologados e contratos válidos para valor, instrumento, parcelas e prazo. Tarifa desconhecida não é zero; promoção/franquia Pix e saldo disponível não equivalem a custo garantido. Implementação Sandbox não autoriza cobrança pública. A chave temporária atual vence em 14/10/2026; renovar somente pela autorização e armazenamento seguros existentes.

Rollback: com Asaas desativado e sem tráfego financeiro novo, voltar a imagem anterior mantendo as colunas/tabela aditivas. Não apagar tentativas, eventos ou colunas para reverter o app. Migração de dados financeiros ou troca de conta permanece assistida e auditada.
