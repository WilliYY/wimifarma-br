# 12 - Carrinho, Checkout e Pedidos

## Escopo Entregue

- Carrinho persistente no navegador, com quantidade, remocao e resumo.
- Compra direta pela pagina do produto: `Comprar agora` adiciona a quantidade selecionada ao carrinho existente e abre o checkout.
- Checkout em uma pagina: contato, entrega/retirada e pagamento, com tres colunas no desktop e fluxo vertical no celular.
- Entrega local em Ivate/Douradina ou retirada; transportadora depende de cotacao habilitada e embalagem revisada. Frete por transportadora gratuito a partir de R$ 99,90 em produtos apos cashback, inclusive outras cidades atendidas.
- Pix com QR Code por duas horas, cartao nos campos seguros do Mercado Pago e dinheiro somente na retirada/entrega local. Condicoes em `28-mercado-pago.md` e `32-checkout-e-confianca.md`.
- Pedido pendente no PostgreSQL, com snapshot de produto, preco e quantidade.
- Painel `/admin/pedidos` com busca, filtro, dados operacionais e transicoes controladas.

## Regras de Seguranca e Negocio

### Cesta Lateral e Cards (2026-09-13)

- O botao de cesta no cabecalho abre um painel Radix Dialog nao modal, sem navegar. Desde 2026-09-14, nao ha overlay, bloqueio de cliques, trava de rolagem ou ciclo de Tab: a loja continua acessivel com a cesta aberta. Clicar ou focar fora nao fecha o painel. Fecha por Escape, X, gatilho e Continuar comprando; o foco retorna ao gatilho.
- Em telas a partir de 640 px, a cesta fica na lateral direita em altura completa. Em telas menores, ocupa os 70% inferiores da altura visivel, com acoes compactas e rolagem propria, deixando a parte superior da loja acessivel. Quantidades sincronizam mesmo quando alteradas nos cards com o painel aberto.
- Quantidade, remocao, subtotal e limite de estoque usam o mesmo CartProvider dos cards. Limpar tudo exige confirmacao. Lista possui rolagem propria; rodape oferece checkout e cesta completa.
- Cards reais da vitrine, catalogo e relacionados sao clicaveis em toda a area, exceto controles. Adicionar inclui uma unidade sem navegar; o contador altera o carrinho. Comprar preserva a quantidade ja escolhida ou adiciona uma unidade e solicita `/checkout`.
- Receita comum classificada por ADMIN permite carrinho e pagamento sem upload; a receita deve ser conferida antes da dispensacao. Controlados, receita nao classificada e Farmacia Popular seguem atendimento. Contrato atual em `45-pedido-online-e-conferencia-de-receita.md`. Produtos sem estoque nao podem ser adicionados. O carrinho limita 30 produtos diferentes e 20 unidades por produto, sujeito ao estoque.
- Selo de frete mostra a condicao de R$ 99,90 e consulta de CEP; nao amplia cobertura. Arraste dos carrosseis nao ativa o link de produto.

### Endereco e Continuidade (2026-09-13)

- `GET /api/cep/[cep]` consulta ViaCEP pelo servidor com 8 digitos, timeout de 6 segundos, host fixo, sem redirecionamentos e validacao da resposta. Retorna `data` com postalCode, street, neighborhood, city, state; erros JSON 422/404/503, sem dados internos.
- Consulta tem limite agregado por IP de 30/minuto. Respostas corretas tem cache publico de 24h; erros nao tem cache. Nenhum dado de cliente e enviado ao provedor, somente o CEP consultado.
- Formulario preenche rua, bairro, cidade e UF, preservando numero e complemento. CEP generico pode nao possuir rua/bairro. Falhas permitem preenchimento manual e nova consulta; respostas atrasadas de outro CEP sao ignoradas.
- Cidade/UF nao sao mais fixadas em Ivate. Front e servidor validam cobertura de CEP junto da cidade/UF; endereco fora da cobertura permanece visivel e pode-se optar por retirada.
- Checkout atual remove hashes das etapas antigas e valida contato, endereco e consentimento na mesma pagina, antes do envio. Helpers antigos de etapas permanecem compativeis com rascunhos e auditorias anteriores.
- Rascunho fica somente em sessionStorage, separado pela identidade da sessao, com validade de 2h desde a ultima alteracao. Nao restaura consentimento. E removido apos sucesso confirmado. Sem acesso ao storage, formulario e carrinho continuam em memoria.
- Preferencia de pagamento usa radio acessivel e texto coerente com entrega/retirada. A selecao nao cobra nem aprova pagamento. Resposta vazia/invalida de pedido nao e tratada como sucesso.

### Auditoria Local

- `npm run test` inclui casos de rascunho, CEP, limites e cobertura no servidor.
- Com `npm run dev -- -p 3010`, executar `node scripts/shopping-flow-audit.mjs`. A auditoria aceita apenas localhost/127.0.0.1, monta sua fixture temporaria com criacao exclusiva e a remove no finally.
- Valida cesta nao modal, cliques e rolagem na loja com o painel aberto, saida por Tab/Shift+Tab, estoque, cards, arraste, requisicao de navegacao para checkout, CEP, historico, recarga, consentimento e storage bloqueado em 320/390/768/1440 px. Submissao de pedido e simulada; nao grava no banco. Capturas ficam em `artifacts/shopping-flow`, ignorada pelo Git.
- `node scripts/cart-live-audit.mjs` repete navegacao e interacao externa com a cesta aberta no site publicado, bloqueando todas as mutacoes de API; nao cria pedidos reais.

### Pagamento Online

- Mercado Pago / Orders e Bricks conectado e ativado em 01/10/2026 apos homologacao. Pagamento ocorre na finalizacao; preparacao continua humana.
- Pix e cartao possuem estados canonicos, reserva de estoque e conciliacao independente do navegador. Rotina, credenciais cifradas e limites em `28-mercado-pago.md`.

### Confirmacao de Pedidos

- O navegador envia o preco esperado apenas para detectar alteracao; o banco e a fonte de verdade.
- O servidor recusa produto inexistente, nao publicado, sem estoque suficiente, com preco alterado, controlado, com receita nao classificada ou Farmacia Popular. Para receita comum, grava a necessidade de conferencia no pedido; somente a equipe autorizada registra essa conferencia antes de pronto, entrega ou conclusao. Pagamento aprovado pelo gateway nao substitui avaliacao farmaceutica.
- `Comprar agora` nao aprova pagamento nem reserva estoque; apenas antecipa a navegacao para o mesmo checkout de pedido pendente.
- O pedido nasce `PENDING`, com pagamento `PENDING`. Pagamento online reserva estoque antes de chamar o gateway; aprovacao consome a reserva e cancelamento confirmado a devolve uma vez. Pedido manual mantem a operacao humana existente.
- A aplicacao nao recebe numero de cartao ou CVV; os campos pertencem ao Mercado Pago. Nao solicita senha bancaria ou chave Pix do cliente.
- A equipe confere pagamento confirmado, disponibilidade e atendimento antes da preparacao.

## Estados

Pedido: `PENDING`, `CONFIRMED`, `PREPARING`, `READY`, `OUT_FOR_DELIVERY`, `COMPLETED`, `CANCELED`.

Pagamento: `PENDING`, `PAID`, `CANCELED`, `REFUNDED`.

As transicoes permitidas ficam em `src/features/orders/checkout.ts`; saltos e alteracoes depois de estados terminais sao recusados pela API. A atualizacao usa o estado anterior como condicao para impedir sobrescrita silenciosa quando duas pessoas operam o mesmo pedido.

## Avaliacoes Verificadas

- Somente uma sessao de cliente ativo com pedido `COMPLETED` e pagamento `PAID` pode avaliar um produto presente naquele pedido.
- Cada cliente possui no maximo uma avaliacao por produto e pode atualizar nota e comentario.
- A pagina publica mostra apenas avaliacoes publicadas, com nome abreviado e sem numero do pedido ou outros dados pessoais.
- A API limita nota, tamanho do comentario e frequencia de envios. Moderacao administrativa e denuncia de conteudo ficam para uma proxima fase se o volume justificar.

## Cashback no Pedido

- Bonus de avaliacao de 1% sobre uma unidade liquida paga, uma vez por cliente/produto e sem condicionar a nota. Regras completas em `docs/16-cashback-avaliacoes-resgate.md`.
- Cliente pode selecionar o saldo na etapa Pagamento. O desconto reduz o total; servidor reserva saldo e distribui centavos pelos itens na mesma transacao do pedido.
- UUID da tentativa impede pedido/resgate duplicado em reenvio de clientes e convidados, inclusive pagamento manual. A chave e limpa apos sucesso para permitir nova compra identica.
- Painel de pedidos mostra desconto e estados Reservado, Utilizado e Devolvido. Cancelamento ou reembolso retorna saldo uma vez; pagamento online depende exclusivamente da confirmacao do gateway.

## Proxima Fase

Conferir medidas fisicas e operacao fiscal/postagem antes do envio; integrar etiquetas ou emissao fiscal somente com autorizacao especifica. Receita comum classificada usa cotacao com perfil logistico aprovado; controlados, receita nao classificada e Farmacia Popular seguem atendimento.
