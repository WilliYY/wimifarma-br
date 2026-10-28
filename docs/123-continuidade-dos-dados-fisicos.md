# 123 — Continuidade dos dados físicos por apresentação

## Objetivo e estado

Continuação autorizada em 28/10/2026 da preparação de [122](122-validacao-global-de-pesos-e-medidas.md). Priorizar bruto e dimensões da unidade comercial identificada pelo GTIN; usar as médias de [121](121-medias-logisticas-por-apresentacao.md) somente entre apresentações comparáveis. A eventual contratação de uma plataforma de cotação não comprova que ela forneça campos físicos.

Nesta etapa, **cinco referências foram importadas, quatro pesos refinados e três trincas de dimensões preenchidas em produção**. A aplicação ocorreu após revisão independente, liberação explícita da janela, backup verificado e novos planos sequenciais. Não houve alteração de código da aplicação, preços, estoque ou serviços de frete.

O snapshot somente de leitura de 28/10 às 12h11 de São Paulo contém 2.761 cadastros não excluídos, dos quais 2.760 ativos. O catálogo segue recebendo inclusões de outras frentes; esta contagem não é permanente.

## Referências aproveitáveis

| GTIN | Referência comercial | Massa declarada | Dimensões comerciais |
| --- | --- | --- | --- |
| 07890704808131 | [Nivea íntimo Natural 250 ml](https://www.santaluciadrogarias.com.br/nivea-sab-liq-intimo-natural-250ml/p) | Bruto 290 g; quantidade 1 | Não localizadas |
| 04005900116192 | [Nivea Q10 400 ml](https://www.santaluciadrogarias.com.br/nivea-q10-plus-loc-firmador-hidrat-400ml/p) | Bruto 450 g; quantidade 1 | Não localizadas |
| 04005900549266 | [Nivea Q10 pele extrasseca 400 ml](https://www.santaluciadrogarias.com.br/nivea-q10-loc-firmador-vitamina-c-hidrat-400ml/p) | Bruto 450 g; quantidade 1 | Altura/largura/profundidade 208 × 72 × 42 mm |
| 04005900036759 | [Nivea roll-on masculino 50 ml](https://www.santaluciadrogarias.com.br/nivea-des-rollon-masc-black---white-inv-power-50ml/p) | Bruto 74 g; quantidade 1 | Altura/largura/profundidade 107,9 × 40,2 × 40,2 mm |
| 04005808310999 | [Nivea Lotion Express 200 ml](https://www.esfera.com.vc/p/locao-deo-hidratante-nivea-lotion-express-48h-hidratacao-profunda-200ml/e100600850) | 200 g aproximados, natureza não especificada | Altura/largura/profundidade 181 × 61,2 × 36,4 mm |

São declarações de fichas comerciais, sem pesagem independente ou garantia de lote atual. Os 200 g da Esfera permanecem `unspecified`; não são promovidos a peso bruto. Os campos pertencem ao SKU principal, não a produtos relacionados. Corpos originais e descomprimidos, data, trechos e SHA-256 ficam no diretório privado desta etapa.

## Prévia dos rascunhos

As políticas existentes preservam a reserva hipotética de 100 g externos, sem somá-la novamente, e acrescentam 2 cm totais por eixo às dimensões comerciais, com arredondamento para cima em 0,5 cm. Essas reservas não são tara ou proteção medidas.

- Quatro pesos propostos: 460 para 390 g no íntimo; 650 para 550 g nas duas variantes Q10 400 ml; 200 para 180 g no roll-on.
- Três trincas propostas: 23 × 9,5 × 6,5 cm no Q10 extrasseca; 13 × 6,5 × 6,5 cm no roll-on; 20,5 × 8,5 × 6 cm no Lotion Express.
- O peso existente de 390 g do Lotion Express permanece preservado.

Todos os alvos continuam estimados, desativados, sem revisão de transporte, referência aprovada ou serviços aprovados. A caixa de 24 × 15 × 10 cm informada pelo lojista não é atribuída universalmente; as propostas não comprovam encaixe ou disponibilidade de embalagem real. A gravação de evidência não habilita cotação/postagem.

## Fontes separadas e limites da pesquisa

Soft Milk 400 ml e Sun FPS30 200 ml trazem bruto, mas não explicitam quantidade comercial 1 na ficha capturada; permaneceram fora deste lote. Q10 200 ml declara bruto igual ao líquido e exige confirmação. O esfoliante de GTIN correspondente aparece como 204 g no cadastro e 200 ml na fonte; não corrigir essa apresentação por inferência. A consulta Magalu retornou 403 e foi interrompida sem contorno.

Duas rodadas delimitadas, totalizando 18 buscas, não trouxeram bruto e três eixos utilizáveis para seis apresentações de enalapril/losartana e quatro de levotiroxina. Um campo `Peso 0.100000` sem unidade não foi convertido para 100 g; dimensões de imagens e valores de tabelas fiscais não foram tratados como dados físicos. Não encontrar uma ficha não prova inexistência do dado no fornecedor.

A consulta por respostas recebidas da GS1/Bluesoft no Gmail Wimi não localizou retorno nesta rodada; nenhuma nova mensagem foi enviada. O caminho em lote continua condicionado a amostra com GTIN, nível da embalagem, quantidade, bruto/líquido, unidades, eixos, origem e autorização de uso. Fotos, NCM, dose em mg e volume em ml não determinam dimensões.

## Verificação e operação

- Schemas, identidade, campos literais e hashes conferidos por `prepare-evidence.ts`.
- Revisão independente reproduziu os cálculos e conferiu os nove corpos capturados, incluindo oito originais gzip.
- Doze testes dos importadores de evidências, pesos e dimensões passaram.
- Dry-run produtivo de evidências: dois resultados `complete_reference` e três `partial`, todos `SAVE_EVIDENCE_ONLY`, `applied:false`; código operacional idêntico ao revisado.
- Antes de aplicar: aguardar release real, recapturar os alvos, conferir hashes, verificar backup e executar novos dry-runs. Depois: comparar integralmente campos/perfis/evidências e `PackagingRecipe`, conferir auditorias, idempotência e saúde dos serviços.

Artefatos privados: `outputs/continuidade-logistica-2026-10-28/`. Não versionar snapshots, capturas ou arquivos operacionais. Nenhuma migration, reconstrução ou reinicialização de app/PostgreSQL é necessária.

## Resultado produtivo em 28/10

A publicação de dez produtos pela outra frente terminou antes desta operação. O novo snapshot às 12h35 de São Paulo contém **2.771 cadastros não excluídos, 2.770 ativos e um rascunho**; os dois excluídos foram preservados. Os cinco alvos estavam integralmente iguais aos da revisão. A prévia foi regenerada com esse snapshot e manteve exatamente as quatro mudanças de peso e três trincas propostas.

Backup custom, catálogo de restauração e SHA-256 foram verificados em diretório restrito antes da escrita. Os importadores existentes foram executados com fontes de código idênticas às revisadas, imagem tools já disponível, ADMIN ativo, CAS/auditoria e hashes dos planos de peso/dimensões. Foram acrescentadas **cinco auditorias de evidência, quatro de refinamento de peso e três de pacote**. Os valores aplicados coincidiram com as prévias; o peso aproximado da Esfera não alterou os 390 g existentes.

A comparação integral comprovou preservação de todos os demais campos comerciais, perfis/evidências fora dos alvos e `PackagingRecipe`. Repetições não encontraram novas gravações. Os cinco alvos permanecem estimados, desativados e sem revisão de transporte ou serviços aprovados. No corte final há **2.187 ativos com algum perfil, 583 sem perfil, 346 com peso e três dimensões, e os mesmos dois habilitados anteriores**. O crescimento do catálogo e a evolução logística são contagens distintas.

Identidades, imagens e início do app/PostgreSQL permaneceram iguais. Saúde local e HTTPS responderam normalmente; a API de fretes ADMIN anônima respondeu 401. Não houve migration, reconstrução, recriação de serviços ou mudança de configuração. A fotografia técnica não comprova pesagem independente ou liberação nacional dos produtos.

Prova integral, planos, resultados e hashes permanecem no diretório privado da etapa. Backup de recuperação, somente no servidor: `/home/ubuntu/backups/wimifarma-br/logistics-continuation-01a15b8f-20261028/`. Não repetir o aplicador após este encerramento; uma nova rodada exige fontes e planos próprios.
