# 12 - Carrinho, Checkout e Pedidos

## Escopo Entregue

- Carrinho persistente no navegador, com quantidade, remocao e resumo.
- Compra direta pela pagina do produto: `Comprar agora` adiciona a quantidade selecionada ao carrinho existente e abre o checkout.
- Checkout em quatro etapas: identificacao, entrega/retirada, pagamento e revisao.
- Entrega gratuita limitada a Ivate-PR e retirada na Wimifarma.
- Preferencias de pagamento: Pix, cartao na entrega/retirada e dinheiro.
- Pedido pendente no PostgreSQL, com snapshot de produto, preco e quantidade.
- Painel `/admin/pedidos` com busca, filtro, dados operacionais e transicoes controladas.

## Regras de Seguranca e Negocio

### Cesta Lateral e Cards (2026-09-13)

- O botao de cesta no cabecalho abre um painel lateral Radix Dialog sem navegar. Fecha por Escape, fundo, X e Continuar comprando; foco retorna ao gatilho e a rolagem da pagina e restaurada.
- Quantidade, remocao, subtotal e limite de estoque usam o mesmo CartProvider dos cards. Limpar tudo exige confirmacao. Lista possui rolagem propria; rodape oferece checkout e cesta completa.
- Cards reais da vitrine, catalogo e relacionados sao clicaveis em toda a area, exceto controles. Adicionar inclui uma unidade sem navegar; o contador altera o carrinho. Comprar preserva a quantidade ja escolhida ou adiciona uma unidade e solicita `/checkout`.
- Receita e Farmacia Popular continuam somente por atendimento. Produtos sem estoque nao podem ser adicionados. O carrinho limita 30 produtos diferentes e 20 unidades por produto, sujeito ao estoque.
- Selo de frete mostra a condicao de R$ 99,90 e consulta de CEP; nao amplia cobertura. Arraste dos carrosseis nao ativa o link de produto.

### Endereco e Continuidade (2026-09-13)

- `GET /api/cep/[cep]` consulta ViaCEP pelo servidor com 8 digitos, timeout de 6 segundos, host fixo, sem redirecionamentos e validacao da resposta. Retorna `data` com postalCode, street, neighborhood, city, state; erros JSON 422/404/503, sem dados internos.
- Consulta tem limite agregado por IP de 30/minuto. Respostas corretas tem cache publico de 24h; erros nao tem cache. Nenhum dado de cliente e enviado ao provedor, somente o CEP consultado.
- Formulario preenche rua, bairro, cidade e UF, preservando numero e complemento. CEP generico pode nao possuir rua/bairro. Falhas permitem preenchimento manual e nova consulta; respostas atrasadas de outro CEP sao ignoradas.
- Cidade/UF nao sao mais fixadas em Ivate. Front e servidor validam cobertura de CEP junto da cidade/UF; endereco fora da cobertura permanece visivel e pode-se optar por retirada.
- Etapas usam historico do navegador com hash validado. Voltar retorna a etapa anterior; dados obrigatorios impedem pular etapas.
- Rascunho fica somente em sessionStorage, separado pela identidade da sessao, com validade de 2h desde a ultima alteracao. Nao restaura consentimento. E removido apos sucesso confirmado. Sem acesso ao storage, formulario e carrinho continuam em memoria.
- Preferencia de pagamento usa radio acessivel e texto coerente com entrega/retirada. A selecao nao cobra nem aprova pagamento. Resposta vazia/invalida de pedido nao e tratada como sucesso.

### Auditoria Local

- `npm run test` inclui casos de rascunho, CEP, limites e cobertura no servidor.
- Com `npm run dev -- -p 3010`, executar `node scripts/shopping-flow-audit.mjs`. A auditoria aceita apenas localhost/127.0.0.1, monta sua fixture temporaria com criacao exclusiva e a remove no finally.
- Valida cesta, teclado, rolagem, estoque, cards, arraste, requisicao de navegacao para checkout, CEP, historico, recarga, consentimento e storage bloqueado em 320/390/768/1440 px. Submissao de pedido e simulada; nao grava no banco. Capturas ficam em `artifacts/shopping-flow`, ignorada pelo Git.

### Pagamento Online Pendente

- O lojista ainda nao possui gateway. Mercado Pago e PagBank foram comparados pelas paginas oficiais de checkout em 2026-09-13, sem contratacao ou integracao.
- A escolha definitiva exige conferir taxas efetivas da conta, parcelamento, prazo de recebimento, disponibilidade para a atividade e homologacao sandbox. Nenhuma credencial, cobranca ou migracao foi criada.

### Confirmacao de Pedidos

- O navegador envia o preco esperado apenas para detectar alteracao; o banco e a fonte de verdade.
- O servidor recusa produto inexistente, nao publicado, sem estoque suficiente, com preco alterado, com receita ou Farmacia Popular.
- `Comprar agora` nao aprova pagamento nem reserva estoque; apenas antecipa a navegacao para o mesmo checkout de pedido pendente.
- O pedido nasce `PENDING`, com pagamento `PENDING`, e nao reduz estoque automaticamente.
- Nenhum numero de cartao, CVV, senha bancaria ou chave Pix do cliente e solicitado ou armazenado.
- A equipe deve confirmar disponibilidade, total e atendimento antes de orientar o pagamento.

## Estados

Pedido: `PENDING`, `CONFIRMED`, `PREPARING`, `READY`, `OUT_FOR_DELIVERY`, `COMPLETED`, `CANCELED`.

Pagamento: `PENDING`, `PAID`, `CANCELED`, `REFUNDED`.

As transicoes permitidas ficam em `src/features/orders/checkout.ts`; saltos e alteracoes depois de estados terminais sao recusados pela API. A atualizacao usa o estado anterior como condicao para impedir sobrescrita silenciosa quando duas pessoas operam o mesmo pedido.

## Avaliacoes Verificadas

- Somente uma sessao de cliente com pedido `COMPLETED` pode avaliar um produto presente naquele pedido.
- Cada cliente possui no maximo uma avaliacao por produto e pode atualizar nota e comentario.
- A pagina publica mostra apenas avaliacoes publicadas, com nome abreviado e sem numero do pedido ou outros dados pessoais.
- A API limita nota, tamanho do comentario e frequencia de envios. Moderacao administrativa e denuncia de conteudo ficam para uma proxima fase se o volume justificar.

## Proxima Fase

Escolher e homologar gateway/adquirente, definir Pix dinamico, antifraude, conciliacao, estorno, nota fiscal, reserva de estoque, frete fora de Ivate e fluxo regulatorio para medicamentos com receita. Essa fase exige contrato, credenciais no servidor, revisao juridica e testes em sandbox antes de producao.
