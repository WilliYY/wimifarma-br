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

O pedido posterior de liberar produtos corretos motivou nova leitura produtiva: 3.061 ativos, 3.056 com os quatro campos físicos completos, cinco incompletos e dois já habilitados. Todos os 3.056 completos estão marcados como estimados. Em 2.673 há indicação explícita de encaixe ainda não confirmado; nos demais 383 não foi encontrada comprovação de encaixe na auditoria correspondente. Isso não autoriza afirmar que cada embalagem foi conferida.

Os lados externos estimados de 1.633 perfis ficam dentro da referência 24 × 15 × 10 cm; essa comparação não prova medidas internas, proteção ou encaixe físico. Nenhum candidato novo reúne comprovação registrada de encaixe e carga geral explicitamente classificada: 2.257 perfis completos não têm `cargoKinds` e os demais incluem cargas condicionais ou não especificadas. Não preencher `general` por exclusão nem marcar `transportReviewed:true` em massa com base nesses números.

Foi solicitada ao lojista a conferência representativa de sabonete em barra e pasta dental na caixa com proteção, para iniciar a revisão por grupos. A triagem não alterou perfis nem ativou serviços. A autorização comercial para liberar os corretos continua distinta da comprovação operacional de cada grupo. Recibo privado em `outputs/catalogo-frete-2026-11-01/activation-screen.sh` e `activation-screen.json`.

## Verificação

- TDD do CEP inicial registrou falha com campo vazio e passou após implementar o reaproveitamento.
- Trinta testes dirigidos de busca/cartões/simulador/controlador passaram; após polimento do resultado compacto, 26 testes de simulador, benefício e cartões passaram, incluindo cenários adicionais de crédito existentes.
- Fixture com CSS real conferiu 320, 390 e 1440 px, sem transbordamento no diálogo, tarifa/prazo sintéticos, retorno de foco e preservação dos cartões informativos.
- 491 verificações de segurança, typecheck e ESLint completo passaram. Revisão independente aprovou o código e o operador privado de entrega.
- Auditoria completa em 01/11: três alertas baixos e 17 moderados; produção: três baixos e quatro moderados. Zero altos/críticos; gate de produção passou. Os alertas em React Email/renderização, glob/minimatch e ferramentas ESLint permanecem, sem atualização de dependências nesta tarefa.

Capturas e recibos ficam em `outputs/catalogo-frete-2026-11-01/`, fora do Git. Build Linux, implantação e QA pública devem ser registrados após execução; estes checks locais não os comprovam.
