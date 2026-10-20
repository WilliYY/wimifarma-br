# 86 — Preços e desconto real nos cards

## Pedido e limites — 20/10/2026

O lojista pediu mais destaque comercial, com “de/por” e percentual nos produtos. A referência não é aumentada artificialmente para simular oferta. O percentual ADMIN do distribuidor é acréscimo sobre o custo e continua privado; não é utilizado como desconto.

O card compara preços cadastrados com a condição real já aprovada de 3% no Pix. Não houve alteração de preço no banco, acréscimo, promoção, estoque, pedido, gateway ou regra de cobrança.

## Apresentação

- Produtos compráveis exibem referência riscada com “De”, valor em destaque com “Por” e “no Pix”, preço sem desconto Pix e a condição visível “Para 1 unidade.”
- Sem promoção cadastrada, a referência é o preço normal atual, disponível sem o desconto Pix. O selo mostra o percentual da constante `PIX_DISCOUNT_PERCENT`, compartilhada com o checkout.
- Havendo promoção real, `price` é a referência e `promotionalPrice` é a base atual. O percentual da promoção e os 3% Pix permanecem separados: R$ 100,00 por R$ 80,00, com Pix de R$ 77,60, não é anunciado como 23% OFF.
- Exemplo do sabonete: preço normal R$ 3,44 e preço de uma unidade no Pix R$ 3,34. Não há preço anterior fictício ou promessa de que a referência foi praticada historicamente.
- O cálculo usa `pixDiscountCents()` em centavos. Não há uma segunda fórmula monetária ou percentual configurável criado para essa apresentação.
- A prévia de cashback usa o valor unitário exibido, após o Pix, e continua estimada antes do resgate de saldos. Nenhum benefício é creditado pelo card.
- Itens sem estoque, Farmácia Popular, controlados e demais produtos que exigem atendimento assistido não recebem essa prévia de Pix. Aplica-se a mesma `requiresPurchaseAssistance()` das ações de compra. Uma redução arredondada a zero não gera comparação ou selo Pix.

O componente comum cobre os cards da home, catálogo, resultados completos da busca e relacionados. Autocomplete e detalhe continuam apresentando seus preços regulares; o checkout confirma a condição de pagamento selecionada.

Direção visual: varejo claro, com preço vermelho em destaque e selo Pix verde, preservando Barlow, fotografias, ações e estrutura dos cards. DFII 14 (impacto 3, adequação 5, implementação 4, desempenho 4, risco 2). Sem dependências, animações, tokens globais ou alterações no header/rodapé.

## Carrinho e arredondamento

`CartProduct.unitPriceCents` permanece no preço atual antes do Pix. `originalPriceCents` existe somente para uma promoção real cadastrada, não para representar Pix. O desconto continua sendo aplicado uma única vez no checkout, sobre o subtotal líquido após cashback/WimiCoins e sem desconto no frete, conforme [83](83-desconto-pix.md).

A condição unitária não deve ser multiplicada para reconstruir o total do pedido. Exemplo de centavos: uma unidade de R$ 0,17 aparece como R$ 0,16 no Pix; três unidades somam R$ 0,51 e ficam em R$ 0,49 com o arredondamento canônico do subtotal. A condição “Para 1 unidade.” evita confundir essa referência com a cobrança de várias unidades. Frete e resgates continuam sendo calculados no checkout.

## Arquivos e validação

- Interface: `src/components/site/public-product-card.tsx`.
- Regressão de navegador: `src/components/site/product-card-actions.test.ts`. O fixture prepara bundle/CSS antes da navegação e compila o CSS atual para capturas, sem depender de um build local antigo.
- Documentação: README e documentos 07, 10, 83 e este documento 86.
- RED: quatro testes anteriores aprovados e três novos cenários falharam antes da implementação.
- GREEN: 17 testes focados de card, Pix e política de compra passaram. Sete testes do card passaram novamente com capturas em 320, 390 e 1280 px, incluindo ações existentes, referência verdadeira, promoção/Pix separados, valores originais do carrinho, itens assistidos/indisponíveis e arredondamento de centavos.
- Revisão independente aprovou os dois arquivos sem achados acionáveis. Captura inicial do card inspecionada.
- `npm.cmd run test:security`: 420/420; `git diff --check` passou.
- `npm.cmd audit --omit=dev --audit-level=high --json`: zero vulnerabilidades. A auditoria completa continua com cinco alertas altos já existentes no ferramental de desenvolvimento (`@next/eslint-plugin-next`, `eslint-config-next`, `braces`, `fast-glob`, `micromatch`), zero críticos. Nenhuma dependência foi alterada.
- Build Linux de produção (`npm run build` dentro do Docker) aprovado, incluindo lint e verificação TypeScript; 39 páginas estáticas geradas. Não foram repetidos lint/typecheck completos no Windows nesta etapa.

## Publicação e conferência

- Código em `61a90e3dd8fc235e88e2635f3e949e863957f44a` (`feat(catalog): highlight real Pix savings on product cards`), enviado ao GitHub e publicado apenas no app. Imagem anterior preservada para reversão.
- Container `wimifarma-br-app` saudável, com revisão OCI igual ao commit do código. Imagem `sha256:aa4986a71cf3ae8783b127d2ca87c7303b0cb959fdc6d55ec795a9ba94a8329e`.
- Conferência real em `https://wimifarma.com.br/catalogo?marca=Nivea&ordem=preco-asc`: os cinco primeiros sabonetes mostram referência de R$ 3,44, preço de R$ 3,34 no Pix, selo de 3%, preço sem desconto Pix e condição para uma unidade. O preço de R$ 3,44 também foi observado no site antes da atualização.
- Inspeção visual publicada em 1280 px (quatro colunas atuais do catálogo) e 390 px (duas colunas), sem transbordamento horizontal. Capturas `precos-publicados.png` e `precos-publicados-390.png`. Outros itens conferidos exibem R$ 4,80 por R$ 4,66 e R$ 9,78 por R$ 9,49 no Pix.
- Conferência pública somente de leitura: nenhum item adicionado ao carrinho, pedido, cobrança ou mensagem real. A preservação dos valores do carrinho e o arredondamento foram comprovados nos ensaios sintéticos.

Capturas ficam em `outputs/precos-2026-10-20`, fora do Git. Ensaios usam dados sintéticos e rede interceptada, sem pedidos, cobranças ou mensagens reais. O hook não forneceu um novo escopo temporário; foi criado um escopo exclusivo com `task_cleanup.py init`, usado pelo executor e destinado à limpeza explícita ao concluir.

## Padronização dos cards e entrega — 20/10/2026

O lojista pediu que todos os itens seguissem o acabamento do Kit Kat, incluindo genéricos e similares. O componente compartilhado reserva espaços para entrega, imagem, título, preço e cashback; promoções e benefícios não deslocam os botões em relação ao card vizinho. No celular, a área do preço acomoda a quebra de linha. A área de cashback contém a margem do componente (`flow-root`), evitando que ela altere a altura do rodapé.

O selo de entrega aparece nos produtos com estoque e compra online permitida, inclusive distribuidor e genéricos/similares de receita comum. A informação visível usa `FREE_SHIPPING_THRESHOLD_CENTS`: frete grátis a partir de R$ 99,90, com consulta de cobertura pelo CEP. Não declara frete gratuito para qualquer pedido nem habilita transportadora, perfil logístico ou produto restrito. Itens assistidos ou indisponíveis não recebem o selo. A cotação e o checkout continuam decidindo a disponibilidade efetiva e a gratuidade sobre o subtotal elegível após descontos.

O botão Adicionar continua incluindo uma unidade somente após ação do cliente; o seletor aparece quando o item já está no carrinho. Preços, Pix, promoções, estoque e valores armazenados no carrinho foram preservados.

### Cashback solicitado em medicamentos: pendência específica

O pedido de 1% em genéricos/similares não foi ativado nesta entrega. A classificação comercial não distingue, sozinha, medicamentos isentos de prescrição dos sujeitos a receita. A [RDC 96/2008, art. 10](https://anvisalegis.datalegis.net/action/ActionDatalegis.php?acao=abrirTextoAto&cod_menu=8542&cod_modulo=310&link=S&numeroAto=00000096&orgao=RDC%2FDC%2FANVISA%2FMS&seqAto=000&tipo=RDC&valorAno=2008) restringe medicamentos como objeto de pontuação em programas de fidelização; descontos imediatos têm tratamento próprio nos arts. 11, 18 e 19. A [RDC 44/2009, art. 54](https://anvisalegis.datalegis.net/action/ActionDatalegis.php?acao=abrirTextoAto&cod_menu=8542&cod_modulo=310&link=S&numeroAto=00000044&orgao=RDC%2FDC%2FANVISA%2FMS&seqAto=000&tipo=RDC&valorAno=2009) restringe promoção pública de medicamentos com receita.

A pesquisa não encontrou autorização primária específica para equiparar este crédito futuro a desconto imediato, nem concluiu proibição geral de qualquer cashback. A extensão solicitada exige enquadramento técnico/jurídico da campanha e de sua publicidade antes da ativação. Foram preservados o contrato do documento 15 e os bloqueios atuais, sem criar selo de benefício não creditável. Não foram alterados percentuais no banco, carteiras, snapshots de pedidos, bônus de avaliação ou WimiCoins.

### Verificação desta padronização

- Regressão de navegador com produtos sintéticos: promoção com cashback, fornecedor sem benefício, genérico e similar com receita; alinhamento e ausência de transbordamento em 320, 390 e 1280 px; condições de entrega visíveis; ausência de falso cashback em receita.
- Compra, quantidade, limites, itens assistidos/indisponíveis, preço Pix, referência real e arredondamento continuam cobertos pelos testes existentes.
- Capturas em `outputs/cards-padrao-2026-10-20`, fora do Git. Testes interceptam a rede e não criam pedidos, cobranças ou mensagens reais.
- Testes focados: 14/14; segurança: 420/420. Revisão independente dos três arquivos aprovou sem achados; ESLint focado e `git diff --check` aprovados. Auditoria de produção: zero vulnerabilidades.
