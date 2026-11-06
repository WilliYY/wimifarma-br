# Estimativas físicas por família — 06/11/2026

## Decisão e escopo

O lojista autorizou pesos e medidas aproximados, calculados por grandes famílias e com análise individual das exceções. A política `family-physical-draft-v4.3-2026-11-06` permite recalcular peso, comprimento, largura e altura de perfis estimados desativados elegíveis, inclusive valores preenchidos ou nulos.

Esta é uma política distinta de `reviewed-family-v1`, `comparable-package-v1` e das receitas físicas calibradas. Os contratos anteriores continuam válidos nos respectivos modos. A proposta nova usa hipóteses declaradas; não representa medição, média observada, encaixe confirmado ou compatibilidade calibrada. Não deve receber a proveniência de referências que não possui.

Perfis habilitados, revisados, medidos, com referência ou serviços aprovados, além de produtos em Avise-me, permanecem preservados. Evidências, classificação, receita, estoque, preços e demais campos comerciais não integram o lote. A alteração proposta contém somente os quatro campos físicos e a revisão técnica correspondente, com auditoria.

Habilitação e aprovação de transporte são etapas separadas. O lote físico mantém `enabled=false`, `transportReviewed=false`, a base `estimated`, as restrições de carga e os serviços existentes. O pedido de habilitação nacional não transforma uma hipótese de pacote em aceite da transportadora.

## Cálculo

- Usar conteúdo e contagem declarados na apresentação; não tratar doses em mg, mcg ou UI como peso do pacote.
- Somar conteúdo dos kits homogêneos identificáveis. Acrescentar tara comercial, caixa externa e proteção uma única vez, depois uma margem única de 20%, arredondando o peso para cima em dezenas de gramas.
- Declarar hipóteses como densidade de 1,3 g/mL e massa de 1,5 g por unidade oral. Esses parâmetros não são pesagens do catálogo.
- Dar prioridade ao bruto documental da mesma apresentação quando for utilizável; referências conflitantes, conteúdo ambíguo, identidades divergentes e apresentações especiais seguem para exceção.
- Escolher uma caixa de planejamento por família e volume. As medidas propostas não confirmam disponibilidade da caixa ou encaixe real.
- Preservar os avisos de carga do perfil original, mesmo quando o título não evidencia líquido, aerossol, perfume ou bateria. Família física não define classe de carga.

Na V4.3, dois kits de seis sabonetes Palmolive foram corrigidos para 880 g e 24 × 15 × 10 cm. A hipótese soma 540 g de conteúdo, 60 g de tara comercial e 130 g de caixa/proteção, antes da margem e do arredondamento.

## Estado verificado e condição de aplicação

A captura somente de leitura de 06/11/2026 às 19:01:22 UTC encontrou 3.070 produtos ativos: 507 habilitados/revisados e seis em Avise-me. A prévia preserva os 513 perfis protegidos, propõe quatro campos físicos para 2.521 produtos em 17 famílias e separa 36 exceções. Trata-se de contagem daquela captura, sujeita a mudanças em outros chats.

O estimador passou em 62 testes. Os 2.521 candidatos passaram pelo `shippingDraftSchema` real do aplicativo. Após sete rodadas que falharam por memória, a deduplicação do request SQL preservou o manifesto completo e passou em 54 testes puros e revisão independente.

A oitava QA PostgreSQL isolada passou nos sete cenários pequenos e nos dois lotes integrais: 2.504 alvos com 2.507 produtos de origem e 2.521 alvos com 3.071 produtos de origem, com auditorias exatas e reconciliação. Falhas de auditoria, ADMIN inativo, CAS divergente, alteração externa e repetição foram recusadas com rollback quando aplicável. O container de 384 MiB atingiu pico de 373.305.344 bytes, sem eventos OOM, e foi removido. Isso comprova a QA sintética, não a aplicação em produção.

Não houve nova gravação de produtos, backup operacional, intent de aplicação ou habilitação nesta preparação. Após a QA aprovada, a aplicação ainda exige contexto e manifesto atuais, janela exclusiva, ADMIN ativo, CAS, backup validado, despacho único e reconciliação posterior. Falha ou incerteza após o despacho impede repetição automática.

As provas e ferramentas privadas permanecem fora do Git em `D:/Codex-outputs/wimifarma-br/familias-logisticas-2026-11-06`. A prévia atual tem SHA-256 `54f2f9d074f201a59d5bd941007905a2b21c2683fc82edbb68bce96837b78f42`; a captura original tem SHA-256 `d0bd0746f4dadb1d4b284f73f039e426e8b8ba5897b5801ddc0baa63cc40711e`.

## Rotas

PAC e SEDEX em Ivaté são a base para carga aceita, sempre conforme CEP e pacote. [As regras nacionais dos Correios](https://www.correios.com.br/enviar/proibicoes-e-restricoes) contemplam medicamentos sem controle especial para clientes com ou sem contrato. Essa alternativa de postagem direta não comprova o uso da etiqueta ou tarifa do Melhor Envio para a mesma carga. A API oficial de Preço tem acesso contratual.

O [guia do Melhor Envio](https://centraldeajuda.melhorenvio.com.br/hc/pt-br/articles/31220391789332-Guia-de-produtos-que-podem-ou-n%C3%A3o-ser-enviados-pelo-Melhor-Envio) conserva condições específicas para medicamentos, líquidos, perfumes, aerossóis e baterias. Foi enviada consulta complementar no ticket técnico já autorizado pelo lojista, sem contratar, pagar ou emitir etiqueta. A definição dessa rota continua pendente de resposta operacional.
