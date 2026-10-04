# 35 - Referências para catálogo, IA e e-mails

Pesquisa consolidada em **04/10/2026**, com fontes oficiais verificadas nesta tarefa. Preços em dólar são referências publicadas, sujeitos a alteração, impostos e câmbio. Este documento orienta decisões; não representa contratação, conexão de conta ou ativação de envio.

## Peso e dimensões: fontes e limites

A prioridade é identificar o EAN e a apresentação exatos, procurar a ficha técnica do fabricante e complementar dados ausentes com distribuidor ou varejo técnico confiável da mesma unidade comercial. Registrar URL, trecho, unidade e nível de embalagem. Uma caixa master, pacote de outra contagem ou kit diferente não comprova medidas da unidade vendida.

| Fonte | Utilidade | Limite operacional |
| --- | --- | --- |
| Fabricante e ficha técnica | Identidade, apresentação e especificações da unidade exata | Nem sempre publicam peso bruto e todos os eixos; conferir a embalagem descrita |
| GS1 Brasil / Cadastro Nacional de Produtos | Dados estruturados de produtos, inclusive peso bruto, dimensões e nível de embalagem quando informados | Consulta de terceiros depende do serviço, contrato, acesso e cobertura; não presumir uma API pública gratuita para qualquer EAN |
| Cosmos / Bluesoft | Busca comercial por código de barras e dados de catálogo | Cobertura incompleta e acesso comercial; não garantir dimensões de transporte |
| Open Food Facts / Open Beauty Facts | Complemento de identificação e quantidade declarada | Conteúdo líquido não comprova peso bruto ou dimensões do pacote; cobertura colaborativa não substitui a fonte técnica |

Fontes: [FAQ da API GS1 Brasil](https://portalapi.gs1br.org/pageFaq), [API Cosmos](https://api.cosmos.bluesoft.com.br/api), [schema de produto Open Food Facts](https://openfoodfacts.github.io/documentation/docs/Product-Opener/schemas/schemas/product_misc/) e [Open Beauty Facts](https://world.openbeautyfacts.org/).

Uma fotografia pode ajudar a identificar rótulo e apresentação. Não permite inferir massa, densidade, proteção de transporte ou um eixo oculto com precisão. Sem evidência utilizável, o campo permanece vazio. Não converter ml em g, atribuir eixos a números sem ordem declarada nem estimar por produto parecido.

O contrato existente está em [29 - Cadastro e logística com IA](29-cadastro-logistica-ia.md): referências preenchem campos vazios, preservam dados manuais e permanecem em rascunho. A equipe pesa e mede a unidade pronta para envio, incluindo a proteção realmente utilizada. A revisão humana em **Fretes e entregas** continua necessária para liberar a embalagem. Pesquisa de medidas não libera medicamento, receita, Farmácia Popular ou transporte automaticamente.

## Custo da IA e reaproveitamento

Na tabela oficial consultada, **Gemini 2.5 Flash de texto** custa US$ 0,30 por milhão de tokens de entrada e US$ 2,50 por milhão de tokens de saída na modalidade paga padrão. Um exemplo de 2.000 tokens de entrada e 500 de saída custa:

```text
(2.000 / 1.000.000 × US$ 0,30) + (500 / 1.000.000 × US$ 2,50) = US$ 0,00185
```

Esse exemplo exclui pesquisa/grounding, outras chamadas, imagens, tokens adicionais e diferenças de modalidade. Não é o custo medido de uma pesquisa do projeto, cujo fluxo inclui pesquisa e estruturação. Fonte: [preços oficiais Gemini API](https://ai.google.dev/gemini-api/docs/pricing).

O reaproveitamento implementado na rota administrativa usa a identidade exata fornecida, modelo e impressão digital da credencial como chave hash. Há até 128 resultados em memória: alta confiança por até 24 horas; média/baixa por até 5 minutos. Requisições idênticas simultâneas compartilham a pesquisa pendente; falhas não são armazenadas. Reinício ou deploy limpa o cache e processos distintos não compartilham entradas. A resposta ao navegador continua `Cache-Control: no-store`, após autenticação e validação.

O cache reduz chamadas somente quando há repetição válida na mesma instância. Não há percentual de economia medido. Limites completos, expiração e validação estão em [29 - Cadastro e logística com IA](29-cadastro-logistica-ia.md).

### Modelo de imagens

A documentação oficial informa encerramento de **`gemini-2.5-flash-image` em 02/10/2026**. A indicação desse modelo em configuração anterior não comprova disponibilidade atual. Fonte: [descontinuações Gemini API](https://ai.google.dev/gemini-api/docs/deprecations).

Antes de migrar, confirmar identificador oficial do substituto, acesso da conta, compatibilidade da API, preço e comportamento de edição com a logo e os produtos reais. Não trocar automaticamente o modelo, alterar segredo ou presumir acesso a partir da documentação. Essa pesquisa não homologou um substituto na conta da loja.

## E-mails: comparação de serviços

| Opção | Referência gratuita ou de preço | Aplicação e limite |
| --- | --- | --- |
| Brevo Free | 300 e-mails/dia; até 100 mil contatos; automações para até 2 mil contatos | Reúne transacionais e marketing. A quantidade de contatos não equivale à capacidade diária de envio |
| Brevo pré-pago | Pacotes de 5 mil a 1 milhão de créditos, sem expiração e sem assinatura | Créditos para marketing e transacionais; preço do pacote deve ser conferido antes da compra |
| Mailjet Free | 6 mil e-mails/mês, limite de 200/dia e até 1 mil contatos | Alternativa para baixo volume; o limite diário também restringe o uso da franquia mensal |
| Resend Free transacional | 3 mil e-mails/mês e limite de 100/dia | Opção para mensagens transacionais; não confundir com a oferta e cobrança de marketing |
| Amazon SES | US$ 0,10 por mil e-mails no envio padrão; camada Essentials acrescenta US$ 0,16 por mil | Novas contas têm Essentials como padrão desde 21/07/2026. Considerar os componentes contratados; não comparar apenas o preço-base |

Fontes oficiais: [planos e créditos Brevo](https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans), [Mailjet](https://www.mailjet.com/pricing/), [Resend transacional](https://resend.com/pricing?product=transactional) e [Amazon SES](https://aws.amazon.com/ses/pricing/).

No SES, envio padrão com Essentials representa US$ 0,26 por mil e-mails nesses dois componentes. Dados, anexos, IP dedicado e outros serviços podem acrescentar cobrança. Não há compromisso mínimo de envio; hospedagem, domínio e operação continuam custos separados. Franquias promocionais e limites da conta precisam ser conferidos na contratação, sem presumir acesso ou capacidade de produção.

### Código aberto

- **listmonk**: gratuito e de código aberto; usa Go e PostgreSQL, com campanhas, segmentos e API transacional. Exige provedor SMTP, hospedagem, backups, atualização e operação. Fontes: [site oficial](https://listmonk.app/) e [repositório oficial](https://github.com/knadh/listmonk).
- **Mautic**: alternativa de automação de marketing em PHP/MySQL, com implantação e manutenção mais amplas. Avaliar quando os fluxos exigirem essa complexidade. Fonte: [distribuição oficial](https://www.mautic.org/download).

Software gratuito não torna a entrega de e-mails gratuita. O aplicativo organiza contatos e mensagens; o provedor cuida do transporte, reputação e entrega. Não construir SMTP próprio para esta necessidade.

### Recomendação para a Wimifarma

Começar com **Brevo Free**, usando créditos pré-pagos quando a demanda justificar, é a recomendação para o volume inicial e a combinação de confirmações, recuperação de carrinho e novidades. Não contratar pacote ou assinatura automaticamente. Em maior escala, avaliar **SES + listmonk** comparando custo total, administração, limite da conta e entregabilidade.

Construir no projeto os disparadores, modelos, consentimento, supressão, outbox e idempotência necessários, conforme [33 - E-mails personalizados](33-emails-clientes.md). O evento de pedido recebido não equivale a pagamento aprovado. Marketing exige adesão própria e descadastro; não segmentar por dados de saúde. Resposta incerta do provedor exige conciliação antes de repetir um envio.

**Nenhuma conta de e-mail ou acesso ao DNS foi conectado nesta etapa. Nenhum e-mail foi enviado.** Remetente, domínio autenticado, credencial segura e destinatário interno autorizado precisam ser homologados antes da ativação. Os limites dos planos são evidência documental, não prova de entrega ou de disponibilidade na conta da loja.

## CPF e campos seguros do cartão

O Card Payment Brick brasileiro exige o documento do titular no fluxo aplicável. Manter o CPF nesse componente; retirar o campo local não elimina uma exigência do gateway. Pré-preencher `payer.identification` somente quando o cliente já forneceu o dado legitimamente e ele é apropriado ao pagador. Não inventar CPF nem usar documento de outra pessoa.

Número do cartão (PAN) e CVV permanecem nos campos seguros do Mercado Pago e não são salvos pelo projeto. O pagamento só é confirmado por consulta autenticada ao gateway. Fontes: [integração de cartões com Orders](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-integration/cards) e [contrato local de pagamentos](28-mercado-pago.md).

## Pendências e alcance da evidência

1. Escolher a conta empresarial de e-mails, autenticar o domínio e homologar remetente e destinatário interno antes de implementar/ativar envios.
2. Avaliar acesso comercial ao GS1/Cosmos somente se a cobertura real justificar o custo; nenhuma conexão foi criada aqui.
3. Confirmar modelo de imagens suportado e acessível antes de migrar a configuração anterior.
4. Manter conferência física e aprovação de transporte; fontes externas e IA não certificam a embalagem enviada.

Este documento registra pesquisa e contratos existentes. Não altera banco, APIs, contas, DNS, pagamentos ou regras de transporte. Testes locais de código, funcionamento de conta externa e entrega real são evidências distintas.
