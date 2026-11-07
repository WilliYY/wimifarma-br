# Consulta assistida de envio por CEP — 07/11/2026

Quando a estimativa pública retorna `mode: "estimate"` com modalidades, o produto ainda precisa de conferência de transporte. Antes, a interface mostrava as tarifas e “Envio ainda em preparação”, mas escondia o acesso ao WhatsApp justamente porque havia opções estimadas. O cliente não tinha um caminho direto para pedir essa conferência.

O componente `DeliveryEstimator` oferece a consulta pelo WhatsApp também nesse estado. A solicitação identifica o produto, a quantidade atualmente cotada e o CEP formatado. O link usa o construtor existente e somente preenche a conversa; o cliente decide se envia a mensagem. Alterar produto, quantidade ou CEP continua invalidando o resultado anterior.

A apresentação informa envio sob consulta e conserva os preços e prazos como estimados. A equipe precisa confirmar a possibilidade de postagem e as condições para aquele CEP. A estimativa e o pedido de atendimento não aprovam transporte, garantem cobertura, criam etiqueta ou tornam o frete definitivo.

Os critérios do checkout, os perfis físicos, `enabled`, `transportReviewed`, serviços aprovados, composição de carga e política financeira permanecem sob seus contratos existentes. O ajuste não altera a reserva de 50% da margem nem concede frete grátis a perfis pendentes. Entrega local, CEP inválido, carregamento, indisponibilidade e atendimento clínico/comercial conservam seus fluxos próprios; o novo contexto de envio não transforma esses casos em uma oferta de compra ou entrega aprovada.

## Verificação

Os testes Chromium do estimador usam produtos e respostas sintéticos, com rede interceptada. A regressão verifica a presença do atendimento na estimativa pendente, produto/quantidade/CEP no link, preservação das tarifas estimadas e dos demais estados. Não há envio real de WhatsApp ou chamada de cotação durante esses testes.

```powershell
npx.cmd tsx --test src/components/site/delivery-estimator.test.ts src/components/site/delivery-estimator-ui.test.ts
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test:security
```

Os comandos devem seguir o executor e o escopo temporário vigentes do projeto. A implementação é preparada em worktree isolado enquanto outra publicação está em andamento; teste local não comprova publicação. A integração e a ativação exigem observar o estado real, preservar o catálogo e respeitar a coordenação da janela de publicação.
