# 50 - Recuperação de compra e conexões externas

## Mudanças em 07/10/2026

- Uma falha na consulta inicial do pagamento agora mostra **Tentar consultar novamente**. A ação consulta o mesmo pedido por GET, sem criar pedido, gerar outra cobrança, apagar a referência local ou estender o vencimento do Pix. Estados incertos continuam exigindo reconciliação; não migrar uma tentativa incerta para outro gateway.
- O carrinho oferece **Consultar dados atuais**. Preço, estoque e disponibilidade vêm do banco, e a proposta mostra valores e quantidades anteriores e novos antes de **Aplicar atualização**. O cliente pode manter o carrinho. Produtos indisponíveis, sem estoque ou de atendimento assistido têm remoção proposta explicitamente; nada é removido silenciosamente.
- Uma mudança de quantidade, remoção ou inclusão durante a consulta invalida a proposta, inclusive quando os valores retornam ao estado anterior. O provedor do carrinho também confere a referência do estado ao aplicar. Quantidade nunca aumenta automaticamente e respeita estoque e limite de 20 unidades.
- E-mail é obrigatório apenas para Pix/cartão online. Dinheiro elegível pode prosseguir sem e-mail; um e-mail informado continua sujeito à validação existente.

## API e segurança

`POST /api/carrinho/revisao` aceita apenas `{ productIds: string[] }`, com 1–30 IDs distintos, corpo máximo de 4096 bytes, JSON e origem válida. Limite de 15 consultas por minuto/IP e resposta `private, no-store`. É uma leitura de produtos ativos e não excluídos, restrita a campos públicos; não recebe preço do cliente, não reserva estoque e não grava produtos ou pedidos. Erros internos são sanitizados.

Preço, estoque, reserva, propriedade do pedido, homologação e confirmação exclusiva pelo gateway continuam no servidor. A atualização do carrinho não libera controlados, classificação pendente ou Farmácia Popular. As bolhas originais do rodapé e os demais padrões visuais não foram alterados.

## Validação

- `npm.cmd run test:security`: **109 testes aprovados**, incluindo recuperação GET, carrinho alterado durante consulta, origens externas, corpo excessivo, rate limit e erro de banco sem exposição de detalhes.
- Revisão independente dos nove arquivos de implementação/teste: nenhum bloqueador; 11 regressões focadas aprovadas.
- `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run build`, `npm.cmd run prisma:validate` e `git diff --check`: aprovados.
- Auditoria de produção: zero vulnerabilidades. Auditoria completa mantém cinco alertas high na cadeia de desenvolvimento: `@next/eslint-plugin-next`, `eslint-config-next`, `fast-glob`, `micromatch` e `braces`. Não houve troca de dependências nem ocultação desses alertas.
- Prévia no navegador com dados sintéticos: consulta de pagamento falha e recupera o mesmo pedido; dinheiro permite e-mail vazio; carrinho apresenta a proposta de preço/quantidade antes de aplicar. Pedidos, cobranças e envios externos bloqueados nessa prévia. Esses ensaios não comprovam recebimento produtivo nem homologação Asaas.

## Conexões externas

O titular informou e mostrou a criação da chave Asaas. A aba antiga perdeu controle pelo navegador conectado; uma nova aba **Pagamentos → Conectar consulta de tarifas Asaas** foi preparada para colagem segura. A chave não foi transcrita, armazenada em documentação ou versionada. A integração existente consulta tarifas de cartão; não cria cobranças Asaas nem altera o gateway do checkout. Conexão, resposta da conta e homologação devem ser registradas separadamente quando concluídas.

O Reclame AQUI reenviou o código ao e-mail da contabilidade vinculado ao CNPJ, inclusive após novo pedido do lojista. O código recebido anteriormente estava vencido; a interface informa validade de 90 segundos. O novo código fornecido pelo titular foi aceito, e o fluxo abriu **Crie seu acesso**. Nome, cargo de dono e celular foram preenchidos; o teste de 14 dias do plano pago permaneceu desmarcado. A criação da senha e a confirmação final do acesso ficaram pendentes na aba aberta. Nenhum código fica nesta documentação. Isso ainda não comprova página pública ou selo RA1000.

## Arquivos e operação

Implementação em `src/components/site/{cart-page,cart-provider,checkout-page,online-payment}.tsx`, `src/features/products/cart-review.ts`, `src/features/payments/client-recovery.ts` e `src/app/api/carrinho/revisao/route.ts`, com testes correspondentes. `package.json` inclui `test:cart` e as regressões do carrinho em `test:security`. Documentação atualizada em README, histórico de decisões e documentos 40/46/50.

Publicação: commit e push apenas dos arquivos da tarefa; `git pull --ff-only`, rebuild/recriação somente do app e conferência de saúde/HTTP. Sem migração ou alteração de dados comerciais. O estado produtivo será registrado após a conferência.
