# 135 — Apresentação da compra e consulta de frete no produto

## Apresentação — 01/11/2026

O detalhe público do produto deixa de mostrar o bloco expansível “Sobre o PMC e a comparação de preços”, o aviso “Em estoque, sujeito à confirmação da farmácia” e a mensagem de pagamento combinado no atendimento junto dos botões de compra. O preço atual, a referência PMC e seu percentual continuam usando os mesmos cálculos. A alteração não modifica preços cadastrados, estoque, limites de quantidade, elegibilidade de compra, receitas ou gateway.

A galeria do detalhe também deixa de exibir a legenda visual “Imagem ilustrativa” na arte institucional de medicamento. A identificação acessível permanece no `aria-label` do placeholder, indicando que a ilustração não representa a embalagem do produto. Cards e demais usos do placeholder mantêm sua apresentação anterior.

O teste de apresentação da página verifica a ausência do bloco e da mensagem removidos, mantendo galeria, compra, entrega, relacionados e informações do produto.

## Orçamento público separado da aprovação de transporte

Produto e diálogo do catálogo passam a consultar `POST /api/fretes/estimativa`, com corpo estrito contendo apenas `productId`, `postalCode` e `quantity` (até 20 unidades). Produto ativo, preço atual, peso, medidas e características de carga são recuperados no servidor. A consulta mantém validação de origem/JSON/tamanho, limite de requisições e resposta privada sem cache.

Perfis completos ainda não revisados podem receber orçamento real do Melhor Envio. Nesse caso, a interface identifica a estimativa e informa que o envio ainda está em preparação. O resultado contém somente transportadora, modalidade, preço e prazo, sem token de checkout, perfil, empacotamento ou custos privados. Não há habilitação automática de transporte nem alteração de produto, preço, estoque ou pedido. O refresh OAuth operacional existente continua funcionando, inclusive a gravação cifrada da integração quando necessária.

Perfis prontos continuam respeitando os serviços aprovados e só recebem benefício de frete quando as regras existentes de elegibilidade, custo e margem permitirem. Estimativas de rascunhos não recebem promessa de gratuidade. Carga ausente permanece desconhecida; serviços explicitamente bloqueados são excluídos, medicamentos mantêm a seleção restrita e produtos assistidos conservam seu fluxo. O checkout permanece na rota assinada anterior e revalida o carrinho final.

A leitura produtiva de 01/11 encontrou 3.068 produtos ativos: 3.056 com os quatro campos físicos preenchidos, todos estimados, e 12 incompletos; dois perfis estavam habilitados/revisados. O Ablok do exemplo já possuía dados estimados completos, mas estava desativado e sem revisão. O bloqueio anterior acontecia antes da consulta ao provedor e não demonstrava falta de cobertura do CEP.

Os 12 incompletos não foram preenchidos indiscriminadamente: há conflitos documentais de unidade/apresentação, classificação ainda pendente, um SKU sem EAN e seis publicações recentes somente Avise-me com físicos desconhecidos. As guardas documentadas em [129](129-hipoteses-por-tipo-de-embalagem.md) e [134](134-prontidao-logistica-publicacao.md) continuam preservadas. Uma simulação não comprova pesagem, encaixe físico ou aceitação de carga.

## Verificação

A revisão independente aprovou a apresentação e o novo contrato público, sem enfraquecer `validateShippingProduct`, `validateOrderShipping` ou a política de publicação. Os dois testes da nova rota/serviço passam a integrar `test:security`, além da seleção de frete. O último ajuste visual apenas omite notas regulares sem subsídio ou progresso, mantendo os benefícios relevantes.

- Apresentação: 13 testes dirigidos; backend e regras de transporte: 15 testes, com dois casos ampliados posteriormente; interface principal: 19 testes, incluindo 320/390/1440 px; catálogo/cartão: cinco testes. Essas seleções podem se sobrepor e não representam uma contagem única somada.
- Uma fixture adicional não conseguiu iniciar Chromium sob carga (`Timeout 180000ms`), antes de executar suas asserções. A repetição somente desse arquivo, depois de encerrar as outras rodadas, passou nos cinco casos. Não se aumentou o timeout nem se omitiu a falha inicial.
- Segurança: 503/503, zero falhas. ESLint completo, typecheck e Prisma validate passaram. A primeira sequência de checks foi interrompida durante typecheck; a retomada executou somente os checks pendentes, após confirmar que os processos anteriores haviam encerrado.
- Auditoria de produção: três alertas baixos, quatro moderados, nenhum alto/crítico. Auditoria completa: três baixos, 17 moderados, nenhum alto/crítico. Logs completos preservados fora do Git; dependências não foram atualizadas nesta tarefa.

O build final será validado na imagem Linux antes de qualquer troca do app. Publicação e consulta pública real serão registradas após sua conclusão.
