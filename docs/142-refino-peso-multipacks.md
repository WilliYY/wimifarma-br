# 142 — Refinamento explícito do peso estimado de multipacks

## Escopo — 04/11/2026

O modo `--refine-multipacks <manifest.json>` de
`scripts/apply-product-weight-drafts.ts` trata apresentações comerciais de creme
dental com quantidade e massa líquida por tubo identificadas. Complementa a
comparação documental de [119](119-comparacao-e-refinamento-dos-pesos.md), sem
substituir a prioridade da referência bruta documental própria do GTIN.

Quatro rascunhos históricos estavam abaixo do próprio conteúdo líquido nominal
do conjunto. O quinto já estava acima do líquido, mas precisava de refinamento
explícito para considerar todos os tubos e reservas de embalagem. Os números
abaixo são estimativas autorizadas, aplicadas no lote limitado de 04/11/2026.
A conferência produtiva e seus limites estão registrados ao final.

| GTIN-14 | Apresentação comercial | Peso estimado anterior | Líquido total | Novo peso estimado |
| --- | --- | ---: | ---: | ---: |
| 07500435249720 | Oral-B 3D White, 6 × 70 g, cadastro L6P4 | 200 g | 420 g | 700 g |
| 07500435122788 | Oral-B 4em1 Menta, 6 × 70 g, L6P5 | 200 g | 420 g | 700 g |
| 07891024042984 | Colgate Sensitive Pró-Alívio, 3 × 90 g, L3P2 | 220 g | 270 g | 460 g |
| 07896015592042 | Sensodyne Rápido Alívio, 3 × 90 g, L3P2 | 220 g | 270 g | 460 g |
| 07896015521462 | Sensodyne Branqueador Extra Fresh, 3 × 50 g, L3P2 | 180 g | 150 g | 340 g |

“Pague” descreve a promoção e não reduz a quantidade física “Leve”. No primeiro
GTIN, a divergência L6P4/L6P5 entre textos comerciais permanece registrada; as
fontes concordam em seis tubos. Não se altera nome ou cadastro para resolver a
divergência promocional.

## Fontes e limites físicos

A consolidação privada `sources-evidence.json` fica em
`D:/Codex-outputs/wimifarma-br/pesos-multipacks-2026-11-04/`. Contém um `evidenceId`
por GTIN, URL, apresentação, quantidade, conteúdo líquido, comparação histórica,
limitações e SHA-256 dos arquivos reais preservados em 03/11.

- [Martins, Oral-B 3D White 6×70 g](https://www.martinsatacado.com.br/produto/creme-dental-oral-b-3d-white-6x70g-martins_207501),
  corroborado pela Cardeal, sustenta os seis tubos do GTIN 7500435249720.
- [Goiás, Oral-B 4em1 L6P5](https://www.goiasatacado.com.br/creme-dental-oral-b-70g-4em1-leve-6-e-pague-5-33201-1)
  foi preservado como evidência indexada em 03/11, corroborada por descrição de
  varejo. Naquela coleta direta, a resposta trouxe a página inicial. O campo
  genérico **Peso 0,530 kg é ambíguo**, sem rótulo inequívoco de bruto; não foi
  adotado como peso bruto confirmado nem usado no cálculo deste modo.
- [Jaú Serve, Colgate Sensitive 3×90 g](https://www.jauserve.com.br/7891024042984.html)
  declara três unidades de 90 g e o mesmo EAN; a descrição indexada da DPC
  corrobora a apresentação.
- [Martins, Sensodyne Rápido Alívio 3×90 g](https://www.martinsatacado.com.br/produto/creme-dental-sensodyne-rapido-alivio-3x90g-martins_208785)
  explicita o pack de três. **Caixa com 12 é master separado**, não a quantidade
  de tubos desse pack. A Riograndense separa PC 1, GTIN 7896015592042, de CX 12,
  GTIN 27896015592046. Não se divide peso ou dimensão do master para inventar
  medida de tubo ou pack.
- [Martins, Sensodyne Branqueador 3×50 g](https://www.martinsatacado.com.br/produto/creme-dental-sensodyne-branqueador-extra-fresh-50g-embalagem-com-3-unidades-martins_202145)
  e o varejo Farmácias MB corroboram três tubos de 50 g. O campo genérico “Peso
  50 g” não representa bruto do kit; o líquido calculado do conjunto é 150 g.

Os arquivos preservados são relatórios de pesquisa e a proposta offline, não
corpos HTML originais. O campo `sha256` de `manifestSource`, quando usado, aponta
para os bytes do relatório identificado no artefato; não certifica os bytes da
resposta HTTP da URL. O `evidenceId` associa explicitamente o GTIN a essa
proveniência. Metadados de HTTP 200 de 04/11 para Jaú Serve e Martins Rápido Alívio
ficam separados como informação de coordenação, sem substituir o hash preservado
nem comprovar novamente o conteúdo físico.

Não foi localizada nessas pesquisas ficha inequívoca do fabricante com bruto e
dimensões da unidade comercial exata. Não houve pesagem. Conteúdo líquido não é
peso bruto; as reservas abaixo não são taras medidas, médias estatísticas ou
limites garantidos de expedição.

## Política estimada

`dental-multipack-weight-v1` calcula:

```text
líquido total = quantidade de tubos × massa líquida por tubo
reserva comercial hipotética = quantidade de tubos × 30 g
reserva externa hipotética = 100 g
peso estimado = ceil((líquido total + reserva comercial + reserva externa) / 10) × 10 g
```

Assim, 6×70 g resulta em 420+180+100 = 700 g; 3×90 g, em 270+90+100 = 460 g;
3×50 g, em 150+90+100 = 340 g. A reserva externa entra uma única vez. A proposta
não acrescenta outra caixa ao resultado e não converte mL em g.

Somente `shippingProfile.weightGrams` pode mudar. Os perfis históricos de oito
chaves conservam literalmente `lengthCm:25`, `widthCm:15`, `heightCm:10`,
`enabled:false`, `transportReviewed:false`, `measurementBasis:"estimated"` e
`reference:null`. As dimensões continuam estimadas, sem confirmação de encaixe
ou caixa real. Chaves legadas ausentes, como `approvedServiceIds` e `cargoKinds`,
não são acrescentadas. Nenhum serviço ou transportadora é habilitado.

## Manifesto e aplicação conservadora

O manifesto estrito usa `version:1` e `entries`. Cada entrada informa `gtin`,
`productId`, `expectedName`, `expectedUpdatedAt`, `expectedProfile`,
`packageQuantity`, `unitNetGrams`, `sources` e `justification`. Cada fonte contém
URL HTTPS, o mesmo GTIN e a mesma apresentação, com hash ou identificador de
evidência preservada. IDs e GTINs não podem repetir; o input deve corresponder
exatamente às entradas. Nome, revisão e perfil esperado vêm de snapshot atual
vinculado, nunca da proposta histórica de 03/11.

O modo é opt-in e incompatível com `--refine-references` e `--fill-empty-weights`.
O comportamento padrão do estimador permanece preservado. Exige ADMIN ativo,
lock de catálogo, revisão CAS, hash do plano e auditoria transacional. Somente
produtos ativos e não excluídos, sem exigência de receita/Farmácia Popular, com
apresentação elegível de creme dental e rascunho estimado, desativado, sem revisão,
sem referência ou serviços aprovados podem ser refinados. Perfil protegido,
agrupamento master ou apresentação ambígua não autoriza escrita. Na operação
limitada dos cinco IDs, a guarda também exige `logisticsEvidence:null`; hold de
logística não autoriza escrita nessa operação.

O `expectedProfile` é comparado como JSON literal, preservando todas as chaves.
O cálculo deve aumentar o peso; igualdade ou peso já maior preserva o existente.
Repetição com o mesmo perfil já refinado preserva o resultado sem novas escritas.
Na aplicação, cada revisão ainda deve corresponder ao dry-run; falha de CAS ou
auditoria cancela a transação inteira. A auditoria
`PRODUCT_MULTIPACK_WEIGHT_DRAFT_REFINED` registra `previousProfile`, `draft`,
`planSha256`, conteúdo, reservas, fontes, justificativa e base estimada.

```text
node --import tsx scripts/apply-product-weight-drafts.ts --input <GTINs.json> --actor-id <ADMIN> --refine-multipacks <manifest.json>
node --import tsx scripts/apply-product-weight-drafts.ts --input <GTINs.json> --actor-id <ADMIN> --refine-multipacks <manifest.json> --apply --expect-plan <SHA-256-do-dry-run-revisado>
```

Esses comandos documentam o contrato; não substituem a operação guardada. Antes
de qualquer aplicação produtiva: renovar snapshot, pins APP/PG, HEAD limpo,
canonical fechado sem grant, manifesto e bundle aprovados, nonce e janela própria;
revisar o dry-run e realizar backup privado verificado. Janela expirada ou reserva
insuficiente bloqueia a execução, sem extensão automática. Timeout ou resultado
ambíguo exige reconciliação somente leitura; nunca retry cego.

## Prova operacional e pendências

O pós-check da operação limitada exige os cinco IDs exatos, somente os cinco
pesos alterados, revisões avançadas, cinco auditorias novas com metadata completa,
contagens de habilitados/revisados invariantes e preservação de comércio,
integração, ofertas, fornecedores e perfis fora da coorte. O backup permanece no
servidor privado; não se baixa banco de clientes para a pesquisa local.

Em 04/11/2026, a QA real usou clones próprios das imagens existentes, Node
v24.21.0 e PostgreSQL 17.9, com dados sintéticos e sem portas publicadas. Os sete
casos passaram: plataforma, dry-run sem escrita, hash errado/STAFF sem escrita,
cinco atualizações com cinco auditorias exatas, replay rejeitado/no-op renovado,
rollback por falha na segunda auditoria e rollback por segundo CAS recusado.
Os probes de rollback foram respectivamente `[2,2]` e `[2,1]`. Os dois containers
próprios foram removidos, sem conexões remanescentes. As duas tentativas iniciais
pararam antes dos casos de peso por versão Node presumida e readiness temporário
do PostgreSQL; a versão exata e a espera por TCP foram corrigidas e revisadas.

Após nova captura e ACK exclusivo para 17:20–17:40 UTC, ocorreu uma única
aplicação, iniciada às 17:24:25 UTC, sem retry ou resultado incerto. O plano
`8fd78b949c7a351ce9cd890d0073055767d612609407c47b3641b9584336708d`
aplicou somente os pesos da tabela e gerou cinco auditorias. O pós-check confirmou
revisões avançadas, preservação integral dos demais campos e invariância dos
demais produtos, ofertas, fornecedores e integração. A leitura final das
17:26:53 UTC confirmou 3.068 ativos, 451 habilitados e 451 revisados; os cinco
produtos do lote continuam desabilitados, não revisados e estimados. Restam 2.617
perfis ativos pendentes de revisão de transporte.

O backup custom foi validado antes da escrita por magic PGDMP, hashes e TOC com
as seis tabelas exigidas. Nova leitura confirmou dump de 2.939.963 bytes, diretório
0700 e arquivo 0600, sem baixar o banco de clientes. SHA-256 do dump:
`8254e1073136a9b491e8538094110e23a6c2abe37316d95c51714f28a1a7cb43`.
O cleanup removeu somente os dois runtimes próprios, na APP e no job; owner,
markers, recibos e backup foram preservados. Não houve deploy ou restart da APP.
As provas privadas ficam em
`D:/Codex-outputs/wimifarma-br/pesos-multipacks-2026-11-04/production-window2/`
e `qa/evidence-c4569a9aaa7ab08b/`. O primeiro pacote de janela não foi executado.

Validações adicionais: 15 testes dirigidos e 559 de segurança, typecheck, lint e
build do runtime passaram. Auditoria completa: 3 baixos/17 moderados, sem altos
ou críticos; produção: 3 baixos/4 moderados, sem altos ou críticos. Os alertas
permanecem registrados e não foram corrigidos nesta tarefa.

Permanecem pendentes pesagem do conjunto real, tara e proteção escolhidas,
medidas físicas, encaixe e aprovação operacional de transporte. Nenhuma dessas
pendências é resolvida pelo preenchimento do peso.
