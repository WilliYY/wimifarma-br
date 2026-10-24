# 104 — Vitrines, produtos âncora e rotação diária

## Pedido e evidência de mercado

Em 23/10/2026, o lojista pediu pesquisa de mercado e rotação dos produtos das três vitrines da home. A seleção anterior mantinha os cinco menores preços fixos e podia abrir a faixa de economia com cinco fragrâncias do mesmo sabonete. A Farmacinha podia repetir o mesmo princípio ativo com marcas/apresentações distintas.

A pesquisa orienta hipóteses editoriais para teste, não um ranking de vendas da Wimifarma ou prova de demanda em Ivaté. O [Panorama ABIHPEC de maio de 2026, página 6](https://abihpec.org.br/site2019/wp-content/uploads/2026/02/Panorama-do-Setor-de-Beleza-e-Cuidados-Pessoais_20.05.2026.pdf), com base Euromonitor 2024, situa o Brasil em segundo lugar mundial em desodorantes e terceiro em higiene oral, capilar, proteção solar e produtos infantis. Esses sinais justificam testar variedade nessas famílias, sem atribuir liderança comercial a um SKU específico.

A [Abrafarma, em publicação de 12/01/2026](https://www.abrafarma.com.br/noticias/redes-da-abrafarma-movimentam-r-11487-bi-em-12-meses), informa crescimento de 10,69% na receita de MIPs de suas associadas entre novembro de 2024 e outubro de 2025. Isso não autoriza classificar medicamentos pelo nome ou categoria do concorrente. A [Anvisa](https://www.gov.br/anvisa/pt-br/acessoainformacao/perguntasfrequentes/medicamentos/medicamentos-isentos-de-prescricao) ressalta que concentração e quantidade podem mudar a exigência de prescrição. A vitrine conserva a classificação explícita da apresentação já revisada.

## Cruzamento com o catálogo

Consulta somente leitura em 24/10 às 00:21–00:29 UTC (23/10 em Brasília): 475 candidatos ativos sem receita e com imagem; 475 imagens locais decodificadas e 474 candidatos comercialmente disponíveis, antes das restrições específicas de cada faixa. Foram usados os helpers reais de disponibilidade e validação de fotos. Disponibilidade de distribuidor segue a política comercial vigente do documento 94, sem renovar datas ou inventar estoque.

Exemplos existentes para testar como entrada, com preço público resolvido no retrato da consulta:

| Família | Apresentação existente | Preço observado |
| --- | --- | ---: |
| Banho | Sabonete Nivea Hidratante Leite 85 g | R$ 3,44 |
| Desodorante | Nivea roll-on Uniformiza 50 ml | R$ 9,78 |
| Capilar | Clear Men Ice Cool Menthol, leve 200 ml/pague 170 ml | R$ 13,55 |
| Solar | Nivea Sun facial Toque Seco FPS 30, 40 ml | R$ 41,41 |
| Infantil | Lenços Huggies Rosto e Corpo, 48 unidades | R$ 10,72 |
| Hidratação | Nivea Milk Hidratação Profunda 200 ml | R$ 19,93 |
| Farmacinha | Simeticona Catarinense 125 mg, 10 cápsulas, MIP classificado | R$ 6,84 |

Esses valores não foram alterados e não incluem antecipação do desconto Pix. A seleção roda sobre o conjunto elegível atual, sem fixar esses EANs ou garantir posição. Higiene oral e primeiros socorros não apresentaram candidatos elegíveis com foto na consulta delimitada; são prioridades de expansão/conferência, sem cadastro, foto ou estoque fabricados nesta entrega.

### Produto que não deve liderar a economia no preço atual

Pampers Confort Sec M70, EAN `7500435106665`, foi observada a R$ 183,63 na Wimifarma. A [Droga Raia](https://www.drogaraia.com.br/pampers-fralda-descartvel-confortsec-super-m-70-unidades.html?origin=search) informa o mesmo EAN por R$ 109,99, vendido e entregue pela própria rede. A [Pague Menos](https://www.paguemenos.com.br/fralda-pampers-confort-sec-m-com-70-unidades/p) apresenta a mesma linha/tamanho/quantidade por R$ 102,99; o EAN aparece no nome do arquivo oficial da imagem, sem campo textual separado.

Diferenças nominais: R$ 73,64 e R$ 80,64. Não foram validados CEP de Ivaté, frete, login ou disponibilidade local dessas redes. O preço atual enfraquece esse pacote como âncora de economia; rever custo e condição comercial antes de oferecer posicionamento de preço competitivo. Não houve redução de preço nem mudança de markup. As regras de entrada favorecem os lenços de menor desembolso da mesma família, sem lista fixa de exclusão por EAN.

Outras checagens não comprovaram vantagem da loja: a [Natus Farma](https://www.natusfarma.com.br/sabonete-nivea-proteina-do-leite-85g-/p) confirmou sabonete/EAN, sem preço acessível. A [São João](https://www.saojoaofarmacias.com.br/desodorante-roll-on-nivea-derma-control-uniformiza-50ml-10049049/p) mostrou R$ 7,90 para o roll-on EAN `4006000181943`, porém com rótulo BW 2024 e sem confirmação de validade promocional/CEP. Essa oferta não foi usada como cotação vigente nem como motivo para alterar o preço da Wimifarma. Menor desembolso dentro do catálogo não equivale a menor preço do mercado.

## Comportamento implementado

- Três coleções de até 15 produtos, com exclusividade global por ID, fotos públicas locais válidas e regras de disponibilidade existentes. Não preencher vagas com produtos fictícios.
- Agrupar editorialmente variações de banho, desodorante, capilar, infantil, higiene oral, cuidados de pele/lábios e solar. Medicamentos elegíveis são agrupados por princípios ativos registrados; isso não afirma equivalência terapêutica nem concede classificação MIP. Bronzeadores/linhas solares com FPS abaixo de 30 não são priorizados como âncora solar; os itens continuam no catálogo.
- Passar por famílias diferentes antes de repetir variantes. Entre as primeiras opções de cada família, considerar até três itens com preço até 1,5 vez o menor preço disponível da família; opções restantes ficam para rodadas posteriores. É um critério editorial de desembolso, não avaliação clínica ou comparação de preço por unidade.
- Alternar essas opções pelo número do dia de Brasília, com ordem inicial estável por ID. Assim a rotação não depende apenas de um hash que pode manter a mesma ordem entre dias. Catálogo igual e mesmo dia produzem a mesma seleção, independentemente da ordem retornada pelo banco.
- **Cuidados:** abrir com até cinco produtos de famílias não medicamentosas distintas, quando existirem. MIPs elegíveis que ainda não foram usados podem entrar depois desses espaços, mantendo o limite anterior de cinco.
- **Farmacinha:** priorizar MIPs explicitamente consistentes e variar os princípios ativos antes de repetir marca/apresentação. Completar com os primeiros socorros e cuidados classificados já autorizados, quando necessário.
- **Economia:** reservar até cinco opções rotativas entre o primeiro quarto dos candidatos ordenados por preço, limitado a 45 itens e a três vezes o preço do quinto menor candidato. Em acervo pequeno, a reserva continua limitada à metade dos elegíveis. Completar com os itens mais baratos ainda livres. Portanto, os cinco primeiros não são mais uma lista fixa dos cinco menores preços absolutos; isso substitui esse trecho do contrato anterior.

Quando existe apenas uma opção elegível em uma família, ela pode reaparecer. Não se inventa variedade, disponibilidade ou vantagem comercial para forçar diferença diária. Alterações reais no catálogo, preço, foto ou disponibilidade podem mudar a seleção durante o dia. O mecanismo não requer cron, IA ou execução diária do Codex. A função `dailyRank` compartilhada com `/ofertas` permanece inalterada.

## Limites e acompanhamento

Não houve importação de EAN, atualização de preço/estoque, nova campanha de desconto, alteração de margem, classificação, benefícios, checkout, pedidos ou banco. Receita, Popular e regras de MIP continuam protegidas. Pix permanece somente após sua seleção no checkout.

Avaliar as hipóteses com exposição, cliques, adições ao carrinho, conversão, margem de contribuição e condições de entrega. Não chamar a seleção de Mais vendidos sem vendas próprias suficientes. A pesquisa pública e o baixo desembolso não demonstram rentabilidade; o preço por fralda, volume ou unidade exige apresentação equivalente. Novos itens de higiene oral/primeiros socorros dependem da conferência comercial e das fotos/classificações usuais.

Arquivos: `src/features/products/home-collections.ts` e teste; componentes existentes e estrutura dos carrosséis preservados. Regressões cobrem rotação, diversidade, exclusividade, acervo escasso, limites, MIP/fotos e pacote infantil caro fora das aberturas quando há entradas acessíveis. Publicação e evidências finais devem registrar somente resultados efetivamente verificados.

Validação anterior à publicação: 19 regressões focadas, 484 testes de segurança, typecheck, lint completo e Prisma validate aprovados. Revisão independente sem achados. Auditorias completa e de produção sem high/critical; permanece um moderate em `fast-uri`, sem alteração de dependências. Não há migration; a publicação atualiza somente o app e preserva a imagem anterior para recuperação.
