# 124 — Rotas físicas e negações no cálculo de peso

## Escopo e estado

Continuação autorizada em 28/10/2026 de [123](123-continuidade-dos-dados-fisicos.md), com foco em completar dados físicos e avaliar rotas de maior cobertura. Não altera preço, estoque, classificação sanitária ou liberação de transporte.

O lote revisado de cinco referências, 36 novos pesos, três refinamentos e três trincas de dimensões foi aplicado a 40 produtos distintos, após liberação da outra publicação, backup e planos operacionais conferidos. As novas inclusões do catálogo não ampliaram a lista revisada.

## Correção de títulos e proveniência

A política `weight-only-v4` corrige o bloqueio indevido de títulos explícitos como “zero álcool”, “sem álcool” e “sem perfume”. A negação é considerada apenas no nome, em categorias de higiene/nutrição já permitidas e com marca identificada. A categoria original e as outras guardas continuam sendo avaliadas.

Percentuais contraditórios, inclusive com pontuação como “sem álcool: 70%” ou “sem álcool (70%)”, continuam pendentes. Ocorrências positivas restantes, aerossóis, sprays, vidro, carga especial, kits e restrições de receita não são apagados pela frase negativa. O estimador legado `estimateBaseShipping` permanece intacto. Fórmulas de massa, reservas, dimensões nulas do cenário de peso e ausência de aprovação automática permanecem iguais.

O aplicador de médias reconhece auditorias v4, mantendo a comparação integral do rascunho atual com a auditoria original. Um peso manual, alterado ou sem proveniência não ganha permissão de refinamento por essa inclusão. As versões anteriores continuam aceitas.

## Unidade comercial e dados estruturados

As páginas capturadas permitem identificar o SKU principal sem executar o HTML. EAN exato, nome/apresentação, `measurementUnit:un`, `unitMultiplier:1` e os campos físicos da mesma ficha são examinados em conjunto. Isso ajudou a esclarecer duas referências Nivea antes pendentes de quantidade.

Na [documentação oficial VTEX](https://developers.vtex.com/docs/guides/orderform-fields), o multiplicador se aplica à quantidade comercial do SKU. Uma unidade pode ser frasco, kit ou pack; `un/1` sozinho não identifica o conteúdo interno ou distingue varejo de master. A [definição de SKU](https://developers.vtex.com/docs/guides/skus) também não certifica peso ou dimensões. Neste lote, a interpretação varejo exige a apresentação de frasco/tubo da mesma ficha e o GTIN correspondente. Continua sendo referência comercial provisória, sem medição ou aprovação de carga.

| GTIN | Fonte e apresentação | Peso declarado | Medidas físicas identificadas |
| --- | --- | --- | --- |
| 04005900004956 | [Nivea Soft Milk 400 ml](https://www.santaluciadrogarias.com.br/nivea-hidrat-soft-milk-400ml/p) | Bruto 439,42 g | Ausentes |
| 04005808555307 | [Nivea Sun FPS30 200 ml](https://www.santaluciadrogarias.com.br/nivea-sun-fps-30-loc-200ml-protect-hidrata--/p) | Bruto 230 g | Ausentes |
| 07891024135310 | [Colgate Fresh Mint 90 g](https://www.santaluciadrogarias.com.br/colgate-cr-dental-total-12-adv-fresh-90gr/p) | Bruto 110 g | Profundidade/largura/altura: 38 × 170 × 46 mm |
| 07891010973902 | [Listerine Zero Álcool 250 ml](https://www.santaluciadrogarias.com.br/listerine-zero-cool-mint-250ml/p) | Bruto 300 g | Altura/largura/profundidade aproximadas: 174 × 76 × 40 mm |
| 07891010800048 | [Johnson’s Baby shampoo 400 ml](https://www.santaluciadrogarias.com.br/sh-jj-baby-regular-400ml/p) | Líquido 400 g | Altura/largura/profundidade: 204 × 82 × 43 mm |

O peso líquido do Johnson’s não é promovido a bruto: os 650 g estimados existentes são preservados. Os demais cálculos mantêm os mesmos 100 g hipotéticos externos, sem duplicar reserva, e 2 cm totais de proteção hipotética por eixo com arredondamento em 0,5 cm. As propostas de pacote são Johnson’s 22,5 × 10,5 × 6,5 cm, Listerine 19,5 × 10 × 6 cm e Colgate 19 × 7 × 6 cm.

Os refinamentos previstos são 650 para 540 g no Soft Milk, 390 para 330 g no Sun e 220 para 210 g no Colgate. Listerine ganha cenário de 400 g. Os outros novos pesos usam a política existente: 20 cenários de higiene por conteúdo, nove líquidos orais e seis sólidos orais. Volumes finais e contagens identificados não são doses em mg ou concentrações. Quinze medicamentos foram publicados por outras frentes após o processamento anterior e ainda não tinham esses cenários; a mudança de negação não altera suas classificações.

## Outras rotas avaliadas

A CBS Médico Científica hospeda fichas logísticas Johnson’s com dados da unidade, DUN e caixa master separados: [shampoo 400 ml](https://cbsmed.com.br/wp-content/uploads/2022/11/002739.pdf), [lenços 48 unidades](https://cbsmed.com.br/wp-content/uploads/2022/11/002742.pdf) e [óleo 200 ml](https://cbsmed.com.br/wp-content/uploads/2022/11/002741.pdf). As três registram Master Data de 08/11/2018 e divergências entre peso unitário multiplicado e bruto master. São candidatos históricos para conferência; não foram importados ou usados para refinar pesos. A coincidência de dimensões do shampoo com a página comercial atual não demonstra medições independentes ou revisão de lote.

O Colgate Original tem três valores sem eixos identificados e EAN ausente no SKU estruturado; permanece fora do lote. O condicionador Baby Dove consultado não correspondia a cadastro neste snapshot e não originou produto novo. Nenhum bloqueio de acesso foi contornado.

Não foi comprovada API ou arquivo público consolidado apto a preencher todo o catálogo. A rota de escala continua sendo amostra do fabricante/distribuidor ou provedor com EAN, nível da embalagem, quantidade, bruto/líquido, unidades e eixos. As médias de [121](121-medias-logisticas-por-apresentacao.md) continuam restritas a apresentações comparáveis; NCM, foto e volume não determinam geometria.

## Verificações e operação

- Regressões RED/GREEN reproduziram os falsos bloqueios e a contradição com pontuação antes das correções. A proveniência v4 também falhou em RED antes da inclusão na lista de versões.
- Revisão independente aprovou o código após fechar o caso de percentual contraditório e conferiu os sete corpos/hashes, cinco fontes e prévia por produto.
- A execução fica vinculada ao SHA-256 da prévia congelada, aos resultados e às listas revisadas. Só os metadados do snapshot podem mudar; dez verificações em memória comprovaram rejeição de alterações nos pesos, medidas, evidências e alvos. A revisão operacional independente aprovou esse fechamento.
- Passaram 154 testes de frete/importadores, 491 de segurança, ESLint completo e TypeScript sem emissão.
- Auditorias completa e de produção: quatro alertas low e um moderate em `@react-email/render`, `deepmerge`, `fast-uri`, `html-to-text` e `react-email`; zero high/critical. Nenhuma dependência foi alterada.
- Os estimadores modificados são usados pelos CLIs. Não há mudança de interface, schema ou necessidade de reconstruir/reiniciar app e PostgreSQL.

Aplicação exige release real, novo snapshot dos alvos, código/fontes idênticos aos revisados, backup verificado, dry-runs sequenciais com hashes, CAS/auditorias e comparação integral posterior. Todos os resultados continuam estimados, desativados, sem revisão de transporte, referência ou serviços aprovados. Os dois perfis antes habilitados permanecem protegidos.

Artefatos privados em `outputs/rotas-logistica-v4-2026-10-28/`: capturas, metadados do SKU principal, plano congelado, testes e roteiros operacionais. Não versionar esses dados ou assumir resultado produtivo a partir da prévia.

## Resultado produtivo em 28/10

Após a publicação dos 37 itens pela outra frente e a liberação expressa da janela, a leitura própria confirmou o servidor limpo em `fc0c8d8`. O novo snapshot às 14h25 de São Paulo contém **2.815 cadastros não excluídos, 2.814 ativos e um rascunho**. Os 40 alvos estavam integralmente iguais ao corte da aprovação. A regeneração mudou somente os metadados do snapshot; resultados, listas, fontes e hash da aprovação permaneceram iguais.

O código `812b9c7` foi enviado e sincronizado no servidor, sem reconstruir o app. Backup custom, catálogo de restauração e SHA-256 foram verificados antes da escrita. Os importadores existentes rodaram com código idêntico ao revisado, imagem tools fixa e montagens somente de leitura, ADMIN ativo, CAS/auditorias e hashes dos novos dry-runs.

Foram importadas **cinco referências**, criados **36 cenários de peso**, refinados **três pesos** e preenchidas **três trincas**, exatamente conforme a prévia congelada. Acrescentaram-se 47 auditorias: 36 de peso, três de refinamento, três de pacote e cinco de evidências. O Johnson’s manteve 650 g; seu líquido declarado não virou bruto. Os cenários de volume/massa, reservas hipotéticas e perfis continuam explicitamente estimados.

A prova posterior confirmou preservação dos demais campos comerciais, de todos os perfis/evidências fora dos alvos e de `PackagingRecipe`. Repetições não encontraram novas gravações. Todos os alvos seguem desativados, sem revisão de transporte, referência ou serviços aprovados. O corte final tem **2.223 ativos com algum perfil, 591 sem perfil, 349 com peso e três dimensões e os mesmos dois perfis habilitados anteriores**. As inclusões comerciais e a conclusão dos dados físicos são contagens separadas.

Identidades, imagens e início de app/PostgreSQL permaneceram iguais. Saúde local e HTTPS responderam normalmente; a API de fretes ADMIN anônima respondeu 401. Nenhuma migration, mudança de configuração, reconstrução ou reinicialização foi realizada. Os resultados não comprovam pesagem ou encaixe atuais e não habilitam automaticamente envio nacional.

Prova integral, prévias congeladas, resultados, capturas e metadados ficam no diretório privado desta rodada. Backup de recuperação, somente no servidor: `/home/ubuntu/backups/wimifarma-br/logistics-v4-01a15b8f-20261028/`. O aplicador foi executado uma única vez e não deve ser repetido; novas rodadas precisam de fontes e planos próprios.
