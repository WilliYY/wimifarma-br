# Pedido online e conferência de receita

## Regra aprovada em 06/10/2026

O lojista solicitou compra normal, sem envio de receita no checkout. Medicamentos de receita comum podem receber pedidos e pagamentos online. A apresentação e avaliação da receita pelo farmacêutico continuam necessárias antes da dispensação, conforme RDC 44/2009, arts. 43–45 e 52–53. O checkout não recebe arquivos de receita.

Medicamentos sob controle especial não podem ter compra e venda pela internet, embora sua entrega remota tenha regras próprias. Esses itens, Farmácia Popular e medicamentos de receita ainda não classificados seguem atendimento assistido. A afirmação de disponibilidade comercial não transforma um medicamento em isento de prescrição.

## Cadastro e catálogo

- `Product.prescriptionType`: `UNREVIEWED` por padrão, `ORDINARY` para receita comum ou `CONTROLLED` para controle especial. Somente ADMIN envia uma classificação explícita.
- `requiresPrescription` permanece verdadeiro para comum/controlado. Schemas, validação da atualização com os dados persistidos e um CHECK no banco impedem a combinação contraditória.
- Nome, marca ou EAN alterados resetam a classificação para não revisado, salvo nova escolha explícita por ADMIN. O seletor acompanha a identidade do formulário e a API aplica a mesma regra.
- Criação e atualização registram o estado de prescrição na auditoria; atualização registra antes/depois e operador. A pesquisa da IA não preenche essa classificação.
- Busca, vitrine, página do produto e carrinho usam a política compartilhada. Carrinho antigo sem classificação não recebe autorização por inferência; o servidor consulta o produto atual ao criar o pedido.
- Prescrição permanece excluída dos benefícios e canais comerciais que já dependem desse sinal, incluindo cashback e feed Google. Não remover a exigência de receita para fazer botões aparecerem.

## Pedido e atendimento

O servidor grava `requiresPrescriptionReview` no pedido a partir dos produtos reais. Campos enviados pelo cliente não concedem conferência. O painel mostra a pendência e permite à equipe autorizada registrar que o farmacêutico conferiu a receita. O registro guarda data e operador, sem arquivo ou dados clínicos; ele é uma declaração operacional, não uma prova automática de habilitação profissional.

Antes de `READY`, `OUT_FOR_DELIVERY` ou `COMPLETED`, a API exige conferência registrada. A verificação ocorre após lock da linha do pedido, incluindo transições diretas e repetição do mesmo status. Usuário comum, operador demonstrativo e pedidos cancelados/concluídos não podem conceder uma nova conferência. Os controles do pagamento e a confirmação autenticada do gateway permanecem independentes.

O histórico do cliente explica a apresentação da receita antes da entrega/retirada. A aprovação de cartão ou Pix não significa aprovação farmacêutica. Se a farmácia não puder dispensar, deve conduzir o atendimento e o cancelamento/reembolso pelo fluxo financeiro existente.

## Frete

Receita comum classificada pode consultar transportadora somente com perfil logístico aprovado, conservação adequada e integração ativa. Carrinho com medicamento mantém PAC/SEDEX; receita controlada ou não classificada continua impedida. Referência estimada não equivale a medida física. A classificação não aprova automaticamente peso, dimensões, embalagem, etiqueta ou postagem.

## Validação e implantação

- Testes gerais: 203/203; frete: 48/48. Casos cobrem receita comum, controlados, classificação ausente, campos contraditórios, mudança de identidade, falsificação de conferência e transições operacionais/pagamento.
- Revisão independente aprovada após correção da consistência, invalidação por identidade e auditoria; 12/12 regressões focadas e ESLint dos arquivos revisados passaram.
- Auditoria de dependências de produção: zero vulnerabilidades. Auditoria completa ainda aponta cinco alertas high em dependências de desenvolvimento (`braces`, `micromatch`, `fast-glob`, `@next/eslint-plugin-next`, `eslint-config-next`); não foram ocultados ou corrigidos com atualização ampla fora deste escopo.
- Typecheck, lint e `prisma:validate` passaram; `test:security`: 91/91. Build Linux/Docker passou. CI de segurança do commit `9c7f356`: [sucesso no GitHub](https://github.com/WilliYY/wimifarma-br/actions/runs/37508989824).
- As 19 migrações foram aplicadas em PostgreSQL 17 descartável, sem dados, volumes ou credenciais da loja. Inserts sintéticos comprovaram o padrão não revisado e a rejeição de classificação comum com `requiresPrescription=false`. Container/rede exclusivos removidos ao terminar.
- Migração aditiva aplicada em produção antes de recriar somente a aplicação. Container saudável, zero reinícios e `/api/health` 200. PostgreSQL de produção não foi reiniciado.
- Classificação da apresentação Losartana Teuto 50 mg/30 salva pelo painel autenticado: `ORDINARY`, exigência de receita preservada, cashback desativado, preço e estoque preservados. A busca pública confirmou o estado persistido. EAN e marca separados permanecem ausentes nesse cadastro; identificação se apoia no nome/apresentação e embalagem compatível com a bula oficial.
- Perfil estimado autorizado liberado pelo painel: 500 g, C20,8 × L20,8 × A21,6 cm, origem `estimated`. Revisão e ativação persistiram após recarregar. Não foi declarado peso medido ou realizada postagem.
- Ensaio público `scripts/prescription-live-audit.mjs` permite somente a requisição de cotação; bloqueia criação de pedidos, pagamentos e comunicações. Conferiu Adicionar/Comprar, aviso de receita, Pix/cartão disponíveis, ausência de upload, cotação automática no CEP, ordenação por preço, total com frete e persistência ao recarregar. Larguras 320/390/768/1440 px sem transbordamento horizontal ou erro de página.
- Cotação no checkout para duas unidades/CEP 87501-070: PAC R$43,40/8 dias úteis e SEDEX R$49,36/4 dias úteis. Cotação de uma unidade/CEP 01001-000: PAC R$21,70/9 dias úteis e SEDEX R$24,68/5 dias úteis. Preços e prazos são resultados momentâneos, incluem a preparação configurada e dependem de disponibilidade, volume estimado e consulta atual. Um volume por unidade continua sendo a regra; não há consolidação automática.
- Evidências visuais locais em `outputs/prescription-oct06`, fora do Git. Nenhuma cobrança real, etiqueta ou mensagem ao cliente foi gerada nesta validação. Disponibilidade das opções Pix/cartão no checkout não equivale a uma nova homologação financeira desses meios.

## Retorno intermitente do provedor — 06/10/2026, 18:22 UTC

Após as cotações e a primeira prova pública aprovadas acima, uma repetição devolveu HTTP 200 com lista vazia. Diagnóstico isolado no servidor, sem expor credenciais, mostrou que o Melhor Envio retornou `error: "Serviço indisponível no momento"` tanto para PAC quanto para SEDEX. Os dois CEPs previamente atendidos ficaram sem opções; a resposta não comprova perda de cobertura, erro de dimensões ou falha OAuth.

`normalizeQuotes` agora devolve erro temporário 503 quando todos os serviços retornados autorizados têm essa mensagem explícita. A interface apresenta a mensagem e permite consultar novamente ou escolher retirada. Sucesso parcial e ausência normal de cobertura permanecem distintos. Não foram adicionados retries automáticos, preços presumidos, serviços não autorizados ou cobranças. A detecção depende da mensagem atual do provedor e não restabelece o serviço externo.

Regressão falhou antes da correção e passou depois; suite de frete 49/49 e segurança 92/92, com revisão independente aprovada e ESLint limpo. A disponibilidade atual precisa ser confirmada em nova consulta; os preços acima são evidência histórica deste ensaio. Essa instabilidade impede declarar transporte garantido para todos os destinos a qualquer momento.

Às 18:30 UTC, depois da publicação de `b2d3e73`, o provedor voltou a retornar PAC/SEDEX para o mesmo carrinho. Nova execução integral do ensaio público passou: cotação automática, seleção e total, Pix/cartão disponíveis, persistência e quatro larguras. Container saudável/zero reinícios; imagem `sha256:0415efa648e2e679ea824313c182f35a4b910fbba3570695fa53164e3fe0646c`. [CI de segurança final aprovado](https://github.com/WilliYY/wimifarma-br/actions/runs/37511557399). Retomada constatada não elimina a possibilidade de nova indisponibilidade externa.

## Arquivos e comandos da entrega

Política compartilhada em `src/features/products/purchase-policy.ts`; cadastro/schemas e APIs em `src/features/products/schema.ts` e `src/app/api/produtos`; snapshots/transições em `src/features/orders/create-checkout.ts` e `src/app/api/pedidos/[id]/route.ts`; classificação e conferência em `products-catalog-panel.tsx` e `orders-panel.tsx`; consumo público em vitrine, busca, página, carrinho e histórico. Contrato persistente em `prisma/schema.prisma` e migração `20261006183000_prescription_orders`. Frete em `src/features/shipping/eligibility.ts`, `service.ts` e `rules.ts`. Diff completo nos commits da tarefa, iniciando em `9c7f356`.

Comandos usados: `npm.cmd run test`, `test:security`, `test:shipping`, `typecheck`, `lint`, `prisma:validate`; `npm.cmd audit --omit=dev --audit-level=high --json` e auditoria completa; `node scripts/prescription-live-audit.mjs` com diretório de evidências. No servidor: build Docker (inclui `npm run build`), `prisma migrate deploy`, atualização somente da aplicação e health-check. Últimos resultados: 203/203 gerais, 92/92 de segurança e 49/49 de frete; nenhuma cobrança ou comunicação real nos ensaios.

## Limite de publicidade

RDC 44/2009, art. 54, restringe imagens/promocionais de medicamentos com receita e admite lista neutra de preços nos termos da norma. O catálogo atual precisa de revisão específica dessa apresentação. Este trabalho separa pedido e dispensação; não atesta conformidade integral da publicidade nem autoriza campanha, avaliação incentivada, cashback ou Merchant Center para medicamentos de receita.

## Fontes oficiais

- [RDC 44/2009 — solicitação remota e dispensação](https://anvisalegis.datalegis.net/action/ActionDatalegis.php?acao=abrirTextoAto&numeroAto=00000044&orgao=RDC/DC/ANVISA/MS&seqAto=000&tipo=RDC&valorAno=2009).
- [Portaria 344/1998 consolidada — arts. 34-A e 34-B](https://anvisalegis.datalegis.net/action/ActionDatalegis.php?acao=abrirTextoAto&numeroAto=00000344&orgao=SVS/MS&seqAto=000&tipo=POR&valorAno=1998).
- [RDC 1036/2026 — listas de controle especial](https://anvisalegis.datalegis.net/action/ActionDatalegis.php?acao=abrirTextoAto&numeroAto=00001036&orgao=RDC/DC/ANVISA/MS&seqAto=000&tipo=RDC&valorAno=2026).
- [Bula oficial Teuto — Losartana potássica 50 mg, 30/60 comprimidos](https://teutodigital.com.br/wp-content/uploads/2023/12/Losartana-potassica-VP-406150-11.pdf).
- [Anvisa — processo regulatório de logística iniciado em agosto de 2026](https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa/2026/anvisa-abre-processo-para-regular-logistica-e-entrega-de-medicamentos-em-plataformas-de-comercio-eletronico-e-canais-digitais). Processo regulatório não é revogação automática das regras em vigor.
