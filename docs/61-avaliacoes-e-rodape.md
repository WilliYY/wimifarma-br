# 61 — Avaliações e rodapé

## Pedido e direção — 11/10/2026

Melhorar as avaliações de clientes e o rodapé usando a referência visual fornecida pelo lojista. Direção de varejo acolhedor: faixa vermelha, corpo claro, logo oficial colorida, respiro entre grupos e indicadores verdes. Mantidos Barlow, cores e componentes existentes. DFII interno: impacto 4, adequação 5, viabilidade 5, desempenho 5, risco de inconsistência 4; resultado 15, sem alegação de conversão medida.

## Avaliações

- Avatares com iniciais derivadas do nome público já abreviado; nenhuma foto de cliente ou retrato gerado por IA.
- Cartões com nome, compra verificada, nota real, comentário, produto e indicação de incentivo de cashback existente. Não são criadas avaliações, notas ou identidades fictícias em produção.
- Estado vazio com convite para compartilhar a experiência e link para `/minha-conta/avaliacoes`. Regras de elegibilidade e concessão de cashback permanecem no servidor.
- Carrossel preservado, com setas, rolagem horizontal e foco visível. Movimento reduzido também é respeitado na rolagem acionada pelas setas.

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

A evidência final da publicação será acrescentada após conferência no servidor e no domínio público.
