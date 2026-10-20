# 80 — Descrições públicas dos produtos

## Pedido e comportamento

Em 19/10/2026, o lojista pediu descrições mais bonitas e atraentes para o consumidor em todo o catálogo. A página de produto passa a apresentar textos em parágrafos, com uma abertura de autocuidado, contexto do tipo de item e apoio da equipe da Wimifarma.

`buildPublicProductDescription` substitui apenas descrições vazias ou o template completo da importação que começa com o nome/marca e termina com “Conserve conforme as orientações do fabricante.”. Textos editoriais existentes têm prioridade, incluindo suas quebras de linha. Acrescentar conteúdo manual ao template também impede a substituição automática.

A mudança ocorre na apresentação pública: descrição visível, metadados de compartilhamento e dados estruturados `Product` recebem o mesmo conteúdo. O texto original continua no cadastro ADMIN. Não há gravação em massa, migration, chamada de IA ou consulta externa durante a navegação. Uma edição editorial no ADMIN passa a aparecer normalmente.

## Identidade e limites

- As famílias reconhecidas incluem shampoos, pré-shampoos, condicionadores, máscaras capilares, proteção solar, pós-sol, desodorantes, limpeza, esfoliação, cuidado labial, mãos/pés, olhos, barbear, séruns, corpo, rosto e hidratação. As abreviações do cadastro são tratadas apenas para escolher o texto; o nome, a marca, a variante e a unidade continuam preservados.
- Um fator solar isolado não converte hidratante em protetor dedicado. Cuidado labial tem prioridade sobre referências à linha Sun. Sérum noturno não recebe promessa de proteção solar.
- As frases gerais descrevem a etapa de cuidado do tipo de produto. Não acrescentam ativos, tipos de pele, porcentagens de resultado, duração, certificações, textura específica, disponibilidade ou preço que não estejam comprovados para a apresentação.
- Produtos sem tipo reconhecido recebem apresentação neutra e orientação de escolha. Medicamentos, incluindo MIP/OTC classificados administrativamente, e Farmácia Popular têm tratamento informativo quando faltam textos editoriais; não recebem linguagem promocional de cosméticos nem promessa de efeito clínico. As regras de receita e dispensação permanecem nas áreas próprias.
- Fontes, custos e ofertas privadas de fornecedores não compõem o texto público. O comportamento não altera preço, estoque, margem, classificação, cotas, validade ou regras do checkout.

## Referência específica conferida

O Shampoo Vichy Dercos Collagen Repair 17 **200 g**, GTIN canônico `07908966523652`, recebe texto próprio. A [página oficial da Vichy](https://www.vichy.com.br/todos-os-produtos/haircare/shampoos/shampoo-collagen-repair-17), consultada em 19/10/2026, informa fortalecimento dos fios, peptídeos pró-colágeno, ácido cítrico, textura cremosa, espuma suave e indicação para todos os tipos de cabelo. A descrição usa esses fatos sem reproduzir porcentagens ou ampliar as promessas.

A seleção exige simultaneamente GTIN exato, marca Vichy e nome compatível com shampoo 200 g. O EAN de 13 dígitos e seu equivalente com zero inicial são aceitos; outros indicadores de embalagem, tamanhos, condicionadores e pré-shampoos não herdam esse texto.

## Verificação

Regressões em `src/features/products/product-description.test.ts` cobrem template importado, prioridade editorial, variante/GTIN, abreviações, áreas de aplicação, limites de proteção solar, medicamentos e campos vazios. A conferência local dos sete manifestos aprovados demonstrou substituição dos **304/304** templates: 303 receberam contexto de tipo e um recebeu apresentação neutra por identificação insuficiente. Manifestos e evidências comerciais continuam privados em `outputs`, fora do Git.

Testes, checks e situação de publicação são registrados na entrega desta alteração. Validação do helper e dos arquivos locais não comprova publicação no servidor.
