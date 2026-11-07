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

A captura somente de leitura de 06/11/2026 às 21:03:31 UTC encontrou 3.070 produtos ativos: 507 habilitados/revisados e seis em Avise-me. A prévia preservou os 513 perfis protegidos, propôs quatro campos físicos para 2.521 produtos em 17 famílias e separou 36 exceções. Esses 2.521 refinamentos foram posteriormente aplicados e reconciliados; as contagens de habilitados e Avise-me permaneceram iguais.

O estimador passou em 62 testes. Os 2.521 candidatos passaram pelo `shippingDraftSchema` real do aplicativo. Após sete rodadas que falharam por memória, a deduplicação do request SQL preservou o manifesto completo e passou em 54 testes puros e revisão independente.

A oitava QA PostgreSQL isolada passou nos sete cenários pequenos e nos dois lotes integrais: 2.504 alvos com 2.507 produtos de origem e 2.521 alvos com 3.071 produtos de origem, com auditorias exatas e reconciliação. Falhas de auditoria, ADMIN inativo, CAS divergente, alteração externa e repetição foram recusadas com rollback quando aplicável. O container de 384 MiB atingiu pico de 373.305.344 bytes, sem eventos OOM, e foi removido. Isso comprova a QA sintética, não a aplicação em produção.

A operação `family-physical-3c8ed3fe098aa629` foi executada em janela própria, com contexto e manifesto atuais, ADMIN ativo, CAS, backup PGDMP validado, intent exclusivo e um único despacho de aplicação. A conferência nativa e a comparação local dos bytes reais recebidos do PostgreSQL confirmaram os 2.521 perfis, 2.521 auditorias e a preservação dos 3.070 produtos ativos dentro do contrato observado. Não houve repetição nem restauração.

O fechamento por CAS foi observado em 06/11/2026 às 21:21:19 UTC: `completed_released`, grant consumido e metadata de seis campos e 22 descritores Compose preservadas. O aplicativo permaneceu na revisão `747b93e`; este lote não publicou código. Foram observadas oito tabelas e o histórico de 35 migrations; isso não representa declaração de igualdade global do banco.

As revisões independentes aprovaram código e configuração concreta. Além dos testes do modelo e núcleo, 26 testes do contexto/adaptador e nove da reserva/fechamento passaram. Eles incluem prazo revalidado imediatamente antes do despacho e do CAS, recusa de repetição e preservação do intent após falha. Falha ou incerteza após um despacho continua impedindo repetição automática.

Imosec 2 mg, 12 comprimidos, passou a ter proposta física estimada de 160 g e 16 × 11 × 6 cm. O perfil conserva a classificação de medicamento e o transporte desativado/não revisado. Completar esses dados não confirma sua rota.

As provas e ferramentas privadas permanecem fora do Git em `D:/Codex-outputs/wimifarma-br/familias-logisticas-2026-11-06`. A prévia aplicada tem SHA-256 `91b3ae276085b2b3e2e0e99c6fcffbae3a257210d16d3db939c1b2cd01393f8f`; a captura original tem SHA-256 `c326e7b9706be4535f5e4f02de8f43dc13e6db758ef669b1a4a5d3180d8b79ec`. O relatório operacional tem SHA-256 `da152c236b5cce6beb8725ab4ab64aa381fed916dbd4cb50a5b69102f266776f`; a validação local, `cf220a435024b43c5150ebef4b809ce8831be9b9141526ff7e1407e9fb3c246c`.

O backup privado permaneceu no servidor, com 3.484.480 bytes e SHA-256 `0a0d1cdecff947107a8ccb6e910f16d85128db4606f088d4883629e1996dd1ff`. Formato, hash e índice foram validados; não foi realizado teste de restauração. A operação anterior dos 21 perfis não foi repetida nem teve seu estado histórico reescrito.

## Revisão posterior de nove itens de higiene

Após o lote físico e a publicação da interface na origem `543777a`, a operação `general-review-caf38ecc21dc940b` revisou explicitamente dois kits de seis sabonetes Palmolive e sete apresentações de preservativos Jontex/Olla. Os nove receberam carga `general`, `enabled=true`, `transportReviewed=true` e serviços `[1,2]` — PAC/SEDEX. A revisão preservou os pesos e medidas estimados, referência, proveniência e os demais campos do produto. Não alterou a classificação de medicamentos nem removeu restrições de outras cargas.

| Apresentação | Cadastros | Peso estimado | Dimensões propostas |
| --- | ---: | ---: | --- |
| Kit de seis sabonetes | 2 | 880 g | 24 × 15 × 10 cm |
| Preservativos, três unidades | 3 | 130 g | 16 × 11 × 6 cm |
| Preservativos, seis unidades | 4 | 150 g | 16 × 11 × 6 cm |

O executor reutilizou o batch completo `reviewEstimatedShippingBatch`, com lock de catálogo, ADMIN ativo, configuração de produção, identidade, revisão, plano fixado, CAS, transação e auditoria. O bundle foi reproduzido e revisado independentemente; 15 grupos de checks offline, 27 testes da rotina faseada e três do launcher passaram. A QA real em containers temporários isolados confirmou cinco cenários: dry sem gravação, aplicação de nove perfis/nove auditorias, recusa de repetição, recusa de plano alterado e rollback completo após falha na quinta auditoria. Os dois containers foram removidos, com identidades verificadas.

A aplicação de produção teve backup privado novo, intenção exclusiva e um único despacho. Os bytes reais recebidos foram conferidos localmente: nove perfis e nove auditorias, total de **516 habilitados entre 3.070 ativos**, seis Avise-me e **zero ativos sem peso, comprimento, largura ou altura preenchidos**. Produtos externos ao lote, demais campos dos nove, auditorias anteriores, outras tabelas observadas e 35 migrations foram preservados dentro desse contrato. Não se declara igualdade global do banco.

O fechamento por CAS foi observado com metadata6 e 23 descritores Compose, `completed_released`, grant consumido e canônico `2ead30b3df361fde95f300dd5f85e66777d8f01e7ffaef9251987ecfb61e1a6c`. O backup tem 3.609.819 bytes, SHA-256 `ab5e2955466199d7b179b79a6475d1bd91ac6ccec38c05d5d9bdefea503f898e`; formato, índice e hashes foram conferidos, sem teste de restauração. Relatório local: `46c3e01ebffbd775f62fc5ded2154c0e72bda5394f4d16ca2790599db12edbb9`, mantido fora do Git.

Uma falha local de confirmação do canal vazio da captura inicial foi preservada e resolvida por conferência de ACL e bytes em um novo journal. Não houve repetição do transporte da captura, do apply ou de qualquer operação anterior.

A conferência pública posterior consultou o kit de R$ 15,95 nos CEPs 01001-000, 40010-000, 69005-010, 90010-000 e 70050-000. Estimativa e cotação do checkout retornaram HTTP 200, PAC/SEDEX e benefícios iguais; a página de checkout também respondeu. Para essa composição, São Paulo mostrou meta estimada de R$ 290,00 e faltante de R$ 274,05; Salvador, R$ 890,00 e R$ 874,05. São valores daquele momento para esse pacote, não uma tabela fixa por estado. SEDEX permaneceu como alternativa paga, sem meta de gratuidade nessa resposta. Um preservativo recém-liberado também passou na consulta de São Paulo. Nenhum pedido, pagamento ou etiqueta foi criado.

## Rotas

PAC e SEDEX em Ivaté são a base para carga aceita, sempre conforme CEP e pacote. [As regras nacionais dos Correios](https://www.correios.com.br/enviar/proibicoes-e-restricoes) contemplam medicamentos sem controle especial para clientes com ou sem contrato. Essa alternativa de postagem direta não comprova o uso da etiqueta ou tarifa do Melhor Envio para a mesma carga. A API oficial de Preço tem acesso contratual.

O [guia do Melhor Envio](https://centraldeajuda.melhorenvio.com.br/hc/pt-br/articles/31220391789332-Guia-de-produtos-que-podem-ou-n%C3%A3o-ser-enviados-pelo-Melhor-Envio) conserva condições específicas para medicamentos, líquidos, perfumes, aerossóis e baterias. Foi enviada consulta complementar no ticket técnico já autorizado pelo lojista, sem contratar, pagar ou emitir etiqueta. A definição dessa rota continua pendente de resposta operacional.

O fluxo conservador `estimated-review.ts` exige carga com resultado `allowed`; cargas corretamente classificadas como `liquid` retornam `conditional` na matriz e ainda não são liberadas por esse fluxo. O contrato não registra cumprimento de aceite condicional, FDS ou homologação. A classificação não pode ser substituída por `general` para contornar essa pendência. Medicamentos também permanecem fora dessa revisão conservadora.

As [regras de embarque dos Correios pelo Melhor Envio](https://centraldeajuda.melhorenvio.com.br/hc/pt-br/articles/31220449136660-Como-funcionam-os-Correios-pelo-Melhor-Envio-Regras-de-embarque), consultadas em 06/11/2026, limitam PAC/SEDEX a 30 kg por pacote, 100 cm por lado e soma dos lados de 200 cm, com mínimo de 13 × 8 × 1 cm. As sete caixas de planejamento usadas pelo modelo atendem à geometria geral e nenhuma supera 70 cm em um lado. Peso bruto, conteúdo, CEP, valor declarado e o pacote composto final continuam sujeitos à validação do envio real.
