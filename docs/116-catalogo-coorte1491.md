# Coorte de pesquisa 1491 — publicações verificadas

Na primeira etapa, em 27/10/2026, foram incluídos **2 produtos novos**, com **2 fotos reais** e **4 auditorias**, dentro da coorte de pesquisa de 1.491 candidatos. As etapas técnicas continuam limitadas a 50 itens; a coorte não foi apresentada como integralmente publicada.

| EAN | Produto |
| --- | --- |
| 07896004713366 | Acetilcisteína EMS 40 mg/mL, xarope adulto 120 mL |
| 07896112127338 | Cloridrato de ambroxol Teuto 15 mg/5 mL, xarope pediátrico 120 mL |

Ambos foram classificados documentalmente como genéricos isentos de prescrição. A descrição de ambroxol preserva a exigência de prescrição para menores de dois anos. Os cadastros recebem cashback de 1%, preço promocional nulo e WimiCoins desabilitado. Não foi inventado preço anterior para anunciar desconto. As regras existentes de Pix permanecem aplicáveis.

## Verificação e operação

- Pesquisa das quatro fontes documentada; a oferta elegível selecionada veio da ANB. Quantidade exata da distribuidora não foi fabricada. Os cadastros usam disponibilidade de distribuidora com cota interna limitada.
- Identidade, apresentação, bula, teto conservador CMED e fotos foram revisados. A revisão não foi atribuída a um clique humano nem apresentada como consulta transacional individual de registro Anvisa.
- Os 485 testes de segurança e 111 de fornecedores passaram na execução final. As auditorias de produção e completa mantiveram um alerta moderado em `fast-uri`, com zero alto/crítico.
- QA PostgreSQL isolado criou e conferiu os dois produtos, duas fotos e quatro auditorias, incluindo cashback de 1% e `promotionalPrice:null` no modelo real.
- Antes do sucesso, um preflight recusou a versão APP anterior, e uma QA recusou o campo inexistente `Product.originalPrice`. A tentativa foi preservada, com zero dos dois EANs cadastrados nesse banco. O importador foi corrigido e confrontado com os campos reais de Product antes da nova QA.
- OPS imutável `cb2b395` conservou seu mapa de 1.002 arquivos e a fundação histórica, sem renovar datas ou afirmar um novo build completo do APP. A compatibilidade com APP `2bfea326` foi limitada aos 14 arquivos de logística revisados e à imagem observada. A nova coluna logística é nullable; o antigo rowhash do OPS não foi apresentado como cobertura dessa coluna adicional.
- ADMIN ativo, deduplicação incluindo registros inativos/excluídos, predecessores físicos, mutex/CAS, concessão exclusiva, backup, baseline, simulação com duas ações CREATE, aplicação única e conferência pública foram comprovados. Produtos anteriores e as oito tabelas protegidas foram preservados.
- As duas páginas e as duas imagens responderam HTTP 200 com os hashes esperados. A janela `chat5-mip2-stage01-v1-20261027-155048` terminou `completed_released`, sem concessão ativa. Os dois bancos QA próprios foram removidos após conferência de identidade; registros das tentativas e backups foram mantidos.

Esta frente fez inclusão de catálogo e documentação, sem implantar aplicação, executar migração produtiva, comprar de distribuidora ou alterar pedidos, pagamentos e carteiras.

## Segunda etapa: sete inclusões adicionais

Em 27/10/2026, a etapa `chat5-mip7-stage02-v1-20261027` acrescentou mais **7 produtos**, com **7 fotos reais** e **14 auditorias**. A coorte passou a **9 inclusões comprovadas**.

| EAN | Produto |
| --- | --- |
| 07896004715285 | Acetilcisteína Germed 20 mg/mL, xarope pediátrico 120 mL |
| 07891317025083 | Acetilcisteína Eurofarma 20 mg/mL, xarope pediátrico 120 mL |
| 07891317011154 | Acetilcisteína Eurofarma 40 mg/mL, xarope adulto 120 mL |
| 07896004711287 | Maleato de dexclorfeniramina EMS 2 mg, 20 comprimidos |
| 07894916143400 | Acetilcisteína Legrand 20 mg/mL, xarope pediátrico 120 mL |
| 07894916997034 | Mucos Expec acetilcisteína 20 mg/mL, xarope pediátrico 120 mL |
| 07894916996938 | Mucos Expec acetilcisteína 40 mg/mL, xarope adulto 120 mL |

São cinco genéricos e dois similares, na categoria única Medicamentos. O nome Mucos Expec permanece no produto; Legrand identifica o fabricante no campo de marca. As ofertas da ANB já incluem ST no custo final. O markup de 50% foi confrontado com o menor teto positivo das 26 colunas CMED, sem presumir uma alíquota fiscal do Paraná. A alocação de cinco unidades é uma cota interna; a origem informa apenas limite inferior de cem unidades, sem estoque exato. Cashback de 1%, preço promocional nulo e WimiCoins desabilitado foram verificados no QA e na aplicação.

Os sete originais PNG foram preservados e convertidos pelo publicador para WebP. Três fotos vieram do padrão público de nome EAN do CDN da distribuidora, com identidade e embalagem corroboradas. Sua origem não foi descrita como uma presença na listagem atual da Profarma, nem como leitura do código de barras nos pixels.

A revisão independente dos dados e do runtime passou. O primeiro bootstrap recusou um metadado de classificação ainda marcado PENDING antes de executar segurança ou criar QA. A revisão R2 corrigiu seis JSONs de controle, preservando candidatos, imagens e os 27 executáveis. A cópia de um relatório também teve sua codificação corrigida e os bytes confrontados com o original. Os arquivos das tentativas foram preservados; nenhuma dessas correções foi apresentada como publicação.

A execução final passou por 485 testes de segurança e 111 de fornecedores, QA PostgreSQL com sete produtos/sete fotos/14 auditorias, backup, simulação de sete CREATEs, concessão exclusiva e aplicação única. Auditorias completa e de produção conservaram somente o alerta moderado conhecido em fast-uri, sem high/critical. A compatibilidade foi limitada ao APP `5e6014f`, sua imagem observada e quatro arquivos de UI revisados; não foi alegado novo build completo do APP por esta frente.

As sete páginas e suas imagens responderam HTTP 200 com os hashes esperados. Além das oito tabelas protegidas pelo engine, uma comparação física adicional preservou os **2.741 produtos anteriores em todas as colunas**, incluindo logisticsEvidence. A janela `chat5-mip7-stage02-v1-20261027-180749` terminou completed_released, sem concessão ativa. O banco QA próprio foi removido após comprovar identidade e encerramento. Não houve migração produtiva, implantação de APP, compra de distribuidora ou alteração de pedidos, pagamentos e carteiras por esta etapa.

## Continuidade

A coorte mantém seus 1.491 candidatos e os arquivos originais de pesquisa. **9 inclusões foram comprovadas; 1.482 candidatos continuam em conferência**, sem aprovação coletiva de preço, foto, estoque ou classificação. O histórico privado de publicação está em `outputs/catalogo-lotes200-2026-10-26/lotes1000-v1-20261027/publication-ledger-v1.json`. Os próximos candidatos dependem de conferência individual das quatro fontes, identidade, classificação, condição comercial e imagem; não foi exigida a presença de quatro ofertas positivas para cada produto.
