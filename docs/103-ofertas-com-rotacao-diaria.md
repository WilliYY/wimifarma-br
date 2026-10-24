# 103 — Ofertas com rotação diária

## Comportamento

`/ofertas` e os filtros de ofertas do catálogo passam a considerar os descontos efetivamente exibidos no card público: promoção cadastrada válida ou economia elegível sobre o PMC CMED. A seleção usa o preço e a disponibilidade comerciais resolvidos por `toSaleProduct`, incluindo os produtos de distribuidoras; não depende apenas do campo `promotionalPrice` persistido.

Somente produtos ativos, disponíveis e com percentual positivo no selo entram nessa seleção. Produtos com receita, classificação de receita diferente de `UNREVIEWED` ou Farmácia Popular não integram a página promocional. A referência PMC continua sujeita à identidade, edição válida e classificação explícita MIP/OTC descritas em `102-referencia-pmc-cmed.md`. PMC não é apresentado como preço anterior da loja.

A ordem padrão usa uma classificação pseudoaleatória por dia de Brasília (`America/Sao_Paulo`) e ID do produto, reutilizando o mecanismo das vitrines da home. Permanece estável durante o dia, independentemente da ordem retornada pelo banco, e muda na virada do dia. A ordenação ocorre antes da paginação de 24 itens, sem repetição entre páginas enquanto o catálogo permanece igual. Alterações reais de preço, disponibilidade ou cadastro continuam podendo mudar a seleção durante o dia.

Os demais produtos elegíveis permanecem nas próximas páginas. Ordenações explícitas por preço ou nome e a relevância de uma busca são preservadas. Não há cron, chamada de IA, consumo de tokens ou escrita diária no banco: a seleção é calculada ao abrir a página dinâmica.

O recurso não cria promoções, altera preços, estoque, cotas ou reserva, nem antecipa o desconto Pix de 3%. O preço em destaque continua sendo o preço real enviado ao carrinho.

## Arquivos e validação

- `src/features/offers/daily-rotation.ts`: comparação compartilhada com o card, elegibilidade e rotação.
- `src/features/products/storefront.ts`: filtro após resolução comercial, ordem e paginação.
- `src/components/site/public-product-card.tsx`: mesma condição de selo usada pela seleção.
- `src/features/products/home-collections.ts`: exporta o ranking diário já existente, sem alterar suas vitrines.
- `src/app/(site)/ofertas/page.tsx`: descrição da seleção diária.
- Testes focados em rotação/virada de Brasília, promoções válidas, PMC, disponibilidade, fornecedor, ordenações e paginação. As regressões do card comprovam que o preço do carrinho e a condição Pix continuam preservados.

Não há migration nem alteração administrativa de ofertas manuais.

## Evidências de entrega — 23/10/2026

- 51 regressões focadas passaram, incluindo o card em navegador isolado e a virada do dia de Brasília.
- 484 testes de segurança passaram. Typecheck e revisão independente aprovados, sem achados novos.
- Auditorias completa e de produção: zero alertas high/critical; permanece um alerta moderate em `fast-uri`, fora do escopo desta mudança.
- Publicação deve reconstruir somente o serviço `app`, preservar a imagem anterior para rollback e manter PostgreSQL, proxy e volumes intactos. A validação pública confirma a seleção real após o deploy; testes locais não comprovam produção.
