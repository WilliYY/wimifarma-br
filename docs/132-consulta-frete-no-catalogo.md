# 132 — Consulta de frete durante a pesquisa

## Comportamento — 01/11/2026

Catálogo, ofertas e página de busca passam a oferecer **Ver frete** nos cartões comerciais. A ação abre uma janela compartilhada, sem navegar ao detalhe, adicionar ao carrinho ou alterar estoque. A simulação considera exatamente uma unidade do produto escolhido e reutiliza `DeliveryEstimator` e `/api/fretes/cotacao`.

O CEP fica em memória durante a permanência na página e é reaproveitado ao consultar outro produto. Não há persistência adicional, cookie, rastreamento ou envio ao digitar na busca. Somente o envio explícito do formulário consulta a transportadora. Mudanças de CEP, fechamento e troca de produto invalidam a resposta anterior; o foco retorna ao botão que abriu a janela.

Há apenas um diálogo por página, com conteúdo desmontado ao fechar. Os cartões informativos de medicamentos em pesquisa por assunto permanecem sem chamada comercial. Home e correlatos conservam os cartões compactos existentes, sem acrescentar o botão nessa etapa. Cada instância do simulador usa IDs próprios para título, campo e resultado. A versão compacta aproveita toda a largura do resultado no celular e não repete a mensagem genérica para consultar CEP depois de já receber a cotação.

## Contratos preservados

- Mesma API, validação de origem/JSON/tamanho, rate limit, preço/estoque no servidor, assinatura e expiração da cotação. Nenhuma API ou dependência nova.
- CEPs locais aprovados usam a política existente. Cotação nacional conserva revisão de embalagem, carga e serviços; rascunho completo não é habilitado por abrir o simulador.
- Preço, prazo e benefício vêm da cotação. Frete grátis não é prometido genericamente nem calculado só pelo subtotal. Checkout revalida a composição final.
- Falhas de embalagem, estoque, conexão e cobertura preservam a mensagem correspondente, sem apresentar tarifa inventada.

## Triagem de ativação

O pedido posterior de liberar produtos corretos motivou nova leitura produtiva. Na atualização de 01/11 às 13:42 UTC, após inclusão concorrente de produto, há 3.062 ativos, 3.056 com os quatro campos físicos completos, seis incompletos e dois já habilitados. Todos os 3.056 completos estão marcados como estimados. Em 2.673 há indicação explícita de encaixe ainda não confirmado; nos demais 383 não foi encontrada comprovação de encaixe na auditoria correspondente. Isso não autoriza afirmar que cada embalagem foi conferida.

Os lados externos estimados de 1.633 perfis ficam dentro da referência 24 × 15 × 10 cm; essa comparação não prova medidas internas, proteção ou encaixe físico. Nenhum candidato novo reúne comprovação registrada de encaixe e carga geral explicitamente classificada: 2.257 perfis completos não têm `cargoKinds` e os demais incluem cargas condicionais ou não especificadas. Não preencher `general` por exclusão nem marcar `transportReviewed:true` em massa com base nesses números.

Foi solicitada ao lojista a conferência representativa de sabonete em barra e pasta dental na caixa com proteção, para iniciar a revisão por grupos. A dúvida sobre proteção interna foi esclarecida; não equivale a confirmação de encaixe ou pesagem. A triagem não alterou perfis nem ativou serviços. A autorização comercial para liberar os corretos continua distinta da comprovação operacional de cada grupo. Recibos privados em `outputs/catalogo-frete-2026-11-01/activation-screen.sh`, `activation-screen.json` e `activation-screen-final.json`.

## Verificação

- TDD do CEP inicial registrou falha com campo vazio e passou após implementar o reaproveitamento.
- Trinta testes dirigidos de busca/cartões/simulador/controlador passaram; após polimento do resultado compacto, 26 testes de simulador, benefício e cartões passaram, incluindo cenários adicionais de crédito existentes.
- Fixture com CSS real conferiu 320, 390 e 1440 px, sem transbordamento no diálogo, tarifa/prazo sintéticos, retorno de foco e preservação dos cartões informativos.
- 491 verificações de segurança, typecheck e ESLint completo passaram. Revisão independente aprovou o código e o operador privado de entrega.
- Auditoria completa em 01/11: três alertas baixos e 17 moderados; produção: três baixos e quatro moderados. Zero altos/críticos; gate de produção passou. Os alertas em React Email/renderização, glob/minimatch e ferramentas ESLint permanecem, sem atualização de dependências nesta tarefa.

## Publicação e QA pública — 01/11/2026

A fonte/OCI `a47f0a4170650b52bb678fa5a06f224ab763a260` foi construída no Linux e publicada somente no serviço app. O operador independente de verificação retornou `PASS`: home e saúde HTTP 200, API administrativa de produtos HTTP 401 anônimo, contrato de runtime e comparação comercial de `Product`, `SupplierCatalogOffer`, `Offer` e `Order` preservados. PostgreSQL não foi recriado; backup custom, TOC e imagem anterior foram mantidos.

A primeira preparação parou ao detectar canônico alterado, antes de criar job ou trocar o app. A recuperação usou novo operador/job `catalog-shipping-01a15b8f-20261101-window-v2`, revisado com o hash do estado `completed_released`, sem alterar canônico ou grants. Preparação, build, deploy e verificação foram executados uma única vez no novo job. Recibo privado em `deployment/production-result.json`.

Na busca pública por Kit Kat, **Ver frete** abriu o diálogo sem sair da página. CEP 87525-000 retornou entrega local grátis; CEP 01001-000 retornou cinco serviços reais: Jadlog .Com R$ 17,65/até quatro dias úteis, PAC R$ 18,08/nove, SEDEX R$ 20,57/cinco, Total Express Standard R$ 21,43/nove e Jadlog .Package R$ 21,59/cinco. São cotações daquela consulta para uma unidade, com preparação incluída; não constituem tabela permanente ou prova de cobertura de todo o catálogo.

O diálogo foi observado em 390 e 320 px; em 320 px, largura de conteúdo e largura rolável coincidiram em 256 px, sem transbordamento horizontal. Escape fechou o diálogo e devolveu foco ao botão. A automação do Chrome apresentou timeouts intermitentes em cliques; o fechamento por mouse não teve comprovação pública adicional nesta rodada, embora passe na fixture. Foi observado excesso de aviso repetido nos resultados reais, encaminhado à revisão visual.

A pedido do lojista, o chat 14 recebeu revisão independente de responsividade, cartões, foco e sobreposições; chat 9 mantém logística, consulta real e Mercado Livre. O alinhamento foi enviado pela interface do Codex porque as ferramentas entre chats não estavam disponíveis. Não foi delegada ativação logística nem publicação concorrente.

Na continuação, o chat 14 corrigiu o corte visual do CEP durante o carregamento em 320 px: o botão reserva a mesma largura, exibe spinner e mantém nome acessível “Consultando...”. No resultado compacto, a nota por serviço só é omitida quando regular, sem subsídio nem valor de progresso; desconto, gratuidade, mínimo e quanto falta permanecem. Aviso final de recotação aparece uma vez. Passaram 27 testes dirigidos e QA local 320/390/1440 px; integração e publicação desta correção são registradas em [134](134-prontidao-logistica-publicacao.md).

Capturas e recibos ficam em `outputs/catalogo-frete-2026-11-01/`, fora do Git. Nenhum pedido, pagamento ou etiqueta foi criado nesta validação.

A correção compacta foi publicada no app `14721f2`, junto ao contrato de prontidão logística. A conferência pública com fontes reais em 320 px manteve a largura do botão durante carregamento e o CEP 01001-000 completo; São Paulo retornou cinco serviços sem notas regulares repetidas. Captura adicional em `outputs/logistica-prontidao-2026-11-01/frete-publicado-320.png`. Não houve alteração de cálculo ou pedido de teste; publicação e limites em [134](134-prontidao-logistica-publicacao.md).
