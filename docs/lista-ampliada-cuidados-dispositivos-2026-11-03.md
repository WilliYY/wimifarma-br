# Ampliação de cuidados e dispositivos — 03/11/2026

Foram incluídos **29 produtos DRAFT e 29 auditorias**, em uma única aplicação confirmada às 05:13 UTC de 03/11/2026. São 15 apresentações Roche/Accu-Chek, dez Mercur e quatro genéricos. Esta contagem pertence à presente operação e não representa o total da loja ou as inclusões de outras conversas.

## Preços e situação comercial

O lojista autorizou acréscimo entre 30% e 40% sobre o custo final nos dispositivos, órteses, itens maternos e dermocosméticos desta lista. A referência escolhida foi **35%**. Os quatro genéricos usam os **50%** já autorizados para essa classe, com identidade individual e preço abaixo do teto conservador CMED. Não houve alteração dos percentuais dos produtos existentes nem redução automática do acréscimo para caber no teto.

Os custos selecionados vieram de observações GAM autenticadas, por EAN exato, preservando rótulo **Líquido + Imposto**, valores e horários originais. Descontos e tributos já incorporados ao custo final não foram somados novamente. A apresentação com divergência de dose e as cinco observações Profarma sem comprovação fiscal suficiente permaneceram retidas.

Todos os novos registros permanecem DRAFT, com estoque físico inicial cadastrado em zero, sem SupplierCatalogOffer, ProductImage, imagem pública ou perfil de transporte. O estoque numérico do fornecedor permaneceu desconhecido. Disponibilidade textual e os registros originais `BLOQUEADO/eligible:false` não foram transformados em ofertas de compra. Cashback e WimiCoins estão desabilitados. Os medicamentos mantêm receita `UNREVIEWED`, aguardando classificação e conferência correspondentes.

## Verificação e concorrência

A aplicação reutiliza os schemas e guardas normais do catálogo, ADMIN ativo, deduplicação por GTIN/aliases em todos os estados, bloqueio compartilhado e auditoria atômica. Código, configuração, manifesto e fontes foram vinculados por hashes e revisados independentemente. Houve backup verificado, concessão exclusiva por mutex/CAS, simulação sem gravação e aplicação única.

A primeira tentativa foi encerrada como `aborted_no_apply`: a comparação global da simulação detectou alterações legítimas de pagamento e visitas, antes de qualquer inclusão. As provas e o backup dessa tentativa foram preservados. O executor corrigido compara registros e conjuntos de escrita **dentro da mesma transação Serializable**, verificando as 39 tabelas, os 29 novos produtos e suas 29 auditorias. Diferenças externas observadas após a transação são registradas separadamente, sem atribuí-las à operação nem restaurar dados de tráfego ou pagamento.

Passaram 14 testes do adaptador, 13 do executor, oito do controle e 12 casos reais no PostgreSQL isolado, incluindo rollback tardio e dois ensaios de visitas concorrentes com conexões distintas. A suíte `npm run test:security` passou com 555 testes na fonte imutável do aplicativo, sem credenciais de produção ou rede durante os testes. A auditoria completa registrou três alertas baixos e 17 moderados; a de produção, três baixos e quatro moderados; ambas sem altos ou críticos. Esses resultados não representam uma nova implantação de código público.

A conferência confirmou 29 DRAFT e 29 auditorias, com preservação na própria transação. Home e health responderam 200; as 29 páginas dos rascunhos responderam 404. A janela terminou `completed_released`, sem concessão ativa ou aplicação incerta, às 05:13:50 UTC. A base QA própria foi removida às 05:14:02 UTC, após verificar identidade, proprietário, dados sintéticos e ausência de conexões, sem `FORCE`.

## Pesquisa adicional

Uma consulta adicional de 77 candidatos e um controle positivo terminou com 78 tarefas, sem erros: 33 resultados, incluindo o controle, e 45 `not_found`. Esses resultados de busca não comprovam falta de estoque ou inexistência nas demais fontes.

Dos 32 candidatos encontrados, 31 têm EAN observado exato; um possui apenas EAN candidato e permanece retido. A revisão de dados considerou **19 apresentações coerentes para proposta DRAFT**: oito OTHER, três HYGIENE e oito PERFUMERY. Elas não foram incluídas nesta operação. Treze resultados aguardam identidade, unidade/embalagem ou classificação; ausência na CMED não comprova que um produto não seja medicamento. As propostas preservam os nomes solicitados e as correções documentais, incluindo conteúdo nominal em gramas sem convertê-lo em peso bruto de transporte.

Fotos, logística, classificação de receita e eventual publicação continuam pendentes. Dados publicados em sites podem servir de referência identificada ou estimativa; não são registrados como medição real nem habilitam automaticamente envio nacional ou anúncio no Mercado Livre.

## Evidências privadas

Os artefatos, custos, capturas e backups não são versionados. Relatório individual: `D:\Codex-outputs\wimifarma-br\lote-grande-152-2026-11-02\ops-real-v2\RELATORIO-29-CADASTRADOS-v2.json`. Complemento e retenções: `D:\Codex-outputs\wimifarma-br\cuidados77-2026-11-03\`.

Operação consumida: `wimifarma-lista-ampliada-draft29-20261102-v1`; configuração `cb2247bd8c43786388813e5ced60c05ca149e33156a4fee319acbd12fe244264`. Não reaplicar.

- Produção: SHA-256 `545cc70adca6f27eccdc5e29c8a041c67d877d23b8ddba1fac05ecff820ee2b4`.
- Visibilidade pública: `7591d256dec3bf4f94bc588bb3ee0eb57de71ef4b3509c2e1c587918cff99c60`.
- Encerramento: `6876d6892a67f8f4cefd6bffb11bece290e08c0124d5864e9ec4d8c0d8520ff2`.
- Limpeza QA: `79fdb4bf736cea4bc27ef5780f19a1348d8d2e1d68c5657fcbf5322759d77560`.

Não houve alteração versionada de código da aplicação, schema, credenciais ou permissões por esta frente. O documento registra dados e execução administrativa; não declara publicação para venda.
