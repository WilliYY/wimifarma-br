# 115 — Evidências da unidade comercial e receitas de embalagem

Implementação local de 27/10/2026, autorizada pelo lojista. Complementa [113](113-referencias-fisicas-e-alternativas-frete.md), [109](109-coleta-xml-e-logistica.md) e [29](29-cadastro-logistica-ia.md). A implantação, a migration e a importação produtivas dependem de backup, revisão e validação pelo responsável pela entrega. Código e testes locais não comprovam aplicação na base produtiva.

## Persistência separada

`Product.logisticsEvidence` guarda um documento JSON estrito, versão 1, por GTIN normalizado com 14 dígitos e dígito verificador válido. Cada observação registra identificador estável, URL HTTPS pública sem credenciais/parâmetros, data da coleta, SHA-256 do documento-fonte, GTIN literal normalizado, trecho, nível da embalagem, quantidade de unidades, conflito de identidade, peso em gramas e sua natureza, três lados em milímetros e sua ordem literal explícita (`sideOrder`). O hash registra a proveniência do documento coletado; o servidor não baixa a URL nem comprova sozinho o conteúdo dessa fonte.

Peso bruto exige declaração explícita. Peso líquido, massa de princípio ativo, ml, master e unidade desconhecida continuam identificados e não geram uma unidade protegida. Eixos sem identificação não se tornam comprimento/largura/altura. Cartonagem com faca declarada pode informar a geometria, preservando a natureza do peso.

O estado é calculado: sem referência, parcial, conflito ou referência completa. Divergência entre pesos brutos ou geometrias por GTIN gera conflito; não se faz média nem escolhe silenciosamente uma fonte. Referência completa exige peso bruto e três lados na mesma observação da unidade comercial fechada. Confirmação ADMIN é separada e não comprova aceitação sanitária ou da transportadora.

`sourceDecisions` separa decisões atuais de fontes: identificador da observação, estado `rejected` ou `superseded` e justificativa obrigatória. Ausência de decisão significa fonte vigente. A observação e a proveniência são preservadas; somente fontes vigentes participam do estado e da preparação. Decisões duplicadas ou que apontam para fonte inexistente após o merge são rejeitadas. Alterar, remover ou reativar uma decisão exige `decisionReason`, registra antes/depois e motivo no AuditLog e invalida a confirmação, mesmo que o mesmo PUT peça `confirmed:true`. Uma segunda revisão pode confirmar o documento estabilizado. O importador não aplica decisões contidas no arquivo e preserva as decisões existentes.

`shippingProfile` permanece com seu significado anterior de unidade protegida. Nenhuma importação, revisão ou receita deste fluxo altera esse perfil, preços, estoque, classificação de receita, ofertas ou serviços habilitados. A gravação da evidência atualiza `Product.updatedAt`; tokens/cotações que dependem dessa revisão poderão exigir atualização, conforme o contrato já existente.

## Receita reutilizável

`PackagingRecipe` possui nome, JSON estrito versão 1, revisão inteira e timestamps. O contrato registra os três lados internos e externos do recipiente, tara do recipiente externo, tara da proteção, folgas por face/eixo, descrição da proteção, data e nota da calibração e lista explícita dos GTINs fisicamente compatíveis. Campos físicos desconhecidos permanecem `null`; nenhuma medida padrão foi inventada. Zero só é permitido para proteção/folga quando informado explicitamente; não substitui a descrição e a calibração obrigatórias.

A compatibilidade exige confirmação de apresentação, material, fechamento, proteção e encaixe. Igualdade de categoria, dose, conteúdo ou contagem não basta. A geometria/receita pode ser compartilhada por embalagens confirmadas; o peso bruto continua específico do produto.

A receita declara `allowedOrientations` explicitamente: permutações de índices 0/1/2 da ordem literal dos lados da fonte; não há orientação padrão. A convenção literal de eixos é declarada em `unitSideOrder`; divergência em qualquer fonte com lados bloqueia a prévia. GTINs compartilhados devem ter essa ordem e a mesma política de orientação conferidas na calibração, inclusive restrições de frascos em pé. O preparador puro examina somente as orientações declaradas da unidade, acresce duas folgas por eixo e confere o encaixe nas medidas internas. O peso da prévia é o peso bruto comercial mais a tara externa e a proteção, arredondado para cima em gramas. As medidas da prévia vêm do recipiente externo. Não há empacotamento de carrinho nem suposição de múltiplas unidades por caixa nesta etapa.

A prévia exige referência completa confirmada, ausência de conflitos/master/peso líquido ou desconhecido, receita calibrada, todas as medidas/taras/folgas explícitas, GTIN compatível, classificação de carga separada e elegibilidade vigente. Perfil protegido preexistente bloqueia a composição para evitar dupla tara. O resultado, quando possível, é apenas um rascunho `enabled:false`, `transportReviewed:false`, `measurementBasis:estimated`, sem aprovação de serviços. Não há ação automática para aplicar a prévia.

## API e painel

- `GET /api/admin/fretes/produtos/[id]/evidencias`: evidência, GTIN, estado e revisão do produto.
- `PUT` na mesma rota: acréscimo de observações e revisão explícita, com `updatedAt`. Fontes anteriores são preservadas; identificador existente com conteúdo divergente é rejeitado. Nova fonte invalida a confirmação e exige uma revisão posterior.
- `POST` na mesma rota: `recipeId` e `cargoKinds`, retornando somente bloqueios ou prévia. Nenhum dado é gravado.
- `GET /api/admin/fretes/embalagens`: até 100 receitas cadastradas.
- `PUT` na rota de embalagens: cria com revisão zero ou altera por `id` e revisão existente. Limite de 100 receitas e controle concorrente nas criações.

Todas as rotas exigem ADMIN; mutações revalidam ADMIN ativo dentro da transação. Mutações/prévias usam Origin da aplicação, JSON e limite de 32 KB. Salvamentos usam concorrência otimista e auditoria transacional; versões antigas retornam 409. URLs são somente evidência exibida como link; nenhum endpoint faz busca remota ou fetch dessas fontes.

O painel de fretes carrega a ficha somente ao abrir “Unidade comercial e receitas de embalagem”. Mostra peso/natureza, lados, conflito e fonte. Permite importar referência estruturada, revisar, manter receitas estruturadas e conferir a preparação sem aplicar. O formulário anterior de perfil protegido continua com sua revisão própria.

Ao confirmar ou alterar decisões sem edição estruturada, o painel envia `observations:[]`, mantendo o histórico no servidor. Isso permite revisar documentos importados maiores que o limite do corpo HTTP, sem ampliá-lo. A edição estruturada continua sujeita aos 32 KB; para acrescentar fontes, pode enviar somente as novas observações. A existência dos IDs das decisões é verificada depois do merge com o histórico, permitindo delta de novas fontes e decisões de fontes anteriores na mesma solicitação.

## Importação operacional

`scripts/import-logistics-evidence.ts` recebe um arquivo JSON privado com array de documentos no contrato `logisticsEvidenceSchema`. Não recebe documentos NF-e brutos nem URLs para download. O arquivo tem limite de 10 MB e 5.000 GTINs; duplicatas e correspondências ausentes/ambíguas cancelam o lote. Não fazer correspondência por nome ou categoria.

```text
node --import tsx scripts/import-logistics-evidence.ts --input <arquivo-privado.json> --actor-id <ADMIN-ativo>
node --import tsx scripts/import-logistics-evidence.ts --input <arquivo-privado.json> --actor-id <ADMIN-ativo> --apply
```

O primeiro comando é dry-run e não grava. O segundo somente deve ser usado pelo responsável pela aplicação após backup, QA e revisão do plano. O importador valida ADMIN ativo, faz merge conservador e idempotente, preserva revisões existentes no no-op e invalida confirmação quando surgem observações. Na aplicação, atualiza exclusivamente `logisticsEvidence`, com CAS por `updatedAt` e auditoria na mesma transação. Qualquer falha reverte o lote. O resumo não imprime descrições comerciais, dados de pacientes ou segredos; arquivo-fonte e relatórios ficam em `outputs` privado, fora do Git.

## Verificação

Testes sintéticos cobrem contrato estrito, URL sem segredos, GTIN, bruto/líquido/master, eixos, conflitos, merge, calibração, tare/proteção/folga, seis orientações/encaixe, compatibilidade explícita, elegibilidade/carga separadas, preservação de perfil protegido, prévia desativada, ADMIN/Origin/CAS, auditoria, importação dry-run/idempotente e painel sob demanda. Executar também regressões de frete, Prisma validate, typecheck, lint, build e segurança antes de publicar.

Pendências operacionais: revisar as observações importadas, buscar as referências restantes, medir tara/encaixe/proteção das embalagens reais, confirmar apresentações/lotes, revisar carga e serviços por produto. Sem esses dados, os bloqueios continuam visíveis. A caixa informada de 24 × 15 × 10 cm não ganha tara ou medidas internas presumidas.

## Validação integrada e estado operacional em 27/10

O lote privado foi convertido e validado: 47 GTINs únicos com checksum válido; 16 referências completas com peso bruto explícito, 27 parciais e quatro conflitos, todas sem confirmação. Onze apresentações vieram de quatro PDFs oficiais Torrent, com conferência visual das linhas unitárias. Não se importam valores master, pesos ambíguos como brutos ou apresentações aproximadas.

Passaram `npm.cmd run test:shipping` (126 testes), `npm.cmd run test:security` (491), teste próprio do importador (1), lint, typecheck, build (40 páginas estáticas) e Prisma validate. Auditoria de produção com bloqueio high/critical passou; auditoria completa com limite moderate retornou 1 por alerta moderado preexistente em `fast-uri`, sem high/critical. A revisão independente aprovou código e migration; duas falhas operacionais de histórico/revisão foram corrigidas antes do fechamento.

PostgreSQL 17 isolado, sem rede externa/portas publicadas e somente dados sintéticos: todas as migrations aplicadas, importação de 47 referências, dry-run sem escrita, repetição sem novas gravações, reversão integral de lote inválido, recusa de ADMIN inativo e preservação de campos comerciais/perfis protegidos comprovadas. O contêiner próprio foi encerrado ao final. Evidência privada: `outputs/logistica-enriquecimento-2026-10-27/qa-postgres-proof.json` e `local-validation.json`.

Código `3f5c9ae` enviado ao GitHub. Imagens de ferramentas e aplicação foram construídas em fonte isolada: tools `sha256:e12a62c363bce3dcdd77f01d899ade091f42b3e9884008d30d1f117993ce7e2d`, app `sha256:b3cdbeb03542e64c24001e71c9a395a4531f47febb72d071c9b08e8d0a387b8e`. Inicialmente, a operação produtiva aguardou o encerramento da publicação de outro chat, preservando seu HEAD `02f6241`. O resultado da janela posterior está abaixo.

Usar o serviço oficial Compose `migrate` com a imagem de ferramentas desta entrega. `docker run --env-file .env` não reproduz a interpretação do Compose e falhou antes de conectar; não alterar ou imprimir credenciais para contornar isso. O serviço Compose confirmou o ADMIN ativo corretamente. Antes da operação produtiva: verificar a liberação da outra janela, checkout limpo, única migration esperada, backup custom válido, dry-run e auditoria. Importar somente evidências e verificar hashes dos campos comerciais/perfis antes/depois. Não restaurar banco global nem habilitar frete automaticamente.

## Aplicação produtiva — 27/10/2026, prova às 14h49 UTC

Após autorização humana para alinhar com o chat 10, sua publicação foi encerrada e o estado canônico **do servidor** confirmou `completed_released`, `productionGrant:false`, `uncertainApply:false`, sem outros grants. O arquivo equivalente do checkout Windows era antigo e não foi usado como concessão. Fonte vigente: `/home/ubuntu/projetos/wimifarma-br/outputs/catalogo-paralelo-2026-10-20/estado-orquestracao.json`. O outro chat confirmou que não iniciaria novo apply durante a operação.

Servidor atualizado por fast-forward até `4818a07`. Uma única migration pendente, `20261027140000_logistics_evidence`, foi verificada e aplicada pelo serviço oficial Compose. Backup custom restrito a modo 600, 1.679.337 bytes, com SHA-256 e catálogo de restauração conferidos; não foi ensaiada restauração global com dados de clientes. Recuperação: `/home/ubuntu/backups/wimifarma-br/logistics-01a15b8f-20261027/pre-logistics.dump`.

Dry-run confirmou 47 correspondências únicas. Aplicação gravou **47 evidências e 47 auditorias**; nova simulação retornou no-op para todas. Fingerprints dos campos comerciais de todos os **2.739 produtos**, incluindo o item recém-publicado pelo outro chat, e de todos os perfis protegidos permaneceram iguais. Preços, estoque, status, receita e `shippingProfile` não foram alterados.

A imagem app acima foi ativada às 14h46m48 UTC, recriando somente `app` com `--no-deps --no-build`. Aplicação e PostgreSQL saudáveis, zero reinícios; identidade/início do PostgreSQL preservados desde 03/10. Tag de recuperação: `wimifarma-br-app:pre-logistics-3f5c9ae`.

HTTPS: home, checkout e health **200**; as duas novas APIs ADMIN sem sessão **401**, com `Cache-Control: private, no-store, max-age=0`. A fixture autenticada/UI foi verificada localmente; não se afirma inspeção visual autenticada em produção. Contagem real após a entrega: **2.736 ativos, 47 com evidência, 2.689 sem evidência e os mesmos dois perfis habilitados anteriores**. Referência completa continua diferente de envio liberado: as 47 revisões seguem não confirmadas, e receita de proteção/carga/serviços exige conferência própria.

Provas privadas: `production-proof.json` e `post-deploy-proof.json`, em `outputs/logistica-enriquecimento-2026-10-27/`. Nenhum segredo, backup, prova privada ou cadastro de cliente foi versionado.
