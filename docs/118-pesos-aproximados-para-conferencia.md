# 118 — Pesos aproximados para conferência

## Escopo autorizado em 27/10/2026

O lojista autorizou iniciar conversões e pesos aproximados para adiantar a conferência. Esta etapa gera **cenários de planejamento**, sem afirmar pesagem, densidade, tara, dimensões, encaixe ou aceite de transportadora confirmados. Complementa [115](115-evidencias-logisticas-e-receitas.md) e [117](117-rota-dados-logisticos-e-frenet.md). A aproximação não é gravada como evidência documental e não habilita frete.

`estimateWeightOnly`, em `base-estimate.ts`, reutiliza identidade e bloqueios existentes. O estimador legado `estimateBaseShipping` não muda; seus rascunhos e todos os demais perfis já existentes são preservados. O novo caminho preenche somente perfis inicialmente nulos, com `measurementBasis:estimated`, `enabled:false`, `transportReviewed:false`, referência nula e três dimensões nulas. A API/painel existentes já aceitam esse contrato parcial. Não há migration, dependência, mudança de checkout ou nova ativação de serviço.

## Política explícita `weight-only-v1`

| Caso identificado | Hipótese utilizada antes da reserva externa |
| --- | --- |
| Peso bruto explícito de unidade comercial por GTIN | Prioriza o valor da fonte vigente; não acrescenta reserva comercial novamente |
| Sólido oral comum, 1–120 comprimidos/cápsulas/drágeas | Quantidade × **1,5 g por unidade inteira** + **30 g** de reserva comercial; arredonda a unidade comercial para cima em 10 g |
| Volume de higiene ou líquido oral identificado | Volume normalizado em ml × **1,3 g/ml hipotético** + **30 g** de reserva comercial |
| Massa declarada de higiene ou tópico identificado | Conteúdo normalizado em g + **30 g** de reserva comercial |

Todos acrescentam **100 g de reserva externa estimada** para caixa/proteção e arredondam o total para cima em 10 g. As reservas de 30/100 g e o fator 1,5 g não resultam de pesagem; 1,3 g/ml não é densidade observada nem teto garantido. São hipóteses operacionais centralizadas no código, para uma unidade protegida. A reserva comercial contempla recipiente, tampa, blíster/cartucho; não é apenas o papel. A caixa real de 24 × 15 × 10 cm continua sem tara medida. A reserva externa não deve ser somada novamente sobre o perfil.

Exemplos do cenário: 30 comprimidos comuns resultam em 180 g; shampoo 200 ml, 390 g; shampoo 400 ml, 650 g; suspensão oral com 60 ml declarados, 210 g. Esses valores **não são pesos reais desses produtos**, garantias de limite superior ou autorização para postagem.

Conversões entre kg/g e L/ml são de unidade. Passar de volume para massa exige densidade: [definição NIST](https://www.nist.gov/glossary-term/21726). A densidade adotada no cenário é uma hipótese, não uma conversão universal. A dosagem mg/mcg do medicamento não representa massa do comprimido inteiro. Concentrações como `250 mg/5 ml`, `10 g/100 g`, `1 g/g` e `20 mg por 5 ml` são removidas antes de buscar o conteúdo da embalagem; sem conteúdo separado, o caso permanece pendente. Combinações explícitas de dosagens mg + mg podem ser reconhecidas sem serem somadas ao peso.

Kits/multipacks, alternativas de tamanho, contagens ambíguas/negativas, unidades fora dos limites, efervescentes/mastigáveis, vidro explícito, aerossóis, perfumes, álcool, injetáveis, cadeia fria, controlados e classificações não elegíveis permanecem pendentes neste caminho. Ausência de resultado não significa impossibilidade de obter dados reais. Evidência divergente, malformada ou de outro GTIN também bloqueia a estimativa. Peso master, líquido ou sem natureza não é promovido a bruto explícito.

## Aplicação auditada em lote

`scripts/apply-product-weight-drafts.ts` recebe um array JSON privado de GTINs normalizados, únicos e válidos (até 5.000, arquivo até 1 MB). Não aceita pesos arbitrários do arquivo: calcula novamente pelos dados atuais do produto e pela política versionada. Exige ADMIN ativo dentro da transação, lock do catálogo, correspondência única, status ativo e revisão otimista. O dry-run não grava e retorna SHA-256 do plano completo, incluindo revisão e hipóteses. O apply exige esse mesmo hash; qualquer mudança cancela a aplicação antes das gravações.

```text
node --import tsx scripts/apply-product-weight-drafts.ts --input <GTINs.json> --actor-id <ADMIN>
node --import tsx scripts/apply-product-weight-drafts.ts --input <GTINs.json> --actor-id <ADMIN> --apply --expect-plan <SHA-256-do-dry-run>
```

As únicas gravações são `shippingProfile`, `updatedAt` automático e auditorias `PRODUCT_WEIGHT_DRAFT_ESTIMATED` na mesma transação. Perfis existentes, inclusive estimados, são preservados. Preços, estoque, ofertas, evidências, cadastros sanitários e configurações de serviço não mudam. Falha de CAS ou auditoria reverte o lote. Repetição preserva os perfis sem nova gravação; uma nova aplicação ainda exige o hash do novo dry-run.

Dados, nomes, GTINs, planilha de conferência, planos e provas ficam em `outputs/pesos-aproximados-2026-10-27/`, ignorado pelo Git. O CSV é auxiliar de conferência; hipóteses permanecem discriminadas. Importação em produção exige backup, revisão, prova transacional isolada e comparação dos campos preservados. Esta documentação descreve o contrato; o resultado produtivo deve ser registrado separadamente após a aplicação.

## Validação do candidato

Revisão independente aprovada. Passaram 131 testes de frete, o teste do aplicador, 491 testes de segurança, ESLint completo e typecheck. A auditoria de produção não tem high/critical; a auditoria completa mantém um alerta moderado preexistente em `fast-uri`. Sem atualização de dependências.

PostgreSQL 17.9 isolado, rede interna sem portas e dados somente sintéticos: dez verificações comprovaram dry-run sem gravação, ADMIN inativo/hash divergente, gravações restritas, preservação de perfil existente e repetição sem auditorias novas. Falha na segunda auditoria e CAS zero no segundo produto reverteram integralmente a primeira atualização/auditoria; sequências não transacionais confirmaram que essas etapas haviam sido executadas. CAS foi provocado por trigger, sem corrida entre sessões. Os recursos exclusivos foram removidos após conferência dos labels. Provas `qa-postgres-result.json` e `qa-postgres-report.md` na pasta privada indicada acima.

O snapshot e o dry-run produtivo identificaram 1.449 candidatos em 2.738 ativos, com 397 perfis existentes preservados e 892 pendências. A comparação item a item confirmou igualdade entre as propostas offline e o plano recalculado na base. São 717 sólidos orais, 403 volumes de higiene, 237 massas de higiene, 77 líquidos orais, oito tópicos em massa e sete referências de peso bruto explícito. Esses números representam propostas de peso, não novas referências medidas ou produtos liberados para transporte.

## Aplicação produtiva concluída

Código `6dd6022` enviado ao GitHub e atualizado no servidor. A primeira tentativa parou no controle de janela, antes de qualquer gravação, pois outra frente tinha publicação concedida. Após a liberação, backup e baseline foram renovados para incluir os sete produtos publicados por essa frente. O plano recalculado manteve exatamente o SHA-256 revisado `d8b7d24aa5a8bb2ec60dd4326ffc6d37039f9984f706da5e5aa274c1742d2c2a`.

Aplicados **1.449 rascunhos e 1.449 auditorias**, todos desativados, sem revisão e com dimensões nulas. A repetição preservou os 1.449 perfis sem nova gravação. Hashes dos demais campos dos produtos, incluindo evidências, e de todos os perfis anteriores permaneceram iguais ao baseline renovado. Contagem após o lote: **2.745 ativos, 1.846 com perfil, 899 sem perfil e somente os dois perfis habilitados anteriores**. O acréscimo de sete produtos não pertence a esta importação.

App e PostgreSQL mantiveram identidades, imagens e início, sem reconstrução/recriação. Saúde local/HTTPS respondeu 200 e a API administrativa recusou anônimos com 401. A operação utilizou a imagem tools previamente validada com as fontes revisadas montadas somente para leitura e hashes conferidos; não houve migration ou reconstrução Next.js. Backup custom com listagem/hash verificados e permissões restritas em `/home/ubuntu/backups/wimifarma-br/weight-drafts-after-mip7-01a15b8f-20261027/`.

Provas locais: `production-proof.json`, `production-idempotency.json`, `production-dry-run.json`, `review-comparison.json`, resultados do QA isolado e logs de validação na pasta privada desta etapa. Pendências: conferir pesos físicos, medir tara/embalagem/encaixe, obter dimensões e serviços aceitos; analisar os 899 produtos ainda sem perfil e revisar os rascunhos históricos separadamente. Esta importação não resolve essas pendências nem aumenta o número de envios habilitados.
