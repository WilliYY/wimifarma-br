# 07 - Historico de Decisoes

## 2026-10-25 — Marcas sem duplicidade e com identidade visual

- Reunir Johnson’s e Johnson’s Baby em um cartão com filtro completo, preservando links antigos e a distinção de Johnson & Johnson.
- Usar foto pública válida da própria marca quando não houver logo; manter fora da faixa marcas sem mídia conferida e campos que contenham título completo/dosagem. Tratar a descrição legada dos lenços como Natural Baby, sem reescrever cadastros.
- Preservar nomes, preços, estoque e regras de venda dos produtos. Contrato e regressões em [82](82-marcas-do-catalogo.md).

## 2026-10-25 — Frete por CEP, teto e contribuição projetada

- Autorização: o lojista pediu substituir a promessa nacional de R$ 99,90 por consulta de CEP, limites no painel e orçamento baseado em margem, preservando os percentuais de preço dos produtos.
- Decisão: benefício calculado no servidor com custos atuais, reservas conservadoras, embalagem por volume e extras de rota confirmados. Configuração incompleta impede o subsídio, mantendo cotação normal; não presumir impostos, custo zero ou renovação de ofertas. Sem migration ou alteração de preços/pedidos anteriores.
- Fluxo: token vincula benefício público, CEP, resgates e revisão; checkout recalcula e exige recotação se o preço mudou. Fila global ADMIN e diagnóstico distinguem perfil pendente de CEP sem cobertura. Nenhuma liberação logística em massa.
- Contrato e limitações em `107-frete-cep-e-contribuicao.md`.

## 2026-10-24 — Noventa e seis itens aptos das pesquisas publicados

O lojista autorizou publicar todos os candidatos aptos das pesquisas atuais e anteriores. A consolidação resultou em 96 novos produtos, publicados em lotes exclusivos A46 e B50, com 96 fotos e páginas públicas verificadas, sem EAN duplicado. A execução encerrou as duas janelas e removeu somente os dois bancos de QA pertencentes à tarefa. A relação por marca, horários, fingerprints e limites está em `docs/96-catalogo-por-principio-ativo-2026-10-22.md`; relatório privado com links em `outputs/publicacao-total-chat5-2026-10-24/RELATORIO-FINAL.md`.

Foram mantidos o acréscimo anterior de 20% para 25 Principia e os 35% autorizados para outros 71 itens, sempre sobre o custo final. Componente de ST desconhecido permanece `null`: sua ausência não significa isenção nem autoriza custo zero. Para estas ofertas, o total final incluindo ST foi comprovado por fonte física, vínculo exato de produto/oferta e revisão independente. Não houve renovação artificial de cotações ou invenção de quantidades de estoque.

Cada lote executou 485 testes de segurança, 111 de fornecedores, 25 controles negativos, QA, backup e simulação antes de uma única aplicação. A base imutável de código e os checks de fundação foram reutilizados com seus hashes e datas originais. A auditoria completa manteve visível um alerta moderado em `fast-uri`, sem alertas altos ou críticos. Candidatos sem evidência suficiente permaneceram retidos, sem desativação dos itens existentes ou reimportação dos lotes anteriores.

## 2026-10-24 — Trinta novos capilares Dove/TRESemmé publicados

- Resultado: oito condicionadores Dove e 22 shampoos/condicionadores TRESemmé criados com foto real, custo final ANB e regra específica capilar de 20%. Os 30 EANs eram novos; aplicação única, 60 auditorias, registros e tabelas protegidas preservados. Páginas e imagens públicas conferidas individualmente por HTTP e hash.
- Controles: fonte e imagem imutáveis, revisão independente, 485 testes de segurança, 111 de fornecedores, 25 controles negativos, QA isolado, backup e CAS com mutex. Janela encerrada sem concessão ativa; somente o QA próprio foi removido. Auditorias mantêm um alerta moderado, sem altos/críticos.
- Contrato esclarecido: `reviewerThreadId` identifica o revisor; `approved-eans.reviewedBy` identifica o ADMIN ativo usado pelo servidor. A autorização existente deve corresponder ao status e à ordem exata dos EANs exigidos. Tentativas anteriores sem aplicação foram arquivadas; uma concessão foi desfeita somente após provar zero dos EANs no banco e ausência do marcador de aplicação, restaurando o snapshot canônico exato.
- Pendências: apresentações divergentes e a nova pesquisa de 19 EANs na Profarma continuam fora deste lote até fechar identidade/condição comercial. Não se afirma cobertura de todo o mercado. Relatório, provas e cuidados em `96-catalogo-por-principio-ativo-2026-10-22.md`.

## 2026-10-24 — Mais 38 apresentações Above publicadas; repelentes retidos por lote

- Operação: incluir 20 aerossóis, sete apresentações capilares e 11 outros cosméticos Above, com oferta ANB, ST numérica, foto real e conferência individual. Os 13 lotes próprios somam 224 EANs distintos com fotos, sendo 51 Above; nenhum lote encerrado foi reaplicado.
- Identidade e imagens: rótulo, tabela de EAN e oferta confrontados, sem converter massa/volume ou inferir equivalência de fórmula. Originais de distribuidor totalizam 1.971.098 bytes e as transformações WebP conferidas, 355.018 bytes, preservando a resolução de origem sem ampliação/corte. A referência atual Baston sustenta a natureza da família solar, sem comprovar EAN, formulação ou regularidade atual.
- Controles: fonte imutável `3f905a9`, 988 arquivos e 904 execuções de teste aprovadas; segurança/fornecedores/auditorias repetidos por lote, novo QA isolado, ADMIN ativo, deduplicação atual, mutex/CAS, backup, dry-run, aplicação única, imagens persistentes e conferência pública. Janelas liberadas, QAs próprios removidos e backups preservados. Auditorias mantêm um alerta moderado em `fast-uri`, sem altos/críticos.
- Pendências: aviso Anvisa de 03/08/2026 cita os lotes 189952 e 205688 de repelentes Above. As três apresentações pesquisadas permanecem fora da publicação enquanto lote/correspondência estiverem desconhecidos; não se afirma proibição de todos os lotes. Doutorflan e adesivo antisséptico aguardam classificação própria; ONE Sport aguarda vínculo de marca. Divergências de quantidade/duração também continuam retidas. Provas e fontes em `96-catalogo-por-principio-ativo-2026-10-22.md`.

## 2026-10-24 — Dove21, Lux11 e TheraSkin8 encerrados com prova pública

- Operação: publicar 21 apresentações Dove, 11 Lux e oito cosméticos TheraSkin, com revisão por EAN, foto real, ST numérica e deduplicação atual. A união dos dez lotes desta frente contém 186 EANs distintos com fotos; os lotes anteriores não foram reaplicados.
- Identidade: nomes atuais dos rótulos preservados sem inferir equivalência de fórmula; aerossóis Dove declaram massa e volume conjuntamente; o kit Lux mantém seis barras de 85 g. As referências TheraSkin sustentam natureza/família, sem alegar comprovação do EAN, tom ou formulação pela página atual.
- Evidência: fonte `532e96c`, mapa completo de 988 arquivos e fundação de 904 testes; cada lote repetiu segurança/fornecedores/auditorias e novo QA isolado, seguido de backup, dry-run, aplicação única, persistência em outro contêiner e conferência pública. Todas as janelas foram liberadas e os QAs próprios removidos, com backups preservados.
- Limites: a coleta comercial Dove terminou em 204 apresentações, mas suas fotos oficiais foram observadas parcialmente. A lista pública Lux teve 38 links e cinco avanços até o controle desaparecer. Cetrilan, Papuless e medicamentos TheraSkin continuam fora do lote cosmético, sem inferência regulatória a partir de documentação histórica. Um alerta moderado em `fast-uri` permanece, sem altos/críticos. Provas e detalhes em `96-catalogo-por-principio-ativo-2026-10-22.md`.

## 2026-10-24 — Inclusões individuais Nivea18 e Above13 com fotos auditadas

- Operação: adicionar 18 apresentações Nivea e 13 Above, com ofertas ANB, ST numérica, fotos reais e revisão de cada EAN/variante/embalagem. A frente das 17 marcas soma 146 EANs distintos publicados, sem reaplicar lotes anteriores ou atribuir inclusões de outras frentes a esta.
- Evidência: Nivea usa 17 fotos de distribuidor e uma do fabricante; Above usa objetos de imagem de catálogos públicos de distribuidores, preservando a procedência e as limitações. Divergências de unidade foram documentadas; nenhuma equivalência entre massa e volume foi inferida.
- Controles: fonte imutável `af659a0`, 988 arquivos conferidos e 904 testes aprovados; cada lote repetiu segurança/fornecedores/auditorias, QA isolado, deduplicação atual, ADMIN ativo, backup, baseline, dry-run, aplicação única e verificação pública. As duas janelas terminaram liberadas, com QA próprio removido e backups preservados.
- Limites: auditorias mantêm um alerta moderado em `fast-uri`, sem altos/críticos. Três fotos Above conservam a resolução original de 99 × 240 pixels, sem ampliação. A coleta ANB Dove terminou em 204 apresentações; a pesquisa de fotos segue parcial. Provas e detalhes em `96-catalogo-por-principio-ativo-2026-10-22.md`.

## 2026-10-24 — Dashboard com contagens reais e presença por navegador

- Decisão: remover as demonstrações de interesse comercial e roadmap do dashboard; distinguir cadastros, contatos, campanhas, pedidos e compras concluídas e pagas, incluindo pedidos sem conta vinculada e excluindo pagamentos de teste.
- Presença: reutilizar a identidade assinada e o índice de `SiteVisit.lastSeenAt`, com janela de dois minutos e sinais a cada 30 segundos somente na página pública visível. Sinais não acrescentam visualizações. O total agregado exige acesso ao dashboard e falhas não são apresentadas como zero.
- Limites: um navegador com várias abas conta uma vez; outros navegadores ou perfis no mesmo aparelho podem contar separadamente. Não há identificação de pessoas, fingerprinting, deduplicação por IP ou associação automática de pedidos a contas. As consultas não representam fechamento financeiro.
- Impacto: dashboard, tracker, APIs de visitas e presença, política de privacidade e testes. Sem migração, remoção de dados ou mudanças nos pedidos. Contratos em `31-visitas-do-site.md` e `32-dashboard-confiabilidade.md`.

## 2026-10-24 — Perfumes não usa característica de fragrância como tipo de produto

- Correção: remover da seleção Perfumes os cuidados pessoais que só mencionam perfume, inclusive o Rexona Clinical Sem Perfume. Preservar perfumes, colônias e desodorante colônia.
- Impacto: filtro compartilhado da navegação e listagem, com regressões específicas; nenhum cadastro comercial ou fluxo de compra alterado. Detalhes em `94-catalogo-lateral-e-continuidade.md`.

## 2026-10-23 — Cashback de compra em genéricos e similares com receita

- Decisão do lojista: aplicar 1% em genéricos/similares, inclusive com receita classificada. Controlados, receita pendente e Farmácia Popular permanecem excluídos; WimiCoins e bônus de avaliação não foram ampliados.
- Implementação: elegibilidade única por classificação explícita, consulta autoritativa no checkout, padrão para novos cadastros e ativação versionada/auditada dos existentes. Snapshots e saldos antigos não são recalculados.
- Divulgação: sem selo promocional público em receitas, preservando a separação entre cálculo financeiro, publicidade e dispensação. Contrato e operação em `15-cashback-produtos.md`.

## 2026-10-23 — Farmácia Popular com orientação em três etapas

- Decisão: reduzir blocos repetidos, ampliar a foto ilustrativa, usar verde como apoio e destacar WhatsApp, etapas e checklist em uma composição responsiva.
- Impacto: somente página pública e CSS local; selo, assinatura oficial, metadata e links existentes preservados. Nenhuma alteração em requisitos, disponibilidade, compra, dados ou confirmação humana.

## 2026-10-23 — Catálogo com cinco cartões por fileira

- Decisão: ampliar a largura útil de `CatalogPage` para até 1680 px e apresentar cinco produtos por fileira a partir de 1280 px, preservando a grade de uma/duas/três colunas em telas menores.
- Motivo e impacto: aproveitar melhor o desktop sem reduzir a tipografia ou mudar filtros, paginação, preço e compra. Lateral de 220 px e espaçamento de 12 px entre cartões na grade de cinco colunas.

## 2026-10-23 — Categorias da home sem rolagem horizontal

- Decisão: substituir os atalhos circulares por seis cartões, com Ofertas em vermelho, grade responsiva de duas/três/seis colunas e atalho Ver catálogo.
- Motivo: melhorar leitura e toque no celular, mostrar todas as categorias e retirar a foto de fundo e os controles de rolagem desnecessários.
- Impacto: componente e CSS local, preservando os mesmos destinos, nomes acessíveis, foco de teclado e movimento reduzido. Nenhuma mudança em produtos, seleção diária, preços ou checkout. Contrato em `10-layout-e-experiencia.md`.

## 2026-10-23 — Âncoras por família e rotação das vitrines

- Decisão: usar famílias editoriais e apresentações de entrada para diversificar as primeiras posições das três vitrines e rotacionar também a abertura da economia por dia de Brasília.
- Motivo: evitar cinco fragrâncias do mesmo sabonete na economia e a repetição de princípio ativo na Farmacinha. Sinais nacionais de ABIHPEC/Abrafarma orientam hipóteses; não são vendas locais comprovadas.
- Impacto: somente seleção das vitrines, com os mesmos produtos, preços, fotos e regras comerciais. Não fixar EANs, criar descontos, reclassificar medicamentos ou importar produtos para completar espaços. A política anterior de cinco preços fixos é substituída conforme `104-vitrines-ancoras-e-rotacao.md`.

## 2026-10-23 — Categorias laterais mais simples

- Decisão: apresentar os grupos laterais como acordeão nativo, com um grupo aberto por vez, ícones e seleção ativa clara. A categoria atual da URL começa expandida; os atalhos gerais e o acesso Ver tudo preservam os filtros existentes.
- Motivo: reduzir a lista longa de subcategorias e facilitar a navegação em celular e desktop.
- Impacto: somente navegação e apresentação do catálogo, categorias e ofertas; sem alteração de preços, classificação, checkout, banco ou dependências. Contrato e regressões em `94-catalogo-lateral-e-continuidade.md`.

## 2026-10-23 — Ofertas com rotação diária

- Decisão: incluir em `/ofertas` os produtos disponíveis com promoção real ou economia PMC elegível e ordenar a seleção padrão por ID e dia de Brasília antes de paginar.
- Motivo: permitir descoberta diária dos descontos já existentes, incluindo distribuidoras, sem depender de marcação manual de promoção nem criar preços fictícios.
- Impacto: seleção pública de ofertas e condição compartilhada do selo; ordenações explícitas e buscas mantêm seu comportamento. Não há cron, IA, escrita diária ou migration.
- Cuidados: preservar a política de PMC, receita e Farmácia Popular, disponibilidade comercial e preço real do carrinho; Pix permanece condicionado ao checkout. Contrato em `103-ofertas-com-rotacao-diaria.md`.

## 2026-10-23 — Referência PMC por apresentação oficial

- Acrescentar referência CMED opcional por GTIN exato, com origem, hash, edição e colunas oficiais. Identificar o PMC como referência comparativa, sem tratá-lo como preço anterior da loja; percentual conservador somente para MIP/OTC explicitamente elegível e informação neutra para receita.
- Separar a referência de preço/markup/estoque e do desconto Pix condicionado ao checkout. Importação administrativa com locks, conferência de revisão e auditoria atômica; não renovar ofertas antigas nem presumir disponibilidade. Contrato, manutenção mensal, migração e validação em [102](102-referencia-pmc-cmed.md).

## 2026-10-23 — Bloqueio de publicação por alerta Zod

- Tratar separadamente o alerta high de consumo de memória em coleções do Zod, detectado na auditoria de produção durante a entrega visual. Fixar a menor versão corrigida 4.6.6 no manifesto e lock, sem atualizar outras dependências ou substituir os limites da aplicação. Preservar a divergência observada entre auditorias completa e de produção; contrato e fonte em [42](42-revisao-de-seguranca.md).

## 2026-10-23 — Logos oficiais e conferência de linhas

- Adicionar logos locais de Johnson’s e Pampers para marcas existentes, mantendo filtros, ordem, produtos e regras comerciais. Usar a identidade Johnson’s fornecida pela Kenvue, preservando a distinção em relação ao logo corporativo Johnson & Johnson da referência. Fontes e limites em [82](82-marcas-do-catalogo.md).
- Conferência por registros ativos não comprova linha completa nem estoque de distribuidor. Preservar as 32 capas revisadas sem falha; lacunas de cadastro não autorizam presumir disponibilidade ou abrir novos lotes de publicação.

## 2026-10-23 — Auditoria funcional e de acessos

- Reproduzidos quatro defeitos: troca de senha local vinculada ao Club sem validação da credencial atual; ausência de aviso em cancelamentos online; avaliação bloqueada pela compra recente integralmente faltante; link de catálogo inválido no checkout vazio. Corrigir com regressões sintéticas e revisão independente, preservando Google-only, concorrência, outbox, consentimento e idempotência financeira.
- Controles de autorização, navegação pública em três larguras, saúde do servidor e pendência logística foram conferidos sem pedidos, cobranças ou mensagens reais. Evidências e limites em [101](101-auditoria-funcional-e-acessos.md).

## 2026-10-23 — Miauby local, boas-vindas e consulta de preços

- Substituir a inferência pública por respostas determinísticas para saudações e orientações do site. Consultas explícitas de produto usam a busca canônica e preços públicos atuais, sem recomendar tratamentos nem inventar estoque, dose, frete ou descontos. A sugestão administrativa com Gemini permanece independente.
- Receber a pessoa pelo primeiro nome seguro, sem enviar sessão ou perfil ao chat. Dicas por contexto limitadas a três por aba; troca de identidade reinicia conversa e aborta requisições. Nenhuma consulta automática de produto ou mensagem comercial é disparada pelas boas-vindas.
- Manter proteção de origem, limites por IP/global, corpo/histórico limitados, saída pública permitida e respostas locais para assuntos clínicos e privados. Contrato e validação em [100](100-miauby-atendimento-local.md).

## 2026-10-23 — Busca tolerante a erros e marca ao final do título

- A busca tenta uma correção limitada pelo vocabulário cadastrado somente após ausência de resultado literal, rejeitando empates e preservando dose, números e identificadores. Autocomplete e página sinalizam resultados aproximados sem reescrever a entrada; filtros e paginação continuam no PostgreSQL com parâmetros. Cache de cinco minutos contém somente palavras. Contrato em [68](68-busca-e-galeria.md).
- Conforme esclarecimento do lojista, o título do card passa a apresentar produto, dose/apresentação e marca curta ao final, por exemplo `Tadalafila 20 mg 4 comp. rev. EUROFARMA`. Abreviações ficam somente no card; nome cadastrado, carrinho e nome acessível permanecem completos. Esta decisão substitui a posição inicial da marca registrada abaixo. Contrato em [86](86-precos-e-desconto-real-nos-cards.md).

## 2026-10-23 — Mais espaço para pesquisa no cabeçalho

- Manter Maps, WhatsApp e Sair somente com ícones em todos os tamanhos em que aparecem. Remover texto/expansão desktop e devolver espaço à busca flexível, preservando endereço no tooltip, acessibilidade, sessão, saldos e atalho administrativo. Registro em [10](10-layout-e-experiencia.md).

## 2026-10-23 — Marca identificável no título dos cards

- Mover a marca cadastrada para a primeira linha do título nos cards públicos compartilhados, preservando nome/dose/apresentação logo abaixo, altura e alinhamento. Evitar repetição quando já consta do nome; não inferir marcas ou alterar nomes persistidos. Contrato em [86](86-precos-e-desconto-real-nos-cards.md).

## 2026-10-23 — Dados logísticos e auditoria da compra

- Priorizar exportação logística por EAN do fabricante/distribuidor e usar GS1 mediante amostra e contrato confirmado. Separar referência da unidade comercial de pacote de expedição aprovado; não preencher frete com peso ou unidade inferidos.
- Consulta real retornou PAC/SEDEX em 31 CEPs válidos, cobrindo 27 UFs e quatro cidades do interior. Essa amostra não libera os produtos sem perfis físicos revisados. CEP todo zero passa a ser rejeitado antes da chamada ao Melhor Envio.
- Configuração ativa simulada em 15 combinações escolheu Mercado Pago: Asaas permite cartão à vista, Mercado Pago permite Pix/cartão; comparação de taxas incompleta mantém o padrão. Tentativas existentes continuam no gateway salvo. Mensagens de andamento agora se referem ao pagamento online sem atribuir todo pedido ao Mercado Pago.
- Testes defensivos, integração PostgreSQL isolada, auditorias de dependências e revisão independente documentados em [99](99-auditoria-frete-checkout-seguranca.md). Não houve cobrança, envio de mensagem ou alteração de tarifas/perfis em produção.

## 2026-10-23 — Proveniência de fotos de varejistas no catálogo

- O publicador administrativo de fotos aceita `RETAILER`, além de fabricante e distribuidora, e registra a origem exata na auditoria. Uma página de outra farmácia não deve ser identificada como fabricante ou distribuidora.
- Permanecem obrigatórios GTIN, apresentação, classificação sem receita, autorização de uso, URL e horário observados, hash e revisão explícita. A nova origem não libera fotos de embalagens de medicamentos com receita, não substitui imagens manuais e não ativa rascunhos implicitamente.
- Validação: regressões do publicador cobrem proveniência, ausência de ativação implícita, rejeição de receitas e de origem desconhecida. Não há mudança de banco, dependências ou cobrança.

## 2026-10-23 — Compra mobile, atendimento e caixa informada

- Compactar carrinho/checkout e conta logada; manter Pix sem escolha inicial e desconto somente após seleção. Reunir WhatsApp dentro da Miauby no celular, preservando atalhos desktop e identidade visual.
- Unificar a grade de catálogo/busca sem liberar publicidade ou fotos de embalagem para receitas por assunto. Deduplicar a marca Elo no rodapé, sem fundir métodos financeiros.
- Substituir o corte de 500 produtos na revisão de frete por busca/páginas de 100. Usar 24 × 15 × 10 cm como referência informada no rascunho individual, com peso preservado e nova revisão exigida; não alterar perfis em massa ou inventar tara/cabimento. A liberação nacional de todo o catálogo permanece dependente de dados logísticos.
- Critérios, evidência somente leitura e limitações em [98](98-compra-mobile-e-referencia-de-caixa.md).

## 2026-10-23 — Logo mobile arredondada e apresentação dos pagamentos

- Aproximar a cápsula da logo mobile do acabamento desktop, preservando SVG, ciclo original, movimento reduzido, proporções e acesso administrativo.
- Trocar o texto antigo do acordeão de pagamento por blocos informativos de Pix/cartão/dinheiro. Pix usa o símbolo e a constante existentes e informa aplicação do desconto somente após seleção no checkout. Dinheiro continua local; condições do cartão são confirmadas na finalização. Sem alterar gateway, preço ou envio de pedido.
- Layout e critérios em [19](19-produtos-e-campanhas.md#logo-e-formas-de-pagamento-no-mobile-em-23102026).

## 2026-10-22 — Fila operacional, cashback em massa e etapas por WhatsApp

- Adotar lista única de pedidos com fornecimento agrupado dentro de cada pedido, etapas conforme retirada/entrega e cores por situação. "Todos" contém a fila ativa; encerrados ficam nas situações próprias. Visualizado é uma preferência local do operador, sem mudar o andamento.
- Separar avisos das etapas para o telefone do pedido dos alertas fixos ao proprietário. Outbox transacional congela destino/texto e vincula pedido/etapa; o worker revalida o estado antes do transporte. Incerteza não permite reenvio automático. Migração aditiva e opção desativada por padrão; publicação coordenada da ponte antes da ativação.
- Exibir 100 produtos por página no catálogo e cashback. Cashback usa seleção de até 50 IDs, revisão e controle de versão existentes, sem seleção implícita do catálogo inteiro. O catálogo continua carregando metadados completos para busca/filtros locais.
- Reduzir o menu diário, mantendo rotas, permissões e dados: Fretes/Pagamentos em configurações; cofre sem atalho e ainda ADMIN. Ofertas, Temas e simulador de fornecedores ficam preservados para uso futuro.
- Pré-selecionar transporte somente quando o operador confirma a revisão física do item. Não inventar medidas para liberar os produtos pendentes. Óleo Dove pode mudar a origem sem publicar seu rascunho, apagar estoque físico ou substituir perfil de transporte.
- Implementação, segurança, validação e limites em [97](97-operacao-admin-e-etapas-whatsapp.md).

## 2026-10-22 — 189 inclusões por família e indisponíveis com Avise-me

- Encerrar as duas etapas autorizadas com 189 GTINs únicos efetivamente publicados: 153 nas seis primeiras famílias e 36 em paracetamol, acetilcisteína, dexclorfeniramina, fexofenadina e ambroxol. Publicadas 73 fotos reais; 116 apresentações com receita mantêm ilustração institucional. Contagens, apresentações, provas e pendências em [96-catalogo-por-principio-ativo-2026-10-22.md](96-catalogo-por-principio-ativo-2026-10-22.md).
- Incluir um paracetamol EMS sem estoque somente com Avise-me, preço de referência real e indisponibilidade comprovada nas duas fontes. Preservar ST/quantidade desconhecidos da fonte secundária como null; limite zero e rejeição de carrinho/checkout comprovados, sem envio de inscrição ou mensagem.
- Após alteração externa detectada antes da aplicação, preservar os dados atuais e encerrar somente a tentativa exata como `aborted_no_apply`, com prova negativa, revisão independente, mutex e CAS. Nova concessão exige cadeia física vinculada por hashes e novos gates; uma tentativa não aplicada nunca conta como publicação. Janelas encerradas, bases próprias de QA removidas com provas e backups preservados. Nenhuma alteração de aplicativo, migração ou dependência por esta inclusão.

## 2026-10-22 — Preço público antes do Pix e escolha explícita no checkout

- O lojista determinou que os preços de home, catálogo, busca, relacionados, detalhe e carrinho sejam os valores atuais dos produtos, sem antecipar os 3% Pix. Cards deixam de exibir preço/selo Pix; referência riscada permanece apenas para promoção real cadastrada. A prévia de cashback também usa o preço atual, antes de desconto por meio de pagamento.
- Preservar arte, marca e divulgação Pix, esclarecendo que a vantagem é aplicada ao escolher Pix no checkout. Novos checkouts iniciam com forma de pagamento pendente; escolher Pix revela o desconto e trocar para cartão/dinheiro o remove. Método ausente ou inválido bloqueia confirmação na interface e no handler.
- Preservar cálculo canônico, arredondamento, resgates, frete, payload, pedidos e pagamentos já criados. Retomada usa o snapshot persistido. Sem schema, migration, atualização de dependências ou cobrança real nos ensaios. Contrato e validação nos documentos [83](83-desconto-pix.md) e [86](86-precos-e-desconto-real-nos-cards.md).

## 2026-10-22 — Produto legível no celular

- Compactar cabeçalho, imagem, preço e espaçamentos da página de produto abaixo de 640 px. Preservar a animação oficial da marca, o modo de movimento reduzido e o atalho autorizado Painel admin.
- Dispor Miauby e WhatsApp lado a lado no celular, ocultando os atalhos fechados enquanto o painel de compra estiver visível. Após esse painel, posicioná-los acima da compra rápida; com chat aberto, manter os atalhos abaixo da conversa, respeitando as áreas seguras da tela.
- Ajustar somente apresentação e observação da área de compra. Estoque, receitas, pagamentos, cálculo de quantidade, carrinho e envio de mensagens conservam os contratos existentes. Validação e arquivos em [19-produtos-e-campanhas.md](19-produtos-e-campanhas.md#organização-mobile-em-22102026).

## 2026-10-22 — Pedidos compactos, fornecimento e avisos

- Priorizar Pedidos na navegação e apresentar até 30 linhas expansíveis por página dos últimos 100 carregados, com busca por EAN, filtros e visão por distribuidora. Preservar estados financeiros, postagem, receita e ações existentes.
- Usar a distribuidora gravada no item e identificar a fonte atual do EAN; não recalcular o fornecedor nem apresentar EAN atual como snapshot histórico. A consolidação desconta faltas e distingue demanda paga de pendente, sem transmitir compras.
- Consultar um resumo autenticado mínimo a cada 30 segundos em aba visível para avisar novos pedidos, sem IA. Acrescentar EAN/origem aos novos textos da outbox Miauby, preservando destino, deduplicação e envio incerto. Sem migração, dependência ou alteração de credenciais.
- Contratos e validação em [34-pedidos-operacao.md](34-pedidos-operacao.md) e [30-miauby-whatsapp-comercio.md](30-miauby-whatsapp-comercio.md).

## 2026-10-22 — Cadastro completo por família de princípio ativo

- Após o encerramento dos lotes anteriores, o lojista autorizou nova pesquisa e inclusão de levotiroxina, nimesulida, simeticona, tadalafila, ibuprofeno e loratadina, comparando ANB e Profarma. A ordem da planilha antiga deixa de definir esta rodada; associações precisam conter o princípio ativo solicitado.
- Preservar cada marca, dose, forma e quantidade por GTIN, com custo final para uma unidade, teto verificado e classificação específica. Desloratadina não entra por semelhança de nome; conflitos entre fontes primárias permanecem retidos.
- Venda livre somente é ativada junto da foto real da apresentação exata, revisada por origem e hash; medicamentos com receita conservam ilustração institucional. Importação de novos itens e publicação de imagens usam as ferramentas oficiais, revisão, banco isolado, backup, dry-run e conferência pública, preservando registros anteriores.
- Contrato, resultados efetivamente publicados e limites da conferência em [96-catalogo-por-principio-ativo-2026-10-22.md](96-catalogo-por-principio-ativo-2026-10-22.md). As fontes comerciais, fotos e provas operacionais ficam privadas.

## 2026-10-22 — Correção confirmada em produção e lotes autorizados encerrados

- O commit `778cb24` foi conferido em Linux e implantado somente no aplicativo, com Next.js 15.5.28 saudável, sem migração ou reinício do PostgreSQL. Runtime e provas foram revistos independentemente.
- A retomada manual concluiu 24 cadastros autorizados: seis infantis, oito medicamentos antigos, três Granado e sete Principia. A consulta própria de 22/10 às 21:25:30 UTC confirmou 619 ativos, incluindo 220 medicamentos, sem duplicação dos EANs publicados.
- Todas as janelas produtivas foram liberadas após auditoria, preservação e conferência pública. Um refil indisponível e três Principia divergentes ficaram retidos. Gerência encerrada e acompanhamento pausado; nenhuma próxima família ou retomada automática autorizada.
- Provas, limites da verificação e alertas de desenvolvimento preservados em [95-correcao-next-15-seguranca.md](95-correcao-next-15-seguranca.md).

## 2026-10-22 — Correção de segurança Next.js 15.5.28

- Atualizar somente Next.js, ESLint Next e dependências da mesma família de 15.5.27 para 15.5.28, corrigindo GHSA-2464-fhr4-w9xw e GHSA-p3m5-59mp-jv5r sem mudança comercial ou migração.
- Preservar Sharp 0.35.5 e demais versões. Auditoria de produção passou com zero vulnerabilidades; a completa mantém cinco high na cadeia ESLint/braces de desenvolvimento, sem downgrade incompatível ou `audit fix --force`.
- Fontes, validações locais e limites da publicação em [95-correcao-next-15-seguranca.md](95-correcao-next-15-seguranca.md).

## 2026-10-22 — Navegação lateral e continuidade de ofertas

- Categorias laterais e subcategorias, ordenação explícita e paginação numérica no catálogo público, preservando filtros nas URLs e a relação neutra de medicamentos de receita por assunto.
- Por autorização expressa do lojista, ausência de atualização deixa de bloquear a compra somente pelo vencimento da observação. As datas reais são preservadas; oferta atual é prioritária e a anterior elegível pode sustentar a compra. Indisponibilidade confirmada, identidade, tributação, teto, restrições de receita e estoque físico continuam protegidos.
- A mesma regra comercial é aplicada antes da reserva e do pagamento, com regressões sintéticas e revisão independente. Contrato, responsabilidade por custo de reposição e evidências em [94](94-catalogo-lateral-e-continuidade.md).

## 2026-10-21 — Cards compactos e altura uniforme

- Removidas as reservas vazias acumuladas de Pix/cashback. `% OFF` à esquerda e Pix à direita da foto; cashback em etiqueta na base da foto.
- Preço e metadados mantêm faixas/linhas estáveis com ou sem benefícios, sem alterar cálculos, valores do carrinho ou restrições. Texto auxiliar encurtado, preservando a condição de uma unidade.
- Regressões incluem telas de 320/390/1024/1280 px, valores maiores e itens sem Pix/assistidos. Contrato e limitações de conferência em `86-precos-e-desconto-real-nos-cards.md`.

## 2026-10-20 — Busca por assuntos e termos populares

- Mapa revisado de relações de busca por sintomas/condições, usando ingredientes completos, termos explícitos e nomes; sem IA externa ou inferência a partir de advertências.
- Mesmo serviço paginado para autocomplete e resultados; condições específicas, dose e SKU preservados. Rx por assunto usa relação neutra, sem imagens ou promoções; busca literal mantém apresentação autorizada.
- Não muda catálogo, estoque, preço, receita ou compra. Fontes, precisão e limite regulatório em `93-busca-por-assuntos.md`.

## 2026-10-20 — Crédito opcional por falta na distribuidora

- ADMIN pode propor crédito para unidades indisponíveis de pedido pago, mantendo ao menos uma unidade entregável. O cliente escolhe aceitar crédito ou solicitar reembolso. Nenhum crédito é imposto ou emitido automaticamente.
- Conta e livro separados do cashback/WimiCoins. Apenas dinheiro líquido gera crédito novo; descontos utilizados voltam à origem. Snapshots originais preservados, quantidades para entrega explícitas e reserva do distribuidor liberada parcialmente. Acumuladores evitam devolução dupla em cancelamento posterior.
- Idempotência, locks, consentimento, titularidade e conciliação de reembolso protegem os saldos. Reembolso parcial sem vínculo exige conferência; estorno pelo gateway permanece atendimento humano. Não foram alterados frete grátis, mínimos regionais ou campanhas de cashback.
- Contrato, migração, testes PostgreSQL sintéticos, revisão independente e limites operacionais em [92](92-creditos-por-itens-faltantes.md).

## 2026-10-20 — Introdução curta no catálogo

- Título geral reduzido para “Produtos” e textos visíveis do catálogo/grupos limitados a uma frase curta; Dermo recebe introdução específica de cuidados com a pele.
- Descrição de SEO, filtros e navegação preservados. Detalhes em [10](10-layout-e-experiencia.md).

## 2026-10-20 — Cards uniformes e condições de entrega visíveis

- Padronizadas áreas de imagem, preço, cashback e ações no componente compartilhado, com alinhamento conferido em telas pequenas e desktop. Preservados preços reais, Pix, carrinho e quantidade.
- Selo de frete para itens disponíveis à compra online, inclusive genéricos/similares e distribuidor, com mínimo da constante do checkout e consulta por CEP visíveis. Sem mudança da política de gratuidade, elegibilidade logística ou cotação.
- A extensão de cashback de 1% para medicamentos permanece pendente de enquadramento técnico/jurídico da campanha e da publicidade, diante da RDC 96/2008, art. 10, e RDC 44/2009, art. 54. Nenhum benefício foi anunciado sem crédito efetivo nem foram alterados saldos, percentuais, pedidos ou regras existentes. Escopo, fontes e testes em [86](86-precos-e-desconto-real-nos-cards.md).

## 2026-10-20 — Arraste das marcas e identidades conferidas

- Adicionado arraste com mouse sobre os cartões/logos, preservando toque nativo, rolagem vertical, clique, teclado, setas e movimento reduzido. Gestos não abrem o catálogo acidentalmente.
- Faixa deixa de promover nomes comerciais de medicamentos; mantém laboratórios reconhecidos e marcas não medicinais dinâmicas. Classificação medicinal é avaliada antes da deduplicação, sem alterar produtos ou filtros diretos do catálogo.
- Incluídos 17 logos oficiais locais, com fallback nominal para originais não localizados/acessíveis. Fontes, limites do modelo e validação em [82](82-marcas-do-catalogo.md).

## 2026-10-20 — Comparação de custo completo e aceitação da carga

- Simulador ADMIN consulta todo o catálogo do Melhor Envio e compara custos internos da rota: etiqueta, viagem rateada, coleta, seguro externo, reserva interna de retornos e adicionais. Desconhecido não vira zero; mudança de rota exige revisão dos valores.
- Características da carga restringem serviços no simulador e no servidor público. Medicamentos mantêm PAC/SEDEX; classificação estruturada também impõe a regra. Revisão manual não supera proibição.
- Sem ativação automática de transportadoras ou alteração da cobrança pública, frete grátis e benefícios. Contrato, fontes e pendências em [91](91-comparacao-transportadoras-custos.md).

## 2026-10-20 — Inclusão exclusiva de 72 apresentações de medicamentos

- Publicados 72 novos EANs de atorvastatina, rosuvastatina, omeprazol, pantoprazol, valsartana e carvedilol, incluindo similares conferidos: 488 → 560 ativos. ANB/Profarma, custo final com ST observado e percentuais individuais de 50% ou 10%, dentro do PMC.
- Receita comum, ilustrações institucionais por classe e logística estimada desabilitada preservadas. Inclusão em 50 + 22 sob lock, backup, QA, dry-run e auditoria, com proteção dos registros antigos e dados comerciais.
- Carteira acima de 500 ainda depende das próximas fontes e consultas. Provas, ocorrências reconciliadas, testes e limites em [90](90-lote-medicamentos-72-2026-10-20.md); capturas e custos privados permanecem fora do Git.

## 2026-10-20 — Consolidação e conferência dos pacotes de frete

- Substituído `volumes` por `products` com quantidade no cálculo público do Melhor Envio; removida a imposição de uma remessa por unidade. Preservados limite operacional, permissões e perfis embalados, incluindo as estimativas autorizadas.
- Pacotes por serviço conferidos contra as unidades/pesos/dimensões/seguro enviados, assinados e preservados no snapshot do pedido. Estratégia versionada no fingerprint invalida cotações antigas; o ADMIN vê a previsão de embalagem e sua origem estimada.
- O lojista autorizou médias/referências por não dispor de medições físicas. Revisada somente a estimativa operacional do Dove com ficha da apresentação exata e margens identificadas; demais perfis e regras comerciais preservados. Empacotamento inconsistente recebe uma única nova cotação com envelope maior; planos fisicamente impossíveis não viram ofertas. Contrato, fontes e validação em [89](89-consolidacao-embalagens.md).

## 2026-10-20 — Fundo suave e acabamento da faixa de categorias

- Reutilizada fotografia institucional ilustrativa em baixa opacidade, com sobreposição clara e CSS isolado no componente de atalhos.
- Preservados seis destinos internos, ordem, setas, acessibilidade e movimento reduzido; círculos ganham contorno e indicação visual de acesso.
- Nenhuma alteração de regra comercial, frete ou pagamento. Decisão e validação em [88](88-faixa-categorias-visual.md).
- Publicado em `4ac0e64`: build Linux, lint/TypeScript, três testes focados e 420 de segurança aprovados; home conferida em desktop/celular com imagem carregada, navegação preservada e app saudável.

## 2026-10-20 — Catálogo por famílias e apresentação total

- Publicadas 54 apresentações de enalapril, sinvastatina e atenolol, incluindo associações, com 77 ofertas elegíveis ANB/Profarma. Catálogo de 434 para 488 ativos; estoque físico, registros antigos e dados comerciais anteriores preservados.
- Dois EANs foram excluídos antes da aplicação por conflito de dose/quantidade entre portais e a linha CMED selecionada. Conferência exige composição, forma e total de unidades, inclusive múltiplos blísteres; EAN/registro isolados não resolvem contradição.
- Receita comum e ilustrações institucionais por classe preservadas; nenhuma foto nova, transportadora ou rotina de coleta habilitada. Fontes, validações, limites e pendências em [87](87-lote-enalapril-sinvastatina-atenolol-2026-10-20.md).

## 2026-10-20 — Comparação verdadeira de preços nos cards

- Referências vêm do preço normal/promocional cadastrado, sem inverter o acréscimo de fornecedor ou fabricar preço anterior. Cards compráveis destacam o Pix real de 3%, com preço sem Pix e condição para uma unidade.
- Carrinho conserva a base antes do Pix; checkout aplica a redução uma única vez no subtotal. Itens assistidos/indisponíveis mantêm seus fluxos. Contrato, limites de arredondamento e validação em [86](86-precos-e-desconto-real-nos-cards.md).
- Publicado no app em `61a90e3`, com build Linux/lint/TypeScript aprovados, 420 testes de segurança e conferência real dos sabonetes NIVEA em desktop e celular. Auditoria de produção sem vulnerabilidades; cinco alertas altos de desenvolvimento permanecem registrados no documento 86.

## 2026-10-20 — Pagamentos e consultas no rodapé

- Bandeiras ativas do catálogo Mercado Pago aparecem automaticamente, sem corte em 12, com nome como alternativa para imagem indisponível e condições confirmadas no checkout. Cache por conta/revisão/ambiente protege a consulta; configuração financeira não foi alterada.
- Imagens públicas permitem somente as duas origens oficiais HTTPS do provedor; scripts/conexões/frames permanecem restritos ao checkout. Pix usa símbolo vetorial oficial do BC, com proporções e cor do manual.
- Anvisa recebe link ao portal oficial com ícone genérico; logomarca depende de autorização da agência. Perfil Reclame AQUI confirmado, sem RA1000/verificação; Ebit não localizado nesta consulta e reCAPTCHA não integrado, portanto sem esses selos.
- Mantidos logo oficial, 128 bolhas, tempos, filtro e movimento reduzido. Fontes, limites e validação em [84](84-rodape-pagamentos-e-consultas.md).

## 2026-10-19 — Desconto de 3% no Pix

- Lojista autorizou 3% no Pix de novos pedidos, após cashback/WimiCoins e sem desconto no frete. Cartão/dinheiro, gratuidade de frete e tentativas anteriores preservam seus valores e regras.
- Total do pedido e cobrança são congelados juntos; benefícios ganhos usam o líquido após Pix. Desconto é auditado e aparece no checkout/histórico/painel, com banner na home.
- Contrato, limites e verificações em [83](83-desconto-pix.md).

## 2026-10-19 — Navegação automática por marcas

- A home inclui todas as marcas dos produtos publicados, inclusive medicamentos, sem exigir foto ou estoque. Novas marcas aparecem na próxima abertura da página; ausência de logo usa o nome, sem impedir o link.
- Clique abre filtro completo e exclusivo por marca no catálogo, preservado na paginação. Logos oficiais são locais e não criam alegação de parceria ou promessa comercial.
- Contrato visual, fontes dos onze logos e validações em [82](82-marcas-do-catalogo.md).

## 2026-10-19 — Fotos conferidas como requisito e ofertas eGAM

- Novos itens de distribuidor sem receita entram em rascunho até revisão explícita de foto por ADMIN; higiene/perfumaria físicas também exigem foto ao publicar. A prova liga identidade, classificação, capa e galeria: editar preço não aprova imagem, e mudar apresentação invalida revisão anterior. Preços/estoques legados continuam editáveis.
- GAM passa a quarta fonte comercial autorizada; oito ofertas Nivea conferidas por EAN, custo Líquido + Imposto e observação real. Preservar percentuais ADMIN, ofertas anteriores, cotas e estoque físico; rotina pausada permanece assim.
- Lote de 44 fotos pendentes revisado, com correção factual do esfoliante Nivea para204g conforme rótulo oficial. Fontes e limites de atualidade, regressões e implantação em [81](81-fotos-publicas-e-gam.md).

## 2026-10-19 — Descrições públicas mais atraentes

- Substituir na apresentação pública os textos vazios e o template completo da importação por textos em parágrafos, contextualizados pelo tipo de produto. Descrições editoriais preservadas; cadastro e dados comerciais não são regravados.
- Compartilhamento e dados estruturados usam a mesma descrição da página. Alegações específicas exigem identidade e fonte oficial; o Dercos Collagen Repair 17 200 g tem conteúdo conferido na Vichy, sem transferir benefícios para outras apresentações.
- Contrato, limites e regressões em [80](80-descricoes-publicas-produtos.md).

## 2026-10-19 — ST observado para medicamentos Profarma

- Excluir da seleção ofertas de medicamentos Profarma sem cálculo de ST observado. MIP classificado também está coberto; fraldas/higiene/perfumaria não são bloqueadas por ausência desse campo. Comparação continua por EAN exato, custo final e percentual ADMIN.
- Campo unitário nullable, sem backfill ou coerção de traço para zero; uma nova observação sem cálculo limpa a comprovação anterior. O Preço final inclui ST e não recebe soma adicional. Nova conferência real com ST numérico permite voltar à disputa.
- Filtro compartilhado entre catálogo, importação, checkout/reserva, pré-pagamento e simulador; pedidos anteriores e estoque físico preservados. Contrato, regressões e implantação em [78](78-st-observado-profarma.md).

## 2026-10-19 — DM Paraná e expansão de dermocosméticos

- Titular autorizou DM como terceira fonte comercial, com consultas preferenciais ANB/Profarma e menor custo elegível por EAN. Enum aditivo, importador de até três ofertas e painéis reutilizam as regras de validade, markup, estoque físico separado e auditoria.
- Acréscimo de 20% confirmado também para outras marcas de dermocosméticos. Propostas e fotos têm revisão própria; divergências de apresentação/unidade não são resolvidas por aproximação.
- Não foi ativado coletor na VPS nem retomada a rotina pausada. Situação da publicação, evidências e limites em [77](77-expansao-dermocosmeticos-e-dm.md).
- Entrega: código `2d13975` publicado com migração aditiva, 304 novos produtos/313 ofertas e 260 fotos auditadas; total 377. QA sintético, preservação por hashes e leitura pública passaram. Vinte e quatro apresentações divergentes ficaram fora, 44 fotos e revisão logística permanecem pendentes. Não houve compra, pedido, cobrança ou mensagem.

## 2026-10-19 — Escopo do app Android e iOS

- Titular confirmou app da farmácia nas lojas Google Play e App Store, com os mesmos produtos e funções do site. Dados e regras devem ter uma fonte única; paridade de telas/recursos exige manutenção e distribuição coordenadas.
- Levantadas lacunas de APIs, sessão móvel, carrinho entre dispositivos, exclusão de conta, pagamento e receitas. React Native/Expo é proposta técnica, sem dependências instaladas ou alteração da arquitetura em execução. TWA permanece alternativa Android e não entrega iOS.
- Play Console observada com conta pessoal, sem primeiro app e com telefone de contato pendente; o titular informou possuir somente conta Google. Nenhum cadastro, documento, contrato, pagamento ou submissão foi realizado. Plano e fontes oficiais em [76](76-app-android-ios.md).

## 2026-10-19 — Catálogo compacto, vitrines com foto e demanda de distribuidor

- Decisão: separar visualmente origens, permitir edição explícita de até 50 produtos com revisão e transação atômica, e montar coleções diárias somente com fotografias públicas válidas e classificação adequada.
- Decisão comercial do titular: aceitar pagamento de novos pedidos de distribuidor acima da quantidade observada. A política é persistida por item; pedidos antigos mantêm cotas, e estoque físico, validade, custos, tetos e receita permanecem protegidos.
- Impacto: API de lote, painel, homepage/categorias, login, carrinho/checkout e migração aditiva de `OrderItem`. Guarda técnica finita e limitação de volumes nacionais documentadas em [75](75-catalogo-vitrines-e-compra-distribuidor.md).

## 2026-10-19 - Avisos de disponibilidade por produto

- Produtos publicados indisponíveis permanecem visíveis. Cliente autenticado escolhe WhatsApp/e-mail e autoriza um aviso por até 30 dias; não há inscrição automática nem reserva. Disponibilidade reutiliza as ofertas/cotas e o estoque físico existentes, sem modificar dados comerciais.
- Persistência separada, limite por cliente serializado, cancelamento próprio, expiração e remoção dos snapshots de contato. Fila restrita a ADMIN/MANAGER; contato manual por canal com controle de versão e nova validação. Links apenas preparam mensagens; nenhuma entrega automática foi ativada ou simulada como enviada. Contrato em [74](74-avisos-de-disponibilidade.md).
- Publicado após corrigir consulta Prisma detectada no banco isolado: 794 testes gerais, 368 de segurança, build, auditoria produtiva sem alertas, revisão independente e QA PostgreSQL passaram. Migração aditiva, app saudável e hashes dos dados comerciais preservados. Contato automático permanece pendente; avisos atuais são operados pela equipe.

## 2026-10-19 - Continuação comercial por famílias e Dove

- Vinte e três novas apresentações publicadas após conferir 29 EANs nas duas distribuidoras: 17 genéricos, dois similares, dois referência e dois Dove; menor oferta elegível, percentuais individuais e tetos preservados. Classe referência Aldactone comprovada pela Anvisa, sem inferir a partir de Novo. Detalhes em [73](73-lote-familias-e-dove-2026-10-19.md).
- Duas fotos oficiais de higiene conferidas e publicadas com fonte/hash/auditoria; Rx permanece institucional. Perfis logísticos são estimados/desabilitados. Origem física, 50 produtos/68 ofertas anteriores e dados comerciais/clientes preservados por hashes; 23 páginas/buscas/revisões de carrinho passaram, sem pedidos ou pagamentos de teste reais.
- Revisão independente, 33 regressões, 342 testes de segurança, auditoria de produção sem alertas, QA PostgreSQL isolado e dry-run produtivo antes da aplicação. Código da aplicação, dependências e infraestrutura sem mudanças. Auditoria completa conserva cinco high da cadeia de desenvolvimento.
- Automação existente ampliada aos 68 EANs, mantendo PAUSED encontrado na configuração e a grade 8h/12h/17h; não reativada, sem coletor na VPS ou renovação de validade sem observação.

## 2026-10-19 - Primeiro lote comercial por família de anlodipino

- Retomadas consultas normais ANB/Profarma por família, com confirmação dos EANs ausentes na pesquisa de nome. Manifesto v1 revisado publicou 20 produtos e atualizou somente a oferta do Geolab existente, sem duplicar apresentações. Nove genéricos e doze similares na rodada; três diferenças de laboratório e um indisponível ficaram fora. Detalhes em [72](72-lote-anlodipino-2026-10-19.md).
- Menor custo final elegível com ST: 17 ANB e quatro Profarma. Percentuais escolhidos por apresentação, sem nova regra global de faixa ou reclassificação de similares como éticos. Ilustrações Rx existentes e rascunhos logísticos sem transporte aprovado.
- Revisão independente, 342 testes de segurança, regressões do gerador, PostgreSQL isolado, dry-run/aplicação auditada e 21 verificações públicas por EAN/página/carrinho. Hashes preservam produtos anteriores, ofertas alheias, cotas/reservas/consumo, pedidos e clientes. Corrigido apenas auxiliar privado de QA para manter o guard de fetch no processo executor; nenhuma mudança no código da aplicação ou dependências.
- Rotina existente atualizada para 45 EANs publicados, mantendo horários, silêncio sem novidade e limites de acesso/validade/cota. Relatórios, preços negociados, manifestos e backups permanecem fora do Git; nenhum pedido de fornecedor, pagamento ou etiqueta foi transmitido.

## 2026-10-19 - Inventário integral e receita de antimicrobianos

- Separados todos os 6.290 códigos internos FAR, com nomes/detalhes intactos, totais reconciliados, dois registros avulsos fora das 6.288 prioridades e 65 códigos Nivea/Dove. Índices oficiais acrescentam 379 páginas de produto para conferência; nenhum EAN/estoque/custo é confirmado só por nome ou URL.
- `ANTIMICROBIAL` é uma classificação ADMIN explícita e distinta de receita comum/controlados. Checkout exige anexo privado vinculado ao cliente, carrinho e envio, com armazenamento cifrado e acesso ADMIN ativo. Arquivo é pré-análise; a conferência humana, retenção do original e escrituração permanecem obrigatórias. ORDINARY continua sem upload e com conferência antes da dispensação.
- CONTROLLED segue atendimento assistido: a RDC 812/2023 veda compra/venda pela internet, mesmo com arquivo enviado. Ilustrações identificam o tipo explícito sem mudar classe ou permissão. Fontes e limites em [71](71-inventario-completo-e-receitas.md).
- Orientação posterior do titular: comparar famílias em lote, reunindo dosagens/formas/apresentações, e validar por EAN sem repetir uma investigação manual para cada linha. Separados 4.912 grupos candidatos de produtos; a fonte CMED de anlodipino forneceu 144 GTINs simples e 179 de associações, sem criar estoque ou preço. Upload implantado com 764 testes gerais, 342 de segurança, integração PostgreSQL sintética e conferência pública; CSP específica foi corrigida após o teste real. Dados comerciais anteriores preservados.

## 2026-10-18 - Expansão por relatório e ilustrações Rx

- Relatório FAR usado para priorização local, sem converter códigos internos em EAN. Novos lotes exigem conferência exata na ANB/Profarma, evidência, classificação e percentual; contratos em [70](70-expansao-catalogo-relatorio.md).
- Acréscimos escolhidos por apresentação: Dove/Nivea 20%, genéricos/similares baratos 50%, segmento ético 10%; caros são avaliados individualmente. Refresh preserva percentual manual, estoque físico, cotas, reservas e histórico.
- Direção visual anterior substituída pelo titular: Rx público usa ilustração institucional por classe, sem apagar fotos originais do banco/painel. MIP/perfumaria continuam com fotos verificadas. Frete estimado permanece rascunho sem aprovação automática.

## 2026-10-18 - Organização do catálogo e preço rápido

- Classificação administrativa separa tipo, classe do medicamento, segmento ético e MIP/OTC; não altera a política de receita. Sete EANs genéricos e três similares do piloto conferidos na fonte oficial.
- Acréscimo por produto de distribuidor, padrão 60%, compartilhado por catálogo, frete, checkout, reservas, pagamento e rotina. Ajustes exclusivos ADMIN, auditados e protegidos por versão/locks; percentual bloqueado com pedidos em aberto. Custos/percentuais não aparecem no DTO público ou de MANAGER.
- Pesquisa comprova rotas Profarma API/FTP/EDI e SantaCruz ERP por arquivos, com habilitação comercial ainda pendente; ANB sem contrato público localizado. Nenhum conector ativado. Contrato, fontes e limites em [69](69-catalogo-classificacao-e-integracoes.md).

## 2026-10-18 - Títulos compactos de losartana

- Nome visível mais curto, mantendo marca/referência, dose e quantidade. Sal e revestimento permanecem na descrição e no cadastro técnico.
- Helper de apresentação limitado às apresentações simples conhecidas; não altera identidade, EAN, URL, indexação, importação ou pedido. Associações e liberação especial não são simplificadas. Contrato em `68-busca-e-galeria.md`.

## 2026-10-18 - Fotos públicas conferidas e prazo fora da vitrine

- Após explicação do art. 54 da RDC 44/2009, o titular determinou publicar fotos reais conferidas das losartanas. Registrada a ressalva regulatória, sem alegar conformidade sanitária. Capas públicas passam pelos DTOs; URLs e originais internos continuam privados.
- Publicação em cópias leves da biblioteca, por EAN/apresentação e com fonte/hash/auditoria; sem substituição por embalagem aproximada e sem alterar ofertas, preços, cotas, estoque físico ou classificação de receita. Caixa institucional somente como fallback.
- Removido `1 dia de preparação` de cards e detalhe, preservando calendário e informação de prazo no carrinho e checkout. Contrato e verificação em `68-busca-e-galeria.md`.

## 2026-10-18 - Ilustração de medicamento sem foto

- Arte institucional fornecida pelo titular, com fundo transparente e sem quantidade, usada somente no fallback visual de medicamentos. Correção do titular preserva os outros textos e elementos da arte original.
- Componente compartilhado e classificação visual por categoria/flags existentes; fotos reais, dados de catálogo, classificação de receita e privacidade Rx preservados. Não preencher `imageUrl` de produtos com uma ilustração.
- Busca, vitrine, detalhe e fluxos de compra reaproveitam a mesma arte leve, conforme `68-busca-e-galeria.md`.

## 2026-10-18 - Resultados de busca e galeria de produtos

- Enter passa a abrir uma página paginada com nome, marca, dose e componentes relacionados. Associações ficam identificadas; doses decimais e identidades completas impedem correlações indevidas. A lateral usa vendas concluídas/pagas reais ou assume o título de relevantes.
- Removidos apenas selos visuais de receita, sem alterar classificação, compra ou dispensação. Galeria admite até seis fotos públicas validadas da biblioteca, preserva capa e bloqueia vazamento de fotos privadas Rx em arrays/metadados.
- Migração aditiva `20261018120000_product_gallery`; preços, cotas e estoque não mudam. Contrato e verificação em `68-busca-e-galeria.md`.

## 2026-10-18 - Base operacional estimada para logística

- O titular informou não possuir balança/medidas e autorizou uma base calculada. Implementada estimativa limitada por família/apresentação, com folga de embalagem, marcação `estimated` e bloqueio de casos perigosos/ambíguos. Dosagem não é peso.
- Cadastro preenche somente vazios e mantém o transporte desabilitado até revisão. CLI restrita às dez losartanas grava rascunhos ausentes com ADMIN ativo, lock/releitura e auditoria, sem tocar estoque/preço/cotas.
- Cotações diagnósticas reais confirmaram variação por peso. Restrições oficiais de medicamento impedem tratar cálculo como aceitação da carga. Regras, bases, limites e valores observados em [68](68-rotina-piloto-fornecedores.md).

## 2026-10-18 - Atualizar o piloto e proteger fotos de medicamentos

- Decisão: manter somente ANB e Profarma como fontes comerciais; GAM/SantaCruz são referências de identificação e fotos. GAM entra no simulador manual, sem nova migração ou oferta persistente. A API e o importador recusam fontes fora do piloto autorizado.
- Atualização recorrente mantém cotas existentes, reservas e unidades consumidas, rejeita observações inválidas e pode indisponibilizar item existente. Estoque próprio não é convertido nem duplicado. Dados negociados permanecem fora do Git.
- Fotos Rx do distribuidor ficam em volume privado, WebP até 352 px/100 KB e acesso ADMIN/MANAGER sem cache público. Produto não pode mover a URL privada para uma origem pública; Miauby, prompt externo e avaliações removem essas URLs. Revisão independente encontrou dois problemas, corrigidos e novamente aprovados, com regressões.
- Rotina solicitada e criada no Codex para 8h, 12h e 17h de Brasília. Depende de PC/navegador conectados; não equivale a um coletor autônomo na VPS. Falha de consulta não renova validade. Operação, fotos conferidas e pendências em [68](68-rotina-piloto-fornecedores.md).

## 2026-10-17 - Simplificar as descrições públicas do piloto

- Retirar CMED, EAN/MS e fontes do texto corrido das quatro losartanas, mantendo marca, dosagem, apresentação e informação de entrega/retirada. A exigência de receita permanece no aviso próprio, sem repetição na descrição.
- Editar pelo painel autenticado, sem alterar preços, estoque físico, cotas, validade ou classificação. Manter os controles regulatórios internos; não adicionar promessas clínicas ou dispensa sem receita. Contrato em [67](67-catalogo-distribuidores-piloto.md).

## 2026-10-17 - Piloto comercial por EAN com estoque físico separado

- A pedido do lojista, permitir origem de distribuidor em Produtos/Catálogo e compra pública normal com um dia de preparação, sem a expressão “sob encomenda”. Preservar recebimento terça–sábado, calendário no checkout e estoque físico manual independente.
- Escolher a oferta válida mais barata do mesmo GTIN e aplicar acréscimo de 60% sobre o custo. Exigir teto CMED conferido para receita; não conceder desconto Pix adicional nem alterar frete. Cota interna conservadora não é reserva do fornecedor.
- Persistir ofertas e reservas, revalidar preço/identidade antes da cobrança e liquidar cancelamentos/benefícios sem alterar estoque próprio. Manter fotos Rx fora da renderização pública e aquisição humana. Migração aditiva e contrato em [67](67-catalogo-distribuidores-piloto.md); conectores automáticos continuam pendentes.

## 2026-10-17 - Comparar fornecedores e simular contribuição antes de publicar estoque externo

- Criar painel exclusivo ADMIN sem gravação comercial, com ofertas manuais por EAN exato, validade e saldo conferidos. Saldo desconhecido e embalagem não comprovam disponibilidade para compra.
- Calcular contribuição com centavos inteiros, custos ausentes explícitos, Pix, frete e benefícios atuais, sem ativar descontos, preço, estoque ou catálogo automaticamente.
- Não inferir PMC legal do portal: exigir conferência da apresentação e UF/alíquota. Fontes automatizadas, calendário, reserva, fotos e política comercial ficam para etapas posteriores comprovadas. Contrato em [66](66-fornecedores-e-viabilidade.md).

## 2026-10-14 - Registrar cidade de postagem para a operação

- Configurar local por serviço no frete ADMIN e resolver o deslocamento no servidor durante a compra. Persistir no JSON do pedido, sem migração ou alteração de preço/pagamento.
- Destacar Ivaté, Umuarama ou outra cidade no topo do pedido para ADMIN e STAFF, com filtro operacional. Manter o destinatário separado e sinalizar local desconhecido nos pedidos antigos.
- Validar o fluxo com aplicação, login e PostgreSQL reais isolados, dados sintéticos e fixtures somente nas consultas externas, sem cobrança nem mensagem. Contrato e limites em [65](65-postagem-operacao-e-qa.md).

## 2026-10-14 - Corrigir benefícios, carrinho e descoberta de transportadoras

- Preservar centavos líquidos por unidade no ganho de cashback/WimiCoins, sem alterar snapshots anteriores ou bônus de avaliação. Compartilhar a identidade do carrinho entre criação e PAID, preservando cestas alteradas.
- Classificar medicamentos pelos marcadores canônicos, sem depender somente da categoria. Distinguir erros técnicos de ausência de cobertura e aceitar a resposta de serviço único do Melhor Envio.
- Consultar catálogo dinâmico de serviços no simulador ADMIN e enviá-lo explicitamente ao cálculo; omitir a lista ocultava empresas na conta atual. Não confundir cotação com coleta/postagem ou liberar cargas sem aceitação.
- Vincular a página pública confirmada do Reclame AQUI como perfil institucional. RA1000, RA Verificada e Ebit continuam dependentes de concessão/homologação; nenhum selo externo foi criado.
- Registros, regressões, validações e limites em [64](64-correcao-cashback-checkout-e-transportadoras.md).

## 2026-10-13 - Club gratuito e WimiCoins acumuláveis com cashback

- Ativar adesão explícita gratuita, listagem ADMIN dos participantes e elegibilidade/percentual por produto. Produtos ficam desabilitados até escolha de ADMIN; percentual inicial de 2% editável.
- Manter carteira e lançamentos próprios de pontos inteiros, com conversão 100 WimiCoins = R$ 1. Descontos são combinados na mesma transação do pedido, com rateio exato e ganhos sobre o preço líquido; WimiCoins não participam em itens com receita ou Farmácia Popular.
- Liberar ganhos somente em COMPLETED + PAID; devolver reservas e estornar ganhos em cancelamento/reembolso, com bloqueios e chaves únicas. Nenhuma transferência, saque ou campanha adicional.
- Permitir ao usuário administrativo aderir pela própria identidade vinculada User–Customer, sem mesclar e-mails. Revalidar esse vínculo na sessão. Crédito privado e único de 500 pontos somente para o titular que o solicitou.
- Banner com logo oficial e coroa separada, saldo acima do cashback, conta/checkout e painel de participantes. Contrato e evidências em [63](63-club-wimicoins.md).

## 2026-10-13 - Catálogo administrativo focado na operação

- Retirar a orientação sobre Google, sitemap e Shopping da abertura do catálogo, conforme pedido do lojista para ocultar processos automáticos.
- Compactar indicadores, filtros e linhas de produtos para aproximar a lista das ações principais. Manter diagnósticos e divulgação sob demanda por produto.
- Mudança de apresentação: nenhuma alteração em APIs, persistência, permissões ou regras comerciais; automação de descoberta e fontes públicas preservadas.

## 2026-10-12 - Atalhos circulares e simplificação da abertura da home

- Decisão: substituir o bloco visual de título/descrição por oito atalhos circulares de compras e serviços, conforme referência enviada pelo lojista. Manter um H1 acessível curto e os dados institucionais de SEO.
- Motivo: facilitar a navegação por assunto e deixar as campanhas mais próximas dos atalhos, preservando a identidade Wimifarma.
- Impacto: componente `HomeShortcuts`, mapeamento de categorias reais, consulta pública de categorias na home, fixture de QA, testes e documentação de layout/presença.
- Cuidados: não inventar slugs, cupons, descontos ou disponibilidade. Categorias ausentes seguem para consulta humana pelo WhatsApp. Foco, teclado, toque, setas e movimento reduzido são preservados. Header, bolhas do rodapé, estoque, checkout e pagamentos não integram a alteração.

## 2026-10-11 — Previsão de retirada em 30 minutos de atendimento

- Informar o prazo ao selecionar retirada no checkout, considerando o horário aprovado de 7h30 às 18h30 todos os dias e o fuso de Ivaté. Mostrar próxima abertura e espera total fora do atendimento; perto do fechamento, continuar o tempo restante no dia seguinte.
- Usar referência de tempo do servidor, atualizada no navegador, preservando confirmação humana de pedido pronto, pagamentos e estados operacionais. Contrato em [32](32-checkout-e-confianca.md).

## 2026-10-11 — Identidade da Wimifarma para descoberta no Google

- Reforçar marca, município e endereço reais nos metadados e em um H1 fixo visível na home; títulos rotativos das campanhas passam a H2 com os estilos preservados.
- Enriquecer os nós institucionais `Pharmacy` e `WebSite`, mantendo uma identidade única, sem inventar horários ou avaliações agregadas. Usar a logo oficial completa em WebP.
- Search Console confirmou a home indexada, com último rastreamento em 06/10. Isso não garante posição nem permite controlar a correção `wimifarma` para `imifarma`; contrato e validação em [62](62-presenca-google-e-identidade.md).

## 2026-10-11 — Avaliações sem indicação do canal

- Por pedido do lojista, retirar `Recebida pelo WhatsApp` dos cartões, a menção ao canal no subtítulo e no nome acessível do carrossel. Preservar os 15 relatos, nomes abreviados e cinco estrelas.
- Manter a origem registrada internamente, sem atribuir compra verificada aos relatos externos nem alterar produtos, cashback ou dados persistentes. Detalhes em [61](61-avaliacoes-e-rodape.md).

## 2026-10-11 — Relatos reais recebidos pelo WhatsApp

- Publicar os 15 relatos da imagem enviada pelo lojista, que os identificou como avaliações reais do WhatsApp. Preservar comentários e cinco estrelas informadas, com nomes públicos abreviados e iniciais.
- Reutilizar o carrossel da home, identificando cada relato como `Recebida pelo WhatsApp`. Somente avaliações vinculadas a pedidos do sistema recebem `Compra verificada`, link do produto e indicação de incentivo.
- Manter relatos externos em conteúdo editorial, sem criar clientes, pedidos ou avaliações no banco, alterar médias de produtos ou conceder cashback. Contrato e validação em [61](61-avaliacoes-e-rodape.md).

## 2026-10-11 — Remoção dos exemplos de avaliações

- Por pedido do lojista, retirar os três cartões ilustrativos da home e restaurar o convite para avaliar compras reais.
- Preservar o carrossel das avaliações do sistema, iniciais, notas, indicação de incentivo e selo vinculado à compra confirmada. Nenhuma alteração em banco, API ou cashback.
- Preservar selos e as 128 bolhas do rodapé. A atualização do proxy e a restrição dos painéis continuam adiadas. Evidências no documento [61](61-avaliacoes-e-rodape.md).

## 2026-10-11 — Exemplos públicos de avaliações

- Atender ao pedido de publicar exemplos agora com três cartões claramente identificados como demonstração, nomes `Exemplo A./B./C.` e iniciais. Não atribuir estrelas, compra verificada ou identidade de cliente aos exemplos.
- Mostrar exemplos apenas enquanto a consulta de avaliações reais estiver vazia. Quando houver avaliações reais publicadas, somente elas ocupam a seção; dados ilustrativos não entram no banco, nas médias, nos produtos nem no cashback.
- Preservar rodapé, bolhas, autenticação e regras comerciais. Contrato e evidências no documento [61](61-avaliacoes-e-rodape.md).

## 2026-10-11 — Avaliações com iniciais e rodapé claro

- Usar iniciais do nome público nas avaliações verificadas, sem fotos ou retratos fictícios. Preservar notas, comentários, indicação de incentivo e elegibilidade existente.
- Organizar o rodapé em faixa vermelha de benefícios, corpo claro e selos gráficos próprios de HTTPS, identificação da loja e privacidade. Preservar exatamente as 128 bolhas, o filtro e a identidade oficial.
- Não copiar certificações, bandeiras, horários ou dados comerciais da referência. Nenhuma mudança de banco, API ou pagamento; proxy e painéis continuam adiados. Contrato e evidências em [61-avaliacoes-e-rodape.md](61-avaliacoes-e-rodape.md).

## 2026-10-10 — Permissões, auditoria, requisições e revisão financeira

- Revalidar o criador ADMIN sob o bloqueio usado pela revogação e tornar mutação/auditoria de usuário e cofre atômicas. Limitar corpos HTTP enquanto são recebidos, incluindo login e multipart inteiro.
- Acrescentar limites locais de consumo/concorrência da Miauby sem remover o rate limit já existente no middleware. Registrar expressamente que cotas por processo não substituem orçamento do provedor.
- Recuperar somente revisões técnicas Asaas por resposta canônica vinculada; manter revisão de estorno/financeira e reservas diante de respostas incertas. Não repetir cobrança para resolver consulta vazia.
- Testes sintéticos e revisão independente obrigatórios; nenhuma migration ou nova dependência. Titular adiou restrição dos painéis e atualização do proxy compartilhado. Evidências em [60-correcao-e-revisao-de-seguranca.md](60-correcao-e-revisao-de-seguranca.md).

## 2026-10-09 — Campanhas com pessoas e produtos por marca

- Atender à correção do lojista: menos texto, pessoas e apresentação dos produtos. Substituir o painel vermelho da revisão 58 por fotografia de campanha e um CTA; no celular, foto antes do texto.
- Dove, Rexona e NIVEA usam composições próprias e cenas distintas, inspiradas em referências oficiais verificadas. Preservar embalagens reais e logo completa; não anunciar parceria, preço ou alegação não confirmada.
- A primeira campanha agora abre `/catalogo`; cashback continua nas áreas próprias. Pausa, movimento reduzido, animação original do cabeçalho e 128 bolhas permanecem. Fontes, prompts, arquivos e evidências em [59-banners-pessoas-e-produtos.md](59-banners-pessoas-e-produtos.md).

## 2026-10-08 — Banners com identidade de varejo Wimifarma

- Reorganizar campanhas da home com painel vermelho, logo oficial completa e embalagens reais maiores. Aplicar a mesma assinatura às campanhas Dove, Rexona e NIVEA, preservando fotos e destinos existentes.
- Manter textos, regras de cashback, controles de pausa e movimento reduzido. Preservar integralmente animação original do cabeçalho e 128 bolhas do rodapé. Nenhuma regra comercial ou dependência nova.
- Referências, arquivos e evidências da revisão em [58-banners-varejo-wimifarma.md](58-banners-varejo-wimifarma.md).

## 2026-10-08 — Correções delimitadas após auditoria

- Vincular busca à consulta concluída, apresentar cashback selecionado sem aumento silencioso e compartilhar saldo entre apresentações do cabeçalho com isolamento por cliente. Preservar autorização no servidor e identidade visual.
- Padronizar bloqueios nas devoluções de estoque dos gateways e limitar JSON de frete durante leitura por bytes. Confirmar regressões com recursos sintéticos, sem cobrança, comunicação ou etiqueta real.
- Descobrir todos os testes na CI, incluindo UI e Miauby. Manter cinco high das ferramentas registrados: upstream ainda sem patch compatível. Contratos e evidências em [57-correcoes-da-auditoria.md](57-correcoes-da-auditoria.md).
- Não introduzir aprovação manual de compras nem fluxo Asaas novo. Consulta produtiva pontual encontrou zero estados Asaas `REVIEW`/`UNKNOWN`; a evolução de revisão técnica permanece separada.

## 2026-10-08 — Auditoria de backend, frontend e desempenho

- Registrar seis achados delimitados, distinguindo reprodução local, risco de concorrência e ocorrência produtiva não medida. Prioridade para revisão Asaas visível, busca e cashback; relatório em [56-auditoria-backend-frontend.md](56-auditoria-backend-frontend.md).
- Executar todos os 82 arquivos de testes: 492 de 493 passaram, com asserção antiga de receita no carrinho Miauby. Documentar lacuna da CI e cinco alertas high nas ferramentas; produção sem alertas npm nesta consulta.
- Preservar código executável e regras comerciais durante a análise. Inspeção pública não criou cobranças, pedidos ou etiquetas. Métricas de resposta e recursos são amostras, sem garantia de desempenho sob carga.

## 2026-10-08 — Diagnóstico de roteamento e preparação Google Play

- Distinguir Asaas habilitado inválido de provedor desativado. Conservar o gateway válido para novos pedidos e registrar categoria fixa na auditoria, sem erro bruto ou segredo. Preservar vínculo de pagamentos existentes e isolamento de teste ADMIN. Regressões e contrato no documento 54.
- Consultar todos os serviços disponíveis em duas rotas reais sem comprar etiquetas; retornaram PAC e SEDEX. Não consolidar volumes a partir de medidas estimadas sem comprovar encaixe/proteção. Frenet gratuito permanece candidato, sem integração criada.
- Registrar documentos e etapas da conta pessoal Play Console; o fluxo de identidade passou ao celular, ainda sem aprovação observada. Avaliar Organização e PWA/TWA antes de criar/publicar app. Guia no documento 55; nenhum documento pessoal enviado ou versionado.

## 2026-10-08 — Asaas comercial e tarifas vinculadas

- Adicionar integração Asaas produtiva separada, crédito hospedado 1x e Pix homologado por instrumento. Preservar Mercado Pago, Sandbox e obrigações de conferência farmacêutica.
- Persistir seleção de provedor antes do POST e reservar estoque transacionalmente. Resultado incerto não permite repetir criação Asaas nem trocar gateway. Webhook durável e consulta canônica produzem efeitos comerciais idempotentes.
- Comparar taxas somente para contas/modalidades confirmadas e atuais; tarifa desconhecida conserva o padrão anterior. Renovação de credencial da mesma wallet preserva histórico. Contrato e evidência em [53-asaas-clientes-e-roteamento.md](53-asaas-clientes-e-roteamento.md).

## 2026-10-08 - Mínimo de cartão Asaas comprovado no Sandbox

- O ensaio integrado de R$4,99 recebeu HTTP 400 `invalid_object` no log oficial, por valor inferior a R$5,00. Validar o mínimo de 500 centavos no adapter, serviço antes de persistir pedido e painel de homologação; manter Pix abaixo desse limite.
- Preservar a regra de nenhum segundo POST após resultado incerto. Encerramento operacional exige evidência da rejeição definitiva, referência exata e auditoria; não criar resolução automática genérica de `UNKNOWN`. Mercado Pago e preços do catálogo permanecem preservados. Evidências em [51-asaas-pagamentos-sandbox.md](51-asaas-pagamentos-sandbox.md).
- O ensaio seguinte revelou formatos reais adicionais: link Sandbox com prefixo exato `/000/` e ID de evento com sufixo `&` numérico. Aceitar somente esses formatos delimitados, com regressões de abuso; recuperar a sessão existente a partir do log, sem criar outra cobrança. O ID opaco do evento permanece integral para deduplicação.

## 2026-10-08 - Pedidos sintéticos Asaas e inbox durável

- Implementar homologação ADMIN separada do checkout comercial: pedido fictício sem cliente, estoque, cashback ou mensagens; Pix estático de duas horas e cartão hospedado 1x. Preservar Mercado Pago e tarifas Asaas produtivas.
- Persistir provedor, conta, instrumento e marca de envio antes do único POST financeiro. Resposta incerta não permite repetir cobrança nem trocar gateway; UUID recupera o mesmo ensaio. Vincular QR/sessão separadamente da cobrança canônica.
- Receber webhook autenticado em inbox único antes de responder 200; conciliar por API com valor/recurso/conta conferidos, fila justa e lease. Divergências permanentes ficam em revisão auditada. Nenhum callback ou payload isolado confirma compra; pagamento tardio não reativa pedido cancelado.
- Migração aditiva validada em schema sintético PostgreSQL 17, sem dados de clientes. Revisão independente e regressões financeiras/abuso obrigatórias antes de publicar. Contrato e limites em [51-asaas-pagamentos-sandbox.md](51-asaas-pagamentos-sandbox.md).

## 2026-10-08 - Patch de segurança Next.js 15.5.27

- Auditoria pré-publicação encontrou dois alertas moderate de cache SSG/ISR em Next.js até 15.5.26. Atualizar Next e ESLint Next para a versão oficial corrigida 15.5.27, fixada no manifesto/lock, sem trocar stack ou aplicar correções incompatíveis automaticamente.
- App Router permanece preservado; o alerta não comprova exploração desta aplicação. Auditar produção e desenvolvimento separadamente e não omitir os cinco high da cadeia de ferramentas. Fontes e validação em [42-revisao-de-seguranca.md](42-revisao-de-seguranca.md).

## 2026-10-08 - Asaas: tarifas conectadas e Sandbox separado

- A conexão de produção de tarifas foi salva em 07/10 e persistiu após recarregar. Snapshot padrão: R$3,48 em R$100/cartão 1x, R$96,52 líquidos, primeira parcela em 32 dias. A auditoria de 08/10 comprovou revisões automáticas com intervalo de seis horas; não pressupor execução apenas pela saúde do app.
- Chave temporária Sandbox autorizada pelo titular, sem saques e com expiração em 14/10 às 23:59, guardada cifrada no cofre independente. Nunca substituir `payment-fee-policy` de produção para realizar testes.
- Novo painel/API exclusivos de ADMIN validam a credencial selecionada por consulta GET ao host fixo Sandbox. Conferir metadata, prefixo, origem, corpo, limites e sanitizar erros; não devolver segredos ou gravar regras financeiras. Registrar a verificação na auditoria.
- Homologação no provedor criou QR Pix fictício de R$10, expiração de duas horas e uso único, e confirmou cartão fictício hospedado por tela/API. Não confundir criação de QR com recebimento, sessão com confirmação financeira ou tarifa Sandbox com custo produtivo. Nenhum pedido, cashback ou mensagem comercial foi criado.
- Revisão independente aprovou os nove testes de abuso/isolamento. Recebimento Pix exige outra conta Sandbox pagadora; webhooks, recusas, estornos e roteamento produtivo continuam pendentes. Checkout público Mercado Pago preservado. Contrato, fontes e evidências em [40-asaas-configuracao-e-homologacao.md](40-asaas-configuracao-e-homologacao.md).

## 2026-10-07 - Recuperação explícita de pagamento e carrinho

- Recuperar consulta do mesmo pagamento por GET após falha inicial; não recriar cobrança ou limpar referência automaticamente.
- Consultar preço/estoque atual por API pública de leitura limitada e apresentar proposta antes de alterar o carrinho. Invalidar propostas quando o estado mudar, inclusive no provedor do carrinho; preservar validação autoritativa no checkout.
- Exigir e-mail somente em pagamentos online, alinhando a interface ao contrato existente de dinheiro elegível.
- Titular criou a chave Asaas; colagem no cofre e homologação continuam pendentes. Reclame AQUI empresarial confirmado no plano gratuito; a pedido do titular, seu e-mail pessoal recebeu convite e teve o login confirmado. Após autorização expressa para administração exclusiva, o acesso da contabilidade foi desativado e a interface confirmou somente um administrador ativo. Diferenciar aprovação da descrição, confirmação do site, upload da logo e publicação do perfil. Nenhum código ou selo foi registrado como dado público.
- Código `ff9db6e` publicado: app healthy, zero reinícios, quatro rotas HTTP 200 e API de revisão validada com origem permitida/externa e ID sintético. Rebuild somente do app, sem migração. Asaas ainda não processa pagamentos.
- Regressões, revisão independente, limites e entrega em [50-recuperacao-de-compra-e-conexoes.md](50-recuperacao-de-compra-e-conexoes.md).

## 2026-10-07 - Bolhas preservadas, cadastro unificado e pagamento de receita comum

- Restaurar exatamente o efeito original de 128 bolhas e filtro SVG do rodapé. A determinação do lojista é permanente: próximas melhorias não retiram ou substituem essa animação. Regra registrada em `AGENTS.md`; informações empresariais e links úteis continuam no rodapé. Selos RA1000/Ebit não são copiados da referência Nissei nem apresentados sem aprovação.
- Cadastro reúne identificação, descrição/SEO e logística numa superfície, com um assistente central e atalhos, sem abas. Campos manuais, fontes e aprovação logística humana preservados. Contrato em [48-cadastro-unificado.md](48-cadastro-unificado.md).
- Corrigir pagamento Pix/cartão que rejeitava qualquer `requiresPrescription`, apesar de o pedido aceitar receita comum `ORDINARY`. Reutilizar a política `requiresPurchaseAssistance` em ambas as etapas. Preço, disponibilidade, estoque, reserva, lock e idempotência continuam verificados; controlados, receita não classificada e Farmácia Popular permanecem assistidos. Regressão sintética de R$7,98 reproduziu o erro antes do gateway e comprovou a correção.
- Refinar estimativas da IA para preservar dimensões inferiores a 1 cm, reconhecer creme dental sem conflito com creme e separar fraldas infantis/adultas por público explícito. Fontes, unidades, apresentação, materiais e margens conservadoras continuam obrigatórios; não transformar estimativa em medição.
- Produção conferida somente em leitura: quatro produtos ativos com perfis estimados já aprovados, caixa externa 20,8 × 20,8 × 21,6 cm; Cimegrip, KitKat e Losartana com 500 g, Dove com 800 g. Nenhum peso exato de fabricante foi inventado e nenhum produto foi alterado nessa conferência.
- Asaas liberou geração de chave API; etapa aberta para conclusão pelo titular, sem permissão de saques. Pesquisa oficial confirmou cartão hospedado/redirecionado para não coletar PAN/CVV e alternativa Pix estática por pedido com expiração de duas horas. Aguardar credenciais/homologação e tarifa efetiva antes de ativar; não contratar terceiro gateway sem vantagem demonstrada. Detalhes e fontes em [40-asaas-configuracao-e-homologacao.md](40-asaas-configuracao-e-homologacao.md).

## 2026-10-06 - Rodapé e confiança visual

- Reorganizar o rodapé com a identidade oficial, identificação empresarial, contato direto, navegação de compra, Pix/cartão e entrega por CEP. Usar HTTPS como informação de conexão, sem selo inventado ou garantia de invulnerabilidade.
- Publicar o link de mapa Google existente; Ebit, RA1000 e Reclame AQUI continuam condicionados à confirmação dos perfis/selos. Search Console não é certificação pública.
- Retirar apenas a decoração de 128 bolhas do rodapé, preservando a animação oficial no cabeçalho. Layout responsivo sem novo script cliente. Contrato e validações em [47-rodape-e-confianca-visual.md](47-rodape-e-confianca-visual.md).
- Publicado com rebuild somente do app; site/API de saúde HTTP 200, metatag Google preservada. Lint/typecheck/build e 92 testes de segurança passaram; auditoria de produção limpa. Chrome confirmou rodapé e logo carregada no desktop. Capturas e emulação mobile falharam na ferramenta; validação renderizada do celular permanece pendente, sem aprovação presumida.

## 2026-10-06 - Preparação dos cadastros gratuitos de reputação e presença

- Localizar e reivindicar o perfil Google existente da Wimifarma no endereço correto, evitando duplicata. Aceite e verificação continuam pendentes; não presumir propriedade a partir da ficha pública.
- Reclame AQUI localizou o CNPJ, mas exige validação pelo e-mail empresarial vinculado. A alternativa de biometria não encontrou responsáveis e ficou desabilitada. Preparar sem publicar página nem transmitir documento pessoal.
- Ebit anuncia adesão gratuita, porém os links de inscrição não apresentaram formulário funcional. Solicitação ao suporte preparada, sem envio antes do consentimento e autorização. Não instalar selo ou script de uma loja ainda não aprovada.
- Search Console iniciado para o domínio, ainda sem verificação DNS; Bing Places conferido, sem login ou concessão OAuth. RA1000 e Diamante são consequências de critérios e avaliações reais, sem atalhos ou avaliações fabricadas. Requisitos Ebit atuais diferem de manuais antigos.
- Evidências, fontes e ações restantes em [46-cadastros-reputacao-e-presenca.md](46-cadastros-reputacao-e-presenca.md). Alteração apenas documental, sem assinatura ou pagamento.
- Complemento após autorização explícita: solicitação de administração da ficha Google enviada, com prazo de resposta do proprietário até 09/10/2026; consulta de adesão gratuita Ebit enviada e endereço de e-mail confirmado. Telas finais de sucesso comprovadas. Não solicitar transferência de propriedade, contratar plano ou presumir cadastro Ebit aprovado.
- Continuação: DNS público no Registro.br, sem sessão autenticada. Preparar prefixo HTTPS no Search Console por metatag já suportada pelo layout; publicação/validação dependem de autorização específica da concessão de propriedade. Não alterar DNS nem credenciais para contornar a autenticação.
- Conclusão após autorização específica: metatag configurada somente no `.env` privado, app recriado com a mesma imagem, saudável; propriedade HTTPS verificada. Sitemap enviado e processado pelo Google, com 15 páginas encontradas em 06/10/2026. Manter a tag; processamento não garante indexação/ranking. Sem alterações de DNS, banco ou cobrança. Segurança: 92 testes passaram, auditoria de produção sem vulnerabilidades; cinco alertas high de desenvolvimento permanecem na auditoria completa. Operação e comprovantes no documento 46.

## 2026-10-06 - Pedido online e conferência de receita antes da dispensação

- Permitir carrinho e pagamento de medicamentos com receita comum, sem upload no checkout. Preservar a exigência de receita e avaliação farmacêutica antes da dispensação; não converter Losartana em medicamento isento de prescrição. Controlados, classificação pendente e Farmácia Popular seguem atendimento assistido.
- Classificação explícita exclusiva de ADMIN, com padrão não revisado, invalidação ao alterar identidade e auditoria antes/depois. A IA de cadastro não autoriza venda nem altera exigência de receita. Validação na API e restrição no banco impedem classificação comum/controlada sem exigência de receita.
- Pedido registra a necessidade de conferência a partir dos produtos persistidos. Pronto para retirada, saída para entrega e conclusão exigem registro de conferência pela equipe, validado sob lock; aprovação de pagamento não substitui essa etapa. Não armazenar imagem de receita ou dados clínicos.
- Fonte oficial Teuto confirma a apresentação Losartana potássica 50 mg com 30 comprimidos e venda sob prescrição. Regras e fontes da Anvisa, testes, revisão independente e implantação em `45-pedido-online-e-conferencia-de-receita.md`. Publicidade de medicamentos de receita permanece uma revisão separada, com pendência explícita.
- Entrega: 203 testes gerais, 91 de segurança, 48 de frete, typecheck/lint/schema/build e CI passaram. Migração comprovada em PostgreSQL descartável e aplicada em produção; aplicação saudável. Losartana classificada como comum pelo painel, com perfil estimado de 500 g/caixa média autorizado. Adicionar/Comprar e cotação automática PAC/SEDEX conferidos em quatro larguras sem cobrança ou comunicação real; resultados de CEP e limitações de embalagem registrados no documento 45.
- A repetição final encontrou indisponibilidade explícita de PAC/SEDEX no retorno do Melhor Envio. Separar esse erro temporário de ausência de cobertura, sem presumir valores nem repetir cobranças. Regressão antes/depois, frete 49/49, segurança 92/92 e nova revisão independente aprovados. O tratamento não resolve a indisponibilidade externa; evidências anteriores continuam históricas, sem garantia de serviço contínuo.

## 2026-10-06 - Ecossistema de envios, custos e reconhecimento externo

- Manter Melhor Envio/PAC/SEDEX; comparar novo agregador somente por cobertura, preço final e operação comprovados a partir de Ivaté, com aceitação da carga. Revisão de líquidos encontrou divergência entre Correios e guia Melhor Envio; aplicar condições do canal contratado. Não habilitar serviços novos por inferência.
- Seleção de pagamento deve ser determinística, com tarifas válidas da conta e provedor homologado; não precisa de IA. O comparador atual é administrativo e consulta Asaas ainda depende de credencial. Nova conferência confirmou botão de chave desabilitado; cobrança e roteamento automático não foram ativados.
- Priorizar Google Perfil da Empresa, Search Console e Merchant Center para mercadorias elegíveis, depois Bing Places, Reclame AQUI e Ebit. Medicamentos seguem políticas próprias do Google; não estender cashback de avaliação às avaliações do Google. Cadastros, documentos sanitários e selos precisam de validação real. Fontes, roteiro e limitações em [44-ecossistema-frete-pagamentos-e-presenca.md](44-ecossistema-frete-pagamentos-e-presenca.md).
- Segurança da entrega: auditoria nova identificou GHSA-wq5f-xc86-pv6w no Sharp de produção; patch 0.35.4 → 0.35.5 atualiza librsvg, sem alterar o contrato de imagens. Revisão independente, testes e prova do runtime Linux registrados em `42-revisao-de-seguranca.md`.

## 2026-10-06 - Frete com estimativas explícitas e validação de custos Asaas

- Decisão: atender à autorização do lojista para pesos médios de volumes prontos, com caixa média de referência; separar estimativa de medição real no perfil. Permitir rascunhos parciais na API ADMIN sem liberar transportadora; aprovação continua completa, revisada, auditada e vinculada à versão do produto.
- Impacto: Cimegrip/KitKat 500 g e Dove 800 g, C20,8 × L20,8 × A21,6 cm externos. Um volume por unidade; sem consolidação nem remoção de bloqueio de receita. Conferir pacote real antes de postar; referências não comprovam peso exato.
- Asaas: Básico aprovado e API sem mensalidade, mas chave ainda bloqueada. Pix dinâmico gratuito na tela de movimentações não comprova recebimento comercial: retirar tarifa zero manual e manter custo desconhecido até confirmar contrato. Mercado Pago permanece gateway de cobrança.
- Segurança: patch transitivo `source-map-js` 1.2.1 → 1.2.2 corrige GHSA-68fv-2mgg-jv7q, sem nova dependência ou major. Auditoria de produção voltou a zero; cinco alertas high da cadeia de lint/desenvolvimento continuam visíveis, sem downgrade forçado.
- Referências, e-mails próprios, limites e evidências de publicação em [43-frete-estimado-e-validacao-asaas.md](43-frete-estimado-e-validacao-asaas.md).
- Complemento: um único assistente no topo do cadastro pesquisa/aplica nome, descrição, SEO, categoria e peso/medidas; removidos botões logísticos duplicados. Campos logísticos manuais, fontes, cache e permissão ADMIN preservados. Todos os tipos de produto podem guardar embalagem; itens com receita continuam como rascunhos sem liberação de transporte/venda automática. Uma caixa padrão não deve ser extrapolada para apresentações maiores.
- Comparação de envios: manter Melhor Envio enquanto outra plataforma não comprovar vantagem no preço final ou na operação a partir de Ivaté. Frenet, envia.com e SuperFrete têm APIs, mas sobreposição de serviços e limitações de carga/contrato; nenhuma segunda integração foi ativada. Consulta administrativa sem filtro de serviços exibiu PAC/SEDEX para o volume e destino de teste. Fontes e limites em `43-frete-estimado-e-validacao-asaas.md`.

## 2026-10-05 - Segurança padrão e opções de comunicação

- Publicação: `8f18abb`, build Linux/Docker aprovado, app healthy/zero reinícios e workflow GitHub Security checks aprovado. APIs privadas anônimas respondem 401 com no-store; home/login/checkout/health respondem 200. Imagem anterior preservada para recuperação; comprovante em `42-revisao-de-seguranca.md`.

- Revisão confirmou associação insegura de Google por e-mail com cadastro local por senha e ausência de revogação após troca de senha. Associação agora falha fechado; versão privada da credencial no JWT é comparada ao banco e não aparece na Session. Contas já vinculadas corretamente preservadas; cookies anteriores exigem nova entrada. Sem migration ou alteração de senha real.
- APIs privadas com no-store; patches compatíveis de fast-uri/brace-expansion removem alertas de produção. Cinco high de desenvolvimento em braces/ESLint permanecem visíveis, sem downgrade forçado. `SECURITY.md`, AGENTS e workflow estabelecem revisão, regressões e gate high/critical de produção.
- 79 testes de segurança, 187 gerais, 18 comerciais e 45 de frete, com sobreposição entre suites; lint, tipos e Prisma aprovados. Ensaio independente confirmou revogação STAFF/Google, corrida de rotação e ausência da versão na Session. Limites em `42-revisao-de-seguranca.md`.
- Pesquisa oficial distingue limite de envios Brevo, quotas Marketing/Transactional Resend e SES por uso. Recomenda painel ADMIN próprio com provedor, sem SMTP próprio ou inscrição automática de clientes. Alternativas de checkout e selos dependem de taxa/conta e concessão real; nada contratado, enviado ou ativado nesta pesquisa. Referências em `41-emails-pagamentos-e-confianca.md`.

## 2026-10-05 - Cotação automática e conferência do catálogo

- Cotar automaticamente após 450 ms de CEP completo/carrinho elegível; chave estável inclui produtos, quantidades e preços. AbortController e geração da consulta rejeitam respostas antigas. Escolha do serviço permanece manual; callback, cashback e endereço complementar não repetem a chamada. Sem mudança no token/regras do servidor.
- Pedido posterior autoriza fallback por embalagem semelhante. A mesma pesquisa Gemini procura comparável com fatos validados e compatibilidade de família específica, formato, material e apresentação; faixas de baixa confiança são geradas localmente com margem de 20%, separadas da referência exata. Catálogo/SEO aplica o limite superior apenas aos campos vazios em rascunho; fontes de alvo/comparável, premissas e faixa ficam visíveis/persistidas. Revisão rejeitou comparação fralda/lenço da mesma contagem; regressão específica acrescentada. Não converte líquido em bruto, escala contagens sem fonte ou aprova transporte. Contrato em `29-cadastro-logistica-ia.md`.
- Pesquisa não encontrou peso bruto pronto para transporte dos quatro produtos. Corrigidos marca/EAN do Dove conforme fabricante/varejo; dimensões comerciais C6 × L6 × A14cm salvas em rascunho, peso vazio e transporte não aprovado. Referências e divergências do catálogo em `39-frete-automatico-e-embalagens.md`.
- Lojista ainda sem caixas; três tamanhos de papelão pesquisados são opções comerciais com medidas internas/tara, sem compra ou aplicação automática como volume final. Consolidação de carrinhos continua futura.
- Conta Melhor Envio/PAC/SEDEX confirmadas com cotação administrativa real em 04/10 para São Paulo/Umuarama, usando encomenda fictícia. Não foram compradas etiquetas nem aprovados perfis para demonstrar sucesso.
- Lojista informou conta Asaas aprovada e autorizou configuração. Chave API ainda indisponível na interface; cartão 1x (1,99% + R$0,49, 32 dias) e Pix dinâmico gratuito registrados manualmente por sete dias no comparador, com confirmação visual. Contrato de checkout hospedado e limites de expiração Pix pesquisados. Não confundir conta aprovada com segundo gateway homologado; operação e próxima ação em `40-asaas-configuracao-e-homologacao.md`.
- Publicado `2bb60e0`, build Linux/Docker aprovado, app healthy e zero reinícios; health público 200 e fretes administrativos anônimos 401. Chrome confirmou consulta automática por CEP, bloqueio do KitKat sem perfil aprovado e entrega local grátis em Ivaté. Pesquisa real do Dove retornou falta de referência qualificada; nenhum peso foi presumido. Evidência e imagem de recuperação em `39-frete-automatico-e-embalagens.md`.

## 2026-10-04 - Tarifas, mensagens comerciais e ranking mensal

- Comparador administrativo de custo por valor, taxa fixa, percentual, parcelas sem juros confirmadas e prazo. Consulta Asaas padrão de cartão a cada seis horas após conexão, snapshot 24h; manual sete dias. Cofre independente, auditoria antes/depois e sandbox fora de compras reais. Nenhum segundo gateway de cobrança ativado; conta Asaas e homologação pendentes. Contrato em `38-politica-de-taxas.md` e pesquisa em `36-referencias-pagamentos.md`.
- WhatsApp/e-mail compartilham modelo canônico de carrinho, pedido, Pix, lembrete, pagamento e pós-venda. Prévia ADMIN com dados fictícios. Alertas reais ao proprietário ganham preços, subtotal, frete, descontos e cashback previsto. Envio a clientes continua não conectado; não usar a ponte do proprietário para mensagens arbitrárias. Contrato em `37-mensagens-clientes.md`.
- Ranking mensal e histórico individual, somente ADMIN, paginados. Ranking soma pedidos concluídos e pagos; exclui testes e usa mês da criação no horário São Paulo. Histórico inclui estados pendente/cancelado identificados, sem somá-los como compradores no ranking.
- Avaliações seguem autênticas, incentivo existente de 1% extra para produtos elegíveis independentemente da nota. Não publicar testemunhos fabricados ou fotos geradas como clientes reais; Wimicoins não foram emitidos nem ativados.
- Fretes apresentados por preço crescente e prazo como desempate; retirada e entrega local gratuita em Ivaté/Douradina preservadas. Cotação nacional continua dependente de embalagem aprovada por produto.

## 2026-10-04 - Checkout, operação de pedidos e referências logísticas

- Checkout com campos de 16 px, três colunas somente a partir de 1380 px e identidade Wimifarma nas opções oficiais do Brick. Confirmação transacional inicia marcada a pedido do lojista, sem afirmar leitura e sem adesão de marketing. CPF exigido pelo Brick permanece; não há CPF ou cartão salvo pela aplicação.
- Pix conserva a resposta inicial ao falhar uma leitura posterior; prazo original de duas horas, idempotência e confirmação exclusiva do gateway preservados. Detalhe da transação prevalece ao detalhe genérico da Order. Consulta de produção confirmou cartão real do lojista aprovado e Pix anteriores com processing_error sem QR. Titular cadastrou a chave Pix; nova geração ainda precisa ser conferida.
- Pedidos separados por feitos, em andamento, concluídos e cancelados/estornados. Dados técnicos recolhidos, estado financeiro sempre visível; nenhuma alteração de transições ou reconciliação. Contrato em `34-pedidos-operacao.md`.
- IA pesquisa apresentação/EAN, embalagem de venda e peso bruto; referências incompatíveis não preenchem frete. Cache de resultado por identidade/modelo/credencial, até 128 entradas, 24 h para alta confiança e 5 min para demais, com deduplicação concorrente e sem armazenar falhas. Não há aprovação automática de medidas ou contratação de base comercial.
- Comparação de e-mails sem mensalidade, bases logísticas e custo de IA em `35-referencias-catalogo-e-emails.md`. Brevo Free/pré-pago para início; SES e listmonk como alternativa por uso. Nenhuma conta, DNS ou envio novo configurado.
- Verificados 184 testes gerais, 14 de pagamentos, 29 de frete e 28 cenários UI interceptados. Lint, TypeScript e Prisma validate aprovados. Audit mantém sete HIGH preexistentes; nenhuma dependência adicionada. Capturas sintéticas em `outputs/checkout-shipping-review`, sem dados reais; build/publicação têm evidência própria posterior.
- Publicado código `1bc99d1`, com build Linux/Docker aprovado; documentação complementar em `58d9ecd`. Health público `ok: true`, container healthy e zero reinícios. Rollback preservado em `wimifarma-br-app:pre-commerce-1bc99d1`. Sem migrations ou mudanças de credenciais.
- Navegador conectado confirmou campos de 16 px, botão seguro do cartão vermelho, três iframes de dados sensíveis, nove bandeiras e ausência de overflow. Filtros de pedidos mostraram sete cancelados/estornados e dois pedidos feitos; a compra aprovada não aparece entre cancelados. Nenhum pedido foi submetido pela auditoria; checkout de chocolate/retirada preparado para o titular concluir a nova geração Pix.

## 2026-10-03 - Cotação nacional, carrinho da Miauby e proposta de e-mails

- Autorizada a chave geral de frete nacional pelo lojista. Categoria Medicamentos deixa de impedir itens sem receita, desde que embalagem e transporte sejam aprovados. Carrinho com medicamento usa somente PAC/SEDEX, com conferência também no token ao finalizar. Prescrição e Farmácia Popular mantêm atendimento; não existe liberação de compra online de controlados por foto de receita no WhatsApp. Fontes e operação em `27-melhor-envio.md`.
- Cadastro da Losartana estava sem receita; a embalagem apresentada exige prescrição. Correção pelo painel inclui desativar cashback incompatível, preservando preço/estoque. Nenhuma medida foi presumida nem produto foi aprovado para transporte nesta tarefa.
- Carrinho vazio sincroniza cancelamento, sem criar mensagem. Uma atualização em andamento invalida a deduplicação anterior para que um novo esvaziamento não deixe alertas pendentes. Testes reproduziram a corrida e a reabertura vazia; contrato em `30-miauby-whatsapp-comercio.md`.
- Simulador administrativo remove cotações antigas ao alterar a encomenda/iniciar nova consulta, inclusive se o provedor falhar. A aprovação da conexão não é garantia de cobertura de qualquer CEP.
- E-mails: proposta Brevo com compra/pagamento, carrinho e novidades, sem disparo ativo ou importação de clientes. Conta, domínio/remetente e consentimento separados precisam ser definidos antes do envio. Contrato e prévias com marca oficial em `33-emails-clientes.md` e `email-modelos.html`.

## 2026-10-03 - Disponibilidade do frete e equilíbrio do checkout

- O checkout recebe do servidor somente um booleano sobre a cotação pública: configuração ativa, produção, serviços e credenciais presentes. Essa leitura não renova tokens nem consulta transportadoras. Falhas mantêm retirada/entrega local disponíveis e registram somente um marcador operacional, sem segredos.
- A regra existente de medicamentos, receita e Farmácia Popular foi compartilhada com a apresentação do checkout. O aviso aparece antes de oferecer cotação, com atalhos para retirada e atendimento; a API continua validando produtos, embalagens e cotação assinada. Seleções restauradas são descartadas quando a integração ou o carrinho impedem transportadora.
- Inspeção autenticada confirmou Melhor Envio conectado, mas cotação pública desativada. Na cesta informada, Dove está sem embalagem aprovada e Cimegrip não admite cotação automática. Nenhuma configuração foi ativada e nenhuma medida foi inventada.
- Três colunas de mesma largura/altura no desktop, endereço em quatro linhas com ordem de teclado correspondente e resumo claro com subtotal enquanto falta entrega válida. Saldo zero de cashback ocupa uma linha. Sem dependências, migrations, cobranças ou etiquetas novas.

## 2026-10-03 - Visual do checkout e editor de produtos

- Checkout mantém uma página, com três colunas no desktop, duas no tablet e uma no celular. Cabeçalhos numerados, seleção de pagamento com legenda, miniaturas reais da cesta e resumo escuro destacam as informações antes da confirmação.
- A barra de frete grátis usa o valor dos produtos após cashback, limitada ao objetivo de R$ 99,90. O indicador de preenchimento usa a validação existente; não representa aprovação do pedido, pagamento ou disponibilidade de entrega.
- Cadastro e edição passam a um modal amplo, com cabeçalho e ações sempre visíveis e rolagem somente no corpo. Identificação, preço/publicação, descrição/busca, fotos e prévia SEO ficam em seções; peso e medidas mantêm revisão separada.
- Mudança visual, sem dependências, migrations, alteração de permissões, chamadas extras de IA ou regras de pagamento/frete. Contratos em `10-layout-e-experiencia.md` e `32-checkout-e-confianca.md`.

## 2026-10-03 - Checkout, frete e visitantes

- Checkout passa a uma pagina responsiva, com contato, entrega e pagamento. Telefone brasileiro aceita DDI +55/0055 e valida DDD/numero; dados persistidos usam formato nacional.
- Pix usa PT2H e expiracao persistida/canonica, sem renovar apos F5. Cartao aceita parcelas reais do SDK (1..12; debito 1), e a conta foi configurada para parcelado vendedor ate 3x. PAN/CVV continuam exclusivos dos campos do provedor; nao foi criada cobranca real nos testes.
- Frete gratis em R$ 99,90 de produtos apos cashback vale tambem para transportadoras em outras cidades elegiveis. Custo original e valor cobrado sao preservados separadamente. Dinheiro somente retirada/entrega local em Ivate/Douradina. Cotacao nacional continua pendente de embalagens reais e operacao fiscal/postagem.
- Visitantes usam identidade persistente assinada em cookie HttpOnly, compativel com a identidade local anterior e concorrencia entre abas. F5 incrementa visualizacoes, sem virar novo visitante; mede navegadores, nao pessoas. Sem novo IP/user-agent/referrer privado armazenado. Contrato em `31-visitas-do-site.md`.
- Referencias logisticas reforcam correspondencia da apresentacao/kit, rotulos por eixo e rejeicao de caixa master ou fralda aberta. Nenhuma estimativa por foto nem chamada extra de IA. Regras em `29-cadastro-logistica-ia.md`; experiencia e selos reais em `32-checkout-e-confianca.md`.

## 2026-10-03 - Miauby e alertas comerciais

- Decisão: reutilizar somente o transporte WhatsApp existente do legado, por ponte com token exclusivo e destino fixo aprovado pelo proprietário. Bancos e comandos dos projetos continuam separados.
- O painel Miauby é exclusivo de ADMIN. Carrinho, pedido recebido e confirmação autenticada de pagamento possuem controles e textos distintos; não enviam dados de identificação do cliente.
- A outbox transacional e a reserva atômica da ponte deduplicam eventos. Payload congela após primeira tentativa; resultado incerto não é reenviado automaticamente. Aceitação pelo provedor não é recibo de entrega.
- Foto original preservada e comprimida em WebP de 640 px; regras, retenção, rede e validação em `30-miauby-whatsapp-comercio.md`. Nenhuma regra financeira ou restrição de transporte foi relaxada.

## 2026-10-02 - Preenchimento logístico junto do catálogo/SEO

- O mesmo caminho que aplica catálogo/descrição/SEO também aplica referências de peso e medidas aos campos vazios, automaticamente com identidade de alta confiança ou após revisão explícita. Valores manuais são preservados e somente ADMIN grava o rascunho.
- Peso e dimensões são validados de forma independente, preservando fatos úteis quando o outro grupo está incompleto. Formatos brasileiros são reconhecidos com contexto e avisos válidos não se perdem por um aviso malformado. Evidência de peso líquido ou sem embalagem não vira peso bruto.
- Busca continua multissetor, sem novas chamadas de IA, dependências ou migrations. Ausência de evidência não gera estimativa; aprovação de embalagem e ativação do frete permanecem separadas. Critérios e validação em `29-cadastro-logistica-ia.md`.

## 2026-10-01 - Referências logísticas no cadastro assistido

- A pesquisa multissetor passa a procurar peso bruto e dimensões da apresentação exata, com evidência por fonte e conversão determinística de unidades; fotos, conteúdo líquido, dosagem e caixa master não são medidas de frete.
- ADMIN pode copiar referências para campos vazios e salvar rascunho em `Product.shippingProfile`, sem migration. Aprovação continua no módulo de fretes; alteração de medidas ou identidade exige nova revisão e nunca libera medicamentos automaticamente.
- UI preserva campos manuais e descarta valores copiados quando muda a identidade. APIs impedem aprovação de frete pelo cadastro e gravação de medidas por colaborador. Detalhes, validação e limites em `29-cadastro-logistica-ia.md`.

## 2026-10-01 - Ativação pública do Mercado Pago

- Conexão de produção verificada e salva desativada antes de uma segunda gravação para liberar Pix/cartão no checkout, conforme autorização do lojista. Webhook produtivo cadastrado exclusivamente para o evento Order (Mercado Pago).
- Aprovação e recusa de cartão, criação/persistência/expiração de Pix e notificação assinada verificados com o provedor em teste. Concorrência e recuperação de falha de rede cobertas pelo ensaio isolado; nenhuma cobrança real nem reserva de estoque nos cinco pedidos de homologação.
- Disponibilidade de pagamento online confirmada para visitantes sem sessão e no checkout visual. Credenciais cifradas no servidor, sem segredos versionados. Operação e limites em `28-mercado-pago.md`.
- Frete nacional permanece desativado apesar do OAuth Melhor Envio conectado: faltam dados físicos reais das embalagens e confirmação operacional/fiscal. Não liberar produtos com estimativas inventadas.

## 2026-10-01 - Assinatura Orders e homologação do checkout

- Preservar o `data.id` recebido no manifesto HMAC, conforme SDK oficial Node e ensaio no simulador, em vez de converter para minúsculas. Somente após autenticação normalizar o ID na consulta canônica.
- Rejeições registram apenas códigos fixos de diagnóstico, sem dados privados. Cartão aprovado, recusa consultada via webhook e geração/persistência de Pix verificados com conta de teste; nenhuma transferência real.
- Ativação de credenciais produtivas autorizada explicitamente pelo titular no portal; liberação pública da loja permanece dependente da conclusão da homologação. Evidências e limites em `28-mercado-pago.md`.

## 2026-09-30 - Pagamento no checkout com Mercado Pago / Orders

- Escolha explícita do lojista: cobrar na finalização via Pix/cartão usando Bricks. Gateway inicia desativado e exige homologação separada; não muda o atendimento de itens restritos.
- Nova tentativa financeira por pedido, idempotência, reserva atômica de estoque, credenciais cifradas, webhook assinado e consulta autenticada do estado. Nenhum número de cartão/CVV passa pelos formulários da loja.
- Homologação somente ADMIN, sem estoque/cashback reais. Administração exibe estado e referência, impede aprovação manual e bloqueia pedidos de teste/reembolso parcial para preparação.
- Contrato, operação, limites e referências: `28-mercado-pago.md`. Sem dependência nova. Migration aditiva e testes isolados obrigatórios antes da publicação.
- Publicado em 30/09 após backup verificado, testes de concorrência em PostgreSQL descartável e build aprovado. Health confirmado e rotas privadas protegidas; cobrança pública continua desativada até homologação do provedor. Corrigido também o lock de renovação de frete para o adapter Prisma, preservando a exclusão mútua transacional.
- Homologação no navegador identificou requisições prévias do Secure Fields: permitir os hosts oficiais `secure-fields.mercadopago.com` e `api-static.mercadopago.com` em conexão/iframe somente na página de pagamento. Sem curingas ou alteração da política das demais rotas; regressão automatizada e credenciais de teste verificadas pelo gateway.


- Ensaio de cartão aprovado confirmou conciliação e persistência sem estoque/cobrança reais. Para cartão recusado, HTTP 402 da Orders contém a ordem criada em `data`; validar esse envelope e moeda BRL antes da conciliação, mantendo os vínculos do pedido e a mesma chave de idempotência. Erros sem ordem válida continuam incertos.

## 2026-09-28 - Cotação Melhor Envio com ativação controlada

- Origem confirmada pelo lojista: farmácia na Av. Minas Gerais, 2263, Ivaté/PR, CEP 87525-000. Loja e integração separadas de outras atividades da conta.
- Novo módulo ADMIN em `/admin/fretes`, OAuth com credenciais cifradas, simulação, serviços permitidos e embalagens medidas. Sem SDK adicional.
- Checkout associa cotação assinada ao CEP/carrinho e inclui o frete no total validado no servidor. Preserva confirmação humana, retirada, entrega local e cashback somente sobre produtos.
- A integração inicia desligada e produtos sem liberação. Sem compra automática de etiquetas, emissão fiscal ou pagamento online. Mercado Pago/Bricks permanece trabalho separado.
- Contrato, limites, permissões e operação em `27-melhor-envio.md`.

## 2026-09-25 - Alinhamento dos controles para contas internas

- O atalho administrativo passa a integrar o cartao de foto/nome/saldo no desktop, com carrinho e saida centralizados ao lado. No celular, o botao ocupa a largura do grupo de controles. A mudanca corrige o aspecto de botao solto acima de Sair.
- O acabamento e aplicado somente a ADMIN, MANAGER e STAFF, conforme a permissao existente de `/admin/dashboard`. A conta comum conserva seu visual e nao recebe o atalho. Sem alteracao de autenticacao, permissoes, dados, logo ou dependencias.
- Arquivos: `site-header.tsx`, `scripts/header-access-audit.mjs` e contratos de layout/acesso em `docs/10-layout-e-experiencia.md` e `docs/17-usuarios-e-acessos.md`.

## 2026-09-23 - Atalho administrativo no cabecalho publico

- Contas com permissao para `/admin/dashboard` recebem **Painel admin** acima dos controles da conta, em todas as larguras. Cliente comum e visitante nao recebem o atalho.
- O componente servidor reutiliza `canAccessAdminRole` e a matriz `adminRoutePermissions`. Nenhuma nova permissao, consulta adicional, dependencia ou JavaScript cliente; Minha conta, carrinho e Sair permanecem disponiveis.
- Padrao permanente e criterios de manutencao em `docs/17-usuarios-e-acessos.md`; auditoria reproduzivel com sessoes sinteticas em `scripts/header-access-audit.mjs`.

## 2026-09-23 - Animação original da marca sem fundo azul

- O lojista corrigiu a referência: usar `LOGO ANIMADA WIMIFARMA - FUNDO AZUL.svg`, removendo somente o fundo e otimizando sem perder qualidade. O ciclo original de montagem substitui a flutuação/brilho de 2026-09-22.
- `public/brand/logo-wimifarma-animated.svg`: cinco animações CSS originais de 4 segundos; raster interno em WebP lossless, mesma resolução e pixels; SVG independente sem JavaScript. Fundo e definições sem uso removidos.
- Cabeçalho escolhe o SVG normal ou a imagem estática leve para movimento reduzido por `<picture>`, sem preload duplicado. Banner/rodapé conservam a assinatura completa. Detalhes e evidências em `docs/26-logo-animada-original.md`.

## 2026-09-22 - SEO automático, lixeira e animação da marca

- Decisão: oferecer `/google-products.xml` atualizado, tornar explícito no admin o SEO automático dos produtos atuais/futuros e restaurar movimento leve da logo oficial completa.
- Exclusão: `deletedAt`/`purgeAt` com CHECK no banco, retenção por dois meses de calendário e restauração como rascunho. Ofertas são arquivadas; purga periódica preserva pedidos e livro financeiro. Autorização ADMIN/MANAGER, versão otimista, trava transacional e auditoria.
- Operação: worker Node habilitado pelo Docker, primeira verificação após 30 segundos e depois a cada hora; até 10 lotes de 100 por execução. Migration aditiva sem alterar produtos existentes. Desativar com `PRODUCT_MAINTENANCE_ENABLED=false` e recriar o app.
- Limites: site não garante indexação/posição nem conecta automaticamente contas externas do Google. Merchant Center conserva filtro conservador de elegibilidade; busca orgânica mantém todos os publicados. Contrato e validação em `docs/25-seo-automatico-e-lixeira.md`.

## 2026-09-22 - Painel do cliente e acompanhamento de pedidos

- Decisão: modernizar a conta com visão geral, histórico paginado, fotos dos itens, acompanhamento por status, dados, segurança e cashback. Reaproveitar pedidos e autenticação existentes, sem migração.
- Privacidade: consultar apenas o `customerId` da sessão ativa, com seleção explícita e respostas privadas sem cache. Não associar compras por telefone/email nem expor notas internas.
- Acompanhamento: representar os estados registrados pela equipe, diferenciando entrega e retirada. Sem inventar GPS, previsão ou datas de cada etapa. Atualização manual com recuperação de falhas.
- Validação e limites: `docs/24-minha-conta-pedidos.md`; testes com fixtures sintéticas e nenhuma alteração comercial em produção.

## 2026-09-21 - Marca oficial completa como padrao visual

- Pedido do lojista: usar sempre a logo completa da Wimifarma, inclusive em banners e cenas de delivery. Documentar em AGENTS e compartilhar a assinatura entre campanhas sem redesenhar letras.
- Cabecalho estatico evita mostrar somente o simbolo; logo compacta derivada do SVG original reduz transferencia. Nova cena de delivery tem sacola, camisa e bau personalizados. Marcas de produtos e regras comerciais preservadas. Registro em `docs/23-identidade-visual-wimifarma.md`.

## 2026-09-21 - Delivery com cenario humano e orientacao pratica

- Trocar o hero generico por cena ilustrativa de entrega na residencia, conforme preferencia explicita por pessoas e cenario. Reutilizar consulta de CEP, deixar condicao de frete clara e explicar o fluxo com confirmacao humana.
- Sem mudanca de cobertura, calculo financeiro, estoque ou pagamento. FAQ nativo e uma imagem WebP responsiva, sem bibliotecas novas. Detalhes em `docs/22-delivery-visual.md`.

## 2026-09-21 - Referencias visuais, catalogo indexavel e marketing revisavel

- Decisao: ampliar classificacao e descricoes da IA, permitir paginas de referencia e priorizar fotos reais de angulos diferentes; controles de cashback avancam 1 ponto percentual preservando entrada decimal.
- SEO: catalogo, categorias e ofertas reais renderizados no servidor, metadados e dados estruturados locais/produtos, GTIN validado e sitemap com imagens. Ferramentas administrativas para copia de campanhas e exportacao privada de itens nao regulados para revisao no Google.
- Limites: sem migration, cadastro do KitKat, mudanca de precos, estoque, saldos ou pagamento. Google exige configuracao externa e analise de elegibilidade; nenhuma listagem e garantida. Artes preservam identificacao de origem de IA. Contratos e referencias: `docs/21-seo-marketing-e-referencias.md`.

## 2026-09-21 - Catalogo multissetor e sugestoes visuais revisaveis

- Decisao: classificar medicamentos, suplementos, perfumaria, higiene, alimentos/chocolates e outros itens com criterios especificos. Categorias existentes sao sugestoes, sem restringir os tipos aceitos. Principios ativos automaticos somente para medicamentos; marca e apresentacao precisam de evidencia propria.
- Motivo: o assistente rejeitava chocolate por exigir criterios de medicamento. Kit Kat/KitKat e Nestle passam a ter relacao explicita de marca/fabricante; peso decimal com virgula ou ponto nao gera falso conflito.
- Imagens: ler a foto com Gemini, pesquisar fotos reais e verificar compatibilidade visual antes de oferecer frente/verso/lateral. Artes opcionais usam modelo de imagem separado e preservam o angulo visivel. Escolha explicita de uma capa pelo administrador, sem migration e sem cadastro automatico de produto.
- Controles: foto original preservada, resposta antiga descartada, conflito de identidade bloqueia pesquisa, fontes HTTPS com DNS publico fixado, downloads limitados, previews WebP ate 350 KB, API administrativa sem cache com limites por usuario e concorrencia. Conta Gemini pode cobrar analise/pesquisa e geracao; criacao de arte exige clique.
- Validacao e limitacoes: [20-assistente-catalogo-e-imagens.md](20-assistente-catalogo-e-imagens.md). O KitKat do exemplo nao foi cadastrado; alteracoes nao mudam preco, estoque, cashback, receita ou Farmacia Popular.

## 2026-09-20 - Marcas reais e convite a compartilhar experiencias

- Decisao: substituir as composicoes sem marca dos heroes por quatro fotos reais por campanha, montadas em HTML/CSS. Dove, NIVEA, Rexona, Huggies e Johnson’s identificam os produtos; marcas/rotulos nao sao redesenhados por IA. Imagens locais otimizadas e fontes registradas em `13-assets-institucionais.md`.
- Marketing: `Sua opinião vale mais.` coloca a experiencia do cliente em primeiro plano. Cashback extra de 1% aparece com as condicoes, qualquer nota e link `Como funciona`; pagina de regras usa a mesma linguagem. Nenhuma regra financeira, cadastro, estoque ou pagamento foi alterado.
- Peso: oito fotos distintas somam 159.488 bytes, 41,2% menos que as tres composicoes anteriores. Somente a campanha ativa monta imagens; cuidados/perfumaria compartilham cache. Nao confundir tamanho dos arquivos com transferencia total da pagina.
- Validacao: cinco larguras, quatro fotos por campanha, toque, links, movimento reduzido, imagens carregadas e ausencia de overflow/erros. Medidas e gates em `19-produtos-e-campanhas.md`.

## 2026-09-19 - Produto interativo e campanhas responsivas leves

- Decisao: reorganizar a pagina de produto com galeria ampliavel, compartilhamento, total por quantidade e atalhos; substituir inferencia de novidade por ausencia explicita de avaliacoes. Preservar regras de pedido, estoque, receita, Farmacia Popular e cashback.
- Campanhas: fotos ilustrativas `3:2` com grupos de produtos, texto HTML separado no celular e somente a campanha ativa carregada. Corrigir `sizes` do banner Dove e converter a faixa inferior rasterizada em cartoes HTML. Sem novas dependencias, banco ou APIs.
- Motivo: evitar fotos ampliadas/recortadas no celular, reduzir carregamentos invisiveis e tornar preco, compra e leitura mais claros.
- Validacao e peso: `19-produtos-e-campanhas.md`; proveniencia e prompts: `13-assets-institucionais.md`. Fotografias nao prometem marcas ou estoque. Nenhum teste cria pedidos reais.

## 2026-09-19 - Cadastro assistido, fotos persistentes e destaque transacional

- Pesquisa Gemini ao sair do nome/EAN, sem chamada por tecla. Preenchimento somente de campos vazios com identidade exata e fonte oficial; conflito bloqueia aplicacao. Conferencia humana continua obrigatoria, sem promessa de 100% ou posicionamento SEO.
- Novos produtos iniciam como Publicado e podem ocupar uma das dez vagas de destaque. Lock de catalogo compartilhado com Ofertas e exclusao de fotos; produto e auditoria gravados juntos. Sem migration e sem alterar cadastros existentes.
- Fotos existentes retornavam 404 apesar de estarem no volume. Rota dinamica publica preserva URLs, valida WebP/UUID e elimina dependencia do indice estatico inicial. Nova foto abre seletor, retirada nao reanexa a foto anterior e upload concluido e reutilizado.
- Imagens novas ate 1600 px/350 KB; rembg local recebe entrada reduzida, trata uma foto por vez e refina bordas, preservando o original quando a mascara e inutil. Sem alteracao do modelo ou contratacao de outro provedor.
- Menu reordenado conforme operacao: Usuarios, Catalogo, Ofertas, Pedidos, Cupons, Cashback e demais modulos. Validacao e limites documentados em `docs/18-cadastro-inteligente-e-fotos.md`.
- Publicacao dos commits `9a24580`/`04e7471` confirmada apos backup. 108 testes, auditoria de cadastro isolada, build/lint/tipos/Prisma e auditoria sem vulnerabilidades. Conferencia externa confirmou as tres fotos visiveis, cache condicional, SSR/SEO e protecao administrativa; banco e fotos comerciais preservados.

## 2026-09-16 - Usuarios unificados e Google administrativo autorizado

- Vincular User a Customer de forma explicita, sem apagar compras ou carteira. Google exige email verificado e novo login para assumir permissao atribuida; nenhum email recebe privilegio automaticamente.
- Novo diretorio ADMIN com filtros, ultimo login, ranking por pedidos concluidos/pagos e edicao auditada de perfis. Lock transacional comum protege concorrencia, auto-bloqueio e ultimo administrador.
- Carrinho nao modal fecha ao clicar fora com animacao lateral, sem impedir rolagem ou o clique no site. Contrato completo: `17-usuarios-e-acessos.md`.

## 2026-09-15 - Bonus de avaliacao e desconto com saldo

- Aprovacao explicita do lojista: 1% extra sobre uma unidade paga, uma unica vez por cliente/produto, independentemente da nota, utilizavel na proxima compra pelo site. Substitui a restricao anterior de resgate online, sem habilitar gateway ou saque.
- Avaliacao, credito e auditoria transacionais; nota negativa recebe o mesmo bonus e o incentivo e identificado publicamente. Sem avaliacoes ficticias ou creditos retroativos.
- Checkout reserva saldo, distribui o desconto em centavos e usa chave/hash de idempotencia. Liquidacao depende de COMPLETED + PAID; cancelamento/reembolso devolve reserva e estorna bonus uma vez. Carteira serializa concorrencia por bloqueio no PostgreSQL.
- Migration aditiva com defaults neutros. Banner principal, lista de compras para avaliar, regras publicas, extrato, saldo do cabecalho e painel de pedidos integram o fluxo. Contrato e evidencias de publicacao em `docs/16-cashback-avaliacoes-resgate.md`.

## 2026-09-14 - Cashback e sessao administrativa revogada

- Investigacao somente de leitura em producao correlacionou PATCH 503 as 11:41:09 UTC com `AuditLog_userId_fkey`: usuario da sessao ausente em `User`. GET 200 nao validava existencia do autor, apenas role do JWT. Ha administrador ativo persistido; nenhuma conta ou senha foi criada/alterada.
- Correcao na origem, no callback JWT: validar existencia, ativo e perfil atual do usuario administrativo; tokens antigos nao persistidos recebem sessao nula. Auditoria atomica preservada, sem gravacao anonima ou reaproveitamento por email. Cliente e Google mantidos.
- Cashback recebe estado persistente de sessao revogada com `Entrar novamente`, dados antigos ocultos e controles bloqueados; atualizacao manual da lista disponivel para falhas transitorias. Sem retry automatico de gravacao.
- Regressao unitaria falhou antes da correcao em quatro cenarios e passou depois. Auditorias mock e integrada aprovadas: 10 alteracoes simuladas, cinco larguras; banco isolado com usuarios sinteticos, permissoes/role, concorrencia, credito/estorno unico e rollback. Zero erro JavaScript; nenhum produto, pedido, saldo ou usuario real alterado.
- Contratos atualizados em `docs/15-cashback-produtos.md` e `docs/11-seguranca-backup-e-recuperacao.md`. Sem migration de producao, dependencia nova ou alteracao de regras financeiras.
- Bateria local: 91 testes, lint, build, TypeScript e Prisma validate aprovados; npm audit sem vulnerabilidades. Fixture removida antes do build e servidor local encerrado.
- Publicacao `21ee388` verificada: imagem Docker construida e app recriado, home/health 200, API sem sessao 401 JSON, admin redirecionado ao login. Chrome do lojista confirmou `/login`; novo acesso exige administrador persistido. App healthy, zero reinicios e erros desde 17:07:02 UTC. Sem migration ou gravacao de teste em producao; banco isolado e tunel encerrados.

## 2026-09-14 - Cesta aberta sem bloquear a loja

- Por pedido do lojista, a cesta passa a usar `Dialog.Root modal={false}` sem overlay. Interacoes externas nao descartam o painel: permite clicar, navegar, alterar produtos e rolar a loja mantendo a cesta aberta e sincronizada.
- Removido o ciclo de Tab do Dialog, preservando a ordem nativa do teclado e Escape. A lista continua com rolagem independente; fechar, limpar com confirmacao, estoque e checkout permanecem iguais.
- Abaixo de 640 px, painel ocupa 70dvh na parte inferior, com acoes compactas; em telas maiores, permanece na lateral em altura completa. Sem mudancas em APIs, dados, pagamento, cashback ou cobertura de entrega.
- Regressao reproduzida antes da correcao: o clique em Aumentar no card era bloqueado com a cesta aberta. Depois, auditoria local completa aprovada em 320/390/768/1440 px, com 13 capturas, Tab/Shift+Tab, Escape, cliques e rolagem externos; zero erros JavaScript e nenhuma gravacao real. Capturas conferidas apos a animacao, exigindo painel inteiro dentro do viewport.
- Validacoes locais: 85 testes, lint, build e typecheck aprovados. Fixture temporaria removida antes do build; contrato atualizado em `docs/12-carrinho-checkout-pedidos.md` e auditoria de producao ampliada para cesta nao modal.
- Publicado em `d9a888f`: push, pull fast-forward no VPS, build Docker e recriacao isolada do app concluidos. Auditoria real aprovada em 320/390/768/1440 px (8 capturas): alteracao de quantidade, rolagem e navegacao ate produto mantendo a cesta aberta, checkout, CEP e historico; zero erros JavaScript. Mutacoes de API bloqueadas durante o teste, health HTTP 200 e container `running healthy restarts=0`. Capturas conferidas, processos locais de QA encerrados e logs temporarios removidos.

## 2026-09-13 - Cesta lateral, cards e continuidade do checkout

- Cesta do cabecalho abre painel lateral acessivel usando Radix ja instalado; reutiliza estado do carrinho, sem navegar ate comando explicito.
- Cards reais recebem link expandido, Adicionar, contador sincronizado e Comprar; selo de frete condicionado e arraste preservado. Receita, Popular, estoque, cashback e pedido pendente mantidos.
- Endereco consultado via API propria com ViaCEP, validacao, timeout e rate limit. Corrigido preenchimento fixo de cidade/UF. CEP e cidade sao conferidos juntos no checkout e no servidor, sem ampliar entrega.
- Rascunho temporario por identidade e historico nativo preservam preenchimento e etapas; consentimento nao e restaurado. Pagamento continua combinado apos confirmacao humana, sem gateway.
- Auditoria local passou com 13 capturas em 320/390/768/1440 px, cesta longa no celular, teclado, CEP simulado e real, respostas atrasadas, storage bloqueado e pedido simulado; zero erros JavaScript e nenhuma gravacao de teste em producao. Contrato e reproducao em `docs/12-carrinho-checkout-pedidos.md`.
- Bateria final: 85 testes, lint, build, TypeScript, Prisma validate e `npm audit --audit-level=moderate` aprovados (zero vulnerabilidades). Build regenerou tipos depois da retirada da fixture; rota de teste ausente do build e processo local de QA encerrado. Sem migracoes.
- Publicacao inicial `44c244d` aprovada no navegador real: cesta, imagens, Comprar, CEP, cobertura, historico e recarga; 8 capturas adicionais, zero erros JavaScript, escritas de API bloqueadas, health 200 e app healthy sem reinicios.
- Inspecao das capturas identificou `body.scrollLeft=37` depois de redimensionar com campo focado: `overflow-x:hidden` permitia rolagem horizontal interna. `body` passa a usar `clip`, como `html`, mantendo rolagem vertical e impedindo deslocamento invisivel. Auditorias passam a exigir `body.scrollLeft=0`.
- Correcao final publicada em `c66abc8`: build Docker aprovado, app recriado isoladamente, auditoria local completa e `scripts/cart-live-audit.mjs` aprovadas novamente. Em producao, 8 estados responsivos sem deslocamento horizontal, zero erros JavaScript, health 200 e container `running healthy restarts=0`. Rotas temporarias e processos de QA removidos; capturas conservadas somente em `artifacts`, ignorada no Git. Gateway e expansao de entrega nacional continuam pendentes.

## 2026-09-13 - Texto geral de frete gratis na faixa superior

- Por pedido explicito, o titulo da campanha passou de `Frete gratis em Ivate-PR` para `Frete gratis`, mantendo `Em compras a partir de R$ 99,90` e o link `Confira a entrega` para `/delivery`.
- Alteracao restrita ao texto do banner. Caminhao animado, rotacao, acessibilidade e layout preservados. Nao amplia a cobertura por CEP, nao altera taxas nem habilita entrega nacional no checkout; a disponibilidade continua sendo consultada no fluxo existente.
- Auditoria `scripts/announcement-bar-audit.mjs` atualizada para exigir o novo titulo exato, mantendo os testes de animacao, rotacao, links e 12 estados responsivos.
- Validacao local aprovada em 320/390/768/1440 px, sem cortes ou erros de JavaScript, com inspecao visual no desktop e celular. Lint, TypeScript, build, 80 testes e `git diff --check` aprovados. Rota temporaria removida antes do build e servidor de teste encerrado; sem alteracoes no banco.
- Publicado no codigo `a1f6569`: build Docker e recriacao apenas do app concluidos. A mesma auditoria de navegador passou em `https://wimifarma.com.br/contato`, nos 12 estados responsivos; container healthy, zero reinicios e health publico HTTP 200. Capturas de QA permanecem somente na pasta local ignorada `artifacts/announcement-copy-20260913` devido a bloqueio da limpeza automatica pelo ambiente; nao foram versionadas ou enviadas ao servidor.

## 2026-09-12 - Correcao isolada da dependencia de configuracao do Prisma

- Os tres alertas altos do npm vinham de uma unica dependencia, `deepmerge-ts@7.1.5`, usada por `@prisma/config@7.10.0` no carregamento da configuracao via c12. O advisory GHSA-ggr8-5vv4-36mx exige grafos ciclicos; JSON comum nao cria essa condicao. Nao foi constatada exploracao no site nem ligacao com o erro anterior de resposta vazia do cashback.
- Decisao: override exato `@prisma/config@7.10.0 -> deepmerge-ts@8.0.2`, mantendo CLI, client e adapter-pg em 7.10.0. Apenas essa entrada do lockfile mudou. A versao 8 do merger suporta ciclos, preserva exports ESM/CommonJS e requer Node >=16.9.0, atendido pelo Node 24 usado aqui. Nao instalar Prisma 8 RC nem aplicar o downgrade automatico para Prisma 6.
- Fonte e compatibilidade: [advisory](https://github.com/advisories/GHSA-ggr8-5vv4-36mx), [changelog oficial](https://github.com/RebeccaStevens/deepmerge-ts/blob/v8.0.2/CHANGELOG.md). Integridade SHA-512 fixada no lockfile e pacote com assinatura/attestation no registry. Instalar com `npm.cmd ci --ignore-scripts --no-fund --no-audit` antes dos comandos explicitos de generate/build; a atualizacao nao executa scripts novos de instalacao.
- Regressao permanente em `scripts/prisma-config.test.mjs`, incluida em `npm test`: merge de configuracao comum sem mutacao, dois casos ciclicos do advisory, protecao de prototipo e carregamento do `prisma.config.ts` real com URL sintetica, sem conectar ao banco. Antes do override, os dois casos ciclicos falharam com `RangeError: Maximum call stack size exceeded`; apos a correcao, cinco de cinco passaram.
- Validacao local: instalacao limpa, `npm.cmd run prisma:validate`, `npm.cmd test` (80/80), `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build` (32 paginas estaticas) e `npm.cmd audit --json --audit-level=moderate`, todos com saida 0. `npm.cmd audit signatures` verificou 581 assinaturas de registry e 152 attestations. Auditoria com zero vulnerabilidades conhecidas; nao e garantia de ausencia de falhas desconhecidas.
- Sem mudanca em schema, migrations, dados, APIs, checkout ou cashback. Reavaliar o override na proxima versao estavel do Prisma ou ate 2026-10-12, com generate, testes, build Docker e migrations em PostgreSQL descartavel antes de remove-lo.
- Validacao no servidor: imagem Docker `tools` construida do codigo `c0e844d`; PostgreSQL 17 temporario em `--network none`, sem portas publicadas ou volume persistente. A ferramenta compartilhou somente a rede isolada desse container. `npm run prisma:deploy` aplicou as 11 migrations existentes; repetir retornou `No pending migrations to apply`, e `prisma migrate status` confirmou schema atualizado. Cinco testes de regressao passaram tambem no Linux. Nenhum seed ou migration foi executado no banco de producao.
- Publicacao: build Docker do app aprovado e `docker compose --project-directory /home/ubuntu/projetos/wimifarma-br up -d --no-deps app` concluido. Container healthy, zero reinicios; `/api/health`, home e tres arquivos JavaScript referenciados retornaram HTTP 200. `GET /api/cashback` sem sessao retornou HTTP 401 com JSON. Zero erros nos logs apos o inicio do novo container. Banco temporario, containers de teste e tag da imagem QA removidos.

## 2026-09-11 - Cashback com edicao direta e respostas protegidas

- Modal substituido por cards operacionais em duas colunas no desktop, checkbox e seletor de percentual com opcao personalizada. Padrao de 2% e elegibilidade preservados; sem novas regras de credito, resgate ou migration.
- O painel valida o contrato de resposta antes de confirmar sucesso e busca a revisao atual apos erro ou resposta incerta. Trava de salvamento previne requisicoes simultaneas; falhas inesperadas de GET/PATCH devolvem JSON 503 com log tecnico reduzido.
- Regressao coberta para resposta vazia, JSON incompleto, sessao expirada, conflito e resposta perdida apos escrita. Detalhes em `docs/15-cashback-produtos.md`.

## 2026-09-11 - Faixa superior automatica com animacoes por campanha

- Pedido: remover setas/pausa, trocar os avisos automaticamente e destacar R$ 99,90 com caminhao em movimento. Mantidos tres avisos, 40 px e links acessiveis; sem novas dependencias, APIs ou banco.
- Ciclo de sete segundos com caminhao/estrada, pulso de saude e presente/moedas. Foco, ponteiro e aba oculta suspendem movimento e troca; a retomada e automatica. Movimento reduzido desativa animacoes e rotacao. A entrada do texto nao congela ao pausar.
- Oferta de frete restrita a Ivate-PR, unica cobertura atual do checkout. O valor aparece no anuncio sem alterar a taxa local existente nem cobrar pedidos abaixo dele. Cashback agora aponta para Minha Conta e produtos selecionados, sem promessa de resgate ou percentual geral.
- Auditoria `node scripts/announcement-bar-audit.mjs`, com `AUDIT_BASE_URL`, `AUDIT_PATH` opcional e `AUDIT_OUTPUT_DIR`: ausencia de controles, tres destinos, ciclo automatico, movimento real do caminhao, foco/hover, movimento reduzido e 12 estados responsivos em 320/390/768/1440 px. A versao anterior falhou como esperado no teste de ausencia de botoes; a nova passou localmente, sem cortes ou erros de JavaScript.
- Validacao local: `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd test` (73/73), `npm.cmd run build` e `git diff --check` aprovados. Rota temporaria de auditoria removida antes do build; sem alteracao de dados.

## 2026-09-10 - Cashback por produto e saldo do cliente

- Pedido do usuario: habilitacao por produto, padrao 2%, percentual editavel e valor em reais nos cards/header/perfil. ADMIN configura pelo modulo e pelo cadastro.
- Decisao conservadora: snapshot por item, pendencia no checkout e credito somente COMPLETED + PAID. Estorno transacional em REFUNDED/CANCELED, eventKey unico e auditoria. Nenhuma cobranca online, regra de resgate ou credito retroativo.
- Migration aditiva com defaults desabilitado/NONE/zero. API legada de lancamentos manuais desativada; listagem nao expoe cadastro pessoal completo. Detalhes em `docs/15-cashback-produtos.md`.

## 2026-09-10 - Gestao completa de cupons com historico protegido

- Decisao: lista operacional com edicao em modal, calendario de inicio/fim, pausa e exclusao confirmada; manter o modelo Coupon sem migration.
- Integridade: revisao obrigatoria em PATCH/DELETE, transacoes com auditoria atomica e isolamento Serializable. Cupons usados preservam condicoes; exclusao bloqueada para usos ou premios vinculados.
- Compatibilidade: duracao em dias continua aceita no POST legado. Datas explicitas incluem todo o ultimo dia em UTC-03. Contador rotulado como usos, nao pessoas unicas.
- Escopo: nao ativa descontos no checkout nem regras da roleta. Detalhes e testes em `docs/14-cupons-admin.md`.

## 2026-09-10 - Carrossel de marcas na faixa de perfumaria

- A faixa Dove foi substituida por `PerfumeryCarousel`: Dove, Rexona e NIVEA com imagens locais, identidade visual por marca e consulta WhatsApp contextual. Mantida a posicao entre as duas vitrines.
- Rotacao de sete segundos apenas enquanto a faixa esta visivel, com setas, indicadores e pausa. Foco e acao manual interrompem a rotacao; movimento reduzido desativa o automatico. Arraste horizontal e toque preservam o scroll vertical e bloqueiam cliques acidentais.
- Nenhum preco, estoque, selo de parceria ou desconto foi criado. Embalagens sao referencias visuais da marca; versoes disponiveis devem ser confirmadas com a farmacia. Fontes em `docs/13-assets-institucionais.md`.
- Auditoria: `node scripts/perfumery-carousel-audit.mjs`, configuravel por `AUDIT_BASE_URL` e `AUDIT_OUTPUT_DIR`. Cobre marcas, imagens, links, ciclo, pausa, teclado, arraste e quatro larguras. Sem banco, API ou dependencias novas.
- Auditoria local aprovada em 320, 390, 768 e 1440 px (12 estados): imagens carregadas, sem transbordamento, navegacao por mouse/teclado/toque, pausa e bloqueio de abertura do WhatsApp apos arraste. Uma rota temporaria sem dados foi usada devido ao PostgreSQL local indisponivel e removida antes da publicacao.

## 2026-09-10 - Faixa superior com tres campanhas rotativas

- `AnnouncementBar` substitui o anuncio unico por frete local, Farmacia Popular e cashback `Em breve`. Cores, icones e grafismos leves diferenciam as campanhas, sem imagens externas ou novas dependencias.
- Altura preservada em 40 px. Rotacao a cada seis segundos com setas e controle de pausa; foco interrompe a rotacao ate acao explicita. Ponteiro e aba oculta pausam temporariamente; movimento reduzido desativa a troca automatica.
- Removida desta faixa a promessa de frete nacional acima de R$ 99,90: o checkout vigente permite apenas entrega em Ivate-PR ou retirada. Nenhuma regra comercial, API ou banco foi alterada.
- Auditoria reproduzivel: `node scripts/announcement-bar-audit.mjs`, usando `AUDIT_BASE_URL` e, opcionalmente, `AUDIT_OUTPUT_DIR`. Verifica tres avisos, destinos, ciclo, pausa, teclado, movimento reduzido e geometria em 320, 390, 768 e 1440 px.
- Validacao local: auditoria aprovada nos 12 estados responsivos, sem erros de pagina; `lint`, `typecheck`, 53 testes e `git diff --check` aprovados. O primeiro clique na pausa tem teste proprio, cobrindo a ordem entre foco e evento de ponteiro.

## 2026-09-10 - Sobreposicao da busca publica corrigida

- Causa reproduzida: `overflow-hidden` na faixa principal recortava o autocomplete, e o `backdrop-filter` do header limitava o dialogo mobile a 132 px de altura.
- Recorte transferido para a decoracao, com camadas explicitas na faixa de controles e no formulario. Busca mobile renderizada em portal no `body`, fora do contexto do header.
- Ao mudar para desktop, o dialogo mobile fecha e libera a rolagem. Foco, Escape, sugestoes e destinos comerciais preservados; sem mudanca de API ou banco.
- Validacao local: pontos superior, central e inferior do autocomplete sem obstrucao em 1024 e 1440 px; dialogo com altura total de 844 px no mobile de 390 px, Escape restaurando foco e rolagem, e fechamento automatico ao passar para desktop. `lint`, `typecheck`, `git diff --check` e 53 testes aprovados. Busca no banco conferida separadamente em producao, pois o PostgreSQL local nao esta disponivel.

## 2026-09-09 - Foto de atendimento farmaceutico no Contato

- A foto generica de conversa foi substituida por uma cena ilustrativa propria de farmaceutica atendendo pelo celular, com expressao natural, jaleco e ambiente de farmacia.
- WebP local de 1920 x 720 px e 63452 bytes, sem textos gravados. O hero usa composicao panoramica e ponto focal explicito para preservar o rosto no recorte responsivo; Sobre e os canais de atendimento nao mudam.
- Origem e direcao do prompt em `docs/13-assets-institucionais.md`. Sem banco, APIs, dependencias ou regras comerciais alteradas.

## 2026-09-09 - Segunda vitrine com dez posicoes e arraste pelos cards

- `HomeProductCarousel` passa a manter dez posicoes, usando `SHOWCASE_SLOT_COUNT`, independentemente da quantidade de medicamentos publicados. Vagas sao consultas comerciais explicitas, sem duplicar itens nem criar catalogo ficticio.
- O mouse captura o ponteiro somente apos ultrapassar o limiar do arraste. Fotos e nomes aceitam o gesto; um clique simples continua abrindo o produto e botoes de compra nao iniciam arraste.
- Durante o arraste, snap e rolagem suave ficam suspensos. Setas percorrem a quantidade visivel; o carrossel tambem aceita setas do teclado e respeita movimento reduzido. Eventos de toque continuam com rolagem nativa.
- Verificacao local com 0, 1 e 12 produtos: dez posicoes, cinco visiveis em 1440 px, navegacao de ida e volta e arraste sobre link sem navegar. Sem transbordamento em 320 e 390 px. Fixture temporaria removida antes do commit; nenhum dado de banco alterado.

## 2026-09-08 - Sobre e Contato com fotografia e canais diretos

- Duas fotografias distintas substituem os antigos paineis institucionais: atendimento presencial em Sobre e conversa por celular em Contato. Imagens ilustrativas, sem alegar que representam clientes ou funcionarios reais.
- Componente compartilhado `InstitutionalHero` mantém textos acessiveis, carregamento prioritario da foto e enquadramento responsivo. Assets WebP locais evitam requisicoes a provedores de imagens durante a visita.
- Contato preserva WhatsApp, Maps e e-mail como cartoes clicaveis e adiciona perguntas frequentes nativas. Sobre mantém links para ofertas, Farmacia Popular e entrega.
- Sem novas dependencias, alteracoes de banco, APIs, autenticacao, checkout ou regras de entrega. Origem das imagens registrada em `docs/13-assets-institucionais.md`.

## 2026-09-07 - Cabecalho claro com divisao curva

- A faixa principal do header passa a manter o fundo escuro apenas atras da logo Wimifarma e do selo Farmacia Popular, encerrando em uma curva com contorno vermelho.
- Busca, carrinho, conta e demais acoes ficam sobre fundo claro com arte botanica WebP de baixa opacidade, posicionada atras dos controles e sem interceptar cliques.
- Alturas, pontos de quebra, alvos de toque e comportamento da busca foram preservados para evitar regressao no desktop e no celular.

## 2026-09-07 - Banner humano na Farmacia Popular

- O painel de orientacao do hero da pagina `Farmacia Popular` passa a usar uma fotografia ilustrativa propria de atendimento em farmacia, sem marcas, textos gravados ou promessa de disponibilidade.
- A arte e servida em WebP `1200 x 720 px` com 42 KB; logo, chamada e avisos continuam em HTML para preservar nitidez, acessibilidade e leitura no celular.
- Os blocos de documentos, confirmacao humana e separacao apos conferencia permanecem visiveis e sem alteracao nas regras comerciais.

## 2026-09-07 - Hero com tres campanhas fotograficas

- O video principal foi retirado da home e substituido por tres banners proprios para medicamentos, perfumaria e mae e bebe, inspirados na organizacao de categorias de grandes redes sem copiar campanhas ou marcas.
- As artes mostram pessoas, nao contem texto ou produtos identificaveis e sao servidas em WebP `1920 x 720 px`, entre 50 e 70 KB; chamadas e botoes continuam em HTML para manter legibilidade, SEO e acessibilidade.
- O carrossel troca a cada 6,5 segundos, oferece setas, indicadores, pausa e gesto horizontal, interrompe durante interacao e desativa o autoplay quando o usuario prefere movimento reduzido.
- Os CTAs levam para as ofertas reais ou para consultas especificas no WhatsApp; nenhuma disponibilidade, indicacao clinica ou promocao foi inventada.

## 2026-09-07 - Faixa Dove e segunda vitrine de medicamentos

- A home passa a separar ofertas e avaliacoes com uma faixa Dove compacta e clicavel para consulta no WhatsApp.
- Um segundo carrossel lista automaticamente ate dez medicamentos publicados com imagem, sem inventar itens ou disponibilidade.
- O componente reutiliza o card comercial publico e preserva as regras existentes de carrinho, receita e Farmacia Popular.

## 2026-09-07 - Miauby conversacional com Gemini e catalogo real

- Decisao: transformar a Miauby em assistente conversacional responsiva, usando Gemini no servidor, memoria curta da propria conversa e ate quatro produtos publicados relacionados como contexto e atalhos.
- Motivo: permitir perguntas uteis no site e busca assistida sem inventar catalogo, preco, estoque ou orientacao clinica.
- Impacto: novo avatar WebP transparente, painel flutuante, `/api/miauby`, logica testavel em `src/features/miauby`, politica de privacidade e documentacao de arquitetura, seguranca, ambiente, layout e fluxos.
- Riscos/cuidados: conversa nao e persistida; pergunta e historico curto podem ser enviados ao Google. A interface proibe dados sensiveis, emergencias e dados financeiros evidentes usam resposta local, e qualquer orientacao clinica ou confirmacao comercial continua com a equipe.

## 2026-09-06 - Rolagem vertical nativa no site publico

- Decisao: retirar a camada global do Lenis do layout publico e manter a rolagem vertical nativa do navegador.
- Motivo: eliminar um ponto intermediario que podia deixar a rolagem indisponivel de forma intermitente, especialmente apos navegacao, redimensionamento ou uso em dispositivos de toque.
- Impacto: apenas o mecanismo de rolagem global do site publico; animacoes de componentes, carrosseis e `scroll-behavior` do CSS permanecem inalterados.
- Riscos/cuidados: a rolagem perde a interpolacao artificial do Lenis, mas preserva mouse, trackpad, teclado, toque e recursos de acessibilidade do navegador.

## 2026-09-06 - Paginas institucionais orientadas a atendimento

- Decisao: redesenhar `Contato` e `Sobre` com hierarquia mais clara, identidade visual de farmacia, cartoes de acao inteiros clicaveis e caminhos diretos para WhatsApp, Maps, e-mail, ofertas, Farmacia Popular e delivery.
- Motivo: tornar os canais de atendimento e os servicos locais mais faceis de reconhecer no desktop e no celular, seguindo padroes recorrentes de farmacias digitais sem copiar uma marca concorrente.
- Impacto: hero institucional compartilhado, paginas publicas `Contato` e `Sobre` e documentacao de layout.
- Riscos/cuidados: nenhum horario, volume de atendimento ou promessa comercial foi inventado; precos, estoque, entrega, receita e Farmacia Popular continuam sujeitos a confirmacao da equipe.

## 2026-09-06 - Compra direta e carrossel de correlatos no produto

- Decisao: ampliar a pagina individual com acao primaria `Comprar agora`, acao secundaria de carrinho, barra fixa de compra apos a primeira dobra e carrossel horizontal de ate dez correlatos reais.
- Motivo: aproximar a experiencia de compra do padrao atual de farmacia digital sem duplicar checkout, criar galeria ficticia ou alterar as restricoes comerciais existentes.
- Impacto: painel de compra, botao flutuante do WhatsApp, cards de correlatos, consulta server-side da pagina de produto e documentacao de layout/fluxo.
- Riscos/cuidados: a compra direta ainda gera apenas pedido pendente; receita, Farmacia Popular e falta de estoque continuam no WhatsApp; avaliacoes exigem compra concluida; a galeria mostra somente a imagem real cadastrada.

## 2026-09-06 - Cards padronizados e avaliacoes verificadas na home

- Decisao: aproximar os cards de `Melhores ofertas` do padrao visual de e-commerce farmaceutico, mantendo cinco itens visiveis no desktop, e incluir um segundo carrossel alimentado somente por avaliacoes publicadas de compras concluidas.
- Motivo: melhorar leitura de imagem, nome, marca, nota, preco e acao sem transformar depoimentos inventados em prova social falsa.
- Impacto: consulta server-side da home, contrato publico da vitrine, cards, botao compacto de compra, carrossel de avaliacoes e documentacao de layout/fluxo.
- Riscos/cuidados: estrelas e comentarios dependem de dados reais; nomes permanecem abreviados; quando nao ha avaliacao, a interface mostra `Novo` no produto e um estado vazio no carrossel.

## 2026-09-05 - Correcao responsiva, performance e metadados por rota

- Decisao: manter todos os controles do header acessiveis em celulares pequenos, substituir o segundo carregamento do video pelo poster leve, aplicar cache ao MP4, renderizar hero e primeira vitrine sem atraso de animacao e definir canonical, titulo e compartilhamento proprios para cada pagina publica indexavel.
- Motivo: corrigir corte da busca em 360 px, reduzir disputa de rede no carregamento inicial e impedir que paginas institucionais sejam interpretadas como duplicatas da home.
- Impacto: header, botao de carrinho, hero da home, fonte local com `next/font`, configuracao de headers, metadados das rotas publicas, contraste do rodape, teste automatizado e documentacao de layout.
- Riscos/cuidados: o video principal continua em autoplay e loop por decisao visual; futuras trocas do arquivo devem preservar o poster leve e revisar a politica de cache. Paginas de conta, carrinho e checkout continuam com `noindex`.

## 2026-09-04 - Carrinho e checkout de pedido pendente

- Decisao: permitir compra de produtos elegiveis por carrinho e checkout, gravando `Order` e `OrderItem` para confirmacao humana e operacao em `/admin/pedidos`.
- Motivo: reduzir atrito entre vitrine e pedido sem simular uma integracao financeira ainda inexistente.
- Impacto: rotas `/carrinho`, `/checkout`, `/privacidade`, APIs `/api/pedidos*`, modelos Prisma, painel administrativo, rate limit, cards publicos, testes e documentacao.
- Riscos/cuidados: o servidor recalcula preco e valida estoque; pedido nasce pendente e nao baixa estoque; nao ha coleta de cartao, geracao de Pix ou aprovacao automatica; receita e Farmacia Popular continuam no WhatsApp; politica juridica e gateway permanecem pendentes.

## 2026-09-01 - Primeira camada de hardening e backup automatico

- Decisao: remover `adm / adm`, aplicar cabecalhos seguros, validacao de origem e rate limit nas APIs, atualizar dependencias compativeis e automatizar backup diario validado.
- Motivo: reduzir risco imediato de invasao e perda de dados sem alterar regras comerciais nem introduzir checkout.
- Impacto: `src/features/auth/auth.ts`, `src/middleware.ts`, `next.config.ts`, dependencias, workflow de seguranca, Dependabot, `ops/*` e documentacao operacional.
- Riscos/cuidados: o limitador em memoria nao substitui WAF; Cloudflare, MFA, copia externa, alertas e pentest continuam pendentes. O Prisma de desenvolvimento mantem 3 alertas altos sem correcao compativel com Prisma 7.

Este arquivo registra decisoes tecnicas importantes. Sempre que uma decisao for tomada, alterada ou substituida, adicionar novo registro.

## 2026-05 - Framework inicial da plataforma

- Decisao: criar a base como plataforma comercial moderna, nao apenas site institucional.
- Motivo: permitir evolucao para ofertas, produtos, clientes, cupons, WhatsApp, admin, roleta e cashback.
- Impacto: `src/app`, `src/components`, `src/features`, `prisma`, `docker-compose.yml`, `docs`.
- Riscos/cuidados: evitar crescimento desorganizado e manter modulos separados.

## 2026-05 - WhatsApp como conversao principal

- Decisao: priorizar WhatsApp em vez de checkout/pagamento.
- Motivo: fase inicial depende de atendimento humano, confirmacao de estoque, preco e orientacao.
- Impacto: `src/lib/site.ts`, `src/lib/whatsapp.ts`, componentes publicos e APIs de WhatsApp.
- Riscos/cuidados: nao prometer compra automatica.

## 2026-05 - Docker Compose com nomes exclusivos

- Decisao: usar `wimifarma-br-app`, `wimifarma-br-postgres`, `wimifarma-br-network` e `wimifarma-br-postgres-data`.
- Motivo: evitar conflito com Candy English e outros projetos.
- Impacto: `docker-compose.yml`, README e docs de deploy.
- Riscos/cuidados: Nginx Proxy Manager precisa estar na mesma network para acessar `wimifarma-br-app:3000`.

## 2026-05 - PostgreSQL nao exposto publicamente

- Decisao: Postgres fica apenas na rede Docker, sem porta publica.
- Motivo: seguranca.
- Impacto: `docker-compose.yml`.
- Riscos/cuidados: administracao direta do banco deve ser feita via container, tunnel ou ambiente controlado.

## 2026-05 - Auth.js com Credentials e Google preparado

- Decisao: usar NextAuth/Auth.js v5 com provider Credentials e Google opcional.
- Motivo: permitir admin inicial e preparar login social futuro.
- Impacto: `src/features/auth/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/types/next-auth.d.ts`.
- Riscos/cuidados: login temporario `adm / adm` deve ser removido ou protegido antes de producao.

## 2026-05 - Admin como skeleton modular

- Decisao: criar painel admin com sidebar e placeholders antes de CRUD real.
- Motivo: permitir visualizar estrutura e evoluir por modulos.
- Impacto: `src/app/admin`, `src/components/admin`.
- Riscos/cuidados: placeholders nao devem ser confundidos com funcionalidades finais.

## 2026-05 - Roleta publica redireciona para ofertas

- Decisao: manter `/roleta` publica redirecionando para `/ofertas`.
- Motivo: roleta real so deve existir quando houver regras comerciais, limites e antifraude.
- Impacto: `src/app/(site)/roleta/page.tsx`.
- Riscos/cuidados: nao ativar campanha real sem validacoes.

## 2026-05-10 - Documentacao oficial numerada

- Decisao: criar docs numerados de memoria longa e transformar `AGENTS.md` em manual obrigatorio para agentes.
- Motivo: futuras conversas do Codex precisam continuar o projeto sem depender do historico antigo do chat.
- Impacto: `README.md`, `AGENTS.md`, `docs/00-*` ate `docs/10-*`.
- Riscos/cuidados: manter docs atualizados sempre que arquitetura, banco, APIs, auth, permissoes, deploy, layout ou fluxos mudarem.

## 2026-05-23 - Home temporariamente focada em anuncio

- Decisao: remover da home publica as categorias em bolinhas e vitrines estaticas de medicamentos/destaques, mantendo o video e uma tela grande vazia para anuncio principal.
- Motivo: a prioridade comercial imediata e usar a primeira pagina como vitrine de campanha/anuncio, sem distrair com catalogo demonstrativo.
- Impacto: `src/components/site/home-page.tsx`, `src/components/site/site-header.tsx`, `src/lib/site.ts`, docs de fluxo e layout.
- Riscos/cuidados: a arte do anuncio deve respeitar dimensoes responsivas; catalogo/ofertas continuam pendentes para retorno futuro com dados reais.

## 2026-07-15 - Vitrine Melhor oferta na home

- Decisao: adicionar uma vitrine fixa `Melhor oferta` entre o video principal e a faixa de campanhas, com 15 espacos de produto e grade 5x3 no desktop.
- Motivo: permitir comecar a divulgar produtos na primeira pagina sem depender ainda do catalogo/admin definitivo.
- Impacto: `src/components/site/home-page.tsx`, `README.md`, `docs/10-layout-e-experiencia.md`.
- Riscos/cuidados: os produtos 06 a 15 sao espacos temporarios com preco `Consulte`; trocar por dados reais ou integrar ao banco antes de tratar como catalogo final.

## 2026-05-23 - Google OAuth apenas para clientes

- Decisao: tratar login Google como sessao `CUSTOMER`, sem permissao administrativa, mantendo admin por Credentials.
- Motivo: evitar que cliente autenticado por Google receba perfil de colaborador ou acesso ao painel reservado.
- Impacto: `src/features/auth/auth.ts`, `src/types/next-auth.d.ts`, `src/components/site/customer-auth-page.tsx`, `src/components/admin/admin-shell.tsx`.
- Riscos/cuidados: cliente Google nao deve ganhar permissoes administrativas; antes de liberar recursos sensiveis de cliente, revisar consentimento e dados obrigatorios.

## 2026-05-23 - Persistencia de cliente Google

- Decisao: criar ou atualizar `Customer` durante o callback JWT do login Google, usando e-mail, nome, foto e identificador Google.
- Motivo: permitir que clientes autenticados por Google tenham identidade persistente antes dos modulos de pedidos, clube, cashback e atendimento personalizado.
- Impacto: `prisma/schema.prisma`, `prisma/migrations/20260523224500_persist_google_customers/migration.sql`, `src/features/auth/auth.ts`, docs de banco e autenticacao.
- Riscos/cuidados: naquele momento o cadastro por formulario ainda estava pendente; telefone fica opcional no banco para clientes Google, mas atendimento comercial ainda deve coletar telefone/WhatsApp quando necessario.

## 2026-05-24 - Area do cliente Minha Conta

- Decisao: criar `/minha-conta` como painel de cliente com abas para usuario, entrega, senha e cashback.
- Motivo: dar ao cliente um lugar claro para completar telefone, endereco, criar senha e consultar informacoes de beneficios sem misturar com o admin.
- Impacto: `src/app/(site)/minha-conta/page.tsx`, `src/components/site/customer-account-panel.tsx`, `src/app/api/minha-conta/*`, `src/features/auth/auth.ts`, `prisma/schema.prisma`.
- Riscos/cuidados: redefinicao por email ainda depende de provedor de email e tokens; cashback segue informativo ate haver regra comercial aprovada.

## 2026-05-23 - Cofre admin para API e senhas

- Decisao: criar o modulo administrativo `API e Senhas` para guardar credenciais sensiveis cifradas no PostgreSQL.
- Motivo: centralizar client IDs, tokens e senhas administrativas sem versionar segredos no Git nem deixar valores soltos em conversas.
- Impacto: `prisma/schema.prisma`, `src/app/admin/api-senhas`, `src/app/api/admin/api-senhas`, `src/components/admin/secret-vault-panel.tsx`, `.env.example`.
- Riscos/cuidados: apenas `ADMIN` pode criar, revelar ou excluir; `SECRET_VAULT_KEY` precisa ser mantida estavel e segura, e secrets expostos em prints devem ser rotacionados.

## 2026-06-01 - Contador anonimo de visitantes

- Decisao: registrar visitas do site publico por identificador anonimo salvo no navegador e exibir o total no dashboard admin.
- Motivo: dar ao administrador uma metrica simples de entrada no site sem depender ainda de analytics externo.
- Impacto: `prisma/schema.prisma`, `src/app/api/visitas`, `src/components/site/site-visit-tracker.tsx`, `src/app/admin/dashboard/page.tsx`.
- Riscos/cuidados: nao usar dados pessoais diretos; IP fica apenas em hash opcional e a contagem representa navegadores/dispositivos, nao pessoas verificadas.

## 2026-06-02 - SEO tecnico basico

- Decisao: adicionar `robots.txt`, `sitemap.xml`, canonical e tags de compartilhamento social no App Router.
- Motivo: evitar 404 em arquivos basicos de indexacao e apresentar a Wimifarma melhor em buscadores e compartilhamentos.
- Impacto: `src/app/robots.ts`, `src/app/sitemap.ts`, `src/app/layout.tsx`.
- Riscos/cuidados: manter admin, APIs e area do cliente fora de indexacao publica.

## 2026-06-02 - Auditoria de browser com Playwright

- Decisao: adicionar script `audit:browser` para abrir rotas reais em desktop, tablet e mobile, capturando console, erros de pagina, falhas de request e screenshots.
- Motivo: auditorias futuras nao devem depender apenas de build e inspecao estatica quando houver suspeita de hidratacao, console ou responsividade.
- Impacto: `scripts/browser-audit.mjs`, `package.json`, `.gitignore`.
- Riscos/cuidados: screenshots ficam em `artifacts/browser-audit` e nao devem ser versionados.

## 2026-06-02 - Otimizacao conservadora de assets principais

- Decisao: trocar o favicon e `src/app/icon.svg` por SVG vetorial compacto e recomprimir o video principal mantendo resolucao e audio.
- Motivo: reduzir peso inicial de assets visiveis sem alterar identidade visual nem qualidade percebida do anuncio.
- Impacto: `public/favicon.svg`, `src/app/icon.svg`, `public/videos/thiago-cansado.mp4`, docs de layout.
- Riscos/cuidados: futuras trocas de video devem comparar qualidade visual antes de comprimir de forma mais agressiva.

## 2026-06-02 - Guard server-side por modulo admin

- Decisao: centralizar `adminRoutePermissions` e fazer paginas admin validarem roles no servidor, alem do filtro visual do menu.
- Motivo: impedir acesso por URL direta a modulos que o colaborador nao deve abrir.
- Impacto: `src/features/auth/permissions.ts`, `src/components/admin/admin-shell.tsx`, `src/components/admin/module-placeholder.tsx`, paginas em `src/app/admin`.
- Riscos/cuidados: todo novo modulo admin deve ser registrado no mapa de permissoes antes de ser publicado.

## 2026-06-27 - Criacao real de ADM e colaborador

- Decisao: substituir os placeholders `Criar ADM` e `Criar colaborador` por telas reais de criacao, listagem e bloqueio/reativacao de usuarios administrativos.
- Motivo: permitir que o administrador gerencie acessos sem depender de seed ou alteracao manual no banco.
- Impacto: `src/app/admin/criar-adm`, `src/app/admin/criar-colaborador`, `src/components/admin/admin-users-panel.tsx`, `src/app/api/admin/usuarios`.
- Riscos/cuidados: senhas temporarias devem ser fortes e trocadas pelo usuario; o login temporario `adm / adm` continua pendencia critica para remover/proteger antes de producao.

## 2026-06-29 - Criacao real de cupons no admin

- Decisao: substituir o placeholder `Cupons` por tela real de criacao e listagem usando o modelo `Coupon` existente.
- Motivo: permitir cadastrar cupom com nome/codigo, tipo, validade por dias ativos, limite de uso e contador de pessoas/usos registrados.
- Impacto: `src/app/admin/cupons`, `src/components/admin/coupons-panel.tsx`, `src/app/api/cupons/route.ts`, `src/features/coupons/schema.ts`.
- Riscos/cuidados: o contador atual representa usos registrados no cupom; ainda nao existe tabela separada para identificar pessoas unicas por cupom.

## 2026-07-17 - Cadastro de produtos com imagens WebP persistentes

- Decisao: substituir o placeholder de catalogos por cadastro real de produtos e converter imagens enviadas para WebP no servidor.
- Motivo: manter fotos de produtos leves e padronizadas sem exigir tratamento manual antes do envio.
- Impacto: `src/components/admin/products-catalog-panel.tsx`, APIs de produtos e upload, `docker-compose.yml` e volume `wimifarma-br-uploads`.
- Riscos/cuidados: imagens ficam fora do Git e precisam entrar no backup; a vitrine publica ainda depende de integracao futura com os produtos do banco.

## 2026-08-28 - Logo animada vetorial no header

- Decisao: substituir o GIF do header pelo SVG animado da marca, removendo o fundo azul original e mantendo o ciclo continuo de quatro segundos.
- Motivo: preservar nitidez em qualquer densidade de tela, melhorar o enquadramento e integrar a marca diretamente a faixa escura do cabecalho.
- Impacto: `public/brand/logo-animada.svg`, `src/components/site/site-header.tsx` e docs de layout.
- Riscos/cuidados: manter o `viewBox` e a proporcao da arte; futuras edicoes nao devem recolocar fundo nem ampliar a imagem a ponto de cortar a animacao.

## 2026-08-30 - Biblioteca e tratamento profissional de imagens de produtos

- Decisao: manter os arquivos no volume proprio da aplicacao, registrar metadados em `ProductImage` e preservar `Product.imageUrl` para compatibilidade. Novos produtos podem reutilizar uma imagem por `imageAssetId`.
- Motivo: evitar uploads repetidos, padronizar WebP, controlar peso e permitir administrar fotos diretamente no cadastro de produtos.
- Exibicao: miniaturas de uploads persistentes usam a URL WebP direta, pois o arquivo ja foi otimizado no envio; isso evita cache intermediario desatualizado logo apos cadastrar uma foto.
- Remocao de fundo: usar a API do remove.bg somente quando `REMOVE_BG_API_KEY` estiver configurada; o processamento local com Sharp continua responsavel por orientacao, dimensoes e compressao.
- Impacto: schema/migration Prisma, APIs de imagens, upload, formulario de catalogos, Docker Compose, `.env.example` e documentacao operacional.
- Riscos/cuidados: remocao de fundo envia a foto ao provedor externo e pode consumir creditos; arquivos e banco precisam entrar juntos no backup; conversao nao recupera detalhes ausentes em uma foto de baixa resolucao.

## 2026-08-30 - Proporcao padrao do banner principal

- Decisao: padronizar o hero da home em `8:3` nas telas grandes, com exibicao maxima de `1280 x 480 px`, mantendo altura fluida abaixo do breakpoint `lg`.
- Motivo: permitir que futuras campanhas tenham um enquadramento previsivel sem cortar o video vertical nem comprometer a leitura em celulares.
- Padrao de arquivo: arte principal em `1920 x 720 px`, WebP e ate 350 KB; quando houver criativo exclusivo para celular, usar `1080 x 1350 px`, WebP e ate 250 KB.
- Riscos/cuidados: manter informacoes importantes dentro da area segura central; evitar texto incorporado na imagem quando ele puder permanecer em HTML; nao reutilizar a arte horizontal no celular sem validar o recorte.

## 2026-09-02 - Remocao local de fundo e editor de imagens

- Decisao: substituir como padrao o envio de fotos ao remove.bg por um servico interno `rembg` com modelo `u2net`, mantendo remove.bg apenas como alternativa, e adicionar recorte, zoom e rotacao antes do upload.
- Motivo: permitir remocao de fundo sem credito por imagem, manter a foto dentro do servidor e padronizar o enquadramento dos produtos. O resultado da IA recebe fundo branco e a edicao de uma imagem da biblioteca sempre cria uma copia.
- Impacto: `Dockerfile.rembg`, `background-removal/server.py`, `docker-compose.yml`, `src/features/product-images/service.ts`, editor e seletor de imagens do admin.
- Riscos/cuidados: o modelo usa aproximadamente 1 GB de RAM carregado e aumenta o tempo/tamanho do build; o servico deve continuar sem porta publica, fixo em `u2net` e limitado a arquivos de 10 MB. A remocao automatica pode exigir ajuste manual em embalagens transparentes ou bordas muito finas.

## 2026-09-02 - Classificacao e edicao individual de produtos

- Decisao: adicionar busca, filtros por categoria/status, ordenacao e edicao individual no catalogo administrativo.
- Motivo: permitir localizar e manter produtos conforme o catalogo crescer, sem precisar recriar registros para corrigir preco, estoque, classificacao ou imagem.
- Impacto: painel de catalogos, schema de validacao, `PATCH /api/produtos/[id]`, testes de classificacao e documentacao.
- Riscos/cuidados: a API exige a versao `updatedAt` carregada pelo formulario e retorna conflito quando outra pessoa alterou o produto primeiro; o slug atual e preservado durante a edicao.

## 2026-09-03 - Produtos reais na vitrine Melhores ofertas

- Decisao original: usar `Product.featuredPosition` para selecionar e ordenar manualmente ate 15 produtos na home. O limite foi substituido pela decisao de carrossel com 10 destaques registrada abaixo. O catalogo oferece `Destacar` e `Remover destaque` para alteracao rapida, enquanto `/admin/ofertas` preserva o controle completo da ordem.
- Motivo: impedir publicacao automatica de todo o catalogo e dar controle operacional sobre quais itens aparecem, sem duplicar nome, preco ou imagem em outro cadastro.
- Impacto: schema/migration Prisma, painel e API de vitrine, atalho em `Produtos / Catalogo`, consulta server-side da home, cards publicos, testes e documentacao.
- Riscos/cuidados: somente produtos publicados e com foto podem ser escolhidos; posicoes sao exclusivas, o salvamento e atomico e a venda continua direcionada ao WhatsApp.

## 2026-09-03 - Busca publica com produtos e correlatos

- Decisao: substituir os exemplos locais da busca por produtos `ACTIVE` do PostgreSQL, com autocomplete por nome e dados farmaceuticos cadastrados, pagina individual e correlatos.
- Motivo: permitir que o cliente encontre um item real, veja foto e preco durante a digitacao e consulte produtos proximos sem sair do fluxo da farmacia.
- Impacto: novos campos `activeIngredients`, `searchTerms` e `searchText` em `Product`, API publica de busca, cadastro administrativo, busca desktop/mobile e rota `/produto/[slug]`.
- Riscos/cuidados: principios ativos e termos devem ser preenchidos com base no cadastro oficial do produto; correlato significa apenas proximidade de busca, nunca substituicao terapeutica, e disponibilidade/preco continuam sujeitos a confirmacao humana pelo WhatsApp.

## 2026-09-04 - Carrossel com dez destaques na home

- Decisao: reduzir a vitrine publica de 15 para 10 posicoes e exibi-la em carrossel, com cinco cards por pagina no desktop, setas, arraste por mouse e gesto horizontal em telas de toque.
- Motivo: manter os cards em tamanho legivel sem alongar a home e permitir que o cliente percorra duas sequencias de cinco ofertas.
- Impacto: contrato e testes da vitrine, consulta server-side da home, painel administrativo de destaques, cards publicos e documentacao.
- Riscos/cuidados: posicoes antigas acima de 10 sao ignoradas e deixam de contar como destaque; ao salvar a organizacao da vitrine, a API limpa qualquer posicao antiga antes de gravar a selecao atual.

## 2026-09-04 - Sugestoes fundamentadas para cadastro de produtos

- Decisao: adicionar um assistente opcional de catalogo usando Gemini em duas etapas: pesquisa com Google Search e estruturacao validada por Zod. O resultado inclui confianca, alertas e fontes; somente alta confianca preenche automaticamente campos vazios.
- Motivo: reduzir trabalho manual em categoria, descricao, principios ativos e termos de busca sem transformar a resposta do modelo em verdade automatica.
- Impacto: formulario de produtos, nova API administrativa, contrato e testes em `src/features/products/ai-suggestions.ts`, rate limit, ambiente e documentacao.
- Riscos/cuidados: produto ambiguo, apresentacao incompleta ou fonte ausente exige revisao da embalagem ou bula; a IA nao define receita, Farmacia Popular, dose, posologia, substituicao, preco ou estoque. Textos que excedam os limites do formulario sao reduzidos de forma defensiva sem invalidar os demais campos. Para `gemini-2.5-flash`, o raciocinio interno e desativado nas duas chamadas curtas para evitar que consuma o limite antes de concluir a pesquisa ou o JSON. O recurso exige `GEMINI_API_KEY` somente no `.env` do VPS.

## 2026-09-04 - Pagina comercial de produto e avaliacoes verificadas

- Decisao: transformar `/produto/[slug]` em uma pagina completa de produto, com foto ampliavel, compra por quantidade, frete local, detalhes, avaliacoes de compradores e correlatos, mantendo as restricoes regulatorias e o checkout pendente ja existente.
- Motivo: permitir que o cliente leia e compare informacoes reais antes de colocar um item no carrinho, sem depender apenas do card da vitrine.
- Impacto: pagina e componentes publicos do produto, carrinho com quantidade inicial, modelo/migration `ProductReview`, API de avaliacao, retorno seguro apos login, rate limit, politica de privacidade, testes e documentacao.
- Riscos/cuidados: avaliacao exige pedido concluido e nao e anonimizada internamente; nome publico e abreviado. O frete automatico cobre apenas a faixa operacional de Ivate e nao promete prazo. Produtos com receita/Farmacia Popular continuam no WhatsApp, e nenhum pagamento e aprovado pela pagina.

## 2026-09-05 - Pesquisa farmacologica rigorosa e SEO de produtos

- Decisao: reforcar o assistente Gemini para conferir identificacao, apresentacao, composicao e categoria em fontes rastreaveis, gerar descricao factual normalmente entre 140 e 220 caracteres e conceder alta confianca somente quando houver fonte oficial da Anvisa ou do fabricante. Cada produto publicado tambem recebe metadados proprios, URL canonica, JSON-LD `Product` e entrada dinamica no sitemap.
- Motivo: reduzir sugestoes genericas ou sustentadas somente por lojas e dar ao Google conteudo individual, consistente e tecnicamente indexavel sem repetir palavras-chave artificialmente.
- Impacto: `src/features/products/ai-suggestions.ts`, testes de sugestao e SEO, `src/features/products/product-detail.ts`, pagina publica do produto, sitemap e documentacao.
- Riscos/cuidados: a IA continua sendo assistente e nao fonte sanitaria definitiva; divergencia de EAN, registro, apresentacao ou composicao exige conferencia manual. Dados estruturados aumentam a elegibilidade para resultados enriquecidos, mas nao garantem exibicao nem posicao no Google.

## 2026-10-24 — Mais 45 apresentações individuais com fotos e encerramento auditado

- Decisão: concluir os lotes `marcascomplemento15-v1`, `marcascomplemento16-v1` e `marcascomplemento14-v1`, com 45 produtos, 45 fotos e 90 auditorias. A frente individual passou de 224 para 269 EANs distintos em 16 lotes encerrados; os 30 capilares de outra frente foram preservados e não entram nesse total. As três operações ocorreram em 24/10 no horário de São Paulo; a última terminou às 00:14 UTC de 25/10.
- Apresentação e preço: foram revistas 12 apresentações de perfumaria e 33 de higiene nas marcas Actine, Blancy, Dove, Epidrat, Hydraporin, Lux, Nivea, Reviline, Rexona e Seda. Cada oferta ANB teve nova consulta por EAN, ST numérico e concordância entre tabela e modal. As condições Premium Top 7 Dias, promoção Unilever PR 1 e tabela ANB outubro/novembro PR foram preservadas por produto, com acréscimo de 20%, validade de 24 horas da observação e alocação máxima de cinco. Kits têm preço do conjunto completo; adesivos promocionais das fotos e caixa padrão do fornecedor não criam desconto da loja nem mínimo de compra.
- Fotos: os 3.410.196 bytes de entrada resultaram em 487.098 bytes WebP, com comparação de rótulo, variante, forma e quantidade, sem recorte ou ampliação pelo publicador. Reviline 40g usa foto oficial com a quantidade na caixa; não foi substituído pelo sérum 30ml. As demais 44 fotos são reais do CDN público do distribuidor, com endereço canônico derivado de padrão anteriormente observado, sem alegar visita à página individual ou código de barras visível. A resposta da imagem não foi usada para inferir preço ou estoque.
- Verificação: fonte imutável `3ce519fd9fad866c43a61a1fd4159179118f29a4`, mapa de 988 arquivos e imagem de ferramentas conferidos. A fundação aprovada de 904 execuções, lint, typecheck, build e Prisma mantém datas e hashes originais; cada lote executou novos 485 testes de segurança, 111 de fornecedores, auditorias e QA próprio. Também passaram 21 controles locais e 25 sobre o predecessor físico por lote. No primeiro lote, o encerramento exato da outra frente teve validação adicional somente leitura, sem reutilizar sua autorização ou enviar mensagem ao chat. ADMIN ativo, deduplicação EAN/slug, mutex/CAS, concessão exclusiva, backup, baseline, dry-run, aplicação única, imagens persistentes, segundo contêiner e páginas públicas foram conferidos. Todas as janelas foram liberadas e os três QAs próprios removidos; as oito tabelas protegidas e todos os produtos anteriores foram preservados.
- Cuidados: a auditoria completa mantém um alerta moderado em `fast-uri`, com saída 1, e nenhum high/critical. Permanecem pendentes minoxidil/Pielus MX, os repelentes e classificações anteriormente retidos, possíveis sucessões de GTIN e divergências de massa, volume, tonalidade ou variante. Produto ativo e imagem HTTP 200 não comprovam estoque físico ou elegibilidade atual de uma oferta expirada. Não reaplicar os lotes encerrados; capturas, custos, imagens de entrada, logs, backups e comprovantes completos permanecem privados. Nenhum código da aplicação foi alterado nesta etapa.

## 2026-10-24 — Mais 30 apresentações verificadas e coordenação leve entre frentes

- Decisão: encerrar `marcascomplemento16-v2` e `marcascomplemento14-v2`, com 30 produtos, 30 fotos e 60 auditorias. A união dos 18 manifestos desta frente foi conferida, incluindo os cinco primeiros comprovantes arquivados: 299 EANs distintos, sem duplicações. Os produtos da outra frente não entram nesse total. As verificações públicas e liberações ocorreram às 01:25 e 01:46 UTC de 25/10, ainda em 24/10 em São Paulo.
- Apresentação e preço: são quatro apresentações de perfumaria e 26 de higiene em Actine, Nivea, Dove, Rexona e Seda. Cada oferta selecionada tem consulta ANB exata, custo final concordante entre tabela e modal, ST numérico, estoque exibido e condição comercial próprios. Permanecem acréscimo de 20%, validade de 24 horas desde a observação real e alocação máxima de cinco. Kits Nivea e Seda mantêm preço do conjunto completo; adesivos promocionais não criam desconto da loja. Nenhum princípio ativo, concentração, duração de eficácia ou equivalência de fórmula foi importado por associação à marca.
- Fotos: 2.437.472 bytes originais resultaram em 345.418 bytes WebP. As 29 fotos reais do distribuidor usam um endereço canônico por EAN derivado de padrão observado, com método e MIME efetivamente decodificado registrados; não se afirma visita à página individual ou leitura de barcode. Dove Sensitive 150ml usa a frente real observada na galeria oficial da página com EAN exato, após a foto do distribuidor mostrar o verso. Original e WebP foram comparados, inclusive transparência e fundo branco; o publicador não ampliou ou recortou os arquivos. Três Seda de 1kg têm título primário Unilever por EAN como apoio de quantidade, com a origem cacheada declarada e sem importar composição ou estoque.
- Verificação: fonte imutável `c3eacedfbf9bf9847860ffc04251d0e119143892`, mapa de 988 arquivos e ferramentas `sha256:e1565c8ae29217f8806a13edd8054788e8c642133a346a68b652ab769ff0f7b3`. A fundação aprovada soma 904 execuções, lint, typecheck, build e Prisma, com datas e hashes originais. Ambos os lotes tiveram novos 485 testes de segurança, 111 de fornecedores, auditorias, QA, 21 controles locais, conferência de predecessor físico, ADMIN, deduplicação EAN/slug, mutex/CAS, grant exclusivo, backup, baseline, dry-run e aplicação única. O primeiro também verificou somente leitura o encerramento exato de 50 produtos da outra frente, com sete arquivos fixados por hash e 25 controles adicionais. Imagens persistentes, segundo contêiner e páginas públicas foram conferidos. As duas janelas terminaram liberadas, os QAs próprios removidos e as oito tabelas protegidas preservadas. A auditoria completa mantém um moderado em `fast-uri`, saída 1, e zero high/critical.
- Coordenação: o usuário passou a autorizar avisos breves ao chat 5 sobre seleção, sobreposição, revisão do código e prontidão/encerramento de publicação, mantendo pesquisa e execução individuais e sem espera por respostas rotineiras. Avisos não concedem autorização alheia nem substituem o estado técnico, o mutex ou o CAS. Um identificador digitado incorretamente em aviso foi corrigido para a janela física `chat10-marcascomplemento14-v2-20261024-014446`; arquivos de prova prevalecem sobre mensagens. A documentação foi preparada após o encerramento técnico do lote da outra frente.
- Pendências: o kit Seda Regeneração Intensa `07891150097360` mostrou estoque zero na ANB e nenhum resultado na busca exata Profarma; segue explicitamente em conferência, sem disponibilidade global inferida. Continuam retidas divergências Nivea 50g/50ml e Seda 300ml/300g, além das retenções anteriores. Duas identidades Baby Dove foram posteriormente resolvidas em páginas oficiais e retornaram à próxima seleção, ainda sem inclusão nesta contagem. A pesquisa integral continua; nenhum item retido é descartado silenciosamente. Fotos, capturas, custos, logs, backups e comprovantes completos permanecem privados, e estes lotes não devem ser reaplicados.

## 2026-10-25 — Pesquisa em quatro distribuidoras e continuidade do catálogo

- Orientação do lojista: pesquisar cada produto em ANB, Profarma, GAM e DM; Santa Cruz fica suspensa pela dificuldade de coleta. Arquivo ou API oficial poderão ser avaliados sem retomar o aplicativo ou ativar integração. Pesquisa sem resultado, falha de acesso, estoque desconhecido e indisponibilidade não são equivalentes. O escopo anterior permanece, acrescido das novas marcas e famílias descritas em [108](108-catalogo-pesquisa-quatro-fontes.md).
- Encerramentos: `marcascomplemento20-v1` e `marcascomplemento17-v1` têm 37 produtos e 37 fotos verificados, com liberação e limpeza do QA próprios. A união desta frente soma 336 EANs distintos em 20 lotes; outras frentes e medicamentos históricos permanecem separados. Provas e controles estão em [96](96-catalogo-por-principio-ativo-2026-10-22.md). Esses lotes precedem a nova exigência de quatro fontes e não devem ser reaplicados; a pesquisa complementar continua pendente.
- Preparação atual: Paixão21 tem 84 consultas por EAN nas quatro fontes, 21 fotos conferidas e 25 controles negativos locais aprovados. Continua preparado, sem publicação ou concessão. As condições e os tributos GAM foram registrados por apresentação, mantendo estoque numérico desconhecido e sem interpretar caixa fechada como mínimo.
- Validação: a suíte visual de `bcc32ee` encontrou uma fixture sem receita que herdava tipo `ORDINARY` e, por isso, ocultava corretamente o cashback esperado pelo teste. Corrigiu-se a fixture elegível para `UNREVIEWED`, com conferência de ausência do selo nos cards com receita. A regra pública de benefícios não foi alterada. A fundação e a versão da próxima publicação precisam ser renovadas; o resultado parcial da suíte anterior não é tratado como aprovação completa.

## 2026-10-25 — Linhas12 publicado e pendências preservadas

- Resultado: quatro Farmax, seis Hidraderm e dois Sunless incluídos uma vez, com 12 fotos, 24 auditorias e páginas/imagens públicas conferidas por hash. União desta frente: 369 EANs únicos em 22 lotes; os 2.431 produtos anteriores e as oito tabelas protegidas foram preservados. Janela liberada e QA próprio removido. Provas em [96](96-catalogo-por-principio-ativo-2026-10-22.md).
- Pesquisa: 40 EANs novos das cinco linhas Farmax/Hidraderm/Sunless/Moskitoff/Suprinutri receberam 160 consultas nas quatro fontes. Outros 28 permanecem pendentes por foto, identidade ou classificação, sem declarar a grade completa. Herbamed e demais famílias continuam no escopo; Santa Cruz suspensa. Detalhes em [108](108-catalogo-pesquisa-quatro-fontes.md).
- Recuperação: a preparação v1 parou antes de grant/aplicação por confundir o contrato da janela com o de uma entrada da fila. A v2 usa o validador correspondente a cada estrutura e passou em dez controles negativos adicionais. A v1 foi retirada sem publicação e seu QA foi removido após validação exata de propriedade; não deve ser reaplicada.

## 2026-10-25 — Paixão21 publicado e coleta Herbamed preservada

- Paixão21 foi aplicado uma vez, com 21 produtos, 21 fotos e 42 auditorias; 84 pesquisas nas quatro distribuidoras. As páginas e imagens públicas, os 2.410 produtos anteriores, as oito tabelas protegidas, a liberação e a limpeza exata do QA foram conferidos. Esta frente soma 357 EANs de marcas em 21 lotes, sem contar medicamentos históricos ou outras frentes. Detalhes e hashes em [96](96-catalogo-por-principio-ativo-2026-10-22.md).
- Fonte operacional: OPS imutável `cb2b395`, 1.002 arquivos, ferramentas correspondentes e fundação de 1.051 execuções; novos 485 testes de segurança e 111 de fornecedores. APP `4ce316a` tinha mudanças reais na interface da conta. A compatibilidade permitiu somente os hashes exatos dos dois arquivos revisados, mantendo o mapa completo OPS e bloqueio de demais mudanças. Não se afirma equivalência global APP/OPS. Os controles de compatibilidade, predecessores, grant, backup, aplicação única e prova pública continuam obrigatórios.
- Herbamed: a DM teve seis páginas coletadas, com 111 EANs únicos, 105 fotos candidatas e seis imagens ausentes. A coleta foi normalizada preservando datas e custo final; não houve classificação automática pela marca, estoque numérico inventado ou publicação. As outras três fontes e a revisão individual continuam pendentes. Santa Cruz permanece suspensa e a grade ampliada permanece integralmente na fila de pesquisa.
