# 126 — Continuidade por roll-on e creme dental

## Política e fontes

A autorização de médias e padronização por famílias continua sob [125](125-grupos-logisticos-revisados.md). `reviewed-family-v1` ganha a forma aditiva `DENTAL_CREAM`: mesma marca explicitamente listada, conteúdo exato em gramas e apresentação de creme/gel/pasta dental, em categoria de higiene permitida. Tubo e bisnaga são hipóteses da família; kits, múltiplos, refis, potes, doses, receita e cargas especiais ficam fora. Não usar título/NCM como prova física.

Foram preservadas cinco capturas públicas integrais, obtidas em 28/10/2026 com resposta 200 e sem redirecionamento. O JSON `props.pageProps.product` vincula EAN, SKU e os atributos físicos do mesmo produto. Quatro possuem quantidade `1`, unidade `UN` e unidade do bruto `G` explícitas; a quinta permanece documental e pendente por unidade desconhecida. EANs são normalizados para GTIN-14 sem alterar identidade.

| Referência | EAN | Altura × largura × profundidade | Bruto |
| --- | --- | --- | --- |
| [Nivea Defende roll-on 50 ml](https://www.paodeacucar.com/produto/1638808/antitranspirante-roll-on-nivea-derma-control-defende-50ml) | 4006000181936 | 10,75 × 4 × 4 cm | 73,62 g |
| [Colgate Total Original Mint 90 g](https://www.paodeacucar.com/produto/1637924/creme-dental-colgate-original-mint-90g) | 7509546702605 | 4,6 × 17 × 3,8 cm | 109 g |
| [Colgate Natural Bicarbonato e Hortelã 90 g](https://www.paodeacucar.com/produto/1637870/creme-dental-colgate-natural-bicarbonato-e-hortela-90g) | 7509546700748 | 4,6 × 17 × 3,8 cm | 108 g |
| [Colgate Luminous White Carvão 140 g](https://www.paodeacucar.com/produto/478803) | 7509546665306 | 4,6 × 20,3 × 3,8 cm | 166 g |

A captura do [Sensitive Pro-Alívio Imediato 140 g](https://www.paodeacucar.com/produto/469662/creme-dental-original-colgate-sensitive-pro-alivio-imediato-caixa-140g), EAN 7509546653402, registra bruto 160 g e lados 5 × 20,3 × 3,8 cm, porém unidade de quantidade `0`. Sem semântica comprovada para esse código, guardar `packagingLevel:unknown`, `units:null`, sem usar seus números para peso, dimensões ou coorte. Quantidade comercial 1 isoladamente não comprova hierarquia física. Portanto, a família de 140 g ainda não tem duas referências inequívocas; somente o Luminous pode receber proposta própria.

Não usar o campo de líquido sem unidade própria para refinar massa. A primeira tentativa de captura por Python urllib recebeu 403. A consulta pública pela ferramenta de pesquisa e a captura Node `fetch` padrão retornaram 200, sem autenticação, alteração de cabeçalhos ou mecanismo de evasão. HTML comprimido e SHA-256 foram preservados; a preparação verifica novamente bytes, JSON, EAN e atributos. Esta é uma ficha comercial, não medição da embalagem de cada lote.

A ficha Nivea também apresenta o booleano “Sem Álcool: Não”. Isso fica registrado na evidência e na hipótese da família, sem inferir composição, inflamabilidade ou aceite da transportadora. Material, proteção, caixa e aprovação de carga permanecem independentes.

## Seleção e preservação

Prévia inicial sobre o catálogo produtivo de 28/10 às 19h07 UTC: duas famílias, **29 membros**, **27 propostas** de novas dimensões. Nivea roll-on 50 ml tem 14 membros e 13 propostas; Colgate dental 90 g tem 15 membros e 14 propostas. Os dois membros que já possuem dimensões são preservados. Kits/L3P2 e caixas de 4/12 unidades não pertencem ao manifesto.

A referência individual adicional do Luminous 140 g acrescenta uma proposta de 22,5 × 7 × 6 cm, com o peso estimado de 270 g mantido, totalizando **28 propostas**. Essa proposta não amplia automaticamente um grupo de 140 g.

Os três GTINs com fonte própria podem refinar peso somente quando a auditoria de política anterior corresponde integralmente ao perfil atual: Defende de 200 para 180 g; Mint e Natural de 220 para 210 g. São os brutos próprios mais 100 g hipotéticos de embalagem/proteção, arredondados em 10 g. A hipótese externa não é uma tara medida. Nos demais membros, o peso existente permanece literal; um perfil nulo pode receber o cenário anterior por conteúdo.

Dimensões próprias prevalecem. Na família Nivea, o maior envelope comercial dos dois GTINs é 10,79 × 4,02 × 4,02 cm, resultando no cenário protegido de 13 × 6,5 × 6,5 cm. O Defende com fonte própria resulta em 13 × 6 × 6 cm. A família Colgate usa 19 × 7 × 6 cm. São máximos observados mais proteção hipotética e arredondamento, sem cabimento físico garantido.

O grupo e os aplicadores mantêm manifesto explícito, mínimo de referências distintas, fontes vigentes, rejeição de conflitos, dispersão limitada, ADMIN ativo, lock, plano por hash, CAS e auditoria transacional. Não há mudança de preço, estoque, receita, perfil aprovado ou serviço. Novos perfis continuam estimados, desativados e sem revisão de transporte.

## Validação e operação

A revisão independente encontrou e reproduziu um bypass de `L3P2` em roll-on, já bloqueado para creme dental. A correção acrescenta a mesma exclusão para roll-on e regressões de alvo/referência. Nenhum membro desta prévia possui essa abreviação.

Prévia e capturas privadas: `outputs/grupos-logisticos-v2-2026-10-28/`. O QA usa PostgreSQL isolado, rede interna sem portas e dados sintéticos; a frente comercial mantém o servidor estável até encerrar sua publicação. Prévia, testes e código local não constituem aplicação produtiva. O resultado deve ser registrado após atualização do snapshot, janela liberada, backup, dry-run e comparação integral.

Validação local após a correção: 172 testes de frete/importadores e 491 de segurança, ESLint completo e typecheck passaram. QA PostgreSQL isolado passou 11 verificações com reversão comprovada e recursos removidos. Auditorias completa e de produção: três low, um moderate, zero high/critical; alertas em `@react-email/render`, `deepmerge`, `fast-uri` e `html-to-text`. Nenhuma dependência alterada; não ocultar os quatro alertas não bloqueantes. Revisão independente final sem bloqueios.

Após o encerramento comprovado da publicação comercial, o snapshot de 28/10 às 20h20 UTC encontrou 2.833 ativos. A prévia foi recalculada e manteve as 28 propostas, cinco observações, três refinamentos próprios e um perfil novo. O HEAD de liberação `6379af0` mudou apenas a documentação do catálogo em relação ao código já validado; revisão e testes continuam aplicáveis. Aplicação produtiva depende do plano transacional correspondente a esse corte atualizado.
