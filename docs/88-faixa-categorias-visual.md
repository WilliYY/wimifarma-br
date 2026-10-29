# 88 — Faixa de categorias da home

## Revisão atual — 29/10/2026

Substitui a apresentação histórica descrita abaixo: oito ícones em círculos menores, sem fotos e sem painel externo, ocupam uma faixa de até 180 px nas larguras verificadas. Ofertas mantém destaque vermelho; os outros círculos usam os tokens suaves da marca. Higiene bucal e Cabelos complementam os seis acessos anteriores e usam filtros existentes, sem duplicar o destino de Perfumaria. Movimento independente curto em CSS, com suspensão por visibilidade e preferência do sistema; arraste, teclado, foco e alvos de toque preservados. Contrato do banner e das dimensões em [10](10-layout-e-experiencia.md#home-compacta--29102026).

## Símbolos livres em largura total — 26/10/2026

A pedido do lojista, esta direção substitui os círculos com fotos descritos no histórico abaixo. Os seis atalhos usam somente os símbolos já existentes: desconto, bebê, cápsula, folha, gotas e perfumaria. Nomes, ordem e destinos permanecem iguais. Não há foto, fundo ou contorno nos itens, nem caixa externa; `imageUrl` recebido pelo componente é ignorado.

A faixa usa 100% da largura normal da página, com respiros responsivos nas extremidades, sem `100vw` que poderia gerar transbordamento. O banner mantém seu limite de largura anterior. Arraste por mouse, toque nativo, teclado, clique e setas são preservados; as setas ficam ocultas quando todos os atalhos cabem. Não há rotação automática. A entrada escalonada ocorre uma vez; hover e toque dão retorno leve. `prefers-reduced-motion` remove animação e suavização.

Ícones de 56 px no celular e 72 px no desktop, rótulos de 14/16 px e setas de 44 px mantêm leitura e acesso. Regressões cobrem 320–1920 px, ausência de fotos e molduras, overflow restrito à faixa, arraste sem navegação acidental, toque sem bloquear a página, destinos, foco e movimento reduzido.

Validação local: cinco testes dirigidos de UI/vitrines, 485 testes de segurança e build com lint e tipos passaram. Revisão independente sem achados acionáveis. Auditorias completa e de produção mantêm um alerta moderado preexistente em `fast-uri`, zero high/critical; não houve alteração de dependências. Comandos: `tsx --test src/features/products/home-shortcuts-ui.test.ts src/components/site/home-showcases.test.ts`, `npm run test:security`, `npm run build`, `npm audit --json` e `npm audit --omit=dev --audit-level=high --json`.

## Correção dos agrupamentos — 26/10/2026

A auditoria somente leitura encontrou 24 apresentações de fraldas adultas incluídas indevidamente em Infantil pelo alias amplo `fraldas`. O agrupamento agora usa `fraldas infantis`, preservando somente a categoria legada exata `Fraldas`. Fraldas adultas continuam acessíveis por sua categoria própria; não foram reclassificadas ou desativadas.

As categorias Cabelos e Cuidados com os cabelos, com 39 produtos ativos no snapshot, e Lenços e toalhas umedecidas, com 25, passam a compor o grupo `beauty` de perfumaria/higiene e beleza. Proteção solar e Cuidados com a pele, com 12 ativos, passam ao grupo Dermo. As 25 apresentações de Nutrição, classificadas como FOOD, conservam sua categoria própria e não viram vitaminas/suplementos. Os números descrevem o snapshot de 26/10 às 14:38:39 UTC, não estoque garantido ou novas inclusões.

As subseções de Infantil exigem uma categoria já pertencente ao grupo antes de aplicar padrões de nome. Isso impede que lenços genéricos ou fraldas adultas entrem em Infantil só pelo texto. Os 25 produtos com baby/bebê/infantil em outras categorias continuam para revisão individual, sem heurística de transferência automática.

Mudança restrita a agrupamento e seleção visual, sem escrita em produtos, ofertas, receita, preços, benefícios ou política de compra. Cinco regressões reproduziram os erros antes da correção; 38 testes ampliados, lint focado, typecheck e build local passaram. Revisão independente aprovou o escopo e reproduziu 34 casos dirigidos. Passaram os 485 testes de segurança. Auditorias completa e de produção registram um alerta moderado `fast-uri`, zero high/critical. Provas e limites da publicação ficam em `outputs/catalogo-auditoria-integral-2026-10-26/categorias/`.

## Círculos ligados ao catálogo — 26/10/2026

Esta atualização substitui a grade de cartões de 23/10 e a fotografia institucional descrita no histórico de 20/10 abaixo. Ofertas, Infantil, Medicamentos, Vitaminas e suplementos, Dermo e Perfumaria continuam com seus seis nomes, ordem e destinos internos.

Cada círculo recebe uma foto real de produto do respectivo grupo, usando a consulta de produtos e `validatedHomePhotos` já existentes na home, sem nova consulta ao banco. A seleção é determinística por dia de Brasília e exige caminho local de produto validado, disponibilidade comercial e preço positivo. Receita e Farmácia Popular não entram na escolha visual; em Medicamentos é exigida classificação consistente `MEDICINE`, `otc: true`. Ofertas usa `isDiscountedOffer`, sem inventar desconto nem antecipar Pix. Ausência de candidata ou falha de carregamento conserva ícone e nome; o destino do grupo continua acessível.

`HomeShortcuts` usa uma linha horizontal com círculos de 108, 128 ou 152 px, foto contida e nomes abaixo. Arraste com mouse inicia após seis pixels e suprime somente o clique do gesto; toque usa rolagem nativa, preservando a página vertical. Setas de 44 px, foco visível, teclado e movimento reduzido permanecem disponíveis. Limites das setas acompanham rolagem e redimensionamento; listeners, observer e frames são removidos no unmount. Não há rotação automática da faixa nem dependência adicional.

A seleção das imagens de categorias é independente da faixa de marcas: nesta última, fotos de produtos são proibidas; contrato em [82](82-marcas-do-catalogo.md).

Regressões direcionadas: quatro de seleção e quatro de UI em Chromium. Cobrem cinco larguras entre 320 e 1440 px, círculos, destinos, arraste sem navegação, clique/Enter, teclado/setas, toque horizontal e página vertical, imagem ausente e movimento reduzido.

Publicado no app em `1749a08`: imagem `sha256:ae88a40a5161375cc55d30d35c50e6516035784fe1ef8c9267b6d782e963a853`, app saudável e zero reinícios inesperados. A imagem anterior fica em `wimifarma-br-app:pre-categories-brands-1749a08`; PostgreSQL permaneceu saudável com início em `2026-10-03T17:26:23.117826283Z`, sem reinício ou migração. Conferência pública em 1280 e 390 px: seis círculos, fotos carregadas conforme visibilidade, links preservados, avanço até o fim e setas nos limites, sem transbordamento da página. Evidências em `outputs/home-categories-brands-2026-10-26/`, fora do Git. Viewport de QA restaurado.

## Pedido e direção visual — 20/10/2026

O lojista pediu mais presença visual e confiança na faixa de seis categorias entre o cabeçalho e o carrossel principal. A direção é varejo acolhedor: fotografia discreta ao fundo, círculos claros com acabamento no vermelho da marca e nomes sempre legíveis. DFII 14 (impacto 4, adequação 5, implementação 4, desempenho 4, risco 3).

## Implementação

- `HomeShortcuts` recebe uma camada fotográfica decorativa com `contato-farmaceutica.webp`, já pertencente ao acervo institucional. É uma cena ilustrativa existente, não uma identificação de funcionário ou cliente real.
- A imagem tem alternativa vazia e camada `aria-hidden`, opacidade reduzida, saturação discreta e sobreposição clara. O `Next/Image` entrega resolução responsiva e qualidade 75, já permitida pela configuração do projeto, sem prioridade de download acima da campanha principal.
- O fundo fica contido em painel de bordas suaves. Círculos ganham contorno, profundidade leve e indicação visual de acesso. Tipografia Barlow e tokens de cor existentes preservados.
- CSS isolado em `home-shortcuts.module.css`; sem mudanças de tokens globais, dependências, banners, header, logo animada ou rodapé.
- Seis nomes, ordem e destinos continuam em `buildHomeShortcuts()`: Ofertas, Infantil, Medicamentos, Vitaminas e suplementos, Dermo e Perfumaria. Nenhuma categoria passa a WhatsApp ou recebe promessa de estoque.
- Rolagem por toque/teclado, setas, foco visível, alvos de 44 px e preferência de movimento reduzido continuam no componente existente.
- O mock de CSS da regressão `home-showcases.test.ts` inclui o novo módulo. Esse teste continua verificando a separação das vitrines; a mudança não acrescenta regras de catálogo.

## Verificação e publicação

- TypeScript completo (`npm.cmd run typecheck`) e ESLint completo (`node node_modules/eslint/bin/eslint.js .`) aprovados; `git diff --check` sem falhas.
- Três testes de atalhos e vitrines aprovados; 420/420 testes de segurança aprovados. A fixture de symlink depende de privilégio do Windows; seu teste de falha operacional passou, sem caso ignorado.
- Preview com componente, CSS atual e imagem reais em 320, 390, 768, 1280 e 1440 px: seis links corretos, imagem carregada, setas nos limites, foco de teclado, movimento reduzido e ausência de transbordamento horizontal. Capturas inspecionadas em desktop e celular.
- Revisão independente aprovada, sem achados materiais; inclui parsing do CSS e lint dos arquivos TypeScript alterados.
- Auditoria de produção sem vulnerabilidades. Auditoria completa mantém cinco alertas altos nas ferramentas de desenvolvimento (`@next/eslint-plugin-next`, `eslint-config-next`, `braces`, `fast-glob`, `micromatch`), zero críticos. Nenhuma dependência alterada.
- Build Linux aprovado, incluindo lint/TypeScript e geração de 39 páginas estáticas. Capturas ficam em `outputs/categorias-2026-10-20`, fora do Git.

## Publicação e conferência real

- Código `4ac0e64558b420fdcbe479d6df648060d1a75aa4` (`feat(home): add soft pharmacy backdrop to category shortcuts`) enviado ao GitHub e publicado somente no app, com imagem anterior preservada para reversão.
- Container `wimifarma-br-app` saudável, revisão OCI igual ao código e imagem `sha256:a9031776b6f8a46df8fbebcf9d32e86a72b7c0deae5c5d78db579bb90e4ca13e`.
- Home publicada inspecionada em 1440 × 1000 e 390 × 844: fotografia otimizada carregada com qualidade permitida, seis nomes/destinos internos e nenhum transbordamento horizontal. Seta no celular avançou até Medicamentos/Vitaminas, habilitando o retorno. Viewport temporário restaurado e aba de conferência encerrada.
- Evidências: `categorias-publicadas-1440.png` e `categorias-publicadas-390.png`. Conferência pública sem interação com carrinho, pedidos, pagamentos ou contas.

O pedido é visual. Frete, condições de gratuidade, Pix, cashback, WimiCoins, custos e emissão fiscal não foram alterados por esta entrega; os riscos identificados na auditoria comercial anterior continuam pendentes.
