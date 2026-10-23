# 96 — Cadastro por família de princípio ativo

## Escopo autorizado

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

As 13 famílias da lista inicial e as 54 acrescentadas depois continuam em pesquisa própria. Esses 67 grupos não devem ser confundidos com os 13 GTINs antigos publicados acima. Na ampliação de 54 famílias, a primeira extração documental trouxe 1.791 linhas da CMED e 1.850 códigos candidatos; um código inválido e dez conflitos documentais ficaram retidos. A consulta aos dados abertos encontrou 888 registros ativos candidatos para posterior ligação ao GTIN, e a LMIP forneceu 25 linhas candidatas para revisão de forma, concentração e regime. Esses números não comprovam oferta, estoque, enquadramento de cada embalagem ou inclusão no site. A comparação comercial e a revisão individual, incluindo foto exata quando cabível, continuam obrigatórias.
