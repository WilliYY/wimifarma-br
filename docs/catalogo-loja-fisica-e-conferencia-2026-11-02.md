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
