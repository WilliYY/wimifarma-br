# 77 — Ampliação de dermocosméticos e DM Paraná

## Escopo aprovado em 19/10/2026

O titular solicitou mais de 300 produtos, consultas preferenciais na ANB/Profarma e comparação da DM Paraná quando disponível. Confirmou entrega da DM no dia seguinte e autorizou acréscimo de 20% também para outras marcas de dermocosméticos, mantendo Nivea/Dove em 20%. O calendário conservador do checkout continua com recebimento de terça a sábado e corte de 18h30; o relato sobre entrega não substitui confirmação de feriados/cortes da DM.

## Contrato da integração

- Migração aditiva `20261019220000_supplier_dm` acrescenta `DM` ao enum. Simulador, painel e importador reconhecem o fornecedor; os manifestos aceitam até três ofertas distintas por EAN. GAM/SantaCruz continuam apenas referências.
- Uma apresentação por GTIN validado. Custo final unitário com ST, condição da conta, disponibilidade real e data da observação permanecem privados. Sem desconto progressivo não atingido, soma duplicada de ST, estoque inventado ou reserva presumida.
- O menor custo elegível determina o preço com o percentual ADMIN do produto. Sincronizar ofertas não altera esse percentual. Estoque `PHARMACY`, produtos antigos, carteiras, pedidos e respectivas cotações ficam preservados.
- Não foi criado conector API/EDI nem coletor independente na VPS. A rotina Codex existente permanece pausada; ofertas vencem em até 24 horas da consulta real. Não renovar horários sem conferir o portal.

## Preparação do lote e fotos

Lotes privados versionados foram gerados a partir de capturas autenticadas da Profarma, complementadas por comparação amostral de dez EANs na ANB. Os sete primeiros arquivos renderam 301 propostas; a fonte ISDIN acrescentou 27, formando 328 candidatas. A revisão reteve 24 por divergência entre apresentação declarada e foto, e aprovou 304 para publicação. Comparação limitada não significa pesquisa exaustiva dos três fornecedores. A nova aba da DM exigiu login e a aba anterior perdeu a conexão; nenhuma oferta DM foi inventada.

Marca explícita ou linha confirmada pelo fabricante, unidade, variante e EAN são preservados. Produtos indisponíveis não viram cadastros vendáveis. Propostas de medicamentos permanecem separadas: não entram neste lote por aproximação de nome, classificação incompleta ou extrapolação do teto conservador.

Fotos passam por revisão visual por apresentação. Divergência de gramatura, unidade, cor ou forma bloqueia a associação e fica pendente de nova conferência; não corrigir g para ml por suposição. Origem, hash, observação e autorização acompanham as publicações aprovadas. As cópias públicas usam o publicador auditado, WebP sem ampliar, até 640 px/100 KB. Não afirmar que a arte é a versão mais recente do fabricante sem prova. Itens sem foto aprovada não entram nas vitrines; busca mantém o fallback institucional adequado.

## Frete e validação

Rascunhos logísticos usam apenas as regras existentes, com `measurementBasis:estimated`, `enabled:false` e `transportReviewed:false`. Sem peso/volume confiável, o campo fica pendente. Não converter dosagem, pixels ou ST em peso, nem habilitar transporte a partir da estimativa. Aerossóis e outras cargas restritas não recebem liberação automática.

Antes da publicação: revisão independente, testes de fornecedores e segurança, lint, typecheck, Prisma validate, build, auditoria de produção, QA PostgreSQL isolado com dados sintéticos e backup validado. Importação e fotos exigem ADMIN ativo, dry-run e depois apply do mesmo manifesto, com auditoria. Não são criados pedidos, cobranças, compras no fornecedor, etiquetas ou mensagens.

## Estado de entrega

Publicação concluída em **19/10/2026, às 21h31 de Brasília**. Código `2d13975`, enviado ao GitHub e incorporado na VPS. Aplicação reconstruída e saudável; migração aditiva aplicada sem reiniciar PostgreSQL ou alterar proxy compartilhado.

| Marca | Novos produtos |
| --- | ---: |
| Nivea | 129 |
| Neutrogena | 53 |
| La Roche-Posay | 48 |
| Vichy | 30 |
| ISDIN | 25 |
| CeraVe | 10 |
| L’Oréal Paris | 9 |
| **Total** | **304** |

- Catálogo passou de 73 para **377 produtos**. Os 304 novos têm origem `DISTRIBUTOR`, estoque físico zero, acréscimo de 20% e 313 ofertas: 304 Profarma e nove ANB. Nas nove comparações vendáveis, ANB foi mais barata em uma; as outras oito favoreceram Profarma. O décimo EAN pesquisado estava indisponível nas duas fontes e ficou fora. Exemplo: Deep Clean 80 g, custo final ANB R$ 17,52, venda R$ 21,02. Não houve consulta comercial válida DM neste lote.
- **260 fotos públicas**, total de 2.736.904 bytes, WebP sem ampliação e cada arquivo abaixo de 100 KB. As 44 restantes continuam pendentes e não entram nas coleções fotográficas da home. As 24 apresentações conflitantes não foram importadas. Este lote não completa a classificação dos medicamentos do relatório; propostas MIP/Rx continuam separadas.
- **113 produtos em Dermocosméticos**, 67 em Higiene e beleza e 124 em Perfumaria, usando os grupos de categoria já existentes. Atalho Dermo observado no Chrome com 113 itens, preços crescentes, fotos e botões de compra.
- **58 rascunhos logísticos**, todos estimados/desabilitados/não revisados; 246 sem medidas. Nenhum dos novos perfis habilitou transporte nacional. Confirmar embalagem pronta e aceitação da carga antes de liberar. Retirada e entrega local mantêm suas regras.
- Produtos antigos, suas ofertas/percentuais/fotos, cinco cadastros físicos, pedidos, clientes, itens e reservas preservados por hashes. Ganhos de cashback/WimiCoins não foram habilitados automaticamente nos novos cadastros; continuam sob controle ADMIN.

### Verificações executadas

- `npm.cmd run test:suppliers`: 83 aprovados. `npm.cmd run test:security`: 385 aprovados. Lint, typecheck, Prisma validate e build passaram. Onze testes privados do gerador e revisão independente dos manifestos, gate visual e scripts operacionais aprovados.
- `npm.cmd audit --omit=dev --audit-level=high --json`: zero vulnerabilidades. Auditoria completa mantém cinco alertas high de desenvolvimento em `braces`, `micromatch`, `fast-glob`, `@next/eslint-plugin-next` e `eslint-config-next`; nenhum downgrade forçado foi aplicado.
- PostgreSQL isolado vazio, com ADMIN/estoque físico/oferta DM sintéticos: migrações, dry-run e gravação dos 304 produtos, repetição sem duplicação e publicação das 260 fotos passaram. Nenhum cliente real foi copiado para QA. Banco descartável removido somente após confirmar seu marcador de propriedade.
- Produção: backup custom validado, imagem anterior de recuperação, dry-run dos sete manifestos antes de apply, seis lotes de fotos com publicador auditado em UID 1001, fonte/hash e auditoria. Os mesmos arquivos aprovados foram usados; nenhum original/capa existente foi substituído.
- Leitura real: 304 disponíveis, sete buscas por EAN/marca, sete páginas de produto e revisão pública de carrinho para sete produtos com preços e política de distribuidor corretos. Os bytes das **260 imagens** foram baixados e decodificados, confirmando WebP/dimensões/tamanho. Home e categorias responderam 200. Nenhum pedido, pagamento, mensagem, compra no fornecedor ou etiqueta foi criado.
- Um erro de permissão no primeiro início do QA foi corrigido somente no diretório privado da tarefa e na identidade do contêiner de ferramentas; não foi necessário alterar permissões da aplicação em produção.

### Operação e pendências

A rotina Codex permanece **PAUSED**, com o escopo anterior de 68 EANs; a lista não foi ampliada nem retomada por esta publicação. Os novos produtos usam a validade original de até 24 horas a partir das observações entre 20h16 e 21h00 de Brasília. Sem nova conferência real, as ofertas expiram e os produtos ficam indisponíveis, sem exclusão. Não anunciar atualização autônoma ativa.

Continuam pendentes: sessão DM válida para comparação comercial, 44 fotos, apresentação correta dos 24 rejeitados, medidas/revisão de transporte e habilitação dos canais API/EDI/arquivo. As consultas ANB foram amostrais; os 304 EANs não foram comparados exaustivamente nos três fornecedores.

Arquivos de código: enum/migração Prisma, `supplier-catalog/schema.ts`, `import-manifest.ts`, `supplier-planning/schema.ts`, painéis `supplier-product-offers.tsx`/`supplier-planning-panel.tsx` e respectivas regressões. Documentação: README, histórico 07 e documentos 66/67/68/77. Manifestos, fontes, fotografias, custos e provas operacionais ficam privados em `outputs/dm-catalogo-2026-10-19`, fora do Git/build; o relatório para o lojista expõe somente produto, marca, EAN, preço público e estado da foto.
