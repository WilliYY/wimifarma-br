# 98 — Compra no celular e referência de caixa

## Interface de compra — 23/10/2026

- Carrinho em cards compactos: foto ou fallback, nome, preço, quantidade e remoção. Resumo com total e ação de continuar antes da consulta opcional de atualização do catálogo. Essa consulta continua exigindo revisão das diferenças antes de aplicar novos dados.
- Gaveta do carrinho limitada à altura da tela, com lista rolável e ação de finalizar acessível. Checkout com espaçamento menor no celular, cesta recolhível e valores que podem quebrar linha sem transbordar.
- O checkout começa sem forma de pagamento escolhida. Produtos, carrinho e total inicial usam o preço integral cadastrado. Escolher Pix aplica 3% nos produtos; escolher cartão ou outro meio restaura a base, respeitando os demais benefícios. Retomada de uma cobrança existente preserva seu snapshot. Não se alteraram gateway, confirmação de pagamento, reservas ou regras de receita.
- A conta no cabeçalho mostra primeiro nome no celular quando há espaço; em 320 px permanece um botão compacto. Minha conta, sair e Painel admin continuam acessíveis conforme a sessão e a matriz de permissões. A logo oficial e sua animação permanecem intactas.
- No celular há um único atalho flutuante de atendimento, a Miauby. A conversa oferece “Falar com a equipe no WhatsApp”; o link só abre quando acionado. Desktop preserva os dois atalhos. A compra e o botão Enviar da conversa não ficam cobertos.

## Catálogo, imagens e bandeiras

Catálogo e busca compartilham `CatalogProductCard`. Itens sem restrição reutilizam `PublicProductCard`, com foto cadastrada ou fallback existente. Produtos com receita exibidos por assunto continuam informativos e neutros, sem foto de embalagem, publicidade ou compra direta, conforme [93](93-busca-por-assuntos.md); passam a ocupar a grade, em vez de linhas que atravessavam todas as colunas.

O rodapé apresenta uma vez cada nome de bandeira normalizado. Os nomes conhecidos Elo, Elo Débito e Elo crédito representam a mesma marca visual. IDs de crédito/débito e catálogo do gateway continuam distintos; marcas diferentes não são agrupadas por compartilhar uma imagem. A arte Pix continua informando que o desconto depende da seleção no checkout.

Consulta somente leitura em produção encontrou 858 produtos não excluídos, 857 ativos e um rascunho; nenhum grupo de EAN normalizado a 14 dígitos repetido nem de nome e marca exatos repetidos. Isso não identifica toda possível duplicação semântica. Há 376 cadastros sem `imageUrl` ou `imageAssetId`; esta tarefa não atribui fotos de outra dose, fabricante ou apresentação, nem publica fotos em massa.

## Frete e caixa disponível

O lojista informou uma caixa de papelão de **24 × 15 × 10 cm** e pretende comprar tamanhos maiores. Não confirmou aferição externa/interna nem peso vazio: “creio que é isso mesmo”, “é bem pouca, é papelão”. Portanto, a medida é uma referência administrativa informada; a tara permanece desconhecida.

O painel de fretes oferece busca e páginas de 100 produtos para alcançar todo o catálogo, substituindo o corte silencioso nos primeiros 500. A referência de caixa pode ser copiada explicitamente para um rascunho individual, preservando o peso já preenchido e exigindo nova revisão/liberação. Não modifica perfis salvos em massa nem afirma que o produto cabe fisicamente.

Os perfis atuais descrevem uma unidade **já protegida**, com peso final estimado ou medido. Não são dimensões do conteúdo sem embalagem. Somar uma tara arbitrária duplicaria uma parcela desconhecida; reduzir todos os perfis à caixa nova poderia subestimar o frete. O provedor calcula os pacotes segundo os perfis existentes, sem inventário físico de caixas. Registrar a referência no admin não restringe automaticamente esses pacotes ao modelo comprado.

A integração nacional está habilitada; a consulta encontrou somente três perfis revisados/liberados, incluindo o rascunho. Os demais precisam de peso final, dimensões e revisão compatível com a carga e a transportadora. **Não foi liberado frete nacional para todo o catálogo.** A caixa, isoladamente, não fornece os dados necessários. Para concluir essa ampliação, registrar os produtos já embalados e confirmar as condições de transporte; um cálculo por conteúdo mais tara exige contrato distinto dos perfis legados. Entrega local, retirada, validação de CEP, serviços aceitos e snapshots de pedidos permanecem conforme [39](39-frete-automatico-e-embalagens.md) e [89](89-consolidacao-embalagens.md).

## Verificação e limites

QA utiliza clientes e produtos sintéticos, sem criar pedidos, cobranças, etiquetas ou mensagens reais. Abrange 320, 390, 430 e 1440 px, sessões CUSTOMER/ADMIN, foco/teclado, quantidade, rascunho, seleção Pix/cartão, fallback de imagem, grade neutra e bandeira Elo.

Comandos e resultados finais, capturas e conferência da publicação ficam em `outputs/mobile-compra-2026-10-23/entrega.md`, fora do Git. Não há mudança de schema Prisma, migração, preço, estoque ou configuração financeira nesta entrega.
