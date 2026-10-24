# Expansão por marcas: Dorflex e Hidraderm

## Resultado e escopo

Em 24/10/2026, o pacote `misto5-v1` adicionou quatro apresentações Dorflex e uma água micelar Hidraderm. Com os quatro séruns Hidraderm já registrados no documento 96, esta solicitação totaliza nove produtos novos, nove ofertas, nove fotos oficiais exatas e 18 auditorias. Isso não conclui o pedido de todas as marcas: dos 318 GTINs candidatos únicos da seleção original, 309 ainda não foram publicados por esta frente. Hidraderm está dentro do conjunto Farmax; não somar novamente seus produtos.

| Apresentação | GTIN | Preço antes do Pix |
|---|---|---:|
| Dorflex DIP 1 g, 10 comprimidos |07891058005474|R$ 13,42|
| Dorflex gotas 300/35/50 mg/mL, 20 ml |07891058009458|R$ 23,47|
| Dorflex 300/35/50 mg, 36 comprimidos |07891058017507|R$ 20,50|
| Dorflex UNO 1 g, 10 comprimidos |07891058022815|R$ 16,46|
| Hidraderm água micelar Vitamina C, 100 ml |07896902214866|R$ 9,54|

Cada medicamento teve dose, forma, quantidade, bula e enquadramento de venda sem receita conferidos individualmente. A LMIP não foi aplicada a toda a marca. Três apresentações MAX continuam retidas para revisão; outros resultados sem foto ou identidade exata também não foram liberados. Doricin não teve correspondência comercial exata nas capturas disponíveis; isso não comprova inexistência nem falta de estoque. Dorflex não foi autorizado como fabricante no carrossel de marcas.

Os quatro medicamentos mantiveram o acréscimo autorizado de 10%, abaixo do teto CMED conferido para ICMS de 19,5% no Paraná, sem reduzir margem para caber no teto. A água micelar segue a regra específica de 20% dos dermocosméticos, prevista no documento 77. O custo final observado já contém ST; ela não foi adicionada novamente. Não foram inventados preços anteriores. A definição do acréscimo das novas tinturas, acessórios, pilhas e grupos sem regra anterior permanece pendente da resposta comercial do lojista.

## Execução e verificações

A fonte executável foi fixada em `a5a77f7`, com imagem de ferramentas imutável e mapa de 974 arquivos. O avanço do checkout para `5dbf3a1` durante a operação e depois para `5cfadb7` alterou somente documentação; a compatibilidade dos caminhos executáveis protegidos foi conferida separadamente. Fonte das ferramentas, checkout observado e versão do aplicativo não foram apresentados como uma mesma coisa. Não houve migração ou reinício do aplicativo para incluir estes itens.

O QA PostgreSQL isolado confirmou cinco produtos, cinco ofertas, cinco fotos e dez auditorias, preservando oito tabelas protegidas com dados financeiros sintéticos não vazios. Segurança passou em 485 testes. Lint, tipos, build, Prisma, testes gerais e de fornecedores passaram na mesma fonte verificada. As auditorias Linux completa e de produção registraram seis alertas moderados na cadeia Prisma/ajv/fast-uri, zero high e zero critical; os relatórios completos foram preservados. A base própria de QA foi removida às 04:57:35 UTC e os backups de recuperação foram mantidos.

Uma conexão local PuTTY permaneceu pendurada depois da conclusão remota do QA. O processo local foi identificado pelo executável e comando, e somente esse cliente foi encerrado após confirmar que a execução remota e seus contêineres haviam terminado. Não houve repetição do QA nem do importador por causa da falha de transporte.

A produção passou por backup da janela, baseline, deduplicação atual em todos os estados, cinco ações CREATE e aplicação única. Foram preservados os produtos anteriores e as oito tabelas protegidas. As cinco páginas e os cinco arquivos WebP passaram por HTTP, MIME, preço, identidade e hash, com persistência no volume real. O snapshot somente de leitura de 05:28:16 UTC registrou 1.561 produtos, incluindo físicos e excluídos; outras frentes também publicaram itens, portanto esse total global não representa as nove inclusões desta solicitação.

## Encerramento administrativo

A aplicação produtiva começou às 05:17:06.916 UTC e terminou às 05:17:20.446 UTC, antes do vencimento original da aprovação às 05:17:31 UTC. A conferência física terminou às 05:17:30.715 UTC e a verificação pública, somente leitura, às 05:17:31.541 UTC. Os bytes e horários originais dessas provas foram preservados.

O encerramento ocorreu por um procedimento privado e separado de `release-only`, aprovado em nova revisão administrativa independente às 05:31:41 UTC. Esse procedimento nega concessão produtiva e não executa importador, pagamento ou nova escrita de catálogo. A validação histórica usa explicitamente o instante real de conclusão produtiva, derivado da prova com hash fixado; não altera relógios, datas nem renova QA ou aprovação anteriores. As provas públicas e físicas permaneceram atuais no momento do encerramento. A troca do estado canônico exigiu a janela e o SHA exatos, mutex, backup, marcador de tentativa única e preservação integral das outras filas.

A janela `chat5-misto5-v1-20261024-044952` terminou em `completed_released` às 05:33:02 UTC, sem concessão própria pendente ou aplicação incerta. O estado final teve SHA256 `7c3f65ca1fb743fe14fe755831231d4b723efd4cd73e84ae83b59631a42a88e0`, confirmado por nova leitura. O procedimento teve 15 testes aprovados e revisão independente do código, intenção, autorização, provas originais e preservação do estado alheio. A revisão foi limitada ao encerramento administrativo; não autorizou novos produtos nem estendeu a validade da aprovação original.

## Registro privado e continuidade

O relatório e as provas ficam em `outputs/marcas-e-mips-chat5-2026-10-24/`, incluindo `RELATORIO-MARCAS-EM-ANDAMENTO.md`, `CONTINUAR-AQUI.json`, `operacao-misto5/packages/misto5-v1`, `misto5-v1-production-evidence/` e `coordinator-misto5/versions/misto5-v1-release-only/`. Esses arquivos privados não entram no Git. Não foram versionados custos de fornecedor, credenciais, dumps ou capturas.

O restante exige a regra comercial aplicável, foto exata, disponibilidade efetivamente observada e classificação por apresentação. Busca aproximada ou consulta incompleta não autoriza publicação nem a indicação de falta de estoque.
