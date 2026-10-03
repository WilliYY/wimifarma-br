# 32 - Checkout e confiança

Revisão nacional/Miauby de 03/10: ver `27-melhor-envio.md` para a configuração ativa e a regra atual de medicamentos sem receita. Ainda é obrigatória a aprovação de peso/embalagem por produto; categoria sem receita não exige atendimento por si só. Retirada/entrega local mantêm as mesmas regras. Prévia de futuros e-mails, sem envio ativo: `33-emails-clientes.md`.

## Experiência atual

Checkout em uma página, com três colunas a partir de 1280 px, duas no tablet e blocos verticais no celular. Contato, entrega e pagamento permanecem visíveis; cartão abre após dados/endereço válidos e consentimento. Bandeiras vêm do catálogo público do Mercado Pago; indisponibilidade desse catálogo não impede o formulário seguro.

O visual usa cabeçalhos numerados com orientação curta, campos com foco visível, miniaturas dos produtos e opções de pagamento com legendas. As três colunas têm a mesma largura e altura no desktop, sem altura fixa ou corte do conteúdo. O endereço compacto usa quatro linhas e preserva a ordem visual no teclado. O resumo claro diferencia produtos, frete, desconto e subtotal/total; saldo zero de cashback ocupa uma linha. A barra de frete grátis considera os produtos após cashback e não garante cobertura de CEP. Ícones de confirmação nos dados/entrega indicam somente preenchimento conforme a validação existente. Não representam confirmação operacional ou aprovação financeira.

Telefone aceita formato nacional, +55 ou 0055, com DDD válido. Cliente autenticado/rascunho preenche contato; e-mail preenche o Brick. Não guardamos PAN/CVV nem acessamos cartões privados da carteira Mercado Pago. Preenchimento de cartão salvo depende do navegador.

Pix gera QR Code/copia e cola inline, com vencimento de duas horas persistido no banco. Recarregar retoma o pedido autorizado e mantém o prazo original. Após vencimento, consultar o gateway; o contador local não decide cancelamento ou pagamento. Falha de rede conserva a tentativa para evitar pedidos/cobranças duplicados.

Cartão apresenta condições calculadas pelo provedor antes de pagar, até 12 parcelas (débito/pré-pago: uma). Até 3x sem juros foi configurado na conta da loja em 03/10/2026; a loja absorve a tarifa. Acima de 3x, prevalecem juros/opções reais do Mercado Pago, sem tabela inventada no site.

## Entrega

Retirada gratuita na Av. Minas Gerais, 2263. Entrega local em Ivaté/Douradina requer CEP, cidade e UF coerentes e confirmação operacional. Dinheiro somente nesses casos; transportadora exige cotação real e método elegível.

A partir de R$ 99,90 em produtos após cashback, o cliente não paga o frete de transportadora disponível, incluindo outras cidades. A loja continua pagando o custo da transportadora. A cotação preserva esse custo no pedido. Não há prazo/preço/transportadora fictícios quando a cotação está desativada.

Melhor Envio está conectado, mas o envio nacional permanece desativado até revisar embalagem pronta, peso, aceitação da carga, documento fiscal e postagem. A IA pesquisa a apresentação exata/EAN e deixa medidas úteis como rascunho; peso líquido, caixa master, fralda aberta ou imagem sem escala não podem definir o frete. Conferir fisicamente antes de aprovar.

O checkout informa essa indisponibilidade antes de oferecer cotação. Medicamentos e itens sujeitos às regras farmacêuticas também exibem atendimento/retirada, sem consulta automática de transportadora. Preços anteriores restaurados não permanecem válidos se essa integração ou elegibilidade estiver bloqueada; o servidor preserva todas as validações de frete.

O resumo usa subtotal enquanto falta uma entrega válida, com estado separado para CEP pendente, frete a selecionar, atendimento ou indisponibilidade. Após escolher retirada, entrega local ou uma cotação elegível, exibe o total e o custo correspondente. A composição do preço e a regra de R$ 99,90 após descontos permanecem iguais.

## Como obter selos reais

- **Ebit, incluindo Diamante:** aderir ao programa de lojistas e integrar a pesquisa oficial de satisfação. Classificação depende das avaliações e dos critérios vigentes do programa; cadastro não concede Diamante. [Termo oficial](https://ebit.com.br/termo-lojista).
- **RA Verificada:** solicitar o programa pelo Reclame AQUI, com assinatura/verificação da empresa, incluindo dados cadastrais e validações exigidas. Após aprovação, usar o HTML oficial em Área da Empresa > RA Verificada > Compartilhar selo. É diferente de RA1000. [Manual oficial](https://manual.reclameaqui.com.br/ra-verificada).
- **Avaliações do Consumidor Google:** ativar o programa no Merchant Center, aceitar o contrato e integrar o convite opcional após compra. O selo e a nota dependem das avaliações elegíveis; não criar avaliações ou nota fictícias. [Guia oficial](https://support.google.com/merchants/answer/14629804?hl=pt-BR).
- **Top Quality Store do Google:** na consulta de 03/10/2026, a lista de países do programa não inclui o Brasil. Não anunciar esse selo como disponível para a Wimifarma. [Disponibilidade oficial](https://support.google.com/merchants/answer/14261098?hl=en).

HTTPS e campos de cartão do Mercado Pago já são mecanismos técnicos de proteção; não representam certificação Ebit/Reclame AQUI. Só publicar selos obtidos e seus links/HTML oficiais, com autorização para eventuais custos e novas integrações.

## Validação reproduzível

`npm.cmd test`, `npm.cmd run test:payments`, `npm.cmd run test:shipping`, `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run prisma:validate`, `npm.cmd audit --audit-level=moderate` e build Linux/Docker. `node scripts/checkout-ui-audit.mjs` monta componentes reais em loopback totalmente interceptado: 320/390/768/1440 px, Pix/recarga, cartões, regras de frete, dinheiro e falhas de rede. Também cobre transportadora desativada, cesta com medicamento, descarte de seleção antiga, ausência de POST indevido, ordem de teclado e simetria desktop. Novas imagens em `outputs/checkout-shipping-review`, sem dados reais; capturas anteriores permanecem em `outputs/checkout-review`.

`scripts/payment-db-audit.ts` exige PostgreSQL descartável/isolado com nome e endereço protegidos. Testa idempotência, concorrência de estoque, expiração Pix persistida, parcelas enviadas, notificações e Miauby deduplicadas. Gateway/WhatsApp são simulados: esse ensaio não comprova transferência monetária nem entrega de mensagem real.

Referências de integração: [Pix/Orders](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-integration/websites/pix), [customização de Bricks](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/additional-settings/websites/behavior-customizations), [métodos de pagamento](https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-api/payment-methods/get) e [CEP de Douradina](https://douradina.pr.gov.br/localizacao/).

## Evidências de 03/10/2026

- Revisão de frete/simetria: 173 testes gerais, 25 testes de frete e 23 cenários UI em 320/390/768/1440 px aprovados; lint e TypeScript aprovados. Bloqueios antecipados não geram cotação/pedido/pagamento, retirada continua disponível e uma cotação antiga é descartada quando a integração fica indisponível. Simetria desktop, quatro linhas de endereço e ordem de teclado conferidas. Capturas sintéticas em `outputs/checkout-shipping-review`; não comprovam medição física ou cotação real.
- Publicado `e0ad489`, com build Linux/Docker e Prisma validate aprovados; app healthy, zero reinícios e health público `ok: true`. Navegador autenticado confirmou três painéis com mesma altura/largura, campos em quatro linhas, duas fotos carregadas, ausência de overflow e aviso de atendimento para Dove + Cimegrip no CEP de Umuarama. Resumo preservou R$ 46,89 como subtotal, sem frete/preço final inventado. Nenhum pedido, cobrança, etiqueta, medida ou configuração logística foi salvo. Rollback preservado em `wimifarma-br-app:pre-checkout-e0ad489`.
- Refinamento visual: 173 testes gerais, 14 cenários de checkout com miniatura real e quatro larguras no cadastro/assistente aprovados. Lint, TypeScript e Prisma validate aprovados. Campos, handlers e permissões preservados na revisão estática; nenhum pedido/cobrança real criado pela auditoria visual.
- Visual publicado no commit `4b79d71`, com build Linux/Docker aprovado. App healthy, zero reinícios e health público `ok: true`. Navegador conectado confirmou três títulos alinhados, foto da cesta carregada e ausência de overflow; cadastro abriu com modal de 1152 px e salvar/cancelar visíveis. Nenhum produto ou pedido foi salvo nessa conferência. Imagem anterior preservada em `wimifarma-br-app:pre-ui-4b79d71`; sem migration ou mudança de credenciais.
- 173 testes gerais, 13 de pagamentos, 22 de frete e 14 cenários UI aprovados; lint, typecheck e Prisma validate aprovados. Banco PostgreSQL 17 descartável, sem rede externa e com gateway/WhatsApp simulados, confirmou expiração Pix persistida, parcelas, estoque concorrente, idempotência e deduplicação da Miauby.
- Commit `9c52b05` publicado com build Linux aprovado e 18 migrations, incluindo a data de expiração. Backup privado de banco/uploads/configuração conferido; app healthy, zero reinícios e `/api/health` com `ok: true`. Nenhuma cobrança real criada.
- A referência da imagem anterior estava ausente no Docker, impedindo tag/commit do container. Rollback foi reconstruído pelo commit anterior `e6b5992` em `wimifarma-br-app:pre-checkout-9c52b05`, antes de recriar o app. A mudança de banco é aditiva e compatível com essa versão.
- Na inspeção publicada, a proteção do cliente HTTP bloqueava `/v1/payment_methods`; a consulta do catálogo ganhou permissão exata e somente GET no commit `91d3208`. A regressão falhou antes da correção e passou depois; não abrir URLs arbitrárias, subrotas, query strings ou POST do catálogo. Novo build Linux e publicação aprovados: nove bandeiras reais com imagens carregadas, tres colunas alinhadas e sem overflow no navegador conectado. Nenhum pedido/cartão foi submetido nesse ensaio visual.
- Backup de release: `/home/ubuntu/backups/wimifarma-br/checkout-9c52b05-20261003T172621Z`, com banco, uploads e configuração privados. App healthy, zero reinícios e health público confirmado após a correção. Evidências UI sintéticas ficam em `outputs/checkout-review/report.json` e capturas locais; elas não substituem transação real ou medição física.
- A auditoria npm reconfirmou sete vulnerabilidades HIGH preexistentes, documentadas em `06-pendencias.md`, sem mudança de dependências.
