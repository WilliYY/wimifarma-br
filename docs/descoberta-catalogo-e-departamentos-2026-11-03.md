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

Regressões usam o código real, com fonte de dados sintética e Prisma de teste que respeita os filtros e a projeção nos cenários novos. As rotas reais são empacotadas para conferir metadados e o escopo enviado ao catálogo. Teste local não comprova HTML publicado. A publicação foi concluída após liberação e renovação das guardas, conforme recibo abaixo.

## Publicação verificada — 03/11/2026

Fonte APP `f9abb42ac9bb9d7171ca1499acceb5fe97ed018f`, imagem `sha256:d6ebd114354d2dc1609f6762c8cc87caf45b4bf89b8607163551cef39521684b` em Linux/ARM64. App e PostgreSQL saudáveis; ambiente, contratos de execução e avaliações preservados. A publicação alterou somente o app, sem migrations, SQL de catálogo, pedidos, estoque, preços, configurações ou aprovação logística.

Passaram 131 testes dirigidos, 307 da suíte padrão, 557 de segurança, lint, tipos, Prisma e build Linux. Auditoria de produção: três alertas baixos e quatro moderados; auditoria completa: três baixos e 17 moderados, sem altos ou críticos. Nenhuma dependência foi alterada. As tentativas locais de build na cópia com junction entre C: e D: falharam por resolução de módulos; a compilação efetiva e a imagem publicada foram validadas no Linux.

GETs públicos confirmaram os mesmos cinco resultados principais de dipirona 1 g/1000 mg, quatro de paracetamol 750 mg/0,75 g, dois Protex L6P5 e três Intimus L16P15/Leve 16 unidades Pague 15 unidades. Desloratadina mantém 15 xaropes nos principais com vírgula ou ponto, com os oito relacionados separados. Bepantol Baby mantém os mesmos quatro SKUs, inclusive os lenços, nos três caminhos testados. As fichas mostram Protex 6 × 85 g = 510 g líquidos e Colorama 6 × 8 mL = 48 mL, e as duas rotas Medicamentos divulgam o mesmo título, canonical, endereço social e seleção.

Recebidos os encerramentos de catálogo e renovadas as guardas físicas, a implantação preservou o canônico `7782112b1705d8a3225edda23a2f39b34f54cf9d4aa79ad09bcc57f6fb35c6ae`. Os lotes de dados de outras frentes não foram repetidos. Recibos e logs ficam em `D:/Codex-outputs/wimifarma-br/catalog-dose-pack-brand-seo-2026-11-03/`, incluindo `public-feature-proof.json` e `hotfix/release-proof.json`.
