# Envio nacional e meta de frete grátis — 02/11/2026

## Estado desta etapa

O lojista autorizou expressamente a opção de usar custo de aquisição elegível observado há até 30 dias e reservar pelo menos metade da margem disponível para despesas e eventual lucro. A revisão independente, os testes, a aplicação dos perfis e a publicação do aplicativo foram concluídos. A política comercial está ativa na revisão 8, com `HISTORICAL_MARGIN_SHARE`, `marginShareBps:5000` e `historicalCostMaxAgeHours:720`.

O lote inicial revisou 319 produtos, incluindo o kit Rexona Multivitaminas 6×84 g em manifesto próprio. Na conferência final, três itens da linha elétrica Oral-B, incluindo um refil com descrição ambígua, foram devolvidos aos perfis originais desativados para identificação específica de conteúdo/bateria e aceitação por transportadora. A restauração teve revisão independente, lock, ADMIN vigente, CAS completo e três auditorias próprias. O revisor genérico ganhou regressão para recusar elétricos, baterias, pilhas e recarregáveis, preservando o caso manual permitido; os 12 testes de revisor/CLI e o lint focal passaram.

O resultado líquido é de 316 novos perfis habilitados: 44 sabonetes, 97 fraldas, 112 absorventes, 55 escovas/fios e oito itens de algodão/hastes. Com os dois perfis antigos da loja física, são 318 habilitados no total. Os 319 reviews iniciais, o rascunho desativado de Imosec e as três restaurações estão auditados. A comparação dos 320 produtos comprovou preservação de todos os campos fora de perfil logístico e atualização temporal; ofertas permaneceram iguais. Todos os perfis desta etapa continuam estimados, sem declaração de medição física. Os seis produtos somente Avise-me, sem estoque, permanecem indisponíveis e com a trava logística preservada.

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

## Meta estimada e verificável para a composição atual

A revisão de 06/11 acrescenta uma verificação informativa antes de expor a meta no produto ou no checkout. Ela preserva a política financeira, o preço do frete atual e o subsídio real. O antigo mínimo teórico, que mantinha o frete fixo e arredondava para R$ 10, deixa de determinar o valor mostrado ao cliente: poderia exigir mais de 20 unidades ou ignorar o aumento do pacote.

O assessor enumera localmente carrinhos maiores, aumentando proporcionalmente os mesmos produtos em unidades inteiras e respeitando o limite existente de 20 unidades no total. Preço, disponibilidade comercial e custo elegível por quantidade são recalculados pelas funções canônicas. A cotação atual serve somente como hipótese para selecionar o primeiro candidato; publicar a meta exige uma nova cotação física e resultado `free` no benefício canônico daquela mesma modalidade. Peso, dimensões e volumes são recalculados. Se o frete aumentar, há uma segunda tentativa com a nova hipótese.

A busca compartilha um prazo de 1.500 ms e no máximo duas chamadas adicionais reais ao Melhor Envio, incluindo eventual fallback de empacotamento. Timeout, falha, quantidade indisponível, aquisição inelegível ou candidato não comprovado omitem os dois campos da meta. A cotação paga atual continua disponível. Ausência de meta não afirma impossibilidade de frete grátis com outra composição.

Os valores publicados correspondem ao subtotal bruto concreto do candidato, sem arredondamento adicional. `remainingCents` é esse subtotal menos o subtotal bruto atual. Para a análise futura, a reserva de descontos atuais cresce proporcionalmente, arredondada para cima; isso não concede saldo ou desconto futuro e não é deduzido novamente do valor que falta. Pix, recompensas, aquisição, custos operacionais conhecidos e embalagem continuam seguindo a regra financeira original de 50% da margem.

Por exemplo, sem resgates e com preço de R$ 19,98, três unidades podem justificar meta de R$ 59,94 quando a nova cotação comprovar gratuidade. A semente antiga arredondada poderia exigir quatro unidades/R$ 79,92. O resultado continua estimado: mudanças de preço, disponibilidade, desconto, composição ou tarifa podem alterar a condição ao recotar.

Mudar produtos, quantidades, resgates ou CEP exige nova cotação. O checkout recalcula as condições antes de aceitar a seleção; o contrato público e assinado continua contendo somente o benefício comercial, sem custos privados, fornecedor ou percentuais internos.

No checkout, a informação aparece antes da seleção da modalidade: primeiro uma opção já grátis; caso contrário, a menor meta válida com o valor que falta; na ausência de meta, o desconto disponível. A modalidade correspondente é identificada, e as demais opções pagas continuam visíveis e selecionáveis. A meta é estimada, vinculada à composição e à cotação atual.

## Revisão dos perfis estimados: plano separado

`scripts/review-estimated-shipping.ts` recebe manifesto explícito de até 50 identidades por lote, com ID, EAN, nome, revisão e perfil literal vinculados por SHA-256. `REVIEW_ESTIMATED` aceita somente produto ativo, não removido, com estimativa física completa e transporte ainda desativado e não revisado. O preenchimento anterior das medidas não equivale a uma revisão de transporte.

O lote conservador exclui somente Avise-me, Farmácia Popular, qualquer medicamento ou receita, cargas desconhecidas, perecíveis e sensíveis à temperatura. A revisão exige carga declarada, serviços configurados e conhecidos e resultado `allowed` na política de transporte. `conditional`, `unknown` e `blocked` não autorizam a operação. Restrições específicas de carga anteriores não podem ser removidas, nem uma lista não vazia de serviços aprovados pode ser ampliada.

O lote inicial de 318 sólidos compõe sete manifestos planejados, de até 50 itens. O kit Rexona Multivitaminas 6×84 g, GTIN `07891150083240`, recebeu manifesto adicional: conserva estimativa de 1470 g e 30 × 20 × 15 cm, diferente da unidade avulsa. Eventual aprovação dos 319 sólidos conserva `measurementBasis:estimated`, medidas, referências, proveniência e propriedades fora dos campos de revisão, ativação, carga e serviços aprovados. Não declara medição, não muda preço, estoque, oferta ou classificação sanitária e não comprova cobertura de todos os CEPs. Cada cotação continua dependente dos serviços elegíveis, da rota, da embalagem e das restrições atuais.

Dry-run é o padrão. Aplicação exige o hash do plano revisado, ADMIN ativo, lock existente do catálogo e locks transacionais do usuário e da integração, nessa ordem, antes da leitura dos produtos. O plano vincula a configuração e os snapshots atuais; CAS por revisão e perfil literal e auditoria por produto protegem a gravação. Divergência ou falha da auditoria reverte o lote; repetir um plano aplicado não duplica a aplicação.

## Imosec: somente hipótese desativada

O plano separado para Imosec 2 mg com 12 comprimidos, GTIN `07891010256364`, usa exclusivamente `DRAFT_ONLY`, permitido apenas quando o perfil anterior é literalmente nulo. A hipótese operacional autorizada é de 300 g e 24 × 15 × 10 cm, conforme a origem estipulada em [136](136-revisao-comercial-e-estimativas-finais.md). Não é peso ou medição atribuída ao fabricante.

O rascunho gravado conserva `measurementBasis:estimated`, `enabled:false`, `transportReviewed:false`, `cargoKinds:["medication"]`, `approvedServiceIds:[]` e `reference:null`. Não habilita transporte nem altera receita, status, preço, estoque ou oferta. A classificação de receita `UNREVIEWED` permanece pendente; a hipótese não libera venda, postagem ou aceitação de medicamento pela transportadora. Sua aplicação produtiva foi verificada com o restante do lote, preservando os demais campos.

## Origem, pontos de postagem e limites

A configuração conferida nesta análise usa origem em Ivaté/PR, Correios em Ivaté e as demais transportadoras em Umuarama. O lojista também informou disponibilidade para postar em Douradina. Essa disponibilidade não identifica, sozinha, uma unidade compatível com cada modalidade: não se altera a origem ou o ponto cadastrado sem confirmar o serviço aceito ali. Deslocamento e embalagem ainda desconhecidos permanecem sem valor confirmado; a metade retida da margem é uma reserva estimada para essas despesas e eventual lucro.

Segundo o [guia oficial de volumes do Melhor Envio](https://centraldeajuda.melhorenvio.com.br/hc/pt-br/articles/31220431416852-Qual-formato-e-tamanho-o-meu-volume-pode-ter), os limites variam conforme modalidade e ponto. PAC/SEDEX e Loggi têm limite de 30 kg, até 100 cm por lado e soma dos lados de até 200 cm. J&T em unidade própria admite 30 kg, maior lado de até 120 cm e soma de até 240 cm. Para Jadlog, pontos parceiros podem limitar a 10 kg e 60 × 60 × 60 cm; Pegaki tem regras próprias. As referências gerais de unidade própria Jadlog divergem entre 100 e 120 kg; essa divergência não autoriza aumentar o limite operacional sem confirmar a unidade efetiva. Correios, Loggi e J&T trabalham com um volume por frete; volumes adicionais exigem as etiquetas correspondentes.

O [guia oficial de mercadorias do Melhor Envio](https://centraldeajuda.melhorenvio.com.br/hc/pt-br/articles/31220391789332-Guia-de-produtos-que-podem-ou-n%C3%A3o-ser-enviados-pelo-Melhor-Envio) impõe restrições distintas para medicamentos, perfumes e aerossóis. A mercadoria precisa ser identificada corretamente, e uma cotação não comprova sua aceitação no ponto de postagem. A revisão conservadora desta etapa abrange somente cargas gerais sólidas explicitamente permitidas; não libera essas outras categorias por presumir ausência de fiscalização.

Farmácia Popular não possui entrega. A página pública foi corrigida nos dois trechos que prometiam combinar “retirada ou entrega”, passando a informar atendimento presencial e ausência de entrega. Os bloqueios existentes de compra assistida e frete para produtos do programa permanecem preservados; o lote de revisão não inclui esses produtos.

## Publicação e confirmação dos Rexona

Commit de código `e2528006a18e7178a3f2d18c2ee418d7f4346096`, enviado ao GitHub e sincronizado no servidor por pull com SHA fixo. O build Linux/arm64, prepare, deploy e verify passaram no job exclusivo `national-shipping-8fcaf492ecf409d3-app`. APP confirmado: `d58d0fac5a16b7631d99889706162db79a3aca70c225e71c6903169bebd0e26e`, imagem `sha256:19dea6b82aef604abca849e98ed21b6e31aece4ff3f4271cb95ab7bae011ad5b`. Ambiente, rede, volumes, PostgreSQL e estado canônico foram preservados pela publicação do aplicativo.

Após a revisão e antes da ativação do benefício, o endpoint real do checkout retornou HTTP 200 e sete opções para os dois itens no CEP `01001000`: Rexona Multivitaminas 84 g, menor etiqueta Loggi de R$ 13,41; kit Multivitaminas 6×84 g, menor etiqueta de R$ 20,05. São cotações daquele momento usando cada apresentação e sua embalagem estimada, sem criação de pedido, pagamento ou etiqueta. Não houve remoção dos gates de elegibilidade. A gratuidade e a meta ainda não estavam ativas nessa conferência.

## Política ativa e conferência nacional

A configuração foi ativada por dry-run com hash e aplicação CAS pelo helper oficial, sob lock compatível do ADMIN. A revisão mudou de 7 para 8; OAuth não foi redefinido (`credentialsChanged:false`) e o fingerprint dos demais settings permaneceu `d1fb442467e1179c3f691658c87b9313`. Origem, locais de postagem, serviços e custos desconhecidos foram preservados literalmente. O canônico vigente `569f9dea7e7a0baa3b0befdb127c527933097f7d5800325b9f12d51511d9931a` não foi alterado por esta configuração.

Seis cotações reais nas cinco regiões retornaram HTTP 200, modo `available`, sete opções pagas e meta/valor faltante. Exemplo com **uma unidade do Rexona Multivitaminas 84 g de R$ 2,06**, sem resgates:

| Destino | Etiqueta econômica | Frete a pagar com benefício | Meta estimada | Falta |
| --- | ---: | ---: | ---: | ---: |
| São Paulo/SP | R$ 13,41 | R$ 13,27 | R$ 200,00 | R$ 197,94 |
| Porto Alegre/RS | R$ 14,45 | R$ 14,31 | R$ 220,00 | R$ 217,94 |
| Brasília/DF | R$ 14,96 | R$ 14,82 | R$ 230,00 | R$ 227,94 |
| Manaus/AM | R$ 28,48 | R$ 28,34 | R$ 420,00 | R$ 417,94 |
| Recife/PE | R$ 19,11 | R$ 18,97 | R$ 290,00 | R$ 287,94 |
| Salvador/BA | R$ 25,74 | R$ 25,60 | R$ 380,00 | R$ 377,94 |

Esses números pertencem à cotação e à composição testadas, não são mínimos fixos por estado. O carrinho real é recalculado ao mudar produtos, quantidade, benefícios ou CEP. Uma simulação de checkout com 20 itens elegíveis, total de R$ 564,68, retornou frete Total Express de R$ 43,24 integralmente subsidiado, cliente R$ 0,00, e seis modalidades alternativas ainda pagas. Não foi criado pedido, pagamento ou etiqueta.

A interface da produção passou em 390 e 1440 pixels: sete opções pagas e uma nota de meta/valor faltante, sem erros ou overflow. A inspeção visual independente confirmou texto e valores legíveis; retirada grátis é apresentada separadamente. Evidências e screenshots estão no diretório D: indicado abaixo.

## Verificação e limites

Os testes de política e serviço cobrem o cálculo anterior, centavos e reserva de 50%, Pix, carteiras, recompensas, custos desconhecidos, extras conhecidos parciais, embalagem por volume, teto opcional, projeção e a janela histórica. Os testes do revisor cobrem identidade, hashes, bloqueios de produto/carga/serviço, ADMIN revogado, ordem dos locks, CAS, rollback no segundo item, repetição e impossibilidade de habilitar transporte por `DRAFT_ONLY`.

Os quatro arquivos de testes de benefício e revisão estimada integram `test:security`. Nesta integração, lint, typecheck, validação do Prisma e os 554 testes de segurança passaram. Os testes de interface passaram com CSS real nas larguras de 320, 390 e 1440 pixels; a regressão ADMIN também passou após a correção de teto e embalagem opcionais editáveis no modo histórico.

O QA isolado executou 13 casos em PostgreSQL 17 real, com três produtos sintéticos, sem conexão ao banco produtivo. Comprovou dry-run sem gravação, aplicação mínima, repetição recusada, divergência de hashes/configuração/identidade, hipótese desativada, rollback integral no segundo audit e concorrência de produto, usuário e configuração. O caso adicional comprovou a compatibilidade SQL de `User FOR NO KEY UPDATE` externo com CAS e audit/FK em outra conexão; não executou o helper produtivo. Containers e rede exclusivos foram removidos. Evidência local: `outputs/envio-nacional-chat15-2026-11-02/qa-postgres-receipt.json`.

A auditoria completa (`npm audit --audit-level=moderate`) terminou com código 1: 20 pacotes sinalizados, sendo três baixos e 17 moderados, sem altos ou críticos. A auditoria de produção (`npm audit --omit=dev --audit-level=high`) passou pelo bloqueio exigido: sete pacotes sinalizados, três baixos e quatro moderados, sem altos ou críticos. Em produção, os pacotes sinalizados foram `@react-email/render`, `deepmerge`, `fast-uri`, `glob`, `html-to-text`, `minimatch` e `react-email`. Os demais alertas completos incluem a cadeia de ESLint/TypeScript. As sugestões automáticas incluem mudanças incompatíveis ou regressões de versão; não foram aplicadas nesta entrega de frete.

O primeiro build compilou, checou tipos e gerou as páginas, mas falhou na gravação dos traces com `ENOSPC`. A remoção recursiva de cache foi rejeitada pela revisão automática; o cache foi preservado e compactado com NTFS. Após a recuperação de espaço, `npm run build` passou integralmente, com código 0. Comandos globais executados: `npm run lint`, `npm run typecheck`, `npm run prisma:validate`, `npm run test:security`, `npm run build`, auditoria completa e auditoria de produção citadas acima.

Aplicação real, publicação e conferência pública estão registradas nos recibos de perfis, auditoria, ativação da política, publicação APP, cotações, carrinho gratuito e interface em `D:/Codex-outputs/wimifarma-br/envio-nacional-01a19a02-2026-11-02`. O texto final e a guarda adicional do revisor genérico serão integrados pelo chat 9 com os commits locais já validados dele; não se fez push/pull de um HEAD que incluísse código concorrente ainda não publicado. Arquivos e escopos anteriores em uso foram preservados.
