# Catálogo de consulta Santa Cruz

## Objetivo e situação

Preparar os produtos da planilha Santa Cruz para descoberta no site público, além da consulta administrativa. O visitante pode pesquisar uma identidade elegível e consultar a equipe pelo WhatsApp, sem receber promessa de preço, disponibilidade ou venda.

Em 05/11/2026, o código e o manifesto combinado de 712 identidades estão preparados: 250 candidatos iniciais e 462 candidatos adicionais revisados. Outros 75 itens da segunda triagem permanecem retidos. O manifesto privado `operations/public712-manifest-v1.json` tem SHA-256 `0d479b66bf92c090a152afe434f3c98bae503e65164dfe387d60d0d37692d71a`; a liberação pública continua `PENDING`. Preparação offline, revisão de dados, testes e leitura de produção não comprovam aplicação da migration, importação de identidades ou publicação.

## Identidade separada do produto comercial

`CatalogIdentity` guarda GTIN canônico, EAN original, nome, categoria, registro privado da fonte, hashes e revisão regulatória. Não cria nem atualiza `Product`, `Offer`, preço, custo, estoque ou perfil logístico. `CatalogIdentitySuppression` guarda GTINs que não podem reaparecer como uma identidade pública independente.

O DTO público tem discriminante `kind: "CONSULTATION"` e somente identidade, nome, categoria e endereço da ficha. Não contém preço, custo, estoque, oferta, imagem, frete, carrinho ou dados brutos do distribuidor. Campos comerciais privados da planilha permanecem em `sourceRecord` e não atravessam a projeção pública.

O site combina itens comerciais e identidades de consulta na busca e no catálogo. A combinação ocorre antes da paginação, preserva a precedência comercial e elimina colisões por GTIN. Uma busca pelo GTIN exato pode priorizar a identidade correspondente. Filtros e ordenações comerciais continuam seguindo suas regras próprias.

O cartão mostra “Preço e disponibilidade sob consulta”. A ficha `/catalogo/item/[ean]` mostra nome, EAN, categoria e acesso ao WhatsApp. Identidade ausente, privada ou suprimida retorna página não encontrada. A API de busca preserva o discriminante para que consumidores não tratem uma consulta como produto comprável.

## Revisão necessária para aparecer no site

A importação começa privada. Somente uma revisão explícita `NON_MEDICINE`, com `medicine: false` e `nbcal: false`, pode propor a publicação. Medicamentos, itens sujeitos à NBCAL e classificação desconhecida permanecem privados neste fluxo.

A revisão vincula GTIN e hash da identidade exata, incluindo apresentação, nome, categoria e registro privado da fonte. Exige evidência, data válida e identificação do revisor. A aplicação exige que o revisor seja o próprio ADMIN ativo responsável pela operação. Alterar o registro da fonte invalida a revisão anterior; sem revisão nova correspondente, o item volta ao estado privado.

Nome, NCM, categoria ou ausência de correspondência na CMED não substituem essa revisão. Uma proposta de classificação não autoriza publicação. O leitor público também revalida hash, data, evidência, normalização e bloqueios atuais.

## Deduplicação e histórico

O GTIN é validado pelo dígito verificador e normalizado para 14 dígitos. Zeros iniciais são preservados; o indicador de embalagem não é descartado. O manifesto rejeita duplicatas canônicas e não aceita campos comerciais no nível público da identidade.

Um GTIN existente em qualquer estado de `Product`, inclusive `DRAFT` e `ARCHIVED`, bloqueia sua identidade de consulta. O mesmo vale para tombstones persistentes e o snapshot histórico fornecido no manifesto. A consulta pública verifica produtos e supressões em uma única leitura SQL, sem criar registros durante GET.

A migration adiciona a supressão persistente e as guardas para futuras alterações de produtos. O serviço também considera auditorias de exclusão que preservam GTIN. Exclusões antigas sem GTIN não permitem reconstruir a identidade apagada: o resultado informa `coverageGap.legacyPurgeAuditsWithoutGtin`, sem adivinhar valores.

O snapshot conhecido de 04/11/2026 contém 3.497 produtos em todos os estados. A leitura atual de 05/11/2026 às 04:56:27 UTC também encontrou 3.497 produtos. O recibo do lote registra 3.494 GTINs históricos normalizados, zero colisões atuais ou históricas entre os 250 candidatos e `legacyPurgesWithoutGtin: 0`. Esse resultado não indica uma lacuna histórica real naquela leitura e não substitui nova conferência antes da escrita.

A leitura posterior de 05/11/2026 às 11:21:24 UTC preservou os 3.497 produtos e confirmou zero colisões para o manifesto combinado de 712 identidades. A migration ainda não estava aplicada. A deduplicação será repetida transacionalmente antes de qualquer escrita.

## Fonte e lote inicial

| Evidência | Resultado |
| --- | --- |
| Planilha original | 11.342 linhas e dez colunas |
| GTIN válido | 11.326 linhas |
| GTIN inválido | 16 linhas segregadas |
| Duplicatas canônicas na planilha | Zero |
| Primeiro lote preparado | 250 candidatos de higiene, distintos por GTIN |
| Manifesto combinado preparado | 712 identidades revisadas, distintas por GTIN |
| Revisão de dados v2 | `03bcaae64a6cfc335573d693060bffe4010d2f739f554a7948b435ba77d5db6c` |
| Manifesto preparado | `3a4f2c99c8847703145486622f93c7428649b238e4932bd1ea8b603992db8038` |

A planilha é uma lista comercial. Não é nota fiscal nem comprovante de estoque. `QtdCaixa` descreve a informação de caixa fornecida e não deve virar estoque disponível. Os dez campos originais e os zeros iniciais ficam preservados nos artefatos privados.

Os artefatos duráveis desta preparação ficam em `D:\Codex-outputs\wimifarma-br\santa-cruz-publico-2026-11-05`, fora do Git:

- `data/v2/verification.json` e `data/v2/hash-receipts.json`: integridade e regressões dos dados;
- `data/v2/candidate-review.json`: revisão preparada dos 250 candidatos;
- `operations/catalog-snapshot-v2.json`: leitura atual usada na deduplicação;
- `operations/public250-manifest-v1.json` e `operations/public250-preparation-receipt.json`: manifesto e recibo `PREPARED_NOT_APPLIED`;
- `operations/public712-manifest-v1.json` e `operations/public712-preparation-receipt.json`: manifesto combinado e preparação, ainda sem aplicação;
- `validation/`: logs e recibos de validação do código, separados dos recibos de dados.

Esses caminhos identificam evidências locais desta tarefa. Não são arquivos distribuídos com o aplicativo nem autorização permanente para importar.

## Importação manual e próximos arquivos

1. Preserve o arquivo recebido e calcule seu SHA-256. Normalize os registros sem perder EAN, apresentação ou campos originais. Separe GTIN inválido e rejeite duplicatas canônicas.
2. Compare a nova fonte por GTIN e hash da identidade. Reutilize uma revisão somente quando o hash continuar exato. Toda alteração exige nova revisão antes de liberar consulta pública.
3. Atualize a leitura de todos os estados de `Product`, as supressões e o histórico conhecido. Registre o destino e a data da conferência. Verifique a cobertura das auditorias antigas.
4. Prepare o manifesto privado com as revisões aplicáveis. O script `scripts/prepare-catalog-identities.ts` recebe `--manifest`, o caminho do manifesto e um caminho diferente para o plano de saída. Ele valida o formato e escreve um arquivo novo; não conecta ao banco, não possui opção `--apply` e marca `databaseValidated: false`.
5. Execute um dry-run transacional com ADMIN ativo no destino autorizado. O serviço `executeCatalogIdentityImport` recebe uma transação do chamador; recomenda `Serializable` e mantém o lock compartilhado com as mutações comerciais. A aplicação exige o `expectedPlanSha256` do plano atual. Plano alterado exige novo dry-run.
6. Aplique somente o plano revisado no destino autorizado. Criações e auditorias usam lotes de até 500; atualizações usam CAS por `updatedAt`. Qualquer conflito deve desfazer a transação inteira. Confira o resultado persistido e a resposta pública separadamente.

O hash do plano preparado offline não comprova ausência de `Product` no destino. O script não substitui o dry-run do serviço. Não existe endpoint de aplicação pública, autorização global de produção ou agendamento recorrente criado por esta entrega. Arquivos futuros passam novamente pelo fluxo manual de diferença e revisão.

## Preço, fotos e dados físicos

A identidade de consulta não define política de venda. Para eventual cadastro comercial, custo de NF com ST já incluída não deve receber a ST novamente. Usar PF como alternativa depende da condição específica revisada e de diferença pequena aceita pelo lojista; não autoriza tratar PF e custo como iguais de forma geral.

O fluxo público atual usa o placeholder existente, sem imagem do distribuidor ou foto de apresentação parecida. Uma foto futura exige correspondência da apresentação exata e o fluxo próprio de publicação de imagens.

Peso, dimensões e embalagem desconhecidos permanecem desconhecidos. Nome, tamanho, categoria ou número de peças não autorizam inventar medidas. A identidade de consulta não produz cotação de frete e não libera compra, transporte, receita ou disponibilidade.

## Validação

O comando abaixo foi executado no worktree com dependências instaladas, dentro do executor temporário da sessão: 71 testes passaram, sem falhas.

```powershell
.\node_modules\.bin\tsx.cmd --test src/features/catalog-identities/catalog-identities.test.ts src/features/catalog-identities/import-service.test.ts src/features/catalog-identities/public-policy.test.ts src/features/products/consultation-catalog.test.ts src/features/products/search-catalog.test.ts src/features/products/storefront.test.ts src/components/site/consultation-catalog-ui.test.ts
```

Os testes cobrem validação de GTIN, privacidade, revisão exata, supressões, CAS, plano alterado, combinação e paginação, preservação do catálogo comercial e UI sem campos de compra. Esse resultado não comprova execução transacional real em PostgreSQL nem renderização em navegador.

`scripts/audit-catalog-identities-db.ts` prepara QA sintética em PostgreSQL isolado. O operador deve criar um banco vazio e aplicar as migrations reais antes da execução. O script exige `CATALOG_IDENTITIES_DB_QA=synthetic-only`, URL exclusiva em `CATALOG_IDENTITIES_QA_DATABASE_URL`, nonce hexadecimal correspondente em `CATALOG_IDENTITIES_QA_NONCE` e argumentos `--target-db`, `--target-host` e `--nonce` coerentes. O banco deve se chamar `qa_catalog_identities_<nonce>`; somente localhost, `127.0.0.1` ou host isolado com o mesmo nonce são aceitos. O script não lê `DATABASE_URL`, não cria nem remove banco e deixa os dados sintéticos para inspeção. A remoção posterior precisa conferir o destino exato.

A integração foi validada em 05/11/2026: Prisma validate, typecheck integrado, ESLint, `test:security`, `test:catalog-discovery` e build passaram. O ensaio PostgreSQL isolado aplicou 35 migrations e passou oito grupos, incluindo 501 registros, exclusão definitiva, revisão renovada e concorrência entre duas transações. Uma segunda prova somente leitura executou o SQL público real, negou a ficha privada, encontrou EAN exato, combinou o catálogo e conferiu a allowlist da API. Esses ensaios usaram somente dados sintéticos, sem DML em produção.

O ensaio real detectou uma revisão explícita indevidamente invalidada ao restaurar uma identidade já conhecida. O trigger passou a distinguir a nova revisão do reaproveitamento da anterior; os testes de adulteração permanecem. A migration corrigida tem SHA-256 `2871941e43ec7d0d617f31d57bf0be841d097705a1bce70b6e01c3e396c876db`.

Recibos privados: `D:\Codex-outputs\wimifarma-br\santa-cruz-publico-2026-11-05\validation\integrated-checks.json` e `validation\pg-qa-v3\`. A auditoria completa registrou 12 alertas (nove moderate e três low); a de produção, sete (quatro moderate e três low). Ambas ficaram sem high/critical. Nenhuma dependência ou lockfile foi alterada nesta entrega; correções de dependências seguem uma frente própria. A publicação e a conferência pública real continuam pendentes e não são comprovadas por esses testes.

`scripts/audit-catalog-identities-public.ts` complementa a QA com os leitores e o handler reais. Ele aceita somente o banco sintético ligado ao nonce, substitui a conexão por esse destino validado e impõe `default_transaction_read_only=on` em todas as conexões usadas pelos leitores.

Os ensaios anteriores comprovaram o SQL e o comportamento em PostgreSQL; registraram o histórico sintético e não substituem uma execução de `prisma migrate deploy`. A prova adicional pelo CLI real passou 27 verificações em ambiente ARM64 isolado: baseline de 34 migrations, quatro produtos sintéticos nos estados pertinentes, nova migration, histórico de 35 entradas e uma segunda execução sem alteração. Foram preservados os dados comerciais sintéticos, criadas nove supressões esperadas e confirmados zero clientes, pedidos ou identidades públicas. Node 24.21.0, Prisma 7.10.0 e lockfile foram conferidos. O recibo privado é `validation/qa-prisma-cli-v3-pass-receipt.json`; os recursos isolados foram removidos após preservar e validar seus dumps sintéticos. As duas tentativas anteriores com erros de permissão e fixture permanecem registradas, sem repetição sobre os mesmos bancos.

A suíte integral da CI no commit final e a conferência da APP continuam condições de publicação. Falhas e recibos parciais permanecem preservados no diretório privado de validação; a QA isolada não concede autorização nem comprova aplicação em produção.

## Arquivos de referência

- `prisma/schema.prisma` e `prisma/migrations/20261105120000_catalog_consultation_identities/migration.sql`;
- `src/features/catalog-identities/`: schema, plano, serviço, política e consulta pública;
- `src/features/products/consultation-catalog.ts`, `public-search.ts`, `search-catalog.ts` e `storefront.ts`;
- `src/app/api/produtos/busca/route.ts` e `src/app/(site)/catalogo/item/[ean]/page.tsx`;
- `src/components/site/consultation-product-card.tsx` e `consultation-catalog-ui.test.ts`.
