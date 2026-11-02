# 138 — Fidelidade, catálogo e reconferência

## Decisão do lojista

Em 02/11/2026, o lojista solicitou inscrição automática gratuita no Club para clientes cadastrados, WimiCoins em produtos selecionados e cashback de compra de 1% nos itens com margem suficiente. A escolha dos produtos permanece manual: não foi definida margem mínima automática. A habilitação existente não constitui uma nova conferência de custos, impostos ou margem.

O bônus de avaliação de 1% é apresentado separadamente da compra e dos pontos. A conversão permanece 100 WimiCoins = R$ 1; o percentual dos pontos continua por produto. Exemplo público condicional: R$ 100 pagos num item com 2% em pontos e 1% em cashback gera 200 WimiCoins (R$ 2) e R$ 1 de cashback. Crédito exige conclusão/pagamento e os saldos podem ser usados no próximo checkout, sem frete. Nenhum bônus geral de entrada foi criado.

## Inscrição e dados legados

As cinco criações de Customer incluem associação e auditoria atomicamente, sem criar carteira ou consentimento de marketing. O checkout inscreve somente cliente ativo já validado, quando falta associação, após conferir repetição do pedido. A associação desativada não é reativada automaticamente. Equipe sem vínculo pessoal conserva o fluxo explícito e o conflito de identidade; e-mail não é prova de vínculo. GET permanece leitura.

O módulo `club/policy-migration.ts` e o CLI privado `scripts/apply-loyalty-policy.ts` preparam dois planos independentes. Um cobre clientes ativos sem adesão; outro normaliza apenas a taxa dos produtos não deletados já habilitados para cashback. Dry run é o padrão. Aplicação exige ADMIN ativo, fonte SHA40, arquivo privado original e hash, validade, validação de todos os alvos antes da escrita, locks, CAS e auditoria na mesma transação. Repetição é reconhecida pelo hash aplicado. Carteiras, pedidos, transações financeiras, preferências, preço, estoque e seleção dos benefícios não são alterados.

As APIs de habilitação de cashback persistem 100 pontos-base mesmo em produto desabilitado com taxa legada. Percentuais de WimiCoins e a aritmética genérica não foram restringidos pela validação específica de cashback. A ferramenta histórica de ativação automática de medicamentos não faz parte desta operação e não deve ser executada sob a nova política manual.

## Catálogo e importação

Perfumes deixam de ser identificados apenas por “com perfume”/“perfumado” em absorventes, fraldas ou outros tipos. Correlação de nutrição passa a reconhecer famílias editoriais PediaSure, Ensure, Glucerna e Nutren, sem afirmar equivalência de fórmulas ou unificar EANs. A recuperação da família também funciona quando a marca está ausente ou usa o fabricante.

“Extra G”/“ExtraG” são tratados como XG na preferência de tamanho, separados de G, tanto no ranking local quanto na consulta parametrizada. O importador recusa títulos com duplicação literal/`10Unadulto` e conteúdo operacional interno sobre divisão de custos.

Foi preparada corrigenda documental para Bigfral, EAN `07896012880159`; a fonte oficial consultada identifica apresentação Juvenil de dez unidades. Foi aplicada separadamente somente a remoção da frase operacional “Unidade comercial identificada na fonte do distribuidor, sem fracionar caixa ou dividir custos.”, após dry-run apto, revisão, backup, ADMIN ativo, CAS e auditoria. A comparação de 39 tabelas e de todas as colunas protegidas do alvo passou. O GET público confirmou a frase ausente. Nome, EAN, preço, estoque, origem, frete, status e slug permaneceram iguais.

O nome duplicado continua como candidato à revisão normal de identidade/foto/logística; não foi fabricada autorização de revisão nem contornado gate para trocar o nome de um ACTIVE. O importador já bloqueia a reintrodução desse padrão. Job da descrição: `loyalty-01a15b8f-20261102-bigfral-description-apply-v1`; backup SHA256 `a49f32b2ee44626faa90c74cd1c00292bcd68745bfe5d990424e27f13a95545d`, uma auditoria e nenhuma aplicação incerta. O auxiliar privado exige bundle atestado da fonte `f226849`; não aceita fallback baseado no diretório atual.

Nutren Active Baunilha mantém registros e preços separados nos EANs `07891000234006` e `07891000443422`. Não foi confirmada em fonte primária a hipótese de embalagem 340 g + 60 g para o segundo. Não houve fusão nem alteração de apresentação baseada apenas em varejistas. A distinção exata permanece pendente de embalagem/fabricante. Pesquisa e corrigenda ficam em `outputs/catalog-semantics-2026-11-02/`.

## Carrinho e pós-venda

Reconferência válida sem alteração semântica preserva o array de origem e informa que o carrinho já está atualizado, sem exigir aplicar uma proposta vazia. Valores opcionais equivalentes, ordem de chaves da classificação e ilustração padrão não geram falsos positivos. Mudanças reais de preço, quantidade, estoque, restrição, classificação ou origem continuam explícitas. A proteção contra resposta atrasada após edição concorrente permanece por identidade da fonte.

Troca/cancelamento usa mensagem própria no WhatsApp, independente de receita ou atendimento farmacêutico. O canal e o telefone permanecem; testes inspecionam o link, sem enviar mensagem.

## Validação e publicação

Validação local: 525 testes de segurança e 108 testes dirigidos passaram, além de lint, TypeScript e `git diff --check`. A revisão independente aprovou o código após inclusão de auditoria atômica nas cinco criações, validade do plano depois de todos os locks e vínculo do SHA da QA com o executável. As três falhas iniciais de testes eram fixtures de taxa antiga e mocks sem auditoria; foram corrigidas sem alterar os contratos clínicos ou de credenciais.

Auditoria de dependências: produção com três alertas baixos e quatro moderados; completa com três baixos e 17 moderados. Nenhum alto/crítico; os avisos moderados permanecem e nenhuma dependência foi alterada nesta tarefa.

QA real PostgreSQL 17 passou em 17 verificações, incluindo rollback por falha na auditoria individual/resumo, CAS, validade após espera pelo último lock, concorrência, repetição e preservação integral das tabelas. O CLI também passou com dois planos privados e duas aplicações vazias. Recursos descartáveis removidos por seus IDs/labels; banco comercial preservado. Problemas anteriores de empacotamento Prisma e uma fixture sem `purgeAt` foram corrigidos antes da aprovação final. O diagnóstico privado não conserva dump de objetos nem URI de conexão.

Build local passou com heap de 2 GiB após a tentativa inicial atingir o limite de 1 GiB. Build Linux ARM64 e publicação somente do app concluídos na fonte `f2268499238bea98cc82f2fc08387337a43b36b1`. Imagem `sha256:da5cf126e16aa067e701121ee453c6c9d601008fc4f1f1dfc72d0cdb3919fdd0`; contêiner `13f87dfed26cbf2228df386488b9f7e8a71630dd1bd752ad6b37d7f8b2b3a195`, iniciado às 16:23:55 UTC de 02/11/2026. Configuração efetiva, variáveis e PostgreSQL original preservados; nenhuma migration. A cadeia Compose ganhou somente `/home/ubuntu/.codex-taskdata/loyalty-catalog-01a15b8f-20261102-app-v1/candidate.compose.yml`; a imagem anterior e a alternativa de rollback permanecem no mesmo job privado.

A janela do chat 10 foi encerrada e liberada antes do pull/build. O canônico permaneceu com SHA256 `749bd37206e58e3021340dab757d31651ffd6b42f39cae57287e6167b00e3b9b`, `completed_released`, grant falso e sem aplicação incerta. Os 16 rascunhos da outra frente foram preservados.

QA pública passou em 390 e 1.440 px: benefícios/conversão/exemplo, aviso no formulário de cadastro, privacidade, Perfumes sem absorventes/fraldas, prioridade PediaSure, WhatsApp específico de pós-venda, ausência de overflow real e 128 bolhas do rodapé. Navegação anônima com mutações/analytics bloqueados; sem criar conta, pedido, pagamento ou enviar mensagem. SSR local/público, saúde, busca e kit também passaram. Relatos, marcas, fotos e atalho administrativo continuam sob seus contratos.

## Aplicação da política nos dados existentes

Após backup custom validado por TOC/SHA256 e planos independentes revisados, foi inscrito um cliente ativo sem associação e normalizadas de 200 para 100 pontos-base três seleções existentes: Cimegrip 20cp, Óleo de Banho Dove Glicerinado 240ml (DRAFT) e Kit Kat Milk Chocolate Wafer Bar. Nenhum produto foi habilitado para benefício ou publicado por essa operação. A seleção preexistente contém 863 produtos não deletados; todos os habilitados passaram a 1%. Isso não substitui conferência de margem pelo lojista.

As duas transações concluíram e passaram nas provas de preservação. Foram criadas uma associação e seis auditorias (quatro individuais e dois resumos). Carteiras, saldos, pedidos e créditos históricos, User/Customer, marketing, preços, estoque, WimiCoins e demais tabelas/colunas protegidas ficaram iguais. Adesões desativadas foram preservadas. A leitura final encontrou zero clientes ativos sem registro de associação, zero cashback habilitado fora de 1% e os dois resumos dos planos.

Backup: `/home/ubuntu/.codex-taskdata/loyalty-01a15b8f-20261102-policy-plan-v2/database-before.dump`, SHA256 `7bd666a3cfd2e1950c5d237e3f137db94f60a0e974e67761373b034b1ee67ad3`, com permissões privadas. Aplicação: job `loyalty-01a15b8f-20261102-policy-apply-v1`, sem restauração automática, aplicação incerta ou recurso temporário remanescente. Recibos locais em `outputs/fidelidade-catalogo-2026-11-02/`; logs, planos, backups e dados privados não foram versionados.

Código principal: `club/membership.ts`, `club/policy-migration.ts`, criações de clientes/auth, checkout, schemas/APIs/admin de cashback, página `/cashback`, banner/conta/privacidade, `cart-review.ts`/UI, famílias de busca/categorias e validação de importação. Auxiliares operacionais ficam fora do Git.
