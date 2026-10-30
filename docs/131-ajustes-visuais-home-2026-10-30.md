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

O chat de origem encerrou sua janela DATA+APP e liberou a janela APP para esta entrega. A cadeia Compose efetiva foi reobservada, com fonte imutável, backup verificado e imagem anterior preservada. Nenhum operador de logística foi repetido.

Validação local aprovada: 44 testes dirigidos (31 cenários Chromium e 13 regras de marcas), 491 testes de segurança, `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run prisma:validate` e `git diff --check`. Capturas inspecionadas de celular/desktop; layouts cobertos entre 320 e 1920 px conforme o componente. Uma diferença de altura entre cartões com/sem OFF foi encontrada e corrigida antes do fechamento. Na amostra de 1,2 s com três anéis acesos: zero layouts, um recálculo de estilo, 5,373 ms de tarefas e nenhuma long task. A medição em Chromium não representa garantia para todos os aparelhos físicos.

Revisão independente estática sem achados de código. Auditorias completa e de produção: três alertas baixos (`@react-email/render`, `html-to-text`, `deepmerge`) e um moderado (`fast-uri`), zero altos/críticos. O gate de produção `npm.cmd audit --omit=dev --audit-level=high --json` passou; a auditoria completa retornou exit 1 pelos alertas registrados. Dependências preservadas.

## Publicação e conferência real

- Fonte/OCI `47ca8c1b608a8f0189d649c8ee6af9a7991fca69`, construída em Linux/Docker com sucesso. Imagem imutável `sha256:a0d76978d9c380dab28328c98113190c01f6c0ca5de50620c85ce98da839caf2`.
- Publicação final verificada em `visual-01a18e5b-20261030-47ca8c1-recovery`, somente com `up app --no-deps --no-build --pull never`. App `fc2706363d9934d3e681ad21507f367271554a36cc27ff74d72869873ee85c90`, iniciado em `2026-10-30T20:32:40.038998033Z`, saudável. Cadeia efetiva de 16 arquivos: os 14 anteriores, rollback da primeira tentativa visual e override da recuperação.
- PostgreSQL preservado: mesmo ID `39b3208b5633f163cf791392276063f78c0f61e9baf9de72b2ea69d86346a541`, imagem e início em 03/10. Sem migration/seed, reinício do banco ou mutação comercial. Comparação integral de 3.064 produtos, 3.455 ofertas de fornecedores, uma oferta e 15 pedidos idêntica antes/depois. Canônico SHA-256 `4a7c31663dff0beff4fc6071b10756a36ed11ed0289cc0fce511d893460534b6` intacto.
- QA pública aprovada em 320/390/768/1440 px: 45 cartões com faixa acima da foto, duas colunas no celular, preços/ações preservados, atalhos sem cabeçalho/setas, marcas sem botões sobrepostos e cabeçalhos compactos das três vitrines. Rodapé centralizado nas fontes previstas, seis links legais, 128 bolhas e filtro original. Teclado/foco/movimento reduzido aprovados, zero overflow e zero erros de página. Capturas de celular/desktop inspecionadas.
- Home/health HTTPS 200, `/api/produtos` 401 anônimo. A QA usou contexto isolado, bloqueou visitas/analytics e requisições de escrita (duas tentativas bloqueadas), sem pedido, pagamento ou mensagem. Evidência em `outputs/ajustes-visuais-2026-10-30/public/qa-result.json` e `deployment/result.json`.

### Interrupção inicial e recuperação

O primeiro procedimento retornou `APP_RUNTIME_CONTRACT_CHANGED` e restaurou a imagem anterior, comprovada saudável com HTTP 200/200/401. O comparador inicial usava listas ordenadas de variáveis e vínculos de volumes; uma regressão sintética reproduziu a rejeição indevida de reordenação. O ambiente restaurado tinha as mesmas 44 chaves/valores da imagem e configuração congeladas, defaults de ambiente idênticos entre as duas imagens e configuração Compose original sem mudança. O hash antigo isolado não permite reconstruir retrospectivamente sua ordem/valores; essa limitação não foi apresentada como prova exata da ordem original.

A recuperação usa novo diretório e baseline exata, mantendo operadores, marcadores e recibos anteriores. Compara mapa de ambiente sem chaves duplicadas e vínculos ordenados, preservando valores, volumes, portas e redes. Adota a imagem já construída somente após conferir commit, archive e manifesto de fonte; não reconstrói nem repete jobs. A revisão independente aprovou a recuperação após cinco simulações de sucesso/falha/identidade incerta e regressão de reordenação versus alteração real de valor. SHA-256 do operador revisado e conferido remotamente: `7196f0f7b0b54da856610d8d12364647dd4464e42210649046a873e8b6486205`. Backup novo, imagem anterior e logs privados permanecem no VPS.
