# Catálogo de distribuidores — piloto por EAN

Atualização de 18/10/2026: apenas ANB e Profarma permanecem como fontes comerciais. GAM/SantaCruz servem somente de referência. Atualização conserva cotas/reservas, fotos Rx são privadas e leves, e rotina Codex diária às 8h/12h/17h depende de PC/navegador. Procedimento e evidências atuais em [68](68-rotina-piloto-fornecedores.md); a seção de 17/10 abaixo é histórico da primeira entrega.

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

## Descrições públicas — ajuste de 17/10/2026

As quatro apresentações de losartana do piloto usam texto objetivo com marca, dosagem, quantidade e orientação para consultar entrega/retirada no carrinho. Referências à CMED, códigos EAN/MS e fontes de conferência não compõem a descrição corrida. EAN e teto regulatório continuam nos cadastros e controles internos. Não duplicar a instrução de apresentação de receita na descrição: a página e o checkout mantêm o aviso próprio e a conferência farmacêutica antes da dispensação. A edição de conteúdo não altera a classificação de receita, preços, ofertas, validade, cotas ou estoques. Não usar “venda liberada” como sinônimo de dispensa sem receita nem acrescentar promessas clínicas.

Conteúdo salvo pelo painel ADMIN e relido nas quatro páginas públicas, com botões de compra habilitados e aviso de receita preservado. A conexão com o Chrome voltou a permitir essa conferência. Arquivo privado de entrada atualizado localmente para manter o mesmo texto em novos cadastros; ofertas não foram reconferidas ou renovadas por esta edição. Somente conteúdo persistido e documentação mudaram, sem alteração de código executável, migração ou necessidade de reconstruir a aplicação. Validação: leitura pública real e `git diff --check`; não foi feita compra, cobrança ou envio de mensagem.

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

## Entrega e validação em 17/10/2026

- Código funcional `f8e80e5`, ajustes `25321a2` e auditoria sintética corrigida em `645e78e`. A aplicação publicada usa `645e78e`; commits posteriores de documentação/testes não exigem reconstrução da imagem.
- 649 testes da suíte completa passaram. Lint, typecheck sem emissão, build Next.js e validação Prisma passaram. A suíte de segurança teve 290 testes aprovados; os testes adicionais de autorização/abuso do catálogo e a regressão de edição sem origem também passaram na suíte completa. Revisão independente dos fluxos sensíveis aprovada após correções de preço, identidade, locks e liquidação dos ganhos pendentes.
- Auditoria de dependências de produção: zero vulnerabilidades. A auditoria completa continua com cinco alertas high na cadeia de desenvolvimento `braces`/ESLint; não foi aplicado o downgrade incompatível de Next sugerido por `npm audit fix --force`.
- PostgreSQL 17 descartável, rede Docker interna e gateway simulado: 22 migrações aplicadas, concorrência de cotas, preço menor surgido antes do pagamento, confirmação duplicada, estorno, expiração, GTIN único e preservação do estoque físico passaram. O teste recusou URL com substituição de host antes de conectar. Contêineres e rede QA foram removidos após o teste.
- Build e recriação apenas da aplicação. Backup do banco em formato custom validado e protegido com permissão 600; imagem anterior preservada como `wimifarma-br-app:rollback-before-supplier-645e78e`. Migração de produção aplicada pelo serviço oficial `docker compose --profile tools run --rm --no-deps migrate`, que resolve corretamente a configuração de ambiente; `docker run --env-file` não reproduz a interpretação de valores do Compose.
- Quatro EANs ativos, com 30 comprimidos de 50 mg: Biosintética `7896181915638`, Germed `7896004708539`, Medley `7896422507738` e Nova Química `7896004778204`. Valores do piloto: R$ 3,95; R$ 4,50; R$ 14,86; R$ 5,30, respectivamente. Ofertas observadas na Profarma; Germed comparado também com ANB e priorizando Profarma. Nenhum preço, saldo ou imagem do Teuto existente foi alterado.
- Identidade/apresentação/registro conferidos por EAN na planilha CMED oficial de 09/10/2026. O teto conservador do piloto usa o menor PMC positivo da apresentação entre as colunas consultadas, incluindo o valor sem impostos, abaixo dos tetos das UFs. Não foi usado PMC do portal para definir esse teto.
- Verificação pública real: busca retornou os quatro itens, revisão do carrinho devolveu os preços/cotas corretos, páginas responderam 200 com preparação e disponibilidade, sem custos privados e sem “sob encomenda”; API privada negou acesso anônimo (401). Feed Shopping excluiu os itens externos. Healthchecks interno/público passaram e o contêiner ficou saudável. Nenhum pedido, pagamento real ou envio de mensagem foi criado por essa verificação.
- Fotos internas ainda não foram obtidas/validadas. Não se afirma validação visual em navegador: o Work bloqueou o acesso local, inclusive após reiniciar a conexão. As conferências comerciais preservadas têm precisão de data; por cautela, sua validade termina à meia-noite local de 17 para 18/10/2026. Depois disso, sem nova conferência, a oferta se torna indisponível. O piloto não é uma sincronização automática ativa.

Arquivos principais alterados: `prisma/schema.prisma`, migração `20261017190000_supplier_catalog`, módulo `src/features/supplier-catalog`, API ADMIN de ofertas, cadastro/edição de produtos, `storefront`, páginas de produto/busca/home, carrinho e checkout, painel/histórico de pedidos, criação de pedido, serviços Mercado Pago/Asaas, liquidação de benefícios e serviço de frete. Importador e auditoria ficam em `scripts/import-supplier-pilot.ts` e `scripts/supplier-catalog-db-audit.ts`; documentação em README, pendências e histórico de decisões. `.dockerignore` passou a excluir evidências e dados locais privados do contexto de build.
