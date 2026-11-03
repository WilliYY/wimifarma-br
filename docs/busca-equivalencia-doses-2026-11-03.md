# Equivalência de doses na busca — 03/11/2026

A busca reconhece massas exatamente equivalentes em `g`, `mg` e `mcg`: por exemplo, `Dipirona 1g`, `Dipirona 1000mg` e `Dipirona 1000000mcg`, ou `Paracetamol 750mg` e `Paracetamol 0,75g`. Ponto e vírgula decimal, espaços entre número e unidade e zeros decimais finais são aceitos. A conversão desloca os dígitos como texto, sem arredondamento de ponto flutuante.

Os predicados de dose são aplicados ao nome original do produto. O índice textual, que perde pontuação, continua responsável pelos outros termos. Ranking em memória e consulta SQL parametrizada compartilham os mesmos predicados. A consulta pública continua limitada a 80 caracteres, com disponibilidade e paginação existentes.

Uma dose sem denominador não encontra concentração por volume ou massa. `1g` não corresponde a `1000mg/mL` nem ao denominador de `10mg/1g`. Quando a consulta contém concentração, somente a massa do numerador é convertida: `1g/5mL` encontra `1000mg/5mL`, preservando o denominador e recusando `1000mg/mL`. Não há normalização entre denominadores diferentes ou alteração de via, ingrediente, marca, apresentação, cadastro ou exibição.

A busca existente por ingrediente continua incluindo associações que cumpram todos os termos e doses explícitos. Esta mudança não associa doses à posição dos ingredientes nem cria equivalência terapêutica. A conferência de composição de produtos relacionados mantém seu contrato próprio.

## Verificação local

A regressão inicial falhou porque `Dipirona 1g` omitia `1000mg` e aceitava `1g/mL`. As regressões dirigidas em `public-search.test.ts`, `search-catalog.test.ts`, `search-topics.test.ts` e `storefront.test.ts` verificam equivalência, precisão decimal, denominadores, preservação de termos de ingrediente/via, SQL parametrizado e paginação. A validação SQL destes testes captura os parâmetros do serviço; não executa PostgreSQL real nem comprova publicação.

## Aliases comerciais de busca

O mesmo plano de busca reconhece `L6P5`, `L 6 P 5`, `leve6pague5` e `Leve 6 Pague 5 unidades` como a mesma indicação comercial. As contagens são preservadas: `L6P5` não encontra `L6P50`. A regra também atende `Leve 96 Pague 80 unidades` e `L96P80`, com ou sem espaços e indicação opcional de unidades.

Somente os números pertencentes ao alias são consumidos. Doses e quantidades adicionais continuam obrigatórias; por exemplo, `Protex leve6pague5 90g` não encontra o kit de 85 g. O alias existe apenas na pesquisa, compartilhado pelo ranking em memória e pelo SQL parametrizado. Não modifica SKU, preço, quantidade comercial, nome persistido ou apresentação pública. A regressão anterior à correção reproduziu a ausência das grafias equivalentes e a correspondência indevida de `L6P50`.

Nomes e consultas compactos também são reconhecidos quando a promoção segue uma massa explícita, como `Sabonete Protex BALANCE SAUDAVEL85gL6P5` e `protex85gL6P5`. O limite entre `85g` e `L6P5` é interpretado somente durante a busca, sem reindexação ou alteração do cadastro. A dose permanece obrigatória e o limite final da promoção continua recusando `L6P50` para uma consulta `L6P5`.

## Unidades entre as contagens — ajuste de 03/11/2026

O alias aceita `un`, `unidade` e `unidades` após cada contagem, com ou sem espaços. Assim, `Intimus L16P15`, `Intimus leve16pague15` e `Intimus leve16unidadespague15unidades` reconhecem o mesmo grupo, inclusive o título `Absorvente Intimus Mini Leve16unidadesPague15unidades`. A palavra de unidade é opcional tanto na consulta quanto no produto. A regra é compartilhada pelos parâmetros SQL e pelo ranking em memória, incluindo a promoção colada à massa.

A regressão anterior ao ajuste confirmou que `L16P15` omitia o título com unidades intermediárias. A nova matriz recusa contagens diferentes, palavras adicionais dentro do alias e sufixos inválidos. Dose e quantidade digitadas depois da promoção continuam obrigatórias. O ajuste não modifica o índice persistido, dados, nomes, preços, quantidades comerciais ou regras logísticas.

## Publicação verificada — 03/11/2026

Fonte APP `f9abb42ac9bb9d7171ca1499acceb5fe97ed018f`, imagem `sha256:d6ebd114354d2dc1609f6762c8cc87caf45b4bf89b8607163551cef39521684b` em Linux/ARM64. App e PostgreSQL saudáveis; ambiente, contratos de execução e avaliações preservados. A publicação alterou somente o app, sem migrations, SQL de catálogo, pedidos, estoque, preços, configurações ou aprovação logística.

Passaram 131 testes dirigidos, 307 da suíte padrão, 557 de segurança, lint, tipos, Prisma e build Linux. Auditoria de produção: três alertas baixos e quatro moderados; auditoria completa: três baixos e 17 moderados, sem altos ou críticos. Nenhuma dependência foi alterada. As tentativas locais de build na cópia com junction entre C: e D: falharam por resolução de módulos; a compilação efetiva e a imagem publicada foram validadas no Linux.

GETs públicos confirmaram os mesmos cinco resultados principais de dipirona 1 g/1000 mg, quatro de paracetamol 750 mg/0,75 g, dois Protex L6P5 e três Intimus L16P15/Leve 16 unidades Pague 15 unidades. Desloratadina mantém 15 xaropes nos principais com vírgula ou ponto, com os oito relacionados separados. Bepantol Baby mantém os mesmos quatro SKUs, inclusive os lenços, nos três caminhos testados. As fichas mostram Protex 6 × 85 g = 510 g líquidos e Colorama 6 × 8 mL = 48 mL, e as duas rotas Medicamentos divulgam o mesmo título, canonical, endereço social e seleção.

Recebidos os encerramentos de catálogo e renovadas as guardas físicas, a implantação preservou o canônico `7782112b1705d8a3225edda23a2f39b34f54cf9d4aa79ad09bcc57f6fb35c6ae`. Os lotes de dados de outras frentes não foram repetidos. Recibos e logs ficam em `D:/Codex-outputs/wimifarma-br/catalog-dose-pack-brand-seo-2026-11-03/`, incluindo `public-feature-proof.json` e `hotfix/release-proof.json`.
