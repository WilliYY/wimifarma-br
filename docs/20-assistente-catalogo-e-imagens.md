# Assistente de catalogo e sugestoes de imagens

## Escopo de 2026-09-21

Atender medicamentos, suplementos, higiene, perfumaria, alimentos/chocolates, dispositivos e outros itens comerciais. Nome/EAN/foto sao evidencias de identidade; categoria existente nao e uma lista de permissoes. Preenchimento automatico continua limitado a campos vazios e identidade confirmada. Nao cadastrar o KitKat usado como exemplo pelo lojista.

Fotos: analisar a embalagem enviada, pesquisar outras fotos reais e oferecer artes publicitarias opcionais. O administrador escolhe uma capa; nenhuma sugestao substitui a foto automaticamente. Verso/lateral precisam de foto real; nao gerar rotulos, ingredientes, EAN ou informacoes nao visiveis. Artes geradas devem ser identificadas como ilustrativas e revisadas antes da escolha.

## Limites tecnicos

- Sem migration ou mudanca em preco, estoque, cashback, receita ou Farmacia Popular.
- Fotos e pesquisas sao previas; persistencia apenas pelo fluxo de upload/selecionar/salvar existente.
- Segredos somente no servidor; APIs administrativas autenticadas, limitadas e sem cache.
- Downloads externos com HTTPS, enderecos publicos validados e fixados por DNS, limites de redirecionamento, tempo, bytes e pixels. Nao buscar URLs privadas nem aceitar enderecos arbitrarios do navegador para persistencia.
- Falta de fonte/foto ou falha do provedor gera estado explicito. Nao inventar angulos ou prometer disponibilidade de fotos.
- Gemini existente para analise/pesquisa; modelo de imagem configuravel para criacao solicitada de artes. Nenhuma geracao ilimitada em segundo plano.

## Uso no cadastro

1. Informe nome, marca e EAN quando disponivel. Alimentos, chocolates e perfumaria sao aceitos mesmo sem categoria semelhante ja cadastrada. A categoria pode ser digitada livremente.
2. Envie uma foto ou selecione uma na biblioteca. `Analisar ao enviar foto` inicia uma analise por nova foto; desmarcar cancela a espera e impede a proxima analise automatica. `Buscar fotos reais` permite tentar novamente.
3. Confira a leitura e os avisos. Identidade ou EAN divergente interrompe a busca. Fotos acessiveis passam por comparacao visual com a referencia; no maximo quatro sao oferecidas, com angulo e link da fonte.
4. Opcionalmente use `Criar arte de estudio` ou `Criar arte editorial`. Cada clique gera uma previa identificada como IA, com o angulo original, fundo/iluminacao e sem acrescentar precos, promessas, textos promocionais ou produtos. Confira rotulos antes de escolher.
5. Amplie, escolha `Usar esta imagem` ou volte a `Usar foto original`. A selecao nao faz upload automaticamente. `Otimizar foto` ou salvar o produto usa a persistencia existente. Apenas uma capa por produto nesta entrega.

Artes nao sao geradas em segundo plano. A foto vai para a conta Gemini configurada; chamadas podem consumir cota/cobranca dessa conta. Cancelar descarta o resultado no navegador; uma chamada ja recebida pelo provedor pode terminar e consumir cota. Imagens nao escolhidas ficam apenas nas respostas/estado temporario do navegador, sem arquivo ou registro criado no servidor.

## API e configuracao

- `POST /api/admin/imagens-produtos/sugestoes`, `multipart/form-data`: `image`, `name`, `brand`, `ean`, `action` (`analyze`, `studio`, `editorial`). Exige sessao administrativa. Resposta `{ data }` sem cache: analise com candidatos ou uma arte; erros em `{ error }`.
- `GEMINI_API_KEY` e `GEMINI_MODEL` existentes para leitura, pesquisa e comparacao. `GEMINI_IMAGE_MODEL` opcional, padrao `gemini-2.5-flash-image`, somente para artes. Sem SDK/dependencia adicional.
- Limites: 10 MB/40 MP por entrada; corpo limitado durante leitura, inclusive sem Content-Length. Seis pedidos/minuto por IP no middleware, quatro/minuto por usuario e uma chamada ativa por usuario, ate tres simultaneas por processo. Esses contadores sao locais ao processo, adequados ao app atual com uma replica.
- Pesquisa limitada a tres paginas e seis fotos candidatas, com HTTPS, DNS IPv4 publico fixado por socket e revalidacao de ate tres redirecionamentos. Paginas ate 1,5 MB, fotos ate 6 MB; fontes que falham sao ignoradas. Busca/comparacao indisponivel preserva a analise inicial.
- Previews WebP sem metadados, ate 350 KB cada: fotos reais ate 1000 px e artes ate 1400 px, sem ampliacao. Galeria do navegador limitada a quatro fotos reais e quatro artes. Nenhum custo de IA ou dependencia de imagem nova na home publica.

## Validacao

- `npm.cmd test`: 126 testes, incluindo tipos de produto, KitKat/Nestle, falsos dominios oficiais, conflito de EAN/apresentacao, peso com virgula/ponto, fotos invalidas, identidade divergente, ausencia de fotos, falha do provedor, selecao de fotos confirmadas, WebP, autenticacao, limite real de corpo, rate limit e concorrencia.
- `npm.cmd run audit:assistant`: componentes reais em Chromium, respostas HTTP sinteticas e sem banco. Cobre preenchimento de chocolate, ausencia de principios ativos, analise automatica, escolha de foto/arte, ampliação, retorno a original, respostas antigas, cancelamento e ausencia de gravacoes comerciais. Capturas e verificacoes em 320/390/768/1440 px; botoes com area de toque de 44 px e sem rotulos transbordando. Executar depois de `npm.cmd run build`, nunca ao mesmo tempo.
- Integracao real com Gemini: consulta do exemplo `Kit Kat - Chocolate`/`7891000248768` retornou tipo `food`, categoria `Chocolates` e principios ativos vazios. Confianca permaneceu baixa por falta de comprovacao oficial do EAN/apresentacao. Nenhum produto foi cadastrado.
- Leitura real da foto Dove identificou sabonete de 90 g e bloqueou a pesquisa quando o formulario dizia desodorante (3,3 s). Pesquisa retornou foto real em uma consulta; outra tentativa sem foto compativel confirmada retornou o estado vazio esperado. Fotos de verso/lateral dependem de fontes acessiveis e embalagem compativel; nao ha garantia de disponibilidade.
- Arte editorial real gerada em 9,3 s, 1024x1024, WebP de 29.286 bytes. Inspecao visual manteve a embalagem e marca; geracao pode alterar detalhes pequenos, por isso a conferencia humana continua necessaria. Tempos medidos em uma amostra, sem garantia de latencia.
- Lint, TypeScript e build Next passaram. `prisma:validate` passou; `npm.cmd audit --audit-level=moderate` retornou zero vulnerabilidades. Sem migration, mudanca de dependencias ou registros de teste na loja.

## Arquivos principais

- `src/features/products/ai-suggestions.ts`, `product-types.ts` e testes: classificacao, pesquisa e criterios por tipo.
- `src/features/product-images/{suggestions,remote-images,suggestion-types}.ts` e testes: leitura, busca, comparacao, geracao e download seguro.
- `src/app/api/admin/imagens-produtos/sugestoes/route.ts`, `src/middleware.ts` e `.env.example`: API, limites e configuracao.
- `src/components/admin/{products-catalog-panel,product-image-picker,product-photo-suggestions}.tsx`: cadastro e escolha de imagens.
- `scripts/assistant-ui-audit.ts` e `package.json`: verificacao isolada reproduzivel.
- `README.md`, este contrato, `docs/18-cadastro-inteligente-e-fotos.md` e `docs/07-historico-de-decisoes.md`: fluxo, evidencias e decisoes.

## Referencias tecnicas

- [Gemini: analise e geracao de imagens](https://ai.google.dev/gemini-api/docs/image-generation).
- [Gemini: pesquisa fundamentada com Google Search](https://ai.google.dev/gemini-api/docs/google-search).
- [Nestle: marca KitKat](https://www.nestle.com.br/marcas/chocolates/kitkat). Relacao de marca/fabricante; a pagina geral nao confirma o EAN ou apresentacao exatos.

## Publicacao verificada em 2026-09-21

- Codigo `3a128a8` enviado ao GitHub e recebido via `git pull --ff-only` no VPS. Build Docker concluido com lint/tipos; `docker compose up -d --no-deps --wait --wait-timeout 120 app` ativou a aplicacao saudavel. Postgres e remocao de fundo permaneceram saudaveis, sem recriacao ou migration.
- Imagem anterior preservada como `wimifarma-br-app:pre-assistant-20bd859` para reversao. Nenhuma credencial, upload ou registro comercial alterado.
- `node scripts/catalog-live-audit.mjs`: home responsiva, pagina de produto/SEO, tres fotos com HTTP 200 WebP/304 ETag e zero erros JavaScript em Chromium. Admin continua protegido.
- Nova API em producao: POST sem sessao retornou 401; GET nao permitido retornou 405. Configuracao conferida sem expor segredo: Gemini habilitado, analise `gemini-2.5-flash` e arte `gemini-2.5-flash-image`.
- Limite da verificacao: o fluxo administrativo completo foi exercitado com componentes reais e HTTP sintetico, e a integracao Gemini com chamadas reais separadas; nao foi criado produto nem usada sessao de cliente em producao. Fotos alternativas dependem de disponibilidade/compatibilidade nas fontes.
- Scripts e respostas temporarios da integracao removidos; capturas de QA permanecem somente em `artifacts/`, ignorado pelo Git. Nenhum processo de teste mantido.
