# 34 - Organização do painel de pedidos

## Apresentação operacional

`/admin/pedidos` aparece primeiro na navegação administrativa e separa os últimos 100 pedidos carregados em filtros de situação. A busca aceita número, cliente, telefone, produto, EAN e origem. Status, distribuidora e cidade de postagem combinam com a situação selecionada. Trocar a situação limpa apenas o filtro de status; a busca permanece.

- **Pedidos feitos:** pedidos `PENDING`, inclusive os já pagos que ainda aguardam confirmação operacional.
- **Em andamento:** pedidos `CONFIRMED`, `PREPARING`, `READY` e `OUT_FOR_DELIVERY`.
- **Concluídos:** pedidos `COMPLETED` sem cancelamento ou estorno financeiro.
- **Cancelados / estornados:** pedido `CANCELED`, pagamento `CANCELED`/`REFUNDED` ou tentativa online `FAILED`, `CANCELED`, `REFUNDED`/`DISPUTED`. Esses estados prevalecem na classificação visual para evitar apresentar um pedido financeiramente encerrado na fila de preparação.

Os contadores da tela representam somente os registros carregados pelo painel, não uma consulta integral ao histórico. Pedidos novos aparecem antes dos em andamento e encerrados; dentro da situação, os mais recentes vêm primeiro. A lista mostra até 30 linhas por página, com número, horário, cliente, quantidade restante, origens, estado operacional, pagamento e total. Cada linha expande seus detalhes por clique ou teclado. No celular, o botão **Filtros** recolhe os filtros extras e as situações têm rolagem horizontal. Os filtros não alteram dados, permissões, estoque, cashback ou transições do pedido.

## Fornecimento e EAN

Os detalhes mostram quantidade, distribuidora gravada no item e EAN selecionável. Não se escolhe novamente o fornecedor pela melhor oferta atual. O EAN vem da oferta vinculada somente quando o fornecedor corresponde ao snapshot; caso contrário, usa o cadastro do produto. Os rótulos **EAN da oferta vinculada** e **EAN cadastrado** identificam a fonte atual: não existe snapshot histórico de EAN neste modelo. Sem GTIN válido, aparece **Não registrado**.

**Por distribuidora** reúne os itens dos pedidos em aberto por origem, EAN normalizado e apresentação. Desconta faltas já registradas, mantém referências e quantidades por pedido e distingue unidades pagas das que aguardam confirmação. Exclui pedidos concluídos, cancelados/estornados e de homologação; incerteza financeira e reembolso parcial continuam identificados para conferência. Itens sem EAN não são fundidos. Estoque próprio fica em grupo separado. Essa visão organiza demanda: não comprova estoque da distribuidora e não envia compras.

## Aviso global

O cabeçalho contém um acesso a Pedidos com contador global de novos pendentes, para ADMIN, MANAGER e STAFF. `GET /api/admin/pedidos/resumo` autoriza antes de consultar o banco e devolve apenas contagem, último ID e horário, com `Cache-Control: private, no-store`. Conta pedidos operacionais PENDING, pagamento PENDING/PAID, manuais sem tentativa online ou online em produção, excluindo falhas, cancelamentos, estornos, contestação e reembolso parcial. Por isso pode diferir dos contadores dos últimos 100 registros.

O navegador consulta ao abrir e a cada 30 segundos em aba visível, sem requisições sobrepostas; tempo limite de dez segundos. A primeira consulta estabelece a referência. Um pedido posterior dispara aviso acessível e atualização da página atual. Falhas preservam a última contagem e mostram indisponibilidade. Nenhum dado do cliente segue nesse resumo. Não usa Codex, IA, permissão de notificações do sistema ou envio externo. Configuração de alertas da Miauby só aparece para ADMIN; o canal continua sujeito à configuração e conexão existentes em [30](30-miauby-whatsapp-comercio.md).

## Pagamentos e alertas

Pedidos por transportadora mostram no topo o **local de postagem** registrado na compra, com destaque de deslocamento para Umuarama ou outra cidade. O filtro de cidade ajuda a reunir as encomendas da viagem. Destinatário e postagem são separados; pedidos antigos sem local mostram confirmação pendente. Configuração, histórico e QA em [65](65-postagem-operacao-e-qa.md).

Cliente, atendimento, itens, postagem, receita e ações operacionais ficam nos detalhes expansíveis. O estado financeiro permanece na linha resumida. Referência e detalhes do Mercado Pago ficam recolhidos em **Detalhes do pagamento**, acessível por teclado.

Os avisos de homologação, confirmação incerta (`UNKNOWN`/`SUBMITTING`) e reembolso parcial ficam sempre visíveis. Estados incertos e reembolso parcial não são classificados como cancelamento. Pedidos de teste não podem avançar para preparação; pagamentos online continuam dependentes do provedor e das restrições existentes.

Cancelamentos e estornos online continuam no painel Mercado Pago, com conciliação posterior. O link de consulta abre a área de atividades da conta; não inicia cobrança nem reembolso. As ações existentes de andamento e pagamento manual e os controles da API não foram alterados. Contratos: `12-carrinho-checkout-pedidos.md` e `28-mercado-pago.md`.

## Validação

`admin-presentation.test.ts` cobre classificação e busca; `admin-supply.test.ts`, GTIN, origem e consolidação sem alterar pedidos. `admin-order-notice-{route,client}.test.ts` cobre autorização, resposta mínima, filtros, primeira consulta, atualização, falhas, visibilidade, timeout e limpeza. `admin-orders-ui.test.ts` usa 31 pedidos fictícios em 1440/390 px, CSS real, paginação, teclado, EAN, agrupamento, ausência de overflow e bloqueios financeiros. `shipping/posting-ui.test.ts` preserva a conferência da postagem acima do destinatário nos detalhes.

Datas de criação e conferência usam explicitamente `America/Sao_Paulo` no servidor e navegador. A conferência publicada detectou o erro React 418 e um ensaio reproduziu a divergência de texto com servidor UTC e cliente Brasília. O teste de hidratação em `admin-orders-ui.test.ts` falhou antes da correção e exige árvore preservada, sem erro recuperável. Referência oficial: [React 418](https://react.dev/errors/418). Não se oculta a divergência com `suppressHydrationWarning`.

Nenhum schema, regra financeira, dependência ou fluxo de gateway foi criado nesta mudança.

### Conferência de 22/10/2026

- Suíte completa: 1.037 testes aprovados. Segurança: 444 aprovados. Lint, typecheck, Prisma validate e build Next.js local aprovados.
- Após a correção de fuso, 21 testes direcionados passaram, incluindo SSR UTC + hidratação em Brasília no React de produção; lint e typecheck foram repetidos e aprovados.
- Inspeção visual sintética em 1440/390 px, com 31 pedidos e CSS do projeto: linhas compactas, detalhes por teclado, paginação, busca EAN e nenhum overflow horizontal. Os dados usados são fictícios.
- Auditoria `--omit=dev --audit-level=high`: zero vulnerabilidades. A completa mantém cinco HIGH na cadeia de desenvolvimento (`@next/eslint-plugin-next`, `braces`, `eslint-config-next`, `fast-glob`, `micromatch`), já registrada em [95](95-correcao-next-15-seguranca.md); nenhuma correção forçada ou dependência nova.
- Consulta somente de leitura confirmou `enabled/orderAlerts=true` e ponte HTTP 200 configurada, habilitada e conectada. Não houve pedido, cobrança ou WhatsApp real de teste nesta tarefa; conexão não comprova entrega de uma mensagem futura.
- Publicação exige build Linux, preservação da imagem anterior e atualização somente do app, seguida de health e 401 no resumo sem sessão. Sem migração ou reinício do PostgreSQL.
