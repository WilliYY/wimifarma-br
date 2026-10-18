# Busca de produtos e galeria

## Escopo de 18/10/2026

- Removidos os selos visuais `Exige receita` no detalhe e `Receita` no autocomplete. A classificação, a compra normal de receita comum e a conferência farmacêutica antes da dispensação continuam conforme `45-pedido-online-e-conferencia-de-receita.md`. Controlados e produtos assistidos conservam suas regras.
- Enter, Encontrar e o link de todos os resultados abrem `/busca?q=...`. Clicar numa sugestão continua abrindo o detalhe. Busca vazia/sem resultado não aciona mensagens externas.
- A página mostra somente produtos ativos cadastrados, com 24 resultados por página. Termos podem estar em posições diferentes: nome, marca, princípio ativo, dose, EAN e termos cadastrados. Não cria sinônimos clínicos, produtos ou associações ausentes do catálogo.

## Consulta e relacionamento

O serviço `search-catalog.ts` usa SQL parametrizado para filtrar e paginar no PostgreSQL; não carrega o catálogo inteiro no navegador. Todos os termos precisam corresponder. Nome exato/início do nome recebem prioridade. `50 mg` e `50mg` são aceitos. Doses explícitas também são comparadas ao nome original, preservando vírgula/ponto decimal: `5mg` não corresponde a `2,5mg` ou `12,5mg`.

Correlatos usam componentes completos dos princípios ativos cadastrados, com normalização de acentos. A equivalência nominal explícita desta etapa é `losartana potássica`/`losartana`. Não se infere identidade pela primeira palavra de um sal ou ácido. Associações com mais de um componente têm seção própria e não são apresentadas como substituição. Dosagens e apresentações permanecem identificadas em cada produto.

A lateral usa produtos disponíveis encontrados na consulta. O título `Mais vendidos nesta busca` exige quantidades de pedidos `COMPLETED` e `PAID`, sem pagamentos de ambiente de teste. Sem essas vendas, mostra `Relevantes para sua busca`, sem popularidade fictícia. Não expõe dados de clientes. Resultados de busca têm `noindex,follow`; páginas canônicas de produtos permanecem como antes.

## Direção visual

### Títulos mais curtos — 18/10/2026

Os títulos visíveis das apresentações simples de losartana conferidas usam nome/marca, dose e quantidade, por exemplo `Losartana 50 mg · 30 comprimidos · Germed` e `Aradois 50 mg · 60 comprimidos`. `Potássica` e `revestidos` continuam no nome técnico e na descrição. A transformação é somente de apresentação: banco, EAN, slugs, busca, metadados, importadores e nomes persistidos nos pedidos não mudam. Associações, formulações especiais, fabricantes não reconhecidos e outros produtos conservam o nome completo, evitando apagar diferenças importantes.

Aplicado em cards/correlatos, autocomplete, lateral da busca, detalhe, dock, vitrine, carrinho e checkout. Regressões verificam marca, dose, 30/60 comprimidos e preservação de nomes fora do formato. Validação: 709 testes gerais e 324 de segurança, lint, typecheck, Prisma e build passaram; auditoria de produção sem vulnerabilidades. Os cinco alertas high de desenvolvimento anteriormente documentados permanecem, sem mudança de dependências.

Publicado `71b134e`, com reconstrução somente da aplicação e imagem anterior preservada. Hashes completos de produtos e ofertas e contagem de pedidos permaneceram iguais. Conferência real validou três títulos H1, descrição técnica, nomes integrais da API, busca e health; Chrome confirmou os onze títulos e ausência de transbordamento em 1920 e 390 px. Viewport temporário restaurado. Nenhum cadastro, preço, foto, estoque ou pedido foi alterado por esta etapa.

Composição editorial comercial, com identidade vermelha da Wimifarma, tipografia e tokens existentes. Título com termo pesquisado, respiro entre seções, navegação por âncoras e lateral compacta em desktop; no celular a lateral vem após os resultados. Sem animações adicionais. DFII de referência: impacto 4 + adequação 4 + viabilidade 4 + desempenho 4 − risco de consistência 3 = 13.

## Fotos

### Revisão solicitada pelo titular em 18/10/2026

O titular determinou exibir fotos reais conferidas também no piloto de losartana, após ser informado da restrição do art. 54 da [RDC 44/2009](https://bvsms.saude.gov.br/bvs/saudelegis/anvisa/2009/rdc0044_17_08_2009.html). Essa decisão de publicação não equivale a confirmação de conformidade sanitária nem substitui a revisão do responsável técnico. A regra anterior que ocultava qualquer foto de `DISTRIBUTOR` Rx foi retirada; URLs do armazenamento interno continuam protegidas e nunca entram nos DTOs públicos. A publicação usa cópias públicas distintas, vinculadas à biblioteca e auditadas por EAN, fonte e hash, sem abrir o endpoint privado ou sobrescrever os originais.

Fotos públicas aprovadas têm prioridade em cards, busca, detalhe e compra. A caixa institucional fica somente nos itens sem foto pública validada ou, no detalhe, quando todas as fotos falham. Não usar imagens de outra dose, quantidade, fabricante ou placeholders de distribuidora. A imagem Geolab 50 mg/30 comprimidos foi conferida na página da Riomed pelo EAN `7899095236639`; as cinco fotos anteriores vêm da Profarma. Não foi confirmada a data da arte de cada embalagem.

Por solicitação do titular, removidos o selo `1 dia de preparação` dos cards e o quadro do detalhe. O calendário operacional, a previsão no carrinho/checkout e os prazos do frete e do pedido permanecem. A retirada de texto não transforma estoque externo em físico nem promete retirada em 30 minutos.

Operação: `scripts/publish-pilot-product-images.ts --file <manifesto privado> --actor-id <ADMIN ativo>` faz dry-run; `--apply` publica. Executar pela ferramenta `tsx`, como UID 1001 no contêiner de ferramentas e com o volume de uploads montado. Manifesto `images` contém `ean`, `filePath`, `mimeType`, `sourceUrl` HTTPS sem credenciais e `sha256` da fonte local. Apenas apresentações já revisadas do piloto são aceitas, com nome/marca/classificação exatos relidos após lock. Saída WebP até 640 px e 100 KB, sem ampliar nem inventar conteúdo; biblioteca e auditoria são atômicas na transação, com remoção dos arquivos novos se houver falha. Capa pública existente é preservada em repetições; originais internos não são removidos. Fonte/hash e antes/depois ficam no registro administrativo. O script altera somente os campos de capa e vínculo da imagem.

Conferência de fontes desta rodada: ANB apresenta caixa genérica de distribuidora para Biosintética; Profarma mostra placeholder para Biosintética, Nova Química e EMS, e não retornou imagem para os EANs Geolab/Sandoz na busca atual. EMS oficial também usa placeholder. Não associar essas ilustrações como fotos reais. Para Biosintética, Nova Química, EMS e Sandoz permanece a caixa institucional até uma foto exata ser validada.

Validação local desta revisão: 706 testes gerais e 324 de segurança passaram, incluindo publicação sem escrita no dry-run, identidade/hash/fonte, rollback de arquivo e preservação de capa existente. Lint, typecheck, Prisma e build passaram; revisão independente aprovou sem achados. Auditoria de produção sem vulnerabilidades; auditoria completa mantém os cinco alertas high preexistentes de desenvolvimento.

Publicado `7aa12fe` em 18/10/2026, com backup PostgreSQL validado e imagem anterior preservada. Dry-run aprovou seis fotos; aplicação gravou seis capas públicas e registros de biblioteca/auditoria, em WebP de 9.004 a 16.724 bytes. Repetição sem aplicação preservou todas as capas. Hashes de dados comerciais (excluídos somente campos de imagem/timestamp), produtos físicos completos e ofertas, além da contagem de pedidos, permaneceram iguais. Nenhuma migração, cobrança ou pedido foi criado.

Conferência pública: seis páginas e suas fotos retornaram 200, seis rotas principais retornaram 200 e a revisão do carrinho conferiu seis itens. Endpoint privado permaneceu 401 anônimo. Chrome mostrou sete fotos reais carregadas entre os onze resultados (incluindo Teuto físico preservado) e quatro caixas de fallback; detalhe Medley mostrou a foto, sem texto de preparação. Em 390 × 844 px, largura do documento de 390 px, sem transbordamento; viewport restaurado. A rotina agendada conserva 8h/12h/17h e foi ajustada para preservar as capas aprovadas.

`Product.imageUrl` continua sendo a capa usada pelos cards e checkout. A migração aditiva `20261018120000_product_gallery` cria `imageUrls`, inicialmente vazio, para extras ordenadas. O cadastro pode ter até seis fotos distintas no total. O painel reutiliza a biblioteca pública; não busca nem inventa fotos extras automaticamente.

O servidor deduplica e confere extras na biblioteca sob a trava do catálogo. Uma foto usada somente como extra também impede exclusão da biblioteca. Omissão preserva extras na edição; `[]` remove. Galeria com miniaturas, seleção por teclado, ampliação e falha isolada por URL: uma foto quebrada não impede as demais.

URLs de fotos internas de distribuidores continuam privadas conforme `67-catalogo-distribuidores-piloto.md`. Extras não aceitam URLs privadas e os DTOs públicos filtram essas URLs, inclusive em arrays; HTML e metadados não as expõem. Fotos públicas aprovadas seguem a revisão acima.

### Ilustração institucional para medicamentos sem foto

Em 18/10/2026 o titular forneceu arte de caixa Wimifarma e pediu fundo transparente e remoção da indicação `30 comprimidos`. Após correção expressa, os demais elementos foram preservados: logo completa, G/Genérico, texto de receita, instruções laterais e cores. Foi usado o editor de imagens integrado; o resultado escolhido foi convertido para WebP de 640 × 533 px, com alpha, em `public/brand/medicamento-sem-foto.webp`. Prompt final: preservar a arte original, retirar somente a linha de quantidade e extrair a caixa com transparência. A apresentação SVG recorta a silhueta para impedir halos periféricos, sem redesenhar a logo.

`ProductImagePlaceholder` e `image-placeholder.ts` centralizam o fallback exclusivamente visual. Categoria de medicamento, genérico, ético ou Farmácia Popular e flags administrativas já existentes identificam quando usar a caixa. Perfumaria, higiene, suplementos e classificação ausente mantêm o ícone neutro. Cards e detalhe identificam a arte como `Imagem ilustrativa`; os textos do desenho não substituem a classificação, embalagem ou conservação do item vendido. Informações do produto continuam no cadastro/descrição.

Aplicado na lista, correlatos, autocomplete, lateral da busca, detalhe, carrinho, checkout, dock de compra, avaliações da conta e sugestões da Miauby. Fotos reais continuam prioritárias; se todas as fotos da galeria falharem, o detalhe usa a ilustração. A seção de medicamentos da home aceita cadastros sem foto; regras de destaque e separação de imagens privadas permanecem.

A ilustração não é gravada em `Product.imageUrl` nem vira foto de produto em metadados, feed ou pedidos. Os originais no armazenamento interno continuam privados. Não altera compras, saldos, cotas, estoques ou classificação de receita.

Validação da ilustração: 699 testes gerais, 324 de segurança, lint, typecheck, Prisma e build passaram; revisão independente sem achado pendente. WebP com alpha validado, 35.132 bytes. Auditoria de dependências de produção sem vulnerabilidades; os cinco alertas de desenvolvimento já documentados permanecem fora desta alteração visual.

A conferência por GET real detectou que o arquivo novo, criado com modo `600`, havia sido copiado para o runner como root: HEAD retornava 200, mas a leitura da imagem pelo usuário `nextjs` falhava com 400. Ajustado `COPY public` para `--chown=nextjs:nodejs`, mantendo a aplicação sem root; a correção imediata limitou-se ao proprietário desse arquivo. A validação deve ler os bytes como usuário da aplicação e fazer GET, não confiar somente em HEAD.

Publicada a ilustração em `701e8b4` e reconstruído o runner com a correção permanente de proprietário em `b98530f`. No container novo, o UID 1001 leu os 35.132 bytes; GET público da arte e de sete imagens referenciadas respondeu 200. Dez rotas principais responderam 200, incluindo carrinho, checkout e health; seis resultados da API de busca passaram também pela revisão de preço/estoque do carrinho. Conferência visual no Chrome confirmou a ilustração no produto Medley, preservou a foto real do Teuto e não encontrou transbordamento horizontal no celular de 390 px. Hashes dos produtos e ofertas e contagem de pedidos permaneceram iguais antes e depois do deploy. Esta etapa não aplicou migração, criou pedido nem realizou cobrança.

## Verificação e operação

- Regressões: consulta com dose/marca/decimal, URL de Enter, identidade de componentes, parametrização/paginação, ranking lateral e privacidade; CRUD/galeria/exclusão e proteções comerciais existentes.
- `scripts/catalog-search-audit.ts`: leitura do catálogo e sondas PostgreSQL com dados sintéticos, sem pedidos ou mutações.
- Aplicar a migração antes de subir a nova aplicação. Não há alteração de preços, ofertas, cotas, estoques, saldos ou pedidos.
- Para catálogo amplo, acompanhar latência e plano de consulta; índices especializados de texto permanecem evolução futura quando o volume justificar.

Verificações locais desta entrega: 697 testes gerais, 324 de segurança e 15 regressões de busca passaram. Lint, typecheck, Prisma e build passaram. A revisão independente confirmou as correções de dose decimal, identidade de substâncias e SKU. Auditoria de dependências de produção sem vulnerabilidades; auditoria completa conserva cinco alertas high em ferramentas de desenvolvimento, sem alteração de dependências nesta tarefa. O build inicial revelou duas frases em codificação inválida no seletor; arquivo normalizado para UTF-8 antes da repetição bem-sucedida.

## Implantação e conferência real

Código `f9b465d`, enviado ao GitHub e construído na VPS em 18/10/2026. Backup PostgreSQL validado antes da migração; imagem anterior preservada para rollback. Migração aplicada e aplicação saudável em `/api/health`. Hashes dos produtos (desconsiderando o novo campo vazio) e das ofertas permaneceram iguais; a contagem de pedidos não mudou.

Auditoria somente leitura encontrou 11 produtos para `losartana 50mg`, um para `losartana 50 mg (corus)` e oito relacionados para `corus`; sondas de doses decimais passaram também no PostgreSQL real. Não há apresentação de losartana + hidroclorotiazida publicada neste catálogo, portanto a consulta retorna zero até cadastro e validação próprios.

Chrome real: selo visual ausente no detalhe, Adicionar/Comprar disponíveis; Enter do header abriu os 11 resultados; Enter da busca móvel abriu Corus e outras apresentações. Lateral apresentou `Relevantes para sua busca`, sem inventar vendas. Em viewport 390 × 844, documento de 375 px, sem transbordamento horizontal; dimensão temporária restaurada. Galeria múltipla recebeu teste interativo com dados sintéticos, sem acrescentar imagens ou produtos fictícios em produção. Nenhum pedido, cobrança, envio ou postagem foi realizado.
