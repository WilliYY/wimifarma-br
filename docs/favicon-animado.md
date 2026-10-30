# Favicon animado — 30/10/2026

O símbolo mostrado na aba está em `public/favicon.svg`, com cópia em `src/app/icon.svg` e fallback ICO em `src/app/favicon.ico`. O layout raiz declara os ícones estáticos nos metadados.

`src/components/motion/animated-favicon.tsx` acrescenta uma animação progressiva: os dois corpos giram em sentidos opostos e os pingos chegam por cima e por baixo, preservando o “i” invertido da direita. As coordenadas, recortes e cores são as mesmas do SVG original. A marca completa permanece visível inicialmente e entre os ciclos.

Depois de 1,2 segundo, o componente produz uma única sequência de 31 quadros PNG de 32 × 32 pixels em memória. A troca ocorre a cada 80 ms durante aproximadamente 2,4 segundos, seguida por 5,6 segundos de repouso com os SVG/ICO originais. Os quadros são reutilizados, sem requisições de rede por quadro e sem dependências novas. Todos os links de favicon emitidos pelo Next.js recebem o mesmo quadro; o ícone Apple não é alterado.

Com `prefers-reduced-motion: reduce`, aba oculta ou componente desmontado, a animação para e os atributos originais dos links são restaurados. A preferência é observada também quando muda durante a navegação. O cabeçalho e a animação original da marca completa permanecem independentes.

O navegador controla a exibição final na aba. A especificação HTML não obriga atualização dinâmica do ícone; por isso o favicon estático continua disponível para navegadores que ignoram as trocas. Referência: [HTML Standard — rel=icon](https://html.spec.whatwg.org/multipage/links.html#rel-icon).

## Validação

A prévia e as evidências locais ficam em `outputs/favicon-animation/`, fora do Git: `preview.html`, `favicon-animado.gif`, `preview.png` e `quadros.png`.

- Chromium 148.0.7778.96: movimento, restauração dos links, preservação do ícone Apple, mudança de movimento reduzido, aba oculta/visível, repouso e desmontagem passaram, sem erros JavaScript.
- Quadro final de 256 × 256 pixels comparado ao SVG original: diferença zero em todos os canais. O GIF de prévia preserva os 8 segundos do ciclo; o encoder combina quadros repetidos.
- Revisão independente do código: nenhum achado bloqueante no escopo de geometria, ciclo de vida e integração no layout.
- `npm.cmd run lint`, `npm.cmd run typecheck` e `npm.cmd run test:security` passaram; segurança: 491 testes, zero falhas.
- `npm.cmd audit --omit=dev --audit-level=high` passou. A auditoria completa com `--audit-level=moderate` retornou 1: ambas reportaram 3 alertas baixos e 1 moderado, sem altos ou críticos, envolvendo `deepmerge`/`fast-uri`. Nenhuma correção automática de dependência foi aplicada nesta mudança visual.

A atualização visual da aba depende do navegador. O ensaio automatizado comprovou os quadros e os links no Chromium; a ferramenta de inspeção da interface nativa expirou, portanto não comprova a exibição na barra de abas de todos os navegadores.
