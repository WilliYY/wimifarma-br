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
