# Política administrativa de tarifas

Em 04/10/2026 foi entregue um comparador administrativo em `/admin/pagamentos`. Ele estima o custo entre tarifas válidas da conta, com taxa fixa, percentual, parcelas e prazo da primeira parcela. Não cria pagamentos, não troca transações existentes e não ativa um segundo gateway. O checkout continua no Mercado Pago.

## Consulta e validade

ADMIN pode registrar contratos por até sete dias. A confirmação de parcelas sem juros é explícita: tarifas de cartão não comprovam que o lojista já absorveu o custo de 3x. Para Asaas, a conexão consulta somente `GET /v3/myAccount/fees/`, em origem oficial fixa, com chave cifrada no cofre existente. Importa tarifas padrão de cartão 1x, 2–6x e 7–12x, tarifa fixa e dias de recebimento. Não pressupõe desconto promocional ou antecipação. Pix permanece manual: os campos de tarifa isolados não comprovam composição, franquia, limites e disponibilidade do dinheiro.

Após conexão, o processo da aplicação tenta revisão a cada seis horas; snapshots automáticos expiram em 24 horas. A aplicação precisa estar em execução. Falha de consulta preserva o snapshot, sem prolongar validade. Dados expirados, incompletos ou de sandbox não participam da comparação. Histórico de mudanças de tarifas fica no AuditLog, com valores anteriores/novos, sem chave API. Não há raspagem periódica de preços publicitários nem confirmação automática das tarifas manuais do Mercado Pago.

Percentuais usam pontos-base inteiros, dinheiro usa centavos e o cálculo percentual arredonda para cima antes da taxa fixa. Precisão maior que duas casas não é silenciosamente reduzida. Desconhecido nunca vale zero. A comparação prioriza custo, prazo e desempate estável; o valor líquido pode ser negativo quando a tarifa fixa supera uma compra pequena. Prazos são os da primeira parcela, não liquidação de toda compra parcelada.

## Segurança e persistência

API `/api/admin/pagamentos/taxas` é exclusiva de ADMIN, retorna `private, no-store` e aplica origem, JSON, corpo limitado e controle de frequência em mutações. PUT possui limite próprio de 128 KB para até 45 contratos manuais + três tarifas importadas; demais operações de pagamento preservam 16 KB. Fontes são URLs HTTPS ASCII, sem credenciais, query ou fragmento, evitando guardar parâmetros privados. A chave não é devolvida ao navegador. Dados ficam no registro independente `payment-fee-policy` de PaymentIntegration, desativado e sem cobrança, com revisão otimista e bloqueio transacional. A conexão Mercado Pago não é modificada. Não houve alteração de schema ou nova dependência.

## O que falta para cobrar por outro provedor

O lojista ainda não possui conta Asaas. Cadastro/aprovação, credencial segura, confirmação da atividade e condições comerciais precedem homologação. Roteamento financeiro real exige persistir o provedor escolhido por pedido antes da primeira cobrança, idempotência, reconciliação, webhook autenticado e testes de recusa, expiração, reembolso e resultado incerto. Resultado incerto nunca autoriza uma segunda cobrança em outro gateway. Pesquisa e fontes em [36-referencias-pagamentos.md](36-referencias-pagamentos.md).

Validação: testes puros de tarifas, normalização e limites HTTP; testes com cofre AES-GCM real e banco/provedor simulados para concorrência, sandbox, credenciais e permissões. São testes locais, não prova de consulta à conta Asaas ou pagamento real.
