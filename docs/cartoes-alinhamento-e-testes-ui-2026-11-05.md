# Alinhamento dos cartões e regressões de interface — 05/11/2026

## Estado

Correções locais preparadas durante a revisão do PR13. Não representam publicação, migração ou importação em produção. A integração aguarda os resultados dirigidos, a revisão do HEAD final e a suíte completa do PR.

## Cartões compactos

A composição sem limite de linhas ampliava o primeiro grupo de cartões em 32 px. O componente e o teste já tinham os mesmos bytes na base `c01af84`; o problema foi reproduzido durante a revisão, sem atribuí-lo à inclusão das identidades de consulta.

O campo passa a reservar duas linhas de 16 px, inclusive quando vazio. O texto integral permanece no DOM e no atributo `title`, e o acesso à ficha continua disponível. Nome, marca, composição cadastrada, preço, quantidade, estoque e regras de compra não são alterados.

No desktop, o título reserva 60 px para três linhas de 20 px, em vez de 64 px. O ajuste remove 4 px de espaço do slot e conserva o limite existente de 520 px para os cartões sintéticos testados. O slot do título no celular permanece igual. Os testes mantêm as exigências de preço, alinhamento e largura, e verificam a composição integral e a igualdade do espaço vazio.

## Cenários de frete e Pix

- O cenário disponível do cartão passa a ter estoque sintético positivo. Um cenário separado mantém estoque zero e exige a mensagem de indisponibilidade, a ausência do campo CEP e a ação Avise-me. Não se libera cotação para produto indisponível.
- O teste do estimador seleciona a região com o título “Opções de entrega”, sem confundi-la com a mensagem de benefício que também usa `role=status`. As mesmas assertivas de valores, estimativa, ausência de gratuidade e largura continuam obrigatórias.
- O teste do checkout carrega o CSS global real mesmo sem captura de imagens, preservando o Preflight e as regras de dimensionamento. Um hook de preparação aguarda o bundle e o CSS antes dos casos, evitando que a navegação espere arquivos ainda em compilação. Os timeouts das interações e as assertivas permanecem iguais. O desconto Pix e o componente de checkout não são modificados por essa correção de harness.

## Verificação e limites

Os dados das fixtures são sintéticos. Os recibos ficam fora do Git em `D:/Codex-outputs/wimifarma-br/santa-cruz-publico-2026-11-05/validation/`, incluindo as rodadas anteriores com falha. A rodada de 17 testes após o primeiro ajuste de composição registrou 16 aprovados e um cartão de 524 px, acima do limite de 520 px; esse resultado motivou o ajuste posterior do título desktop, sem mudar o limite do teste.

Após o ajuste final de 4 px, os quatro cenários dirigidos de compactação, preço em tela estreita, alinhamento das ações e cartões mistos passaram, com as larguras e assertivas originais: `root-product-card-layout-final.log`, 4/4, SHA-256 `2c10e643a53782259c3401f29b1f168a5cd4cce10dbe5a9e82a7441de7ab993b`. ESLint dos três arquivos de cartões e `git diff --check` passaram. Não foi executada outra rodada integral dos 17 casos após esse último ajuste; o recibo anterior de 16/17 permanece preservado.

A rodada serial de checkout/frete passou 26/26, sem cancelados ou casos ignorados, em `root-checkout-shipping-tests.log`. Ela foi iniciada antes do hook final de preparação; a verificação do primeiro caso com o hook passou 1/1 e fica separada em `root-checkout-bootstrap-smoke.log`. Os recibos anteriores com timeout de logo e navegação foram preservados. ESLint dos dois arquivos e `git diff --check` passaram.

Um resultado local não substitui `test:all`, CI, build, revisão do commit final ou conferência da aplicação publicada. Nenhuma destas correções altera a configuração de frete, aprova transportadoras ou habilita novos produtos para envio.
