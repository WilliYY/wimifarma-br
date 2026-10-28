# 127 — Caixa planejada por apresentação e folga operacional

## Decisão e semântica

O lojista pediu grupos maiores e autorizou estipular medidas com 1–3 cm de variação para conferir depois. A política nova `planned-container-v2` usa **24 × 15 × 10 cm** informados pelo lojista como cenário de caixa externa para uma unidade comercial. Formas separadas: comprimidos comuns de 1 a 30 unidades, tubos dentais até 140 g e frascos de shampoo até 400 ml. Fica separada de `reviewed-family-v1` e de `comparable-package-v1`; a proposta inicial v1 não chegou a ser aplicada.

`basis:PLANNED_OUTER_BOX` registra uma decisão operacional de embalagem, sem atribuir essas medidas ao cartucho do medicamento. Não cria `Product.logisticsEvidence`, não altera observações comerciais e não cria `PackagingRecipe`. Dimensões internas e tara permanecem nulas, proteção não calibrada e encaixe não confirmado. O custo informado de R$ 1 é custo, não tara nem cobrança definida por esta política. As receitas físicas de [115](115-evidencias-logisticas-e-receitas.md) continuam exigindo medição e confirmação de compatibilidade.

Todos os resultados são `measurementBasis:estimated`, `enabled:false`, `transportReviewed:false`, `reference:null`, sem serviços aprovados. O cenário não libera cotação/postagem nem confirma que todo membro cabe na caixa real. Aplicação em carrinhos com várias unidades, materiais, fechamento, proteção, lote, tara, medidas internas e aceite por transportadora permanecem verificações separadas.

## Escopo fechado e referências

- Manifesto estrito por forma, identificador e justificativas, caixa fixa de 24/15/10, `geometryMarginCm` obrigatório inteiro entre 1 e 3, até 500 GTINs membros explícitos por grupo e pelo menos dois GTINs distintos de referência. Referências podem estar fora dos membros e ser compartilhadas entre manifestos; um membro não pode pertencer a dois cenários do mesmo arquivo. O gerador operacional escolhe 3 cm.
- Somente comprimidos comuns, com contagem inequívoca aceita pela política individual. Marcas e composições podem diferir. Cápsulas, drágeas, frascos/potes, liberação especial, sublinguais, efervescentes, mastigáveis, kits/L3P2, carga especial e restrições de receita são excluídos. `ANTIMICROBIAL` é recusado mesmo com flag legada `requiresPrescription:false`.
- As referências devem ser únicas no catálogo, da unidade de varejo com quantidade 1, vigentes, sem conflito e com três lados identificados ou cartonagem declarada. Fonte rejeitada/superada, master, unidade desconhecida e eixos não identificados não ancoram o grupo. Exigir âncora de 30 comprimidos, 140 g ou 400 ml, conforme a forma. Essa âncora limita o conteúdo da amostragem, sem provar que qualquer apresentação menor tem embalagem menor.
- Dental aceita categoria de higiene coerente e creme/gel/pasta dental individual. Não agrupar potes, refis, doses, kits/L3P2, clínicos, medicamentos com receita ou carga especial. Shampoo fica em categorias identificadas de higiene/cabelos, com exclusões próprias de refis, kits, pump/válvula/dosador, sachês, sólidos, vidro, medicamentos e carga especial.
- Ordenar eixos e limitar dispersão dimensional a duas vezes; `operationalUpperSidesCm = maximumRetailSidesCm + geometryMarginCm` deve ficar **estritamente abaixo** da caixa externa. A margem é total por eixo, aplicada uma única vez; substitui os 2 cm fixos da proposta anterior, sem acumular 2+3. Igualdade ao limite também fica pendente. Não aumentar a caixa declarada para 27/18/13 nem gerar um limite inferior físico fictício.
- Registrar mínimo, média e máximo **observados**, limite operacional calculado, GTINs, observações, hashes e contagens/conteúdos observados. A margem não é desvio-padrão, intervalo de confiança ou erro medido; não comprova espaço interno/encaixe. Não usar estatísticas dos pesos heterogêneos das referências.

O corte inicial tem 15 referências de Teuto/Torrent, contagens 4, 8, 20 e 30 e máximo comercial observado de **14,5 × 8,5 × 3,5 cm**. A concentração em dois fabricantes não constitui representatividade de mercado nem comprova embalagem igual de outros fabricantes. Não inventar cobertura de 10 unidades ou extrapolar para mais de 30.

Dental tem quatro referências de 90/140 g, incluindo o Colgate Luminous White Carvão 140 g. Máximo observado de 20,3 × 4,6 × 3,8 cm; com 3 cm de folga, limite operacional de **23,3 × 7,6 × 6,8 cm**. A referência Sensitive com unidade comercial `0` continua sem ancorar cálculos; não converter unidade ambígua em UN.

## Peso individual e conversões

`weightComputation` conserva política, família, conteúdo normalizado, unidade, densidade hipotética, reserva comercial, reserva externa e arredondamento em 10 g. `weightAppliedFrom` distingue cálculo novo de peso anterior preservado. O cálculo proposto pode diferir do peso mantido; os dois não se confundem na auditoria.

| Informação de origem | Tratamento operacional |
| --- | --- |
| g e kg de conteúdo | Normalização exata: 0,14 kg = 140 g. Acrescentar reservas quando não houver peso bruto próprio. |
| ml e L | Normalização de volume: 0,4 L = 400 ml. A massa usa hipótese explícita de 1,3 g/ml; não declarar que 400 ml pesam 400 g. |
| mg/mcg de dosagem | Massa do princípio ativo; não representa excipientes, comprimido inteiro, blister ou cartucho. Não multiplicar a dosagem para obter peso bruto. |
| Quantidade de comprimidos | Hipótese existente de 1,5 g por unidade inteira + 30 g comerciais, com arredondamento; não é medição. |
| Bruto comercial do mesmo GTIN | Embalagem comercial já incluída; não adicionar novamente 30 g comerciais. |
| Caixa/proteção externa | Reserva existente de 100 g, uma única vez; ainda sem tara medida. |

Exemplos de **novos** rascunhos com a política individual: 30 comprimidos → 180 g; creme dental 140 g → 270 g; shampoo 400 ml sem bruto próprio → 650 g. Um peso antigo permanece literal mesmo quando o novo cálculo difere. O custo de embalagem de R$ 1 não informa sua massa.

## Preservação e aplicação

O aplicador existente ganha `--planned-containers <caixas.json>` opcional, depois das referências próprias, médias por composição e famílias revisadas. Os modos anteriores mantêm seus contratos.

```text
node --import tsx scripts/apply-product-average-drafts.ts --input <GTINs.json> --planned-containers <caixas.json> --actor-id <ADMIN>
node --import tsx scripts/apply-product-average-drafts.ts --input <GTINs.json> --planned-containers <caixas.json> --actor-id <ADMIN> --apply --expect-plan <SHA-256>
```

Para este cenário amplo, um perfil preexistente só pode receber dimensões quando é um rascunho estimado/desativado, sem revisão/referência/serviços, com os três lados nulos e peso presente; além disso, uma auditoria `PRODUCT_WEIGHT_DRAFT_ESTIMATED`, política v1–v4, deve conter um `metadata.draft` integralmente igual ao perfil atual. Preservar literalmente peso e demais chaves. Perfil manual, alterado, sem proveniência ou com peso nulo permanece inteiro. Perfil nulo pode receber a política individual já autorizada, mantendo suas hipóteses explícitas.

`profileSourceAudit` registra a proveniência, separado de `weightSourceAudit`; a caixa planejada nunca autoriza refinar peso existente. O manifesto integral, catálogo, fontes, revisões e auditorias participantes vinculam o SHA-256 do plano. Mantidos ADMIN ativo, lock de catálogo, CAS e auditoria transacional `PRODUCT_PACKAGE_DRAFT_ESTIMATED`. Não alterar preços, estoque, classificação, ofertas, perfis protegidos, evidência logística ou receitas.

## Prévia e limites do corte

Snapshot inicial produtivo de 28/10/2026 às 20h47 UTC: 2.833 ativos. A verificação estrita resultou inicialmente em **419 propostas de comprimidos**, com **416 pesos preservados e três perfis nulos**. Dez apresentações sublinguais, incluindo o plural “sublinguais”, e dois perfis nulos com fontes conflitantes (Clopidogrel/Beneum) ficaram fora. O grupo de 31–60 não possui referências suficientes; cápsulas não são reunidas a esse cenário.

Com folga operacional de 3 cm e o grupo dental separado, a prévia passou para **473 propostas: 419 comprimidos e 54 dentais**, com **466 pesos existentes preservados e sete perfis novos**. Isso é prévia local do snapshot, sem aplicação produtiva. Os envelopes operacionais dos comprimidos e dentais são 17,5/11,5/6,5 e 23,3/7,6/6,8 cm, respectivamente.

Uma segunda referência de shampoo foi capturada em [Pão de Açúcar](https://www.paodeacucar.com/produto/284380/shampoo-johnsons-kids-cheirinho-prolongado-frasco-400ml): Johnson’s Kids Cheirinho Prolongado 400 ml, GTIN 07891010521448, altura/largura/profundidade de 178/96,5/48,5 mm e bruto declarado de 500 g, unidade 1 UN. Fonte, foto comercial e hashes ficam em `novo-shampoo/`. A foto serve apenas para observar recipiente/fechamento. Essa fonte foi preparada, **ainda não importada**; a simulação que a inclui deve usar arquivos `staged-*`, separados da prévia baseada nas fontes já presentes no banco. A outra referência de shampoo400 tem massa líquida, não peso bruto: pode ancorar geometria sem promover sua massa.

A simulação separada `staged-*` resultou em **534 propostas: 419 comprimidos, 54 dentais e 61 shampoos**, com 527 pesos preservados e sete perfis novos. O envelope operacional dos shampoos é 23,4 × 12,65 × 7,85 cm. O congelamento de aprovação recusa `stagedSourceOnly:true`; importar e conferir a fonte, renovar snapshot e recomputar o lote real são pré-requisitos. Não usar a simulação como prova de importação ou cotação liberada.

Artefatos privados: `outputs/grupos-logisticos-v3-2026-10-28/`. Prévia não é aplicação produtiva. A frente comercial mantém a versão estável enquanto finaliza seis itens; concluir QA isolado, revisão e checks antes de alinhar janela, atualizar snapshot e conferir novamente propostas, backup, dry-run e preservação integral.

## Validação local

Na v2 final passaram **192 testes direcionados de frete/importadores, 491 de segurança, ESLint completo e typecheck**. Revisão independente sem bloqueios, com 28 testes direcionados frescos. Auditorias completa e de produção retornaram três alertas low e um moderate, zero high/critical, em `@react-email/render`, `deepmerge`, `fast-uri` e `html-to-text`. Nenhuma dependência foi alterada; alertas não bloqueantes permanecem registrados.

PostgreSQL isolado da v2 passou **13 verificações**: matriz de proveniência/preservação, ADMIN, hash do manifesto e ID da auditoria, idempotência, reversão integral após falha na segunda auditoria ou CAS zero e prova por sequência não transacional. **600 rascunhos auditados, divididos em dois manifestos, foram aplicados numa transação em 2.449 ms**, abaixo do timeout de 180 segundos. A repetição preservou todas as tabelas. App e banco produtivos não participaram; recursos exclusivos de QA removidos, sem portas públicas. O QA usa apenas dados sintéticos.

O módulo é consumido pelo CLI e seus testes. Não há migration ou alteração de rota pública; execução não requer reconstruir/reiniciar o app. A publicação ainda exige janela livre, snapshot atualizado, código/arquivos correspondentes aos aprovados, backup, dry-run e prova produtiva. A caixa continua sem calibração física.
