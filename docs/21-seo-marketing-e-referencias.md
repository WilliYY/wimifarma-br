# SEO, marketing e referencias do catalogo

## Implementacao em 2026-09-21

Melhorar descoberta e apresentacao dos produtos sem alterar registros comerciais automaticamente. Prioridades: cashback com controles de um ponto percentual e entrada decimal; descricoes factuais mais completas; categorias mais amplas; pesquisa de galerias reais e referencias opcionais; metadados, estrutura local, breadcrumbs, sitemap e catalogo indexavel; feed e material de marketing revisaveis.

## Contratos e limites

- Cadastro continua com uma categoria principal e uma capa. Categorias sugeridas nao sao lista de permissoes. Sem migration, substituicao de EANs, cadastro do KitKat ou alteracao de cashback ja salvo.
- Percentuais preservam centesimos em basis points. Botoes/setas avancam 100 basis points; digitacao continua permitindo 1 basis point.
- Descricao da IA pode ter ate 800 caracteres, com fatos verificados e contexto especifico. Meta description continua curta e independente. Nao criar indicacoes, alergenicos ou promessas sem fonte.
- Fotos de verso/lateral exigem referencia real identificavel. Ampliar galerias extraidas e diversidade dos angulos, com limites de download, deduplicacao, verificacao visual e escolha humana. URLs de referencia devem passar pelos mesmos controles de rede.
- SEO usa dados reais, canonical consistente, GTIN com digito verificador, imagens acessiveis, negocio local e breadcrumbs. Nao inventar avaliacoes, politicas de devolucao, prazos de frete ou credenciamento.
- Feed para revisao no Merchant Center usa somente itens publicados de categorias nao reguladas identificadas, com imagem/preco/descricao/marca e sem receita/Farmacia Popular. Exportacao nao equivale a aprovacao do Google. Conta, dominio, frete, devolucoes e elegibilidade do checkout precisam ser conferidos pelo responsavel antes de ativar listagens. Medicamentos/suplementos ficam fora dessa exportacao inicial.
- Marketing permite copiar links com UTM e texto factual; nao envia mensagens, anuncios ou campanhas automaticamente.

## Referencias avaliadas

- [Google Product](https://developers.google.com/search/docs/appearance/structured-data/product): dados estruturados e Merchant Center se complementam; exibicao nao garantida.
- [Google: checkout](https://support.google.com/merchants/answer/9158778?hl=pt-BR), [saude e medicamentos](https://support.google.com/merchants/answer/12079605?hl=pt-BR), [listagens locais](https://support.google.com/merchants/answer/3271956?hl=en-GB): avaliar adequacao da operacao local e do checkout com confirmacao humana; nao declarar pagamento online inexistente.
- [google/merchant-api-samples](https://github.com/google/merchant-api-samples), Apache-2.0: referencia oficial para integracao futura da Merchant API. Feed XML evita credenciais e dependencia nova nesta entrega.
- [garmeeh/next-seo](https://github.com/garmeeh/next-seo), MIT: exemplos de JSON-LD. A Metadata API nativa do Next ja atende ao projeto; nao adicionar plugin duplicado.
- [openfoodfacts/openfoodfacts-server](https://github.com/openfoodfacts/openfoodfacts-server): API de alimentos e imagens por codigo de barras, dados colaborativos. Codigo AGPL; base ODbL e imagens CC BY-SA. Nao importar imagens automaticamente sem persistencia de atribuicao/licenca e conferencia da versao; usar como referencia de evolucao, nao como fonte oficial de medicamento.

## Implementacao e operacao

- `/catalogo`, `/ofertas` e `/categorias/[slug]` renderizam produtos publicados no servidor, com 24 itens por pagina e navegacao rastreavel. Ofertas consultam desconto real do cadastro. Nenhum registro foi criado para preencher vitrines.
- Sitemap inclui produtos, categorias e imagens; login saiu do sitemap. JSON-LD inclui Pharmacy/WebSite, Product, BreadcrumbList e CollectionPage. GTIN invalido nao e publicado como identificador estruturado.
- `GOOGLE_SITE_VERIFICATION` e opcional no ambiente. Para ativar, o responsavel deve fornecer o token da propriedade correta no Search Console e reenviar o sitemap; o codigo nao cria nem verifica contas externas.
- `SEO e marketing` no produto oferece previa, pendencias, texto revisavel e links UTM para WhatsApp, Instagram e Google. Nao ha nova dependencia, rastreador ou envio automatico.
- `GET /api/admin/marketing/google-feed` exige administrador e devolve XML privado (`no-store`) para download e revisao. Limite: 5000 publicados; exige GTIN valido, descricao, marca, preco e imagem local cadastrada com pelo menos 500 x 500 px. Essa dimensao e criterio conservador desta exportacao. Exclui tipos regulados/desconhecidos e artes identificadas pelo nome de origem. Nenhum item elegivel retorna 422 com explicacao.
- O cadastro legado nao registra autoria de cada texto: exportacao marca os textos conservadoramente como assistidos por IA em `structured_title` e `structured_description`. Revisar origem antes de enviar. A selecao automatica nao substitui verificacao das politicas por produto, frete, devolucoes ou adequacao do checkout.
- Artes criadas recebem IPTC DigitalSourceType; otimizacao preserva somente essa origem permitida, removendo demais metadados privados. O registro legado nao identifica toda imagem externa gerada: a capa ainda exige conferencia humana.
- Fotos: ate 3 paginas de referencia, 4 paginas pesquisadas, 12 tentativas/8 imagens comparadas, 4 opcoes finais, previews de ate 350 KB e janela de download de 20 s. Deduplicacao por conteudo; verso/lateral confirmados tem prioridade. Referencias manuais continuam sendo verificadas mesmo quando a busca esta indisponivel. Analise e comparacao dependem da IA.

## Evidencias locais

- Chromium: assistente, cashback decimal/+1%, copia UTM, download, cancelamento e respostas atrasadas em 320/390/768/1440 px; catalogo SSR/paginacao/precos reais em 320/390/1440 px. Sem gravacao no banco.
- Consulta real ao Gemini: KitKat 41,5g reconhecido como alimento/Chocolates, descricao de mais de 300 caracteres, 8 fontes e alta confianca. Apenas consulta; produto nao cadastrado. Descricao continua sujeita a revisao de ingredientes e embalagem.
- Consulta visual real: Dove Original 90g reconhecido como higiene; uma foto frontal de 1000 x 1000 confirmada na referencia. Nenhum verso/lateral foi confirmado nessa consulta. Nao prometer angulos que as fontes nao disponibilizam. Testes isolados cobrem galeria, deduplicacao e selecao de verso/lateral.

## Validacao

137 testes passaram: percentual decimal, descricoes, classificacao, galerias e seguranca de URLs, metadados/GTIN, feed/escape XML/exclusoes. `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run build`, `npm.cmd run prisma:validate` e `npm.cmd audit --audit-level=moderate` passaram; auditoria sem vulnerabilidades. Scripts reproduziveis: `node --import tsx scripts/assistant-ui-audit.ts`, `node --import tsx scripts/seo-storefront-audit.ts` e `node scripts/seo-live-audit.mjs`. Os dois primeiros usam fixtures sem banco; o ultimo verifica producao somente por leitura.

Referencias adicionais: [imagens e origem de IA](https://support.google.com/merchants/answer/6324350?hl=en), [outras fotos](https://support.google.com/merchants/answer/6324370?hl=en), [textos assistidos por IA](https://support.google.com/merchants/answer/14784710?hl=en-IE).
