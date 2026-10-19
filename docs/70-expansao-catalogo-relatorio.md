# 70 — Expansão do catálogo com relatório de vendas

Atualização de 19/10/2026: inventário completo, referências das marcas, manifesto v1 com antimicrobiano explícito e seu envio privado de receita são descritos em [71](71-inventario-completo-e-receitas.md). O registro de 18/10 abaixo permanece como evidência da entrega anterior; não implica publicação automática dos novos candidatos.

## Autorização e origem — 18/10/2026

O titular forneceu relatório FAR de 01/10/2023 a 18/10/2026, 17h15, e autorizou iniciar novos cadastros com ofertas reais de ANB e Profarma. A extração local encontrou 1.388 páginas, 83.229 linhas e 6.290 códigos internos. O documento não contém EAN: os códigos internos não podem virar GTIN nem identificar automaticamente a apresentação do distribuidor. Os arquivos e valores comerciais do relatório permanecem em evidências privadas locais, fora do Git e dos serviços de pesquisa.

A seleção combina recorrência observada na loja com apresentações essenciais disponíveis. Não é um ranking nacional nem prova de demanda futura. Produtos ausentes do relatório podem entrar após a mesma conferência de identidade, disponibilidade e condições comerciais.

## Percentuais e preço

- Dove e Nivea: acréscimo de 20% sobre o menor custo final elegível.
- Genéricos e similares baratos do primeiro lote: 50%.
- Segmento ético selecionado: 10%. O segmento comercial não transforma um medicamento em referência; registros CMED classificados como Novo foram mantidos como outro medicamento, com o segmento ético independente.
- Itens genéricos/similares caros precisam de escolha por apresentação. O exemplo autorizado pelo titular é custo de R$ 100 e venda próxima de R$ 110. Não foi criado um limiar automático que derrube o preço ao atravessar uma faixa.

O percentual pertence ao produto. Atualizações de custo recalculam o preço atual pelo motor existente e preservam a escolha ADMIN. Importações em produtos existentes atualizam somente ofertas; não restauram o percentual inicial. Pedidos anteriores preservam seus valores fotografados. Acréscimo não equivale a margem líquida; impostos, tarifas, embalagem e frete continuam relevantes.

O novo pedido de 50% também alcança o padrão anterior de 60% das dez losartanas genéricas/similares. O ajuste operacional é fechado nesses EANs, usa o serviço ADMIN auditado e altera somente registros ainda com 60%, sem pedidos em aberto; percentuais diferentes são preservados. Não recalcula preços físicos ou snapshots nem renova as ofertas.

## Manifesto aprovado e importação

`scripts/import-supplier-pilot.ts` continua em dry-run por padrão. `manifestVersion: 1` permite um lote explícito de até 50 EANs, com classificação, percentual e evidências de identidade/classificação. Arquivos legados sem versão continuam restritos a receita comum, com o padrão antigo de 60% para novos cadastros.

Cada entrada informa nome técnico, marca, descrição, categoria, princípios ativos quando aplicáveis, receita explícita e ofertas reais. `NONE` é somente um valor de entrada do manifesto; persiste no enum existente como `UNREVIEWED` com `requiresPrescription:false`. Não altera enum nem libera automaticamente itens controlados, receita desconhecida ou Farmácia Popular. MIP exige classificação explícita compatível e fonte da apresentação exata.

O importador normaliza GTIN, recusa duplicações, identidades ambíguas, colisão com `PHARMACY`, cadastros excluídos e divergências de receita/apresentação. ADMIN ativo é revalidado sob lock; produto e ofertas são relidos. Disponibilidade, validade até 24 horas, custo final com ST, teto de medicamentos, cota, reservas e unidades consumidas usam os mesmos contratos do checkout. `+100` permanece quantidade desconhecida. A rotina não repõe cotas.

Novos produtos usam estoque físico zero, origem `DISTRIBUTOR`, sem cashback ou WimiCoins ativados automaticamente. Fotos, classificação, percentual, frete e identidade de produtos existentes permanecem intactos. Este fluxo não transmite pedidos às distribuidoras.

## Fotos e ilustrações

O titular substituiu nesta etapa a direção anterior de fotos públicas Rx: medicamentos com receita passam a usar ilustração institucional pública. Os originais, capas e galerias cadastrados continuam no banco e no painel; os DTOs públicos não os divulgam como foto de produto, inclusive em metadados, Miauby e carrinhos antigos.

A classe explícita escolhe a ilustração: genérico, similar, segmento ético/referência ou neutra quando desconhecida. As imagens são identificadas como ilustrativas e não representam a embalagem do fabricante. MIP/OTC, higiene e perfumaria conservam fotos públicas verificadas. As três novas variantes transparentes foram derivadas da arte institucional fornecida pelo titular, pelo imagegen integrado, alterando a identificação da faixa; arquivos WebP de até 640 px e menos de 40 KB. A marca oficial do cabeçalho e sua animação não foram alteradas.

`scripts/publish-catalog-product-images.ts` publica somente fotos de novos itens não-Rx explícitos. Exige EAN, apresentação, nome/marca/classificação, fonte de fabricante ou distribuidor, data, hash e conferência de reutilização. Faz dry-run, revalida ADMIN/produto sob lock, preserva qualquer capa/galeria existente, usa biblioteca/auditoria e WebP de até 640 px/100 KB, sem ampliar. Falha transacional remove somente arquivos criados naquela execução. URLs e originais internos continuam privados.

Foto acessível não é comprovação universal de licença ou de versão gráfica. Nunca associar embalagem de outra dose, quantidade, fragrância ou versão. Uma falha de acesso não autoriza contornar o fornecedor. Candidatos sem fotografia conferida permanecem pendentes neste lote.

## Logística e detalhes

Nome curto não substitui o cadastro técnico. Dose, quantidade, liberação prolongada/revestimento, fabricante, princípio ativo e registro conferido permanecem no cadastro/descrição; não resumir associações ou liberação especial como se fossem apresentações simples.

Sem balança ou medidas informadas, reutilizar `estimateBaseShipping`: sólidos orais e higiene por massa/volume elegíveis recebem base conservadora, com caixa e proteção já incluídas. O rascunho registra `measurementBasis:estimated`, `enabled:false`, `transportReviewed:false`. Não converter dosagem em peso nem conteúdo líquido em peso bruto medido. Aerossóis, termolábeis, injetáveis, vidro, kits e outros casos ambíguos não recebem aprovação por aproximação. Cotação não comprova aceitação da transportadora.

O prazo real de preparação continua no carrinho e checkout, com o calendário de recebimento terça–sábado já aprovado, sem repetir a informação nos cards.

## Operação e validação

Não existe coletor autônomo habilitado na VPS. As observações desta etapa foram feitas em sessões normais autorizadas. Se o navegador expirar ou o Work negar acesso, não renovar datas nem inventar estoque; ofertas vencem normalmente. Após a publicação conferida, a automação existente foi atualizada pelo mecanismo suportado do Codex para os 25 EANs aprovados, mantendo 8h/12h/17h de Brasília, silêncio sem mudanças e percentuais atuais. Outros EANs não entram automaticamente.

Antes da publicação: revisão independente de código e do manifesto concreto, testes gerais/segurança, lint, typecheck, Prisma, build e auditorias; backup privado, importação em banco isolado sintético, dry-run produtivo e aplicação auditada. Conferir os hashes dos produtos/ofertas/pedidos anteriores e respostas públicas, sem criar pedido, pagamento, etiqueta ou mensagem real. Evidências locais em `outputs/catalogo-expansao-2026-10-18/`; não versionar relatório, observações, manifestos comerciais ou arquivos de credenciais.

## Comprovação da entrega

- Código `a4769ee`: 740 testes gerais e 324 de segurança aprovados; lint sem erros, typecheck, Prisma e build aprovados. Auditoria de produção sem vulnerabilidades; auditoria completa mantém os cinco high conhecidos na cadeia de desenvolvimento do ESLint. Revisões independentes de código, manifesto, EAN/CMED, fotos e ajuste operacional aprovadas.
- Backup privado validado e imagem anterior preservada. PostgreSQL isolado recebeu somente schema e dados de teste: dry-run sem gravação, 15 criações, repetição, preservação de campos manuais/fotos/frete/percentuais/cotas/reservas/consumo, colisão física e duplicação recusadas. Ajuste de percentual preservou cenário sintético de pedido aberto e percentual manual. Banco descartável removido após validar nome, ator e conteúdo exclusivos.
- Produção: 15 novos itens ativos (11 medicamentos com receita comum e quatro de higiene/perfumaria), quatro fotos reais publicadas com fonte/hash e ilustrações Rx por classe. Menor oferta elegível entre ANB/Profarma; 20% para Dove/Nivea, 50% para os genéricos/similares baratos selecionados e 10% para Glifage XR/Renitec. As dez losartanas passaram de 60% para 50% pelo serviço ADMIN auditado; nenhum pedido aberto impediu o ajuste.
- Hashes confirmam preservação de todos os demais campos dos 15 produtos anteriores, das 16 ofertas anteriores, pedidos, itens e reservas. Fotos originais e estoque físico não foram sobrescritos. Repetições em dry-run retornaram 15 produtos existentes e quatro fotos preservadas.
- Conferência pública real: 25 buscas por EAN, 15 novas páginas com seus detalhes, imagens WebP carregadas por GET, preços das dez losartanas e revisão dos 25 itens no carrinho. Custos/percentuais privados não vazam; APIs reservadas recusam acesso anônimo. Nenhum pedido, pagamento, etiqueta ou mensagem comercial foi criado. App e PostgreSQL saudáveis.
- Inspeção visual das quatro fotos e das variantes institucionais realizada antes da publicação. O navegador local tornou-se indisponível depois das consultas; a validação publicada foi por HTTP/APIs e bytes das imagens, sem alegar inspeção interativa completa do layout após deploy.
- Permanecem pendentes: ampliar os próximos lotes do relatório/essenciais, fotos de candidatos ainda sem fonte obtida, MIPs com identidade/dispensa/imagem completas, revisão logística e habilitação das integrações de consulta. Dorflex 24 não foi publicado porque o custo observado superou o teto conservador deste piloto; não se afirma inviabilidade geral desse medicamento. Os novos perfis continuam estimados e sem aprovação de transportadora.
