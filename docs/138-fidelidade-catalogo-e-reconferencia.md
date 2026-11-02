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

Foi preparada corrigenda documental para Bigfral, EAN `07896012880159`, removendo título duplicado e texto interno. A fonte oficial consultada identifica apresentação Juvenil de dez unidades. O plano conserva EAN, preço, estoque, origem, frete, status e slug; aplicação exige leitura atual, revisão, CAS e auditoria separadas. A execução não é presumida pela preparação.

Nutren Active Baunilha mantém registros e preços separados nos EANs `07891000234006` e `07891000443422`. Não foi confirmada em fonte primária a hipótese de embalagem 340 g + 60 g para o segundo. Não houve fusão nem alteração de apresentação baseada apenas em varejistas. A distinção exata permanece pendente de embalagem/fabricante. Pesquisa e corrigenda ficam em `outputs/catalog-semantics-2026-11-02/`.

## Carrinho e pós-venda

Reconferência válida sem alteração semântica preserva o array de origem e informa que o carrinho já está atualizado, sem exigir aplicar uma proposta vazia. Valores opcionais equivalentes, ordem de chaves da classificação e ilustração padrão não geram falsos positivos. Mudanças reais de preço, quantidade, estoque, restrição, classificação ou origem continuam explícitas. A proteção contra resposta atrasada após edição concorrente permanece por identidade da fonte.

Troca/cancelamento usa mensagem própria no WhatsApp, independente de receita ou atendimento farmacêutico. O canal e o telefone permanecem; testes inspecionam o link, sem enviar mensagem.

## Validação e publicação

Validação local: 525 testes de segurança e 108 testes dirigidos passaram, além de lint, TypeScript e `git diff --check`. A revisão independente aprovou o código após inclusão de auditoria atômica nas cinco criações, validade do plano depois de todos os locks e vínculo do SHA da QA com o executável. As três falhas iniciais de testes eram fixtures de taxa antiga e mocks sem auditoria; foram corrigidas sem alterar os contratos clínicos ou de credenciais.

Auditoria de dependências: produção com três alertas baixos e quatro moderados; completa com três baixos e 17 moderados. Nenhum alto/crítico; os avisos moderados permanecem e nenhuma dependência foi alterada nesta tarefa.

QA PostgreSQL 17, aplicação dos dados, build e conferência pública ainda aguardam execução e serão registrados separadamente. A QA isolada foi alinhada com o chat 10 sem autorizar alteração concorrente do app, banco comercial ou canônico. Relatos, marcas, fotos, animação original do rodapé e atalho administrativo continuam sob seus contratos.

Código principal: `club/membership.ts`, `club/policy-migration.ts`, criações de clientes/auth, checkout, schemas/APIs/admin de cashback, página `/cashback`, banner/conta/privacidade, `cart-review.ts`/UI, famílias de busca/categorias e validação de importação. Auxiliares operacionais ficam fora do Git.
