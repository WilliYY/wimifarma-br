# Busca, composição das embalagens e departamentos — 03/11/2026

## Problemas reproduzidos

- Doses equivalentes em g/mg/mcg eram tratadas literalmente; nomes compactos de promoção também perdiam resultados.
- A ficha interpretava apenas a primeira medida e podia descrever um pacote como uma unidade interna.
- Os lenços Bepantol Baby estão registrados como marca Bepantol, enquanto os cremes usam Bepantol Baby. O filtro literal separava a mesma linha. A categoria dos lenços é preservada, mas não era considerada no público Infantil.
- A rota `/catalogo?grupo=medicines` divulgava o catálogo geral como canonical e título, enquanto `/categorias/medicamentos` divulgava o departamento.

## Decisões

Conversão de dose e aliases comerciais compartilham padrões entre ranking e consulta SQL. A conversão usa dígitos decimais, sem arredondamento binário, e preserva o denominador: mg por unidade não equivale a mg/mL. Não foi criada uma regra de equivalência clínica, substituição ou pareamento novo de ingredientes em associações. Contrato detalhado em [busca por doses](busca-equivalencia-doses-2026-11-03.md).

A composição de multipacks mostra a unidade comercial, a quantidade interna e o conteúdo líquido total quando há informação explícita e coerente. Se a promoção e uma contagem independente divergem, o sistema não inventa uma composição. Protex com seis barras de 85 g apresenta 510 g líquidos; Colorama com seis frascos de 8 mL apresenta 48 mL. “Leve” indica o conteúdo recebido; “Pague” não reduz a quantidade física. Nenhuma dessas contas aprova peso bruto, caixa de envio ou logística. Detalhes em [apresentação dos pacotes](apresentacao-multipacks-2026-11-03.md).

O filtro Bepantol reúne a família conhecida Bepantol, Bepantol Baby e Bepantol Derma. O filtro de linha Baby aceita a marca específica ou o nome explicitamente Bepantol Baby sob a marca principal. Uma segunda conferência por produto evita incluir Derma ou outros produtos da marca principal só porque o SQL recuperou candidatos com a mesma marca. O mesmo SKU e estoque permanecem únicos.

Infantil passa a considerar também cuidados de higiene explicitamente infantis no nome ou na marca, preservando a categoria registrada. Lenços genéricos e produtos adultos ou medicinais não recebem essa associação por suposição. Candidatos são recuperados no SQL e conferidos antes de contagem e paginação; a lista de subcategorias usa o mesmo critério. `/categorias/infantil` representa esse departamento, enquanto subcategorias específicas continuam exatas.

Medicamentos usa o mesmo conjunto semântico nas duas entradas: categorias reconhecidas e classificação MEDICINE. As duas rotas compartilham título, descrição, canonical e endereço de compartilhamento, preferindo `/categorias/medicamentos`, com filtros e página preservados. Atalhos e mudanças de filtro passam a apontar para a rota preferida. A rota anterior permanece compatível; nenhuma melhora de ranking do Google é presumida.

As duas rotas de departamento continuam acessíveis quando não há produtos ou categoria literal cadastrada, exibindo o estado vazio ou a seleção semântica existente. Isso não cria uma categoria no banco nem uma subcategoria na navegação. Categorias específicas desconhecidas continuam retornando 404; falhas de banco não são transformadas em um catálogo vazio.

## Evidência e limites

GETs públicos confirmaram os títulos e descrições das apresentações Protex L6P5, Colorama Algodão Doce/Gabriele, Intimus Leve 16/Pague 15 e lenços Bepantol Baby Leve 96/Pague 80. O recibo público está nos artefatos locais da tarefa; não foi feita escrita em produtos, marcas, estoque, preços ou perfis logísticos.

Regressões usam o código real, com fonte de dados sintética e Prisma de teste que respeita os filtros e a projeção nos cenários novos. As rotas reais são empacotadas para conferir metadados e o escopo enviado ao catálogo. Teste local não comprova HTML publicado. A publicação aguarda a liberação da janela de catálogo compartilhada, seguida de build e verificação do app com fonte congelada.
