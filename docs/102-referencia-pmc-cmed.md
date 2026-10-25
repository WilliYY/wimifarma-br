# 102 — Referência PMC CMED

## Comportamento

O catálogo, a busca, as vitrines e a página do produto podem apresentar o PMC oficial da apresentação identificada pelo GTIN. A linha é identificada como **PMC CMED**: não representa um preço anterior praticado pela Wimifarma. O preço em destaque continua sendo o preço real de venda e é o mesmo enviado ao carrinho. Markup, ofertas dos fornecedores, estoque físico, cotas, reservas e consumo não são alterados pela referência.

O percentual é arredondado para baixo. Desde 25/10/2026, o selo compacto apresenta **X% OFF**, com a comparação ao PMC identificada no título auxiliar e na linha **PMC CMED** dos preços/detalhes. Não representa um preço anterior da loja. O selo e o valor riscado aparecem somente em medicamento explicitamente classificado como MIP/OTC, sem receita e fora da Farmácia Popular. Medicamentos com receita mantêm apresentação informativa, sem esse selo promocional. Referência ausente, ambígua, inválida ou com edição há mais de 45 dias fica oculta. O Pix de 3% continua condicionado à seleção no checkout, sem antecipação na vitrine. O componente compartilhado mantém esse padrão em cards, vitrines, busca e página de produto.

A comparação usa a menor coluna PMC regular positiva disponível na edição. Não usa PF, PMC Sem Impostos ou PMC ALC como base; não afirma que essa coluna seja a tributação aplicável ao destino. Os detalhes mostram todas as colunas válidas, apresentação, laboratório, registro, edição e fonte. O teto aplicável depende da tributação e do estado; esta referência comparativa não substitui a conferência fiscal.

## Fonte e preparação

- [Lista oficial Anvisa/CMED](https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos/precos), edição publicada em 09/10/2026, 17h30.
- [XLSX utilizado](https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos/arquivos/lista_pmc__20261009_115232671.xlsx/@@download/file), SHA-256 `5febea16f9d08f2dbdcf15e954a05b762a7650e834d050c4d57b2dcb4b448fa3`.
- `scripts/prepare-cmed-reference.py`: biblioteca padrão Python, valida hash/edição, interpreta a planilha de apresentações e cruza EAN 1/2/3 com checksum e identidade exata. Registros globalmente ambíguos e identidades divergentes são excluídos. Nenhuma busca aproximada por nome atribui PMC.
- O snapshot contém apenas dados do catálogo. Não incluir clientes, credenciais ou pedidos. Salvar fontes, manifestos e evidências fora do Git, no diretório ignorado `outputs` ou na área operacional privada.

```powershell
python -B scripts/prepare-cmed-reference.py --xlsx <lista-oficial.xlsx> --catalog <snapshot.json>
python -B scripts/prepare-cmed-reference.py --xlsx <lista-oficial.xlsx> --catalog <snapshot.json> --json
```

A saída completa contém `manifests`, `summary` e `exclusions`. Cada manifesto tem no máximo 1.000 produtos. Snapshot que mudou durante a coleta é sinalizado; a revisão deve ser novamente validada no banco antes de gravar. Uma nova edição exige atualização explícita dos pinos de origem/hash/data no parser e no importador, conferência da estrutura e os testes direcionados. Não renovar a idade de uma edição antiga mudando `observedAt`.

## Persistência e operação

Migração aditiva `20261023220000_product_cmed_reference`: campo opcional `Product.cmedReference` em JSONB. Sem preenchimento automático, mudança de preço ou remoção de dados.

```sh
node node_modules/tsx/dist/cli.mjs scripts/import-cmed-reference.ts --file <manifest.json> --actor-id <ADMIN>
node node_modules/tsx/dist/cli.mjs scripts/import-cmed-reference.ts --file <manifest.json> --actor-id <ADMIN> --apply
```

Dry-run é o padrão. Aplicação exige ADMIN ativo, lock compartilhado do catálogo, locks de linha ordenados e validação completa de todos os produtos antes da primeira gravação. Nome, marca, EAN, classificação, estado ativo e `updatedAt` devem corresponder ao snapshot. Divergência invalida o lote; recapturar e preparar novamente, sem ignorar a proteção. Referência mais recente não é substituída por uma antiga. Gravação da referência e auditoria `CMED_REFERENCE_IMPORTED` são atômicas.

Antes de publicar: backup privado validado, ensaio em PostgreSQL 17 descartável, revisão independente, checks do projeto e CI. Aplicar a migração antes de ativar o app que seleciona a nova coluna. Preservar a imagem anterior; rollback de aplicação mantém o campo aditivo. A auditoria `scripts/audit-cmed-reference.ts` exige conexão exata isolada e dados sintéticos, recusa produção e cobre concorrência, rollback e preservação comercial. Não executa checkout, gateway ou mensagens.

## Atualização de preço e disponibilidade

O PMC não é preço de compra, preço da loja nem prova de estoque do distribuidor. Atualizar ofertas requer observação real na conta/condição comercial correta, custo final com ST conforme o fornecedor e disponibilidade comprovada. Não renovar timestamps ou transformar estoque desconhecido em quantidade positiva. A consulta feita nesta tarefa não comprovou uma exportação/API em lote nos portais ANB e Profarma; a rotina recorrente previamente pausada permanece pausada. Conferência do catálogo não equivale a revalidar todas as ofertas nos fornecedores.

## Conferência e publicação em 23/10/2026

Edição oficial cruzada com o catálogo observado até 23:15 UTC: 1.215 produtos ativos, sendo 817 medicamentos. Foram importadas 793 referências (lotes de 745 e 48), cada uma com auditoria. Os 24 medicamentos restantes ficaram sem referência: 17 GTINs não localizados na edição e sete ambíguos. Os 398 demais produtos não receberam PMC. A contagem é um retrato; novas publicações exigem nova preparação.

Dry-run bloqueou um artefato com acentos corrompidos antes de qualquer gravação. O transporte foi corrigido, todas as identidades foram comparadas novamente e os lotes passaram nos guards de revisão. Digests antes/depois comprovaram preservação de todos os outros campos dos produtos (exceto `updatedAt`) e de todas as ofertas. Migração e seis cenários transacionais passaram em PostgreSQL 17 isolado; revisão independente, testes locais, auditorias de dependências e CI aprovados. Aplicação saudável, PostgreSQL e proxy preservados e imagem anterior disponível.

A conferência pública verificou referência, edição, percentual conservador e preço real em catálogo, produto e DTO do autocomplete; a interface do autocomplete também apresenta PMC em MIP e referência neutra em receita. A consulta em massa de preço/estoque dos fornecedores permanece pendente de uma rota oficial confiável; a importação CMED não a substitui.

## Fontes regulatórias

- [Resolução CM-CMED 4/2026](https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/legislacao/RESOLUOCMCMEDN.4DE30DEMARODE2026DOU.pdf/@@display-file/file): diferenciação de preços por tributação.
- [RDC 96/2008](https://anvisalegis.datalegis.net/action/ActionDatalegis.php?acao=abrirTextoAto&numeroAto=00000096&orgao=RDC%2FDC%2FANVISA%2FMS&tipo=RDC&valorAno=2008) e [RDC 44/2009](https://anvisalegis.datalegis.net/action/ActionDatalegis.php?acao=abrirTextoAto&numeroAto=00000044&orgao=RDC%2FDC%2FANVISA%2FMS&tipo=RDC&valorAno=2009): informação de preços e limites de promoção de medicamentos. A comparação identificada é uma escolha conservadora de apresentação, sem alegação de aprovação individual da Anvisa.
