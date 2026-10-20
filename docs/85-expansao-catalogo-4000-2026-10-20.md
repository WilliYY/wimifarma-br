# Expansão do catálogo por famílias — 20/10/2026

## Escopo e contagem

O lojista autorizou ampliar o catálogo pelos produtos do relatório FAR e por famílias relacionadas, incluindo apresentações do mesmo princípio ativo, shampoos e colorações. A meta mínima de 4.000 produtos permanece em execução; não deve ser confundida com a quantidade de candidatos extraídos do relatório.

O inventário preserva 6.288 produtos FAR e dois registros avulsos, organizados em 4.912 famílias candidatas de produtos. O relatório não informa EAN. Semelhança de nome produz apenas um candidato de pesquisa, nunca uma associação automática entre código FAR e GTIN.

O primeiro lote acrescentou 44 produtos: 20 apresentações de metformina e associações, três dipironas MIP e 21 cosméticos. O segundo acrescentou seis shampoos Clear e Ducray, e o terceiro acrescentou nove shampoos Clear. Foram 59 inclusões: a contagem passou de 375 para 434 produtos ACTIVE não excluídos. Faltam 3.566 para a meta mínima de 4.000. Essa contagem cadastral não garante disponibilidade comercial após o vencimento de cada oferta.

## Identidade, preço e imagens

- A ANB forneceu as 20 observações novas de metformina e associações e as observações dos shampoos; Profarma forneceu observações anteriores ainda válidas de três MIPs e 21 cosméticos. Custos, ST e horários originais foram preservados. Esta execução não conseguiu autenticar novamente a Profarma com o acesso do cofre; não houve renovação artificial de observações.
- Cada produto foi conferido pelo EAN e apresentação exatos. Três apresentações já existentes, 14 candidatos de metformina com pendências e os candidatos sem foto adequada ficaram fora do lote aprovado.
- Cosméticos e shampoos novos usam acréscimo de 20%. As três dipironas e a metformina Geolab de menor custo usam 50%. As outras 19 apresentações deste lote usam 10%, incluindo oito decisões individuais para evitar preços excessivos em genéricos e similares de maior custo. Isso representa acréscimo sobre custo observado, não promessa de lucro líquido. Nenhuma regra automática por faixa de preço foi introduzida.
- Títulos curtos preservam marca, dose, quantidade e XR quando aplicável. Forma farmacêutica e composição verificadas permanecem na descrição e nos dados de identificação. Divergências de detentor e laboratório comercial continuam na evidência de revisão; não foram convertidas em afirmações públicas de fabricante.
- As 39 fotos não Rx foram conferidas por apresentação, processadas em WebP de até 640 px e 100 KB e publicadas com fonte, SHA-256 e auditoria. Os 20 medicamentos de receita comum usam a ilustração institucional existente. Não foram criadas campanhas, liberados controlados ou alteradas regras de receita.
- Quantidades de cosméticos foram conferidas no rótulo e nas fontes correspondentes, sem converter gramas em mililitros. Diferenças de embalagem/fonte permanecem registradas. Edições claramente antigas e placeholders da ANB não são fotos aprovadas. A foto Ice Cool 400 ml com edição Rússia 2018 foi rejeitada e substituída pela frente oficial do mesmo GTIN, observada e revisada; Sports 400 ml permaneceu retido por imagem antiga. Não se afirma que a foto representa o lote físico disponível no fornecedor.

## Publicação e preservação

Foram usados os schemas, motor financeiro, importador e publicador já existentes. Uma cópia privada derivada do importador acrescenta somente uma recusa a GTIN existente, dentro da mesma transação e após o lock do catálogo. Esse limite impede que um lote de inclusão atualize uma oferta criada concorrentemente. A cópia, sua fonte e os hashes ficam nos artefatos privados; o importador oficial e a aplicação não foram alterados.

A imagem Docker de ferramentas foi fixada pelo digest e utilizada na QA, dry-run e aplicação. Mudanças simultâneas de rodapé em outra tarefa foram preservadas; a compatibilidade dos arquivos de catálogo, schema e migrações foi conferida antes da segunda aplicação.

Antes de cada lote houve backup validado, QA em banco novo com marcador de propriedade, dry-run sem alterações e um único apply protegido por marcador exclusivo. A repetição de inclusão de EAN existente foi rejeitada na QA sem modificar registros. A limpeza do banco descartável exige nome, comentário de propriedade, contagens e identidade explícita do usuário sintético.

As verificações posteriores preservaram integralmente as linhas antigas de Product, SupplierCatalogOffer, ProductImage e AuditLog, além dos fingerprints de usuários, clientes, pedidos, itens e reservas. Estoque PHARMACY, percentuais anteriores, cotas, consumo, datas e preços de pedidos não foram alterados. Perfis logísticos incluídos são apenas estimados, desabilitados e sem revisão de transporte; medidas estimadas não habilitam transportadoras.

## Verificação

- `npm run test:security`: 400 passaram, zero falhas, na imagem fixada.
- Auditoria de dependências de produção: zero vulnerabilidades. Auditoria completa: cinco alertas high de desenvolvimento (`braces`, `micromatch`, `fast-glob`, `@next/eslint-plugin-next`, `eslint-config-next`), mantidos visíveis.
- QA e dry-run dos três lotes passaram, com 98 eventos de auditoria esperados na produção.
- 59 páginas públicas e 39 imagens responderam HTTP 200, com identidade e limites dos arquivos conferidos.
- Inclusão de um shampoo novo na cesta foi verificada pelo navegador, com preço e calendário de preparação; o item de teste foi removido. Não foram criados pedidos, pagamentos, etiquetas ou mensagens.
- A pesquisa pública com Enter por `Ice Cool` abriu a página de resultados e encontrou os dois novos EANs, com imagens e preços correspondentes.
- Nenhum código da aplicação foi alterado por esta tarefa; não foi necessário reconstruir a aplicação ou executar novamente lint/typecheck/build sobre alterações alheias.

## Pendências e retomada

O controle mestre local reúne todos os registros do relatório, os produtos publicados, os candidatos por família e a fila de conferência. As entradas operacionais, custos negociados, imagens-fonte, backups e provas ficam em `outputs/catalogo-expansao-4000-2026-10-19/` e na pasta privada da operação no servidor; não são versionados.

A pesquisa ANB `shampoo` encontrou 142 resultados, dos quais 33 tiveram EAN, detalhe e custo registrados nesta execução: 15 foram publicados e 18 permaneceram retidos. A revisão das fotos continua separada da revisão comercial. A pesquisa ampla `tint` encontrou 32 colorações Koleston sem estoque, uma tintura de iodo e um protetor solar com cor; esses últimos não são coloração capilar. `coloracao` e `natucor` não retornaram produtos naquela consulta, o que não comprova ausência definitiva no fornecedor.

Para chegar a 4.000, faltam concluir os candidatos com identidade, oferta vigente, classificação, descrição e imagem apropriadas. É necessário restabelecer a sessão Profarma para ampliar a comparação e obter fluxos autorizados de catálogo/EDI/API para uma escala sustentada. A rotina de preços existente permanece PAUSED; esta execução não habilitou coletor independente, não ampliou silenciosamente sua lista e não alterou os limites de validade das ofertas.

Contratos preservados: documentos 68, 70, 71, 77 e 81. A aprovação de um candidato nesta planilha não é uma publicação automática nem uma confirmação de frete nacional.
