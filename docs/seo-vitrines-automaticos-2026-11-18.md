# SEO e vitrines automáticos — 18/11/2026

## Orientação no catálogo administrativo

O catálogo informa que o SEO é preparado automaticamente ao publicar o produto. A ferramenta agora se chama **SEO automático** e apresenta a divulgação como opcional: copiar links e textos ou exportar o catálogo não é uma etapa necessária para cada produto publicado.

A página publicada e sua inclusão no sitemap ajudam na descoberta pelos buscadores. Isso não comprova indexação, posição ou aprovação pelo Google. A exportação para o Merchant Center continua sendo um arquivo para revisão; não publica anúncios automaticamente.

As vitrines da página inicial já fazem rodízio diário pelo dia de Brasília. A seleção é determinística para o mesmo dia e os mesmos dados do catálogo; mudanças de preço, disponibilidade e elegibilidade podem alterar os candidatos durante o dia. Não exigem selecionar cada produto no catálogo. Contratos: [SEO automático](25-seo-automatico-e-lixeira.md) e [vitrines diárias](136-revisao-comercial-e-estimativas-finais.md).

## Seleção manual preservada

O antigo controle **Destacar** passa a dizer **Selecionar manualmente**. O formulário, a contagem, a posição, as mensagens e o atalho de organização também identificam a seleção manual. O catálogo esclarece que essa seleção não controla as vitrines automáticas da página inicial.

A alteração é somente de textos e orientação administrativa. Handlers, payloads, APIs, banco, regras comerciais, edição de custos e critérios de publicação permanecem preservados.

## Validação e limites

`git diff --check` e ESLint dos dois componentes passaram. A revisão independente aprovou os textos e confirmou a sintaxe dos TSX, sem alteração de handlers ou payloads. As dependências existentes foram reaproveitadas, sem instalação ou atualização de pacotes.

Typecheck aprovado. Passaram 577 testes de segurança e 38 regressões existentes de SEO, feed, rodízio, diversidade das famílias e composição das vitrines. Auditoria de produção: quatro alertas moderados, zero altos e críticos. Auditoria completa: nove moderados, zero altos e críticos; saída 1 pelo limite moderado. As alterações não atualizam dependências nem mudam código público, animações, critérios de venda ou dados de produtos.

Conferência HTTP de produção: home, catálogo, ofertas, health, robots e sitemap responderam 200. O sitemap continha 3.070 URLs de produtos. Três páginas públicas, incluindo produto de loja física e medicamento, apresentaram título, descrição, canonical e dados estruturados. Essa amostra não equivale a revisar cada URL nem comprova indexação pelo Google.

Desempenho: uma amostra da home em navegador isolado registrou FCP de 1.300 ms, LCP de 1.516 ms e CLS de aproximadamente 0,012. A janela com animações ativas teve intervalos de quadros elevados; o movimento reduzido diminuiu o trabalho de estilos. Pausar apenas o glow não eliminou o custo. A origem específica não foi confirmada; nenhuma otimização CSS experimental foi incorporada.

O acesso ao navegador ficou indisponível nesta conversa antes de concluir a rolagem, o teste móvel e a inspeção visual dos novos textos. A API externa PageSpeed retornou 429 por cota diária esgotada. Não há nota Lighthouse nem aprovação de fluidez integral. Diagnósticos CSS ocorreram apenas na aba descartável de teste, que foi fechada; não alteraram o servidor ou os dados comerciais.

Esta mudança de textos não comprova publicação em produção, indexação no Google ou campanhas externas.
