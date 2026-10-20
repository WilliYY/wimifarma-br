# Expansão por famílias: enalapril, sinvastatina e atenolol

## Resultado de 20/10/2026

Foram publicados 54 produtos novos de distribuidor, em dois lotes de 44 e dez, após consulta autenticada à ANB e à Profarma. A sessão Profarma foi restabelecida nesta rodada. O catálogo passou de 434 para 488 produtos ACTIVE não excluídos; os dois registros excluídos continuam preservados. Essa contagem cadastral não garante disponibilidade comercial depois da expiração das ofertas.

| Família, incluindo associações | Novas apresentações |
| --- | ---: |
| Enalapril | 17 |
| Sinvastatina | 19 |
| Atenolol | 18 |
| Total | 54 |

São 31 genéricos, 15 similares e oito de referência. Dose, composição, apresentação e quantidade permanecem distintas por GTIN. Os títulos curtos conservam dose, quantidade e marca; forma farmacêutica e detalhes conferidos ficam na descrição. Os 54 itens usam receita comum já classificada, com conferência farmacêutica antes da dispensação. Nenhuma regra de antimicrobianos, controlados ou Farmácia Popular foi alterada.

## Ofertas e precificação

As 77 ofertas elegíveis compreendem 52 observações ANB e 25 Profarma. Em 23 produtos há observações elegíveis das duas fontes; o motor existente escolhe o menor custo elegível do mesmo EAN. Consultar uma família nas duas distribuidoras não significa que ambas tenham uma oferta válida para cada apresentação.

O custo é o Unit c/ST da ANB ou o Preço Final da Profarma, sem adicionar ST novamente. Medicamentos Profarma com traço ou ausência de ST foram excluídos da concorrência; zero numérico explícito não equivale a ausência. Quantidade de caixa de embarque não foi usada como estoque e sinais como `+100` não foram convertidos em saldo exato.

Foram definidos 50% de acréscimo em 37 produtos e 10% em 17, incluindo oito referências e decisões individuais em genéricos/similares para evitar preços excessivos ou acima do PMC observado. Não foi criada uma regra automática por faixa de custo. Todos os preços planejados e publicados ficaram dentro do teto observado na respectiva oferta. Acréscimo não representa margem líquida: tributos da loja, embalagem e demais despesas não foram presumidos como zero.

As datas de consulta são reais, com validade de até 24 horas a partir de cada observação. A inclusão usa cota inicial de cinco por oferta, sem renovar cotas anteriores; isso não altera a política pública de demanda já existente. Estoque físico PHARMACY permanece separado. A rotina de preços continua PAUSED: esta publicação não amplia sua lista nem ativa uma coleta independente.

## Identidade e duas exclusões preventivas

A revisão cruzou EAN, registro, composição, doses, forma e quantidade total com CMED e fontes primárias de bula/fabricante. A CMED é evidência privada de revisão, sem copiar seus dados para a descrição comercial.

Dois candidatos de atenolol foram retirados antes de qualquer upload ou aplicação comercial, pois a apresentação dos portais divergia da linha CMED selecionada:

- `07896112401476`: portais indicam 100 mg com 30 comprimidos; a linha selecionada corresponde a 50 mg, dez blísteres com dez comprimidos.
- `07896112401469`: portais indicam 50 mg com 30 comprimidos; a linha selecionada corresponde a 50 mg com 20 comprimidos.

Ambos continuam retidos, sem produto criado por esta rodada. A errata invalida a aprovação preliminar desses EANs. Um EAN ou registro isolado não supera uma contradição de apresentação; embalagens com múltiplos blísteres exigem conferir o total de unidades. Outros 25 candidatos com oferta elegível permanecem pendentes de identidade/receita, totalizando 27 retenções comerciais nas famílias pesquisadas. Ausência de oferta válida é tratada separadamente.

As duas apresentações EMS de ezetimiba + sinvastatina incluídas no segundo lote têm registro, composição, 30 comprimidos e receita comum confirmados em bula ligada pelo fabricante. As fontes, hashes e versões observadas permanecem nos artefatos privados. Nenhuma foto de embalagem foi inferida a partir desses documentos.

## Imagens, logística e preservação

Os medicamentos usam as ilustrações institucionais existentes de genérico, similar ou ético, conforme a classe. Não foram publicadas fotos novas nem apagadas capas e fotos anteriores. Os perfis logísticos estimados criados na operação continuam desabilitados e sem aprovação de transporte. Medidas estimadas não comprovam aceitação de transportadora ou frete para todo o Brasil.

Foram reutilizados os schemas, motor financeiro e importador existentes, com a proteção privada de inclusão exclusiva por EAN já descrita no documento 85. A revisão independente aprovou os dois lotes finais. O lote preliminar que continha os dois conflitos foi marcado como rejeitado e nunca foi aplicado.

Antes de cada aplicação houve validação de hashes e compatibilidade dos arquivos críticos, backup conferido, QA em banco exclusivo, teste de rejeição de EAN existente e dry-run. Cada lote foi aplicado uma única vez, com marcador exclusivo e prova posterior. As 54 novas linhas de auditoria foram reconciliadas. Os registros anteriores de produtos, ofertas, fotos e auditoria, além de usuários, clientes, pedidos, itens e reservas, permaneceram idênticos. Os dois bancos sintéticos exclusivos foram removidos após conferir propriedade, identidade e contagens; backups de recuperação foram preservados.

## Verificações e entrega

- `npm run test:security` executado novamente na imagem fixada de ferramentas: 400 testes passaram, sem falhas. Isso não substitui a validação completa de outras alterações da aplicação.
- Auditoria de dependências de produção sem vulnerabilidades. Auditoria completa mantém cinco alertas high de desenvolvimento, já registrados no documento 85; não foram ocultados ou corrigidos fora do escopo.
- QA, dry-run e prova de preservação passaram nos dois lotes; 54 auditorias de inclusão e nenhum evento de publicação de foto.
- As 54 páginas públicas responderam HTTP 200 com título e ilustração da classe corretos; os três assets institucionais também responderam HTTP 200.
- A inclusão de Enalapril 10 mg com 30 comprimidos EMS foi conferida no carrinho pelo navegador. Somente o item de teste foi removido, preservando os três itens anteriores. Nenhum pedido, pagamento, etiqueta ou mensagem foi criado.
- A pesquisa com Enter por `enalapril` abriu `/busca?q=enalapril` e encontrou 19 produtos, incluindo os 17 novos e os dois anteriores, com navegação para associações e outras apresentações.
- Nenhum código da aplicação, schema, migração ou configuração financeira foi alterado. Não houve rebuild do app nem repetição de lint/typecheck/build sobre alterações alheias.

Manifestos, fontes, custos negociados, provas, snapshot final e controle mestre atualizado ficam em `outputs/catalogo-expansao-2026-10-20-lote2/` e nas pastas privadas da operação no servidor, fora do Git. A planilha preserva os 6.288 registros FAR e dois avulsos, as 4.912 famílias candidatas, as 59 inclusões anteriores e a lista das 54 inclusões desta rodada. O FAR não contém EAN: semelhança de nome não é confirmação de correspondência.

Continuam faltando 3.512 cadastros ativos para a meta mínima de 4.000. O relatório FAR e suas famílias ainda não foram esgotados. Retomadas devem consultar ofertas atuais, respeitar as retenções e manter a conferência de fotos para itens sem receita; não reutilizar datas vencidas como observações novas.
