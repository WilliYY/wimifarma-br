# Cadastro inteligente e fotos

## Escopo aprovado em 2026-09-17

- Novos produtos iniciam como Publicado no formulario e na API, sem alterar registros existentes. Salvar continua uma acao explicita; a IA nunca publica, precifica ou define estoque, receita e Farmacia Popular.
- Destaque opcional no cadastro/edicao usa as dez posicoes existentes. Gravacao de produto, posicao e auditoria e transacional. Uma vitrine cheia retorna conflito sem criar cadastro parcial. Ofertas e catalogo compartilham um lock de escrita.
- Menu: Usuarios, Produtos/Catalogo, Ofertas, Pedidos, Cupons, Cashback, depois os demais modulos. Permissoes preservadas.

## Pesquisa e SEO

- Gemini continua somente no servidor, usando pesquisa Google e estruturacao em duas etapas. Nenhuma nova integracao paga.
- Pesquisa automatica ao sair do nome/marca/EAN, com espera curta, sem chamada por tecla e sem repetir a mesma identidade. Pode ser desativada; pesquisa manual continua disponivel.
- EAN/GTIN tem digito verificador validado. Pode iniciar pesquisa sem nome. Respostas antigas sao descartadas se os dados mudarem; campos preenchidos pelo operador nao sao substituidos automaticamente.
- Alta confianca exige identidade/apresentacao exata e referencia especifica a fonte oficial. EAN divergente, apresentacao conflitante e falta de fontes impedem preenchimento automatico. Dominio apenas contendo o nome da marca nao conta como fabricante.
- Nome, marca, categoria, descricao factual, principios ativos e termos podem ser sugeridos. Previa de busca reutiliza o gerador real de meta description; canonical, sitemap e JSON-LD existentes permanecem.
- Nao e possivel garantir 100% de acerto, posicao no Google ou equivalencia de resultado com Canva. Conferencia de embalagem e fontes continua necessaria; nao inventar promessas terapeuticas ou avaliacoes.

## Fotos

- Causa reproduzida: dois WebP persistidos no volume retornavam 404 no site apos upload. Next.js indexava arquivos publicos no inicio do processo. Rewrite anterior aos arquivos estaticos encaminha `/uploads/products/:fileName` para uma rota de leitura dinamica, sem mudar URLs/banco/volume.
- Rota permite somente nomes WebP gerados por UUID, sem caminhos arbitrarios; limita tamanho, verifica assinatura, rejeita symlink quando suportado, usa cache imutavel/ETag e nao armazena 404.
- Nova foto e Escolher arquivo abrem o seletor. Cancelar preserva a selecao; retirar a foto desvincula do produto sem apagar a biblioteca. O mesmo arquivo pode ser selecionado novamente. Troca nao restaura silenciosamente a foto anterior.
- Tratamento pode ser conferido antes de salvar. Upload ja concluido e reutilizado se o cadastro falhar, sem enviar a mesma foto de novo. Exclusao da biblioteca recusa imagens em uso.
- Entrada ate 10 MB/40 megapixels; orientacao corrigida, metadados removidos, ate 1600 px sem ampliar e teto 350 KB para novos WebP. Arquivos existentes nao sao recomprimidos.
- Remocao local conserva U-2-Net e dependencias fixadas. Imagem reduzida antes da inferencia, um processamento por vez, refinamento alpha matting e sem descontaminacao que altere cores da embalagem. Mascara vazia/inutil retorna erro mantendo o original. Nao promete recuperar detalhe inexistente.
- Sem migrations. Backups do volume continuam obrigatorios.

## Fontes tecnicas

- [Next.js: arquivos publicos](https://nextjs.org/docs/pages/api-reference/file-conventions/public-folder).
- [Gemini: grounding com Google Search](https://ai.google.dev/gemini-api/docs/google-search).
- [rembg 2.0.81: matting e processamento](https://github.com/danielgatis/rembg/blob/v2.0.81/rembg/bg.py).

## Validacao

- `npm.cmd test`: 108 testes passaram, incluindo entrega/validacao de fotos, mascaras vazias, tamanho, identidade/GTIN, status e desvinculacao.
- `npm.cmd run audit:catalog -- --in-process`: Chromium real, componentes reais e handlers compilados do Next, com PostgreSQL descartavel. Cobre autenticacao, preenchimento/opt-out, resposta atrasada, campos manuais, seletor/cancelamento/mesmo arquivo, recorte, upload, cadastro, destaque, desvinculacao/reposicao, exclusao em uso, versao e concorrencia pela ultima vaga. A IA nessa auditoria e simulada deliberadamente para resultados deterministas. Nenhum produto de teste entra na loja real.
- Capturas em 320/390/768/1440 px; verificados documento e interior do modal sem transbordamento horizontal. O primeiro teste revelou transbordamento na biblioteca em 320 px, corrigido e coberto por regressao.
- Gemini real: duas consultas publicas sem gravacao. O EAN conflitante do exemplo Dove foi rejeitado e os campos ficaram vazios. Pesquisa Dove Original 90 g ficou para revisao por evidencias incompletas. Confianca alta nao e forcada para obter preenchimento automatico.
- Remocao real com U-2-Net em container descartavel, sem rede e volume de fotos somente leitura: uma embalagem 447x447 foi processada em 2,1 s, foreground 52,76%, pico RSS 1.008.316 KB. Tempo nao inclui carga inicial do modelo; uma amostra nao garante a qualidade em todo tipo de foto.
- `build`, `lint`, `typecheck` e `prisma:validate` passaram; `npm.cmd audit --audit-level=moderate` sem vulnerabilidades. `esbuild` 0.28.2 e dependencia de desenvolvimento fixada para montar a fixture sem servidor, conforme [release oficial](https://github.com/evanw/esbuild/releases/tag/v0.28.2).
- Limitacao: iniciar o servidor HTTP local foi bloqueado pelo ambiente. O modo `--in-process` nao valida middleware, SSR, proxy ou rewrite HTTP completo; estes exigem conferencia externa apos deploy. A auditoria sem essa flag continua disponivel para uma homologacao local em `127.0.0.1:3010` com o mesmo banco descartavel.

Pre-requisitos da auditoria: build recente, banco `cashback_test` descartavel em `127.0.0.1:55439` com migrations aplicadas, `DATABASE_URL` apontando exclusivamente para ele, `AUTH_SECRET` sintetico e `AUTH_URL`/`NEXTAUTH_URL` em `http://127.0.0.1:3010`. Nao copiar credenciais de producao. O teste limpa seus registros e uploads; encerrar banco/tunel ao terminar.

## Publicacao verificada em 2026-09-19

- Commits funcionais: `9a24580` e `04e7471`, enviados ao GitHub e recebidos via `git pull --ff-only` no servidor.
- Backup anterior: `/home/ubuntu/backups/wimifarma-br/pre-catalog-release/20260919T123048Z`.
- Build Docker e `docker compose up -d --no-deps --wait --wait-timeout 180 app background-removal` concluidos. Aplicacao e remocao de fundo saudaveis, sem reinicio inesperado. PostgreSQL nao foi recriado; nenhuma migration nova.
- `node scripts/catalog-live-audit.mjs`: leitura externa da loja real com Chromium. As tres fotos retornaram 200 WebP e 304 por ETag, inclusive os dois arquivos que retornavam 404. Imagens renderizadas, home sem transbordamento em 390/1440 px, pagina de produto com canonical/JSON-LD, API administrativa 401 e painel redirecionando visitante sem sessao. Zero erros JavaScript.
- Banco/container e tunel descartaveis encerrados; uploads locais de QA removidos. Cadastros comerciais, precos, saldos e identidade dos produtos existentes preservados.
- Pendencia operacional: conferir embalagem/EAN nos cadastros antigos sinalizados; a atualizacao nao corrige automaticamente dados comerciais nem garante qualidade de recorte em toda fotografia.
