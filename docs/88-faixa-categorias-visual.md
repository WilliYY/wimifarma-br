# 88 — Faixa de categorias com imagem suave

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
- Build Linux e conferência publicada serão registrados após a execução. Capturas ficam em `outputs/categorias-2026-10-20`, fora do Git.

O pedido é visual. Frete, condições de gratuidade, Pix, cashback, WimiCoins, custos e emissão fiscal não foram alterados por esta entrega; os riscos identificados na auditoria comercial anterior continuam pendentes.
