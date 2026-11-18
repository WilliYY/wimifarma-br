# 66 — Fornecedores e viabilidade comercial

Atualização ST de 19/10/2026: a comparação manual exige `isMedicine` explícito e recebe `substitutionTaxCents` nullable por oferta. O painel começa conservadoramente como medicamento; só desmarcar após confirmar classificação não medicamentosa. Profarma sem cálculo de ST não é recomendada para medicamento; o custo final já inclui ST. Regra compartilhada e implantação em [78](78-st-observado-profarma.md).

Atualização de 19/10/2026: o titular autorizou DM Paraná como terceira fonte comercial, priorizando consultas ANB/Profarma e comparando o mesmo EAN na DM quando houver acesso. O menor custo final elegível determina o preço, sem prioridade fixa por nome de fornecedor. O código aceita três ofertas distintas; GAM/SantaCruz continuam referências. Ampliação e limites em [77](77-expansao-dermocosmeticos-e-dm.md). Os relatos anteriores abaixo preservam o escopo de cada data; não há conector automático ativado.

## Objetivo e escopo aprovado

Em 17/10/2026, o lojista solicitou comparar ANB, SantaCruz e Profarma por EAN, atualizar ofertas e estudar catálogo sob encomenda, PMC, frete grátis próximo de R$ 99 e desconto Pix de 3%. Informou frete de entrada zero e citou acréscimo de 60% sobre o custo da Losartana como cenário, sem definir essa regra para todo o catálogo. Recebimento: terça a sábado, sem mercadoria domingo/segunda.

A primeira etapa funcional é um painel exclusivo ADMIN para comparação e simulação. Nenhum resultado altera preço, estoque, prazo público, cobrança ou benefício. Fontes automatizadas, dados fiscais, embalagem, tarifa e calendário de corte ainda precisam de confirmação para liberar vendas de estoque externo.

Evolução posterior autorizada: o piloto comercial persistente de quatro EANs, com estoque próprio separado e prazo de preparação, está documentado em [67](67-catalogo-distribuidores-piloto.md). O painel de simulação descrito aqui continua sem gravação comercial; conectores automáticos ainda não foram ativados.

## Contrato do domínio

Módulo `src/features/supplier-planning`: centavos inteiros e percentuais em pontos-base; nenhuma requisição externa ou efeito financeiro.

- `SupplierOffer`: fornecedor ANB/SANTA_CRUZ/PROFARMA/GAM/DM no simulador; ANB/PROFARMA/DM no importador comercial. EAN exato com dígito válido, custo unitário, disponibilidade, saldo quantitativo opcional, conferência e expiração. Caixa de embalagem não representa saldo.
- `compareSupplierOffers({ean, quantity, offers}, now)`: compara somente a mesma apresentação. Oferta desconhecida, expirada, futura, indisponível ou com saldo insuficiente/desconhecido não recebe recomendação de compra. A validade máxima aceita é de 24 horas; isso limita o dado de entrada, não garante reserva.
- `priceWithMarkup(costCents, markupBps)`: aplica acréscimo sobre custo, arredondado ao centavo. Acréscimo de 60% corresponde a margem bruta teórica de 37,5% antes de descontos e custos.
- `simulateOrder(input)`: calcula cenários com e sem Pix, frete, taxa do meio de pagamento, tributos informados, entrada, embalagem, outros custos e ganhos de cashback/WimiCoins. Campos de custo desconhecidos permanecem nulos; contribuição definitiva fica indisponível enquanto houver pendência. Taxa incide no total cobrado; base tributária simplificada e explícita é a receita líquida dos produtos, sujeita a validação do contador.
- Benefícios futuros usam as funções e arredondamentos atuais, excluindo receita/Farmácia Popular. Resgates já existentes reduzem o valor dos produtos antes do Pix. A simulação não movimenta carteiras.
- Frete pode ser estudado antes ou depois do desconto Pix, escolha explícita; padrão após os descontos, consistente com o contrato atual de descontar benefícios antes de testar o limite. Nenhuma mudança da regra pública atual de R$ 99,90.
- PMC informado deve ser confirmado para a apresentação e UF/alíquota aplicável; divergência bloqueia a recomendação de preço. Falta de PMC quando exigido permanece pendente. O painel não classifica automaticamente receitas.

## Interface

Rota `/admin/fornecedores`, somente ADMIN. Linguagem visual operacional, clara, usando os tokens e componentes existentes; comparação por fornecedor em cartões responsivos, custos em formulário e resultado por pedido em destaque. Dados preenchidos nesta etapa são cenários da sessão; não são sincronização nem estoque publicado. Não exibir indicadores falsos de integração conectada.

Em 18/10/2026, GAM foi incluída somente na comparação manual. A decisão mais recente do lojista mantém apenas ANB e Profarma abastecendo o piloto persistente. GAM e SantaCruz podem fornecer referências de identidade, descrição e foto; suas ofertas não são aceitas pela API ou pelo importador comercial nesta etapa. Não há conector automático ou consulta fictícia: custos, saldos e validade dependem de conferência real por EAN, com gravação e auditoria exclusivas de ADMIN. O estoque físico permanece separado.

## Preparar consultas no Cotefácil

Em `/admin/fornecedores`, a área Cotefácil prepara uma lista para consulta manual. Cole um ou mais códigos em **EANs para consulta** ou use **Carregar EANs do site** para incluir produtos ativos e identidades publicadas apenas para consulta. O painel valida o dígito verificador, preserva zeros à esquerda e remove repetições. A interface informa quando encontra registros sem código válido. **Copiar EANs** gera uma lista com um código por linha.

Em 17/11/2026, o suporte indicou cinco colunas separadas por vírgula para o CSV: A = EAN, B = quantidade, C = EAN ou código interno, D = descrição e E = fabricante. **Baixar CSV** adota quantidade fixa 1, C igual ao EAN, nome público real em D, ausência de cabeçalho, UTF-8 sem BOM e registros terminados em CRLF. Essas convenções de geração não foram todas especificadas na mensagem do suporte. O catálogo atual não expõe fabricante confirmado; a coluna E recebe `NAO INFORMADO`, sem inferir fabricante pela marca. Os campos de texto são delimitados por aspas, aspas internas são duplicadas e descrições iniciadas por fórmula recebem apóstrofo de proteção. Os EANs permanecem texto no arquivo, com os zeros originais; abrir e salvar em planilhas pode convertê-los em números.

O download usa apenas os EANs válidos da lista e as descrições públicas correspondentes. Códigos digitados sem descrição no catálogo impedem o CSV, evitando nomes inventados. A API exclusiva ADMIN `/api/admin/fornecedores/cotefacil/eans` mantém `data.eans` e acrescenta `data.items` com `ean` e `description`; consulta somente produtos ativos não excluídos e identidades aprovadas pela política pública existente. Respostas de catálogo e falha usam `Cache-Control: private, no-store`. O arquivo é montado localmente no navegador, sem gravar dados ou transmitir ao Cotefácil. A quantidade 1 serve à pesquisa e não constitui pedido, reserva ou autorização de faturamento.

O lote de 5.014 itens já foi enviado na cotação `15408853`; a melhoria do painel não o reimporta. Uma nova importação é uma ação separada no portal.

O Cotefácil documenta importação de listas e comparação de preços por distribuidor. Há versões de integração com ERP que exigem um TXT estruturado com dados como CNPJ, quantidade e código interno; esse contrato é distinto do CSV confirmado para esta conta. Limites de itens, fornecedores habilitados e conteúdo disponível devem ser conferidos no portal antes de outra importação ou qualquer pedido. [Cotefácil para compradores](https://www.cotefacil.com/solucoes/comprador/) · [Integração INOVAFARMA](https://conhecimento.atlassian.net/wiki/spaces/BDC/pages/1340440577/COTEF%2BCIL)

Para validar o fluxo, comece com uma amostra de EANs do catálogo e selecione apenas os fornecedores já usados pela loja que estiverem habilitados na conta. Verifique se o EAN e a apresentação coincidem e registre fornecedor, custo por unidade, embalagem, disponibilidade informada e horário. Uma ausência de resposta deixa a disponibilidade desconhecida. A criação de uma cotação pode notificar fornecedores. Finalizar um pedido pode encaminhá-lo para faturamento. [Fluxo do comprador](https://www.cotefacil.com/solucoes/comprador/) · [Fluxo do fornecedor](https://www.cotefacil.com/solucoes/fornecedor/)

O retorno de cotação pode servir para conferir divergências do robô e identificar candidatos para pesquisa de cadastro. A inclusão no catálogo ainda exige conferência da identidade, apresentação, imagem, classificação e condições comerciais do produto. A área de preparação apenas lê EANs e nomes públicos do catálogo e não transmite a lista ao Cotefácil nem altera preço ou estoque.

Validação do CSV em 18/11/2026: oito testes dirigidos, lint dos arquivos alterados e TypeScript global passaram; revisão independente não encontrou defeito de código. A suíte de segurança passou em 577 testes. A auditoria npm registrou quatro alertas moderate em produção, zero high/critical, e 17 alertas na consulta completa (oito moderate, nove high, zero critical), incluindo a cadeia de ferramentas com `picomatch`/globbing. As dependências não foram alteradas nesta entrega. Download real no navegador e build/publicação possuem validação separada; testes locais não comprovam importação do CSV na conta.

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
- Conferência autenticada dos portais confirmou diferenças de preço/disponibilidade da mesma apresentação. Saldo numérico desconhecido e sinal de estoque mínimo não são convertidos em reserva. O Pedido Eletrônico SantaCruz mostrou restrição financeira; em 17/10/2026 o titular confirmou que consegue comprar normalmente apesar do aviso. Nenhuma transmissão, pagamento ou alteração cadastral foi executada. A comparação do mesmo EAN ficou pendente porque o aplicativo deixou de responder; o aviso financeiro não foi tratado como prova de bloqueio comercial.
- Houve divergência entre PMC mostrado nos portais e a lista oficial atual. Nenhum teto legal foi inferido do preço do portal. Dados comerciais privados e evidências de conta permanecem fora do Git.

O desconto Pix de 3%, novos limites de frete, regras automáticas de preço, calendário sob encomenda, importação de imagens e publicação de estoque externo continuam pendentes. O painel permite estudar esses cenários; não os ativa no checkout.

## Publicação conferida em 17/10/2026

Código `fff18d1` publicado após build da imagem e recriação somente de `app`, sem migração ou alteração de serviços compartilhados. Imagem anterior preservada para recuperação. Healthchecks interno e público responderam `ok: true`, contêiner saudável e página anônima respondeu HTTP 307 para login. Sessão ADMIN real abriu a página, conferiu os mesmos resultados sintéticos de R$ 6,00/R$ 5,52 e o shell em 390 px sem transbordamento. Dados descartados ao recarregar, sem gravação comercial. A confirmação posterior do titular sobre SantaCruz foi registrada em `302f7a8`; a integração automática permanece pendente.
