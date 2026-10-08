# 53 — Asaas para clientes e seleção de tarifas

## Contrato comercial

O checkout pode persistir Mercado Pago ou Asaas antes de iniciar o pagamento. Asaas usa Pix estático com valor fixo, uso único e validade de duas horas, ou crédito à vista em página hospedada oficial. O valor mínimo do cartão Asaas é R$5,00. Parcelamento permanece no formulário protegido Mercado Pago. Número e CVV não passam pela Wimifarma.

Cada pedido conserva conta, ambiente, integração, revisão e instrumento. O servidor recalcula produtos, frete e desconto; a tarifa não muda o valor cobrado do cliente. O Asaas reserva estoque em transação antes do único POST. Crash, timeout, resposta inválida ou `UNKNOWN` permitem consulta e revisão, sem repetir a criação ou trocar gateway.

Confirmação usa GET autenticado e vínculo exato com a sessão/QR, conta, instrumento e valor. Pix exige `RECEIVED`; cartão `CONFIRMED` confirma a compra sem afirmar saldo disponível. Callback de navegador e webhook isolado nunca aprovam pagamento. Recebimentos tardios de pedido cancelado, sessões canceladas/expiradas sem cobrança canônica e divergências ficam em revisão. Não presumir que um QR vencido/lista vazia prova ausência de pagamento.

## Conexão e homologação

- Painel ADMIN: Pagamentos → Asaas · pagamentos para clientes. API `/api/admin/pagamentos/asaas` exige ADMIN, origem, JSON limitado e revisão otimista.
- A credencial produtiva cifrada do módulo de tarifas é reutilizada somente no servidor. Validar conta aprovada e wallet. Preservar Mercado Pago e a integração `asaas-sandbox`.
- Webhook produtivo `/api/pagamentos/asaas/webhook` recebe segredo próprio e nonce vinculados; registra inbox durável por provedor/ambiente/conta/evento antes de responder. A manutenção processa produção e Sandbox separadamente.
- O registro remoto do webhook possui claim persistido antes do POST; resposta incerta não permite cadastrar outro webhook automaticamente.
- A ativação exige webhook registrado, conta aprovada, mesma wallet e recebimento canônico `PAID` no Sandbox para cada instrumento. Pix ainda depende desse recebimento de teste. Crédito 1x já possui ensaio integrado confirmado, conforme documento 51.
- Renovar accessToken da mesma wallet autenticada conserva os vínculos. Troca de wallet/chave Pix com pagamentos vinculados exige migração assistida.

## Tarifas

Regras usadas no roteamento precisam de conta e modalidade (`orders`, `hosted-card` ou `static-pix`), instrumento, parcelas, fonte e validade. As taxas padrão de cartão Asaas são consultadas a cada seis horas e expiram após 24 horas; campos Pix incompletos não viram tarifa zero. Mercado Pago requer reconferência manual do contrato, válida por até sete dias.

Novos pedidos escolhem o menor custo apenas quando todos os candidatos habilitados possuem estimativa atual compatível. Sem essa prova, conserva-se Mercado Pago como padrão, ou o único candidato disponível. Pagamentos iniciados nunca são recalculados. Auditoria `PAYMENT_ROUTE_SELECTED` registra provedor, motivo, regra, custo estimado, método, total e revisão.

Em 08/10/2026, a tela autenticada “Checkout → Por venda” do Mercado Pago mostrou 4,98% para crédito à vista, recebimento na hora, e 0,99% para Pix. A API Asaas consultada mostrou baseline de cartão 2,99% + R$0,49. Esses valores podem mudar; não inferir descontos promocionais, antecipação ou custos de parcelamento.

## Mercado Pago e catálogo

Em 08/10/2026, uma consulta GET canônica da tentativa produtiva mais recente confirmou Pix `action_required/waiting_transfer`, QR presente no gateway e no banco local, vínculo correto e prazo de duas horas. Isso comprova emissão; a liquidação desse Pix continua pendente. A aprovação real de cartão já existente também foi conferida por GET. Diagnósticos upstream preservam somente código permitido, HTTP status, request ID seguro e categoria de falha; nunca corpo, cartão, QR, e-mail ou token.

Medicamentos de receita comum classificados pelo ADMIN já permitem carrinho e pagamento sem upload. A conferência farmacêutica antes da dispensação permanece; não remover a obrigação sanitária porque outras lojas recebem pedidos online. Controlados e assistência Farmácia Popular conservam suas regras. Os quatro produtos ativos foram verificados anteriormente como elegíveis ao checkout.

## Confiança e validação

Rodapé acrescenta atendimento real pelo WhatsApp aos indicadores próprios HTTPS, CNPJ/endereço e histórico de pedidos. Não apresentar RA1000, Ebit, Diamante, licença sanitária, AFE ou certificado PCI da loja sem comprovação. Preservar logo oficial e efeito original de 128 bolhas.

Validação anterior à publicação: 219 testes de segurança (incluindo pagamentos e 21 novas regressões de ativação Asaas) e 19 regressões do checkout passaram; lint, typecheck e Prisma passaram. Auditoria de dependências produtivas: zero vulnerabilidades. Auditoria completa mantém cinco high na cadeia de ferramentas ESLint/fast-glob/micromatch/braces; não aplicar downgrade incompatível automático. Revisão independente aprovou o escopo após corrigir o uso da transação na consulta de tarifas e preservar o vínculo em renovação da credencial da mesma wallet. Resultados de implantação serão registrados antes da entrega.

Fontes oficiais: [Asaas Checkout](https://docs.asaas.com/docs/checkout-asaas), [Criar checkout](https://docs.asaas.com/reference/criar-novo-checkout), [Eventos](https://docs.asaas.com/docs/eventos-para-checkout), [RDC44](https://bvsms.saude.gov.br/bvs/saudelegis/anvisa/2009/rdc0044_17_08_2009.pdf).
