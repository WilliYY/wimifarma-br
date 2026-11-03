# Pendentes do catálogo e referências físicas — 03/11/2026

Foram incluídos **20 produtos DRAFT e 20 auditorias** em 03/11/2026, às **09h42 de Brasília** (12:42 UTC). São seis OTHER, nove HYGIENE e cinco PERFUMERY, com acréscimo de **35% sobre o custo final GAM**. Esta frente soma 68 inclusões comprovadas nas operações 29 + 19 + 20. A contagem não inclui as operações de outras conversas nem representa o total da loja.

## Coorte e fontes comerciais

A rodada reconciliou os 58 cuidados pendentes com 46 apresentações históricas da outra frente. O GTIN de caixa Colorama `17899026422312` permaneceu separado, sem conversão para EAN de unidade; dois EANs já consumidos nos 19 anteriores também foram retirados. Restaram 101 candidatos únicos. A consulta atual ao PostgreSQL em todos os estados confirmou sua ausência antes da coleta e preservou os 48 cadastros anteriores.

A coleta GAM terminou com 102 tarefas, incluindo um controle positivo: 39 resultados, 63 `not_found` e zero erros. Dos 38 candidatos com resultado, 37 tinham EAN observado exato e um apenas EAN candidato. A revisão independente aprovou 20 para DRAFT e manteve 18 retidos por identidade, embalagem, massa, variante ou classificação. Busca sem resultado não comprova ausência global ou estoque zero.

Os cinco casos de embalagem destravados preservam os custos inteiros: atadura Cysne com seis rolos, Buba com 25 sacos, tornozeleira e joelheira Mercur em pares e calcanheira Baruel em par. A capacidade dos sacos Buba, conflitante entre referências de 200 e 250 ml, foi omitida do nome aprovado. Phebo Alfazema foi incluído como pacote de 12 barras de 100 g após vincular a apresentação ao SKU comercial GAM; não houve divisão de custo. O kit Colgate foi corrigido para enxaguante de 500 ml e creme de 70 g, conforme a referência autoral e a observação atual.

Controles complementares: ANB retornou preço, porém com EAN somente candidato; DM interrompeu por `PORTAL_LAYOUT_CHANGED / SEARCH_ACTION_UNAVAILABLE`; Profarma não encontrou o controle nesta tentativa. Esses resultados não foram promovidos a ofertas exatas nem interpretados como ausência geral dos produtos.

## Peso e medidas para preparação do Mercado Livre

A pesquisa documental cobriu as coortes dos 48 cadastros anteriores e dos 101 candidatos, preservando URLs, identificação por EAN, natureza do dado, unidades, eixos, datas e conflitos.

- Coorte de 48: dez referências comerciais completas, 26 parciais e 12 sem físico aproveitável.
- Coorte de 101: entre 31 pesquisados, quatro referências comerciais completas, duas com quatro dados porém divergência de apresentação, 21 parciais e quatro sem físico útil. Outros 64 não foram priorizados por falta de oferta exata e seis Nazzo/Sorine ficaram adiados.
- São 14 referências completas da embalagem comercial nas duas coortes. Limitações de acesso direto, fontes históricas e conflitos continuam identificados nos relatórios.

Peso líquido, conteúdo em ml e massa de componentes não foram convertidos em peso bruto. Dados de produto, unidade comercial, caixa externa e pacote de envio permanecem separados. Nenhum pacote final protegido foi registrado como medido, nenhum perfil de transporte foi habilitado e nenhum anúncio foi criado no Mercado Livre. Os quatro medicamentos da primeira coorte permanecem separados dos candidatos ao marketplace.

Os 20 produtos novos mantêm estoque físico cadastrado em zero, sem SupplierCatalogOffer, fotos, logística, cashback ou WimiCoins. Flags e capturas da fonte foram preservadas; não representam disponibilidade comprável atual. A pesquisa física está nos artefatos documentais, não foi aplicada ao banco como medição.

## Verificação e execução

O executor privado aceita lotes de 1–50 produtos, com quantidade ligada ao manifesto/configuração. Mantém schemas normais, ADMIN ativo confirmado na transação, deduplicação de GTIN/aliases em todos os estados, autorização delimitada e auditoria atômica. O histórico consumido dos 19 permaneceu em 19, com fingerprint e recibo próprios.

Passaram 16 testes do adaptador, 15 do executor e nove do controle, além de lint e typecheck focados. Os 13 casos reais de PostgreSQL passaram com N20, incluindo dois ADMINs, replay, aliases arquivados/excluídos, falha na última auditoria e visitas concorrentes. Quatro provas verificaram as 39 tabelas dentro da mesma transação Serializable; o ensaio terminou com zero produtos e auditorias persistidos.

A fonte imutável do APP `634233d45aae10086ba008c91798e39cf3f95584` passou nos **558 testes de segurança**. Auditoria completa: três baixos e 17 moderados; produção: três baixos e quatro moderados; zero altos ou críticos em ambas. A primeira cópia incompleta do lançador de segurança falhou antes dos testes; o arquivo completo corrigido passou em sintaxe e a suíte foi executada integralmente.

Após revisão independente dos dados, código, configuração e provas, houve backup custom verificado, concessão exclusiva por mutex/CAS, baseline observacional, dry-run sem gravação, aplicação única e releitura. A preservação de registros anteriores é comprovada na própria transação; diferenças externas de tráfego são observacionais e não são atribuídas à operação.

A aplicação foi confirmada às 09h42min32s de Brasília. A verificação confirmou 20 DRAFT e 20 auditorias. Home e health responderam 200, e as 20 páginas DRAFT, 404. A janela terminou `completed_released`, sem concessão ativa ou aplicação incerta, às 09h43min44s. A QA própria, OID 221493, foi removida às 09h43min53s após conferir proprietário, nonce, dados sintéticos e ausência de conexões, sem `FORCE`.

Comandos operacionais: produtor puro com `node --import tsx`, lint/typecheck e testes direcionados, `npm run test:security`, `npm audit --package-lock-only` e `--omit=dev`; controle privado nas fases backup → grant → baseline → dry → apply → verify → public → release → cleanup. Não houve alteração versionada de código da aplicação, schema, usuários, credenciais ou permissões por esta frente.

## Evidências privadas e continuidade

Operação consumida: `wimifarma-pendentes-cuidados-v3-20261103-b01`. Não reaplicar.

- Configuração: `63b4da57b965927449c174e1d4e827ccc9b6f639dd0020585755ececa5e8125c`.
- Manifesto bruto: `d6375f9d2c9a92a2e49ed281b57318f530a95b41452d7978163ac625785c0ef1`.
- Manifesto normalizado: `73c093ebd5c283ea543def45cb49dbb3466e0660e7cbc4520eef94931dfdfc30`.
- Produção: `282d9fba21f7ac9010c23a799ded22945f2cc791ed8ee622125508ed78c62449`.
- Visibilidade pública: `45a27dea22e2cb4639574a28862a314ff1e0a279bcbe384c79fa15ad79003f2e`.
- Encerramento: `f050150f8208603e1d42cd57cddcaa3e1ca72d9be50f74faad97bae4de6846e2`.
- Limpeza QA: `27879c17d27961a472940c007ca50afd6a23de03a3a67e393a0d9ab52609d437`.

Relatório individual: `D:\Codex-outputs\wimifarma-br\cuidados-v3-b01-2026-11-03\RELATORIO-20-CADASTRADOS-v3-b01.json`. Pesquisa comercial e retenções: `D:\Codex-outputs\wimifarma-br\pendentes58-2026-11-03-v2\`. Referências físicas: `D:\Codex-outputs\wimifarma-br\peso-medidas-sites-2026-11-03-v2\`, inclusive subpasta `pendentes101\`. Custos, capturas, código operacional privado, logs e backup não são versionados.

As 18 retenções, as 63 buscas GAM sem resultado e o GTIN de caixa separado continuam pendentes nesta coorte. Novas fontes exigem identificação da apresentação, custo, deduplicação e revisão atuais; o mesmo canônico não comprova que o banco permaneceu inalterado. Fotos, elegibilidade sanitária, pacote protegido e condições de marketplace continuam sujeitos às conferências correspondentes.
