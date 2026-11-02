# 135 — Apresentação da compra e consulta de frete no produto

## Apresentação — 01/11/2026

O detalhe público do produto deixa de mostrar o bloco expansível “Sobre o PMC e a comparação de preços”, o aviso “Em estoque, sujeito à confirmação da farmácia” e a mensagem de pagamento combinado no atendimento junto dos botões de compra. O preço atual, a referência PMC e seu percentual continuam usando os mesmos cálculos. A alteração não modifica preços cadastrados, estoque, limites de quantidade, elegibilidade de compra, receitas ou gateway.

A galeria do detalhe também deixa de exibir a legenda visual “Imagem ilustrativa” na arte institucional de medicamento. A identificação acessível permanece no `aria-label` do placeholder, indicando que a ilustração não representa a embalagem do produto. Cards e demais usos do placeholder mantêm sua apresentação anterior.

O teste de apresentação da página verifica a ausência do bloco e da mensagem removidos, mantendo galeria, compra, entrega, relacionados e informações do produto.

## Orçamento público separado da aprovação de transporte

Produto e diálogo do catálogo passam a consultar `POST /api/fretes/estimativa`, com corpo estrito contendo apenas `productId`, `postalCode` e `quantity` (até 20 unidades). Produto ativo, preço atual, peso, medidas e características de carga são recuperados no servidor. A consulta mantém validação de origem/JSON/tamanho, limite de requisições e resposta privada sem cache.

Perfis completos ainda não revisados podem receber orçamento real do Melhor Envio. Nesse caso, a interface identifica a estimativa e informa que o envio ainda está em preparação. O resultado contém somente transportadora, modalidade, preço e prazo, sem token de checkout, perfil, empacotamento ou custos privados. Não há habilitação automática de transporte nem alteração de produto, preço, estoque ou pedido. O refresh OAuth operacional existente continua funcionando, inclusive a gravação cifrada da integração quando necessária.

Perfis prontos continuam respeitando os serviços aprovados e só recebem benefício de frete quando as regras existentes de elegibilidade, custo e margem permitirem. Uma lista vazia em rascunho ainda não revisado representa ausência de aprovação e permite somente o cálculo teórico; em perfil revisado, a lista vazia continua bloqueando a consulta. Listas não vazias mantêm sua restrição em ambos os casos. Estimativas de rascunhos não recebem promessa de gratuidade. Carga ausente permanece desconhecida; serviços explicitamente bloqueados são excluídos, medicamentos mantêm a seleção restrita e produtos assistidos conservam seu fluxo. O checkout permanece na rota assinada anterior e revalida o carrinho final.

A leitura produtiva de 01/11 encontrou 3.068 produtos ativos: 3.056 com os quatro campos físicos preenchidos, todos estimados, e 12 incompletos; dois perfis estavam habilitados/revisados. O Ablok do exemplo já possuía dados estimados completos, mas estava desativado e sem revisão. O bloqueio anterior acontecia antes da consulta ao provedor e não demonstrava falta de cobertura do CEP.

Os 12 incompletos não foram preenchidos indiscriminadamente: há conflitos documentais de unidade/apresentação, classificação ainda pendente, um SKU sem EAN e seis publicações recentes somente Avise-me com físicos desconhecidos. As guardas documentadas em [129](129-hipoteses-por-tipo-de-embalagem.md) e [134](134-prontidao-logistica-publicacao.md) continuam preservadas. Uma simulação não comprova pesagem, encaixe físico ou aceitação de carga.

## Verificação

A revisão independente aprovou a apresentação e o novo contrato público, sem enfraquecer `validateShippingProduct`, `validateOrderShipping` ou a política de publicação. Os dois testes da nova rota/serviço passam a integrar `test:security`, além da seleção de frete. O último ajuste visual apenas omite notas regulares sem subsídio ou progresso, mantendo os benefícios relevantes.

- Apresentação: 13 testes dirigidos; backend e regras de transporte: 15 testes, com dois casos ampliados posteriormente; interface principal: 19 testes, incluindo 320/390/1440 px; catálogo/cartão: cinco testes. Essas seleções podem se sobrepor e não representam uma contagem única somada.
- Uma fixture adicional não conseguiu iniciar Chromium sob carga (`Timeout 180000ms`), antes de executar suas asserções. A repetição somente desse arquivo, depois de encerrar as outras rodadas, passou nos cinco casos. Não se aumentou o timeout nem se omitiu a falha inicial.
- Segurança: 503/503, zero falhas. ESLint completo, typecheck e Prisma validate passaram. A primeira sequência de checks foi interrompida durante typecheck; a retomada executou somente os checks pendentes, após confirmar que os processos anteriores haviam encerrado.
- Auditoria de produção: três alertas baixos, quatro moderados, nenhum alto/crítico. Auditoria completa: três baixos, 17 moderados, nenhum alto/crítico. Logs completos preservados fora do Git; dependências não foram atualizadas nesta tarefa.

Uma rodada isolada adicional no código conjunto `5f06c2aaf5e4bf3cd970e479ab7cd97b5f59112f`, incluindo a alteração concorrente da apresentação do login, passou em lint dirigido, typecheck, Prisma validate e 503/503 testes de segurança. As revisões independentes aprovaram também a exceção da lista de serviços vazia somente para rascunhos não revisados e a preservação dos contratos de autenticação.

## Verificação pública — 01/11/2026, 21h58 (Brasília)

As alterações estão disponíveis no site público. A rodada inicial construiu a imagem Linux, mas o operador interrompeu antes da troca do app ao validar a ausência de labels no Compose. O operador corrigido detectou uma troca concorrente do app e encerrou por `PREFLIGHT_APP_CHANGED`, sem substituir o serviço de outra manutenção. Não se repetiram fases consumidas nem se alterou a autorização canônica de publicação. O app atualmente saudável já contém o comportamento solicitado, comprovado pelas consultas públicas abaixo.

Para uma unidade de Ablok 100 mg 30 comprimidos, a rota pública retornou `mode: "estimate"`, sem token ou benefício de gratuidade:

| CEP | PAC | SEDEX | Prazo PAC / SEDEX |
| --- | --- | --- | --- |
| 87501-070 — Umuarama | R$ 18,35 | R$ 20,84 | 9 / 5 dias |
| 01001-000 — São Paulo | R$ 18,35 | R$ 20,84 | 10 / 6 dias |
| 69005-070 — Manaus | R$ 58,96 | R$ 70,31 | 26 / 10 dias |

Os prazos incluem o preparo configurado. São cotações daquele momento, calculadas pelo Melhor Envio com o perfil estimado cadastrado; não são tarifas fixas, pesagens confirmadas nem garantia de cobertura e aceitação para todo o catálogo. Um rascunho real de Sitagliptina + Metformina, com lista vazia de serviços aprovados, também retornou PAC e SEDEX somente como estimativa.

O HTML público não contém os três textos de compra removidos nem a legenda visual da galeria, preservando título e preço. A API rejeitou peso enviado pelo cliente com HTTP 422, origem externa com HTTP 403 e o perfil incompleto de Clopidogrel com HTTP 422. As respostas mantiveram a política sem cache. Nenhum pedido, pagamento ou etiqueta foi criado, nem produto ou perfil logístico foi alterado pelos testes.

O app permaneceu saudável e com a mesma identidade durante as verificações; o PostgreSQL preservou sua identidade e início de execução anteriores. O Git observado no servidor estava em `5f06c2aaf5e4bf3cd970e479ab7cd97b5f59112f`. A imagem ativa não possui label OCI de revisão: a evidência comprova o comportamento público, mas não estabelece sozinha uma correspondência exata entre o commit e o artefato em execução. O recibo e os logs privados estão em `outputs/product-shipping-2026-11-01/`, fora do Git.
