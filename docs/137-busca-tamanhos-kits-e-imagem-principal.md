# 137 — Busca, tamanhos, preço dos kits e imagem principal

## Busca e navegação

O cabeçalho acompanha o termo da URL; formulários internos são reinicializados quando o termo efetivo muda. A sequência EAN do sabonete → busca por fralda no cabeçalho → envio do campo interno não reaproveita o EAN anterior. Voltar/avançar atualiza os campos, sem apagar a digitação em curso numa URL que não mudou. O formulário do cabeçalho continua renderizado no servidor, com GET nativo para `/busca`; somente a sincronização sem DOM usa Suspense.

Consultas que mencionam fralda(s) podem expressar preferência pelos tamanhos RN, P, M, G, GG, XG e XXG. O tamanho exato antecede alternativas; `G` não equivale a `XG` nem à unidade de massa. A ordenação JavaScript e a consulta SQL compartilham essa preferência. Estoque/Avise-me, EAN, dosagens e busca por princípio ativo conservam suas regras existentes.

## Conta do kit perto da compra

A ficha de kits de sabonetes em barra com contagem e massa explícitas identifica o preço do kit, a quantidade de barras e o preço por barra arredondado em centavos. A economia compara o preço atual do kit com a mesma quantidade de avulsos da mesma marca, linha e massa, usando o menor preço equivalente elegível recuperado. O avulso precisa ter quantidade disponível suficiente. Apresentações ambíguas, kits mistos, líquidos, medicamentos e valores inválidos não geram essa conta.

Sem avulso equivalente ou economia positiva, a ficha não inventa desconto comparativo. Conteúdo declarado não vira peso de envio. O preço de checkout permanece o preço do SKU completo; o valor por barra é informativo. Não se aplicam descontos novos, Pix antecipado, comparação PMC ou alterações de preço/estoque.

Exemplo de regressão: kit com seis barras a R$ 11,00 e avulso a R$ 2,08 resulta em R$ 1,83 por barra, seis avulsos por R$ 12,48 e economia de R$ 1,48. A interface calcula com os preços vigentes; o exemplo não congela valores comerciais.

## Imagem do primeiro banner

O primeiro banner já tinha `priority` e preload responsivo. Acrescentou-se `fetchPriority="high"` somente à imagem dessa cena prioritária. Os demais slides conservam seu carregamento sem prioridade alta. Teste com Next Image real e Chromium/CDP reproduziu prioridade inicial Low antes da mudança e High depois, com uma única requisição da cena.

A comparação PageSpeed de 74/100 e 3,4 s para home, versus 95/100 e 2,9 s para a ficha, foi fornecida pelo lojista. Não é resultado de uma nova medição desta entrega nem garantia de uma pontuação após a alteração. Posição real, prioridade pública e carregamento final são conferidos separadamente do teste isolado.

## Arquivos e validação

- Busca: `site-search.tsx`, `catalog-page.tsx`, `busca/page.tsx`, `public-search.ts`, `search-catalog.ts` e regressões correspondentes, incluindo `search-navigation.test.ts`.
- Kits: `kit-pricing.ts`, `kit-pricing.test.ts` e `produto/[slug]/page.tsx`.
- Banner: `hero-product-stage.tsx` e `hero-product-stage.test.ts`.
- Documentação: este registro, README e histórico de decisões.

Integração local: 80 testes dirigidos e 503 de segurança aprovados; lint completo, typecheck e diff check passaram. Revisão independente aprovada, sem achados pendentes. Auditoria npm de produção mantém três alertas baixos e quatro moderados; completa mantém três baixos e 17 moderados, sem altos/críticos. Dependências não foram alteradas.

Publicado `300bd3888185116556c537b5a4ea449848895d1d` após build Linux ARM64, push/pull e atualização exclusiva do app. Home, health, busca e as duas fichas retornaram 200; a assinatura dos 15 relatos e o estado canônico permaneceram iguais, com PostgreSQL intocado. Imagem `sha256:47a7731b39d31962243f7470cd88ffaff6bb57335789302a50b6eaa7718d2562`.

QA pública em 390/1440 px passou: EAN → cabeçalho fralda G → envio interno e voltar/avançar preservaram o termo correto. Os itens com token G antecederam XG; o refinamento para nomes “Extra G” como XG segue a revisão em [138](138-fidelidade-catalogo-e-reconferencia.md). A imagem care foi encontrada acima da dobra em ambos os tamanhos, com preload e uma requisição de prioridade inicial High, sem promover outros slides. Não houve nova medição PageSpeed/Lighthouse.

Os preços públicos da conferência já eram R$ 10,90 pelo kit e R$ 2,06 pelo avulso: a interface mostrou seis barras, R$ 1,82 por barra, seis avulsos por R$ 12,36 e economia de R$ 1,46. A conta usa preços atuais, preservando o exemplo estático apenas como regressão. Zero erros de página/overflow real; mutações de fundo foram bloqueadas. Auxiliares e capturas ficam em `outputs/search-kit-lcp-2026-11-02/`, fora do Git.
