# Pesquisa nas quatro distribuidoras

## Orientação vigente em 25/10/2026

O lojista determinou pesquisar cada produto nas quatro fontes ANB, Profarma, GAM e DM antes de novas inclusões. Santa Cruz está suspensa por enquanto pela dificuldade de coleta. Uma eventual rota oficial de arquivo ou API poderá ser avaliada; essa possibilidade não retoma a coleta no aplicativo nem ativa uma integração.

Consultas sem resultado, falhas de acesso e indisponibilidade comercial são situações diferentes. Uma falha não comprova ausência de produto. A comparação deve preservar o mesmo EAN, variante, apresentação, unidade comercial, tributos, condições, mínimos e horário real de observação. Estoque numérico desconhecido permanece desconhecido. Caixa fechada não representa automaticamente estoque ou pedido mínimo. Imagem de distribuidor não comprova preço ou disponibilidade.

Os 67 princípios ativos e as 17 marcas anteriores permanecem no escopo, acrescidos das 49 novas marcas/linhas. O pedido posterior acrescenta pesquisa de fraldas convencionais, piscina, pants e adultas; incontinência; alimentação infantil e maternidade; cabelo, coloração e acessórios; Farmax e linhas relacionadas; suplementos e Herbamed; higiene bucal; esmaltes; barbear; curativos; descartáveis; equipamentos, consumíveis e saúde íntima. As indicações NUK, Lillo, Cremer e Descarpack orientam a pesquisa e não aprovam produtos, compatibilidades ou estoque por associação à marca.

Tamanho, quantidade, capacidade, material, faixa etária, cor e compatibilidade precisam ficar explícitos quando pertinentes. A classificação é individual: o fabricante Herbamed, por exemplo, não transforma todos os seus produtos em suplementos. As retenções documentais, regulatórias, de variante e de foto já existentes continuam válidas.

## Situação verificada desta frente

A união dos 20 lotes de marcas encerrados tem 336 EANs distintos. Essa contagem é independente dos produtos publicados por outras frentes e das inclusões históricas de medicamentos. Os últimos lotes encerrados foram `marcascomplemento20-v1` e `marcascomplemento17-v1`, com 37 produtos e 37 fotos; não devem ser reaplicados.

Esses encerramentos antecedem a nova exigência das quatro fontes. A pesquisa complementar das apresentações anteriores permanece pendente e deve conservar os horários originais das evidências válidas. Nenhuma contagem histórica é apresentada como uma nova consulta comercial.

O próximo grupo Paixão tem 21 apresentações preparadas, com 84 consultas registradas nas quatro fontes e 21 fotos reais conferidas. O custo GAM foi confirmado entre a linha comercial e o detalhe que separa preço líquido e imposto. As pesquisas ANB e Profarma desses EANs tiveram ausência explícita de resultado; a DM ficou sem correspondência visível, sem presumir estoque zero. A campanha Coty foi consultada separadamente. Outras apresentações continuam retidas por foto, quantidade ou pesquisa pendente.

Esse grupo passou na validação local dos schemas atuais e em 25 controles negativos de dados, incluindo fonte ausente, validade, estoque inventado, ST indevido, alteração de custo, duplicação, classificação, identidade e hash da foto. Está **preparado, não publicado**. Ainda exige revisão final, fonte e ferramentas congeladas, verificações de segurança, QA isolado, deduplicação atual, concessão exclusiva, backup, baseline, dry-run, aplicação única, validação pública e encerramento auditado.

Uma consulta somente leitura do banco às 14:01:27 UTC de 25/10 encontrou os 94 EANs de fraldas da outra frente ativos, distribuídos em Bigfral, Huggies, Mili, Pampers, Geriamax e Natural Master. Foram também verificadas páginas públicas representativas de piscina, pants e fralda adulta, com foto decodificada e opção de compra. Isso não substitui a comparação atual de ofertas por apresentação nem comprova que toda a grade possível está completa. As lacunas devem ser confrontadas com o catálogo atual antes de novos cadastros.

Custos, capturas autenticadas, referências de acesso, imagens de entrada, logs, backups e comprovantes completos permanecem privados. A coordenação autorizada com o chat 5 limita-se a reservas, sobreposição, versões e encerramentos; cada frente continua trabalhando individualmente. Mensagens não substituem os controles físicos de publicação.

## Fixture visual do cashback

Na validação de `bcc32ee`, o teste visual dos cards herdava `prescriptionType: ORDINARY` em um produto sintético sem receita que deveria exibir cashback. A regra pública oculta o selo quando o tipo indica receita, por isso o teste aguardava um elemento que não seria renderizado.

A fixture do primeiro card elegível passa a usar `UNREVIEWED`, consistente com `requiresPrescription: false`. O teste também confere a ausência do selo nos dois cards sintéticos com receita. A correção é restrita aos dados do teste. O comportamento de liquidação privada de benefícios e a ocultação promocional pública de medicamentos com receita permanecem conforme o documento 15.
