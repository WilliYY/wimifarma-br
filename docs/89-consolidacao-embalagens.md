# 89 — Consolidação e conferência das embalagens

## Correção — 20/10/2026

O lojista solicitou corrigir a cotação que transformava cada unidade em uma remessa e conferir peso/tamanho. `quoteCart` agora envia `products` unitários e `quantity` ao cálculo do Melhor Envio, mantendo `insurance_value` unitário em reais, peso em kg e medidas em cm. Não multiplica previamente peso ou seguro nem determina uma caixa por unidade. O limite operacional continua em 20 unidades; acima disso, encaminha para conferência da farmácia antes da chamada ao provedor.

Os campos atuais de `shippingProfile` descrevem uma unidade já protegida/embalada. Não são automaticamente medidas da embalagem comercial. A consolidação conserva os valores enviados, sem subtrair uma tara desconhecida, converter volume em ml para peso ou reutilizar dimensões internas como externas. Não altera o schema do banco, libera novos produtos, escolhe outra transportadora ou muda frete grátis, Pix/cashback/WimiCoins. A estimativa pontual do Dove foi revisada separadamente, conforme autorização seguinte do lojista e registro abaixo.

## Conferência do retorno e pedido

- Cada serviço precisa retornar `packages` com dimensões externas previstas, peso, seguro e distribuição dos produtos. A aplicação recusa planos incompletos, quantidades divergentes e pacotes com peso, volume, dimensões mínimas por unidade ou seguro inferiores aos dados enviados. Falha parcial exclui só o serviço inválido; falha em todos resulta em erro técnico sem inventar preço.
- Quando somente o empacotamento é inconsistente, realiza uma segunda e última consulta apenas aos serviços afetados: cada unidade recebe um envelope cúbico com o maior eixo do carrinho. Isso aumenta o espaço reservado sem diminuir peso, seguro, quantidade ou qualquer dimensão. O novo retorno precisa passar pelas mesmas checagens contra o envelope maior. Serviços válidos são preservados; não há repetição por erro de cobertura, credencial ou limite de requisições. `calculationMethod` registra `provider` ou `provider-conservative-envelope`, com aviso no painel. Não é um modelo de caixa comprado ou uma tarifa ótima garantida.
- `packaging` contém versão, origem das medidas de entrada e todos os pacotes. É validado por schema, incluído na assinatura HMAC e preservado em `Order.shippingQuote`. O painel mostra C × L × A, gramas, unidades e aviso de conferência física. Pedidos antigos continuam legíveis, sem receber uma embalagem inventada.
- `packingVersion` participa do fingerprint; cotações anteriores à correção precisam ser refeitas. CEP/carrinho/preços/perfil/revisão e expiração de 15 minutos continuam protegidos. Os 15 minutos são validade interna, não garantia de congelamento da tarifa da transportadora.

## Pesos e medidas disponíveis

Conferência inicial somente leitura dos três perfis liberados em produção em 20/10/2026, antes da revisão pontual do Dove:

| Produto | Peso cadastrado com embalagem/proteção | C × L × A | Origem |
|---|---:|---|---|
| Cimegrip 20cp | 500 g | 20,8 × 20,8 × 21,6 cm | Estimativa autorizada anteriormente |
| KitKat do cadastro atual | 500 g | 20,8 × 20,8 × 21,6 cm | Estimativa autorizada anteriormente |
| Dove óleo de banho 240 ml | 800 g | 20,8 × 20,8 × 21,6 cm | Estimativa autorizada anteriormente |

**Não há evidência de balança/régua para certificar esses dados como medidos.** O lojista informou que não dispõe das medições e autorizou pesquisar referências e usar médias com margens. As estimativas permanecem identificadas; a transportadora ainda pode ajustar valores conforme a embalagem física. Caixas pequenas/médias/grandes da loja ainda não têm inventário aferido; o algoritmo externo não prova que o modelo calculado existe fisicamente na farmácia.

### Estimativa operacional do Dove revisada

- Apresentação exata conferida: EAN `7891150098442`, 240 ml. [Goiás Atacado](https://www.goiasatacado.com.br/oleo-dove-240ml-banho-glicerinado-51854-1) informa C6 × L6 × A14 cm e peso de 0,320 kg, sem especificar se bruto/líquido. Esse peso não foi promovido a peso bruto comprovado nem convertido a partir de ml.
- Perfil operacional **estimado** adotado: **600 g; C10 × L10 × A18 cm**. Premissas explícitas: referência de 320 g acrescida de 25%, mais 200 g estimados para caixa/proteção; dimensões comerciais acrescidas de 4 cm em cada eixo. As margens são hipóteses autorizadas, não pesagem, tara aferida ou modelo de caixa adquirido.
- Aplicação transacional de uma única linha, conferindo ID/EAN/status/perfil anterior, lock de catálogo, bloqueio da linha, CAS e registro `PRODUCT_SHIPPING_ESTIMATE_UPDATED`. Origem da automação explícita, sem impersonar ADMIN; preço, estoque, demais produtos e serviços aceitos preservados. Snapshot anterior/posterior e dry-run em `outputs/embalagem-2026-10-20/estimativa-dove-*.json`, fora do Git.
- Cimegripe: a apresentação de 20 cápsulas é identificável, mas não foram localizados peso bruto/dimensões confiáveis. KitKat: nome sem EAN/gramagem/país não identifica a apresentação. Mantidos os perfis conservadores anteriores, evitando atribuir 41,5 g ou medidas de outro produto. Novos produtos continuam usando rascunhos/revisão existentes; não houve liberação logística em massa.
- Fontes de caixas pesquisadas não foram misturadas: [Embalaki 766](https://embalaki.com.br/caixa-de-papelao-16x11x5-montavel-brancaparda-766) informa externas 16 × 11 × 5 cm, internas 14,7 × 10,5 × 4,5 cm e aproximadamente 42 g, mas não comporta o Dove. Essa tara não foi aplicada a outra caixa.

## Consulta real ao provedor

Consulta autenticada exclusivamente de cálculo, com origem 87525-000 e mesmos perfis atuais, sem modificar dados, criar pedido, etiqueta ou cobrança:

| Carrinho / destino | PAC | SEDEX | Pacote previsto pelo PAC |
|---|---:|---:|---|
| 1 Cimegrip / São Paulo 01001-000 | R$ 18,08 | R$ 20,57 | 500 g; C21,6 × L21 × A20,8 cm |
| 10 Cimegrips / São Paulo 01001-000 | R$ 60,40 | R$ 79,37 | 5.000 g; C52,8 × L51,8 × A35 cm |
| 2 Dove + 2 KitKat / Curitiba 80010-000 | R$ 31,61 | R$ 37,66 | 2.600 g; C41,8 × L37,8 × A24 cm |

Todos retornaram HTTP 200 e um pacote por serviço nesses casos. Na auditoria anterior do mesmo dia, dez Cimegrips por `volumes` geravam PAC R$180,80/SEDEX R$205,70. Tarifas são observações datadas; consolidação não promete menor tarifa para qualquer carrinho nem corrige automaticamente os pesos estimados. Evidência sanitizada local: `outputs/embalagem-2026-10-20/cotacoes-provedor.json` (não versionada).

Após simular a nova estimativa do Dove, uma unidade para São Paulo retornou PAC R$19,48/SEDEX R$22,51; duas unidades, R$20,88/R$25,20. No carrinho misto, o primeiro retorno de R$24,98/R$27,59 tinha altura de 18 cm, incompatível com o menor eixo do KitKat cadastrado (20,8 cm), apesar de volume total suficiente: **não é uma opção utilizável**. A nova consulta com envelope conservador retornou PAC R$31,61/SEDEX R$37,66 e peso de 2.200 g, com eixos/volume/unidades/seguro coerentes. Evidências em `cotacoes-estimativa-dove.json` e `cotacoes-conservadoras-dove.json`; 16 planos passaram e dois impossíveis foram corretamente recusados no ensaio local.

As opções são comparadas por preço e prazo, mantendo serviços aceitos para cada mercadoria. Não se mudou o CEP de origem para fingir postagem em outra cidade. PAC/SEDEX preservam a configuração de Ivaté; não há confirmação nova de coleta, horário ou aceitação física de pontos em Umuarama. Esses custos e a revisão de subsídio regional seguem a auditoria comercial, fora desta correção de embalagem.

## Fontes oficiais e limites

- [Contrato por produtos](https://docs.melhorenvio.com.br/reference/calculo-de-fretes-por-produtos): peso/dimensões/seguro unitários e quantidade separada.
- [Fluxos de cotação](https://docs.melhorenvio.com.br/docs/cotacao-de-fretes): `products` delega o empacotamento; `volumes` descreve volumes definidos pelo integrador. Não há campo documentado de tara, proteção ou catálogo de caixas nesta requisição.
- [Consolidação de vários produtos](https://centraldeajuda.melhorenvio.com.br/hc/pt-br/articles/31220427860884-Como-s%C3%A3o-cotados-envios-com-mais-de-um-produto-por-meio-da-integra%C3%A7%C3%A3o-com-o-Melhor-Envio): dimensões calculadas podem diferir da embalagem física.
- [Compra de fretes](https://docs.melhorenvio.com.br/docs/compra-de-fretes): conservar todos os pacotes; alguns serviços exigem etiquetas/remessas separadas por pacote. Não há compra de etiqueta nesta implementação.
- [Conciliação métrica](https://centraldeajuda.melhorenvio.com.br/hc/pt-br/articles/31220446441620-Como-funciona-a-concilia%C3%A7%C3%A3o-m%C3%A9trica): medidas/peso divergentes podem gerar complemento de frete.

## Validação

Regressão reproduziu a geração antiga de `volumes` antes do patch e passou com `products` + quantidade. Testes cobrem conservação e distribuição por pacote, conversão g/kg, seguro, erros parciais, assinatura adulterada, fingerprint legado, limite de unidades e fallback conservador limitado. Checks finais: **89/89 de frete e 420/420 de segurança**, lint e typecheck aprovados; 240 testes gerais e Prisma validate também passaram. Auditoria de produção zero; completa mantém cinco high de desenvolvimento e zero critical. Revisão independente aprovou consolidação, recotação e script pontual de estimativa, após corrigir diagnóstico seguro das falhas. Conferência real pós-publicação e build Linux serão registrados após execução.
