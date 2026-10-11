# 61 — Avaliações e rodapé

## Pedido e direção — 11/10/2026

Melhorar as avaliações de clientes e o rodapé usando a referência visual fornecida pelo lojista. Direção de varejo acolhedor: faixa vermelha, corpo claro, logo oficial colorida, respiro entre grupos e indicadores verdes. Mantidos Barlow, cores e componentes existentes. DFII interno: impacto 4, adequação 5, viabilidade 5, desempenho 5, risco de inconsistência 4; resultado 15, sem alegação de conversão medida.

## Avaliações

- Avatares com iniciais derivadas do nome público já abreviado; nenhuma foto de cliente ou retrato gerado por IA.
- Avaliações do sistema mantêm compra verificada, nota real, comentário, produto e indicação de incentivo de cashback existente. Relatos externos têm a origem identificada. Não são criadas avaliações, notas ou identidades fictícias em produção.
- A home também publica os 15 relatos reais do WhatsApp enviados pelo lojista, conforme atualização abaixo. Se ambas as fontes estiverem vazias, exibir o convite para avaliar compras, sem exemplos ilustrativos. O link para `/minha-conta/avaliacoes` permanece disponível; elegibilidade e cashback continuam no servidor.
- Carrossel preservado, com setas, rolagem horizontal e foco visível. Movimento reduzido também é respeitado na rolagem acionada pelas setas.

## Relatos reais do WhatsApp — 11/10/2026

O lojista forneceu uma imagem com 15 relatos e declarou serem avaliações reais recebidas pelo WhatsApp, solicitando publicação. Os comentários foram transcritos sem reescrever e as cinco estrelas da imagem foram mantidas. A autenticidade é informada pelo lojista; não houve acesso independente às conversas originais.

- Conteúdo editorial em `src/features/reviews/whatsapp-testimonials.ts`, com nomes abreviados pelo padrão público, iniciais e identificadores próprios. A captura original, nomes completos, telefones e conversas não são versionados.
- O carrossel existente reúne primeiro as avaliações do sistema e depois os relatos do WhatsApp. Cada relato externo mostra `Recebida pelo WhatsApp` e `Sobre o atendimento da Wimifarma.`. O cabeçalho informa as duas origens sem sugerir que todas as compras foram verificadas pelo site.
- Somente avaliações do sistema mantêm o selo `Compra verificada`, o link do produto e eventual aviso de incentivo. Relatos externos não criam registros no banco, não alteram médias/JSON-LD dos produtos e não concedem cashback.
- Comentários são renderizados como texto React, integralmente, sem HTML ou fotos. Setas, rolagem, foco e preferência de movimento reduzido reutilizam o comportamento existente. Rodapé e suas 128 bolhas permanecem intactos.

Conferência local realizada com o componente real, CSS de produção e fixtures em memória, sem banco: 15 comentários/notas/origens e nomes abreviados; carrossel até o último relato e retorno em 320, 390, 768 e 1440 px, sem transbordamento ou erros de página; destino do link de avaliar compras preservado. Com nenhuma avaliação do sistema, aparecem os 15 relatos. Com uma avaliação sintética de compra, aparecem 16 cartões, preservando selo, produto e incentivo somente nesta última. Capturas `outputs/whatsapp-reviews-local-*-2026-10-11.png` ficam fora do Git.

Revisão independente conferiu transcrição e cinco estrelas com a imagem, tipos, origem visível e separação das regras comerciais, sem achados. `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run build` e `npm.cmd run test:security` passaram, com 267/267 testes de segurança. `npm.cmd audit --omit=dev --json` retornou zero vulnerabilidades. Auditoria completa manteve cinco high de desenvolvimento em `@next/eslint-plugin-next`, `braces`, `eslint-config-next`, `fast-glob` e `micromatch`, sem critical e sem atualização de dependências. O executor temporário da sessão interrompida recusou o marcador de propriedade; os auxiliares foram isolados manualmente no diretório da tarefa, sem modificar o hook. Publicação será registrada após execução.

## Rodapé e selos

- Faixa de benefícios sobre o fundo de marca, corpo branco com navegação/contatos e base empresarial clara, seguindo a organização da referência sem copiar suas informações comerciais.
- Logo completa oficial sem alteração de cores. Preservados exatamente o gerador das 128 bolhas, os tempos, trajetórias, filtro `wimifarma-footer-blob` e CSS da animação.
- Selos gráficos próprios de conexão HTTPS, loja física/CNPJ e política de privacidade, com links explicativos. Não representam certificação independente. Não são exibidos Norton, Reclame AQUI, Ebit ou licenças sem concessão comprovada.
- Pix e cartão continuam informativos, sujeitos às opções e condições no checkout. Não são prometidas bandeiras, parcelamento ou garantias não confirmadas.
- Sem formulário de newsletter, horários, e-mail ou perfil social inventados. Contatos reutilizam a configuração existente.

## Escopo e segurança

Base: commit de segurança `3ffefe7`. A atualização do proxy e a restrição dos painéis continuam adiadas por decisão do titular, conforme documento 60. Esta entrega não altera infraestrutura compartilhada, permissões, APIs, banco, gateway, estoque ou regras comerciais. Nenhuma dependência, migration ou script externo é adicionado.

## Arquivos e verificação

Implementação em `src/components/site/home-page.tsx` e `src/components/site/site-footer.tsx`. Contexto atualizado em README, documento 47 e histórico de decisões. Navegação em duas colunas também no celular, com marca e contato em largura completa.

- Lint, typecheck, Prisma validate e build locais aprovados. O compilador nativo SWC foi bloqueado pela política do Windows; Next utilizou sua alternativa WASM e concluiu com código zero.
- `npm.cmd run test:security`: 267/267, sem falhas.
- `npm.cmd audit --omit=dev --audit-level=high`: zero vulnerabilidades. Auditoria completa mantém cinco high em `@next/eslint-plugin-next`, `eslint-config-next`, `fast-glob`, `micromatch` e `braces`, já registrados no documento 60; não houve atualização de dependências.
- Revisão independente apontou a rolagem explícita e o contraste dos textos pequenos; ambos foram corrigidos. Cartões, links e indicadores foram inspecionados visualmente.
- Auditoria de navegador com componentes reais e avaliações sintéticas: 320, 390, 768, 1440 e 1920 px, sem transbordamento; logo carregada, 128 bolhas/filtro, selos, links, estado vazio, iniciais, nota baixa, textos longos, incentivo e ida/volta do carrossel conferidos. Requisições de mutação do carrinho foram interceptadas; nenhum envio ou gravação real foi executado.
- Auxiliares ficaram no escopo temporário da tarefa. Capturas de referência ficam em `outputs/*-2026-10-11.png`, fora do Git.

## Publicação e conferência real

Commit `e2a567e` enviado ao GitHub e publicado com `git pull --ff-only`, `docker compose build app` e `docker compose up -d --no-deps app`. Sem migration nem recriação de Postgres, proxy ou painéis. Imagem anterior preservada em `wimifarma-br-reviews-rollback:20261011`.

Build Linux/Docker aprovado. App saudável, zero reinícios, imagem `sha256:6e01e777df22f222bf168ddeac6d3355a9370b09319b182f86675661c46f0bca`. `/api/health`, `/`, `/catalogo`, `/privacidade` e `/login` retornaram HTTP 200.

Navegador real no domínio HTTPS confirmou 320, 390, 768, 1440 e 1920 px sem transbordamento, logo carregada, selos, destinos e 128 bolhas. Movimento normal e reduzido foram conferidos. Atualmente a home não tem avaliações verificadas publicadas: o estado vazio foi aprovado em produção; os cartões preenchidos e o carrossel foram validados apenas com dados sintéticos locais. Nenhum comentário ou retrato fictício foi inserido no banco.

As requisições de mutação foram bloqueadas durante os testes públicos, incluindo as revisões automáticas do carrinho; nenhuma compra, cobrança, mensagem ou alteração de cliente foi realizada. Uma captura com recorte fora dos limites do navegador falhou; a captura de desktop foi repetida com coordenadas de página completa e concluída. Não houve alteração do produto para resolver essa limitação de captura.

Cliques reais confirmaram `Avaliar minhas compras` levando o visitante ao login com retorno preservado para `/minha-conta/avaliacoes`, e o link de privacidade do rodapé abrindo a página correta.

## Histórico — exemplos solicitados pelo lojista

Após a publicação inicial, o lojista pediu alguns exemplos públicos imediatamente. A seção sem avaliações reais passou a exibir três cartões de demonstração com iniciais e textos ilustrativos sobre navegação, consulta do produto e contato/entrega. O cabeçalho dizia `Exemplos de demonstração`, cada cartão tinha a identificação `Demonstração` e o aviso `Texto ilustrativo. Não é uma avaliação real.`. Não foram usados nomes de pessoas, fotos, estrelas nem selo de compra verificada. Essa apresentação foi posteriormente removida, conforme atualização abaixo.

Os exemplos são conteúdo de apresentação em `home-page.tsx`, sem inserção em `ProductReview`, pedidos ou contas. Não afetam a média de notas, a página de produto ou o cashback. Assim que existir qualquer avaliação real na consulta da home, os exemplos deixam de aparecer e o carrossel real permanece igual. README e histórico de decisões foram atualizados. Rodapé/bolhas e adiamento do proxy/painéis permanecem intactos.

Validação desta atualização: lint, typecheck, build e `test:security` aprovados; revisão independente sem achados. Auditoria de produção novamente com zero vulnerabilidades; auditoria completa mantém as cinco high de desenvolvimento já descritas acima. Navegador local em 320, 390, 768 e 1440 px confirmou três demonstrações, avisos visíveis, ausência de estrelas/selo de compra verificada/fotos, nenhuma rolagem horizontal e 128 bolhas. Com uma avaliação real sintética, os exemplos desapareceram e o cartão real preservou iniciais, compra verificada e aviso de incentivo. Nenhuma gravação real foi realizada.

Publicação dos exemplos: commit `7911fdd` enviado ao GitHub e aplicado no servidor com pull, build Docker e atualização exclusiva de `app`, sem migration. Imagem anterior guardada em `wimifarma-br-demo-rollback:20261011`. App saudável, zero reinícios, imagem `sha256:c3186fdd7bffc19e0d6470da860f83e7376e8d3b14fd9487793ec430030d8149`; health, home, catálogo, privacidade e login retornaram HTTP 200. O navegador no domínio HTTPS confirmou os três cartões/avisos em 320, 390, 768 e 1440 px, sem estrelas, selo de compra verificada, fotos, transbordamento ou erros de página, com 128 bolhas e o destino de avaliação preservado. Capturas em `outputs/demo-reviews-live-*-2026-10-11.png`, fora do Git. Requisições de mutação foram bloqueadas durante a verificação; não houve compra, cobrança ou inserção de avaliação no banco.

## Atualização — remoção dos exemplos

O lojista solicitou a retirada dos cartões ilustrativos. A home volta a mostrar somente o convite `Sua experiência tem espaço aqui.` quando a consulta de avaliações verificadas estiver vazia. Foram removidos os três textos, nomes e identificações de demonstração. O carrossel de avaliações reais e o link para avaliar compras permanecem iguais; banco, API, média de notas e cashback não foram alterados.

README e histórico atualizados. Não há mudança no rodapé, nas bolhas, nos selos ou nas decisões adiadas de proxy/painéis.

Validação local da remoção: build aprovado, incluindo lint e verificação de tipos; `test:security` com 267/267. Auditoria de produção novamente com zero vulnerabilidades; auditoria completa mantém as cinco high de desenvolvimento já registradas. O diff de `home-page.tsx` e `site-footer.tsx` contra `e2a567e` está vazio: o estado visual anterior aos exemplos e o fluxo de avaliações reais foram restaurados integralmente. Nenhuma dependência ou migration foi alterada.

Remoção publicada no commit `0c60ea4`, após push/pull e atualização exclusiva de `app`. A imagem anterior foi preservada em `wimifarma-br-reviews-removal-rollback:20261011`. Build Linux/Docker aprovado; app saudável, zero reinícios, imagem `sha256:ffeb1281632f9edb3b5c2f8a6f143f3a475c472d2e08ac1b8410d92b9fc3aefa`. Health, home, catálogo, privacidade e login retornaram HTTP 200. Navegador real confirmou ausência dos cartões/textos de demonstração, convite e link de avaliação presentes, 128 bolhas/filtro preservados, sem transbordamento nem erros de página em 320, 390, 768 e 1440 px. Capturas em `outputs/reviews-removal-live-*-2026-10-11.png`, fora do Git. Requisições de mutação foram bloqueadas; nenhuma avaliação, compra ou cobrança foi criada durante a conferência.
