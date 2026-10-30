# 129 — Hipóteses por tipo de embalagem, somente para perfis nulos

## Autorização e escopo — 29/10/2026

O lojista pediu continuidade dos 611 produtos anteriormente sem perfil, agrupando por embalagem e usando estimativas com margem de segurança. O snapshot renovado às 11h29 UTC encontrou **647 ativos sem perfil**, pois houve 36 inclusões posteriores; 2.904 produtos estavam ativos. O lote considera o conjunto atual e não reaplica rodadas encerradas.

Foi criada uma via separada `owner-packaging-hypothesis-v1`, sem relaxar v4, cenários de medicamentos, fontes documentais ou aprovação de transporte. `apply-product-packaging-hypotheses.ts` opera em modo **`NULL_ONLY`**: qualquer perfil não nulo, inclusive JSON parcial, manual, protegido ou fora de schema, é preservado antes dos estimadores. Não refina pesos nem preenche perfis anteriores.

## Manifesto e identidade

O manifesto estrito contém grupos com identificador, rótulo, recipiente presumido, membros explícitos por GTIN válido e nome exato, lados hipotéticos ordenados, folga, caixa externa, bruto completo estipulado, margem de peso, carga e justificativas. Há limites de 200 grupos, 500 membros por grupo e 5 MB; GTINs e IDs não podem se repetir. O input separado permite até 5.000 GTINs únicos e 1 MB. Não há descoberta automática de novos membros durante a escrita.

O nome esperado preserva os bytes do catálogo; renomeação, revisão ou alteração do conjunto de ativos invalida o plano. O hash inclui todos os ativos, mesmo os sem GTIN válido, o manifesto integral, os planos e o modo `NULL_ONLY`. Ator ADMIN ativo, lock de catálogo, CAS, auditoria e transação de 180 segundos são obrigatórios. A aplicação exige o SHA-256 do dry-run revisado.

```text
node --import tsx scripts/apply-product-packaging-hypotheses.ts --input <GTINs.json> --hypotheses <hipoteses.json> --actor-id <ADMIN>
node --import tsx scripts/apply-product-packaging-hypotheses.ts --input <GTINs.json> --hypotheses <hipoteses.json> --actor-id <ADMIN> --apply --expect-plan <SHA-256>
```

## Peso e geometria

O agrupamento separa cartuchos, frascos, bisnagas, pacotes flexíveis, blisters, dispositivos, kits e possíveis aerossóis. Referências próprias válidas e a política individual v4 mantêm prioridade quando elegíveis. Se não há conteúdo inequívoco, o bruto operacional é explicitamente estipulado para o grupo, com `weightBasis:OWNER_PACKAGE_GROSS_HYPOTHESIS`; conteúdo, unidade e cálculo v4 permanecem nulos. Não se fabrica quantidade física, peso líquido, densidade ou conversão de mg/mcg de dose em massa de comprimido.

A hipótese bruta já inclui recipiente comercial e pacote externo. Não somar novamente a reserva externa de 100 g. A margem configurável de 10–30% é aplicada **uma vez**, seguida de arredondamento em 10 g; esta rodada usa **20%**. A margem é uma escolha de preparação, sem garantia estatística ou de massa máxima real.

No modo padrão `OWNER_HYPOTHESIS`, os lados comerciais são hipóteses, com zero amostras geométricas. A folga inteira configurável de 1–3 cm é total por eixo e aplicada uma vez; esta rodada usa **3 cm**. Cada lado operacional deve ficar estritamente abaixo do lado correspondente da caixa. A caixa de **24 × 15 × 10 cm** é a única declarada pelo lojista. Caixas alternativas são `PLANNED_NOT_CONFIRMED`, com `largerBoxRequired:true`, sem afirmar que foram compradas, que estão disponíveis ou que o encaixe foi conferido. Geometria comercial, pacote planejado e receita calibrada continuam separados.

Material, fechamento, tara e medidas internas ficam nulos; `packingFitConfirmed:false` e `protectionCalibrated:false`. No modo padrão, a fonte geométrica é `OWNER_AUTHORIZED_HYPOTHESIS`, sem GTINs/amostras observados, e `geometryReference:null`. Não criar `Product.logisticsEvidence`, observações ou `PackagingRecipe` a partir dessas estipulações.

O modo explícito `OWN_DOCUMENTARY_REFERENCE` exige grupo com um único GTIN/nome e `geometryObservationId`. A observação deve estar ativa, sem conflito, do próprio GTIN, unidade comercial única, três lados válidos e base `labeled_axes` ou `carton_die`. Os lados em mm são convertidos para cm, ordenados e comparados exatamente aos lados declarados no manifesto; ausência ou divergência retorna pendência, sem fallback silencioso. O modo padrão continua deferindo geometrias próprias.

Nesse modo, `geometrySource:OWN_DOCUMENTARY_REFERENCE` e `geometryReference` preservam GTIN, identificador, hash, base original, lados originais em mm e lados ordenados em cm. `physicalMeasurementConfirmed:false` e zero amostras físicas impedem chamar a referência documental de medição atual. A base de cartonagem histórica permanece identificada; não comprova embalagem montada nem encaixe. Fontes de peso ficam separadas: **227 g do Nivea e 36 g do Nenfy classificados como `unspecified` não são promovidos a peso bruto**. O peso continua v4 elegível ou hipótese completa, com margem única.

## Riscos e bloqueios

Todo novo rascunho permanece `enabled:false`, `transportReviewed:false`, `measurementBasis:estimated`, `reference:null`, sem serviços aprovados. A carga do manifesto é preservada; medicamento recebe também `medication`. Carga desconhecida usa `unspecified`; não se atribui `general` por exclusão. Aerossol, líquido, perfume, dispositivo com bateria e possível inflamabilidade continuam sujeitos à aceitação e revisão próprias. Título “sem acetona” não comprova ausência de inflamabilidade; “jato seco” não comprova pressão. Não liberar serviços por presença de peso e medidas.

Controlados, antimicrobianos, Popular e receita exigida sem `ORDINARY` continuam pendentes antes de qualquer estimador, inclusive da rota documental. Referência inválida, identidade divergente ou conflito não é ignorado para forçar hipótese. Dimensões próprias ativas adiam o modo padrão; seu aproveitamento exige o modo documental explícito e as verificações acima.

Kits, acessórios e promoções exigem considerar a unidade comercial inteira: 60 + 30 comprimidos são 90; 24 comprimidos + quatro placebos são 28; L3P2 são três unidades. Modelos, idade e doses não são contagens. Símbolo “+” em marca/composição não cria kit sem um segundo conteúdo explícito. Contagem colada a código, como `COMPLET2UN`, não pode virar uma unidade por falha de fronteira textual.

## Prévia e pendências separadas

O gerador privado triou os 647 sem perfil: 646 membros foram distribuídos por **91 grupos explícitos** e um medicamento com receita ainda não classificada foi separado. A prévia final encontrou **642 propostas aplicáveis**, sendo **639 com geometria hipotética e três com geometria documental explícita**, e quatro membros deferidos por conflito. **285** propostas usam caixas alternativas ainda não confirmadas. A contagem é de preparação; não comprova aplicação produtiva.

Os cinco cadastros separados são:

| Situação | Produtos |
| --- | --- |
| Receita exigida sem classificação concluída | Imosec 2 mg 12 comprimidos |
| Referências com conflito de identidade | Clopidogrel 75 mg 30 comprimidos; Albendazol suspensão 10 ml; Beneum 300 mg 30 comprimidos; Colgate Plax Melancia 500 ml |

Nivea Leite + Tônico 200 ml, Nivea Aero Men Deep Original 150 ml e Nenfy 100 mg de ferro 30 comprimidos são os três grupos documentais individuais. As referências e flags são preservadas; não forçar aprovação ou apagá-las para diminuir a fila. A arte de cartucho (`carton_die`) não é tratada como medição física atual nem prova de dimensões externas montadas. Pendência de receita não é resolvida por estimativa logística.

## Verificação e operação

Passaram 230 testes de frete/importadores, 491 de segurança, ESLint completo e typecheck sem cache incremental. Auditorias completa e de produção registraram três alertas low e um moderate, zero high/critical, em `@react-email/render`, `deepmerge`, `fast-uri` e `html-to-text`; nenhuma dependência foi alterada.

QA em PostgreSQL 17 isolado passou 15 verificações: dry-run e repetição sem alterações em todas as tabelas, proteção de nove formas de perfil existente, cargas especiais e conteúdo desconhecido, ADMIN, hash, falha real na segunda auditoria e CAS, prova de escrita anterior à reversão por sequência não transacional, preservação comercial/evidências/receitas e modos documentais sem promover peso de base indefinida. Setecentos perfis sintéticos foram aplicados em uma única transação em 2.674 ms, dentro de 180 segundos. Recursos exclusivos de QA foram removidos.

A primeira execução dos novos casos documentais encontrou uma fixture que já era elegível à rota documental prioritária anterior; ela não exercitava a nova variante. Foi corrigida a apresentação sintética para representar conteúdo não identificado, como nos três casos reais. Não foi relaxada a prioridade nem alterado código produtivo para satisfazer o teste. O resultado final passou com os bloqueios preservados.

Antes de produção, exigir backup customizado/TOC/checksum, janela sem grant ou aplicação incerta, código e arquivos congelados, baseline coerente, dry-run integralmente igual à prévia e recibo exclusivo de preparação. Revalidar o recibo antes de criar o marcador atômico de início. Se houver início sem verificação, inspecionar somente de leitura; não repetir a escrita.

Artefatos privados: `outputs/pendentes-logistica-2026-10-29/`.

## Aplicação produtiva confirmada — 29/10/2026

O snapshot renovado às 12h07 UTC manteve 2.904 ativos e 647 perfis nulos. A revisão independente conferiu os grupos e os três modos documentais, executou 26 testes direcionados e revisou as guardas. Vinte e três regressões Python validaram hashes, revisão, backup, recibo, modo somente nulos, fontes documentais e a exigência estrita de janela encerrada, sem grant ou aplicação incerta. Não há aceite numérico de `0` como substituto dos booleanos `false`.

A preparação inicialmente interrompeu a operação, antes do recibo e de qualquer escrita, por divergência nas revisões. O diagnóstico somente de leitura mostrou diferença exata de três horas em 646/646 revisões: `Product.updatedAt` é um timestamp UTC sem informação de fuso no JSON SQL, enquanto a prévia local o interpretava como horário de São Paulo. Foi corrigida somente a normalização do auxiliar privado, com regressão RED/GREEN em São Paulo, UTC e Tóquio. Nenhum timestamp do banco ou módulo produtivo foi alterado.

A aprovação anterior foi arquivada integralmente. A prévia corrigida coincidiu com o dry-run em todos os campos dos 646 itens e com as revisões do baseline. A nova aprovação também congelou o script de retomada; backup, TOC, checksum, baseline e simulação originais foram preservados, sem nova execução de preparação ou exclusão de artefatos. O recibo foi criado somente após essa conferência integral. Aprovação final privada: `0eba9fc318ff381d5bc24547887db8b25ff553d7687b670ce4ea0662c77161c9`.

A aplicação única foi confirmada com **642 perfis novos e 642 auditorias**, modo `NULL_ONLY`, ADMIN ativo, lock, CAS e transação. Quatro entradas conflitantes permaneceram pendentes; o medicamento com receita não classificada estava fora da entrada. Não houve alteração de nenhum perfil anterior.

| Recipiente presumido para preparação | Produtos |
| --- | ---: |
| Cartuchos/caixas | 105 |
| Frascos | 128 |
| Pacotes flexíveis | 135 |
| Aerossóis ou recipientes com pressão a confirmar | 129 |
| Blisters/acessórios | 59 |
| Kits | 48 |
| Bisnagas/potes/pós, com forma física a conferir | 35 |
| Dispositivos | 3 |
| **Total** | **642** |

Os 642 compreendem 639 geometrias hipotéticas e três referências documentais explícitas. **357** propostas usam a caixa nominal declarada de 24 × 15 × 10 cm; **285** usam caixas alternativas somente planejadas. Esses rótulos não comprovam a embalagem real ou disponibilidade de caixas maiores.

A prova global preservou todos os demais campos de todos os produtos, evidências, receitas de embalagem, perfis e timestamps fora do lote; a auditoria cresceu exatamente em 642 registros de pacote. Repetição somente de leitura comprovou idempotência, sem reaplicação. O resultado era **2.899 ativos com perfil**, **cinco sem perfil** e **1.863 com peso e três dimensões preenchidos**, em 2.904 ativos. Os dois perfis anteriormente habilitados permaneceram os únicos habilitados.

Aplicação e PostgreSQL mantiveram os mesmos containers, imagens e horários de início, sem build, reinício ou migration. Saúde local e HTTPS confirmadas; API administrativa recusou acesso anônimo com 401. Código `71539d1` foi enviado ao GitHub e atualizado no servidor; backup de recuperação e markers de início/verificação permanecem no job exclusivo.

Os cinco produtos da tabela de pendências continuam separados por classificação ou conflito de identidade, sem apagamento de fontes. Toda nova preparação permanece estimada, desativada e sem serviços aprovados. A conferência física de embalagem/tara/proteção/encaixe e a aceitação pela transportadora continuam necessárias antes de habilitar envio.

## Complemento de campos ausentes — 30/10/2026

O padrão do aplicador continua `NULL_ONLY`. Dois modos explícitos e mutuamente exclusivos permitem continuar o trabalho autorizado sem substituir dados existentes:

- `--fill-estimated-dimensions-only`: exige peso positivo, três lados literalmente nulos, perfil estimado, desativado, sem revisão, referência ou serviços. A auditoria de geração (`PRODUCT_WEIGHT_DRAFT_ESTIMATED`) ou refinamento (`PRODUCT_WEIGHT_DRAFT_REFINED`) v1–v4 deve conter um `draft` integralmente igual ao JSON atual. A ação de origem também é conferida e registrada. Somente as três medidas são acrescentadas; peso e demais chaves, inclusive metadados desconhecidos, permanecem literais.
- `--fill-empty-estimated-profile`: exige peso e três lados literalmente nulos, além das mesmas flags de proteção. Preenche somente esses quatro campos, preservando o restante do JSON. A origem é registrada como `EXISTING_EMPTY_ESTIMATED_PROFILE`; não se inventa uma auditoria anterior de peso que nunca existiu. Qualquer campo físico já presente impede esse modo.

Os dois modos conferem GTIN e nome exatos do manifesto antes de qualquer estimador, inclusive da preferência documental. O enum estrito, o modo no hash, ADMIN ativo, lock, revisão `updatedAt`, transação e auditoria permanecem obrigatórios. Numericamente zero não substitui um booleano `false`. A auditoria registra perfil anterior, origem e `weightAppliedFrom`, distinguindo cálculo informativo de peso efetivamente preservado. Aprovações não são intercambiáveis entre modos.

Uma regressão identificou que a rota individual de peso aceitava “28 sachês de 1 g” como apenas 1 g de conteúdo. A guarda já existente para múltiplas embalagens passou a reconhecer sachê/sachês, sachet(s) e envelope(s). O pacote deve seguir hipótese explícita do conjunto ou permanecer pendente. O bruto documental próprio continua prioritário; coeficientes e casos válidos da política v4 não foram recalculados.

O snapshot renovado de 30/10 contém 3.061 ativos: 916 com peso e três lados nulos, 119 com os quatro campos nulos, 162 sem perfil e um perfil parcialmente dimensionado sem peso. Foram preparadas offline 915 propostas de geometria, 157 para novos perfis e 118 para vazios: **1.190 propostas, ainda não comprovação de aplicação produtiva**. Há uma geometria documental no primeiro grupo e duas no último; pesos de base `unspecified` não foram promovidos a brutos. As cinco pendências legadas, Bigfral com tamanho ambíguo e Huggies RN 48 parcialmente preenchido ficam separados. Daflon Flex 30 envelopes de 10 ml também foi separado: o peso anterior de 150 g não é uma base coerente para completar dimensões de um conjunto com 300 ml nominais. Seu perfil permanece intacto, pendente de revisão do peso.

Regressões RED/GREEN, 85 testes direcionados, 491 testes de segurança e TypeScript/ESLint passaram. Auditorias completa e de produção apontaram três alertas baixos e um moderado, sem altos ou críticos; nenhuma dependência foi alterada. A homologação em PostgreSQL 17 isolado passou 44 verificações, incluindo seis falhas com reversão efetivamente testemunhada e 150 itens por modo; 50 das origens do lote de dimensões eram refinamentos auditados. Os recursos de QA foram removidos; app e PostgreSQL reais permaneceram iguais. Backup, baseline, simulação atual, revisão, aprovação congelada e provas produtivas são etapas separadas. Cada estágio precisa de um dry-run novo: o hash global do catálogo muda após o estágio anterior. Artefatos desta continuidade: `outputs/logistica-continuidade-2026-10-30/`.

## Aplicação produtiva confirmada — continuidade de 30/10/2026

A primeira simulação preservou três pesos porque a consulta buscava somente auditorias de geração. A leitura do banco confirmou refinamentos v3/v4 íntegros: Nivea Sun 200 ml (330 g), Q10 Vitamina C 400 ml (550 g) e sabonete íntimo Nivea 250 ml (390 g). A consulta passou a reconhecer geração e refinamento, exigindo ação, entidade, produto, política e JSON bruto exatamente iguais. Testes negativos e nova homologação PostgreSQL precederam qualquer aplicação. O staging anterior e seu backup foram preservados, sem reaplicar seu plano.

O staging v4 congelou fontes homologadas, manifestos, código dos operadores e hashes privados do ambiente/base Compose. Novo backup customizado, TOC e checksum foram conferidos. Cada etapa teve hash concreto próprio, revisão, marcador atômico de início, transação, CAS e auditoria; a etapa seguinte só começou após a prova anterior. Foram confirmadas **1.190 atualizações e 1.190 auditorias**:

| Etapa | Produtos | Resultado |
| --- | ---: | --- |
| Medidas de rascunhos auditados | 915 | Somente três medidas preenchidas; todos os pesos e demais campos literais preservados |
| Novos perfis | 157 | Peso e medidas estimados; sem substituir perfil existente |
| Perfis totalmente vazios | 118 | Somente os quatro campos físicos nulos preenchidos |

Há **3.053 ativos com peso e três medidas preenchidos**, **3.056 com algum perfil** e **cinco sem perfil**, em **3.061 ativos**. Os oito incompletos são os cinco conflitos/classificação da seção anterior, Daflon Flex 30 envelopes de 10 ml, Bigfral Derma Plus Adulto J 10 unidades e **toalhas umedecidas Huggies Recém Nascido 48 unidades**. Estas últimas já têm três medidas, mas não peso; não são um pacote de fraldas. Esses perfis e suas fontes permanecem intactos.

A preferência documental de Johnsons Cheirinho 400 ml foi revisada explicitamente: eixos comerciais declarados de 17,8 × 9,65 × 4,85 cm, com 2 cm de proteção hipotética, resultaram em rascunho de 20 × 12 × 7 cm; peso atual de 650 g preservado. Continua estimado e não comprova caixa externa real, tara ou encaixe. Nenhum outro draft diferiu da proposta offline permitida pelo respectivo modo.

A prova global preservou todos os demais campos de todos os produtos, evidências, 16 tabelas protegidas e perfis/timestamps fora do lote. A repetição somente de leitura confirmou idempotência, sem nova gravação. Os dois envios anteriormente habilitados continuam os únicos habilitados. App e PostgreSQL conservaram IDs, imagens e horários de início durante as operações; o canônico permaneceu com SHA `4a7c31663dff0beff4fc6071b10756a36ed11ed0289cc0fce511d893460534b6`.

Os recibos finais foram recuperados e conferidos pelo SHA `4e97b4feba1cd3838e87ae9ea11cf57999a137e2adccf259ffc555fce73c14db`. São estimativas para preparação e conferência; a revisão de tara, proteção, caixas efetivamente disponíveis, encaixe e aceitação dos serviços permanece necessária para habilitar transporte. O banco não foi reiniciado nem migrado. A reconstrução/publicação do código compartilhado com o admin é uma etapa separada dessa prova de dados.
