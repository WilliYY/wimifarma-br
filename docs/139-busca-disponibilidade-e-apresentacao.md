# 139 — Busca, disponibilidade e apresentação dos produtos

## Problemas e comportamento esperado

- A busca por `Wimifarma` encontrava losartanas porque o texto institucional de entrega, presente na descrição e no índice, contém o nome da loja. Consultas pela loja e seus prefixos agora exigem correspondência na identidade estruturada do produto; não usam apenas esse texto institucional. Não houve alteração ou reindexação de produtos.
- `Haste flexível` e `hastes flexíveis` usam a mesma equivalência editorial explícita, em JavaScript e SQL. Não foi introduzido radicalizador genérico que misture apresentações ou doses.
- O simulador de um produto verifica situação comercial e estoque efetivo antes de oferecer retirada/entrega local ou consultar transportadoras. Ruptura retorna indisponibilidade, com `Avise-me quando chegar` quando permitido. Produto arquivado/removido durante uma consulta retorna estado próprio, sem formulário de CEP, convite de retirada ou aviso de reposição; oferece atendimento. Controlados continuam no atendimento assistido. A cotação não libera perfis de transporte pendentes.
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

## Produção verificada em 02/11/2026

- Fonte/OCI final `ad0107f0f558188c1499b8e2613e3a140132e7e7`, após `52c3e25` e o fechamento do caso HTTP 404. Commit e push concluídos; servidor atualizado por fast-forward. Build oficial Linux ARM64 e implantação somente do app, com imagem anterior preservada para recuperação.
- APP `7f1991861c14f02dd01b996ca0f76719df6f87949fc16a1c1c425b11d0b08e7a`, imagem `sha256:f3c2aa120c6c9255ded36bec9a23b9d7bd1a378e015b3ea9f439ed6b353dd863`, iniciado às 18:48:35 UTC. Identidade, saúde e contrato foram reconferidos às 18:56:16 UTC. PostgreSQL, configuração efetiva, ambiente e as 15 avaliações foram preservados.
- O chat 10 liberou explicitamente a janela após concluir seu bloco independente de seis rascunhos. Esta implantação preservou o canônico `111051951cf5e11db6f49fb8ffe4f4170350018360683cc69e957acd6fb98ef3`; não repetiu a operação nem modificou dados de catálogo.
- QA PostgreSQL 17 real: 15 asserções em sessão e transação forçadas a somente leitura, com `transaction_read_only=on` conferido antes/depois. Fonte de ferramentas `52c3e25`, imagem `sha256:7501b32f16926b5ff5bb5029d7c4931ff121cd3996c5031f7669976b046c6b08`; módulos de busca, composição, Prisma e dependências permaneceram idênticos até `ad0107f`. Nenhuma escrita de dados; o ajuste posterior de estado 404 passou em 28 testes de interface, nova revisão, lint, tipos, 525 testes de segurança e build finais.
- QA pública anônima em 390 e 1.440 px: busca institucional sem losartanas indevidas, três cotonetes no singular/plural, Alenia inalatório, pares de concentração nas fichas, dois pontos de `Avise-me` na losartana indisponível e ausência de formulário de CEP nessa ficha. Banner aponta para Beleza; higiene sem medicamentos. Sem erros de execução JavaScript nem transbordamento horizontal nas páginas inspecionadas; 128 bolhas do rodapé preservadas. Não foi medido novo índice PageSpeed ou desempenho de animação.
- Teste complementar abriu os filtros no celular e seguiu os quatro atalhos regulares de ofertas. Higiene e beleza, Infantil, Dermo e Fraldas adultas retornaram produtos; o grupo de ofertas Medicamentos continuou com resultados. Isso não cria campanhas, descontos ou disponibilidade inexistentes.
- Quatro simulações públicas reais de frete: losartana indisponível recebeu HTTP 409 tanto para Ivaté quanto São Paulo, sem opções de entrega; sabonete disponível recebeu HTTP 200/local em Ivaté e HTTP 200/estimativa com sete tarifas para São Paulo. Estimativa não representa aprovação logística ou habilitação para contratar envio. Nenhum pedido, pagamento, etiqueta, conta ou aviso de reposição foi criado.

Evidências locais, sem credenciais: `outputs/busca-disponibilidade-2026-11-02/qa-search-real.json`, `app-result.json`, `final-runtime.json`, `public-v2/public-qa.json`, `offers-qa/result.json` e `public-shipping-qa.json`. O job remoto novo e consumido está em `/home/ubuntu/.codex-taskdata/search-availability-01a15b8f-20261102-app-v1`; não deve ser reexecutado.

Os primeiros ensaios isolados falharam no carregador de módulos dinâmicos do Prisma, antes da validação comercial; a execução final usou o carregador nativo e passou. O primeiro roteiro público exigia incorretamente objetos `Product` no catálogo: a aplicação publica `CollectionPage/ItemList`. O roteiro foi corrigido para conferir a lista estruturada contra os cartões e as categorias visíveis, sem mudar o app. Resultados anteriores permanecem separados. Cancelamentos `ERR_ABORTED` durante mudanças de página e requisições bloqueadas deliberadamente foram registrados; não equivalem a teste de todas as redes/rotas do site.

## Arquivos e comandos

| Área | Arquivos principais |
| --- | --- |
| Busca | `src/features/products/public-search.ts`, `search-catalog.ts` e testes |
| Apresentação | `medicine-presentation.ts`, `display-name.ts`, `public-product-card.tsx`, ficha `produto/[slug]/page.tsx`, revisão de carrinho e testes |
| Importação | `src/features/supplier-catalog/import-manifest.ts` e testes Rx/OTC |
| Navegação | `storefront.ts`, `catalog-page.tsx`, `catalog-category-navigation.tsx`, `home-page.tsx`, página de ofertas e testes |
| Frete | `public-estimate.ts`, contrato/controlador de estimativa, `delivery-estimator.tsx` e testes |
| Documentação | `README.md`, histórico 07 e este documento |

Comandos principais: testes dirigidos com `node --import tsx --test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run prisma:validate`, `npm run test:security`, `npm audit --omit=dev --audit-level=high`, auditoria completa com o mesmo limiar e `git diff --check`. QA de PostgreSQL e produção usaram os artefatos acima; navegação pública com sessões descartáveis e bloqueio de mutações/analytics, salvo as quatro simulações explícitas de frete.

Nenhuma alteração nesta entrega aprova peso, dimensão, foto, transporte, margem ou disponibilidade de um produto. Embalagens estimadas e conferências físicas continuam no fluxo próprio.
