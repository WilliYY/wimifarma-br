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
- A migração é aditiva, com valores padrão compatíveis e CHECK de consistência. Aplicação da migração, build e prova pública serão registrados após a validação, sem cobrança real, compra de etiqueta ou mensagem ao cliente nos testes.

## Limite de publicidade

RDC 44/2009, art. 54, restringe imagens/promocionais de medicamentos com receita e admite lista neutra de preços nos termos da norma. O catálogo atual precisa de revisão específica dessa apresentação. Este trabalho separa pedido e dispensação; não atesta conformidade integral da publicidade nem autoriza campanha, avaliação incentivada, cashback ou Merchant Center para medicamentos de receita.

## Fontes oficiais

- [RDC 44/2009 — solicitação remota e dispensação](https://anvisalegis.datalegis.net/action/ActionDatalegis.php?acao=abrirTextoAto&numeroAto=00000044&orgao=RDC/DC/ANVISA/MS&seqAto=000&tipo=RDC&valorAno=2009).
- [Portaria 344/1998 consolidada — arts. 34-A e 34-B](https://anvisalegis.datalegis.net/action/ActionDatalegis.php?acao=abrirTextoAto&numeroAto=00000344&orgao=SVS/MS&seqAto=000&tipo=POR&valorAno=1998).
- [RDC 1036/2026 — listas de controle especial](https://anvisalegis.datalegis.net/action/ActionDatalegis.php?acao=abrirTextoAto&numeroAto=00001036&orgao=RDC/DC/ANVISA/MS&seqAto=000&tipo=RDC&valorAno=2026).
- [Bula oficial Teuto — Losartana potássica 50 mg, 30/60 comprimidos](https://teutodigital.com.br/wp-content/uploads/2023/12/Losartana-potassica-VP-406150-11.pdf).
- [Anvisa — processo regulatório de logística iniciado em agosto de 2026](https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa/2026/anvisa-abre-processo-para-regular-logistica-e-entrega-de-medicamentos-em-plataformas-de-comercio-eletronico-e-canais-digitais). Processo regulatório não é revogação automática das regras em vigor.
