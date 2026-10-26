# 83 — Desconto de 3% no Pix

## Banner com oferta direta — 26/10/2026

A home passa a destacar “3% OFF no Pix”, logo oficial completa sobre branco e ação curta “Aproveitar”. A condição fica em uma linha curta: “Escolha Pix no checkout. Frete à parte.”. O percentual continua vindo de `PIX_DISCOUNT_PERCENT`, e o link permanece `/catalogo?ordem=preco-asc`. Esta apresentação substitui a faixa verde clara descrita no histórico; nenhuma regra financeira, valor, gateway ou seleção de pagamento foi alterada.

Direção: varejo gráfico com composição mínima, ancorada no percentual amplo. DFII 14 (impacto 4, adequação 4, viabilidade 4, desempenho 5, risco 3). Mantém Barlow e a fonte do site; verde profundo `--pix-background`, verde claro `--pix-highlight` e branco organizam contraste. Espaços em múltiplos de 8 px e layout de uma coluna até 767 px, três a partir de 768 px, com limite de 1280 px. O único movimento é o retorno de hover do CTA, removido com movimento reduzido. Sem JavaScript, imagem, fonte ou dependência nova; CSS local em `pix-discount-banner.module.css`.

O cenário isolado `banner Pix` em `checkout-pix.test.ts` usa o CSS real e verifica oferta, logo carregada, condição, link e ausência de overflow em 320/390/768/1440 px. Os cenários funcionais de checkout não fazem parte da execução manual deste ajuste visual.

Validação: cenário visual aprovado antes e após o ajuste de espera do carregamento da logo; capturas locais conferidas. Build com lint/tipos e 485 testes de segurança aprovados. Revisão independente sem achados restantes. Contraste calculado: texto branco 10,75:1, percentual 8,82:1, condição 8,33:1 e texto do botão 12,18:1 em seus fundos. Auditorias completa e de produção mantêm um alerta moderado preexistente em `fast-uri`, zero high/critical. Comandos: `tsx --test --test-name-pattern 'banner Pix' src/components/site/checkout-pix.test.ts`, `npm run build`, `npm run test:security`, `npm audit --json` e `npm audit --omit=dev --audit-level=high --json`. Sem atualização de dependências.

## Seleção explícita no checkout — 22/10/2026

O lojista determinou preço público igual ao valor atual do carrinho, sem antecipar Pix. A vitrine não apresenta valor já reduzido nem selo Pix por produto; a arte promocional permanece, com a condição de escolher Pix no checkout. Apresentação dos cards em [86](86-precos-e-desconto-real-nos-cards.md).

O checkout inicia sem forma de pagamento selecionada, mesmo quando o rascunho antigo contém o padrão Pix. Antes da escolha, o resumo não inclui desconto Pix. Escolher Pix aplica 3% na base elegível, mostra a economia e discrimina o desconto; escolher cartão ou dinheiro retira essa redução. O botão pede a escolha e permanece desabilitado; o handler também bloqueia envio sem método. Um método local que deixa de ser válido por mudança na entrega fica pendente, sem conversão automática para Pix.

A seleção é explícita e mantida somente no estado da página, vinculada ao proprietário do rascunho. Não há campo persistente novo, mudança de schema ou alteração no payload financeiro. A retomada de uma cobrança existente continua usando `OnlinePayment` e seu snapshot; não exige refazer a escolha nem reprecifica um pedido anterior. Percentual, cálculo no servidor, rateio, arredondamento, frete, resgates, idempotência e gateway conservam as regras abaixo.

Arquivos: `checkout-page.tsx`, `checkout-pix.test.ts` e ajuste de seleção explícita em `ui-regressions.test.ts`, em `src/components/site`; apresentação pública nos cinco arquivos do documento 86. Documentação atualizada em README e documentos 07/12/28/83/86. Os ensaios interceptam a rede, usam dados sintéticos e não geram cobranças, pedidos comerciais ou mensagens reais.

Validação: falhas iniciais reproduziram Pix pré-selecionado e preço público reduzido. Após a correção, 13/13 testes de checkout/regressões passaram, incluindo bloqueio da UI e do handler, métodos online/manuais, troca inválida, carteiras e retomada pelo snapshot. Cards/rodapé: 12/12; cálculo Pix/criação de checkout/benefícios/compra: 26/26; segurança: 444/444 (as suítes têm sobreposição). Revisão independente aprovou sem achados. Resultados dos checks finais e conferência publicada ficam no relatório privado da entrega em `outputs/pix-somente-checkout-2026-10-22`.

`npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run build`, `npm.cmd run prisma:validate` e `git diff --check` passaram. Os seis cenários de `checkout-pix.test.ts` foram repetidos com CSS real e capturas; todos passaram. O teste manual foi corrigido para clicar no rótulo visível, pois o input de rádio usa `sr-only`. Capturas inspecionadas confirmaram R$ 100,00 antes da escolha e R$ 97,00 depois de Pix, mantendo o banner em 320/390/768/1440 px. O build local conserva o aviso não fatal de configuração pública das bandeiras indisponível nesse ambiente.

Auditoria `npm.cmd audit --omit=dev --audit-level=high --json`: zero vulnerabilidades de produção. Auditoria completa `npm.cmd audit --audit-level=moderate --json`: cinco HIGH preexistentes de desenvolvimento (`@next/eslint-plugin-next`, `eslint-config-next`, `braces`, `fast-glob`, `micromatch`) e zero critical. Nenhuma dependência foi modificada. Publicação exclusiva do app, sem migration; preservar a imagem anterior e conferir preços e escolha explícita pela interface pública, bloqueando escritas externas durante a automação.

## Autorização e regra comercial

Em 19/10/2026, o lojista autorizou desconto real de 3% no Pix e um banner moderno para divulgar a vantagem. A regra vale para novos pedidos com Pix manual (`PIX`) e pagamento online cujo método seja `pix`. Cartão, cartão na entrega e dinheiro conservam seus valores.

O desconto incide sobre os produtos após o resgate de cashback e WimiCoins, com arredondamento matemático para o centavo mais próximo. Não incide sobre o frete. A regra atual de gratuidade do frete considera os produtos após os resgates, antes do desconto Pix; selecionar Pix não retira uma gratuidade já alcançada.

Exemplo: produtos de R$ 100,00, cashback de R$ 10,00 e WimiCoins de R$ 20,00 deixam R$ 70,00 como base. Pix reduz R$ 2,10; o cliente paga R$ 67,90 mais o frete aplicável. Benefícios que cubram integralmente os produtos deixam desconto Pix igual a zero. Cobrança online com total zero permanece bloqueada pelo fluxo existente.

## Cálculo, persistência e segurança

- `features/payments/pix-discount.ts` compartilha o percentual e o arredondamento entre servidor e navegador. Dinheiro usa centavos inteiros; BigInt evita perda de precisão intermediária. Entradas negativas, fracionárias e inteiros inseguros são recusados.
- `createCheckout` recalcula os preços e resgates no servidor e fixa o desconto na criação. `Order.totalCents` e `OnlinePayment.amountCents` são gravados na mesma transação. O navegador não envia percentual ou desconto Pix como autoridade.
- Subtotal, preço por unidade e total original dos itens permanecem no snapshot, preservando a conferência comercial anterior à cobrança. O desconto é rateado entre os valores líquidos dos itens antes de calcular cashback e WimiCoins ganhos; esses benefícios dependem do valor efetivamente pago e das regras atuais de elegibilidade.
- O bônus de 1% por avaliação também abate a parcela Pix congelada. Criação e avaliação compartilham rateio por maiores restos, com desempate lexical pelo `productSlug` persistido. A avaliação carrega todos os itens do pedido para reconstruir a parcela exata, mesmo que o banco os devolva em outra ordem, sem recalcular o percentual nem multiplicar o bônus pela quantidade.
- O desconto não é resgate de carteira. Não aumenta saldo reservado, debitado ou devolvido. O evento `PIX_DISCOUNT_APPLIED` registra base, percentual e centavos no audit log, sem dados adicionais de pagador.
- Pedidos idempotentes retornam o snapshot existente antes do novo cálculo. Nenhum pedido anterior ou pagamento pendente é reprecificado. Gateway, idempotência, reserva, webhooks autenticados e comparação canônica continuam utilizando o valor persistido, sem recalcular 3% ao consultar, repetir ou reconciliar.
- A tentativa online conserva seu método já vinculado; não é permitido gerar uma cobrança de cartão com o total descontado de uma tentativa Pix. Não houve alteração em credenciais, configuração dos gateways, permissões ou schema.

O desconto exibido nos detalhes históricos é a diferença persistida `subtotal + frete − cashback resgatado − WimiCoins resgatados − total`, limitada a zero quando negativa. O checkout atual não possui outra redução nessa diferença. Uma futura campanha/cupom que altere o total exigirá discriminar os descontos em campos próprios antes de reutilizar essa apresentação; não se deve rotular uma nova redução como Pix.

## Banner e apresentação

Desde 22/10/2026, os cards destacam o preço atual do carrinho, sem antecipar Pix. Referência riscada e percentual são exclusivos de promoção real cadastrada. A antiga apresentação de preço Pix unitário fica registrada historicamente em [86](86-precos-e-desconto-real-nos-cards.md); o desconto é revelado na escolha Pix do checkout.

Faixa entre as marcas e a primeira vitrine, com fundo verde claro, texto escuro, destaque vermelho no percentual, logo oficial completa e ação para o catálogo. Geometria discreta, sem logo Pix recriada, imagem de campanha gerada, autoplay ou dependência adicional. Direção de varejo claro, usando a fonte e os controles existentes. DFII 14: impacto 3, adequação 5, viabilidade 4, desempenho 4, risco 2.

Texto principal: **Pague com Pix e ganhe 3% de desconto.** Complemento informa aplicação nos produtos e frete à parte. O percentual vem da mesma constante usada no cálculo.

O checkout identifica a vantagem na opção Pix, mostra quanto o cliente economiza e discrimina o desconto no resumo. Trocar para cartão/dinheiro retira o desconto da prévia. Detalhes do pedido na conta e no painel mostram o desconto já incluído no total, sem aplicar novamente o percentual. Header, marca animada, vitrines, carrinho e as 128 bolhas do rodapé mantêm seus contratos.

## Arquivos e validação

Código: helper/testes `payments/pix-discount`, criação/testes de checkout, serviço/testes do bônus de avaliação, `checkout-page`, `pix-discount-banner`, `home-page`, `customer-order-history`, `orders-panel` e regressão sintética de navegador `checkout-pix.test.ts`. Documentos 07/10/12/16/28/63 e README apontam para este contrato.

Os ensaios usam produtos e pagador sintéticos, interceptação integral de rede quando há navegador e gateway simulado. Não transferem dinheiro, criam cobrança real ou enviam mensagem. Testes de cálculo e criação comprovaram RED antes da implementação e GREEN depois; os resultados finais de integração, revisão independente e publicação serão registrados abaixo.

Validação antes da publicação: 27 testes focados de cálculo/criação/resgates/avaliação aprovados; três cenários de navegador aprovados, com banner em 320/390/768/1440 px, troca de meio de pagamento e combinação das duas carteiras. A captura foi inspecionada em celular e desktop. O teste de troca foi ajustado para clicar no texto do controle e também passou sem CSS da captura. `npm.cmd run test:security`: 407/407. `npm.cmd run lint`, `npm.cmd run typecheck` e `npm.cmd run prisma:validate` passaram. Revisão independente encontrou o bônus de avaliação sem Pix no primeiro corte; correção e regressões foram revisadas e aprovadas, sem achados restantes.

Auditoria de produção (`--omit=dev --audit-level=high`): zero vulnerabilidades. Auditoria completa: cinco alertas high em `braces`, `micromatch`, `fast-glob`, `@next/eslint-plugin-next` e `eslint-config-next`; zero critical. Não foi aplicado downgrade ou `audit fix --force` nesta entrega. A suíte geral e o build/publicação terão seus resultados registrados na conferência final.

## Publicação e conferência no site

Código `3833ab193dcb9abaa4d454130d8e67137b6f7b40`, enviado ao GitHub e publicado na imagem `wimifarma-br-app:pix-3833ab1`. Build Linux/Docker aprovado: compilação, lint, tipos e 39 páginas estáticas. O app iniciou `running / healthy`, com a mesma revisão no label OCI. Atualização exclusiva do serviço `app`, sem migration, alteração de proxy ou reinício do PostgreSQL.

Backup PostgreSQL em formato customizado foi verificado com `pg_restore --list`, em `/home/ubuntu/backups/wimifarma-br/pix-20261020T025238Z/database.dump`, acesso privado no servidor. Imagem anterior preservada como `wimifarma-br-app:pre-pix-3833ab1`. Reverter o código não deve recalcular pedidos já criados: o valor persistido permanece a autoridade.

O navegador público confirmou o banner, o botão para o catálogo e a prévia real do checkout: hidratante de R$ 19,93, desconto Pix de R$ 0,60 e subtotal de R$ 19,33; cartão voltou a R$ 19,93 e selecionar Pix restaurou R$ 19,33. Nenhum pedido ou cobrança foi criado. A cesta estava vazia antes da conferência e o único item temporário foi removido ao terminar. A captura pública fica em `outputs/pix-desconto-2026-10-19/pix-publicado.png`; capturas sintéticas responsivas e do checkout ficam na mesma pasta, fora do Git.

Conferência de 20/10/2026 às 03:07 UTC: health público `ok: true`. A atualização paralela de catálogo já havia avançado checkout e imagem para `1780447`, `running / healthy`; ancestralidade confirmou que essa revisão contém `3833ab1`. Não foi reinstalada uma imagem anterior por causa da atualização da documentação.

A primeira suíte geral foi executada na pasta compartilhada durante outra edição de catálogo: 916 testes, 913 aprovados, dois timeouts de carregamento do navegador e um teste de EAN afetado pela edição paralela da rota. O teste Pix com timeout passou isoladamente; o commit publicado não inclui a edição paralela. A conferência final foi executada em uma worktree no commit `3833ab1`, com os mesmos arquivos de `test:all` e concorrência limitada a dois processos para reduzir disputa de recursos.

Resultado isolado final: **908 testes, 907 aprovados e um timeout de `page.goto` em teste preexistente de quantidade no card**. O arquivo `product-card-actions.test.ts` foi repetido sozinho na mesma revisão: **4/4 aprovados**, incluindo o cenário afetado. Todos os cenários novos passaram na suíte geral. A execução completa não é registrada como aprovação integral em uma única passagem; o teste do card e sua implementação não foram modificados por esta tarefa. Nenhuma falha funcional ficou aberta na mudança Pix. A worktree descartável foi arquivada após a conferência; capturas finais permanecem em `outputs`.
