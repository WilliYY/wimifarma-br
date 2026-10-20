# 90 — Inclusão de 72 apresentações de medicamentos

## Resultado comprovado

Em 20/10/2026 foram incluídos **72 EANs novos**, exclusivamente como produtos de distribuidor, em dois sublotes de 50 e 22. O snapshot final registrou **560 produtos ativos e 562 registros totais**, partindo de 488 ativos e 490 registros. Os produtos de rodadas anteriores não foram contados novamente.

| Família pesquisada | Novas apresentações |
| --- | ---: |
| Atorvastatina | 9 |
| Rosuvastatina e similares | 33 |
| Omeprazol | 1 |
| Pantoprazol e similares | 3 |
| Valsartana | 8 |
| Carvedilol e similares | 18 |
| Total | 72 |

São 46 genéricos e 26 similares de receita comum, com identidade e apresentação conferidas por EAN, registro, composição, dose, forma, liberação, revestimento e quantidade total. Associações sem prova dos pares ativo/dose, apresentações contraditórias, injetáveis fora do escopo e classificações sem confirmação permaneceram retidas. A matriz privada foi congelada com 63 fontes primárias; seus candidatos não equivalem a produtos aprovados.

## Preço, conteúdo e logística

- Consultas comerciais efetivamente realizadas neste lote: **ANB e Profarma**. O menor custo final elegível do mesmo EAN foi escolhido entre as ofertas observadas. Não se afirma comparação com fornecedores ainda não consultados.
- Medicamento com ST ausente não concorre; ST numérico observado, inclusive zero explícito, é tratado conforme a evidência. O custo final já inclui o imposto, sem nova soma. Faixas múltiplas de quantidade/preço ficam retidas até revisão, sem escolher a menor por conveniência.
- Decisões individuais: **45 EANs com acréscimo de 50% e 27 com 10%**, conforme a orientação comercial para preços competitivos. Todos os preços conferidos ficaram dentro do PMC observado. Acréscimo sobre custo não representa margem líquida garantida.
- Datas reais das consultas e validade de até 24 horas foram preservadas. Nenhuma renovação de oferta ou cota antiga; somente alocação inicial dos novos produtos, com `replenishAllocation: false`.
- Nomes curtos mantêm dose, quantidade e laboratório comercial. Descrições conservam composição, forma farmacêutica e liberação. O laboratório comercial não é apresentado como prova do fabricante físico.
- Receita comum e ilustrações institucionais por classe foram mantidas. Não houve publicação de novas fotos de embalagens Rx. As imagens ilustrativas não identificam uma apresentação física específica.
- Os 72 perfis logísticos derivam do estimador existente, com `measurementBasis: estimated`, `enabled: false` e `transportReviewed: false`. Não comprovam peso físico nem aceitação de transportadora e não habilitam transporte automaticamente.

## Aplicação e preservação

Foram reutilizados o importador oficial, a proteção de inclusão exclusiva por GTIN sob lock, ADMIN ativo, auditoria, backup privado, QA isolado e dry-run antes de cada apply. O limite de 50 produtos por manifesto não foi aumentado para atender ao objetivo de carteiras maiores.

- `rx3-01-50`: 50 inclusões e 50 auditorias; prova de `2026-10-20T13:51:37.947Z`, com 538 ativos.
- `rx3-02b-22`: 22 inclusões e 22 auditorias; prova de `2026-10-20T14:02:41.398Z`, com 560 ativos.
- Cada prova confirmou preservação de produtos, ofertas e imagens antigos, pedidos, itens, usuários, clientes e reservas. O snapshot final também confirmou os 490 registros anteriores nos 14 campos capturados.
- Os marcadores de apply, progresso e fingerprint conferem com as provas. Os dois bancos QA exclusivos foram removidos após conferir nome, propriedade e conteúdo sintético. Não ficou processo próprio de importação nem aplicação com resultado incerto.

A janela serial de publicação foi usada somente para esses 72 itens. Seu encerramento foi registrado no `STATUS.md` privado; a liberação do estado compartilhado pertence ao coordenador. Novas inclusões exigem a próxima janela e seus próprios gates.

### Ocorrências resolvidas

1. O primeiro dry-run parou antes do importador ao detectar um novo evento externo `PAYMENT_FEES_SYNCHRONIZED`. Foi conferido exatamente esse acréscimo de auditoria, preservando hashes antigos. Baseline e backup anteriores foram arquivados; novos backup, baseline e dry-run estrito passaram. Não houve restauração de produção nem remoção de auditoria.
2. O pacote original dos 22 parou antes dos gates produtivos por alteração concorrente apenas de uma asserção em `product-mutation.test.ts`. O pacote substituto exige exatamente esse caminho e SHA do teste revisado; todos os demais caminhos críticos e o worktree precisam permanecer idênticos. Diff da exceção, hashes e provas novas foram preservados. Não houve alteração de código da aplicação ou relaxamento da reconciliação.
3. A primeira versão privada das descrições foi rejeitada por afirmar fabricante físico sem prova. Somente a versão 2, com a expressão “Laboratório comercial”, recebeu aplicação.

## Validações

- Parser comercial: **23 testes**; identidade e exceções de apresentação: **16 regressões**; preparador privado: **13 testes**, incluindo integração com schema, motor financeiro e estimador existentes.
- **400 testes de segurança por pacote** na imagem de ferramentas fixada da fonte `1780447`; auditorias de produção sem vulnerabilidades. A auditoria completa mantém **cinco alertas high de dependências de desenvolvimento**, sem ocultá-los.
- O teste cuja asserção foi corrigida no checkout `3973d86` não foi executado nessa imagem antiga; a compatibilidade foi conferida pelo diff exato, sem atribuir esses testes à nova fonte.
- **72 páginas públicas HTTP 200**, com nome, preço, descrição e ilustração institucional correta; dois assets WebP conferidos. A aba pública exibiu um produto novo e seu preço. O navegador interrompeu a captura de tela, portanto não há alegação de screenshot concluído, teste de Enter ou transação de checkout nesta rodada.
- Nenhum pedido, pagamento, compra de distribuidor, etiqueta ou mensagem comercial foi enviado. A rotina de preços pausada permaneceu pausada.

Não houve mudança no código versionado da aplicação nesta entrega; os helpers, capturas, revisões e provas comerciais permanecem no diretório privado ignorado `outputs/catalogo-expansao-2026-10-20-lote3/`, com os pacotes operacionais referenciados na pasta privada da rodada anterior. Não versionar esses dados nem backups de banco.

O controle mestre privado foi atualizado em `controle/Controle_mestre_expansao_4000.xlsx`, com a aba `Inclusoes_lote3`: 72 inclusões novas, 185 acumuladas no controle, 560 ativos e 3.440 restantes para 4.000. O QA confirmou EANs como texto de 14 dígitos e preservação do histórico, campos manuais, 6.288 linhas FAR e dois avulsos, 4.912 famílias, fórmulas, caches, estilos, filtros e congelamento. Excel nativo não foi executado; a representação científica de alguns EANs na prévia do renderizador não altera o texto exato no XLSX.

## Continuidade

O objetivo de **mais de 500 inclusões em uma carteira** ainda não foi concluído. A coleta reuniu 386 EANs candidatos, dos quais 308 tinham alguma oferta comercial elegível; somente os 72 com todos os gates desta rodada foram publicados. Não converter candidatos, linhas de relatório ou fontes CMED em contagem de produtos publicados.

Olmesartana continua com captura ANB incompleta; telmisartana, candesartana, bisoprolol, clopidogrel, captopril, gliclazida e glimepirida seguem reservadas para próximas consultas. Interrupções do navegador não autorizam renovar horários, inventar estoque ou contornar autenticação.

Próximos lotes podem comparar ANB, Profarma, DM e GAM conforme [81](81-fotos-publicas-e-gam.md), com custo final e condições realmente observados. Na GAM, não duplicar ST já incluído em Líquido + Imposto; na DM, confirmar a composição do custo. Preservar o calendário e os cortes existentes e não prometer recebimento irrestrito no dia seguinte. O controle mestre continua a meta de 4.000 produtos sem misturar o estoque PHARMACY.
