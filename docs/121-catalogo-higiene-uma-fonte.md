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

## Terceiro lote publicado em 28/10/2026

O pacote `fechamento-separados-v1-20261028` incluiu dez produtos e dez fotos às 20:17:49 UTC, com vinte auditorias. A verificação pública terminou às 20:18:04 UTC, e a janela `chat10-fechamento-separados-v1-20261028-201621` foi encerrada às 20:18:10 UTC. Os produtos anteriores e as nove tabelas protegidas foram preservados; a QA própria foi removida com zero conexões e sem FORCE. A retomada passou a somar 57 produtos, 57 fotos e 114 auditorias nos três lotes.

| EAN | Apresentação publicada |
| --- | --- |
| 7896222720528 | Jontex Neutro, gel lubrificante 50 g |
| 7500435150255 | Oral-B Extra Branco, kit com 12 tubos de 70 g, L12P10 |
| 7794640173660 | Corega Proteção da Gengiva 40 g |
| 7896009498282 | Corega Tabs Branqueador, 30 pastilhas |
| 7896009498305 | Corega Tabs 3 Minutos, 30 pastilhas |
| 7896009498312 | Corega em pó, kit com 3 frascos de 22 g |
| 7500435241656 | Old Spice Refrescante em gel 80 g |
| 7500435135030 | Old Spice Refrescante aerossol 90 g |
| 7500435135061 | Old Spice VIP aerossol 90 g |
| 7506339390216 | Old Spice Amadeirado em barra 50 g |

O conflito anterior do Jontex Neutro foi resolvido por evidência de identidade e foto da apresentação exata, com distinção entre fabricante sem EAN visível e fonte comercial com EAN. O cadastro não reproduz a descrição conflitante de silicone. O kit Oral-B contém doze tubos, incluindo os dois gratuitos; os preços dos kits não foram divididos por unidades. Foram preservados os dados brutos das descrições divergentes.

O lote fixou APP637 e as releases físicas relevantes own37 e stage05 do chat5, com nove produtos. Passaram revisão independente, schemas reais, 491 testes de segurança, 111 de fornecedores, 55 controles de conflito e a QA dos dez produtos/fotos. As auditorias atuais de produção e completa registraram três alertas baixos e um moderado, sem high/critical. As imagens publicadas foram verificadas por hash, dimensões e tamanho; todas ficaram abaixo de 100 KB. As fontes originais permanecem preservadas; a conversão WebP da publicação não é declarada como idêntica em pixels.

Provas SHA-256: produção `7d3a7115e0392cacb49c5375c1df02025ed62d803d90ca57eea82ff3074635e4`; público `79f5ca767c00d38a097819e7dfbaac0917b6257c631fa346d7e6e83f4f30afeb`; release `2cd08940f847441b7a79f3cec731072d7321f8ad2c2610cb23e796304d49d585`; limpeza `d776383a3fd2beba495e0baec434c513725433d7a9d468994acd23277ca349c6`. O estado final ficou `completed_released`, `productionGrant:false` e sem apply incerto. O app permaneceu saudável, sem reinício.

## Tentativa dos seis e subconjunto de cinco

O pacote `fechamento-seis-v1-20261028` passou na revisão estática, nos schemas reais, nos guards de domínio, na QA isolada de seis produtos/fotos, nas verificações atuais de segurança/fornecedores e nos 55 controles. A aplicação em produção foi interrompida em 28/10/2026 por `Product_slug_key`: o Colgate Tripla Ação Menta Original 180 g solicitado com EAN `7891024037973` usa o mesmo nome e slug de um produto ativo com EAN `7891024132371`. O item ficou em HOLD para esclarecer essa diferença; não se renomeou a página existente nem se repetiu o apply.

O importador envolve todos os produtos em uma única transação. A reconciliação real, em transação somente leitura às 21:19:03 UTC, confirmou igualdade integral com o baseline: produtos e todas as suas colunas, ofertas, imagens, auditorias e as nove tabelas protegidas permaneceram idênticos. Foram criados zero produtos e zero fotos nessa tentativa. Prova SHA-256 `aecf9cdb14585f33de2afa613a27e0ee80d8972c94fccb8b00799880c21025b4`.

O protocolo de sucesso não oferece release vazio. Por isso, a concessão da janela `chat10-fechamento-seis-v1-20261028-210847` foi encerrada por recuperação separada de metadados, revisada independentemente, após 15 testes negativos e dry-run real com zero transações ativas. Mutex/CAS, proprietário, fingerprints, snapshots, delta permitido e provas físicas foram conferidos. Às 21:38:12 UTC foram restaurados exatamente os bytes do estado pré-grant `1bb828cbe73bc29f28e1fdfcda348a0c76e7353792007eaf41c7539de8152f42`, com a janela anterior dos dez encerrada, sem grants ou apply incerto. Não houve rollback de banco. Receipt SHA-256 `4132e275779806ca6b81095d8afc3d9b293a65a148e621955c36ab193e4eaf01`. O marcador e as provas da tentativa foram preservados; não se fabricaram provas positivas de produção/publicação dos seis. A QA sintética dos seis foi removida às 21:49:49 UTC, com proprietário validado, zero conexões e sem FORCE.

Os cinco restantes foram separados em `fechamento-cinco-v1-20261028`: quatro apresentações Jontex e Gillette Sensitive 150 g. Passaram 11 guards diretos, sete contratos locais, schemas reais e revisão estática independente. O schema real dos cinco tem SHA-256 `bb245ad72b4e45596587fee264b40dcdae9319151a6175ea02c998d0e61e6b24`; o freeze final v2 tem `a57729fa38da91ab3c4a897f65b517c0cbc4bc69fd4eeb8dc94c9fb734cf7988`. As ofertas originais começam a vencer às 21:49:57 UTC; precisam de observação comercial atual antes de nova concessão. Nenhuma QA ou inclusão produtiva dos cinco foi declarada. O total verificado desta retomada permanece 57 produtos, 57 fotos e 114 auditorias.

Para os próximos lotes, executar todos os guards de domínio nos documentos reais antes da revisão/freeze e conferir duplicidade por GTIN e slug/apresentação. A cópia de um documento factual não garante o formato exigido pelo runtime. Preservar fontes originais ao normalizar metadados; não mudar datas comerciais por cópia.

## Nova lista de 17 famílias autorizada pelo lojista

Em 28/10/2026, o lojista ampliou expressamente o escopo para meclozina, cinarizina, cimetidina, oxetacaína com hidróxidos de alumínio/magnésio, sais de reidratação oral, aceponato de metilprednisolona tópico, fludroxicortida, oxiconazol, calcipotriol com betametasona, betametasona com ácido salicílico, nistatina com óxido de zinco, valerato de betametasona com hialuronidase, diacereína, sulfatos de glicosamina/condroitina, naratriptana, carbômer oftálmico e acetazolamida. A pesquisa cobre as marcas e apresentações das famílias exatas; não se ampliou para associações próximas por inferência.

A planilha oficial vinculada pela página da Anvisa foi recuperada com sucesso, edição identificada como 09/10/2026, 12.735.543 bytes, SHA-256 `3c94fa640c4fcdb6fb3cbb6a02e4a86da0707c90ade42608132d5033e9485b99`. A matriz contém 176 apresentações-alvo e 185 GTIN14 únicos com dígitos válidos. Os tipos literais CMED são Novo: 51; Genérico: 49; Similar: 50; Específico: 4; Biológico: 22. Novo não foi convertido automaticamente em ético ou referência.

Foram separados um registro relacionado de carbômer com sorbitol e uma linha em quarentena por ácido acetilsalicílico versus ácido salicílico. Divergências de substância, concentração/unidade e registro permanecem identificadas, incluindo Daivobet, Advantan e oxiconazol. A referência oficial e o fabricante foram usados para conferir associações; não se corrigiram campos conflitantes da CMED silenciosamente. Os PDFs de referência têm divergência entre rótulo do portal e data interna, ambas preservadas. A tentativa de DCB consolidada retornou HTTP403.

A QA documental reconferiu 178 registros literalmente no XLSX, consistência do CSV, hashes e dígitos verificadores. Matriz SHA-256 `2168fd8c653f3c0359c32b537075c0c751c2d5523add4d1703c587c7b06f3999`. Os arquivos completos ficam no diretório privado `nova-lista17-20261028-v1`. Às 21:57:34 UTC, o cruzamento real de todos os 185 GTINs com Product, inclusive excluídos e inventário físico, encontrou zero correspondências exatas e zero ambiguidades. A consulta terminou com código0, stderr vazio e os dois modos de transação somente leitura confirmados. Prova final SHA-256 `8259674c86848fabaca2c37c7fa8b6af099ba63e7a88ffb8b30b0df0b2e8ef34`. Ausência por GTIN não exclui cadastro com código incorreto ou nome semelhante.

Esses números são documentais: ANB, Profarma, GAM, DM, receita, foto exata, disponibilidade e apresentação ainda precisam de confirmação antes de incluir medicamentos. O Computer Use encerrou o controle do Chrome nesta execução porque não conseguiu confirmar a URL no Windows com segurança; não houve contorno dessa interrupção. Nenhum medicamento dessa nova lista foi publicado.

Fontes primárias: [CMED/Anvisa](https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos), [lista de medicamentos de referência](https://www.gov.br/anvisa/pt-br/setorregulado/regularizacao/medicamentos/medicamentos-de-referencia/lista-de-medicamentos-de-referencia), [produtos LEO](https://leo-pharma.com.br/produtos/).

O chat 12 já existe e permanece aguardando comando humano. A pesquisa e os arquivos de continuidade desta retomada não autorizam iniciá-lo.

## Cinco apresentações publicadas em 29/10/2026

O pacote `fechamento-cinco-v3-20261029` publicou cinco produtos e cinco fotos às 06:34:42 UTC, com dez auditorias. Foram incluídos Jontex Retardante com seis unidades (`7891035002625`), Sensação Invisível com duas (`7891035991110`) e quatro unidades (`7891035991127`), Extra Lubrificado com seis unidades (`7896222720221`) e espuma Gillette Prestobarba Sensitive 150 g (`7702018951185`). As cotações finais com impostos foram realmente renovadas na GAM, sem reaplicar desconto ou dividir embalagens; a política de uma fonte completa permanece restrita à higiene/perfumaria.

As cinco páginas e imagens responderam HTTP200 na conferência de 06:34:57 UTC, com hashes correspondentes. Os WebP finais têm entre 7.762 e 25.946 bytes, todos abaixo de 100.000 bytes. Os originais e suas datas/fontes permanecem preservados; otimização não é declarada idêntica em pixels. Os produtos anteriores e as nove tabelas protegidas foram preservados. A retomada própria passa a somar **62 produtos, 62 fotos e 124 auditorias**; publicações dos outros chats não entram nessa contagem. O catálogo global tinha 2.904 produtos ativos na prova deste lote.

A primeira tentativa desta execução, `fechamento-cinco-v2-20261029`, passou na QA de cinco produtos/fotos, mas seu grant foi recusado porque o chat5 já havia adquirido a janela dos 31 medicamentos stage08. A recusa ocorreu antes de conceder uma janela própria, backup produtivo ou apply. Foram criados zero produtos e zero fotos em produção pela tentativa V2; seus marcadores foram preservados. A QA própria foi removida com owner/comment conferidos, zero conexões e sem FORCE. Receipt da recusa SHA-256 `39a29a6ab53a70338811a27e4bf6252c3d4daaff565c360ee45d0e4fe0095b31`; limpeza `97d5dbe4bcdf3ca08c158a7ee3fe1da038c897151a2edccb14d5f0a5b9bf90b9`.

A V3 vinculou o predecessor stage08 efetivamente encerrado e o APP ca54, com código/importadores/schema preservados. A conferência física passou a reconhecer um perfil institucional explicitamente declarado e pinado por identidade, EAN, classificação/receita, assets e recibos. O padrão de fotos reais mantém suas exigências. Em ambos os perfis, as páginas públicas devem corresponder unicamente e por completo aos EANs do escopo. Isso confere o lote anterior; os cinco novos itens de higiene continuam com fotos reais.

Passaram 67 testes de contratos/perfis, onze verificações de metadados, revisão independente real, schemas reais do tools pinado e uma nova QA V3 de cinco produtos/fotos e dez auditorias. Os 55 controles de predecessor/fila foram executados com o fingerprint V3. Segurança, fornecedores e auditorias foram verificados novamente; produção e auditoria completa registraram três alertas baixos e um moderado, sem high/critical. A autorização humana já existente foi representada integralmente no pacote, preservando a família histórica dos mesmos cinco EANs; QA, backup/dry, mutex/CAS, grant exclusivo e provas continuaram obrigatórios.

Janela `chat10-fechamento-cinco-v3-20261029-063314`; fingerprint `0e51b823d11c6b3054e15f3a9f952c3db7acc8b2cc9e6629a8cf491fa93e7197`. Release às 06:35:03 UTC, `completed_released`, sem grant ou apply incerto, canonical SHA-256 `ced6029867c9e7d092da1262ddd84293a9dcec12ca41f2ecef592ecf6a638443`. A QA V3 foi removida; consulta posterior confirmou zero bancos com seu nome, sem FORCE e sem remover o banco produtivo.

Provas SHA-256: produção `bb911386fb68829a0aeae652cf06aa0b84b8e74c3ca1dd70e7240ed71bdd9765`; público `e2e17ec2c13e723abaf903e7d1ce629083df1212a2780d67e9dfda5c13a7bf0d`; release `7253b5abc3dc2b72babee14097a44ed3b7924d101ecbf1fa8fe4fa610868f628`; limpeza `c898bea813b20625519ed4cc1e120dd20cae777dea1ce3e783de2583de0fb1f7`. Dez provas selecionadas foram copiadas para a continuidade privada com hashes reconferidos; nenhum dump foi baixado. Não houve reinício ou migração produtiva.

A pesquisa das 17 famílias continua separada da publicação. Cinco apresentações Meclin tiveram EAN/registro cruzados com a CMED e consultas ANB/GAM/DM salvas; a Profarma permanece aguardando login humano. A descrição de cápsulas do Meclin Move na GAM foi preservada como divergência: a [bula oficial do fabricante](https://produtos.apsen.com.br/meclin-move) identifica comprimidos. Ainda faltam a fonte Profarma, fotos e revisão final; nenhum medicamento dessa nova lista foi incluído nesta execução. O Colgate de EAN conflitante continua retido. O chat12 permanece aguardando comando humano.

## Fechamento dos dois Meclin JET — 29/10/2026

A pendência da Profarma registrada acima foi resolvida. Duas apresentações Meclin JET de dez comprimidos mastigáveis, 25 mg e 50 mg, foram publicadas às 15:45:54 UTC e conferidas publicamente às 15:46:09 UTC. A pesquisa manteve a regra de quatro distribuidoras para medicamentos; a regra de uma fonte completa continua restrita à higiene e perfumaria. Classificação, preços e três apresentações Meclin ainda retidas estão detalhados no [registro de medicamentos](111-expansao-medicamentos-e-politica-de-precos.md).

Foram acrescentados dois produtos e duas auditorias, usando a ilustração institucional existente para receita comum, sem novas fotos de embalagem ou galeria. A retomada própria soma **64 produtos, 62 fotos reais e 126 auditorias**; as publicações dos outros chats permanecem fora desta contagem. A prova produtiva registrou 2.909 produtos ativos no catálogo global, com os dados anteriores e as nove tabelas protegidas preservados.

A primeira QA parou antes da migração por falta de `qaOwner`; a base ainda vazia foi conferida, removida sem FORCE e seus artefatos preservados. A correção e a atualização dos vínculos para a publicação legítima Trezete2 do chat 5 e a versão do site ativa foram revisadas antes de uma QA nova. Passaram 62 contratos locais, 491 testes de segurança, 111 de fornecedores e 55 controles reais de predecessores. Permanecem três alertas baixos e um moderado na auditoria, sem altos ou críticos.

A aplicação foi única, com backup, baseline e dry-run. A janela `chat10-meclin-jet2-integrado-v1-20261029-154429` terminou `completed_released`, sem concessão ou aplicação incerta; a QA própria já foi removida com zero conexões e sem FORCE. O fingerprint final é `032f27e7a2e30ddd5089aa9f158268126fb287a06ca592c6d806ecec4dd1a723`, e o hash do canonical ao liberar é `a28b25e3845273b3eddb50e90c8068f9dd90fd98949fd6fb6fff5bb607cca13b`. As pendências não foram apresentadas como publicadas e o chat 12 não foi iniciado por esta frente.
