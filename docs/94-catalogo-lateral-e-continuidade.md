# Catálogo lateral e continuidade das ofertas — 22/10/2026

## Simplificação visual — 23/10/2026

A navegação lateral usa categorias recolhíveis nativas (`details`/`summary`), com apenas um grupo aberto por vez. O grupo da URL atual começa aberto; sua subcategoria recebe `aria-current="page"` e destaque vermelho. Categorias sem subcategorias continuam sendo links diretos. Os atalhos Todos os produtos e Ofertas ficam no início, seguidos por grupos com ícones e rótulos legíveis; cada grupo expandido inclui Ver tudo e suas opções internas.

As categorias estão em `src/components/site/catalog-category-navigation.tsx`, componente de servidor que reutiliza a mesma composição de grupos, curadoria e construção de URLs. A alteração não cria classificações, altera consultas comerciais ou muda resultados. Busca, marca, ordenação e contexto de ofertas são preservados pelos links existentes; mudar seleção continua reiniciando a página.

O painel mantém o controle Categorias e filtros no celular, foco visível, áreas de toque de pelo menos 44 px e posição fixa abaixo do cabeçalho no desktop. A barra de rolagem fica mais discreta. Os grupos abrem por teclado sem JavaScript adicional; a preferência de movimento reduzido é respeitada no indicador de expansão. Animações de marca, produtos, preço, Pix e checkout permanecem fora deste ajuste.

Seis regressões focadas passaram: 320/390/1.280 px, expansão por teclado, apenas um grupo aberto, abertura da seleção pela URL, destaque acessível, preservação de filtros/ordenação/paginação e ausência de transbordamento ou erro de JavaScript. Capturas em `outputs/catalogo-lateral-simples-2026-10-23/`, fora do Git.

Typecheck, lint completo, Prisma validate e 484 testes de segurança aprovados. Revisão independente sem achados; auditorias completa e de produção sem high/critical, mantendo um moderate em `fast-uri`, sem alteração de dependências nesta tarefa. A publicação reconstrói somente o app e preserva a imagem anterior, sem migration ou escrita comercial.

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

Arquivos principais: rotas `src/app/(site)/catalogo/page.tsx`, `categorias/[slug]/page.tsx` e `ofertas/page.tsx`; componentes `catalog-page.tsx` e `catalog-filter-panel.tsx`; helpers `src/features/products/catalog-navigation.ts` e `storefront.ts`; resolução `src/features/supplier-catalog/commerce.ts`. Regressões acompanham esses módulos, incluindo `checkout-continuity.test.ts` e `scripts/catalog-upgrade-db-audit.ts`. README e documentos 07, 67, 68 e 75 registram a decisão atual.

- `npm.cmd run test:all`: **1.020/1.020**, sem falhas ou testes ignorados. `npm.cmd run test:security`: **444/444**. Lint completo, TypeScript, Prisma validate e `git diff --check` passaram.
- Regressões da navegação usam os componentes reais e 600 produtos sintéticos: telas de 320/390/1.280 px, filtros por teclado, marca/busca/ordem preservadas, reinício da página, 25 páginas, ausência de transbordamento/erro JavaScript e apresentação neutra Rx. Capturas em `outputs/catalogo-lateral-2026-10-22/`, fora do Git; topo de 320 px e relação Diabetes em 1.280 px inspecionados.
- Regressões comerciais exercitam o `createCheckout` real com transação simulada, reserva e validação de pagamento: dados antigos aceitos somente por demanda, oferta atual prioritária, identidade/ST/teto protegidos, indisponibilidade nova rejeitada e datas/estoque físico preservados.
- Revisão independente comercial e da navegação aprovada. Corrigida uma possível intermitência nas fixtures do limite de 24 horas: cada par de datas deriva de um único instante.
- A lateral fixa durante a rolagem respeita o espaço do cabeçalho. Regressão de navegador verifica o posicionamento em telas grandes; a hidratação isolada preserva a relação entre a lateral e o grid para testar o comportamento real de `sticky`.
- Auditoria de produção: zero alertas. Auditoria completa: cinco alertas altos anteriores no ferramental de desenvolvimento, nenhum crítico; nenhuma dependência alterada.

Build Linux de produção aprovado, com lint/TypeScript. Ensaio PostgreSQL no banco vazio e dedicado `wimifarma_br_catalog_qa_20261019` aprovou pedido com oferta vencida, reserva, validação anterior ao pagamento, rejeição por indisponibilidade nova, datas preservadas e cancelamento idempotente; fixtures revertidas e banco removido após conferir o marcador de propriedade. A configuração inicial do runner de QA foi corrigida antes da conexão; a tentativa recusada não executou o ensaio no banco produtivo. Não foram criados pedidos, cobranças ou mensagens reais.

Publicação inicial no código `24b39949b55c5efb1058592e3dd15bbf800a3316`, com [CI 39817580673](https://github.com/WilliYY/wimifarma-br/actions/runs/39817580673) aprovado. Ativado somente o app, sem migração produtiva, alteração de PostgreSQL ou proxy. Imagem anterior preservada em `wimifarma-br-app:rollback-catalog-20261022`. Hashes de todos os 597 produtos e 686 registros de ofertas foram idênticos antes/depois.

Conferência HTTP pública em 15 rotas: home com 45 cards e 45 produtos distintos; catálogo com 24 itens por página e sequência 1–6, reticências e 25; última página com 19 itens; assuntos Pressão/Diabetes com relações neutras; subcategorias Cabelos/Proteção solar, marca Nivea, ordenações, parâmetros inválidos, Medicamentos e Ofertas responderam 200. São 595 produtos ativos, preservando os dois registros inativos existentes. O navegador conectado estava indisponível nesta etapa; a evidência visual usa o ensaio isolado e a conferência publicada usa HTTP, sem alegar inspeção interativa da sessão real.

Entrega final no código `f48fb3bc53bc2413baf349a23ed16bad6cfe7014`, incluindo o deslocamento da lateral abaixo do cabeçalho. [CI 39819239658](https://github.com/WilliYY/wimifarma-br/actions/runs/39819239658) aprovado; nova regressão visual e ESLint focado aprovados. Build Linux passou novamente. Imagem ativa `sha256:c819e447eadfe5f99c725fa6db02d6c7923516715d42640550a78207c0ac6845`, container saudável, zero reinicializações e revisão OCI correspondente. Reversão intermediária em `wimifarma-br-app:rollback-catalog-header-20261022`, preservando também a imagem anterior à tarefa.

Conferência final de `/catalogo`, `/api/health` e das três folhas CSS de produção aprovada, incluindo `lg:top-56` e a altura máxima da lateral. Os hashes de produtos/ofertas permaneceram idênticos também após esta última ativação. Nenhuma nova consulta à distribuidora foi simulada ou agendada, e a situação pausada das rotinas anteriores foi preservada.
