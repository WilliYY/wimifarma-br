# 136 — Vitrines, ficha comercial e últimos rascunhos logísticos

## Comportamento comercial

As vitrines continuam usando o dia de Brasília e a mesma seleção determinística para todas as visitas daquele dia. A home é dinâmica; não depende de uma automação Codex para trocar os itens. Beleza passa a conter somente cuidados não medicamentosos. Todas as coleções excluem receita, Farmácia Popular, classificação inconsistente e medicamento sem MIP explicitamente confirmado. MIPs podem aparecer em Farmacinha e Economia, preservando disponibilidade, fotos verificadas e ausência de repetição entre as coleções.

Na ficha, a busca de correlatos recupera candidatos da mesma família e marca antes do limite dos candidatos gerais. A união remove IDs repetidos; para uma família reconhecida, não completa sabonetes com condicionadores. Linha e marca têm prioridade; kits identificados da mesma linha antecedem outro avulso equivalente mesmo quando cadastrados na categoria Kits. Os produtos mantêm preço, estoque e elegibilidade canônicos.

Perto de Comprar, a ficha mostra a previsão de retirada e formas de pagamento. Estoque da farmácia usa o calendário de retirada existente; mercadoria de distribuidor usa o calendário de recebimento/preparação, sem prometer retirada no mesmo dia. O desconto Pix continua ocorrendo somente depois da seleção no checkout. Não se alteraram cálculo, gateway ou aprovação financeira.

Cuidados e identificação acompanham o tipo de produto: higiene e cosméticos recebem instruções da embalagem, sem bula ou princípios ativos vazios; medicamentos conservam orientação sanitária. Conteúdo e apresentação são extraídos do nome cadastrado, distinguindo avulso, refil e kit. Conteúdo líquido não é tratado como peso bruto de envio. O bloco explicativo público do PMC e a antiga mensagem de pagamento combinado continuam removidos; preço de referência e OFF existentes permanecem.

## Pendências físicas e hipótese autorizada

A leitura de 01/11/2026 às 22h14 de Brasília confirmou 3.068 ativos e 12 perfis incompletos. Cordarex possui GTIN `07896181927846`; a menção anterior de ausência de EAN no documento 135 estava desatualizada. Seis perfis são nulos e seis Avise-me têm quatro campos físicos nulos, base desconhecida e bloqueio logístico explícito.

Nova consulta documental confirmou os conflitos já conhecidos: os boletins Teuto misturam peso/cartonagem unitária e dados incompatíveis de embarque; a ficha Martins de Plax 500 mL inclui descrição de 250 mL. Esses valores não foram promovidos a medições confirmadas. Fontes: [Clopidogrel Teuto](https://teutodigital.com.br/wp-content/uploads/2023/11/Boletim-Informativo-Clopidogrel-4339.pdf), [Albendazol Teuto](https://teutodigital.com.br/wp-content/uploads/2023/12/Boletim-Informativo-Albendazol-suspensao-0790.pdf), [Beneum Teuto](https://teutodigital.com.br/wp-content/uploads/2023/09/Boletim-Informativo-Beneum.pdf) e [Plax Martins](https://www.martinsatacado.com.br/produto/enxaguante-bucal-plax-colgate-melancia-500ml-leve-mais-pague-menos-mantiqueiradistribuidora_113327). A [bula Aché](https://www.ache.com.br/wp-content/uploads/application/pdf/Cordarex_BU_01e_VP_Incorp_PE.pdf) confirma a apresentação de Cordarex, sem peso/medidas.

O novo CLI `scripts/complete-estimated-shipping-drafts.ts` representa um caminho explícito de hipóteses do lojista, separado do aplicador documental anterior. Recebe até 12 identidades exatas, revisão e perfil literal com hashes. Dry-run é o padrão; gravação exige ADMIN ativo e hash do plano revisado. Lock do catálogo, transação Repeatable Read, CAS e auditoria protegem o lote. Perfil existente preenchido ou revisado é recusado. Evidências documentais, receitas, preços, estoques, serviços e sinalização Avise-me permanecem preservados.

| Cenário | Peso operacional estipulado | Caixa externa C × L × A |
| --- | ---: | --- |
| Sólidos comuns | 300 g | 24 × 15 × 10 cm |
| Albendazol, com proteção para vidro | 300 g | 24 × 15 × 10 cm |
| Clopidogrel, geometria documental conflitante | 360 g | 30 × 20 × 15 cm, planejada |
| Plax 500 mL, com proteção para líquido | 1.080 g | 30 × 20 × 15 cm, planejada |

São estipulações completas, incluindo recipiente/proteção e margem de 20% uma única vez. Não há segunda tara, multiplicação de dosagem por comprimidos ou conversão automática de mL em peso bruto. Caixa maior permanece planejada; não há declaração de disponibilidade, medição, tara ou encaixe confirmado.

Novos rascunhos permanecem `estimated`, `enabled:false`, `transportReviewed:false`, sem aprovação de serviço e com carga desconhecida. Os seis Avise-me conservam `notifyOnlyPendingLogistics:true`. Imosec, com receita ainda `UNREVIEWED`, permanece sem gravação. Completar esses campos não libera compra de produto indisponível, postagem, transporte de carga especial nem aprovação de embalagem.

## Verificações e operação

Regressões dirigidas comprovam a rotação diária, filtros das vitrines, kits Rexona de seis, apresentação de kits e retirada física versus distribuidor. A revisão independente identificou e corrigiu a leitura de “Kit 6 Sabonetes” e a prioridade de kit em categoria diferente. O aplicador tem regressões negativas de identidade, perfil/revisão/hash, ADMIN, plano alterado, CAS, rollback e repetição, mantendo o aplicador anterior intacto.

Em consulta pública anterior à publicação desta revisão, o sabonete Rexona Multivitaminas 84 g retornou para `01001-000`: Loggi R$ 13,41, PAC R$ 16,27 e SEDEX R$ 19,84, entre sete opções, somente como estimativa. O bloco PMC e a mensagem antiga já estavam ausentes; a orientação de bula e a ausência do kit foram reproduzidas nessa versão e motivaram os ajustes atuais. Cotações variam; não comprovam aceitação ou aprovação de postagem.

Aplicação de dados, publicação do app e resultados finais serão registrados após as respectivas provas. Recibos privados ficam em `outputs/comercial-logistica-2026-11-02/`, fora do Git.
