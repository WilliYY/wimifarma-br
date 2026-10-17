# Catálogo de distribuidores — piloto por EAN

## Regras aprovadas em 17/10/2026

O lojista autorizou iniciar por losartana potássica 50 mg, comparar ofertas do mesmo EAN e vender com acréscimo de 60% sobre o custo final. Na atualização mais recente, restringiu o piloto à ANB e à Profarma; SantaCruz fica reservada para uma próxima etapa. Isso não equivale a margem líquida de 60%; tributos, tarifas, embalagem e frete continuam relevantes. Não foi ativado desconto Pix adicional nem alterado o frete grátis.

Na loja pública o produto aparece disponível para compra normal, sem a expressão “sob encomenda”. A origem é uma distinção operacional no ADMIN. O cliente vê o prazo de preparação antes de comprar; não há alegação de estoque físico nem de reserva no distribuidor. A farmácia compra externamente quando necessário, confere e dispensa. Não há compra automática em distribuidoras.

## Identidade e estoque

- `Product.inventorySource`: `PHARMACY` ou `DISTRIBUTOR`, alterável somente por ADMIN. Produtos legados ficam `PHARMACY`.
- `Product.stock` continua sendo estoque físico. Nenhuma reserva, pagamento, cancelamento ou estorno de item `DISTRIBUTOR` modifica esse saldo.
- `eanNormalized` guarda GTIN validado em 14 dígitos, com zeros à esquerda para equivalências UPC/EAN. Indicadores de embalagem não são removidos. Criação/edição procura também os EANs legados equivalentes, inclusive na lixeira. O índice único complementa a trava do catálogo.
- Um produto por apresentação; `SupplierCatalogOffer` guarda uma oferta por fornecedor com código interno, EAN, custo final em centavos, saldo quantitativo opcional, condição, referência, conferência, expiração e revisão.
- Embalagem externa e sinais como “+100” não viram saldo exato. Saldo desconhecido fica nulo. O piloto admite oferta confirmada como comprável, com cota operacional de cinco unidades por fornecedor; não representa promessa nem reserva do fornecedor.
- A cota desconta reservas pendentes e vendas já consumidas. ADMIN pode renová-la explicitamente após nova conferência, preservando reservas e auditando a reposição. Não há renovação automática.

## Disponibilidade, preço e privacidade

Uma oferta precisa corresponder ao GTIN do produto, estar disponível, ter custo positivo, conferência passada e validade futura de até 24 horas. Escolhe-se a oferta elegível mais barata para a quantidade; não se soma disponibilidade de apresentações diferentes. Sem oferta válida o produto fica indisponível, mesmo que tenha saldo físico cadastrado enquanto estiver em modo distribuidor.

O preço é custo × 1,60, arredondado ao centavo; preço promocional manual não substitui essa regra no piloto. Para medicamentos com receita, a oferta exige teto de venda conferido na CMED. O preço calculado acima desse teto bloqueia a oferta. A operação deve conferir apresentação e UF/ICMS de todos os destinos; o PMC de um portal não substitui a fonte oficial. Os custos privados e ofertas não são serializados para o site público.

Fotos de medicamentos com receita permanecem fora da renderização pública do piloto, conforme RDC 44/2009, art. 54. Uma foto interna precisa corresponder ao EAN e ter origem autorizada; não há imagem inventada ou associação por nome aproximado. Receita comum classificada permite pedido e pagamento, com conferência farmacêutica antes da dispensação. Controlados, classificação pendente e Farmácia Popular conservam atendimento assistido. Distribuidores ficam fora do feed Shopping nesta etapa.

## Preparação e checkout

O objetivo é um dia total para recebimento e conferência. Recebimentos ocorrem terça–sábado, sem domingo/segunda. Corte conservador inicial: 18h30; depois disso o dia efetivo avança. A previsão termina às 18h30 da próxima data de recebimento após o dia efetivo, em `America/Sao_Paulo`. Ex.: sexta antes do corte → sábado; sábado/domingo/segunda → terça; terça após o corte → quinta. Feriados e cortes específicos ainda precisam de fonte confirmada. Não se promete “amanhã” irrestritamente.

Carrinho, detalhe, checkout e histórico informam o preparo. Pedidos com itens externos não mostram a promessa local de retirada em 30 minutos. O pedido guarda a data e os dias de preparação; cotação por transportadora considera o maior entre o preparo configurado e esse calendário, sem somar duas vezes. Cotações com prazo desatualizado exigem novo cálculo. Medidas e aceitação sanitária por transportadora continuam exigindo conferência, sem dimensões inventadas.

O checkout trava produtos externos por ID, relê as ofertas e reserva a cota por ID de oferta em ordem global. Pagamento valida identidade, reserva, validade, custo fotografado e menor preço vigente antes de enviar ao gateway; divergência exige revisão, sem cobrança silenciosa. Pagamentos processam estoque físico ordenado e depois ofertas ordenadas, evitando inversão de locks. Edição de origem/identidade e troca do código de oferta são bloqueadas com pedidos abertos.

Reserva interna ativa vira consumida após pagamento confirmado pelo gateway ou registro autorizado da equipe. Cancelamento libera uma vez; estorno de venda consumida não afirma reposição externa nem devolução física. Resposta incerta de gateway mantém a reserva para reconciliação. O fluxo existente expira tentativas online não iniciadas após 30 minutos. Pedidos manuais externos ainda pendentes e não pagos expiram após 24 horas; confirmados não são cancelados pelo job. Cashback e WimiCoins são liquidados na mesma transação, incluindo devolução de resgates e anulação de ganhos pendentes.

## Operação e implantação

Ofertas são conferidas pelo ADMIN em Produtos/Catálogo, após salvar a origem de distribuidor. API privada `/api/admin/fornecedores/ofertas`, com permissão ADMIN, releitura do ator, proteção de origem, tamanho, formato e limite de requisições. Alterações antigas não substituem conferência mais recente. Não há conector automático nem catálogo completo sincronizado nesta entrega.

Migração `20261017190000_supplier_catalog` é aditiva. Fazer backup antes de aplicar; não converter automaticamente produtos legados nem seus estoques. Produtos com ofertas externas arquivados permanecem retidos para rastreabilidade e não bloqueiam a limpeza dos demais produtos da lixeira.

`scripts/supplier-catalog-db-audit.ts` exige banco descartável `supplier_qa`, host `wimifarma-br-supplier-qa` e `SUPPLIER_CATALOG_QA=isolated-disposable`. Testa migração, concorrência de cotas, menor preço, bloqueio de cobrança antiga, confirmação duplicada, estorno, expiração e estoque separado. Gateway simulado; nenhum pagamento real ou comunicação externa.

## Pendências

Conectores autorizados e execução recorrente fora do Codex; comparação SantaCruz ainda não comprovada; fotos internas autorizadas; calendário de feriados e cortes reais; dados financeiros completos e reconfirmação operacional antes da aquisição. Ausência nas três distribuidoras exige atendimento humano ao comprador, sem substituir apresentação ou fabricante automaticamente.
