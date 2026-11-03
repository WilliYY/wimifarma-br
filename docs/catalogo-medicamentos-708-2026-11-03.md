# Conferência dos 708 itens e de outras apresentações

Registro operacional de 03/11/2026. Custos, capturas autenticadas e identificadores privados permanecem fora do Git, em `D:\Codex-outputs\wimifarma-br\catalogo-596-2026-11-03`.

## Pedido e resultado comprovado

Os dois pedidos contêm 596 e 112 EANs: 708 códigos únicos, com dígito verificador válido. A indicação de fornecedor feita pelo lojista é uma pista de consulta; não substitui oferta autenticada.

Foram criados **242 medicamentos em DRAFT**, com 242 registros de auditoria, em seis operações próprias. São 133 itens dos pedidos e 109 outras apresentações encontradas na pesquisa. O chat 12 incluiu mais 19 itens de cuidados, com provas físicas conferidas: **261 novos cadastros nesta etapa**.

| Operação | Itens | Resultado |
| --- | ---: | --- |
| `rootchat13-medicine-gam-b01-v1-20261103` | 49 | Aplicação única, SQL/HTTP conferidos, janela liberada e QA removida |
| `rootchat13-medicine-gam-b02-v2-20261103` | 49 | Aplicação única, SQL/HTTP conferidos, janela liberada e QA removida |
| `rootchat13-medicine-gam-b03-v2-20261103` | 35 | Aplicação única, SQL/HTTP conferidos, janela liberada e QA removida |
| `rootchat13-medicine-correlatas-b01-v1-20261103` | 49 | Aplicação única, SQL/HTTP conferidos, janela liberada e QA removida |
| `rootchat13-medicine-correlatas-b02-v1-20261103` | 49 | Aplicação única, SQL/HTTP conferidos, janela liberada e QA removida |
| `rootchat13-medicine-correlatas-b03-v1-20261103` | 11 | Aplicação única, SQL/HTTP conferidos, janela liberada e QA removida |

Essas operações criaram zero produtos ACTIVE, ofertas de fornecedor, imagens ou estoque físico. Os registros existentes foram preservados. As 242 páginas continuaram retornando 404 na aplicação efetivamente executada; homepage e health retornaram 200. Nos verificadores atualizados, também foram conferidos o URL final e o conteúdo JSON do health.

O preflight final de 03/11/2026 às **04:40:06 -03:00** encontrou **216 dos 708 EANs**: 63 ACTIVE e 153 DRAFT. Os rascunhos são os 133 medicamentos da lista, os 19 cuidados novos do chat 12 e a tipoia Mercur `7896342452255`, incluída anteriormente pelo chat 12 e não repetida. Restavam **492 EANs da lista sem cadastro**.

O conjunto ampliado de 1.823 EANs (708 pedidos e 1.115 outras apresentações, sem interseção) tinha **457 presentes**: 195 ACTIVE e 262 DRAFT. Havia 1.366 faltantes e nenhum EAN associado a múltiplos produtos. Não havia concessão ativa desta frente nem base QA com seu prefixo. Essa contagem descreve somente o conjunto conferido, não o catálogo inteiro da farmácia.

## Conferência e critérios de inclusão

- Consulta autenticada somente de leitura ao GAM para 474 itens iniciais e 93 adicionais, com controle físico em cada lote. Não houve carrinho ou pedido ao fornecedor.
- Identidade por GTIN exato e registro MS13, com apresentação e titular obtidos da CMED oficial. O documento usado foi a lista PMC de 09/10/2026, arquivo terminado em `673`, baixada do [portal da Anvisa](https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos/precos). A CMED não comprova estoque, custo atual, validade atual do registro ou classificação de receita.
- Custo final positivo, conciliado entre a listagem e o detalhe autenticado, com validade máxima de 24 horas a partir da observação necessária mais antiga. O campo genérico de imposto do GAM não foi transformado em ST.
- Acréscimo de 50% para genéricos e 35% para as demais classes admitidas, respeitando o menor PMC regular positivo usado como teto conservador. Não houve redução silenciosa do acréscimo para caber no teto.
- Novos medicamentos com receita `UNREVIEWED`, exigência de receita habilitada, benefícios desabilitados, estoque físico zero e revisões de registro, receita, alegações, imagem, logística e condições de venda pendentes. Nenhuma equivalência terapêutica foi presumida.
- Deduplicação por GTIN normalizado e aliases, em todos os estados, novamente sob lock antes da gravação. Cada operação teve backup, concessão própria e aplicação única.

## Pendências da lista original

Dos 567 itens consultados nesta frente, 133 cumpriram os critérios e 434 permaneceram em HOLD. Os motivos incluem falta de detalhe GAM exato, custo com acréscimo acima do PMC e identidade documental insuficiente; os motivos podem se sobrepor. Busca inconclusiva não significa produto inexistente ou estoque zero.

A frente de cuidados, materiais e aparelhos ficou com o chat 12: 77 faltantes após conciliar a tipoia já incluída. O chat 12 concluiu 19 DRAFT e 19 auditorias na operação `wimifarma-cuidados-draft19-20261103-v1`; as provas de produção, HTTP, liberação e remoção da QA foram conferidas por hash. Os outros 58 permanecem pendentes. Esses 19 não são atribuídos aos executores de medicamentos desta frente.

O parser anterior da Profarma não distingue ST zero, campo ausente e campo ilegível; seus resultados `SEM_ST` não validam a etapa fiscal de medicamentos. Também não foi comprovada uma oferta ANB autenticada por um controle positivo atual. Esses limites não foram convertidos em preços ou disponibilidade inventados.

## Outras apresentações

Foram identificados 1.115 GTINs documentais das mesmas famílias de substância, titular e produto, todos fora dos 708 pedidos. Foram retidos 14 ambíguos e 40 sem evidência mínima de MS13/PMC. Entre as 1.061 candidatas restantes, novo preflight encontrou 132 já ACTIVE e 929 faltantes.

A consulta autenticada das 929 faltantes terminou em 19 lotes de até 49 candidatos mais um controle, todos validados. A triagem aprovou os dados de 109 para DRAFT, incluídos em 49 + 49 + 11. Outros 820 ficaram em HOLD: 662 sem detalhe GAM exato, 154 com acréscimo acima do teto e quatro por outras divergências. Com os 54 retidos antes da cotação, restam 874 apresentações sem cadastro.

O adaptador específico das correlatas registra a origem do EAN como `CMED_SAME_FAMILY_PRESENTATION_CANDIDATE`, as fontes como CMED/GAM e a autorização como pedido explícito para pesquisar outras apresentações. Ele confere os registros derivados contra o documento original e a exclusão dos 708 EANs. Não afirma que o lojista digitou esses EANs nem presume equivalência terapêutica.

## Validação e evidências

- Adaptadores original e de correlatas: dez testes locais em cada um e typechecks strict independentes aprovados. Origem documental também conferida contra o corpus e mutações rejeitadas.
- Suíte local de segurança: 557 testes aprovados, zero falhas; a segunda execução também terminou com 557 aprovados. O log comprova a execução, sem alegar um snapshot imutável de todo o checkout compartilhado.
- Seis QA PostgreSQL próprias, apenas esquema e usuários sintéticos, com oito casos negativos por operação aplicada. Todas foram removidas sem FORCE após as liberações.
- Auditoria completa preservada: 15 achados moderados, zero altos e zero críticos; o exit 1 pelos moderados não foi ocultado.
- Provas privadas: três `RELATORIO-INCLUSAO-MEDICAMENTOS*`, três `apresentacoes-correlatas/RELATORIO-INCLUSAO-CORRELATAS*`, `RELATORIO-CUIDADOS19-CHAT12-CONFERIDO-v1.json` e `PREFLIGHT1823-FINAL-ALL-STATUS-v1.json`. Capturas, preços, cópias de banco e código operacional privado não foram versionados.

A tentativa B02 v1 parou antes de concessão, backup e aplicação por mudança do HEAD no servidor; sua QA foi removida após comprovar ausência de intenção de aplicação e de gravações da operação em produção. B02/B03 v2 reconstruíram os helpers e repetiram a QA com os bindings atuais. A comparação das fontes sustentou compatibilidade do operador de rascunhos, sem alegar equivalência binária entre checkout e imagem antiga.

Nenhum build, restart ou deploy da aplicação foi executado por esta frente. Mudanças concorrentes de HEAD/imagem foram tratadas como motivo para nova vinculação e ensaio, sem enfraquecer os guardas.
