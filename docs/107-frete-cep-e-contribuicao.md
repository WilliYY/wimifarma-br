# Frete por CEP e contribuição projetada

Implementação de 25/10/2026, autorizada pelo lojista. Substitui a gratuidade universal por subtotal de R$ 99,90 para transportadoras. Retirada e entrega local nos CEPs já aprovados conservam sua política. Não altera preços, acréscimos por produto, carteiras, pedidos anteriores ou transportadoras autorizadas.

Validação local: 149 testes de frete, checkout e Pix; 17 testes do simulador e da interface em 320, 390 e 1440 px; 485 regressões de segurança, lint e typecheck aprovados. Revisão independente sem achados pendentes. Auditorias npm completa e de produção registraram um alerta moderado em `fast-uri`, sem high/critical; o gate de produção `--audit-level=high` passou. Esses resultados não comprovam publicação ou aceitação de todas as mercadorias/CEPs pelas transportadoras.

## Política no painel

`ShippingIntegration.settings.freeShippingPolicy` é um objeto opcional, salvo pelo PUT ADMIN existente, com revisão otimista e auditoria. Não exige migration. Campos:

- `enabled`: benefício ativo; ausente significa desativado.
- `maximumSubsidyCents`: teto monetário por pedido.
- `minimumContributionBps`: contribuição mínima projetada sobre produtos após resgates, antes do Pix.
- `variableCostReserveBps`: reserva percentual conservadora para impostos, tarifas de pagamento, parcelamento e demais despesas proporcionais. Custos fixos precisam estar adequadamente cobertos pelas reservas operacionais; não presumir que a taxa anunciada por um gateway descreve todos os pedidos.
- `packagingCostCents`: embalagem/proteção por volume cotado, multiplicada pela quantidade de volumes.
- `costMaxAgeHours`: idade máxima do custo de aquisição, de uma a 168 horas; padrão 24. A oferta também deve estar dentro de sua validade própria.

Valores financeiros desconhecidos são `null`; zero exige preenchimento explícito. Ativar exige todos os campos confirmados e soma de contribuição/reserva inferior a 100%. Configuração ausente, custo incompleto ou vencido e custos operacionais da rota pendentes impedem apenas o subsídio, sem impedir a cotação normal. A regra não determina tributos reais nem garante lucro líquido. Markup sobre custo e contribuição depois das despesas são conceitos distintos.

Não há ativação automática de benefício ou preenchimento de tributos por estimativa. A informação de custo para uma caixa específica não valida todos os formatos. Dados contábeis privados e custos observados da empresa não são versionados nesta documentação.

## Cálculo no servidor

O Melhor Envio continua fornecendo preços por CEP, produtos, quantidade e pacote. O teto comum de benefício é a etiqueta econômica elegível; modalidades mais caras preservam a diferença a pagar. O limite configurado e o orçamento de contribuição podem reduzir ainda mais esse subsídio.

O custo de aquisição vem da oferta elegível realmente selecionada, com validade e idade verificadas novamente. O custo final importado já inclui ST; o componente não é somado duas vezes. Estoque físico sem custo de aquisição registrado não recebe subsídio automático. Isso não altera sua disponibilidade de compra ou a entrega local.

O cálculo reserva antecipadamente o máximo de Pix de 3% e os ganhos elegíveis de cashback/WimiCoins antes de deduções e independentemente de login/Club. Essa reserva interna não aplica desconto de pagamento na tela: Pix continua aplicado somente quando selecionado. Os custos extras de rota são os do estimador existente e precisam estar completos e vinculados à rota atual.

Dinheiro usa centavos, percentuais usam pontos-base e a fórmula usa `BigInt`. Sejam `P` os produtos depois dos resgates e antes do Pix, `N` a receita conservadora após o máximo de Pix, `C` a aquisição, `R` as recompensas reservadas, `E` os extras de rota, `H` a embalagem total, `Q` a etiqueta, `m` a contribuição e `b` a reserva:

```text
K = N - C - R - E - H - ceil(P * m / 10000)
budget = max(0, floor((10000*K - b*(P+Q)) / (10000-b)))
subsidy = min(Q, etiqueta_economica, teto_configurado, budget)
customerPrice = Q - subsidy
```

A reserva percentual inclui também o frete cobrado. A base superior `P` conserva o orçamento em pagamentos sem Pix e evita inversões de arredondamento. A validação inclui uma matriz de 600 cenários inteiros.

## Contrato público e checkout

`POST /api/fretes/cotacao` aceita `discountCents` opcional para resgates de carteiras, sem Pix. O servidor valida limites e subtotal. Cada opção conserva `priceCents` como preço positivo da etiqueta e acrescenta `benefit`: status, preço ao cliente, subsídio e, quando possível, mínimo/valor restante estimados.

Nenhum custo de aquisição, fornecedor ou percentual privado é enviado no DTO ou token. O HMAC assina JSON base64 legível, portanto não é cofre. A assinatura vincula CEP, carrinho, revisão, etiqueta econômica, resgates, benefício e validade de até 15 minutos.

O checkout refaz as verificações logísticas, comerciais e do benefício. Alteração do valor de frete retorna 409 antes de criar pedido ou cobrança. Tokens antigos sem o novo benefício exigem recotação. No celular/desktop, HTTP 409 limpa a seleção e pede nova cotação; mudança de créditos também invalida requisições e resultados anteriores.

O preço no navegador vem somente do benefício retornado. A API exige `X-Wimifarma-Shipping-Benefit: 1`: clientes antigos precisam atualizar a página, sem obter um token novo enquanto exibem a antiga regra de R$ 99,90. Antes do CEP não aparece limiar universal. O mínimo é estimativa para a composição e cotação atuais, arredondada conservadoramente; adicionar produtos pode mudar custo, peso e benefício. Omitir essa estimativa quando o teto ou a modalidade impossibilita gratuidade integral.

## Preparação do catálogo e diagnóstico

A fila ADMIN possui filtro global `ALL`, `PENDING` ou `CONFIGURED`, antes da paginação. O resumo distingue falta de perfil, revisão, desativação, configuração e atendimento assistido. Configurado não garante cobertura de todos os CEPs ou aceitação de toda transportadora. Produtos assistidos e restrições de carga permanecem protegidos.

A validação do perfil antecede a seleção de transportadoras, para não confundir medidas/revisão pendentes com falta de cobertura. Cadastro sem peso/medidas/revisão e perfil desativado têm mensagens distintas. Não há liberação em massa por caixa padrão, invenção de medidas ou renovação de ofertas antigas. A consulta de endereço/cobertura e a possibilidade de enviar um produto são verificações diferentes.

O sistema continua cotando uma origem efetiva cadastrada. Locais de postagem por serviço não criam automaticamente origens alternativas; comparar Ivaté, Douradina e Umuarama para operação real exige validar remetente, postagem e calendário de despacho.

## Verificação e limites

Regressões cobrem orçamento, subsídio parcial, modalidades, caixa por volume, custo ausente/vencido, resgates/recompensas, privacidade do token, destinos distintos, revisão de preço antes da cobrança, tokens antigos e filtro global além da primeira página. Ensaios de UI usam dados sintéticos e CSS real em 320/390/1440 px. Resultados de checks e publicação ficam na evidência privada da tarefa; código preparado ou teste local não comprovam produção.
