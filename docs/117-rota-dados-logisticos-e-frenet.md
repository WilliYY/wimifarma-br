# 117 — Rota de dados físicos, prática das redes e limites da Frenet

## Objetivo e situação em 27/10/2026

O lojista pediu continuar a preparação física de todo o catálogo, avaliar Frenet e entender como redes grandes operam. A base consultada às 15h33 UTC tinha 2.736 produtos ativos: 47 com alguma evidência e 2.689 sem referência. Destes últimos, 2.688 tinham GTIN válido; o Kit Kat manual não tinha EAN nem apresentação suficientemente identificada. Não atribuir um código ou medidas por semelhança de nome.

O contrato persistente continua em [115](115-evidencias-logisticas-e-receitas.md). Evidência comercial, pacote protegido e aceite da transportadora são etapas distintas. NCM classifica mercadoria e não fornece peso ou três dimensões. Não converter ml em gramas, dose de comprimido em massa de embalagem, nem dividir caixa master para inventar unidade.

## Melhor rota para completar os dados

1. **Identidade:** GTIN textual com checksum e apresentação exata. Preservar a diferença entre unidade de venda, kit/pacote fechado e caixa master.
2. **Dados mestres oficiais em lote:** priorizar arquivos do fabricante/distribuidor e avaliar GS1 Provider. A base contém dados declarados pelos titulares e depende de compartilhamento; identidade encontrada não garante peso/dimensões completos ou atuais.
3. **Piloto antes de contratar:** avaliar cobertura por marcas e tipos de embalagem, unidades dos campos, nível comercial/logístico, data e licença de cache/uso. A documentação GS1 inclui peso bruto e tabela de dimensões, enquanto o Swagger atual apresenta esquema mais limitado e o manual tem referências de campos que exigem esclarecimento. Não implementar mapeamento por suposição.
4. **Conferência e embalagem:** usar o peso bruto próprio da apresentação e receitas calibradas de caixa/proteção. Reutilizar geometria de embalagem somente com compatibilidade física comprovada; manter tara, orientação, folga e carga explícitas. A caixa informada de 24 × 15 × 10 cm custa R$1, mas ainda precisa de tara e confirmação de medidas internas/externas.
5. **Atualização e exceções:** manter proveniência, data/hash, conflitos e decisões auditadas. Alteração de embalagem ou dado novo exige revisão. A liberação continua separada do simples cadastro da referência.

O usuário autorizou **somente consulta** à GS1. Mensagem técnica/comercial enviada de `wimifarma@gmail.com` a `api@gs1br.org`, com confirmação em Enviados. Foram pedidos amostra, cobertura, campos vigentes, custos, cotas e licença. Nenhum cadastro, plano, cobrança, token ou integração foi criado. O contato oficial e a exigência de liberação/plano constam no [portal GS1](https://portalapi.gs1br.org/pageApiProvider) e no [FAQ](https://portalapi.gs1br.org/pageFaq); [manual Provider R1.3](https://gs1portalstoragecdncms.blob.core.windows.net/strapi/strapi-assets/Manual_do_Usuario_API_Verified_by_GS_1_R1_31_1_a534922ec8.pdf).

Coleta pública adicional: foram examinadas 33 páginas de produtos, com uma 34ª tentativa encerrada em HTTP 429, sem retentativa ou contorno. Três páginas trouxeram dimensões por GTIN exato, mas nenhum peso bruto explícito. São os condicionadores Seda Cachos Definidos, Pretos Luminosos e Liso Perfeito 325 ml; cada página declara seus próprios lados 215,5 × 60 × 45,3 mm. Peso e nível de embalagem permanecem pendentes. O baixo retorno confirma que consultas avulsas não são uma solução suficiente para os milhares de pendentes.

O lote adicional recebeu revisão independente e foi importado em produção pelo fluxo auditado, após backup PostgreSQL em formato custom, listagem e hash verificados. O dry-run mostrou três gravações exclusivas de evidência; a aplicação acrescentou três auditorias e a repetição preservou as três referências sem gravar novamente. Hashes de todos os demais campos de produto e dos perfis protegidos permaneceram iguais. PostgreSQL manteve identidade, imagem e início; aplicação saudável. Nenhum serviço de envio foi habilitado.

A contagem posterior foi de **2.738 ativos, 50 com alguma referência, 2.688 sem referência e dois perfis habilitados**. O denominador aumentou em outra frente de catálogo entre o snapshot e esta aplicação; não atribuir essa inclusão ao enriquecimento físico. As três novas referências continuam parciais e sem confirmação. Provas privadas: `outputs/rota-logistica-motion-2026-10-27/lote2-production/`; backup restrito no servidor em `/home/ubuntu/backups/wimifarma-br/logistics-lote2-01a15b8f-20261027/`.

## O que foi comprovado nas grandes redes

- **RD Marketplace:** o portal oficial informa que integradoras mantêm a planilha de frete e atualizam peso/dimensões. A integração documentada pelo Bling tem SKU, GTIN/EAN, peso líquido/bruto e largura/altura/profundidade; NCM é um campo separado. Isso comprova o contrato do marketplace, sem provar a origem dos dados ou o processo de todo estoque próprio. Fontes: [RD](https://www.lojistard.com.br/article/KA-01014/pt-br), [Bling/RD](https://ajuda.bling.com.br/hc/pt-br/articles/9651031528855-Importa%C3%A7%C3%A3o-de-produtos-da-Raia-Drogasil).
- **Pague Menos/Extrafarma:** a política informa cálculo conforme quantidade, peso, dimensões e CEP, sujeito à disponibilidade. Quantidade de itens na vitrine não significa estoque de todos em cada região. [Política de frete](https://www.extrafarma.com.br/politica-de-frete).
- **Panvel:** caso publicado pela fornecedora Neogrid confirma planejamento/reposição e alocação conforme estoque e capacidade dos CDs. Isso é evidência de DRP e estoque regional, não de dimensões médias ou caixas de encomenda. [Caso Panvel](https://hub.neogrid.com/panvel).

Não foi encontrada prova primária de que essas redes usem uma medida universal por família, NCM para obter dimensões, pesagem de todo SKU no recebimento ou cartonização automática de todas as encomendas. A recomendação para a Wimifarma é padronizar **cadastro, receitas e processo de conferência**, preservando os dados físicos de cada apresentação; essa é uma aplicação proposta para nossa operação, não uma afirmação sobre um sistema interno não publicado das redes.

## Frenet não garante envio de todo o catálogo

Frenet intermedeia cálculo/etiquetas. Uma resposta de cotação não autoriza o conteúdo. Contratos prontos, contratos próprios, serviço/modal, SKU, embalagem, documentação e cobertura regional precisam ser avaliados separadamente. Há API para plataforma própria; cálculo e emissão são interfaces distintas. Não foi comprovada uma integração pronta específica para Next.js. Fontes: [limites de produtos](https://ajuda.frenet.com.br/knowledge-base/eu-posso-enviar-qualquer-produto-pela-frenet/), [documentação](https://docs.frenet.com.br/llms.txt).

| Contrato/transportadora | Limite relevante para a farmácia |
| --- | --- |
| Correios | Medicamento comum segue as condições postais; controlados exigem contrato específico, não comprovado no contrato Frenet. Aerossol não inflamável somente terrestre; inflamável proibido. |
| Loggi via Frenet | Medicamentos proibidos nas regras consultadas. Não usar como solução para a linha farmacêutica. |
| Jadlog via Frenet | Lista medicamentos com possíveis exceções mediante consulta e também produtos farmacêuticos entre restrições. Exigir esclarecimento/aceite escrito; refrigeráveis proibidos. |
| Total Express via Frenet | Medicamentos dependem de autorização. Perfume e desodorante aerossol aparecem com ressalvas, mas há proibição geral de gases/líquidos inflamáveis. Exigir aceite por SKU/modal; operação padrão não atende refrigerados. |
| J&T e Optimus | Não foi comprovado aceite suficiente para liberar a linha farmacêutica. Ausência de proibição encontrada não equivale a autorização. |
| Contratos próprios especializados | Buslog declara certificação farmacêutica e integração por contrato próprio; rota, serviço e carga concretos não foram confirmados. Rodonaves tem análise farmacêutica específica, sem manutenção térmica geral. |

Fontes: [Correios](https://www.correios.com.br/enviar/proibicoes-e-restricoes), [Loggi](https://ajuda.frenet.com.br/knowledge-base/regras-de-postagem-loggi/), [Jadlog](https://ajuda.frenet.com.br/knowledge-base/regras-de-embarque-jadlog/), [Total/Frenet](https://ajuda.frenet.com.br/knowledge-base/regras-de-postagem-total-express/), [Total](https://materiais.totalexpress.com.br/lp-out-quero-ser-cliente), [Buslog](https://buslog.com.br/sobre-nos/), [Rodonaves](https://rodonaves.com.br/sobre-envio).

A assistência adicional **SOS** exclui, entre outros, medicamentos, aerossóis, cosméticos líquidos/cremosos, alimentos com validade e frágeis. Isso é separado do seguro do transportador; não afirmar ausência de toda cobertura nem prometer indenização. [Regras SOS](https://ajuda.frenet.com.br/knowledge-base/produtos-proibidos-sos-assist%C3%AAncia/).

Nenhuma conta, contratação, etiqueta, compra ou nova integração de frete foi criada. Melhor Envio continua sendo a integração existente. Regras sanitárias, preços, estoques e margens não foram alterados por esta análise.

## Evidências

Pesquisas completas, matriz de 6 contratos × 11 classes, datas e limites: `outputs/frenet-cargo-2026-10-27/` e `outputs/farmacias-logistica-benchmark-2026-10-27/`. Snapshot, lote adicional, originais públicos e comprovante da consulta GS1: `outputs/rota-logistica-motion-2026-10-27/`. Dados privados fora do Git.
