# Retorno à lista após o carrinho

O botão **Continuar comprando** da página do carrinho retorna à última lista pública visitada na mesma aba. Preserva busca, categoria, grupo, assunto, marca, ordenação, ofertas e página da URL, além da posição vertical. A ficha do produto e o carrinho não substituem essa origem; a visita a outro módulo encerra o contexto.

O estado é efêmero em `sessionStorage`, com validade de duas horas. Continua disponível depois de recarregar a ficha ou o carrinho e na aba aberta a partir de um produto da lista. Quando a nova aba usa `noopener` e não herda a sessão, o referenciador da lista na mesma origem recupera a URL com filtros e página; a posição inicial é zero. Sem referenciador completo nem sessão copiada, não é possível recuperar essa origem. Uma entrada externa sem origem confiável, estado vencido, inválido ou armazenamento indisponível retorna ao catálogo. Não há alteração em clientes, carrinho persistente, recompra, banco, preço ou disponibilidade.

Somente `/catalogo`, `/busca`, `/ofertas` e `/categorias/<slug>` são destinos permitidos. Parâmetros diferentes dos filtros públicos não são persistidos. URLs externas, protocol-relative, módulos privados e fragmentos são recusados. Nenhum parâmetro `from` é acrescentado aos links dos produtos.

A restauração de posição ocorre apenas no retorno explícito do botão e termina quando a posição é alcançada, após dois segundos ou quando o usuário interage. Navegação normal, nova pesquisa e voltar/avançar continuam sob controle do navegador/Next.js. Sem armazenamento, o link funciona com o catálogo como destino.

Regressões: `shopping-context.test.ts` valida destinos/expiração; `shopping-navigation.test.ts` executa os componentes reais em Chromium com roteamento isolado, dados sintéticos e sem acesso ao backend. Essa prova local não comprova publicação.
