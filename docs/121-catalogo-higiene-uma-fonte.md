# Higiene e perfumaria com uma fonte confirmada

## Autorização e escopo

Em 28/10/2026, o lojista escolheu, nesta frente, incluir higiene e perfumaria com uma fonte completa confirmada e comparar ANB, Profarma, GAM e DM depois. A comparação pendente continua registrada; não se afirma que a oferta escolhida seja a menor entre as quatro distribuidoras.

A regra exige EAN, apresentação e unidade de venda exatos, custo final com tributos, disponibilidade atual, foto correspondente e deduplicação. Estoque numérico desconhecido permanece nulo. Uma alocação administrativa não representa saldo informado pelo fornecedor. Descontos já incorporados ao preço final não são reaplicados.

Na GAM, estes lotes usam a coluna **Líquido + Imposto**. A coluna **Preço** não é presumida como valor líquido. A decomposição de líquido e imposto genérico pode permanecer nula quando não foi observada; imposto genérico não é registrado automaticamente como ST.

Esta autorização não altera os requisitos de classificação, receita, CMED ou margem dos medicamentos. Santa Cruz permanece suspensa nesta coleta.

## Lote publicado em 28/10/2026

Pacote privado: `higiene21-v1-20261028`. O nome identifica a coorte inicial de pesquisa; o lote aplicado contém dez produtos.

| EAN | Apresentação publicada |
| --- | --- |
| 7500435140928 | Gillette Hydra Gel Aloe 45 g |
| 7500435219334 | Gillette Mach3 Carbono, 1 aparelho |
| 7702018001071 | Gillette Mach3, 1 aparelho |
| 7702018037803 | Gillette Mach3 Sensitive, 1 aparelho |
| 7702018913664 | Gillette Cool Wave gel 82 g |
| 7500435135047 | Old Spice Amadeirado aerossol 90 g |
| 7500435187886 | Head & Shoulders Men Old Spice 400 ml |
| 7500435249478 | Old Spice VIP aerossol 250 ml |
| 7500435249508 | Old Spice Aventura aerossol 250 ml |
| 7500435249515 | Old Spice Amadeirado aerossol 250 ml |

A aplicação terminou às 15:32:35 UTC, com dez produtos, dez fotos e vinte registros de auditoria. A verificação pública terminou às 15:32:51 UTC. Foram preservados os produtos anteriores, todas as suas colunas e as nove tabelas protegidas.

Janela encerrada: `chat10-higiene21-v1-20261028-153109`, com `productionGrant:false` e `uncertainApply:false`. A QA sintética própria foi removida após a release, sem FORCE e com zero conexões ativas.

Provas SHA-256:

- Produção: `00b194df8caabc5638680f7561bdb78a20e0cf732782dc6729afea964ca07043`.
- Público: `aa684a062f7474e8b12e4cf0d0c1bbc4ec55aecb40c777869179723dddb7463b`.
- Release: `e7d44a102380219ba793b0d18215908ab148e64611f04636c9e00a6f6507332d`.
- Limpeza da QA: `fdba4b40c9d8043eb55365bfe09ef3a4f8ff50d9dc04a0c3bf2c3046567fdf4f`.

Os documentos comerciais, capturas, imagens e backups ficam fora do Git, no diretório privado da operação.

## Validação e redução de repetição

O runtime usa o importador create-only já revisado, OPS318 e tools6aba. O primeiro lote fixou o APP136; o segundo fixou literalmente APP4ca, cujo avanço compreendia somente README e docs/123. Foram reutilizadas as verificações de fundação do mesmo código, conservando seus horários originais. As verificações atuais passaram: 491 testes de segurança e 111 testes de fornecedores, sem falhas. A auditoria de produção não apontou high/critical; a auditoria completa preserva quatro alertas baixos e um moderado.

A revisão independente aprovou a remoção somente das revalidações remotas dos antecessores históricos RX7/coorte. Permanecem as duas releases relevantes, seus arquivos físicos e hashes, 25 controles negativos por predecessor e cinco de fila. Continuam obrigatórios revisão factual, schemas reais, QA própria, mutex/CAS, janela exclusiva, backup, dry-run, aplicação única, preservação integral, prova pública e limpeza. Não se repete apply com resultado incerto.

## Continuidade

O segundo lote foi ampliado para 37 itens: os onze iniciais (sete cremes dentais, três apresentações de algodão e um sabonete Phebo), sete apresentações Gillette e dezenove Jontex. Foi aplicado uma única vez às 16:58:15 UTC, com 37 produtos, 37 fotos e 74 auditorias. A verificação pública terminou às 16:58:32 UTC. Os dados anteriores foram preservados. Esta retomada soma 47 produtos, 47 fotos e 94 auditorias nos dois lotes, sem incluir publicações de outras frentes. O gel EAN 7896222720528 permanece excluído por conflito de composição.

Pacote privado encerrado: `higiene11-v2-20261028`; o nome histórico não representa sua contagem. Janela `chat10-higiene11-v2-20261028-165645`, `completed_released`, sem grant ou apply incerto. A QA própria foi removida com zero conexões e sem FORCE. Provas SHA-256: produção `b557c753a039e64f7dd48f9aeb6f3564adfd50c712fdfcbc93d5da6c994e655a`; público `4c736c33f6d0729d858a97e57e2f44d0d39c529fae6f19d8e3c253103c632790`; release `af1480ef1edf38b414d92fbc69cf1296fd2a7f7798294261d4aaa8a1944872c0`; limpeza `07a119a0f443c5dcdba4803be667d983b087ee321727decc7f33a997a28a41b0`.

O segundo lote verificou as releases físicas stage04 do chat5 (sete produtos) e own10 (dez), com 55 controles negativos. O contrato também reconhece explicitamente uma release própria como janela corrente, sempre por identidade, fingerprint, proprietário e conteúdo exatos; isso evita depender de uma publicação da outra frente para a próxima inclusão. Papel desconhecido ou identidade incompatível é recusado. A revisão do delta passou com 44 testes Node, oito Python e seis regressões específicas. A revisão independente não substituiu QA ou grant.

As novas imagens do lojista ampliam a pesquisa para todas as marcas e classes comerciais dos princípios ativos indicados, discriminando dosagem, forma, liberação, quantidade e associações. Marcas de fantasia não são classificadas automaticamente como éticas. Apresentações cortadas nas imagens serão confirmadas nas fontes.

A matriz das treze marcas e o inventário de 21 famílias foram produzidos a partir de fontes oficiais e da CMED de 09/10/2026, com o SHA-256 da edição preservado. Há 1.398 apresentações-alvo documentais: 701 Genérico, 535 Similar e 162 Novo. O tipo Novo é conservado literalmente e não substitui a classificação comercial formal. Outras 1.035 linhas de associações ficaram identificadas separadamente.

O cruzamento somente leitura de 28/10/2026 às 16:19 UTC consultou 1.438 identificadores e encontrou 95 produtos correspondentes no catálogo. Por apresentação-alvo: 95 têm correspondência de GTIN que ainda exige conferir a apresentação; 1.273 não têm correspondência de GTIN; 26 permanecem retidas por conflitos documentais e quatro não possuem GTIN válido na fonte. Esses grupos não comprovam disponibilidade, preço, foto ou prontidão de publicação. Os 16 conflitos de GTIN do inventário completo não foram resolvidos por seleção automática.

A tentativa de obter os bytes do novo link CMED apontado na página oficial devolveu uma página de manutenção, não uma planilha válida. A referência de 09/10/2026 usada na pesquisa permanece identificada como histórica; a tentativa não renovou a edição nem aprovou preços de medicamentos.

O chat 12 já existe e permanece aguardando comando humano. A pesquisa e os arquivos de continuidade desta retomada não autorizam iniciá-lo.
