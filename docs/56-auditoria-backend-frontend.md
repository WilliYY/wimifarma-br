# 56 — Auditoria de backend e frontend

Data: 08/10/2026. Código revisado: `57e292a`, com código executável de `415ecff` (o commit seguinte alterou somente documentação).

## Resultado e escopo

A separação entre rotas, componentes e módulos de negócio é adequada para a evolução atual. Prisma reutiliza cliente e pool, e pedidos, pagamentos, filas e webhooks têm índices e contratos próprios. A revisão não indica necessidade de reescrever a aplicação. Foram encontrados seis problemas delimitados, listados abaixo; esta entrega registra o diagnóstico, sem aplicar correções ao código executável.

Revisão independente de 34 arquivos de backend e 24 de frontend, complementada por inspeção de infraestrutura, consultas públicas e execução dos testes locais. Foram examinados pagamentos, estoque, frete, permissões, busca, cashback e checkout. Isso não representa revisão exaustiva de todas as linhas nem teste de invasão.

Nenhuma cobrança, etiqueta, mensagem ou pedido foi criado. A cesta existente foi preservada. A animação original da logo e as 128 bolhas do rodapé permanecem preservadas.

## Achados por prioridade

### 1. Alta — Revisão de checkout Asaas expirado não aparece no pedido

- Evidência: `src/features/payments/asaas-webhook.ts:133` registra `CHECKOUT_CANCELED` e `CHECKOUT_EXPIRED` como `REVIEW` no evento. `src/features/payments/asaas-commerce-service.ts:124` conserva o pagamento quando a consulta da sessão retorna lista vazia.
- Efeito: o pagamento comercial pode continuar pendente, com estoque reservado, sem pendência visível nem fluxo de resolução da inbox nas APIs administrativas examinadas. O teste de webhook em `asaas-webhook.test.ts:175` confirma o ramo de revisão.
- Confiança: comportamento comprovado no código; frequência em produção não medida.
- Correção recomendada: vincular a revisão ao pagamento/pedido, exibi-la ao administrador e oferecer resolução auditada após confirmação financeira canônica. Preservar a impossibilidade de criar outra cobrança diante de resultado incerto.
- Cuidado: expiração da sessão ou lista vazia não prova ausência de cobrança. Não liberar estoque nem cancelar automaticamente apenas por esses sinais; contratos nos documentos 51 e 53 exigem revisão.

### 2. Média — Busca pode abrir resultado da consulta anterior

- Evidência: `src/components/site/site-search.tsx:60` mantém resultados e seleção ao mudar a consulta; o indicador de carregamento só muda dentro do debounce. O Enter em `:141` pode usar essa seleção antiga.
- Reprodução: carregar resultados de “Dove”, trocar para “Nivea” e pressionar Enter antes de 240 ms. Simulação isolada, sem rede, navegou para o produto Dove com “nivea” como consulta atual.
- Correção recomendada: vincular resultados à consulta concluída, invalidar seleção ao editar e impedir envio enquanto a consulta atual estiver pendente.
- Validação futura: teste de interação com temporizadores controlados, incluindo Enter, resposta atrasada e navegação por teclado.

### 3. Média — Cashback anuncia valor diferente do desconto aplicado

- Evidência: `src/components/site/checkout-cashback.tsx:26` calcula o rótulo a partir do saldo e subtotal atuais. O valor selecionado fica separado em `checkout-page.tsx:44` e `:97`, atualizado pelo evento de seleção.
- Reprodução: saldo fictício de R$ 30, cesta de R$ 10, marcar cashback e aumentar a cesta para R$ 20 pelo painel lateral. A simulação isolada confirmou checkbox marcado e rótulo “Usar R$ 20,00”, enquanto resumo e envio conservam R$ 10,00.
- Correção recomendada: invalidar a seleção quando o subtotal mudar ou apresentar explicitamente o valor selecionado. Aumentar o resgate exige confirmação, sem ampliar o desconto silenciosamente.
- Validação futura: teste de interação alterando quantidade, preço e saldo com resgate selecionado.

### 4. Média — Ordem de bloqueio do estoque permite conflito entre transações

- Evidência: reserva ordena produtos em `src/features/payments/service.ts:52` e `asaas-commerce-service.ts:61`. Devolução conserva a ordem dos itens em `service.ts:117` e `asaas-commerce-service.ts:144`.
- Cenário: devolução de itens B/A concorrente com reserva A/B pode formar espera circular. PostgreSQL aborta uma transação para resolver o deadlock, com falha temporária ou conciliação adiada.
- Confiança: risco identificado pela ordem das operações; não foi reproduzido em PostgreSQL concorrente nem observado em produção nesta auditoria.
- Correção recomendada: adotar a mesma ordenação por ID em todas as reservas/devoluções e adicionar regressão concorrente em banco sintético.

### 5. Média — Limite do corpo de frete ocorre após leitura integral

- Evidência: `src/features/shipping/http.ts:13` chama `request.text()` antes de conferir o limite de 32.000 caracteres.
- Efeito: requisição excessiva pode ocupar memória antes de ser rejeitada. O limite também conta caracteres, não bytes. O impacto externo depende dos limites do proxy; não houve ensaio de sobrecarga.
- Correção recomendada: consumir stream com limite em bytes e cancelar a leitura ao exceder, reutilizando o padrão de leitura limitada existente nos pagamentos.
- Validação futura: corpo sem `Content-Length`, caracteres multibyte, envio em blocos e rejeição antes de ler o excedente.

### 6. Baixa — Cabeçalho duplica consultas de saldo

- Evidência: `src/components/site/site-header.tsx:136` e `:249` montam duas instâncias de `CustomerCashbackBalance`; CSS oculta uma delas. Cada instância em `customer-cashback-balance.tsx:8` executa consulta inicial, intervalo de 60 segundos e listeners próprios.
- Efeito: cliente autenticado gera consultas duplicadas no carregamento e nos eventos de foco, visibilidade e atualização do saldo.
- Correção recomendada: compartilhar uma única consulta/estado entre as duas apresentações, mantendo tratamento de falhas e descarte dos listeners.
- Confiança: duplicação comprovada no código; não foi demonstrado que ela causa lentidão perceptível.

## Validação local e lacunas

- Execução única de todos os 82 arquivos `.test.ts`/`.test.mjs` encontrados em `src` e `scripts`, sem duplicar suítes: **493 testes, 492 passaram, 1 falhou**, em aproximadamente 48 segundos. Inclui os 225 testes da seleção de segurança, que passaram.
- Falha: `src/features/miauby/commerce-cart-route.test.ts:130` exige `where.requiresPrescription === false`. A rota atual permite a classificação `ORDINARY` mediante a condição `OR`, conforme documento 45. A asserção sobre o formato antigo da consulta está desatualizada; o teste não comprova falha comercial nessa rota. Atualizar a cobertura para testar comportamento, incluindo classificação comum, não classificada, controlados e Farmácia Popular.
- `npm.cmd test` não inclui esse arquivo. `npm.cmd run test:miauby` inclui. O workflow `.github/workflows/security.yml` executa a seleção de segurança, mas não toda a suíte Miauby. Portanto, a CI atual pode passar sem detectar essa divergência.
- `npm.cmd run typecheck` e `npm.cmd run lint`: passaram nesta auditoria. A revisão de frontend também executou ESLint delimitado e 15 testes de rascunho, carrinho e recuperação: passaram, mas não cobrem os novos gatilhos descritos acima.
- Build e validação Prisma já passaram na entrega anterior do mesmo código executável. Não foram repetidos para esta entrega exclusivamente documental; não confundir esse reaproveitamento com uma nova execução de build.

## Dependências e segurança

Auditoria npm renovada nesta execução, com certificados do sistema:

- `npm.cmd audit --omit=dev --audit-level=high`: código 0, nenhum alerta de produção.
- `npm.cmd audit --audit-level=moderate`: código 1, cinco alertas high, zero critical, na cadeia de desenvolvimento: `braces`, `micromatch`, `fast-glob`, `@next/eslint-plugin-next` e `eslint-config-next`.

Os cinco registros da cadeia não equivalem a cinco explorações independentes comprovadas no site. Permanecem pendentes de correção compatível; a sugestão automática de trocar `eslint-config-next` para 14.2.35 não foi aplicada à stack Next 15. Não foi demonstrado acesso indevido, vazamento de segredo ou invasão. Testes de segurança aprovados não garantem ausência de vulnerabilidades.

## Produção e desempenho

Verificação de leitura em 08/10/2026:

- Checkout Git no servidor: `57e292a`. App `running healthy`, zero reinícios.
- Amostra pontual Docker: app CPU 0,01%, memória 383,4 MiB de 1,5 GiB; PostgreSQL CPU 1,86%, memória 33,88 MiB de 768 MiB. Isso não é monitoramento contínuo.
- Três requisições sequenciais por rota, medindo recebimento integral da resposta pela rede do computador:

| Rota | HTTP | Tempos em ms |
| --- | --- | --- |
| `/` | 200 | 397 / 111 / 130 |
| `/catalogo` | 200 | 119 / 107 / 148 |
| `/checkout` | 200 | 742 / 104 / 97 |
| `/api/health` | 200 | 67 / 65 / 75 |
| `/api/produtos/busca?q=dove` | 200 | 77 / 67 / 69 |

As amostras não mostram lentidão persistente de resposta. A primeira requisição inclui efeitos de conexão/aquecimento; não comprova sozinha problema de servidor. Não foram medidos Core Web Vitals, renderização em aparelho fraco, carga concorrente ou uso prolongado de memória.

Inspeção real no Chrome: home, catálogo e checkout em 390 px, sem transbordamento horizontal do documento e sem imagens carregadas com falha; checkout em 1440 px, três colunas visíveis e sem transbordamento horizontal. A preferência temporária de viewport foi restaurada. O console capturou mensagens de canal assíncrono encerrado, sem atribuição comprovada ao código do site; não foram classificadas como falha da aplicação.

O manifesto local mostra aproximadamente 165 KiB gzip nos arquivos relacionados à página do checkout e 207 KiB gzip nos da home. São conjuntos com arquivos compartilhados, incluindo CSS; não somar esses números nem tratá-los como transferência real ou JavaScript exclusivo de cada página. Servem como referência para futura medição de desempenho, preservando as animações aprovadas.

## Próxima implementação recomendada

1. Resolver a visibilidade e o fluxo seguro de revisão Asaas, com regressões financeiras e revisão independente.
2. Corrigir busca e cashback com testes de interação.
3. Uniformizar bloqueios de estoque e limitar o corpo de frete durante a leitura.
4. Unificar consultas do saldo, atualizar o teste Miauby e ampliar a cobertura da CI.
5. Tratar alertas das ferramentas quando houver atualização compatível; medir Web Vitals antes de atribuir lag a animações ou mudar o layout.

Todas as correções acima permanecem pendentes ao final desta auditoria. Não houve alteração de regras comerciais ou de configuração dos gateways.
