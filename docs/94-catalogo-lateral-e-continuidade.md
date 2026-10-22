# Catálogo lateral e continuidade das ofertas — 22/10/2026

## Pedido e limites

O lojista solicitou categorias laterais com subcategorias, ordenação explícita e páginas numeradas. Também autorizou manter a compra pelo último dado comercial registrado quando a consulta à distribuidora falhar ou não produzir uma atualização. Esta decisão substitui o bloqueio automático exclusivamente pelo vencimento descrito nos documentos 67, 68 e 75.

Não há renovação fictícia de cotação, cadastro de estoque físico, nova transportadora, mudança de receita, cobrança de teste ou envio de mensagens. A obtenção de dados das distribuidoras continua separada desta alteração.

## Navegação

- Categorias e subcategorias ficam na lateral em telas grandes, com filtros recolhíveis no celular. As categorias equivalentes de higiene são reunidas visualmente, preservando o acesso aos cadastros existentes.
- Medicamentos usam os assuntos já revisados da busca para pressão, diabetes e outros grupos disponíveis. A relação usa os mesmos critérios de identidade/composição; não infere indicação por advertência ou descrição.
- Produtos de receita encontrados por condição mantêm a apresentação neutra do documento 93. O filtro não altera sua classificação, nem libera controlados, Farmácia Popular ou receita não revisada para compra automática.
- Ordenação por relevância, menor/maior preço e nome A–Z/Z–A é aplicada ao conjunto filtrado antes da paginação. O preço vem da mesma resolução comercial usada no produto e no checkout.
- Paginação oferece números, página atual, anterior/próxima e reticências entre intervalos. Marca, categoria, subcategoria e ordenação acompanham as URLs; mudar filtro reinicia a página.

Direção visual: varejo claro da Wimifarma, com seleção vermelha, tipografia e cards existentes. A lateral concentra a navegação e libera a área dos produtos. Não há alteração das animações do cabeçalho/rodapé ou dependências novas.

## Continuidade da compra

A expiração do prazo de observação deixa de ser, sozinha, um impedimento de compra para produtos de distribuidor. A função comercial compartilhada continua verificando identidade, custo, evidência tributária, percentual, teto de preço aplicável, quantidades e estrutura temporal. Ofertas atuais têm prioridade; sem uma elegível atual, a resolução pode usar uma observação anterior elegível.

Uma consulta que falha não muda `observedAt`, `validUntil`, disponibilidade, preço ou saldo no banco. As datas reais continuam permitindo identificar a idade do dado. Uma nova observação confirmando indisponibilidade ou quantidade zero continua impedindo utilizar aquela oferta. A restrição por tempo permanece nos pedidos históricos que não autorizaram demanda de distribuidor.

O mesmo contrato deve valer na vitrine, produto, carrinho, criação do pedido, reserva interna e validação anterior ao pagamento. A reserva continua sendo controle interno da farmácia, sem prometer reserva feita na distribuidora. Os valores e a política de pedidos anteriores não são reescritos; divergência real de preço/custo ou indisponibilidade confirmada ainda exige revisão.

### Responsabilidade operacional

O último preço não garante o custo de reposição nem estoque futuro do fornecedor. O lojista assumiu a obtenção do produto e eventuais diferenças comerciais. A equipe deve conferir os itens antes da dispensação e usar os fluxos existentes de cancelamento, reembolso ou crédito opcional quando necessário. Falha de consulta não deve ser importada como uma observação real de saldo zero.

Produtos arquivados, sem oferta estruturalmente elegível, com quantidade conhecida zero, identidade divergente, tributação incompleta ou teto incompatível continuam protegidos. Estoque próprio continua limitado às unidades físicas. Não são ampliados benefícios, regras de frete ou permissões de compra de medicamentos.

## Verificação e entrega

- `npm.cmd run test:all`: **1.020/1.020**, sem falhas ou testes ignorados. `npm.cmd run test:security`: **444/444**. Lint completo, TypeScript, Prisma validate e `git diff --check` passaram.
- Regressões da navegação usam os componentes reais e 600 produtos sintéticos: telas de 320/390/1.280 px, filtros por teclado, marca/busca/ordem preservadas, reinício da página, 25 páginas, ausência de transbordamento/erro JavaScript e apresentação neutra Rx. Capturas em `outputs/catalogo-lateral-2026-10-22/`, fora do Git; topo de 320 px e relação Diabetes em 1.280 px inspecionados.
- Regressões comerciais exercitam o `createCheckout` real com transação simulada, reserva e validação de pagamento: dados antigos aceitos somente por demanda, oferta atual prioritária, identidade/ST/teto protegidos, indisponibilidade nova rejeitada e datas/estoque físico preservados.
- Revisão independente comercial e da navegação aprovada. Corrigida uma possível intermitência nas fixtures do limite de 24 horas: cada par de datas deriva de um único instante.
- Auditoria de produção: zero alertas. Auditoria completa: cinco alertas altos anteriores no ferramental de desenvolvimento, nenhum crítico; nenhuma dependência alterada.

Build Linux, ensaio PostgreSQL isolado e conferência pública serão registrados após a execução. Ensaios de compra usam dados sintéticos e não demonstram uma compra ou reserva real junto à distribuidora.
