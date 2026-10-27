# 119 — Comparação documental e refinamento dos pesos

## Rota para maior precisão

O lojista autorizou analisar as pendências, comparar pesos e acrescentar resultados mais próximos do real. A prioridade é o **peso bruto declarado da apresentação exata por GTIN**, mantendo o recipiente e seu conteúdo juntos; não derivar peso bruto da dose, dividir caixa master ou transferir peso entre marcas. O peso de expedição ainda depende da tara/proteção reais. Complementa [118](118-pesos-aproximados-para-conferencia.md) e [115](115-evidencias-logisticas-e-receitas.md).

Foram cruzados 17 produtos com referência bruta da unidade comercial por GTIN: 11 em fichas do fabricante Torrent e seis em páginas de distribuidores. As fontes, hashes e níveis de embalagem já estavam preservados nas evidências; não são novas pesagens. Em 11 apresentações orais, a fórmula genérica de 1,5 g por unidade + 30 g daria 80 g para a unidade comercial, enquanto as fichas declaram 18,6345 a 55 g. A diferença mediana nessa amostra é 57,839 g a mais. A amostra é pequena e não representa outros comprimidos, frascos ou todo o catálogo; não foi usada para reduzir silenciosamente os coeficientes gerais.

Exemplos: as fichas de [rosuvastatina](https://www.torrent.com.br/uploads/ROSUVASTATINA%20CALCICA.pdf) e [carvedilol](https://www.torrent.com.br/uploads/CARVEDILOL%20ficha.pdf) informam peso bruto por apresentação, e a ficha de [telmisartana/HCTZ](https://www.torrent.com.br/uploads/FICHA%20T%C3%89CNICA%20-%20TELMISARTANA%20HCTZ%20-%20Unica.pdf) separa as unidades. Documentos históricos continuam sujeitos à conferência da embalagem/lote atual.

Cinco rascunhos antigos de 500 g podem ser aproximados da referência comercial acrescida da reserva externa estimada: rosuvastatina 10/20 mg passa a 130/140 g; carvedilol 6,25/12,5/25 mg, a 120/120/130 g. Dois rascunhos parciais de lenços Huggies recebem 410/430 g a partir de bruto comercial declarado de 301/330 g. Esses totais incluem **100 g hipotéticos de caixa/proteção** e arredondamento para cima em 10 g; não são pesagens finais nem limites garantidos.

A pesquisa adicional oficial Torrent cobriu oito GTINs de Rosucor/Iccor. Foram feitas 12 buscas, três páginas oficiais e duas bulas conferidas. Não foram localizadas fichas físicas novas com GTIN/peso bruto: resultado zero referências novas, sem transferir dados de genérico para marca. Evidência privada em `outputs/validacao-pesos-2026-10-27/torrent/`. Outras buscas trouxeram fichas sem correspondência no catálogo ou unidades/níveis ambíguos, que não foram importadas. Não houve nova tentativa ao Martins após o HTTP 429 anterior.

## Apresentações na política `weight-only-v2`

Coeficientes de massa e reservas da v1 permanecem inalterados e explicitamente hipotéticos. O refinamento melhora a fonte e a interpretação do cadastro, sem atribuir precisão estatística inexistente.

- Referência bruta vigente e exata da unidade comercial prevalece sobre a heurística de kit do título. Assim, um pacote fechado de 48 lenços pode usar o peso bruto do próprio GTIN; a contagem não vira 48 pacotes de expedição.
- O sinal `+` de composição só é liberado quando os componentes textuais do prefixo correspondem exatamente aos `activeIngredients` cadastrados. Acessórios, brindes, componentes desconhecidos e possíveis kits continuam bloqueados. Não basta existir uma contagem ao final do nome.
- Dose em g anterior a uma única contagem oral, positiva, explícita e até 1,5 g, pode ser reconhecida como dose e ignorada no cálculo de conteúdo. O peso continua uma hipótese por comprimido inteiro; a dose nunca se torna massa bruta. Valores ambíguos ou acima dessa faixa ficam pendentes.
- Concentrações, multipacks sem fonte da unidade, fontes conflitantes/superseded, massa master/líquida sem bruto, requisitos sanitários e de carga mantêm seus bloqueios. Dimensões continuam nulas no preenchimento.

## Refinamento explícito e conservador

O aplicador de 118 aceita `--refine-references`, separado do modo padrão. O refinamento não preenche perfis nulos e só aceita documento válido de rascunho, explicitamente `measurementBasis:estimated`, `enabled:false`, `transportReviewed:false`, `reference:null` e sem serviços aprovados. Exige `EXACT_GROSS_REFERENCE` com observações vigentes da unidade comercial do mesmo GTIN. Não usa conversão genérica para sobrescrever um perfil.

Somente `weightGrams` é substituído no JSON original. Dimensões, cargo e quaisquer outras chaves permanecem literais. Igualdade de peso é no-op; perfis medidos, ativos, revisados, com referência/serviços ou inválidos ficam preservados. O plano inclui operação e perfil anterior no SHA-256; exige novo dry-run revisado, ADMIN ativo, lock de catálogo, CAS e auditoria transacional `PRODUCT_WEIGHT_DRAFT_REFINED`. Referências documentais não são alteradas.

```text
node --import tsx scripts/apply-product-weight-drafts.ts --input <GTINs.json> --actor-id <ADMIN> --refine-references
node --import tsx scripts/apply-product-weight-drafts.ts --input <GTINs.json> --actor-id <ADMIN> --refine-references --apply --expect-plan <SHA-256>
```

## Plano revisável e verificação

No snapshot de 2.745 ativos, o plano final contém **58 preenchimentos** (49 sólidos orais, seis líquidos orais e três referências brutas) e **sete refinamentos**. Permanecem 841 sem perfil nesse corte. São propostas auditadas, não transporte habilitado nem 58 novas referências físicas. Os três preenchimentos com fonte bruta são duas apresentações de telmisartana/HCTZ e o fluido capilar Dove 110 ml.

Revisão independente do código aprovada após regressões de acessórios e kits. QA final PostgreSQL 17.9 isolado passou 13 verificações: default/refinamento, campos preservados, ADMIN/hash, no-op e rollback integral por falha na segunda auditoria/CAS zero. Sequências comprovam execução e reversão da primeira atualização/auditoria. Não houve corrida simultânea real; o parser CLI é exercitado pelo dry-run operacional separado. Recursos próprios do QA foram removidos. Provas e comparação em `outputs/validacao-pesos-2026-10-27/`, fora do Git. Aplicação produtiva exige backup, revisão dos dois planos, hashes das fontes e prova própria antes de ser declarada concluída.

Passaram 13 testes direcionados (incluindo seis do estimador legado e dois do aplicador), 491 de segurança, ESLint completo e typecheck do candidato final. Auditoria de produção passou no bloqueio high/critical; a completa mantém somente o alerta moderado preexistente de `fast-uri`. Os dois dry-runs produtivos correspondem item a item ao plano offline, e os hashes das fontes testadas no PostgreSQL correspondem às fontes transferidas. Não há mudança de dependência, schema, frontend ou necessidade de reconstruir app nesta operação de dados.
