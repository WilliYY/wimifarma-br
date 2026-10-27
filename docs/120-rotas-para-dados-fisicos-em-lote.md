# 120 — Rotas para dados físicos em lote

Pesquisa de 27/10/2026 para continuar a preparação dos pesos de [119](119-comparacao-e-refinamento-dos-pesos.md). Esta etapa não altera código de cálculo, pesos, perfis, preços, estoque ou serviços. O objetivo é selecionar um canal com cobertura e semântica verificáveis, evitando escalar buscas avulsas sem dados suficientes.

## Prioridade operacional

1. **Fabricante/distribuidor ou GS1 Provider:** obter dados físicos da apresentação comercial exata, com GTIN, bruto/líquido, unidades e nível da embalagem. A origem é preferível a inferir pelo nome/NCM; compartilhar dados na GS1 é opcional e a presença do GTIN não garante campos físicos completos. A consulta institucional continua aberta, sem contratação. [GS1 Provider](https://portalapi.gs1br.org/pageApiProvider), [FAQ](https://portalapi.gs1br.org/pageFaq).
2. **Cosmos como piloto condicionado:** a documentação oficial expõe `gross_weight` e `net_weight` e exige autenticação `X-Cosmos-Token` e `User-Agent` da conta. O exemplo consultado não explicita unidade do peso, nível da embalagem ou proveniência da medição. Esses pontos, cobertura, licença de cache/uso, preço e limites precisam ser confirmados antes de mapear ou importar. Uma promoção indexada de plano Basic não comprova as condições comerciais vigentes; a página de preços/termos retornou 403. [Documentação oficial](https://cosmos.bluesoft.com.br/api/).
3. **Integrações comerciais:** exigir uma amostra/exportação dos campos físicos antes de escolher plataforma de cotação/compra como fonte de logística. Catálogo, EAN, preço e disponibilidade não comprovam fornecimento de peso bruto/dimensões. Consultas comerciais e mensagens privadas permanecem somente em `outputs`, sem publicação de corpos, contatos ou condições.
4. **Conferência física para lacunas:** calibrar caixa/proteção reais por receita e obter massa da unidade comercial fechada. Compartilhar receita/geometria somente entre apresentações compatíveis confirmadas; peso de conteúdo, frasco, tampa e blíster continua específico. Não tratar reserva externa de 100 g como tara medida ou dose de comprimido como peso bruto.

## Rota que ainda não está pronta

[ConsultaProdutos API](https://consultaprodutos.com.br/api) anuncia publicação futura de endpoints/autenticação. O exemplo Bearer consultado não documenta peso/unidade; não foi comprovado um contrato operacional adequado à importação. Os [termos](https://consultaprodutos.com.br/termos-de-uso) direcionam uso programático/em lote à API. Consulta pública em tela não equivale a permissão para varrer milhares de páginas.

Não foi comprovada uma rota gratuita, anônima e em lote com todos os campos necessários. Nenhum cadastro, plano, token ou contratação foi criado. Não houve chamadas autenticadas de produto ou piloto de cobertura; resultados de provedores sem acesso não são tratados como integração pronta.

## Pesquisa adicional primária

Doze buscas em fabricantes/distribuidores não produziram observação elegível nova. DPC publicou campos de peso/dimensões sem valores; páginas/documentos Cottonbaby retornaram 403; páginas Goiás Atacado estavam bloqueadas por robots. Dois resultados indexados trouxeram leads de 0,280 kg e 0,100 kg para GTINs Cottonbaby, mas sem natureza bruta definida e sem documento acessível para captura/hash. Não foram importados nem promovidos a peso bruto da unidade. Nenhum bloqueio foi contornado, e Martins não recebeu novas tentativas após o 429 anterior.

Pesos em resultados de busca e campos sem unidade/nível são pistas, não base suficiente para liberar cotação. Hash do HTML comprova integridade da captura, não precisão física ou atualidade da embalagem.

## Piloto concreto preparado

`outputs/rotas-pesos-2026-10-27/amostra-10-gtins.json` reúne quatro controles documentais e seis pendências de apresentações diferentes: medicamento, lenços, cosmético, aerossol, absorvente e nutrição. GTINs têm checksum validado, são únicos e correspondem ao catálogo. Os valores de referência de controle ficam separados, para não induzir a resposta da fonte. São declarações documentais; não pesagens independentes nem garantia de embalagem atual.

Solicitar para cada GTIN: encontrado/ausente, apresentação, bruto/líquido com unidade, unidade comercial/master/volume protegido e quantidade por nível, origem/data/revisão, dimensões opcionais, formato/canal seguro, custo/cota e licença de uso/cache. Verificar cobertura, unidades, identidade, conflitos e embalagem antes de qualquer importação; não converter silenciosamente valores decimais em kg nem dividir peso master.

Os dez GTINs foram enviados como complemento ao mesmo contato GS1 previamente autorizado, sem dados de clientes, receitas, preços/estoque da farmácia ou código. Envio conferido em Enviados. Não houve adesão/contratação. **Zero novos pesos validados nesta rodada**; a amostra foi preparada/enviada, mas a cobertura ainda não foi testada com respostas de produto.

## Evidências e próximos desbloqueios

Pesquisas e capturas oficiais com hashes, leads, amostra, controles separados, roteiro e comprovação do envio: `outputs/rotas-pesos-2026-10-27/`, ignorado pelo Git. Não há nova migration, dependência, reconstrução de aplicação ou mutação produtiva. Acesso autorizado, amostra do fornecedor e definição dos campos/licença são os próximos desbloqueios; até lá os rascunhos e pendências de 119 mantêm sua classificação.
