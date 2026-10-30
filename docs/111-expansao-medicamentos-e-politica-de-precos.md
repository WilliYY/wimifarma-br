# 111 — Expansão de medicamentos e preços dos novos cadastros

## 26/10/2026 — Mais duas ezetimibas publicadas; cinco medicamentos nesta frente

Ezetimiba EMS 10 mg foi incluída em duas apresentações: 60 comprimidos, GTIN `07896004746920`, preço base de R$ 61,55; e 30 comprimidos, GTIN `07896004746937`, R$ 37,05. A aplicação única ocorreu às 11:19 de Brasília (`2026-10-26T14:19:17.964Z`). Ambas as páginas públicas retornaram HTTP 200 e a leitura posterior do banco confirmou `ACTIVE`, fornecimento por distribuidora, estoque físico zero, acréscimo de 50%, cashback de compra de 1% e WimiCoins desabilitado. São genéricos com receita comum e ilustração institucional pública; não foram habilitados perfis logísticos.

As duas identidades foram comparadas nas quatro distribuidoras e reconciliadas com as apresentações CMED e a bula original encaminhada pela EMS, que cobre 30 e 60 comprimidos. A seleção ANB conserva custo final, ST, campanha, cota e horários realmente observados; não se renovaram datas pela releitura. Não houve duplicação nem alteração das associações de ezetimiba já existentes.

A publicação usou OPS/TOOLS imutáveis e os 1.002 hashes de fonte, com exceções exatas para a aplicação `badd09e` e imagem `18396d4…` revisadas independentemente. As exceções incluem arquivos funcionais de marcas e atalhos, além de UI e assets; não são uma permissão genérica para backend. O resolvedor comercial, receita, preço e cashback permaneceram intactos. Testes dirigidos das guardas, novos 485 de segurança, 111 de fornecedores, auditorias e novo QA transacional isolado passaram. Logs originais da fundação do mesmo código/imagem foram reutilizados por hash, sem alegar novo build/typecheck. Permanece um alerta moderado `fast-uri`, sem high/critical.

Tentativas anteriores interrompidas por atualização da aplicação terminaram antes de intent/grant/apply. O QA V1 foi removido com proprietário e zero conexões verificados. Na V2, 89 arquivos da tentativa `286a` foram arquivados fisicamente por hash; cinco provas recriáveis saíram da raiz somente após essa preservação e o QA próprio foi removido sem FORCE. O fingerprint novo recebeu testes e QA reais em base vazia; nenhuma prova antiga foi relabelada. O registro de correção do Compose ausente também precedeu a execução.

Backup, baseline, dry-run, aplicação, prova pública e liberação concluídos. Os 2.477 produtos anteriores e oito tabelas protegidas foram preservados; houve duas auditorias de inclusão. A janela `chat5-ezetimiba2-v2-20261026-141804`, fingerprint `925e090580634ced1fe2e786fd0d976f6c50b904d5b8fe096db02ebf75d7bcce`, terminou liberada e o QA próprio foi removido. A leitura final contou 2.479 produtos totais e 2.476 ativos. Prova privada: `outputs/medicamentos-grade111-chat5-2026-10-25/ezetimiba2-v2-final-readonly-proof.json`. Somadas às três inclusões abaixo, são cinco apresentações EMS nesta frente; demais fabricantes, doses, associações e famílias continuam pendentes. Os 16 condicionadores Elseve da outra frente foram apenas verificados como predecessor, sem reaplicação ou atribuição a este lote.

## 26/10/2026 — Três apresentações EMS publicadas

Foram incluídos uma única vez cloridrato de dorzolamida 20 mg/mL com 5 mL, pitavastatina cálcica 2 mg com 30 comprimidos e bimatoprosta 0,3 mg/mL com 5 mL. A aplicação ocorreu às 08:52 de Brasília (`2026-10-26T11:52:45.173Z`). As três páginas públicas responderam HTTP 200; a configuração persistida de cada produto confirmou cashback de compra de 1%, sem WimiCoins. Permaneceram acréscimo de 50%, receita comum, ilustração institucional pública, estoque físico zero e fornecimento por distribuidora. Nenhum perfil logístico foi habilitado.

Cada EAN recebeu pesquisa ANB/Profarma/GAM/DM. As ofertas selecionadas são ANB, com custo final e ST conferidos, preservando as datas reais. A revisão documental independente foi complementada pela releitura dos três PDFs originais encaminhados pela EMS. Identidade, apresentação, classificação e teto foram conferidos; isso não substitui a receita ou a conferência farmacêutica antes da dispensação.

A execução usou OPS imutável `cb2b395` e imagem de ferramentas correspondente, com 1.002 hashes conferidos. A revisão independente do pacote e 27 testes locais cobriram o escopo, as guardas e a adaptação necessária do importador privado para usar o helper atual de cashback no cadastro novo. Passaram novos 485 testes de segurança, 111 de fornecedores e QA transacional isolado. Os logs da fundação do mesmo código/imagem foram reutilizados com hashes e datas preservados; não se afirma novo build ou typecheck nessa etapa. Auditorias completa e de produção registraram um alerta moderado de `fast-uri`, sem high/critical.

Backup, baseline, dry-run, concessão exclusiva, aplicação única e prova pública foram concluídos. Os 2.458 produtos anteriores e as oito tabelas protegidas foram preservados; houve três auditorias de inclusão. A janela `chat5-rx3-v2-20261026-115132` terminou liberada, sem concessão ativa, e o QA exclusivo foi removido após conferir sua identidade. Provas privadas em `outputs/medicamentos-grade111-chat5-2026-10-25/rx3-final-readonly-proof.json`. Os demais candidatos e famílias continuam em pesquisa; esta inclusão não significa cobertura completa.

## Regra comercial autorizada em 25/10/2026

O lojista respondeu diretamente: **“50% em genéricos/similares e 10% nas marcas éticas”**. A regra vale para os novos medicamentos desta expansão, sobre o custo final unitário da distribuidora, incluindo os tributos e condições comerciais aplicáveis. São acréscimos sobre custo, não margens sobre faturamento nem descontos ao consumidor.

- Genérico comprovado pela apresentação: `supplierMarkupBps: 5000`.
- Similar sem enquadramento como marca ética: `supplierMarkupBps: 5000`.
- Marca ética com segmento comprovado: `supplierMarkupBps: 1000`. O segmento comercial não substitui a classificação regulatória: uma marca ética pode ter registro de similar.
- Segmento ou classificação ainda ambíguos: manter pendente, sem escolher o percentual pela distribuidora ou pelo nome do fabricante.
- Produtos já cadastrados conservam seus percentuais. Não há reprecificação em massa, mudança do fallback técnico do importador ou extensão dos 35% de novas marcas não medicamentosas aos medicamentos.

O cálculo e o arredondamento devem seguir o domínio existente. A apresentação continua sujeita ao teto CMED comprovado. Se o preço com o acréscimo autorizado superar esse teto, aguardar custo menor; não reduzir o percentual automaticamente. Essa decisão preserva a orientação anterior do lojista de manter a margem. Não criar preço anterior fictício, desconto inventado ou promoção a partir do desconto da distribuidora.

## Pesquisa e identidade

O pedido atual contém 111 famílias, transcritas das cinco imagens, além da conferência das marcas chamadas informalmente de “Eze”. A coleta começa por laboratório, incluindo genéricos, similares, marcas éticas, associações e apresentações, sem tratar a planilha antiga como limite do catálogo.

Cada apresentação nova deve receber pesquisa em ANB, Profarma, GAM e DM. A comparação usa o mesmo GTIN e a mesma dose, forma e quantidade. Não substituir uma associação por outra: ezetimiba isolada, ezetimiba com sinvastatina e ezetimiba com rosuvastatina exigem identidades próprias. “Eze” aparece em diferentes marcas e não identifica sozinho um medicamento.

A busca inicial por ingrediente/nome não encontrou correspondência confirmada para as 111 entradas, mas não é uma auditoria exaustiva por marca e EAN. A fonte CMED oficial reutilizada identifica candidatos documentais, sem comprovar disponibilidade comercial. Antes de criar, repetir a deduplicação contra todos os produtos, inclusive excluídos e estoque físico. As três associações ezetimiba/sinvastatina já encontradas no catálogo devem ser preservadas.

Preço, ST, disponibilidade e data pertencem à observação efetiva de cada fonte. Traço não é zero, ausência de resultado não prova falta de estoque e nova leitura de um arquivo antigo não renova a cotação. Na Profarma, medicamento sem ST numérico permanece fora da seleção, conforme [78](78-st-observado-profarma.md). O preço final já inclui ST; na GAM, “Líquido + Imposto” é custo final, sem identificar automaticamente o imposto genérico como ST ou somá-lo novamente. Quantidade por caixa não comprova mínimo de compra nem saldo. Limites diários e campanhas condicionais exigem conferência antes da seleção.

Continuam os contratos de receita, publicidade, imagem e publicação: medicamentos sujeitos a prescrição usam a ilustração institucional pública; uma embalagem disponível na distribuidora não autoriza sua exposição pública. Publicação exige classificação individual, revisão, QA, backup, concessão exclusiva vigente, aplicação única e prova pública. A autorização comercial não equivale à concessão técnica de produção.

## SantaCruz: rota em avaliação

O pedido mais recente autoriza investigar uma rota mais estável. Isso não reativa uma integração nem invalida a suspensão da coleta rotineira. O [manual oficial do Pedido Eletrônico, seção 4.9](https://stcruz.com.br/wp-content/uploads/2023/10/Manual-PedidoEletronico.pdf) descreve **Relatórios → Produto → laboratório → Filtrar → Imprimir/visualizar**. Esse relatório é uma alternativa à rolagem repetida do digitador; sua compatibilidade e exportação na instalação atual ainda precisam ser comprovadas.

A instalação 13.0.003 permitiu observar resultados de EZE, mas o controle da janela e a exportação não foram confiáveis. Não foi obtido arquivo CSV/Excel validado nem confirmada a data de sincronização comercial. A data exibida junto à versão não foi presumida como atualização de preços e estoque. O manual de conversão para Excel de pedidos não comprova exportação de catálogo. Não houve compra, quantidade digitada ou pedido enviado às distribuidoras.

## Evidências desta etapa

As transcrições, autorização direta, observações comerciais, fontes oficiais e pendências ficam em `outputs/medicamentos-grade111-chat5-2026-10-25`, fora do Git. As contagens de pesquisa não são contagens de produtos publicados. As seções de 26/10 registram as cinco inclusões efetivamente publicadas; os demais candidatos permanecem pesquisa ou preparação, sem inclusão presumida.

## Meclin JET: duas inclusões em 29/10/2026

O pacote `chat10-meclin-jet2-integrado-v1-20261029` incluiu, uma única vez às 15:45:54 UTC, Meclin JET 25 mg com 10 comprimidos mastigáveis (EAN 7896637033343, R$ 14,66) e 50 mg com 10 comprimidos mastigáveis (EAN 7896637033350, R$ 26,30). ANB, Profarma, GAM e DM foram consultadas para as apresentações separadas. A GAM foi a fonte elegível selecionada, com custo final de R$ 13,33 e R$ 23,91, respectivamente, incluindo o imposto exibido. A Profarma mostrou ST como traço e permaneceu fora da seleção; ausência de resultado na DM não foi convertida em estoque zero.

As duas apresentações receberam classificação individual `MEDICINE/REFERENCE`, marca ética e receita `ORDINARY`, com acréscimo de 10%, cashback e WimiCoins desativados conforme o domínio. Bula, LMR e CMED fundamentam o enquadramento; a divergência literal da raiz de registro na LMR do JET 25 foi preservada e cruzada com fabricante e CMED. Os preços ficam abaixo de todas as 26 colunas PMC positivas de cada apresentação, inclusive dos mínimos absolutos de R$ 15,06 e R$ 27,17, sem presumir uma alíquota fiscal do Paraná. A imagem pública usa o ativo institucional existente, sem criar fotos ou galeria de embalagem.

A QA isolada criou dois produtos e duas auditorias; passaram 491 testes de segurança, 111 de fornecedores e 55 controles de predecessores. A auditoria de dependências registrou três alertas baixos e um moderado, sem altos ou críticos. A revisão independente, backup, baseline, dry-run, concessão exclusiva e prova pública foram concluídos. A prova produtiva confirma duas inclusões, duas auditorias e preservação dos produtos anteriores e das nove tabelas protegidas. A janela `chat10-meclin-jet2-integrado-v1-20261029-154429` foi liberada às 15:46:15 UTC, sem concessão ativa ou aplicação incerta; a QA própria foi removida sem FORCE após conferir marcador e ausência de conexões.

As apresentações convencionais Meclin 25 mg e 50 mg com 15 comprimidos continuam retidas para comprovação do teto fiscal aplicável ou custo elegível menor, preservando o acréscimo autorizado. Meclin Move permanece em revisão de apresentação e enquadramento individual. Esta publicação não significa conclusão das demais famílias. Provas privadas ficam em `D:/Codex-outputs/wimifarma-br/marcas-chat10-2026-10-23/expansao49-20261025/preparacao/retomada-publicacao-20261028-v1/retomada-publicacao-20261029-v1/meclin-jet2-runtime-proofs-20261029`.

## Vinte apresentações publicadas em 30/10/2026

O pedido “Inclua o que tiver” substituiu a espera por 50 itens. Foram criados 20 produtos novos, com 18 ofertas ANB e duas DM, após conferir apresentação, classificação, custo final, imposto exibido e estoque observado. A prova posterior à aplicação foi registrada às 13:05:43 UTC (10:05:43 de Brasília). Nenhum cadastro anterior foi reaplicado.

| Apresentação | Fonte | Preço |
|---|---|---|
| Mesalazina Legrand 800 mg 30 comprimidos de liberação retardada | ANB | R$ 103,56 |
| Allovita 50 mg/ml solução capilar 50 ml | ANB | R$ 60,36 |
| Dexclorfeniramina + Betametasona Nova Química 2 mg + 0,25 mg 20 comprimidos | ANB | R$ 18,53 |
| Celerg 0,25 mg + 2 mg 20 comprimidos | ANB | R$ 18,68 |
| Celerg 0,25 mg/5 ml + 2 mg/5 ml xarope 120 ml | ANB | R$ 29,13 |
| Mesalazina EMS 800 mg 30 comprimidos de liberação retardada | ANB | R$ 105,60 |
| Travoprosta EMS 0,04 mg/ml solução oftálmica 2,5 ml | ANB | R$ 47,64 |
| Orlistate EMS 120 mg 42 cápsulas | ANB | R$ 130,40 |
| Orlistate EMS 120 mg 84 cápsulas | ANB | R$ 200,06 |
| Ácido Ursodesoxicólico EMS 300 mg 30 comprimidos | ANB | R$ 152,42 |
| Lestalgyn 0,4 mg/ml + 0,05 mg/ml xarope 120 ml | ANB | R$ 14,96 |
| Dexclorfeniramina + Betametasona Teuto 0,4 mg/ml + 0,05 mg/ml xarope 120 ml | ANB | R$ 11,88 |
| Besilato de Anlodipino Sandoz 5 mg 30 comprimidos | ANB | R$ 6,81 |
| Besilato de Anlodipino Sandoz 10 mg 30 comprimidos | ANB | R$ 12,17 |
| Dexclorfeniramina + Betametasona Globo 0,4 mg/ml + 0,05 mg/ml xarope 120 ml | ANB | R$ 12,05 |
| Lergidrin 0,4 mg/ml + 0,05 mg/ml xarope 120 ml | ANB | R$ 13,47 |
| Celetil 0,4 mg/ml + 0,05 mg/ml xarope 120 ml | ANB | R$ 19,67 |
| Furosemida Geolab 40 mg 30 comprimidos | DM | R$ 6,95 |
| Dexclorfeniramina + Betametasona Geolab 0,4 mg/ml + 0,05 mg/ml xarope 120 ml | ANB | R$ 18,65 |
| Furosemida Geolab 40 mg 20 comprimidos | DM | R$ 5,01 |

As 20 apresentações são genéricos ou similares, com acréscimo de 50% sobre o custo final e cashback de compra de 1%, conforme a regra autorizada. O ST exibido já integra o custo final e não foi somado novamente. Os preços ficaram abaixo do menor teto positivo comprovado entre as 26 colunas CMED de cada apresentação, sem presumir uma alíquota fiscal aplicável. A classificação individual é `ORDINARY`, com conferência da receita antes da dispensação, imagem institucional, galeria de embalagens vazia e WimiCoins desativado.

Furosemida Geolab 40 mg com 30 comprimidos conserva o estoque observado exato de duas unidades e alocação de duas; a apresentação de 20 comprimidos conserva a alocação de cinco. Os produtos usam estoque de distribuidora, mantendo o estoque físico da farmácia separado. Não foram fabricados preços anteriores, promoções ou disponibilidade.

A QA isolada criou 20 produtos e 20 auditorias. Passaram 485 testes de segurança e 111 de fornecedores na base imutável de importação `cb2b395`, além da revisão independente e dos controles de autorização. A auditoria operacional, de produção e completa, registrou um alerta moderado e nenhum alto ou crítico. Os checks fundamentais históricos da mesma base foram reutilizados por hash e com as datas originais; não houve novo build ou reinício do APP nesta publicação.

Backup, baseline, dry-run de 20 operações CREATE, concessão exclusiva, aplicação única e verificação das 20 páginas públicas foram concluídos. As provas confirmam preservação dos produtos anteriores e das nove tabelas protegidas. A conferência SQL independente confirmou preços, acréscimo, cashback, fonte, receita e limites de estoque dos 20. A janela `chat5-ordinary21-publication-v1-20261030-130423` foi liberada às 13:06:02 UTC, sem aplicação incerta; a QA própria foi removida após conferir proprietário, marcador e ausência de conexões, sem FORCE.

Cordarex continua retido por falta de comprovação do segmento comercial que define o acréscimo de 50% ou 10%. Outros candidatos sem cotação/estoque válidos, acima do teto ou com pendência documental/fiscal continuam separados. O acumulado verificado deste chat passa de 115 para 135 inclusões; publicações de outras frentes não entram nessa soma.

Relatório privado: `outputs/catalogo-lotes200-2026-10-26/lotes1000-v1-20261027/fila-lotes50-20261029-v1/RESULTADO-PUBLICACAO20-20261030.md`. Originais das provas: `publication21-root-control-v1/publication20-physical-and-sql-proof.json`, no mesmo diretório de continuidade. O namespace histórico `ordinary21-publication-v1-20261030` contém efetivamente 20 itens e está encerrado; não deve ser reaplicado.
