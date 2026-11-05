# Alinhamento dos cartões e regressões de interface — 05/11/2026

## Estado

Correções locais preparadas durante a revisão do PR13, incluindo a continuidade após a CI de `9704de4`. Não representam publicação, migração ou importação em produção. A integração aguarda os resultados dirigidos, a revisão do HEAD final e a suíte completa do PR.

## Cartões compactos

As linhas da grade podiam ter alturas diferentes quando uma composição precisava de mais espaço. O componente e o teste já tinham os mesmos bytes na base `c01af84`; o desnível foi reproduzido durante a revisão, sem atribuí-lo à inclusão das identidades de consulta.

O campo de composição mantém o texto inteiro visível, sem truncamento, altura fixa ou recorte. O DOM, o atributo `title` e o acesso à ficha também preservam a informação completa. O contrato de medicamentos protege os pares de substância e concentração; esconder parte do texto visualmente não atende a esse contrato.

A equalização ocorre na grade central de `CatalogPage`, por `auto-rows-fr`, com os cartões já esticados pela altura da linha. As fixtures usam a mesma regra. As linhas crescem conforme o conteúdo, incluindo os cartões comerciais, neutros e de consulta; não se limita a altura de um ingrediente para alinhar preços. Os carrosséis da home e de relacionados continuam como linhas flexíveis e não são alterados.

No desktop, o título reserva 60 px para três linhas de 20 px, em vez de 64 px. O ajuste remove 4 px de espaço do slot. O título no celular permanece igual. Os testes mantêm as exigências de preço, alinhamento e largura e verificam texto integral, ausência de overflow e geometria sem recorte em 320, 390 e 1280 px. O limite de 520 px é uma verificação da amostra sintética; não é um teto de produção que permita esconder composições maiores.

## Cenários de frete e Pix

- O cenário disponível do cartão passa a ter estoque sintético positivo. Um cenário separado mantém estoque zero e exige a mensagem de indisponibilidade, a ausência do campo CEP e a ação Avise-me. Não se libera cotação para produto indisponível.
- O teste do estimador seleciona a região com o título “Opções de entrega”, sem confundi-la com a mensagem de benefício que também usa `role=status`. As mesmas assertivas de valores, estimativa, ausência de gratuidade e largura continuam obrigatórias.
- O teste do checkout carrega o CSS global real mesmo sem captura de imagens, preservando o Preflight e as regras de dimensionamento. Um hook de preparação aguarda o bundle e o CSS antes dos casos, evitando que a navegação espere arquivos ainda em compilação. Os timeouts das interações e as assertivas permanecem iguais. O desconto Pix e o componente de checkout não são modificados por essa correção de harness.

## Verificação e limites

Os dados das fixtures são sintéticos. Os recibos ficam fora do Git em `D:/Codex-outputs/wimifarma-br/santa-cruz-publico-2026-11-05/validation/`, incluindo as rodadas anteriores com falha. A rodada de 17 testes após o primeiro ajuste de composição registrou 16 aprovados e um cartão de 524 px, acima do limite de 520 px; esse resultado motivou o ajuste posterior do título desktop, sem mudar o limite do teste.

Os recibos anteriores de 16/17 e 4/4 permanecem preservados como histórico. A CI de `9704de4` encontrou uma regressão real na tentativa de limitar a composição a duas linhas: `public-product-medicine.test.ts` exige o texto visível sem truncamento. Esses recibos anteriores não validam a correção atual da grade.

A correção atual passou 6/6 testes dirigidos, incluindo o contrato medicinal sem alterações, compactação, preço, alinhamento, cartões mistos e o catálogo com disponibilidade e ruptura. O recibo `root-card-unclipped-tests-fallback.log` tem SHA-256 `4b501a9c66831aaa857c118a73bfeef5c35ed348d6cad15cd61393226c328a8f`, duração de 139.690 ms e zero falhas, cancelados ou ignorados. ESLint dos quatro arquivos e `git diff --check` passaram. A suíte completa do próximo commit permanece uma etapa separada.

A rodada serial de checkout/frete passou 26/26, sem cancelados ou casos ignorados, em `root-checkout-shipping-tests.log`. Ela foi iniciada antes do hook final de preparação; a verificação do primeiro caso com o hook passou 1/1 e fica separada em `root-checkout-bootstrap-smoke.log`. Os recibos anteriores com timeout de logo e navegação foram preservados. ESLint dos dois arquivos e `git diff --check` passaram.

Um resultado local não substitui `test:all`, CI, build, revisão do commit final ou conferência da aplicação publicada. Nenhuma destas correções altera a configuração de frete, aprova transportadoras ou habilita novos produtos para envio.
