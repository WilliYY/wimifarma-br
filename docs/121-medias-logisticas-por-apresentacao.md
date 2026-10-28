# 121 — Médias logísticas por apresentação comparável

## Autorização e limites

O lojista autorizou continuar buscando referências e preencher pesos e medidas aproximados, inclusive por médias. A política `comparable-package-v1` acrescenta estimativas auditáveis aos rascunhos de [118](118-pesos-aproximados-para-conferencia.md) e [119](119-comparacao-e-refinamento-dos-pesos.md). Esta autorização permite inferências explicitamente estimadas; não transforma dados de outro SKU em referência física confirmada. As evidências comerciais originais permanecem intactas.

## Comparação

- Medidas comerciais vigentes do próprio GTIN têm precedência. Usar apenas unidade de varejo, quantidade 1, três lados identificados e ausência de conflito; nunca dividir eixos de uma caixa master.
- Na ausência de medidas próprias, aceitar somente sólidos orais com a mesma composição cadastrada, forma e contagem exata. Comprimido, cápsula e drágea são formas separadas. São necessários pelo menos dois GTINs distintos com medidas identificadas e bruto explícito da unidade comercial. Isso é um mínimo operacional, não amostra estatisticamente representativa.
- Evitar dispersão superior a duas vezes no peso ou em qualquer eixo ordenado. Não extrapolar para outra contagem, líquido, frasco, pote ou apresentação especial. Manter as exclusões existentes de carga e receita; não inferir massa da dose em mg.
- Registrar médias, máximos, quantidade de referências, GTINs, observações e hashes das fontes. Eixos são ordenados para permitir rotação ortogonal, sem prometer encaixe.

Para não usar uma média inferior às amostras já conhecidas, o rascunho toma o maior lado observado em cada eixo e acrescenta **2 cm totais por eixo** de proteção hipotética, com arredondamento para cima em 0,5 cm. Peso próprio bruto prevalece; sem ele, usa-se o maior bruto da coorte. Acrescentam-se **100 g hipotéticos** de caixa/proteção, com arredondamento em 10 g, preservando a reserva da política anterior sem somá-la novamente. A média continua registrada como estatística descritiva. Nenhuma dessas reservas foi medida ou constitui limite garantido para produtos não observados.

A caixa informada de 24 × 15 × 10 cm não é atribuída universalmente. As medidas propostas descrevem um cenário de pacote protegido, sem comprovar material, tara, disponibilidade dessa caixa, lote ou encaixe real. Cargas especiais e aceitação por serviço continuam independentes.

## Aplicação

`scripts/apply-product-average-drafts.ts` usa dry-run por padrão, ADMIN ativo, lock de catálogo, GTIN único, SHA-256 do plano, revisões/evidências das coortes, CAS e auditoria transacional `PRODUCT_PACKAGE_DRAFT_ESTIMATED`.

Preservar perfis medidos, ativos, revisados, inválidos, com referência, serviços aprovados ou qualquer dimensão já preenchida. Para um rascunho estimado e desativado com os três lados nulos, preencher somente os lados e preservar literalmente as demais chaves. O peso existente só pode mudar quando uma auditoria anterior `PRODUCT_WEIGHT_DRAFT_ESTIMATED`, política v1/v2/v3, comprova que o perfil atual é integralmente igual ao rascunho gerado anteriormente. Peso arbitrário ou alterado permanece intacto. Perfil nulo pode receber uma proposta completa quando elegível. A extensão v3 está documentada em [122](122-validacao-global-de-pesos-e-medidas.md).

```text
node --import tsx scripts/apply-product-average-drafts.ts --input <GTINs.json> --actor-id <ADMIN>
node --import tsx scripts/apply-product-average-drafts.ts --input <GTINs.json> --actor-id <ADMIN> --apply --expect-plan <SHA-256>
```

Todos os resultados permanecem `measurementBasis:estimated`, `enabled:false`, `transportReviewed:false`, sem referência aprovada. O preenchimento não habilita cotação ou postagem automaticamente. Não alterar preço, estoque, receita, status ou evidência logística.

## Verificação e operação

A prévia sobre o snapshot produtivo de 27/10 às 23h57 UTC, com 2.745 produtos ativos, encontrou 67 candidatos: 21 com medidas do próprio GTIN e 46 de coortes comparáveis. Este corte ainda é um plano, não comprovação de aplicação. Detalhes privados, fontes, plano e provas ficam em `outputs/medias-logisticas-2026-10-27/`.

Revisão independente identificou e corrigiu o caso de bruto próprio sem dimensões: o peso exato do alvo continua prevalecendo mesmo quando somente as medidas vêm da coorte. Drágeas e comprimidos também foram separados. A operação exige testes direcionados, QA PostgreSQL isolado, backup verificado, janela livre e prova de preservação/idempotência antes de declarar gravações produtivas.

Validação do candidato: 12 testes direcionados, 491 de segurança, ESLint completo e typecheck passaram. A revisão independente aprovou o resultado. PostgreSQL 17.9 isolado, sem portas públicas, passou 14 verificações com dados sintéticos: ADMIN/hash, fontes alteradas, preservação, aplicação e idempotência, além de reversão integral por falha na segunda auditoria e CAS zero. Sequências não transacionais comprovam execução de escrita/auditoria antes da reversão. Recursos exclusivos do QA foram removidos. Não houve migração ou necessidade de reconstruir o app.

Auditoria das dependências de produção nesta rodada: zero high/critical, um alerta moderate e quatro low, envolvendo `fast-uri` e a cadeia de renderização de e-mail. Nenhuma dependência foi alterada por esta tarefa; o bloqueio high/critical foi atendido, mas os demais alertas permanecem registrados.

## Resultado produtivo

Código `8bfc83d` enviado ao GitHub e sincronizado no servidor. Após verificar janela livre, fontes de execução idênticas às revisadas, backup custom com catálogo/hash e dry-run correspondente à prévia offline, foram preenchidas **67 trincas de dimensões** e refinados **46 pesos**. Desses alvos, 21 usam medidas do próprio GTIN e 46 usam coortes: 41 de hemifumarato de bisoprolol e cinco de telmisartana/hidroclorotiazida. Os pesos alterados passaram de 180 g para 130 g em 41 casos e para 160 g em cinco. Os demais pesos foram preservados.

Foram acrescentadas 67 auditorias. Comparação integral comprovou preservação de todos os demais campos comerciais/evidências e dos perfis fora do lote; os alvos mantiveram as demais chaves literais. A repetição não encontrou nova gravação. Todos os alvos continuam estimados, desativados e sem revisão de transporte. Estado final: **2.745 ativos, 1.904 com algum perfil, 841 sem perfil, 342 com três dimensões e os mesmos dois perfis habilitados anteriores**. Ter dimensões preenchidas não significa ter peso, embalagem e serviço aprovados.

Não houve migration, reconstrução/recriação de app ou PostgreSQL. Identidades, imagens e início dos dois serviços permaneceram iguais. Saúde local/HTTPS foi conferida; recursos do teste isolado foram removidos. Backup restrito: `/home/ubuntu/backups/wimifarma-br/package-averages-01a15b8f-20261027/`. Provas privadas e plano aplicado em `outputs/medias-logisticas-2026-10-27/` e no diretório operacional correspondente do servidor. A auditoria completa de dependências retornou os mesmos cinco alertas não bloqueantes descritos acima.

Os produtos restantes continuam pendentes quando faltam referências comparáveis. Esta etapa não usa a média de todos os medicamentos para frascos, outras contagens, líquidos, cargas especiais ou embalagens sem identificação.
