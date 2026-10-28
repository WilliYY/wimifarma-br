# 122 — Validação global de pesos e medidas

## Escopo em 28/10/2026

O lojista pediu continuidade e validação de todos os produtos. A conferência inclui cada cadastro não excluído, não apenas o lote anterior: identidade/GTIN, schema do perfil, origem declarada, peso/lados presentes, evidências, conflitos e comparação com bruto/dimensões varejistas documentados. Essa validação técnica e documental não é pesagem física, teste de encaixe ou autorização de transporte. Continua [121](121-medias-logisticas-por-apresentacao.md).

Snapshot produtivo às 11h02 UTC (08h02 de São Paulo): 2.746 cadastros não excluídos, sendo 2.745 ativos e um rascunho; dois excluídos ficam preservados. São 1.905 perfis estruturalmente válidos, todos explicitamente estimados: 343 completos, 1.442 somente com peso e 120 inteiramente vazios. Outros 841 não têm perfil. Nos ativos, há 342 completos e os mesmos dois habilitados anteriores; existe também um habilitado em produto rascunho. Validade estrutural não significa dado físico confirmado.

Não foram encontrados GTINs duplicados, divergências de normalização, perfis/evidências inválidos ou perfis abaixo de bruto/lados varejistas identificados, considerando rotação. Permanecem um GTIN ausente no Kit Kat de cadastro manual e quatro evidências conflitantes: clopidogrel, albendazol, Beneum e Colgate Plax Melancia. Nenhum EAN foi inferido pelo nome, nenhum conflito foi apagado e nenhum perfil aprovado foi alterado na auditoria. Fontes master, líquidas ou sem bruto explícito não servem para essa comparação.

## Política de peso `weight-only-v3`

A fila mostrou nomes comerciais abreviados com conteúdo claro, como `SUN PEH30 200ML`, mas sem palavras como shampoo/creme. A v3 aceita esse conteúdo somente com marca identificada, categoria não medicinal de higiene/dermo explicitamente reconhecida e uma única quantidade em ml/g. Para suplementos/nutrição, o novo caminho admite massa em g, não volume. As categorias são uma lista fechada; marca vazia/desconhecida e categoria genérica não bastam.

O reparo de fronteiras alfanuméricas (como `INF200ML` e `CREATINA300G`) vale somente nesse caminho não medicinal. A fórmula anterior permanece: volume × **densidade hipotética 1,3 g/ml**, ou massa declarada, mais **30 g hipotéticos de embalagem comercial e 100 g de proteção externa**, arredondados em 10 g. Não são médias medidas nem limites garantidos. Peso bruto exato do próprio GTIN continua prioritário e não recebe a reserva comercial outra vez.

Dose/porção, sachês/envelopes, pastilhas/tabletes/gomas/gummies e outras apresentações unitárias nutricionais ficam pendentes; não multiplicar a dose nem tratá-la como conteúdo total. Abreviações de aerossol, perfume e álcool conservam bloqueios. Kits, múltiplas quantidades, conteúdo ambíguo, carga especial e restrições sanitárias mantêm as guardas anteriores. Não se deduzem dimensões a partir de ml, g, dose ou NCM.

O aplicador padrão preserva qualquer perfil existente. Um modo separado `--fill-empty-weights` permite somente preencher peso nulo em rascunho explicitamente estimado/desativado/sem revisão, sem referência/serviços, com os três lados nulos e sem carga especial cadastrada. Não sobrescreve peso ou medidas e preserva chaves literais; é incompatível com `--refine-references`. A auditoria registra perfil anterior, política, plano e ação. No snapshot inicial, esse modo não encontrou candidatos: os 120 vazios, majoritariamente fraldas, não ganham peso inventado a partir da contagem.

As médias de 121 passam a reconhecer a auditoria íntegra da v3, mantendo comparação integral com o perfil atual antes de qualquer refinamento. Valores arbitrários, editados ou protegidos permanecem preservados. A prévia inicial encontrou 282 novos cenários de peso, antes de eventuais publicações de outras frentes e da importação das duas fontes abaixo; ainda não é resultado aplicado.

## Novas referências por EAN

- Nivea Kids 150 ml, GTIN 04005808516667: [Santa Lúcia](https://www.santaluciadrogarias.com.br/nivea-sun-kids-fps-60-loc-150ml-swin-play--/p), bruto explícito de 185 g, altura/largura/profundidade 159 × 50 × 78 mm, uma unidade. Referência completa, sem confirmação de lote atual ou pacote de expedição.
- Nivea Leite de Limpeza + Tônico 200 ml, GTIN 04005808569878: [Santa Lúcia](https://www.santaluciadrogarias.com.br/nivea-leite-de-limpeza---tonico-200ml--/p), altura/largura/profundidade 180 × 37 × 59 mm. O valor 227 g aparece sem natureza explícita e continua `unspecified`; não vira bruto. Referência parcial.

Corpos HTML e hashes foram preservados e conferidos, incluindo descompressão da primeira resposta. Os dois GTINs correspondem a cadastros ativos únicos. Goiás redirecionou à página inicial e Nimbi apresentou dados internos contraditórios: essas fontes ficaram fora do lote. As duas observações aceitas são referências comerciais, com `confirmed:false`, e não alteram aprovação de embalagem/serviço.

Uma rodada adicional em quatro fontes de fraldas não produziu referência apta: São João identificou Pampers P72/XXG56, mas sem bruto/três lados; Huggies G58 apresentou pesos divergentes entre resultados encontrados; M66 trouxe valores aproximados repetidos de 123 mm nos três eixos, sem corroboração. Corpos/hashes e limitações foram preservados, inclusive a distinção entre página capturada e oferta somente indexada. Não se fez média de dados contraditórios nem se confundiram dimensões de imagem/layout com embalagem. O lote de fraldas permanece vazio.

## Verificação e operação

Revisão independente corrigiu as confusões entre conteúdo, dose/porção e massa de apresentação unitária; 31 testes direcionados e ESLint dos arquivos revisados passaram. PostgreSQL 17.9 isolado passou 16 verificações sintéticas de ADMIN/hash, fonte alterada, v3, preenchimento vazio, preservação, idempotência, auditorias e rollback real no segundo CAS/segunda auditoria, com sequências comprovando execução anterior à reversão. Recursos exclusivos do QA foram removidos.

No candidato final passaram 140 testes de frete, 491 de segurança e TypeScript; o ESLint completo também passou. Auditorias completa e de produção retornaram os mesmos cinco alertas de dependência (quatro low e um moderate, sem high/critical) em `fast-uri` e na cadeia de renderização de e-mail, sem alterações de dependência neste escopo. Não se ocultam esses alertas nem se declara o projeto invulnerável.

Aplicação produtiva exige janela livre, backup verificado, revisão do lote de evidências, novos dry-runs com hashes e comparação integral posterior. Pesquisa e edição local continuam durante a janela reservada por outra frente; não fazer pull/deploy ou alterar produtos/receitas nessa janela. Não há migration, nova dependência ou necessidade de reconstruir app. Provas privadas e auditoria por cadastro: `outputs/validacao-global-logistica-2026-10-28/`.
