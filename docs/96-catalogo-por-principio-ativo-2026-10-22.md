# 96 — Cadastro por família de princípio ativo

Atualização de 23/10/2026: novos genéricos e similares com classificação confirmada recebem cashback de compra de 1%, inclusive receita comum/antimicrobiana classificada, conforme [15](15-cashback-produtos.md). O importador aplica o padrão somente na criação; atualizar ofertas de cadastro existente preserva a configuração ADMIN. Controlados, receita pendente e Farmácia Popular ficam excluídos. Essa autorização não transforma segmento comercial em classificação regulatória e não libera selos promocionais ou fotos públicas de receitas.

## Escopo autorizado

Em novo pedido nesta conversa, o lojista autorizou expansão por marca/linha de higiene, perfumaria, tinturas e acessórios, incluindo Farmax/Hidraderm, linhas de coloração, acessórios de cabelo/unhas, BIC, Duracell, Rayovac e Band-Aid, além de Dorflex, Doricin e demais apresentações MIP confirmadas. O alcance é a identidade real da marca e apresentação: buscas parciais por Enox ou Vertix também podem retornar medicamentos alheios ao grupo de acessórios, que não são aprovados por esse resultado.

Pilhas e outros itens não medicamentosos usam `OTHER`, sem flags medicinais, em vez de classificação artificial de higiene. O manifesto misto e o publicador de fotos também aceitam explicitamente `SUPPLEMENT` e `FOOD`, após conferir a natureza real de cada apresentação; uma marca de vitaminas ou nutrição não transforma medicamentos em suplementos ou alimentos. Esses tipos exigem `medicineClass:UNCLASSIFIED`, `ethical:false`, `otc:false`, ausência de receita e de Farmácia Popular. Permanecem revisão ADMIN, foto por EAN, fonte/hash/consentimento de reutilização, bloqueio de receita/Farmácia Popular e promoção DRAFT→ACTIVE somente após aprovação da imagem. A ampliação técnica não autoriza novos percentuais ou publicações: o acréscimo comercial continua explícito por lote aprovado. ST desconhecida permanece impeditiva para medicamento ou classificação pendente; os tetos de medicamentos e as exigências de logística não foram alterados. Pacotes já congelados não recebem esse suporte retroativamente.

Em 22/10/2026, o lojista substituiu a prioridade da planilha histórica pela pesquisa de uma família completa por vez. A inclusão deve comparar ANB e Profarma e preservar marcas, fabricantes, doses, formas e quantidades diferentes. Associações entram quando contêm o princípio ativo solicitado; nomes apenas parecidos não são equivalentes.

Primeira etapa: levotiroxina, nimesulida, simeticona, tadalafila, ibuprofeno e loratadina. Em novo pedido na mesma conversa, o lojista acrescentou paracetamol, acetilcisteína, dexclorfeniramina, fexofenadina e ambroxol, incluindo a orientação de mostrar “Avise-me” quando houver falta de estoque confirmada. Desloratadina encontrada por busca parcial fica fora desta autorização. Não iniciar outras famílias sem novo pedido.

## Conferência e publicação

- Coletar a lista completa disponível no fornecedor, incluindo paginação ou carregamento adicional. O resultado da pesquisa não comprova estoque nem cobertura de todo o mercado.
- Identificar cada apresentação pelo GTIN textual normalizado, composição, dose, forma e quantidade. Conferir divergências entre o fornecedor, fabricante e documentos oficiais; preservar a origem e a resolução de cada conflito.
- Comparar o custo final elegível para uma unidade. Não somar ST novamente quando ela já integra o custo final, interpretar ST ausente como zero ou usar desconto condicionado a quantidade maior.
- Reutilizar a política comercial aprovada, respeitando o teto da apresentação. Escolhas individuais ficam registradas separadamente; não criar promoções ou preços anteriores fictícios.
- Novos cadastros para compra exigem oferta real atual. Um novo indisponível pode usar referência comercial real de preço positivo, após comprovação explícita da indisponibilidade nas duas fontes, somente no fluxo Avise-me descrito abaixo. Produtos existentes conservam seus dados e a continuidade comercial descrita em [94](94-catalogo-lateral-e-continuidade.md). Esta inclusão não renova cotas ou observações antigas.
- Manter o importador de novos GTINs separado da atualização de ofertas: uma colisão deve interromper a inclusão, inclusive em registros físicos, excluídos ou com outra representação do mesmo GTIN.
- Classificar receita por apresentação e composição. A classe regulatória `Novo` não significa automaticamente medicamento de referência. A condição comercial de segmento ético é independente.

## Itens indisponíveis e duplicidade

“Avise-me” usa o fluxo existente de [avisos de disponibilidade](74-avisos-de-disponibilidade.md), com consentimento do cliente e sem liberar compra ou disparar mensagens automaticamente. Falta confirmada em uma distribuidora não invalida estoque físico da farmácia ou oferta positiva de outra fonte. Ausência de atualização, sessão expirada e erro de consulta não comprovam estoque zero.

Antes de criar, conciliar o GTIN canônico com todos os registros, inclusive excluídos e de estoque físico. Uma apresentação existente deve ser reconciliada no registro original, sem duplicação. Novos indisponíveis precisam de identidade, classificação e preço positivo comprovado; itens de venda livre também exigem foto exata antes de ficarem públicos. O importador de ofertas elegíveis não deve ser relaxado para representar uma indisponibilidade como oferta de compra.

## Fotos

O lojista pediu fotos atuais para todos os itens que permitem imagem pública. Um produto dessa categoria não deve ser publicado sem a foto da apresentação exata conferida. Usar fonte do fabricante ou distribuidor, preservar URL e hash e revisar visualmente dose, forma e quantidade. Uma imagem genérica do distribuidor não substitui a embalagem do produto.

Medicamentos com receita continuam com as ilustrações institucionais públicas existentes; originais privados não devem aparecer no catálogo. MIP e medicamento notificado precisam de comprovação específica antes de receber foto pública. A pesquisa oficial segue LMIP/LMN e a RDC 44/2009, sem classificar uma família inteira por uma única apresentação.

## Operação

As capturas, custos, imagens originais, manifestos, backups e provas operacionais ficam em diretórios privados ignorados pelo Git. A publicação exige revisão do conjunto exato, testes e banco isolado, backup, baseline, dry-run, importação única e verificação pública. Nenhum teste transmite pedido às distribuidoras ou efetua pagamento.

Um novo pedido autorizado pode registrar seu próprio operador e conjunto de EANs em janela comprovadamente livre, preservando a identidade histórica do coordenador. A transição usa o mutex compartilhado, comparação dos hashes do estado, provas recentes e verificação de HEAD e imagem de ferramentas. Não reutiliza concessão antiga nem apresenta o operador como outro chat. Resultado incerto exige inspeção antes de qualquer repetição.

## Primeira etapa concluída: 153 inclusões

As seis primeiras famílias tiveram 153 novos produtos efetivamente publicados e conferidos em 22/10/2026:

| Família | Novos produtos |
| --- | ---: |
| Levotiroxina | 54 |
| Nimesulida | 20 |
| Simeticona | 18 |
| Tadalafila | 23 |
| Ibuprofeno | 34 |
| Loratadina | 4 |
| **Total** | **153** |

Levotiroxina: 11 apresentações de Puran T4, 11 de Euthyrox, 11 de Synthroid, 11 de Levoid e dez genéricos Merck. Nimesulida: 16 simples, duas de betaciclodextrina e as associações Nidue e Nivux. Ibuprofeno: 33 simples e uma de ibuprofeno arginina.

Foram publicadas 43 fotos reais de apresentações de venda livre; 110 produtos com receita mantiveram ilustração institucional. A conferência verificou 153 páginas e 43 arquivos públicos de imagem por HTTP, MIME e hash da transformação oficial. O catálogo terminou esta etapa com 772 ativos. As seis janelas foram liberadas, sem concessão pendente; registros, ofertas, imagens anteriores e oito tabelas protegidas foram preservados. As bases próprias de QA foram removidas após conferir titularidade e ausência de conexões; backups de recuperação foram preservados.

Validações em Linux, na imagem de ferramentas imutável: lint, typecheck, build e Prisma passaram; testes gerais 243/243, segurança 444/444 e fornecedores 107/107. Esses conjuntos podem se sobrepor. Auditoria de produção com zero vulnerabilidades; a auditoria completa manteve cinco alertas high de desenvolvimento já registrados no documento 95. Nenhuma migração ou mudança do aplicativo foi necessária para estes cadastros.

Os dados privados, apresentações e links públicos estão em `outputs/familias-medicamentos-2026-10-22/relatorio-primeira-etapa-153.md`. As provas de cada pacote e o fechamento consolidado ficam em `operacao*`; o resumo consolidado é `operacao-mip2/published-first-stage-summary.json`. Coleta ou preparação não devem ser contadas como publicação.

Na pesquisa dessas seis famílias, 116 apresentações comerciais ficaram fora do conjunto publicado: 25 na fila de foto/embalagem e 91 com pendências de identidade, disponibilidade, tributação ou classificação. Os 446 GTINs localizados somente em documentos oficiais não comprovam cotação ou estoque. A orientação posterior de mostrar indisponíveis como “Avise-me” será tratada com os dados exatos revisados, preservando as publicações desta etapa.

## Segunda etapa concluída: 36 inclusões

A segunda coleta comparou ANB e Profarma para paracetamol, acetilcisteína, dexclorfeniramina, fexofenadina e ambroxol. As 36 novas apresentações foram efetivamente publicadas, conferidas e encerradas:

| Família | Novos produtos |
| --- | ---: |
| Paracetamol, incluindo associações e um Avise-me | 7 |
| Acetilcisteína | 11 |
| Dexclorfeniramina, incluindo associações | 9 |
| Fexofenadina, incluindo associação | 6 |
| Ambroxol | 3 |
| **Total da segunda etapa** | **36** |

Foram publicadas 30 fotos reais; seis apresentações com receita usam ilustração institucional. Tylenol Sinus 24/36 comprimidos e Allegra D foram classificados como receita comum por apresentação, sem tratá-los como MIP. Associações controladas ou com classificação pendente permaneceram retidas.

O paracetamol EMS 750 mg com 20 comprimidos, GTIN `07896004703596`, foi incluído somente com Avise-me. ANB e Profarma tinham evidência explícita de indisponibilidade. O preço de referência usa custo final e ST numéricos da fonte escolhida; ST e quantidade desconhecidos da outra fonte indisponível permanecem null. Nenhuma oferta positiva, estoque físico ou cota de compra foi criada. A foto passou pelo publicador oficial; limite zero, rejeição de carrinho e checkout e botão público desabilitado foram comprovados no banco isolado, por HTTP e no navegador. A conferência não enviou inscrição ou mensagem.

Na pesquisa dessas cinco famílias, foram observados 253 GTINs comerciais. Após excluir os 36 publicados, ficaram 217: 30 MIP aguardando foto exata ou vínculo aprovado, seis indisponíveis com contrato Avise aguardando foto/pacote e 181 com outras pendências. Há ainda 523 GTINs documentais sem cotação com EAN observado nessa coleta. As contagens de motivos e famílias se sobrepõem; não somar recortes de etapas diferentes nem interpretar ausência de cotação como estoque zero.

## Encerramento acumulado: 189 inclusões

As duas etapas somam **189 GTINs únicos, 73 fotos reais e 116 apresentações com receita e ilustração institucional**. Os 11 pacotes produtivos têm aplicação única, auditoria, conferência pública e release comprovados. Em 23/10/2026 às 02:30 UTC (22/10 às 23:30 em Ivaté), o snapshot tinha 810 registros, dos quais 807 ativos, um rascunho e dois excluídos. Esses números descrevem esse momento, sujeitos a alterações posteriores.

A última rodada passou em Linux na fonte `de1689b`, com imagem de ferramentas imutável e mapa de 721 arquivos conferido no Git, host e imagem. Lint, typecheck, build e Prisma passaram, além de 244/244 testes gerais, 444/444 de segurança e 107/107 de fornecedores; os conjuntos podem se sobrepor. Auditoria de produção: zero vulnerabilidades. A auditoria completa preservou os cinco alertas high de desenvolvimento já registrados no documento 95. As alterações locais posteriores de outras frentes não fazem parte dessa validação. Não houve implantação de código de aplicativo ou migração por esta inclusão.

As janelas terminaram sem concessão pendente ou aplicação incerta. As bases próprias de QA foram removidas após conferir proprietário, conexões e conteúdo sintético; os backups foram preservados. Uma restauração externa de um Dove interrompeu uma tentativa antes do marcador de aplicação; a restauração foi preservada e a tentativa não entrou na contagem publicada.

O relatório completo com apresentações, fabricantes, GTINs, links, comandos, provas e pendências está em `outputs/familias-medicamentos-rodada-2-2026-10-22/relatorio-consolidado-189.md`. O resumo comprovado dos 11 pacotes é `operacao/published-cumulative-summary-189.json`, e a revisão independente da interface Avise está em `operacao/root-public-avise-ui-proof.json`. Custos, fontes, imagens, ferramentas privadas e backups permanecem fora do Git.

## Interrupção comprovada antes de aplicar

Nesta operação, um helper privado separado encerrou a tentativa interrompida como `aborted_no_apply`, sem simular `completed_released` ou produzir prova pública fictícia. A transição exigiu janela, operador, EAN, fingerprint e estado anterior exatos, executor encerrado, ausência dos marcadores de aplicação, GTIN e auditorias de importação ausentes, leitura real do banco e arquivos e revisão independente vinculada por hashes. O mutex e CAS preservaram coordenador, fila, alterações externas e backups.

Uma nova concessão aceitou esse predecessor somente após conferir a cadeia física de intenção, provas negativas, revisão, código e resultado do aborto, seus hashes, cronologia e identidade. As novas tentativas usaram diretórios próprios, revisões, testes e provas atuais; os artefatos anteriores permaneceram intactos. Se a aplicação tiver começado ou o resultado for incerto, esse encerramento não se aplica: inspecionar o estado real antes de qualquer retomada.

## Fotos de páginas de varejistas

O manifesto do publicador oficial admite `sourceKind: RETAILER` para identificar corretamente fotos observadas em páginas públicas de varejistas. Essa origem é preservada na auditoria, sem ser convertida em fabricante ou distribuidora. O arquivo continua exigindo GTIN e apresentação exatos, classificação MIP ou não medicinal compatível, URL e horário observados, hash, conferência da apresentação e autorização explícita de uso.

As demais proteções permanecem: ADMIN ativo, identidade conferida após bloqueio do produto, preservação de capas e galerias existentes, imagem estática limitada e ativação de rascunho somente por aprovação explícita. Medicamentos com receita continuam fora desse publicador de embalagens. Aceitar a origem documental não representa uma publicação ou uma aprovação sanitária.

A revisão da rodada seguinte também deve preservar os impedimentos das fontes: receita sem retenção não concede, isoladamente, liberação de venda online. Exigências de revisão legal independente e restrições dos adendos não podem desaparecer ao converter uma matriz de pesquisa em manifesto. Formas e quantidades devem conferir com a apresentação literal, distinguindo creme vaginal, cápsula mole, pó para inalação e número de frascos e aplicadores.

## Retomada de 13 pendentes da rodada 3 em 23/10/2026

Um novo pedido do lojista autorizou retomar os itens que outro chat havia deixado pendentes, mantendo execução individual. Foram publicados **13 GTINs de receita comum**, com ilustração institucional, importação create-only e conferência pública de todas as páginas. O pacote `chat10-retomada-rx13-v2-20261023` encerrou sua janela como `completed_released`, sem concessão pendente. Os 960 produtos anteriores e as tabelas protegidas foram preservados. O snapshot de 23/10 às 18:59 UTC registrou **973 produtos, dos quais 970 ativos e não excluídos**; é um retrato daquele momento.

A tentativa anterior deste operador foi bloqueada antes de gerar o baseline produtivo: o identificador do revisor técnico havia sido usado no campo que exige o ADMIN real responsável pela auditoria. A consulta ao ADMIN recusou esse identificador; nenhum importador produtivo foi iniciado. A janela própria foi encerrada como `aborted_no_apply`, com leitura real confirmando os 13 GTINs ausentes, executor encerrado e marcadores de importação ausentes. Essa prova não declara comparação universal de tabelas sem um baseline. O pacote seguinte usou o ADMIN autorizado e ativo, validado por consulta somente de leitura, mantendo o revisor técnico identificado separadamente e sem alegar clique humano no painel.

A publicação utilizou fonte `60e70f7`, imagem de ferramentas imutável e mapa completo de **939 arquivos**, conferido na imagem e no checkout. Passaram lint, typecheck, build, Prisma, **257 testes gerais, 452 de segurança e 107 de fornecedores**, sem falhas, cancelamentos ou testes ignorados nesses conjuntos. As duas auditorias npm, completa e de produção, apontaram zero vulnerabilidades nessa execução. Os conjuntos de testes podem se sobrepor. O adaptador privado que valida o predecessor foi exercitado com a cadeia real e 15 alterações adversariais rejeitadas.

Backup, simulação com 13 ações CREATE, aplicação única, auditoria, preservação e conferência pública foram comprovados antes do release. As duas bases sintéticas próprias dessa retomada foram removidas após verificação de identidade; os backups privados permaneceram preservados. A operação publicou dados de catálogo, sem migração ou implantação adicional do aplicativo por este operador.

Os comprovantes completos permanecem fora do Git. Nesta máquina, a falta de espaço no C: exigiu copiar a pasta privada da tarefa para `D:/Codex-outputs/wimifarma-br/familias-medicamentos-chat10-2026-10-23`; 635 arquivos foram conferidos por hash e os originais foram mantidos. O índice de publicação é `operacao/retomada13-publication-summary.json`, acompanhado de `operacao/retomada-rx13-v2-proofs.tar`, contendo somente os JSONs de comprovação selecionados, sem dump do banco ou credenciais.

### Nova pesquisa autorizada: 67 famílias

As 13 famílias da lista inicial e as 54 acrescentadas depois continuam em pesquisa própria. Esses 67 grupos não devem ser confundidos com os 13 GTINs antigos publicados acima. Na ampliação de 54 famílias, a primeira extração documental trouxe 1.791 linhas da CMED e 1.850 códigos candidatos; um código inválido e dez conflitos documentais ficaram retidos. Após corrigir a leitura do CSV oficial para CP1252, a consulta aos dados abertos encontrou 924 registros ativos candidatos, cobrindo as 54 famílias, para posterior ligação ao GTIN. A LMIP forneceu 25 linhas candidatas para revisão de forma, concentração e regime. Esses números não comprovam oferta, estoque, enquadramento de cada embalagem ou inclusão no site. A comparação comercial e a revisão individual, incluindo foto exata quando cabível, continuam obrigatórias.

## Primeira inclusão das 13 famílias: 48 apresentações em 23/10/2026

O pacote `chat10-familias13-rx48-v2-20261023` publicou **48 GTINs de receita comum**, com descrição de dose, forma, liberação e quantidade revisada por apresentação em fontes primárias dos fabricantes e conferência documental do registro. Todas as páginas foram verificadas publicamente, mantendo ilustração institucional para medicamentos com receita. Essa etapa integra a lista inicial de famílias; não conclui as 67 famílias nem libera automaticamente os candidatos restantes.

A operação preservou os 1.170 produtos anteriores e as oito tabelas protegidas. A janela `chat10-familias13-rx48-v2-20261023-225544` terminou como `completed_released`, sem aplicação incerta ou concessão pendente. O snapshot de **23/10/2026 às 22:59 UTC** registrou **1.218 produtos, dos quais 1.215 ativos e não excluídos**. Com a retomada anterior de 13 GTINs, este operador publicou 61 produtos; outras frentes também alteraram o catálogo entre as duas etapas, portanto o aumento global não deve ser atribuído integralmente a este chat.

Passaram lint, typecheck, build, Prisma, **257 testes gerais, 484 de segurança e 107 de fornecedores**, sem falhas, cancelamentos ou testes ignorados nesses conjuntos. As auditorias npm completa e de produção apontaram zero vulnerabilidades. A fonte foi `6a20ef5`, com ferramentas imutáveis e mapa de 948 arquivos conferido no Git, host e imagem. A primeira preparação foi interrompida por uma vulnerabilidade high real na dependência Zod; ela não criou base de QA nem iniciou importação produtiva. A nova preparação usou a correção incorporada por outra frente, revisão renovada e novas provas, sem reaproveitar aprovação da tentativa recusada.

O QA sintético criou e conferiu as 48 apresentações antes da concessão produtiva. Backup privado, baseline, simulação com 48 ações CREATE, aplicação única, auditoria, preservação e conferência pública foram comprovados antes do release. A base sintética própria foi removida após verificar identidade; o banco produtivo e os backups permaneceram preservados. O protocolo usa mutex compartilhado e CAS, valida fisicamente o encerramento da publicação anterior e só substitui a entrada antiga da própria fila após comprovar seu release. A revisão individual exercitou 23 alterações adversariais na validação do predecessor e 20 nos controles de aborto, fila e proposta; nenhuma foi aceita. Não houve migração ou implantação adicional do aplicativo por este operador.

Os arquivos privados desta etapa ficam em `D:/Codex-outputs/wimifarma-br/familias-medicamentos-chat10-2026-10-23/operacao`, incluindo `rx48-v2-frozen.tar`, `rx48-v2-proofs.tar` e o resumo `rx48-v2-publication-summary.json`. O arquivo de provas contém somente nove JSONs selecionados; não contém dump do banco, ambiente ou credenciais. A pesquisa das 54 famílias adicionais prossegue com coleta comercial nas duas distribuidoras, deduplicação atual e revisão por apresentação, sem equiparar consulta incompleta a indisponibilidade.

## Expansão por marcas: quatro Hidraderm publicados em 24/10/2026

O pedido de expansão por marcas gerou 318 GTINs candidatos com identidade comercial conferida nas capturas da ANB e da Profarma. Hidraderm é um subconjunto de Farmax; não somar as duas contagens. Correspondências aproximadas, como Concor para Condor e Tericin para Doricin, foram excluídas. As contagens de pesquisa não representam publicação ou estoque atual de todo o conjunto.

O primeiro sublote publicou quatro séruns Hidraderm de 30 ml: Vitamina C (`07896902217744`), Ácido Hialurônico (`07896902286030`), Retinol Like (`07896902286894`) e Multicorretivo (`07896902287914`). São quatro produtos novos, quatro ofertas observadas na distribuidora, quatro fotos oficiais exatas e oito auditorias. Os preços observados na conferência foram, respectivamente, R$ 41,22, R$ 58,46, R$ 38,33 e R$ 41,47, antes do desconto Pix. A regra específica de acréscimo de 20% para dermocosméticos veio do documento 77; ela não foi estendida automaticamente a tinturas, pilhas e acessórios.

O pacote `hidraderm4-v3`, na fonte `435aac4`, passou pelo QA PostgreSQL isolado com dados financeiros sintéticos não vazios, backup da janela, baseline, quatro ações CREATE, aplicação única e reconciliação. Produtos anteriores e oito tabelas protegidas foram preservados. Páginas, busca, preço e arquivos WebP públicos dos quatro produtos passaram por HTTP e conferência de identidade/hash. A janela `chat5-hidraderm4-v3-20261024-040010` foi encerrada em `completed_released` às 04:20 UTC, sem concessão pendente, contêiner próprio ativo ou aplicação incerta. A base própria de QA foi removida; backups de recuperação foram preservados.

Lint, tipos, build, Prisma, testes gerais, fornecedores e 485 testes de segurança passaram nas ferramentas Linux imutáveis. As auditorias completas foram preservadas: no ambiente Linux, seis alertas moderados da cadeia Prisma/ajv/fast-uri, zero high e zero critical; localmente, um moderado. A diferença de contagem entre versões do npm não foi apresentada como ausência de vulnerabilidade. O código de suporte a itens não medicamentosos foi enviado ao servidor; não houve reinício do aplicativo nem migração para esta inclusão.

O registro privado é `outputs/marcas-e-mips-chat5-2026-10-24/RELATORIO-MARCAS-EM-ANDAMENTO.md`, com os manifestos, provas e pendências separados. Os demais candidatos, incluindo Dorflex, Doricin e MIPs, continuam sujeitos à classificação de cada apresentação, foto exata e regra comercial; esta publicação de quatro itens não conclui a lista de marcas.

## Pesquisa individual de 17 marcas: nove apresentações publicadas em 24/10/2026

Outro pedido do lojista autorizou Actine, Epidrat, Pielus, Hydraporin, Reviline, Blancy, Sunless, Above, Seda, Rexona, Lux, TheraSkin, Vult, Eudora, Australian Gold, Nivea e Dove, mantendo execução individual e fotos reais otimizadas. A identidade da marca ou linha precisa ser comprovada; resultados apenas semelhantes, como Reactine na busca Actine, não entram no escopo. Essa frente preserva os lotes anteriores e o trabalho dos demais chats.

O pacote `chat10-marcas9-v2-20261024` publicou nove apresentações de higiene/perfumaria, com acréscimo de 20%: Hydraporin AI loção 120 g e 450 g; Blancy CIS 30 g, Blancy 8 30 g e Blancy TX sabonete facial 120 ml; Pielus Forte 120 ml, Pro-Hyalu máscara 200 ml, condicionador 200 ml e shampoo 400 ml. Cada GTIN recebeu uma oferta ANB com custo final e ST numérica observados e uma foto real ligada ao EAN na Profarma. ST não informada permaneceu desconhecida, sem conversão em zero. As unidades seguiram a apresentação exata do fornecedor e da foto, sem conversão presumida entre g e ml.

Foram criados nove produtos, nove ofertas, nove imagens e 18 auditorias. Os 1.514 produtos anteriores, ofertas, imagens, auditorias e oito tabelas protegidas foram preservados. O snapshot da verificação registrou 1.520 produtos ativos; outras frentes também publicaram produtos, portanto essa contagem global não é atribuída integralmente a este lote. As nove páginas e os nove arquivos WebP passaram por HTTP, MIME e hash da transformação oficial. Os originais somavam 484.786 bytes; as imagens publicadas somam 62.320 bytes, sem recorte ou ampliação e com comparação visual de legibilidade.

A conferência após a aplicação detectou que o serviço de ferramentas não montava o volume persistente de imagens. Os nove arquivos foram restaurados nos mesmos caminhos já auditados, no volume real do aplicativo, usando criação exclusiva e hashes de origem/saída. Não houve repetição do importador nem alteração de outros arquivos. A verificação do banco e a conferência pública foram repetidas após a recuperação, antes do encerramento.

Passaram lint, tipos, build, Prisma, 261 testes gerais, 485 de segurança e 109 de fornecedores, sem falhas, cancelamentos ou testes ignorados nesses conjuntos. As auditorias Linux completa e de produção mantiveram um alerta moderado em `fast-uri`, zero high e zero critical. A fonte `435aac4` e a imagem imutável foram conferidas com mapa de 974 arquivos; o avanço posterior `a5a77f7` alterava somente este documento e foi verificado separadamente, preservando os bytes da fonte executável. A revisão individual exercitou 13 controles de entrada e 25 alterações adversariais na cadeia de encerramento do predecessor. Não houve alegação de revisor independente ou clique humano no painel.

A janela `chat10-marcas9-v2-20261024-043122` terminou em `completed_released`, sem concessão pendente ou aplicação incerta. As duas bases sintéticas próprias foram removidas após conferir titularidade; o pacote v1 permaneceu sem aplicação produtiva. Os backups foram preservados. Não houve migração ou reinício adicional do aplicativo. Provas e resumo ficam em `D:/Codex-outputs/wimifarma-br/marcas-chat10-2026-10-23/operacao/marcas9-v2-proofs.tar` e `marcas9-v2-publication-summary.json`, fora do Git. A pesquisa das demais apresentações continua; nove inclusões não concluem as 17 marcas.

### Segunda inclusão: 21 Actine e 12 Epidrat em 24/10/2026

O pacote `chat10-actine-epidrat33-v1-20261024` publicou 33 apresentações novas: 21 Actine e 12 Epidrat, cada uma com oferta ANB observada, ST numérica e foto real do EAN conferida na Profarma. A natureza cosmética/higiene foi revista individualmente com fontes primárias da [Darrow](https://darrow.com.br/linha/actine-solar/) e da [Mantecorp](https://www.mantecorpskincare.com.br/hidratacao/facial). As variantes e quantidades seguiram as embalagens exatas, sem converter g/ml nem substituir apresentações promocionais pelos tamanhos das páginas atuais do fabricante. Três divergências Actine e uma Epidrat permaneceram retidas; não foram incluídas por semelhança de nome.

Foram adicionados 33 produtos, 33 ofertas, 33 fotos e 66 auditorias, preservando os 1.523 produtos anteriores e as oito tabelas protegidas. Os originais somavam 2.072.024 bytes e os WebP publicados, 304.070 bytes, com legibilidade conferida e sem recorte ou ampliação. O volume real de imagens foi verificado e montado explicitamente nas operações produtivas; um segundo contêiner conferiu a persistência, os hashes e os metadados. As 33 páginas e as 33 imagens públicas passaram por HTTP/MIME/hash. O snapshot dessa verificação registrou 1.553 ativos. Com o lote anterior de nove, esta frente publicou 42 produtos; a lista de 17 marcas ainda não está concluída.

A fonte executável continuou `435aac4`, com imagem imutável e mapa de 974 arquivos; o checkout `5dbf3a1` alterava somente documentação. Lint, tipos, build, Prisma e 261 testes gerais foram reaproveitados com hashes e datas originais para a mesma fonte. Segurança e fornecedores foram executados novamente: 485/485 e 109/109, sem falhas, cancelamentos ou testes ignorados. As auditorias completa e de produção mantiveram um moderado em `fast-uri`, zero high e zero critical. A revisão individual verificou 13 controles de entrada e 25 alterações adversariais da cadeia física do lote próprio anterior; não houve alegação de revisão independente ou clique humano.

O QA PostgreSQL isolado conferiu as 33 apresentações e os dados financeiros sintéticos antes da concessão produtiva. A janela `chat10-actine-epidrat33-v1-20261024-050821` passou por backup, baseline, 33 ações CREATE, aplicação única, reconciliação e conferência pública. Terminou em `completed_released`, sem concessões ou aplicação incerta; a base própria de QA foi removida e o backup preservado. Não houve migração ou reinício adicional do aplicativo. As provas selecionadas ficam em `operacao/actine-epidrat33-v1-proofs.tar` e o resumo em `actine-epidrat33-v1-publication-summary.json`, na pasta privada desta frente, fora do Git e sem dump ou credenciais no arquivo de provas.

### Terceira inclusão: 23 Sunless em 24/10/2026

O pacote `chat10-sunless23-v1-20261024` incluiu 23 apresentações Sunless: bronzeadores, pós-sol, pós descolorantes cosméticos e protetores solares. A oferta comercial veio da ANB, com ST numérica, e as fotos reais foram obtidas do [fabricante Farmax](https://www.farmax.com.br/), vinculadas ao EAN exato no catálogo público. A revisão individual conferiu FPS, cor, massa/volume, forma e versão infantil. Treze outras apresentações continuaram pendentes de foto exata; ausência no catálogo observado do fabricante não foi tratada como inexistência ou falta de estoque no distribuidor. Os preços e estoques do fabricante não foram utilizados.

Foram criados 23 produtos, 23 ofertas, 23 fotos e 46 auditorias. Os 1.561 produtos anteriores e as oito tabelas protegidas foram preservados. Os 21 originais JPEG e dois PNG somavam 2.851.468 bytes; os WebP publicados somam 319.736 bytes, sem recorte ou ampliação e com comparação visual. Um segundo contêiner confirmou a persistência no volume real do aplicativo, e as 23 páginas/imagens públicas passaram por HTTP, MIME e hash. A verificação registrou 1.581 produtos ativos. Esta frente soma 65 EANs únicos publicados; a pesquisa das 17 marcas continua.

A fonte executável permaneceu `435aac4`, com imagem imutável e mapa de 974 arquivos. O checkout `d8fd1e6` diferia somente nos documentos 96 e 105; os comprovantes de lint, tipos, build, Prisma e 261 testes gerais mantiveram os hashes e datas originais. Os novos testes passaram: segurança 485/485 e fornecedores 109/109, sem falhas, cancelamentos ou ignorados. As auditorias completa e de produção registraram um moderado em `fast-uri`, zero high e zero critical. Passaram 13 controles de entrada, 25 alterações adversariais do encerramento próprio anterior e 25 do predecessor externo. A revisão foi individual, sem alegação de revisor independente ou clique humano.

O lote passou por novo QA PostgreSQL com dados financeiros sintéticos, deduplicação atual, ADMIN ativo, backup, baseline, dry-run de 23 CREATE e uma aplicação produtiva. A janela `chat10-sunless23-v1-20261024-062335` terminou em `completed_released` às 06:25:07 UTC, sem concessão ou aplicação incerta. A base própria de QA foi removida, e o backup foi preservado. O fingerprint é `4a9c332fda9231d7964cdc427f48797db7b6f288f08162134e766a582eb97ad5`. As 13 provas selecionadas e o resumo foram recebidos e conferidos localmente em `operacao/sunless23-v1-proofs.tar` e `sunless23-v1-publication-summary.json`, na pasta privada desta frente; SHA-256 do arquivo de provas: `922d7487fbace05328a9112e3f664a347a41e3661c559af92551ed1793ed0372`. Não houve migração, reinício do aplicativo, pedido a fornecedor ou alteração de pedidos/pagamentos.

### Quarta inclusão: 29 Rexona em 24/10/2026

O pacote `chat10-rexona29-v1-20261024` incluiu 29 apresentações Rexona: 24 desodorantes antitranspirantes e cinco sabonetes, incluindo dois kits de seis barras. As ofertas ANB com ST numérica foram cruzadas com EANs nas URLs das páginas vinculadas pelo [catálogo oficial Rexona](https://www.rexona.com/br/products.html) e com as fotos reais correspondentes. A coleta pública observou 63 produtos. O conteúdo das páginas individuais vinculadas não foi consultado e não foi apresentado como fonte lida; o comprovante registra a lista renderizada, seus links, imagens e datas. Duas imagens oficiais retornaram HTTP 404 e outras 27 apresentações comerciais não tiveram correspondência exata nessa fonte, permanecendo pendentes. Ausência de foto não foi convertida em falta de estoque.

Foram adicionados 29 produtos, 29 ofertas, 29 fotos e 58 auditorias, preservando os 1.604 produtos anteriores e as oito tabelas protegidas. Os 29 originais PNG somavam 56.473.291 bytes; os WebP publicados somam 729.088 bytes. Todas as comparações visuais preservaram variante, conteúdo e legibilidade, sem recorte ou ampliação. O volume persistente foi conferido por outro contêiner, e as 29 páginas/imagens públicas passaram por HTTP/MIME/hash. A verificação registrou 1.630 produtos ativos. A união dos quatro lotes próprios tem 94 EANs únicos; as 20 inclusões Johnson’s da outra frente não entram nessa contagem.

A fonte executável permaneceu `435aac4`, com imagem imutável e mapa de 974 arquivos. O checkout revisado `df93dcd` diferia apenas nos documentos 96, 105 e 106. Lint, tipos, build, Prisma e 261 testes gerais conservaram as datas e hashes da mesma fonte; segurança e fornecedores passaram novamente em 485/485 e 109/109, sem falhas, cancelamentos ou ignorados. As auditorias completa e de produção mantiveram um moderado em `fast-uri`, zero high e zero critical. Passaram 13 controles de entrada, 25 controles adversariais do encerramento Sunless23 e 25 do encerramento externo Johnsons20, com validação física das provas e da fila própria. A revisão continuou individual, sem alegação de revisor independente ou clique humano.

A janela `chat10-rexona29-v1-20261024-072914` passou por QA isolado com dados financeiros sintéticos, deduplicação atual, ADMIN ativo, backup, baseline, 29 CREATE no dry-run, aplicação única, reconciliação e conferência pública. Terminou em `completed_released` às 07:31:10 UTC, sem concessões ou aplicação incerta; o QA próprio foi removido, e o backup preservado. Fingerprint: `64468e674adff87b58b0b11ccf161ba8eaa075acdd347d10a089bc9f8a2ae883`. As 13 provas selecionadas foram recebidas e conferidas em `operacao/rexona29-v1-proofs.tar` e `rexona29-v1-publication-summary.json`, na pasta privada desta frente; SHA-256 do arquivo de provas: `a115b31649ceeff418bf4b0254b7d68b7251e26096a9320d2c749ed219f52193`. Não houve migração, reinício do aplicativo, pedido a fornecedor ou alteração de pedidos/pagamentos.

Na pesquisa, a cópia privada do coletor ANB passou a aceitar GTINs de oito, 12, 13 e 14 dígitos, mantendo a validação de identidade e a conferência posterior do dígito pelo normalizador. Foram exercitados comprimentos inválidos e identidades divergentes/duplicadas. A leitura de buscas explicitamente vazias também passou a tolerar espaços repetidos na mensagem, com casos de consulta diferente, carregamento e tela inicial rejeitados. O coletor original da frente medicinal foi preservado. TheraSkin foi consultada pelos cinco filtros de laboratório: 46 EANs observados, com datas e conteúdos originais e hashes dos cinco arquivos de origem preservados; medicamentos dessa fabricante continuam exigindo classificação própria.

### Quinta inclusão: 21 Seda em 24/10/2026

O pacote `chat10-seda21-v1-20261024` publicou 21 apresentações cosméticas Seda: shampoos, condicionadores, cremes para pentear, uma máscara e dois finalizadores Day After. Quatro apresentações infantis preservam as variantes Moana/Tiana e o conteúdo de 300 ml. As ofertas atuais ANB, com ST numérica, foram comparadas individualmente com EANs dos links e fotos do [catálogo oficial Seda](https://www.seda.com.br/home.html). Os nomes atuais da embalagem foram usados, inclusive Chá Verde e Cítricos e by Niina Colágeno + Vitamina C; as descrições anteriores ou abreviadas do fornecedor permanecem nas provas privadas. Não houve inferência de equivalência de formulação nem conversão de massa/volume.

A pesquisa de fotos observou 82 links únicos em cinco listas oficiais. Shampoos, condicionadores, supercondicionadores e máscaras tiveram paginação concluída; a lista de cremes/finalizadores permaneceu parcial, com dez produtos visíveis, após duas tentativas de carregar mais sem novos EANs, uma recarga e rolagem até o fim. Essa limitação foi registrada com os hashes do arquivo agregado e dos cinco arquivos de origem. Cada foto incluída possui vínculo exato observado; os conteúdos das páginas individuais vinculadas não foram apresentados como lidos. Das 22 fotos baixadas e comparadas nas seis pranchas, a máscara Luminous `07891150099883` ficou retida: fornecedor informa 300 ml e a foto mostra 300 g. Ausência de foto não foi tratada como falta de estoque.

Foram criados 21 produtos, 21 ofertas, 21 fotos e 42 auditorias, preservando os 1.633 produtos anteriores e as oito tabelas protegidas. Os originais somavam 44.647.594 bytes; os WebP publicados somam 418.040 bytes, com comparação visual aprovada, sem recorte ou ampliação. O volume persistente foi conferido por outro contêiner, e as 21 páginas e imagens públicas passaram por HTTP, MIME e hash. A verificação registrou 1.651 produtos ativos. A união das cinco publicações próprias contém **115 EANs únicos**, sem atribuir inclusões de outros chats a esta frente.

A fonte passou a `dffe66c`, após revisão das alterações de classificação não medicinal incorporadas por outra frente. Foi construída e conferida nova imagem imutável de ferramentas, com mapa de 976 arquivos. Lint, typecheck, build, Prisma e os conjuntos gerais, segurança, fornecedores e publicador de imagens passaram em **261, 485, 111 e 15 testes**, respectivamente. A preparação deste lote repetiu segurança e fornecedores em 485/485 e 111/111. As auditorias completa e de produção mantiveram um alerta moderado em `fast-uri`, zero high e zero critical. A primeira leitura dos totais precisou aceitar o formato de relatório do Node 24; os comandos já haviam terminado com código zero e suas datas e hashes foram preservados, sem reaproveitar a fundação antiga `435aac4`.

Passaram 13 controles locais de entrada e 25 controles adversariais sobre o encerramento físico Rexona29. A janela `chat10-seda21-v1-20261024-115302` passou por QA isolado com dados financeiros sintéticos, ADMIN ativo, deduplicação atual, backup, baseline, 21 CREATE no dry-run, aplicação única, reconciliação e conferência pública. Terminou em `completed_released` às 11:54:47 UTC, sem concessões ou aplicação incerta. O banco de QA próprio foi removido e o backup preservado. Fingerprint: `8d81988b8877be36e7afdd2228efff0dcd9be9392fcc59b31cd204dd1d1bc97e`.

As 13 provas selecionadas foram recebidas e tiveram hashes conferidos em `operacao/seda21-v1-proofs.tar` e `seda21-v1-publication-summary.json`, na pasta privada desta frente. SHA-256 do arquivo de provas: `4a371473f572a9cb45a622f6a007c459d51791e2f95bc0529d3980aed6954fac`. O snapshot posterior, somente leitura, registrou 1.654 produtos/1.651 ativos às 11:56:44 UTC. Não houve migração de produção, reinício do aplicativo, pedido a fornecedor ou alteração de pedidos/pagamentos. A pesquisa das marcas restantes continua individual; estes cinco lotes encerrados não devem ser reaplicados.
