# 125 — Padronização logística por famílias revisadas

## Decisão e limites

O lojista autorizou pesos e medidas aproximados e pediu reaproveitamento para grupos inteiros. A política `reviewed-family-v1` amplia os cenários estimados sem alterar silenciosamente `comparable-package-v1`. Ela não aprova transporte nem substitui as receitas físicas calibradas de [115](115-evidencias-logisticas-e-receitas.md).

Cada grupo contém identificador, marca ou aliases do mesmo fabricante, forma, conteúdo/contagem exatos, lista explícita de GTINs membros, pelo menos dois GTINs de referência, justificativa e hipótese de embalagem. A lista é revisada antes de cada lote; produtos novos não entram automaticamente por nome, categoria, NCM ou fotografia. Um GTIN não pode pertencer a dois grupos do mesmo manifesto.

As formas implementadas são comprimidos orais comuns, hidratante corporal, roll-on e lenços/toalhas umedecidas de 48 unidades. Isso não significa que todas essas formas já tenham uma família com fontes suficientes. Não misturar frascos, tubos, potes, refis, kits, contagens, líquidos ou apresentações especiais. Ingredientes diferentes podem integrar uma família experimental de comprimidos do mesmo fabricante somente mediante lista e justificativa explícitas; não usar todos os medicamentos de 30 comprimidos como embalagem universal.

## Geometria e peso independentes

- Geometria exige pelo menos dois GTINs distintos da lista, unidade de varejo com quantidade 1, lados identificados ou faca de cartonagem declarada, sem conflitos e com observações vigentes. Fontes rejeitadas/superadas e duplicatas não contam. Preservar ordem/unidade originais na evidência; cálculos ordenam lados para rotação.
- A dispersão entre maior e menor lado de cada eixo ordenado fica limitada a duas vezes. Registrar mínimo, média descritiva, máximo e proveniência por GTIN, observação e hash. A proposta usa máximo por eixo mais 2 cm totais de proteção hipotética, arredondado para cima em 0,5 cm. Não é encaixe medido ou limite garantido para os membros sem referência própria.
- Uma fonte sem classificação de massa bruta pode contribuir somente para geometria. Não transformar massa líquida ou não especificada em bruto, nem combinar observações para fabricar uma referência comercial completa.
- Peso e dimensões próprios prevalecem sobre grupos. No fallback de família, todo peso já cadastrado é preservado literalmente, inclusive nulo e mesmo quando gerado por política anterior. Um alvo sem perfil pode usar a política de peso existente. Lenços sem conteúdo em massa/volume podem usar o maior bruto de pelo menos dois GTINs da família, também com dispersão máxima de duas vezes, mais 100 g hipotéticos de caixa/proteção, arredondado para cima em 10 g.
- As reservas não são uma tara medida. Não somá-las novamente. A caixa informada de 24 × 15 × 10 cm continua sem aplicação universal; material, fechamento, proteção, lote, dimensões internas e encaixe exigem conferência física.

As exclusões de receita, cadeia fria, aerossóis, álcool, perfume, vidro, kits e apresentações especiais permanecem. Higiene sem exigência de receita pode manter o valor padrão `prescriptionType:UNREVIEWED`; isso não reclassifica medicamento nem contorna a regra quando `requiresPrescription:true`.

## Aplicação auditada

O aplicador existente ganha `--families <manifesto.json>` opcional:

```text
node --import tsx scripts/apply-product-average-drafts.ts --input <GTINs.json> --families <grupos.json> --actor-id <ADMIN>
node --import tsx scripts/apply-product-average-drafts.ts --input <GTINs.json> --families <grupos.json> --actor-id <ADMIN> --apply --expect-plan <SHA-256>
```

Ordem: dimensões próprias, coorte anterior por composição/forma/contagem, depois família explicitamente revisada. O manifesto integral participa do hash do plano e sua impressão digital é registrada na auditoria. Alterar membros, justificativa, fontes, revisão do produto ou hipótese invalida o dry-run anterior.

Mantidos ADMIN ativo, lock de catálogo, GTIN único, CAS e auditoria transacional `PRODUCT_PACKAGE_DRAFT_ESTIMATED`. Perfis manuais/medidos, revisados, habilitados, inválidos, com serviços/referência ou qualquer lado já preenchido são preservados. Não alterar preço, estoque, classificação, status, evidências de outros GTINs ou `PackagingRecipe`. Todos os novos resultados são estimados, desativados e sem revisão de transporte.

## Primeiro lote

Snapshot produtivo de 28/10/2026 às 18h13 UTC: 2.814 produtos ativos. Três famílias revisadas abrangem 11 membros: Nivea corporal 200 ml, Nivea corporal 400 ml e Huggies 48 lenços/toalhas. A comparação resultou em seis propostas novas de dimensões; cinco ficam completas em peso/dimensões estimados e uma preserva peso nulo. Os cinco membros que já possuíam dimensões ficam intactos.

Uma nova ficha própria do [Nivea Milk 200 ml na Goiás Atacado](https://www.goiasatacado.com.br/locao-hidratante-nivea-200ml-milk-extra-seca--21462) informa EAN 4005808309436, unidade 200 ml, produto 18 × 4 × 6 cm e peso 0,225 kg sem declarar bruto/líquido. O master de 24 unidades aparece separado. Portanto, somente a geometria é aproveitada, preservando o peso estimado anterior de 390 g.

Não usar o Q10 400 ml descrito como tubo no grupo de frascos. Outra ficha de roll-on apareceu no índice de busca, mas seu endereço redirecionou à página inicial; ela não foi importada nem usada para ampliar grupos. Fontes antigas Teuto com conflito master/unidade também não sustentam nova padronização automática.

Prévia, manifesto, fontes, hashes, comandos e provas privados ficam em `outputs/grupos-logisticos-2026-10-28/`. A prévia não constitui aplicação produtiva; registrar o resultado operacional somente após janela livre, backup, dry-run, aplicação e prova de preservação.

## Verificação

Testes direcionados de frete/importadores: 168 passaram. O QA PostgreSQL isolado passou 11 verificações, incluindo manifesto alterado, ADMIN, peso existente e nulo, preservação dos demais campos, idempotência e reversão integral após falha na segunda auditoria ou CAS zero. Sequência não transacional comprova que houve tentativa de escrita antes das reversões. Os recursos exclusivos do QA foram removidos.

O módulo é consumido apenas pelo CLI; não há mudança de rota pública, schema ou migration. Não é necessário reconstruir o app para executar o aplicador revisado. Revisão independente aprovou o contrato; 491 testes de segurança, ESLint completo e typecheck sem incremental passaram. Auditorias completa e de produção retornaram três alertas low e um moderate, zero high/critical, em `@react-email/render`, `deepmerge`, `fast-uri` e `html-to-text`. Nenhuma dependência foi alterada; os alertas não bloqueantes permanecem registrados.

## Resultado produtivo

Código `fcebf6e` enviado ao GitHub e sincronizado no servidor, na janela alinhada com a frente de catálogo. Backup custom verificado por catálogo/hash, fontes de execução idênticas às revisadas e seis planos transacionais iguais à prévia aprovada. Foram importadas uma referência própria e seis trincas de dimensões, com sete auditorias novas.

Cinco alterações usam família e uma usa geometria do próprio GTIN. Em Nivea 200 ml, os dois alvos de família recebem 20,5 × 8,5 × 6 cm, enquanto o Milk com fonte própria recebe 20 × 8 × 6 cm. O Soft Milk 400 ml recebe 23 × 10 × 7 cm. Dois Huggies recebem 24 × 13 × 7 cm; Rosto e Corpo, anteriormente sem perfil, recebe cenário de 430 g. Recém Nascido preserva o peso nulo de seu rascunho anterior e continua incompleto. Os cinco pesos existentes foram preservados, inclusive esse nulo.

Comparação integral comprovou preservação dos outros campos de todos os produtos, perfis/evidências fora do lote, timestamps fora dos alvos e `PackagingRecipe`. A repetição preservou os registros, sem novas gravações. App e PostgreSQL mantiveram identidades, imagens e horários de início. Saúde local/HTTPS passou e acesso anônimo ao admin de fretes retornou 401. Não houve migration ou reconstrução/reinício dos serviços.

Estado final deste corte: **2.814 ativos, 2.224 com algum perfil, 590 sem perfil, 354 com peso e três dimensões e os mesmos dois perfis habilitados anteriores**. Os novos rascunhos permanecem estimados, desativados e sem revisão de transporte. Estes números não significam que todo o catálogo está pronto para postagem.

Backup restrito: `/home/ubuntu/backups/wimifarma-br/logistics-groups-01a15b8f-20261028/`. Provas privadas no diretório local acima e em `/home/ubuntu/.codex-taskdata/logistics-groups-01a15b8f-20261028/`. A reserva desta rodada é liberada após registrar e sincronizar o encerramento; não existe aplicação pendente ou incerta.
