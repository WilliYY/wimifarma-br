# 69 — Classificação, preço rápido e integrações

## Escopo de 18/10/2026

O lojista pediu investigar integrações da Profarma, SantaCruz e ANB, organizar tipos de produto e permitir consultar/ajustar preço e percentual na lista administrativa. Apenas ANB e Profarma continuam abastecendo comercialmente o piloto. Esta entrega não ativa conectores nem transmite pedidos.

## Classificação administrativa

`Product.catalogClassification` separa a organização de `category`, `requiresPrescription` e `prescriptionType`:

- Tipo: a classificar, medicamento, perfumaria, higiene, suplemento, alimento ou outros.
- Classe: a conferir, genérico, similar, referência ou outro medicamento.
- Ético: segmentação comercial independente. Não equivale automaticamente a referência.
- MIP/OTC: marcação explícita de apresentação isenta de prescrição; não é inferida da ausência de receita no cadastro antigo.

O servidor recusa classificações incompatíveis com a receita e Farmácia Popular. Alteração da identidade no cadastro completo invalida a classificação administrativa. Nenhuma marcação remove receita, libera controlado ou muda benefícios/origem do estoque. Produtos sem evidência continuam a classificar.

Os dez EANs do piloto foram conferidos na planilha CMED de 09/10/2026, aba `Lista PMC`, coluna L: sete genéricos; Aradois 30/60 e Corus são similares. `scripts/classify-pilot-products.ts --actor-id <ADMIN> [--apply]` aplica somente esse conjunto fechado, com dry-run padrão, identidade exata, ADMIN ativo, locks, preservação de classificação manual e auditoria com fonte/hash/linha. Não renova preço, validade, cotas ou estoque físico.

[Planilha oficial](https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos/arquivos/lista_pmc__20261009_115232671.xlsx/@@download/file), consultada em 18/10/2026: 12.735.937 bytes, SHA-256 `5febea16f9d08f2dbdcf15e954a05b762a7650e834d050c4d57b2dcb4b448fa3`. Distinções: [MIP/Anvisa](https://www.gov.br/anvisa/pt-br/acessoainformacao/perguntasfrequentes/medicamentos/medicamentos-isentos-de-prescricao), [similares](https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/similares), [referência](https://www.gov.br/anvisa/pt-br/acessoainformacao/perguntasfrequentes/medicamentos/medicamentos-de-referencia).

## Preço e percentual

`Product.supplierMarkupBps` é inteiro de 0 a 10000 (0–100%). Migração aditiva com padrão 6000 preserva os 60% anteriores. Preço usa menor custo elegível, EAN exato, validade, disponibilidade, cotas e teto conferido. 60% de acréscimo representa 37,5% de margem bruta antes das demais despesas, não lucro líquido.

ADMIN vê custo válido, fornecedor, limite disponível, preço e percentual ao lado de cada item. Sem oferta válida, o painel mostra indisponibilidade, sem apresentar o preço salvo como cotação atual. MANAGER não recebe custo ou percentual nas respostas de listagem/edição. DTO público retira ofertas e percentual.

`PATCH /api/admin/produtos/[id]/operacao` exige ADMIN ativo e versão `expectedUpdatedAt`. Aceita somente classificação, percentual do distribuidor ou preços físicos. Estoque, receita, origem e outros campos são recusados. Grava apenas as alterações solicitadas, com auditoria anterior/posterior e resposta privada.

Para estoque físico, o reajuste calcula prévia sobre preço normal; promoção é independente. Para distribuidor, o ajuste aplica o percentual ao custo válido. Ambos exigem salvar. Pedidos em aberto impedem mudar percentual sob lock do produto. Snapshots históricos nunca são recalculados. Busca, vitrine, frete, checkout, reserva, validação de pagamento e rotina usam o percentual atual; a rotina não restaura 60% nem renova cotas.

## Integrações — evidência oficial consultada

| Fornecedor | O que foi comprovado | O que falta |
| --- | --- | --- |
| Profarma | [Portal de APIs](https://profarma-apim.developer.azure-api.net/) e [relatório 2024](https://grupoprofarma.com.br/wp-content/esg/grupo-profarma_rs2024-pt.pdf), que descreve recebimento de pedidos por FTP/EDI e formatos próprios de sistemas dos clientes. | Documentação e habilitação de consulta por EAN, preço negociado, ST e estoque da conta. O portal público não expôs operações suficientes. FTP de pedido não comprova feed de catálogo. |
| SantaCruz / GrupoSC | [Manual oficial histórico](https://stcruz.com.br/wp-content/uploads/2023/10/Manual-PedidoEletronico.pdf) descreve Comunicador com arquivos ERP, faltas e espelho fiscal; referência interna de 2011. [FAQ 2025](https://sac.gruposc.com.br/hc/pt-br/articles/38412708195987-Com-que-frequ%C3%AAncia-o-estoque-do-Pedido-Eletr%C3%B4nico-%C3%A9-atualizado) informa estoque de hora em hora, atualizado manualmente no aplicativo. | Layout e suporte atuais, consulta sem envio de pedido e custo final da conta. Não ativar ofertas SantaCruz nesta etapa. |
| ANB | [ANB Online](https://www.anbfarma.com.br/anb-online), [manual publicado](http://www.anbfarma.com.br/catalogo/manual_pe.pdf), [cadastro](https://anbfarma.com.br/cadastro) e consulta autenticada do piloto. | API/feed/EDI público não localizado na pesquisa delimitada; isso não comprova inexistência. Confirmar canal homologado com suporte, sem presumir endpoints privados. |

[Tabelas públicas Profarma 2026](https://www.profarma.com.br/tabela-de-precos-2026/) não substituem custo negociado/ST/estoque. Categoria ANB `RX` não distingue genérico de similar. `+100` não é quantidade exata.

## Rota recomendada

1. Obter documentação e habilitação de **consulta sem emissão de pedido**, preferencialmente API ou arquivo homologado. FAR/intermediário somente após comprovar contrato, suporte e origem das respostas; a licença atual não comprova integração incluída.
2. Exigir EAN, apresentação/unidade, filial/CD, condição e prazo de pagamento, custo final unitário, declaração inequívoca de ST, disponibilidade e horário observado. Retorno fiscal/pós-pedido não substitui cotação pré-venda.
3. Normalizar em adaptadores, validar em área intermediária e usar importador atual com auditoria, validade e idempotência. Serviço persistente na VPS separado do servidor web, somente após homologar acesso.
4. Sem API/arquivo, navegador autorizado é alternativa com manutenção maior. Deve parar diante de sessão expirada, CAPTCHA ou mudança de layout, sem inventar dados/renovar validade. A rotina atual depende do computador e navegador, conforme documento 68.

Canais oficiais para documentação: Profarma Pedido Eletrônico 3004-0506; GrupoSC 0800 702 1700; ANB SAC 0800 601 3338. Nenhuma mensagem enviada. Confirmar os canais no site antes de contato futuro.

## Verificação

Regressões: classificação independente da receita, injeção de campos, ADMIN ativo, versão obsoleta, promoções, origens, pedidos abertos, DTOs privados e percentual em reserva/pagamento/rotina. Publicação exige testes gerais/segurança, lint, typecheck, Prisma, build, auditoria de produção e revisão independente. Fazer backup antes da migração aditiva; rollback do layout não deve restaurar o banco inteiro.

Validação local desta entrega: 719 testes gerais e 324 de segurança aprovados, incluindo regressões específicas da nova rota administrativa na suíte geral. Lint sem erros (um aviso em auxiliar local antigo de `outputs/`), typecheck, Prisma e build aprovados. Auditoria de produção: zero vulnerabilidades. Auditoria completa: cinco alertas high conhecidos em dependências de desenvolvimento de lint; nenhuma correção forçada ou troca de versões fora do escopo. Revisão independente aprovou código e fonte/classificações após corrigir visibilidade do percentual para MANAGER e diagnóstico sanitizado de falhas.

## Publicação e comprovação

- Código `488a9d8` publicado após backup privado do banco, preservação da imagem anterior e teste da migração em banco isolado, somente com schema e registros sintéticos.
- PostgreSQL QA comprovou dois ajustes concorrentes com a mesma versão: exatamente um sucesso e um conflito. Reserva e validação usaram o percentual escolhido, preservando estoque físico e snapshot do pedido fictício. Banco QA removido após verificar nome e registros próprios.
- Classificação real passou por dry-run antes de aplicar. Repetição posterior retornou dez `UNCHANGED`. Hashes de todos os demais campos dos produtos, ofertas, pedidos, itens e reservas coincidiram antes/depois; preços, fotos, validade e cotas não foram renovados.
- Site publicado: dez buscas por EAN, dez páginas de produto e dez itens na revisão de carrinho aprovados, sem criar pedidos ou pagamentos. Acesso anônimo à nova API recusado; custos/percentuais ausentes nos DTOs públicos. App e PostgreSQL saudáveis.
- Navegador autenticado: filtros retornam sete genéricos e três similares. Prévia de Corus com 40% mostrou R$ 13,48; cancelar preservou os 60% e R$ 15,41. Desktop 1440 px e celular 390 px conferidos, sem transbordamento horizontal do catálogo ou diálogo. Evidências locais privadas em `outputs/catalogo-classificacao-2026-10-18/`.
- Portal Profarma `/apis` também conferido no navegador: tabela pública exibiu `No APIs found`; login/cadastro existe, mas não foi criado acesso de integração nem aceita contratação. Isso não comprova ausência de APIs privadas.
