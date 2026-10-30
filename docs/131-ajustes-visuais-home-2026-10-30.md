# 131 — Ajustes visuais da home, cartões e rodapé

## Escopo de 30/10/2026

Direção: varejo acolhedor com composição compacta, tipografia e cores existentes. Os anéis multicoloridos continuam como detalhe de interação. Sem dependências, novas campanhas ou mudanças em preço, estoque, checkout, dados cadastrais e logística.

- **Rodapé legal:** conteúdo integral e centralizado, com entrelinha de 16 px, menos margens e padding. Fonte de 12 px no celular e 11 px a partir de 640 px. Links mantêm foco e altura mínima de 44 px no celular e 32 px nas telas maiores. Nenhum texto, dado ou destino foi retirado. `site-gooey-footer`, as 128 bolhas, tempos, filtro `wimifarma-footer-blob` e movimento reduzido permanecem.
- **Cartões:** faixa superior no fluxo normal, com altura mínima de 36 px e quebra de linha para acomodar futuros selos aprovados. OFF usa exclusivamente `productOfferDiscount` e a referência existente; a distinção entre PMC e preço anterior permanece. Foto contida e cashback em área própria abaixo, sem sobrepor foto ou preço. Slots mantêm cartões/preços alinhados.
- **Frete e campanhas futuras:** o DTO dos cartões não contém uma cotação validada por CEP, carrinho, margem e serviço. Não se publica selo de frete grátis nem chamada genérica de gratuidade. O benefício continua apresentado exclusivamente pela cotação existente, conforme [107](107-frete-cep-e-contribuicao.md). A faixa flexível permite acomodar futuros selos, mas não implementa campanha “leve/pague” nem nova elegibilidade.
- **Marcas:** removidos os dois botões de seta sobrepostos e seu estado/CSS exclusivo. Marcas/logos, links, arraste, swipe, teclas direcionais, avanço de 24 px/s, looping, pausas de interação/visibilidade e movimento reduzido permanecem.
- **Categorias:** retirados “Encontre seu cuidado”, “Ver catálogo” e controles de seta do cabeçalho. Os oito links, ícones, rótulos e rolagem horizontal por mouse, toque e teclado permanecem. O halo dos anéis fica um pouco mais intenso apenas em hover, foco visível ou toque; repouso conserva opacidade 0,64. Somente opacidade/transforms animam: sombras são estáticas, sem filtros por quadro. A logo oficial não foi alterada.
- **Marketing:** emojis pontuais nos três títulos do carrossel principal e nas vitrines de cuidados/economia. Textos legais/técnicos e regras comerciais preservados. As três vitrines continuam com `compactHeader`, sem contagem visível ou setas, e com “Ver catálogo” discreto.

## Verificação e publicação

A validação usa fixtures locais com dados sintéticos e testes existentes de layout, gestos e acessibilidade. Não exige compra ou checkout real. Capturas e registro operacional ficam em `outputs/ajustes-visuais-2026-10-30/`, fora do Git.

O chat de origem encerrou sua janela DATA+APP e liberou a janela APP para esta entrega. Antes da publicação, conferir a cadeia Compose efetiva, preservar PostgreSQL/canônico e usar fonte imutável com backup e imagem anterior. Não repetir operadores de logística. O resultado de checks e publicação será registrado após a execução.

Validação local aprovada: 44 testes dirigidos (31 cenários Chromium e 13 regras de marcas), 491 testes de segurança, `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run prisma:validate` e `git diff --check`. Capturas inspecionadas de celular/desktop; layouts cobertos entre 320 e 1920 px conforme o componente. Uma diferença de altura entre cartões com/sem OFF foi encontrada e corrigida antes do fechamento. Na amostra de 1,2 s com três anéis acesos: zero layouts, um recálculo de estilo, 5,373 ms de tarefas e nenhuma long task. A medição em Chromium não representa garantia para todos os aparelhos físicos.

Revisão independente estática sem achados de código. Auditorias completa e de produção: três alertas baixos (`@react-email/render`, `html-to-text`, `deepmerge`) e um moderado (`fast-uri`), zero altos/críticos. O gate de produção `npm.cmd audit --omit=dev --audit-level=high --json` passou; a auditoria completa retornou exit 1 pelos alertas registrados. Dependências preservadas.
