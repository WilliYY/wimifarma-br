# Expansão de higiene, bebê e cuidados orais

## Etapa publicada em 25/10/2026

Foram incluídos 359 produtos em dez lotes encerrados desta frente. Essa contagem não inclui os 96 produtos de uma etapa anterior nem as inclusões de outras conversas.

| Grupo | Produtos |
| --- | ---: |
| Cuidados de bebê | 59 |
| Enxaguantes e cuidados orais | 60 |
| Absorventes e cuidados íntimos | 120 |
| Fraldas infantis e adultas | 94 |
| Lenços e toalhas umedecidas | 25 |
| Kit de viagem Colgate | 1 |
| Total | 359 |

A auditoria de 25/10/2026 às 13:41:48 UTC confirmou os 359 EANs ativos, 359 vínculos de foto principal publicada e 718 registros de auditoria vinculados às inclusões. As dez provas de publicação e seus encerramentos foram conferidos. O relatório completo de nomes, EANs, marcas e URLs está no artefato privado `outputs/higiene-bebe-auditoria-2026-10-24/RELATORIO-359-PUBLICADOS.md`; as capturas comerciais e os backups não devem ser versionados.

Esses lotes foram publicados antes da nova exigência de pesquisar cada produto em quatro distribuidoras. Essa auditoria histórica não comprova comparação completa entre quatro fontes nem renovação de preço ou estoque.

## Pesquisa comercial seguinte

Seguir a orientação vigente em [108-catalogo-pesquisa-quatro-fontes.md](108-catalogo-pesquisa-quatro-fontes.md): ANB, Profarma, GAM e DM para cada candidato; Santa Cruz suspensa. Reaproveitar evidências válidas com seus horários originais. Falha de acesso ou captura parcial não equivale a falta de estoque ou ausência de resultado.

Na coleta complementar da DM, as 120 páginas foram conferidas de forma contínua entre 15:31 e 17:05 UTC de 25/10/2026: 2.395 EANs únicos válidos, sem lacunas ou duplicatas. A última página apresentou 15 EANs e o controle de próxima página desabilitado. Essa sequência observada não representa um estoque simultâneo ou um catálogo congelado.

Quinze coincidências com a lista de 655 EANs em estudo foram encontradas: nove já publicados nesta etapa e seis ainda retidos. Todos os quinze são descritos como fardo ou caixa. A unidade comercial precisa ser comprovada antes de comparar com o custo de um pacote avulso; não dividir o preço pelo número de pacotes sem evidência comercial. Nas 150 linhas de escopo retidas, 12 exibem ST numérica e valor `Final` igual à soma de unitário e ST; 138 deixam a ST desconhecida. O valor `Final` já inclui a ST exibida; um traço não representa imposto zero.

Os outros 640 EANs não foram listados nessa consulta da conta e no intervalo observado. Isso não comprova falta de estoque nem inexistência do produto na distribuidora. A coleta da DM não libera, sozinha, novas inclusões: continuam pendentes consultas reais nas outras fontes, equivalência da unidade e, em determinados candidatos, estoque ou foto. Não transformar imagem de outra quantidade ou apresentação em foto aprovada. Provas e hashes estão em `outputs/higiene-bebe-auditoria-2026-10-24/four-source-research-v1/dm-complete-120-v1.json`, fora do versionamento.

Uma consulta somente de leitura em `Product`, às 17:25:01 UTC, conferiu os 296 candidatos retidos: oito EANs já existem globalmente, todos ativos e não excluídos, e 288 não tinham produto correspondente naquele momento. Os oito existentes devem ser excluídos de novas criações, mesmo quando não pertencem aos 359 desta etapa. A nova checagem de duplicidade imediatamente antes de cada inclusão permanece obrigatória. Nenhuma das dez prioridades comerciais analisadas estava pronta para publicação.

## Transporte

Os perfis das 94 fraldas e dos 26 produtos do complemento permanecem desabilitados para cotação nacional: medidas e peso de transporte ainda não foram revisados. Retirada e entrega local elegível seguem suas regras existentes. Não preencher dimensões como se fossem medições reais.

## Correção das descrições

Foi identificada uma frase interna de preparação nas descrições de 94 fraldas. O corretor privado limita a alteração à descrição, ao índice de busca derivado e à versão técnica `updatedAt`, com controle de concorrência, auditoria e preservação dos demais campos e dos outros 265 produtos desta etapa.

A correção foi aplicada uma única vez em 25/10/2026 às 18:03:16 UTC: 94 descrições, 94 índices de busca e 94 versões técnicas, com 94 auditorias. A verificação no banco às 18:03:17 confirmou a quantidade exata, os índices canônicos, a preservação das versões dos demais produtos e das oito tabelas protegidas. A conferência pública às 18:03:24 passou nas 94 páginas e comprovou a ausência da frase interna. Preços, ofertas, fotos e condições comerciais permaneceram preservados.

Antes da aplicação, o QA real no PostgreSQL usou 359 produtos públicos sintéticos, conferiu as 94 alterações e 94 auditorias, preservou os outros 265 produtos e executou nove controles negativos com oito tabelas de fixtures não vazias. O banco QA próprio foi removido com propriedade conferida. A aplicação teve backup prévio de 1.488.685 bytes, mantido privado no servidor. O estado do coordenador permaneceu inalterado e nenhum novo grant de publicação foi criado para essa manutenção específica, revisada independentemente.

Provas resumidas: `outputs/higiene-bebe-auditoria-2026-10-24/description94-v6-preflight-summary-proof-v1.json` e `description94-v6-final-proof-summary-v1.json`. As provas integrais, backups e registros das tentativas de validação permanecem privados e não são versionados.
