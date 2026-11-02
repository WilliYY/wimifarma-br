# 140 — Consulta de frete nas vitrines e nos relacionados

## Conferência e ajuste — 02/11/2026

A conferência pública encontrou `Ver frete` nos 24 cartões da primeira página do catálogo, nos nove resultados de sabonete Rexona e nos 24 cartões de Medicamentos. Os 45 cartões de produto da home não tinham essa ação; os oito relacionados na ficha também não ofereciam o atalho. A ficha já tinha o simulador por CEP. A contagem da home separa os 15 artigos de avaliações dos cartões de produto. Os números são da observação datada, não um contrato fixo de quantidade.

O pedido atual amplia o comportamento descrito na primeira versão do documento 132:

- As vitrines da home e os produtos relacionados passam a usar a opção `showShippingEstimate` do cartão existente.
- A home mantém um único `CatalogShippingProvider` compartilhado entre as vitrines, com CEP somente em memória durante a página. Relacionados usam um provider na sua própria superfície.
- A consulta abre o mesmo diálogo, considera uma unidade e só envia a solicitação após o cliente preencher e confirmar o CEP. Abrir o diálogo não adiciona produto ao carrinho nem consulta a transportadora automaticamente.
- Fechamento, retorno de foco, troca de produto, cancelamento de resposta antiga, arraste, teclado e preferência de movimento reduzido preservam os contratos existentes.

Catálogo, busca, ofertas, categorias, marcas e simulador direto da ficha mantêm suas integrações. Cartões informativos de medicamentos em pesquisas por assunto continuam sem ações comerciais.

## Cálculo e elegibilidade

Não há mudança de API, preço, estoque, cadastro físico, classificação de carga ou aprovação de transporte. Produtos sem estoque, removidos ou assistidos conservam os estados do documento 139. Não se atribui frete grátis genérico a todos os itens.

Na amostra real, as simulações nacionais de sabonete, medicamento, shampoo e fralda retornaram HTTP 200 com sete, duas, sete e sete opções, respectivamente. São estimativas, sujeitas a data/CEP/quantidade/serviço e às revisões logísticas existentes. Sabonete para Ivaté retornou modo local; losartana sem estoque retornou HTTP 409, sem opções. Nenhum pedido, pagamento, etiqueta ou ativação logística foi criado.

Evidência: `outputs/frete-superficies-2026-11-02/api-qa.json`.

## Validação e publicação

- TDD confirmou ausência dos botões nas duas superfícies antes da implementação. Passaram dez testes de home/carrosséis/campanha e nove do diálogo de frete. O teste da home usa o wrapper real e confere CEP entre três vitrines, um único diálogo, solicitação para uma unidade e carrinho preservado. A expectativa legada do primeiro banner foi atualizada para o destino específico Beleza já aprovado no documento 139.
- Lint, tipos, build Next.js, Prisma e 525 testes de segurança passaram. Auditoria de produção: três baixos e quatro moderados; completa: três baixos e 17 moderados. Nenhum alto/crítico. Dependências não foram alteradas e os avisos existentes permanecem registrados.
- Revisão independente aprovou componentes, testes e operador. O operador novo preserva pins de fonte, plataforma ARM64, APP, PostgreSQL, ambiente, contrato e cadeia Compose; rejeita Python otimizado e mantém motivo seguro/traceback privado nas falhas. Jobs consumidos anteriores não foram reexecutados.
- Fonte/OCI `5f24f7eca51ba629527540fac4cb19fb61aa1cec`, com commit, push, fast-forward e implantação somente do app concluídos. APP `222c0b0e72a847ede59554dd1858bfd3d53d11256000352b678709d046cd8db4`, imagem `sha256:c8071709e48baba92a11c27d69b81f77a94225ef693acd202a29a64c6c50867e`, início em 02/11 às 19:27:55 UTC. PostgreSQL, ambiente, configuração efetiva, 15 avaliações e canônico `111051951cf5e11db6f49fb8ffe4f4170350018360683cc69e957acd6fb98ef3` preservados.
- Conferência pública anônima passou em 320, 390 e 1.440 px: 45 cartões da home com 45 botões e oito relacionados com oito botões; abertura real, retorno de foco, um diálogo, CEP compartilhado entre vitrines e nenhum envio automático. Carrinho preservado, sem transbordamento horizontal, sem erros de execução JavaScript e com 128 bolhas do rodapé.
- As consultas explícitas dos diálogos retornaram entrega local; em 390 px, o cartão de lenços Cottonbaby também retornou sete tarifas nacionais reais para São Paulo, com preço visível. A interface manteve a indicação de estimativa e envio em preparação, sem tratar isso como autorização logística.

O primeiro roteiro público parou antes dos cliques por aguardar `networkidle`, condição que não se completou na página. O roteiro final usa o carregamento da página e verifica os comportamentos reais de abertura, resposta, CEP, foco e carrinho. As asserções comerciais foram preservadas; os resultados anteriores estão separados. Essa conferência não mede desempenho em todos os aparelhos nem simula cada SKU do catálogo.

Evidências privadas sem credenciais: `outputs/frete-superficies-2026-11-02/app-result.json`, `api-qa.json`, `public-v2/result.json` e as capturas da mesma pasta. Job remoto novo: `/home/ubuntu/.codex-taskdata/freight-surfaces-01a15b8f-20261102-app-v1`.

Arquivos principais: `home-page.tsx`, `home-product-carousel.tsx`, `related-products-carousel.tsx` e seus testes em `src/components/site`; README, histórico 07, complemento do documento 132 e este contrato. Comandos: testes dirigidos com `node --import tsx --test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run prisma:validate`, `npm run test:security`, auditorias completa/produção com bloqueio high e `git diff --check`.

Continuam pendentes as conferências físicas e aprovações de transporte que cada perfil exigir. Esta entrega amplia o acesso à consulta; não altera pesos, dimensões, estoque, margem, preços ou serviços aprovados.
