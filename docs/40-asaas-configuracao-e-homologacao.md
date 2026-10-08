# 40 - Asaas: configuração e homologação

## Continuação verificada em 08/10/2026

O novo bloco **Asaas Sandbox · conexão de testes** em `/admin/pagamentos` lista somente metadados de credenciais `Asaas`/`sandbox` do cofre. A seleção é explícita; o servidor confere serviço, ambiente e prefixo `$aact_hmlg_`, descriptografa a chave e consulta exclusivamente `GET https://api-sandbox.asaas.com/v3/myAccount/fees/`. Não modifica a conexão de tarifas de produção, regras financeiras ou pedidos. A resposta contém apenas `validated`, quantidade de regras e horário; a auditoria `ASAAS_SANDBOX_CONNECTION_CHECKED` registra usuário/ID sem segredo.

`GET /api/admin/pagamentos/asaas-sandbox` e `POST` da mesma rota são exclusivos de ADMIN. POST aceita somente `{ credentialId }`, JSON de até 2048 bytes, mesma origem e cinco verificações por minuto. Respostas são `private, no-store`; erros internos não expõem chaves, ciphertext ou detalhes da conta. O teste externo é leitura: validar acesso não representa homologação financeira.

### Ensaios reais no ambiente Sandbox

Com a chave cifrada já autorizada, um executor descartável conferiu as APIs oficiais do Sandbox. Nenhuma credencial foi copiada para arquivo ou terminal, e os POSTs ficaram restritos ao host Sandbox. O cadastro retornou `APPROVED` para situação geral, dados comerciais, conta bancária e documentação; nenhum documento pessoal real foi enviado.

- Chave Pix aleatória de testes cadastrada pela interface e posteriormente confirmada `ACTIVE` pela API.
- QR Pix de **R$10 fictícios** criado com imagem e payload válidos, `expirationSeconds: 7200`, `allowsMultiplePayments: false` e referência exclusiva. A criação foi auditada antes/depois da chamada. Não houve pagamento desse QR nem comprovação da expiração bancária: o ensaio completo exige outra conta Sandbox pagadora, conforme o [guia oficial](https://docs.asaas.com/docs/testar-pagamento-de-qrcodes-pix).
- Checkout hospedado de cartão criado com valor fictício de **R$10**, uma unidade de **Homologacao ficticia Wimifarma**, sessão de 120 minutos e referência exclusiva, sem dados reais de cliente. A página `https://sandbox.asaas.com/checkoutSession/show?id=…` foi aberta e validada diretamente. Identificação, endereço e cartão foram preenchidos com dados sintéticos exclusivamente no provedor. A interface mostrou **Pagamento confirmado** e uma consulta posterior `GET /v3/payments?checkoutSession=…` retornou `CONFIRMED`, `CREDIT_CARD`, valor 10 e líquido 9,32. Valores/tarifas Sandbox não comprovam o contrato produtivo.
- Esses ensaios não criaram pedidos, aprovaram pagamentos, liberaram cashback ou enviaram mensagens da Wimifarma. URLs de retorno não foram utilizadas como confirmação financeira. O checkout público continua Mercado Pago. Recusa, estorno, integração de webhook e roteamento automático ainda não foram homologados.

As revisões automáticas de tarifas de produção também foram conferidas por leitura da auditoria: `PAYMENT_FEES_SYNCHRONIZED`, usuário nulo, em **08/10/2026 às 05:21:27 e 11:21:26 UTC** (02:21:27 e 08:21:26 em Brasília). Isso comprova execução do timer com intervalo de seis horas, sem depender da consulta manual.

### Arquivos e revisão

Implementação em `src/features/payments/asaas-sandbox.ts`, `src/app/api/admin/pagamentos/asaas-sandbox/route.ts`, `src/components/admin/asaas-sandbox-panel.tsx` e inclusão no painel de pagamentos, com regressões em `asaas-sandbox.test.ts` e `asaas-sandbox-route.test.ts`. Não há dependência ou migração nova. Revisão independente aprovou o código e as nove regressões focadas de autorização, cofre, ambiente, origem, limite, sanitização e isolamento de produção. A auditoria desta entrega também exigiu atualizar a dependência existente Next.js/ESLint Next para 15.5.27; decisão e limites em [42-revisao-de-seguranca.md](42-revisao-de-seguranca.md).

Validação local: `npm.cmd run test:security` (118/118), `npm.cmd run lint`, `npm.cmd run build` e `npm.cmd run prisma:validate` passaram após o patch. Auditoria de produção sem alertas; completa mantém cinco high de ferramentas. Não usar esses checks locais como prova de publicação ou homologação financeira completa.

## Atualização confirmada em 07/10/2026

O titular concluiu a geração da chave de produção. Em 07/10, o controle da aba foi recuperado e a credencial foi transferida diretamente do campo visível do Asaas para **Pagamentos → Conectar consulta de tarifas Asaas**, sem arquivos intermediários, logs ou transcrição na conversa. O painel confirmou salvamento e resposta válida da API às **14:50:06**; a conexão persistiu após recarregar. Isso comprova conexão de tarifas, mas ainda não homologação de cobrança. Andamento e verificações em [50-recuperacao-de-compra-e-conexoes.md](50-recuperacao-de-compra-e-conexoes.md).

O botão **Gerar chave de API** foi liberado. A tela de criação foi aberta no Chrome conectado, com nome, expiração opcional e uma permissão separada para saques. A geração, confirmação de segurança e envio da nova credencial foram deixados ao titular, conforme a política da ferramenta de navegador. A orientação é manter **saques desmarcados**. Não houve contratação de plano nem cobrança.

Na consulta da API, a simulação de **R$100 em cartão 1x**, prazo máximo de 35 dias, mostrou **R$3,48 de tarifa**, **R$96,52 líquidos** e primeiro recebimento em **32 dias**. É a tarifa padrão conservadora importada; a promoção manual anterior de R$2,48 não foi tomada como custo efetivo atual. O snapshot mais recente prevalece sobre uma regra manual antiga. Não houve cobrança, antecipação, contratação de mensalidade ou alteração da conexão Mercado Pago. Nenhum roteamento automático para Asaas foi ativado.

O titular criou a conta Sandbox separada e autorizou a geração de uma chave temporária **Wimifarma Sandbox Homologacao**, com expiração em **14/10/2026 às 23:59**, sem saques. A interface confirmou **Habilitado**. A chave foi guardada cifrada em **API e Senhas → Asaas Sandbox — homologação**, serviço `Asaas`, identificador `sandbox`, e o registro permaneceu após recarregar. O modal com a chave foi fechado depois da confirmação de armazenamento. O cofre genérico não conecta automaticamente um gateway: esse registro não substitui o `payment-fee-policy` de produção nem libera cobranças. Nenhum segredo ou senha é versionado.

A validação da geração usou o token oficial `000000` exclusivamente no Sandbox, conforme a [mudança vigente desde 01/10/2026](https://docs.asaas.com/changelog/token-000000-para-valida%C3%A7%C3%B5es-da-conta-no-sandbox). Não aplicar esse comportamento a validações de produção.

A manutenção em produção inicia a revisão de tarifas após 60 segundos de inicialização e depois a cada seis horas, com validade de 24 horas. A hora da consulta manual não fixa o próximo horário da revisão automática. Conferir execução pelo evento `PAYMENT_FEES_SYNCHRONIZED` com `userId` nulo; a simples saúde do container não comprova execução do timer.

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

## Próxima homologação necessária

O bloqueio de geração e a conexão de tarifas de produção foram resolvidos. A chave Sandbox está no cofre separado, com vencimento documentado. Validar a API de testes sem trocar a configuração de produção; depois homologar QR Pix, checkout hospedado de cartão, expiração, recusas, webhooks autenticados, repetição de eventos, resultado incerto e estornos com dados sintéticos.

A cobrança Asaas ainda exige implementação e validação próprias: o fluxo atual de pedidos/pagamentos usa Mercado Pago. Guardar uma chave ou consultar tarifas não comprova pagamento, não habilita um segundo gateway e não autoriza repetir cobrança em outro provedor após resposta incerta.

## Fontes oficiais

- [Chaves API e requisitos](https://docs.asaas.com/docs/chaves-de-api) e [geração pelo painel](https://central.ajuda.asaas.com/hc/pt-br/articles/33618186066331-Como-gerar-uma-nova-chave-de-API-no-Asaas).
- [Tarifas da própria conta](https://docs.asaas.com/reference/recuperar-taxas-da-conta) e [preços/tarifa fixa por venda](https://www.asaas.com/precos-e-taxas). Valores específicos acima foram observados na tela autenticada da conta.
- [Promoção de três meses](https://central.ajuda.asaas.com/hc/pt-br/articles/32095332785947-Regulamento-Promo%C3%A7%C3%A3o-3-meses-de-taxas-reduzidas).
- [Checkout cartão](https://docs.asaas.com/docs/checkout-para-cart%C3%A3o-de-cr%C3%A9dito), [link e redirecionamento](https://docs.asaas.com/docs/link-do-checkout-e-redirecionamento-do-cliente), [FAQ/expiração de sessão](https://docs.asaas.com/docs/faq-do-asaas-checkout) e [QR Pix](https://docs.asaas.com/reference/obter-qr-code-para-pagamentos-via-pix).
