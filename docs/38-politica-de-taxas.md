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

## Entrega verificada — 04/10/2026

- Código publicado: `9087caf`, `45e04ce`, `15d9c15`; GitHub e checkout VPS sincronizados. Build Linux oficial Docker passou, 37 páginas geradas. Imagem em execução `sha256:801326d43cd5ca44b41ff07982528974b36466c4a5fad14687016e36dd22de5b`; rollback `wimifarma-br-app:pre-commerce-15d9c15`. Sem migração ou mudança de credenciais.
- Validações locais: 184 testes gerais, 44 pagamentos, 43 Miauby, 29 frete, 18 comunicações/ranking; 318 aprovados. Lint, typecheck e Prisma validate passaram. Audit continua com sete vulnerabilidades high preexistentes na cadeia de desenvolvimento; nenhuma dependência adicionada ou downgrade aplicado.
- Produção: aplicação saudável, zero reinícios, `/api/health` OK; novas APIs de taxas e histórico respondem 401 sem sessão. SQL mensal executado no PostgreSQL real: outubro retornou zero compradores/pedidos elegíveis, pois ranking exige conclusão e pagamento.
- Navegador autenticado: Miauby com prévia fictícia; conteúdo de WhatsApp/e-mail idêntico. Comparador sem contrato retorna custo desconhecido e aceita limpar o valor sem quebrar. Histórico individual abriu. Miauby, taxas e ranking tiveram `scrollWidth === clientWidth` nas larguras reais 319, 390 e 1440 px, considerando o zoom já aplicado no Chrome. Viewport restaurado ao final.
- Limitações de QA: captura de screenshot falhou duas vezes no navegador conectado; nenhuma imagem de resultado foi fabricada. O preenchimento automatizado do campo nativo de mês não definiu valor, e navegação direta ao JSON foi bloqueada pelo cliente do navegador. O filtro mensal foi validado em testes e no SQL real, sem alegar esse controle visual como teste completo. Nenhuma cobrança, envio a clientes ou QR Pix novo ocorreu nesta revisão. Aba antiga do checkout foi fechada pelo usuário.
