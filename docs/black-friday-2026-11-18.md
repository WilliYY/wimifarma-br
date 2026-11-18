# Black Friday — selos e faixa superior

Campanha visual autorizada em 18/11/2026: selo pequeno `Black Friday` na faixa superior dos cartões de produto, incluindo a variante compacta e cartões sob consulta/prescrição. O destaque `Black Friday Wimifarma` entra como primeiro item na faixa rotativa existente, com link para `/catalogo`. Alturas da faixa, rotação de sete segundos, pausa ao interagir e movimento reduzido são preservados.

A identidade da loja, fotos, preços, descontos calculados, estoque, ações de compra, regras de receita e benefícios de frete continuam usando os contratos existentes. O selo identifica a campanha; não cria desconto ou condição comercial. Não há banner grande, dependência, integração, migration ou alteração de dados.

## Vigência e retirada

Fonte única: `src/features/offers/black-friday.ts`.

- Início: 18/11/2026 às 00h de Brasília.
- Fim exclusivo: **01/12/2026 às 00h de Brasília**, portanto vale até o fim de 30/11.
- Para retirar antecipadamente, mudar somente `blackFridayCampaign.enabled` para `false` e publicar. Os selos e a mensagem saem juntos.
- O layout fornece o estado inicial calculado no servidor. Um único provider público agenda a transição e revalida ao voltar à aba/janela, inclusive quando a página permanece aberta durante a virada do mês. Nenhum temporizador é criado por produto.
- Após o término, a faixa volta aos três destaques anteriores e os selos deixam de renderizar. A remoção definitiva do código é opcional e pode ser feita em uma alteração posterior.

## Verificação

Regressões em `src/features/offers/black-friday.test.ts` verificam o desligamento central e as fronteiras de data em Brasília. `src/components/site/black-friday-campaign.test.ts` usa relógio controlado e produtos sintéticos para conferir os quatro cartões, encaixe em 320/390/1280 px, altura/rotação/pausa da faixa, movimento reduzido e retirada conjunta na virada com a aba aberta. As suites existentes de consulta e ações dos cartões protegem as regras comerciais.

Comando dirigido: `node node_modules/tsx/dist/cli.mjs --test src/features/offers/black-friday.test.ts src/components/site/black-friday-campaign.test.ts src/components/site/consultation-catalog-ui.test.ts src/components/site/product-card-actions.test.ts`.

Evidências operacionais e capturas ficam fora do Git em `D:/Codex-outputs/wimifarma-br/blackfriday-labels-2026-11-18/`.

Validação local: 27 testes dirigidos, 577 testes de segurança, lint, typecheck, Prisma validate e `git diff --check` passaram. A regressão da campanha foi repetida após o ajuste para não deixar margem nos slots vazios: cinco testes aprovados. Revisão independente sem achados pendentes. A auditoria de produção passou com quatro alertas moderados (`fast-uri`, `glob`, `minimatch`, `react-email`) e nenhum alto/crítico. A auditoria completa retornou exit 1: oito moderados e nove altos na cadeia de ferramentas de desenvolvimento, incluindo `eslint-config-next`, `@next/eslint-plugin-next`, `@typescript-eslint/typescript-estree`, `eslint-import-resolver-typescript`, `fast-glob`, `fdir`, `micromatch`, `picomatch` e `tinyglobby`; zero críticos. Manifesto e lock de dependências não foram alterados nesta tarefa.
