# Envio nacional e meta de frete grátis — 02/11/2026

## Estado desta etapa

O lojista autorizou expressamente a opção de usar custo de aquisição elegível observado há até 30 dias e reservar pelo menos metade da margem disponível para despesas e eventual lucro. O código e os controles descritos aqui estão preparados para revisão. A configuração produtiva, a aplicação dos perfis e a publicação desta etapa permanecem pendentes de confirmação e prova pelo responsável pela integração. Este documento não comprova execução em produção.

O plano logístico contempla 319 produtos sólidos: 44 sabonetes, 97 fraldas, 112 absorventes, 58 escovas/fios e oito itens de algodão/hastes. Inclui o kit Rexona Multivitaminas 6×84 g em manifesto próprio, com sua identidade e embalagem estimada preservadas. A revisão dos 319 perfis e o rascunho de Imosec são operações planejadas, separadas da alteração da política comercial. Os seis produtos somente Avise-me, sem estoque, permanecem indisponíveis e com a trava logística preservada.

## Política opcional e compatibilidade

`ShippingIntegration.settings.freeShippingPolicy` conserva o formato anterior e recebe três campos opcionais:

- `fundingMode`: `CONFIRMED_COSTS` ou `HISTORICAL_MARGIN_SHARE`. Ausência conserva o cálculo anterior de custos confirmados, sem migrar ou ativar configuração automaticamente.
- `marginShareBps`: quando informado, somente `5000`, equivalente a 50%.
- `historicalCostMaxAgeHours`: de uma a 720 horas, inclusive.

Ativar o modo histórico exige informar explicitamente os dois últimos campos. O modo anterior continua exigindo teto, contribuição mínima, reserva variável, embalagem e custos operacionais confirmados, conforme [107](107-frete-cep-e-contribuicao.md). No modo histórico, a contribuição mínima e a reserva variável anteriores não participam do orçamento; a reserva passa a ser a metade da margem descrita abaixo.

`maximumSubsidyCents` continua sendo um teto adicional quando informado. `null` significa ausência desse teto adicional, não orçamento ilimitado. Embalagem e despesas operacionais desconhecidas permanecem `null`; não são preenchidas com zero, nem apresentadas como custos atuais confirmados. Valores conhecidos continuam sendo deduzidos. O saldo reservado é uma estimativa para despesas e eventual lucro, sem garantia de lucro líquido ou de cobertura integral dos custos desconhecidos.

## Aquisição histórica elegível

O cálculo utiliza somente oferta realmente registrada e elegível pelo resolvedor comercial canônico. O conjunto de ofertas é filtrado antes da seleção pelo intervalo inclusivo entre o instante atual menos a idade máxima configurada e o instante atual. Uma oferta barata fora da janela não pode ocultar outra elegível. Datas futuras, GTIN divergente, indisponibilidade, quantidades incompatíveis e demais restrições do resolvedor impedem seu uso.

Uma oferta vencida só pode ser utilizada quando a política real de demanda do produto permitir. Quando o produto bruto de distribuidora não traz o campo computado `supplierDemandAllowed`, o cálculo obtém essa política por `withCommerceAvailability`; um `false` explícito é preservado. O resolvedor recebe o conjunto filtrado e a quantidade solicitada. Não há renovação de `observedAt` ou `validUntil`, fabricação de estoque, alteração das ofertas ou mudança de preços.

O custo final importado já inclui os componentes fiscais existentes; ST não é somada novamente. Produtos de estoque físico da farmácia sem aquisição comprovada por esse fluxo conservam o frete normal. Falta de aquisição elegível impede o subsídio, não uma cotação logística válida.

## Fórmula em centavos

Considere:

- `P`: valor dos produtos após resgates das carteiras, antes do Pix.
- `N`: `P` menos a reserva do desconto máximo de Pix de 3%, com o arredondamento monetário existente.
- `C`: custo final de aquisição elegível, multiplicado pelas quantidades.
- `R`: reserva dos ganhos elegíveis de cashback e WimiCoins, conforme as regras existentes, inclusive antes da autenticação ou seleção de Club.
- `K`: soma das despesas operacionais conhecidas da rota e da embalagem conhecida de todos os volumes cotados.
- `Q`: preço integral da etiqueta escolhida; `Qe`: preço da opção econômica elegível.

```text
MargemBase = N - C - R
MargemDisponivel = max(0, MargemBase - K)
Orcamento = floor(MargemDisponivel * 5000 / 10000)
Subsidio = min(Q, Qe, Orcamento, teto quando informado)
FreteCliente = Q - Subsidio
```

O cálculo usa `BigInt` e centavos inteiros; o subsídio é arredondado para baixo. Componentes operacionais conhecidos são deduzidos mesmo quando o custo total da rota permanece incompleto. A embalagem conhecida é multiplicada pela quantidade real de volumes. Ausência dessa quantidade, ou uma lista vazia de pacotes, impede o benefício nos dois modos; não se presume uma caixa.

A reserva de Pix não aplica desconto antecipado na interface: Pix continua sendo concedido somente quando escolhido no checkout. Resgates reduzem a receita disponível, enquanto os ganhos futuros elegíveis permanecem reservados. Frete caro pode continuar parcialmente pago mesmo com margem positiva. A modalidade mais cara preserva pelo menos a diferença para a etiqueta econômica, além de eventuais limites do orçamento ou do teto.

## Meta estimada para a composição atual

A meta aparece somente quando a modalidade econômica e o teto informado permitem gratuidade integral e a margem proporcional da composição é positiva. No modo histórico, mantendo `K` fixo e escalando a composição atual, o mínimo teórico antes do arredondamento é:

```text
P_minimo = ceil(P * (2 * Q + K) / MargemBase)
```

O resultado é arredondado para cima em múltiplos de R$ 10 e fica acima do valor atual do carrinho. Margem sem crescimento positivo, modalidade mais cara que a econômica ou teto insuficiente omitem essa meta. A projeção utiliza somente custos conhecidos e não promete gratuidade ou lucro para uma compra futura.

Mudar produtos, quantidades, resgates ou CEP exige nova cotação. O checkout recalcula as condições antes de aceitar a seleção; o contrato público e assinado continua contendo somente o benefício comercial, sem custos privados, fornecedor ou percentuais internos.

No checkout, a informação aparece antes da seleção da modalidade: primeiro uma opção já grátis; caso contrário, a menor meta válida com o valor que falta; na ausência de meta, o desconto disponível. A modalidade correspondente é identificada, e as demais opções pagas continuam visíveis e selecionáveis. A meta é estimada, vinculada à composição e à cotação atual.

## Revisão dos perfis estimados: plano separado

`scripts/review-estimated-shipping.ts` recebe manifesto explícito de até 50 identidades por lote, com ID, EAN, nome, revisão e perfil literal vinculados por SHA-256. `REVIEW_ESTIMATED` aceita somente produto ativo, não removido, com estimativa física completa e transporte ainda desativado e não revisado. O preenchimento anterior das medidas não equivale a uma revisão de transporte.

O lote conservador exclui somente Avise-me, Farmácia Popular, qualquer medicamento ou receita, cargas desconhecidas, perecíveis e sensíveis à temperatura. A revisão exige carga declarada, serviços configurados e conhecidos e resultado `allowed` na política de transporte. `conditional`, `unknown` e `blocked` não autorizam a operação. Restrições específicas de carga anteriores não podem ser removidas, nem uma lista não vazia de serviços aprovados pode ser ampliada.

O lote inicial de 318 sólidos compõe sete manifestos planejados, de até 50 itens. O kit Rexona Multivitaminas 6×84 g, GTIN `07891150083240`, recebeu manifesto adicional: conserva estimativa de 1470 g e 30 × 20 × 15 cm, diferente da unidade avulsa. Eventual aprovação dos 319 sólidos conserva `measurementBasis:estimated`, medidas, referências, proveniência e propriedades fora dos campos de revisão, ativação, carga e serviços aprovados. Não declara medição, não muda preço, estoque, oferta ou classificação sanitária e não comprova cobertura de todos os CEPs. Cada cotação continua dependente dos serviços elegíveis, da rota, da embalagem e das restrições atuais.

Dry-run é o padrão. Aplicação exige o hash do plano revisado, ADMIN ativo, lock existente do catálogo e locks transacionais do usuário e da integração, nessa ordem, antes da leitura dos produtos. O plano vincula a configuração e os snapshots atuais; CAS por revisão e perfil literal e auditoria por produto protegem a gravação. Divergência ou falha da auditoria reverte o lote; repetir um plano aplicado não duplica a aplicação.

## Imosec: somente hipótese desativada

O plano separado para Imosec 2 mg com 12 comprimidos, GTIN `07891010256364`, usa exclusivamente `DRAFT_ONLY`, permitido apenas quando o perfil anterior é literalmente nulo. A hipótese operacional autorizada é de 300 g e 24 × 15 × 10 cm, conforme a origem estipulada em [136](136-revisao-comercial-e-estimativas-finais.md). Não é peso ou medição atribuída ao fabricante.

O rascunho grava `measurementBasis:estimated`, `enabled:false`, `transportReviewed:false`, `cargoKinds:["medication"]`, `approvedServiceIds:[]` e `reference:null`. Não habilita transporte nem altera receita, status, preço, estoque ou oferta. A classificação de receita `UNREVIEWED` permanece pendente; a hipótese não libera venda, postagem ou aceitação de medicamento pela transportadora. A operação também permanece planejada, sem prova de aplicação produtiva nesta etapa.

## Origem, pontos de postagem e limites

A configuração conferida nesta análise usa origem em Ivaté/PR, Correios em Ivaté e as demais transportadoras em Umuarama. O lojista também informou disponibilidade para postar em Douradina. Essa disponibilidade não identifica, sozinha, uma unidade compatível com cada modalidade: não se altera a origem ou o ponto cadastrado sem confirmar o serviço aceito ali. Deslocamento e embalagem ainda desconhecidos permanecem sem valor confirmado; a metade retida da margem é uma reserva estimada para essas despesas e eventual lucro.

Segundo o [guia oficial de volumes do Melhor Envio](https://centraldeajuda.melhorenvio.com.br/hc/pt-br/articles/31220431416852-Qual-formato-e-tamanho-o-meu-volume-pode-ter), os limites variam conforme modalidade e ponto. PAC/SEDEX e Loggi têm limite de 30 kg, até 100 cm por lado e soma dos lados de até 200 cm. J&T em unidade própria admite 30 kg, maior lado de até 120 cm e soma de até 240 cm. Para Jadlog, pontos parceiros podem limitar a 10 kg e 60 × 60 × 60 cm; Pegaki tem regras próprias. As referências gerais de unidade própria Jadlog divergem entre 100 e 120 kg; essa divergência não autoriza aumentar o limite operacional sem confirmar a unidade efetiva. Correios, Loggi e J&T trabalham com um volume por frete; volumes adicionais exigem as etiquetas correspondentes.

O [guia oficial de mercadorias do Melhor Envio](https://centraldeajuda.melhorenvio.com.br/hc/pt-br/articles/31220391789332-Guia-de-produtos-que-podem-ou-n%C3%A3o-ser-enviados-pelo-Melhor-Envio) impõe restrições distintas para medicamentos, perfumes e aerossóis. A mercadoria precisa ser identificada corretamente, e uma cotação não comprova sua aceitação no ponto de postagem. A revisão conservadora desta etapa abrange somente cargas gerais sólidas explicitamente permitidas; não libera essas outras categorias por presumir ausência de fiscalização.

Farmácia Popular não possui entrega. A página pública foi corrigida nos dois trechos que prometiam combinar “retirada ou entrega”, passando a informar atendimento presencial e ausência de entrega. Os bloqueios existentes de compra assistida e frete para produtos do programa permanecem preservados; o lote de revisão não inclui esses produtos.

## Verificação e limites

Os testes de política e serviço cobrem o cálculo anterior, centavos e reserva de 50%, Pix, carteiras, recompensas, custos desconhecidos, extras conhecidos parciais, embalagem por volume, teto opcional, projeção e a janela histórica. Os testes do revisor cobrem identidade, hashes, bloqueios de produto/carga/serviço, ADMIN revogado, ordem dos locks, CAS, rollback no segundo item, repetição e impossibilidade de habilitar transporte por `DRAFT_ONLY`.

Os quatro arquivos de testes de benefício e revisão estimada integram `test:security`. Nesta integração, lint, typecheck, validação do Prisma e os 554 testes de segurança passaram. Os testes de interface passaram com CSS real nas larguras de 320, 390 e 1440 pixels; a regressão ADMIN também passou após a correção de teto e embalagem opcionais editáveis no modo histórico.

O QA isolado executou 13 casos em PostgreSQL 17 real, com três produtos sintéticos, sem conexão ao banco produtivo. Comprovou dry-run sem gravação, aplicação mínima, repetição recusada, divergência de hashes/configuração/identidade, hipótese desativada, rollback integral no segundo audit e concorrência de produto, usuário e configuração. O caso adicional comprovou a compatibilidade SQL de `User FOR NO KEY UPDATE` externo com CAS e audit/FK em outra conexão; não executou o helper produtivo. Containers e rede exclusivos foram removidos. Evidência local: `outputs/envio-nacional-chat15-2026-11-02/qa-postgres-receipt.json`.

A auditoria completa (`npm audit --audit-level=moderate`) terminou com código 1: 20 pacotes sinalizados, sendo três baixos e 17 moderados, sem altos ou críticos. A auditoria de produção (`npm audit --omit=dev --audit-level=high`) passou pelo bloqueio exigido: sete pacotes sinalizados, três baixos e quatro moderados, sem altos ou críticos. Em produção, os pacotes sinalizados foram `@react-email/render`, `deepmerge`, `fast-uri`, `glob`, `html-to-text`, `minimatch` e `react-email`. Os demais alertas completos incluem a cadeia de ESLint/TypeScript. As sugestões automáticas incluem mudanças incompatíveis ou regressões de versão; não foram aplicadas nesta entrega de frete.

O primeiro build compilou, checou tipos e gerou as páginas, mas falhou na gravação dos traces com `ENOSPC`. A remoção recursiva de cache foi rejeitada pela revisão automática; o cache foi preservado e compactado com NTFS. Após a recuperação de espaço, `npm run build` passou integralmente, com código 0. Comandos globais executados: `npm run lint`, `npm run typecheck`, `npm run prisma:validate`, `npm run test:security`, `npm run build`, auditoria completa e auditoria de produção citadas acima.

Aplicação real, publicação e conferência pública devem ser registradas após sua execução. Teste sintético, plano local e este registro não comprovam produção. Novas evidências desta finalização ficam em `D:/Codex-outputs/wimifarma-br/envio-nacional-01a19a02-2026-11-02`; arquivos e escopos anteriores em uso foram preservados.
