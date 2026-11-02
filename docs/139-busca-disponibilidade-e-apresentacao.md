# 139 — Busca, disponibilidade e apresentação dos produtos

## Problemas e comportamento esperado

- A busca por `Wimifarma` encontrava losartanas porque o texto institucional de entrega, presente na descrição e no índice, contém o nome da loja. Consultas pela loja e seus prefixos agora exigem correspondência na identidade estruturada do produto; não usam apenas esse texto institucional. Não houve alteração ou reindexação de produtos.
- `Haste flexível` e `hastes flexíveis` usam a mesma equivalência editorial explícita, em JavaScript e SQL. Não foi introduzido radicalizador genérico que misture apresentações ou doses.
- O simulador de um produto verifica situação comercial e estoque efetivo antes de oferecer retirada/entrega local ou consultar transportadoras. Ruptura retorna indisponibilidade, com `Avise-me quando chegar` quando permitido. Controlados continuam no atendimento assistido. A cotação não libera perfis de transporte pendentes.
- O primeiro banner de higiene aponta para `/catalogo?grupo=beauty`. Esse grupo e seus atalhos excluem medicamentos mesmo quando a classificação medicinal está parcial ou a categoria foi cadastrada incorretamente.
- Filtros de ofertas representam as categorias e seções dos itens elegíveis, antes da paginação. Grupos vazios ficam ocultos. `Explore também` leva a seleções regulares de higiene, infantil, dermo e fraldas adultas quando há itens disponíveis; esses atalhos não declaram desconto. Preços, margens, estoque e critérios de promoção não foram inventados ou alterados.

## Composição e via de administração

A apresentação pública une cada substância à sua concentração apenas para identidades completas conferidas:

| Apresentação | Composição exibida |
| --- | --- |
| Dorilax DT 450 mg + 50 mg + 35 mg, 12 ou 100 comprimidos | Paracetamol 450 mg + cafeína anidra 50 mg + citrato de orfenadrina 35 mg |
| Buscoduo 10 mg + 500 mg, 20 comprimidos revestidos | Butilbrometo de escopolamina 10 mg + paracetamol 500 mg |
| Alenia 6 mcg + 200 mcg, 60 cápsulas duras | Fumarato de formoterol di-hidratado 6 mcg + budesonida 200 mcg; pó para inalação |

Fontes primárias: [Dorilax DT — Aché](https://www.ache.com.br/produto/isentos-de-prescricao/dorilax-dt/), [bula Buscoduo](https://www.buscopan.com.br/bula-buscoduo) e [Alenia 6/200 — Aché](https://www.ache.com.br/produto/sob-prescricao/alenia-6-200-mcg/). O acessório da apresentação exata do Alenia não foi confirmado; não se afirma que acompanha inalador nem que seja refil.

As correções são de apresentação em cartão, ficha e dados do carrinho, depois dos gates comerciais. O nome persistido e a identidade usada na conferência da foto/logística são preservados. O alias de busca `inalação` exige nome, par de ingredientes e apresentação CMED exatos do Alenia 6/200; preserva os outros termos, como dose, refil e inalador.

A importação rejeita associações ambíguas: ingredientes ausentes, agrupados, pares sem concentração e forças com unidades compartilhadas, como `450 + 50 mg`. Não associa doses à ordem de um array. Preserva denominadores legítimos, como `125 mg/5 mL`, `10 mg/g` e `10 mg/5 g`.

## Verificação e publicação

As regressões exercitam os serviços reais com dependências isoladas, o schema de importação Rx/OTC, a renderização das ofertas e a recusa de frete para ruptura, inclusive CEP local. Revisão independente final sem achados pendentes. Passaram 128 testes dirigidos na integração e 44 na rodada final do helper/importação/ofertas, além de 525 testes de segurança. Lint, tipos e build Next.js passaram após o último ajuste.

Auditoria atual: produção com três avisos baixos e quatro moderados; auditoria completa com três baixos e 17 moderados. Nenhum alto ou crítico. Os avisos existentes não foram ocultados nem receberam atualização de dependência fora do escopo.

Estado inicial desta entrega: código local em validação, sem aplicação de dados nem publicação. O resultado do build, auditoria, QA PostgreSQL e implantação deve ser registrado abaixo após execução; testes locais não comprovam produção.

Nenhuma alteração nesta entrega aprova peso, dimensão, foto, transporte, margem ou disponibilidade de um produto. Embalagens estimadas e conferências físicas continuam no fluxo próprio.
