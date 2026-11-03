# Catálogo da loja física e conferência por embalagem

O painel administrativo abre em **Loja física**, mesmo quando existem mais cadastros de distribuidoras. Recarregar os produtos preserva a origem escolhida. Título, resumo e categorias acompanham a origem atual. A troca de origem limpa os filtros e a seleção, evitando filtros invisíveis da lista anterior. Cada linha mostra SKU e EAN, inclusive quando ainda não foram informados.

No celular, nome, foto e identificadores ocupam a primeira linha; preço, estoque e status ficam na linha seguinte. A disposição lateral continua no desktop. Isso preserva a leitura dos códigos sem esconder informações.

## Organização somente para conferência

O seletor **Conferir embalagens e medidas** organiza apenas os cadastros PHARMACY. Ele não agrega estoque ou preço, não modifica produtos, não copia dados físicos, não publica e não aprova transporte. Busca, paginação e limite de seleção em lote continuam aplicáveis aos produtos individuais.

Os grupos exigem igualdade exata de peso e dos três eixos, base de medição, classificação, apresentação declarada e descritores de embalagem, material e família. Não há tolerância aproximada, rotação dos eixos ou encadeamento transitivo.

Para integrar um grupo, o produto precisa de SKU, classificação e perfil físico completos. A referência deve identificar exatamente o nome cadastrado, declarar unidade de varejo, conter fontes de peso e medidas e valores idênticos ao perfil. Material, família e fonte do produto alvo precisam estar documentados na referência; a descrição da embalagem, quando informada, também separa os grupos. Quantidade ou conteúdo devem constar explicitamente do nome, junto do tipo de embalagem. Kits, combinações e apresentações promocionais ambíguas permanecem pendentes. O fallback de apresentação “1 unidade” não é usado.

Cadastros sem essas evidências ficam em **A conferir**, mesmo se seus números forem iguais aos de outros produtos. Um grupo não comprova equivalência comercial, medição real, conservação, carga aceita ou aprovação de frete. Estimativas conservam essa natureza.

## Verificação

Testes sintéticos cobrem igualdade e separação de grupos, ausência de fonte/identidade/apresentação, exclusão de distribuidoras e preservação dos objetos. O teste de interface executa o painel real com APIs interceptadas, sem banco ou dados de clientes, conferindo origem inicial, contadores, SKU, categorias, filtro e ausência de gravações.

O modo opcional `CATALOG_PANEL_CAPTURE_ROOT` compila o CSS real com PostCSS/Tailwind uma vez por execução e salva a lista e um grupo válido em 320, 390 e 1440 px. Nesse modo, o teste verifica overflow do documento, largura do filtro e corte interno do botão de edição em massa. Os cenários incluem nomes e SKUs longos. A inspeção em 320 px identificou e corrigiu um corte nesse botão, permitindo quebra de texto dentro da largura disponível.

Capturas da tarefa: `D:\Codex-outputs\wimifarma-br\catalog-comparison-2026-11-02\admin`. Trata-se do painel isolado com estilos reais e dados sintéticos; não comprova publicação ou acesso produtivo.

## Publicação verificada — 03/11/2026

Código funcional `6e04074574820c04780194cd3532a031ded861d8` integrado com o complemento de frete em `d5b568a5e78864f822d7ff7d23b6bec4d698718d`. Build Linux ARM64 aprovado; imagem ativa `sha256:58ce18422df840a74dc81680ba8b00c9bdbc59b259e2d7b110b9b43e0e64db64`, app saudável. Recriação somente do app, com PostgreSQL, ambiente, cadeia Compose, avaliações e canônico preservados. Nenhuma migração ou escrita comercial pelo operador desta publicação.

Validação do núcleo: lint, typecheck, Prisma validate, 302 testes gerais e 554 de segurança aprovados. Recomendações/identidade: 101 testes dirigidos; comparativo de fraldas: 7; catálogo próprio: 12 de lógica/regressão e UI real em modo leve e com CSS. As seleções se sobrepõem e não devem ser somadas. Auditoria de produção: 3 low e 4 moderate; completa: 3 low e 17 moderate, ambas sem high/critical. O complemento de bloqueio genérico da linha elétrica foi conferido separadamente pelo responsável do frete, com 12 regressões e lint, e incluído no build final.

Conferência pública: identidade do Cimegripe por EAN correta, 19 preços por fralda conferidos e Farmácia Popular descrita como presencial/sem entrega. Os bytes dos assets públicos de conferência administrativa e recompra tiveram SHA-256 igual ao da imagem ativa. `/admin/catalogos` sem sessão redirecionou com 307; histórico sem sessão retornou 401 e `private, no-store`. Não foram lidos clientes nem criados pedido, pagamento ou etiqueta. A UI privada usa fixtures locais, sem autenticação em conta real de cliente.

O trabalho de frete do chat 15 foi preservado: política rev. 8 ativa, 316 novos perfis estimados revisados e dois anteriores habilitados; três itens da linha elétrica voltaram à revisão própria. A habilitação continua por SKU/serviço e não transforma estimativa em medição. Recibos e limitações em [envio nacional](envio-nacional-e-meta-frete-gratis-2026-11-02.md). Esta publicação não alterou esses perfis ou configurações.

Evidências locais, fora do Git: `D:/Codex-outputs/wimifarma-br/catalog-comparison-2026-11-02/`, incluindo gates, capturas, `public-feature-proof.json` e `release-proof.json`. A Shopee foi analisada separadamente; falha nas ferramentas de navegação impediu confirmar o estado atual da loja no painel.
