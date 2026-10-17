# 66 — Fornecedores e viabilidade comercial

## Objetivo e escopo aprovado

Em 17/10/2026, o lojista solicitou comparar ANB, SantaCruz e Profarma por EAN, atualizar ofertas e estudar catálogo sob encomenda, PMC, frete grátis próximo de R$ 99 e desconto Pix de 3%. Informou frete de entrada zero e citou acréscimo de 60% sobre o custo da Losartana como cenário, sem definir essa regra para todo o catálogo. Recebimento: terça a sábado, sem mercadoria domingo/segunda.

A primeira etapa funcional é um painel exclusivo ADMIN para comparação e simulação. Nenhum resultado altera preço, estoque, prazo público, cobrança ou benefício. Fontes automatizadas, dados fiscais, embalagem, tarifa e calendário de corte ainda precisam de confirmação para liberar vendas de estoque externo.

## Contrato do domínio

Módulo `src/features/supplier-planning`: centavos inteiros e percentuais em pontos-base; nenhuma requisição externa ou efeito financeiro.

- `SupplierOffer`: fornecedor ANB/SANTA_CRUZ/PROFARMA, EAN exato com dígito válido, custo unitário, disponibilidade, saldo quantitativo opcional, conferência e expiração. Caixa de embalagem não representa saldo.
- `compareSupplierOffers({ean, quantity, offers}, now)`: compara somente a mesma apresentação. Oferta desconhecida, expirada, futura, indisponível ou com saldo insuficiente/desconhecido não recebe recomendação de compra. A validade máxima aceita é de 24 horas; isso limita o dado de entrada, não garante reserva.
- `priceWithMarkup(costCents, markupBps)`: aplica acréscimo sobre custo, arredondado ao centavo. Acréscimo de 60% corresponde a margem bruta teórica de 37,5% antes de descontos e custos.
- `simulateOrder(input)`: calcula cenários com e sem Pix, frete, taxa do meio de pagamento, tributos informados, entrada, embalagem, outros custos e ganhos de cashback/WimiCoins. Campos de custo desconhecidos permanecem nulos; contribuição definitiva fica indisponível enquanto houver pendência. Taxa incide no total cobrado; base tributária simplificada e explícita é a receita líquida dos produtos, sujeita a validação do contador.
- Benefícios futuros usam as funções e arredondamentos atuais, excluindo receita/Farmácia Popular. Resgates já existentes reduzem o valor dos produtos antes do Pix. A simulação não movimenta carteiras.
- Frete pode ser estudado antes ou depois do desconto Pix, escolha explícita; padrão após os descontos, consistente com o contrato atual de descontar benefícios antes de testar o limite. Nenhuma mudança da regra pública atual de R$ 99,90.
- PMC informado deve ser confirmado para a apresentação e UF/alíquota aplicável; divergência bloqueia a recomendação de preço. Falta de PMC quando exigido permanece pendente. O painel não classifica automaticamente receitas.

## Interface

Rota `/admin/fornecedores`, somente ADMIN. Linguagem visual operacional, clara, usando os tokens e componentes existentes; comparação por fornecedor em tabela, custos em formulário e resultado por pedido em destaque. Dados preenchidos nesta etapa são cenários da sessão; não são sincronização nem estoque publicado. Não exibir indicadores falsos de integração conectada.

## Próximas etapas condicionadas

Conectores autorizados com execução durável fora do Codex; persistência própria de ofertas/sincronizações, reconfirmação e reserva, fontes atuais de imagem por EAN, leitura CMED por apresentação/UF, aprovação de regras de preço e integração dos estados sob encomenda ao checkout. Cada conector precisa provar preço, unidade e disponibilidade; reputação do distribuidor não substitui esses testes.

O calendário final usa corte de compra, recebimento terça–sábado, preparo incluído no objetivo de prazo e postagem/coleta. O dia de conferência não deve ser acrescentado automaticamente uma segunda vez ao dia de recebimento. Feriados e serviço com postagem em Umuarama exigem regras próprias.

## Referências verificadas em 17/10/2026

- [CMED: lista oficial XLSX](https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos), publicação conferida de 09/10/2026.
- [Anvisa: PMC, apresentação e ICMS da UF de destino](https://www.gov.br/anvisa/pt-br/acessoainformacao/perguntasfrequentes/medicamentos/cmed/precocap).
- [Ultrafarma: regulamento de frete grátis](https://www.ultrafarma.com.br/pagina/sobre-frete-gratis): produtos com selo, R$ 100 e regra de peso; não é frete irrestrito a R$ 99.
- [Ultrafarma: exemplo de Pix com 3%](https://www.ultrafarma.com.br/protetor-solar-facial-principia-fps99-ps-03-200ml). Condição observada não demonstra rentabilidade para a Wimifarma.

## Validação e limites da primeira entrega

- `npm run test:suppliers`: 20 testes de EAN, validade, saldo desconhecido, arredondamento, custos pendentes, Pix/frete, PMC e autorização da página. ADMIN acessa; CUSTOMER, STAFF, MANAGER e sessão ausente são recusados.
- `npm run test:all`: 613 testes passaram. Lint, typecheck, build e validação Prisma passaram. Nenhuma migração ou gravação comercial foi acrescentada.
- `npm run test:security`: 290 testes passaram, incluindo a regressão específica da página. Auditoria de dependências de produção: zero vulnerabilidades. Auditoria completa: cinco alertas high na cadeia de desenvolvimento `braces`/ESLint; a correção automática sugerida rebaixa a configuração Next e não foi aplicada.
- Interface real em prévia local isolada: saldo desconhecido bloqueou recomendação, saldo informado permitiu copiar o custo, campos vazios mantiveram contribuição pendente e entrada por teclado produziu cenários de R$ 6,00 e R$ 5,52 para custo R$ 10, venda R$ 16 e frete R$ 20, demais custos e benefícios explicitamente zerados. Sem transações externas. Larguras de 320, 390 e 1.440 px sem transbordamento horizontal.
- Conferência autenticada dos portais confirmou diferenças de preço/disponibilidade da mesma apresentação. Saldo numérico desconhecido e sinal de estoque mínimo não são convertidos em reserva. O Pedido Eletrônico SantaCruz mostrou restrição financeira da conta; a possibilidade de transmissão precisa de confirmação do titular, sem pagamento ou alteração cadastral pelo agente.
- Houve divergência entre PMC mostrado nos portais e a lista oficial atual. Nenhum teto legal foi inferido do preço do portal. Dados comerciais privados e evidências de conta permanecem fora do Git.

O desconto Pix de 3%, novos limites de frete, regras automáticas de preço, calendário sob encomenda, importação de imagens e publicação de estoque externo continuam pendentes. O painel permite estudar esses cenários; não os ativa no checkout.
