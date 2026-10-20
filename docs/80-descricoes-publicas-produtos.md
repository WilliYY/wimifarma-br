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

## Entrega e comprovação em 19/10/2026

- Código em `f31a398` (`feat(products): improve public catalog descriptions`), enviado ao GitHub e publicado no servidor. `git pull --ff-only` foi fixado nesse commit; `docker compose build app` e `docker compose up -d --no-deps app` concluíram. Health respondeu `ok: true`; imagem anterior preservada como `wimifarma-br-app:pre-descriptions-f31a398`. Nenhuma migration ou alteração de banco foi necessária.
- Cópia isolada do commit: build com saída zero e **19/19** testes de descrição/detalhe, incluindo dez novas regressões. Durante a execução na pasta compartilhada, a suite geral passou **859/859** e segurança **387/387**. A cópia isolada impediu que alterações simultâneas de fornecedor entrassem no build publicado.
- Comandos locais: `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run prisma:validate`, `npm.cmd run test:all`, `npm.cmd run test:security`, `npm.cmd run build` e `git diff --check`. Auditoria de produção com bloqueio high retornou zero alertas; completa com bloqueio critical mantém cinco high conhecidos em `@next/eslint-plugin-next`, `braces`, `eslint-config-next`, `fast-glob` e `micromatch`.
- Leitura pública após publicação: as **375 páginas de produto do sitemap** responderam 200 e apresentaram dados estruturados de produto. Os **304 EANs** esperados estavam presentes e suas descrições estruturadas não continham mais o template antigo. Na amostra Dercos/óleo corporal ISDIN, descrição visível e estruturada foram iguais após normalizar espaços; o SEO mantém texto corrido e a página preserva os parágrafos. O Dercos foi também conferido visualmente no navegador.
- Arquivos desta entrega: helper `product-description.ts`, regressões `product-description.test.ts`, página `produto/[slug]/page.tsx`, README, histórico 07 e este documento. A cópia de QA foi arquivada após a validação; a pasta de dependências compartilhada permaneceu preservada. Não houve pedido, pagamento ou envio de mensagem.
