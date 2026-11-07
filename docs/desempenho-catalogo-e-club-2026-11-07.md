# Desempenho do catálogo e do Club — 07/11/2026

## Escopo

Otimização das consultas do Club, dos dados carregados por página e da resposta visual durante a navegação. Não inclui Redis, CDN externa, dependências novas, migrações ou alterações de produtos, preços, estoque, frete, receitas, pagamentos ou benefícios.

## Resumo do Club

- O layout público fornece um provider isolado pela identidade opaca da sessão. Não há cache global entre usuários nem persistência em navegador.
- Cabeçalho, banner e demais consumidores compartilham a leitura pendente do resumo. Um novo consumidor revalida; o resultado não fica congelado por TTL.
- Atualização explícita invalida a leitura antiga. Erros permitem nova tentativa; adesões simultâneas não repetem o POST.
- Mudanças de autenticação entre abas precisam suspender as leituras, descartar respostas antigas e conferir a sessão antes de reapresentar saldo. Essa proteção integra a revisão independente e os testes sintéticos.
- Os valores exibidos não substituem a validação autoritativa no checkout. Adesão, crédito, reserva, gasto e estorno mantêm as regras existentes.

## Seleção e hidratação por página

Filtros e ordenação editoriais continuam considerando o conjunto completo de candidatos. Aplicar `skip/take` diretamente nos produtos brutos mudaria a ordem por disponibilidade, preço comercial, doses e apresentações, além das facetas e da deduplicação por GTIN com identidades de consulta.

A seleção inicial passa a carregar a projeção necessária a essas decisões. A resolução comercial é compartilhada com a montagem do DTO; não se recriam regras de fornecedor ou de estoque. A consulta completa e a montagem dos DTOs ficam restritas aos IDs comerciais exibidos na página e aos relacionados efetivamente apresentados.

Fotos, coleção completa de dados da ficha e detalhes de cashback não precisam acompanhar todos os candidatos. Ofertas ainda recebem os campos CMED necessários à elegibilidade do desconto. Logística e classificação necessárias aos bloqueios permanecem na projeção.

Limites preservados:

- 24 itens por página no catálogo e na busca;
- indisponíveis depois dos compráveis, sem transformar saldo de distribuidor em estoque físico;
- facetas antes da paginação e do filtro de assunto;
- ordenação editorial, nome corrigido e preço comercial;
- deduplicação por GTIN contra todos os comerciais, inclusive os fora da página;
- ingredientes dos primeiros quatro resultados ranqueados como referência dos relacionados, independentemente da página aberta;
- revalidação atual de preço, quantidade, receita e transporte ao comprar.

Essa etapa reduz os campos completos e DTOs materializados. Não elimina a varredura global necessária aos filtros editoriais nem cria um cache persistente de preço/estoque.

A projeção e a hidratação são leituras separadas. Uma alteração de catálogo nesse intervalo pode mudar preço/disponibilidade do cartão ou remover um item da página. Não há promessa de snapshot transacional de contagem/ordenação; o cartão usa dados recentes e a compra continua revalidando as condições atuais.

## Carregamento e vitrines

`loading.tsx` nas rotas de catálogo, categorias, ofertas e busca usa o mesmo componente visual do servidor. Os blocos reservam a estrutura da listagem sem inventar produtos, preços ou disponibilidade. Há um único status acessível; os blocos decorativos ficam fora da árvore acessível. A pulsação respeita movimento reduzido.

O carregamento segue o streaming e os limites de erro/404 do App Router. O skeleton melhora a resposta percebida; não comprova redução do tempo de consulta.

O perfil da home identificou leituras de largura para calcular controles que não são exibidos nas vitrines com título compacto. Essas vitrines dispensam o cálculo e o observador desses controles; nas vitrines com setas, o estado só muda quando a disponibilidade da direção muda. Arraste, links e navegação por teclado permanecem os mesmos.

As animações aprovadas da marca e do rodapé são preservadas, assim como os limites de mídia, loops e preferências de acessibilidade.

## Verificação e limites

Os testes usam dados sintéticos, incluindo mais de uma página, indisponibilidade, demanda de distribuidor, identidade de consulta com GTIN duplicado fora da página e troca de sessão com resposta pendente. Validações integradas, revisão independente, inspeção visual e estado de publicação são registrados na entrega da tarefa.

As amostras de desempenho usam Chromium sem interface neste computador, com CPU móvel simulada em 4× e rede não controlada. São diagnósticos de laboratório, não medição de um celular físico ou garantia de percentuais de melhoria. Os arquivos de diagnóstico permanecem fora do Git, em `D:\Codex-outputs\wimifarma-br\storefront-performance-2026-11-07`.
