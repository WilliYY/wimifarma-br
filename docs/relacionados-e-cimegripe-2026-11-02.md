# Relacionados coerentes e apresentação do Cimegripe

Em 02/11/2026, o ranking de relacionados deixou de aceitar somente categoria, sintomas ou um ingrediente em comum. Medicamentos precisam ter a mesma composição completa cadastrada, concentração identificável e forma/formulação compatível. Associações exigem apresentação com os pares ingrediente/dose já conferidos em `medicine-presentation.ts`; listas separadas de doses e ingredientes não são combinadas por posição. Cadastros incompletos podem ficar sem relacionados. Isso não afirma equivalência terapêutica nem autoriza substituição ou muda regras de receita.

A assinatura conserva o texto completo da apresentação depois de retirar doses já vinculadas, contagem, volume de embalagem e identidades cadastradas completas. Não existe uma lista fechada de qualificadores descartáveis: termos como orodispersível, dispersível, entérico, vaginal ou uma formulação desconhecida permanecem na comparação, inclusive antes da forma ou da dose. Acentos, caixa, espaços e singular/plural de comprimido/cápsula são normalizados; outras diferenças de redação podem omitir uma sugestão para evitar equivalência não confirmada.

A consulta da página individual busca medicamentos por todos os ingredientes antes do ranking, evitando preencher o limite de candidatos apenas com a categoria ampla. Higiene e perfumaria permanecem dentro da família identificada pelo nome, priorizando marca e linha. Foram acrescentadas famílias de lenços umedecidos, hastes flexíveis, escovas dentais, fio dental, absorventes e enxaguantes bucais. Cadastro sem família reconhecida não ganha sugestões apenas pela categoria.

## Identidade conferida: EAN 7896523200576

- [CIMED — Cimegripe](https://cimedremedios.com.br/remedio/cimegripe/), consultada em 02/11/2026: cápsulas duras, apresentações de 10 e 20 unidades, registro MS 1.4381.0272 e composição explicitamente identificada: paracetamol 400 mg, maleato de clorfeniramina 4 mg e cloridrato de fenilefrina 4 mg.
- [SEFA/PR — PMPF de 13/03/2026](https://www.fazenda.pr.gov.br/sites/default/arquivos_restritos/files/documento/2026-03/pmpf_pr_20260313.pdf), página 25: o GTIN 7896523200576 identifica CIMEGRIPE 400 mg + 4 mg + 4 mg, 20 cápsulas. Outros GTINs identificam gotas e embalagens diferentes.

`toSaleProduct` aplica uma correção derivada somente para esse EAN exato e títulos legados reconhecidos (`Cimegrip20cp`, `Cimegrip 20cp`, `Cimegripe 20 cápsulas`) ou o título completo conferido. Marca conflitante, composição parcial/conflitante, outro título ou outro EAN impedem a correção automática. A saída passa a conter `Cimegripe 400 mg + 4 mg + 4 mg 20 cápsulas` e os três ingredientes separados, com os pares de dose conferidos.

A correção também exige que a consulta tenha carregado `brand` e `activeIngredients`: campo omitido não comprova ausência de conflito. Checkout, revisão de carrinho e o aviso de carrinho Miauby carregam esses campos de identidade junto do EAN. Consumidores de disponibilidade que não carregam a identidade completa conservam o nome original, sem enriquecimento automático. Testes do checkout e da revisão usam projeções falsas que respeitam `select`, comparando o caso válido com marca e composição conflitantes.

O objeto original, banco e importações não são alterados. IDs, slug, preços, classificação, receita, estoque e disponibilidade continuam iguais. Saídas públicas, novos carrinhos e novos pedidos que usam esse DTO recebem a apresentação correta. Snapshots de pedidos existentes permanecem persistidos como estavam. Fluxos que não selecionam EAN não recebem enriquecimento por nome apenas.

Uma correção persistente posterior deve usar revisão ADMIN auditável do mesmo EAN, registrando nome e composição anteriores e as duas fontes acima; nenhuma alteração persistente foi executada nesta tarefa. A orientação antiga de `docs/39-frete-automatico-e-embalagens.md` era provisória; a identidade agora foi conferida nas fontes acima. Nenhuma medida logística foi inferida.

## Verificação

Os testes dirigidos cobrem exclusão de ingredientes parciais, sintomas isolados, dose/forma/liberação divergentes, decimais, denominadores, associações desconhecidas, famílias de higiene e a identidade exata do Cimegripe. O teste do DTO compara todos os demais campos com a saída comercial anterior e verifica que a entrada não sofre mutação.

Foram aprovados 101 testes dirigidos e ESLint dos arquivos alterados. A revisão independente identificou e teve corrigidos dois casos: qualificadores de formulação desconhecidos e projeções incompletas de identidade. A revalidação independente aprovou probes bidirecionais e projeções conflitantes, sem achados restantes.

Publicação verificada em 03/11/2026, fonte `d5b568a5e78864f822d7ff7d23b6bec4d698718d`: a busca pública pelo EAN mostrou `Cimegripe 400 mg + 4 mg + 4 mg 20 cápsulas` e os três princípios ativos. Nenhum pedido ou pagamento foi criado. Resultado integrado em [catálogo próprio](catalogo-loja-fisica-e-conferencia-2026-11-02.md#publicação-verificada--03112026); recibos em `D:/Codex-outputs/wimifarma-br/catalog-comparison-2026-11-02/`.
