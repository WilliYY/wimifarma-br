# Apresentação comercial de multipacks — 03/11/2026

Cards públicos e ficha do produto distinguem uma embalagem comercial dos itens internos quando o nome declara quantidade: barras, frascos, absorventes, unidades, multiplicador com conteúdo ou promoção `Leve X Pague Y`/`LxPy`. A quantidade recebida é X; Y não reduz o conteúdo da embalagem. A redação da promoção também aceita “Leve 16 unidades Pague 15 unidades”.

O helper de apresentação lê o nome registrado, sem alterar SKU, EAN, preço, estoque, carrinho, banco ou perfil logístico. Nomes compactos como `85gL6P5` são reconhecidos. Uma caixa com seis frascos de 8 mL aparece como **1 caixa com 6 frascos**, com **6 frascos de 8 mL · 48 mL no total**. Sabonete de seis barras de 85 g aparece como **1 pacote com 6 barras**, com **6 barras de 85 g · 510 g líquidos**. O peso líquido calculado não é peso bruto para envio.

O cálculo usa somente uma medida declarada no nome, em barras/frascos ou multiplicador explícito. Não há peso fixo por marca: seis barras de 90 g resultam em 540 g. Medidas ausentes, múltiplas ou identificadas como totais não geram total individual inventado. Conteúdos mistos, contagens conflitantes e embalagens aninhadas pedem conferência da composição. Descrições não são usadas para completar ou substituir dados ausentes do nome.

Os números internos de `Leve X unidades Pague Y unidades` são separados das contagens independentes. Uma quantidade de barras, frascos ou multiplicador fora da promoção deve concordar com X. Assim, `12 barras 85g L6P5` e `6 frascos de 8mL L12P10` pedem conferência e não exibem quantidade ou total presumido. A indicação promocional não prevalece sobre uma composição conflitante.

Medicamentos não passam pelo novo reconhecimento de multipacks; doses não viram quantidade comercial. Kits e refis mantêm a apresentação existente. A comparação de preços de kits de sabonetes e a informação por fralda permanecem sob seus helpers atuais. Preços exibidos e enviados ao carrinho continuam correspondendo ao produto comercial completo.

Regressões cobrem Protex com nome compacto, Colorama Algodão Doce/Gabriele, Intimus Leve 8 Pague 7 e Leve 16 Pague 15, Bepantol Leve 96 Pague 80, apresentação sem medida, composição ambígua, conteúdo já total e medicamentos. Testes de renderização verificam ficha e cards, preservando centavos e estoque do produto sintético. A leitura pública dos nomes/descrições foi realizada pelo agente principal; a publicação permanece uma etapa separada.

## Publicação verificada — 03/11/2026

Fonte APP `f9abb42ac9bb9d7171ca1499acceb5fe97ed018f`, imagem `sha256:d6ebd114354d2dc1609f6762c8cc87caf45b4bf89b8607163551cef39521684b` em Linux/ARM64. App e PostgreSQL saudáveis; ambiente, contratos de execução e avaliações preservados. A publicação alterou somente o app, sem migrations, SQL de catálogo, pedidos, estoque, preços, configurações ou aprovação logística.

Passaram 131 testes dirigidos, 307 da suíte padrão, 557 de segurança, lint, tipos, Prisma e build Linux. Auditoria de produção: três alertas baixos e quatro moderados; auditoria completa: três baixos e 17 moderados, sem altos ou críticos. Nenhuma dependência foi alterada. As tentativas locais de build na cópia com junction entre C: e D: falharam por resolução de módulos; a compilação efetiva e a imagem publicada foram validadas no Linux.

GETs públicos confirmaram os mesmos cinco resultados principais de dipirona 1 g/1000 mg, quatro de paracetamol 750 mg/0,75 g, dois Protex L6P5 e três Intimus L16P15/Leve 16 unidades Pague 15 unidades. Desloratadina mantém 15 xaropes nos principais com vírgula ou ponto, com os oito relacionados separados. Bepantol Baby mantém os mesmos quatro SKUs, inclusive os lenços, nos três caminhos testados. As fichas mostram Protex 6 × 85 g = 510 g líquidos e Colorama 6 × 8 mL = 48 mL, e as duas rotas Medicamentos divulgam o mesmo título, canonical, endereço social e seleção.

Recebidos os encerramentos de catálogo e renovadas as guardas físicas, a implantação preservou o canônico `7782112b1705d8a3225edda23a2f39b34f54cf9d4aa79ad09bcc57f6fb35c6ae`. Os lotes de dados de outras frentes não foram repetidos. Recibos e logs ficam em `D:/Codex-outputs/wimifarma-br/catalog-dose-pack-brand-seo-2026-11-03/`, incluindo `public-feature-proof.json` e `hotfix/release-proof.json`.
