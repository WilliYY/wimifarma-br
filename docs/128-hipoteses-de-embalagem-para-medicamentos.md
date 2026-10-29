# 128 — Hipóteses de embalagem para medicamentos

## Decisão — 29/10/2026

O lojista reiterou o pedido de estimativas para medicamentos, tomando como exemplo aproximado um cartucho de Losartana de **6 × 4 × 2 cm** e autorizando folga operacional de 1–3 cm. Não informou contagem nem GTIN desse exemplo; esses campos permanecem nulos. Não se presume que o exemplo corresponde a 30 comprimidos ou à embalagem de todo medicamento.

Opções consideradas: ampliar as coortes documentais da política [127](127-caixa-planejada-para-grupo-amplo.md), aguardar uma referência física para cada apresentação ou criar hipóteses operacionais identificadas. Ampliar a coorte sem amostras atribuiria às fontes uma cobertura que elas não têm. A espera individual impediria a preparação aproximada já autorizada. Foi escolhido o estimador puro separado **`owner-package-hypothesis-v1`**, `basis:OWNER_PACKAGE_HYPOTHESIS`.

O estimador não cria `Product.logisticsEvidence`, observações, URLs, hashes documentais, amostras ou `PackagingRecipe`. `geometrySource:OWNER_AUTHORIZED_HYPOTHESIS` e contagem geométrica de amostras zero distinguem a hipótese de observações comerciais. O exemplo do titular fica na auditoria com contagem/GTIN nulos. Fontes próprias documentadas e as políticas anteriores mantêm prioridade.

## Cenários operacionais

Os envelopes abaixo são escolhas de preparação por apresentação, sem proporcionalidade física inferida da quantidade. Não são limites medidos nem médias representativas. A margem inteira configurável de 1–3 cm é total por eixo e aplicada uma única vez; o lote operacional usa 3 cm.

| Grupo | Envelope hipotético (cm) | Com 3 cm de folga (cm) |
| --- | --- | --- |
| Sólidos orais de 1–30 unidades | 15 × 9 × 4 | 18 × 12 × 7 |
| Sólidos orais de 31–60 unidades | 17 × 10 × 5 | 20 × 13 × 8 |
| Sólidos orais de 61–120 unidades | 18 × 11 × 6 | 21 × 14 × 9 |
| Líquidos orais até 60 ml | 13 × 6 × 5 | 16 × 9 × 8 |
| Líquidos orais acima de 60 até 150 ml | 17 × 6 × 6 | 20 × 9 × 9 |
| Cremes/pomadas/géis em massa até 60 g | 18 × 6 × 4 | 21 × 9 × 7 |

O perfil de frete recebe a **caixa externa de 24 × 15 × 10 cm** já declarada pelo lojista. O envelope hipotético e a folga ficam na auditoria. A comparação exige que cada lado calculado seja estritamente menor que o lado nominal da caixa; igualdade também fica pendente. Isso verifica apenas a coerência numérica do cenário, sem confirmar espaço interno, orientação ou encaixe de qualquer SKU. Material, fechamento, medidas internas e tara conhecidos permanecem nulos; uma forma de recipiente presumida só existe dentro do bloco de hipótese.

## Elegibilidade e peso

Reutilizar `estimateWeightOnly` v4 para identificar a apresentação e obter o peso individual. Sólidos aceitam comprimidos, cápsulas e drágeas com contagem inteira até 120. XR/SR podem participar desta hipótese autônoma, sem inferir equivalência clínica ou da embalagem com comprimidos comuns. Excluir cápsulas moles/softgel, sublinguais/orodispersíveis, frascos/potes nos sólidos, kits, carga especial e vidro explicitamente indicado. Permanecem bloqueados controlados, antimicrobianos, receita pendente quando `requiresPrescription:true` e Farmácia Popular.

`UNREVIEWED` com `requiresPrescription:false` é uma combinação legítima de cadastro, utilizada também por MIP no contrato atual; não representa sozinha receita pendente. O estimador segue a mesma distinção da v4. Isso não classifica automaticamente o produto como MIP nem altera `catalogClassification` ou qualquer flag sanitária. `CONTROLLED` e `ANTIMICROBIAL` continuam recusados independentemente do booleano.

Líquidos ficam restritos às formas orais já reconhecidas pela v4 e ao máximo de 150 ml; não ampliar para oftálmico, nasal ou tópico em ml. Tópicos em massa exigem apresentação individual coerente, sem pote/refil/kit, até 60 g. Evidência inválida, GTIN divergente ou conflito bloqueia a hipótese. Dimensões próprias identificadas adiam esta via para a preparação documental existente.

Dosagem em mg/mcg não representa o peso do comprimido inteiro. A hipótese existente usa 1,5 g por unidade inteira, reserva comercial de 30 g e reserva externa de 100 g, sem duplicação. Volumes usam 1,3 g/ml como densidade hipotética, não uma igualdade entre ml e g. Um bruto próprio do mesmo GTIN já inclui a embalagem comercial; a reserva comercial não é somada outra vez. Arredondamento em 10 g. Exemplos de **novos** perfis: 30/60/120 sólidos = 180/220/310 g; 60/150 ml = 210/330 g. Nenhum desses coeficientes é pesagem ou limite garantido.

## Manifesto, aplicação e preservação

O manifesto estrito informa identificador, grupo, GTINs explícitos, envelope hipotético, margem, caixa nominal e justificativas. IDs e membros não podem se repetir entre grupos; intervalos dos grupos não se sobrepõem. Limite de 500 membros por grupo e 100 grupos. O aplicador ganha argumento opcional `--owner-medicine-scenarios <hipoteses.json>`, após as referências, coortes, famílias e caixas da política anterior.

```text
node --import tsx scripts/apply-product-average-drafts.ts --input <GTINs.json> --owner-medicine-scenarios <hipoteses.json> --actor-id <ADMIN>
node --import tsx scripts/apply-product-average-drafts.ts --input <GTINs.json> --owner-medicine-scenarios <hipoteses.json> --actor-id <ADMIN> --apply --expect-plan <SHA-256>
```

O manifesto inteiro participa de `ownerMedicineScenariosSha256` e do hash do plano. ADMIN ativo, lock de catálogo, CAS e auditoria transacional são preservados. A nova basis participa explicitamente da mesma proteção dos cenários amplos: perfil anterior precisa ser rascunho estimado/desativado, sem revisão/referência/serviços, com peso presente e os três lados nulos; auditoria original `PRODUCT_WEIGHT_DRAFT_ESTIMATED` v1–v4 deve ter `metadata.draft` integralmente igual ao perfil atual. Peso e demais chaves são preservados literalmente. Perfil nulo recebe apenas a estimativa individual autorizada. Perfil manual, protegido, parcial, sem peso ou sem proveniência íntegra fica intacto.

`weightComputation` explica a proposta individual, e `weightAppliedFrom` distingue peso novo do existente preservado. Todos os resultados continuam `measurementBasis:estimated`, `enabled:false`, `transportReviewed:false`, `reference:null`, sem serviços aprovados. Não alterar preço, estoque, classificação, imagem, evidências, receitas ou flags comerciais. Preenchimento não confirma transporte ou dispensação.

## Preparação e verificação

Snapshot de leitura produtiva de 29/10/2026 às 03h46 UTC: 2.863 ativos e um DRAFT. A triagem cadastral indicou potencial de 301 medicamentos (281 perfis com proveniência e 20 nulos). Os gates finais excluíram o Daflon em 30 envelopes de 10 ml, que não representa um único frasco de 10 ml. A prévia fechada resultou em **300 propostas: 197 sólidos, 95 líquidos orais e oito tópicos, com 280 pesos preservados e 20 perfis novos**. Um ativo sem GTIN válido não integra os lotes por identidade. É uma prévia, sem afirmar aplicação.

Passaram 210 testes de frete/importadores, 491 de segurança, ESLint completo e typecheck, sem geração incremental de cache. A revisão independente não encontrou bloqueios e passou 29 testes direcionados. Auditorias completa e de produção registraram três alertas low e um moderate, zero high/critical, em `@react-email/render`, `deepmerge`, `fast-uri` e `html-to-text`; nenhuma dependência foi alterada.

PostgreSQL 17 isolado, sem portas públicas ou rede externa, passou 16 verificações. Abrange as seis famílias, pesos existentes e perfis novos, ausência de amostragem física fictícia, ADMIN/hash/proveniência, perfis protegidos, preservação de todas as tabelas em dry-run e repetição, reversão após falha na segunda auditoria ou CAS e prova por sequência não transacional. As combinações sanitárias proibidas foram rejeitadas pela constraint real, preservada. Quatrocentos rascunhos sintéticos foram aplicados em exatamente uma transação em 1.175 ms, abaixo do timeout de 180 segundos; recursos exclusivos de QA removidos.

O preparador produtivo confere plano integral, revisão do produto e auditoria original antes de criar um recibo vinculado aos hashes do baseline, dry-run, aprovação e backup. O aplicador repete essas comparações antes do marcador atômico de início; execução incerta não autoriza repetir a escrita. Quatorze regressões sintéticas cobrem alterações de perfil/revisão/proveniência/backup, plano divergente, recibo ausente ou sobrescrito e amostragem fictícia. A prova usa snapshots coerentes em transações `RepeatableRead`. Scripts, override e módulos executados ficam congelados na aprovação.

Artefatos privados da rodada: `outputs/medicamentos-cenarios-2026-10-29/`. A aplicação produtiva ainda depende de janela livre, snapshot renovado, backup, plano revisado e prova de preservação/idempotência. Não reutilizar markers, backups, grants ou aprovações de rodadas encerradas. A aplicação produtiva desta rodada ainda não está confirmada.
