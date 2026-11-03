# Vitaminas e identidade editorial dos suplementos

Em 03/11/2026, a seção **Vitaminas** foi ajustada para reconhecer as linhas multivitamínicas confirmadas Centrum Essencial, Adulto, Homem, Mulher, Select Homem e Select Mulher, mesmo quando o cadastro não contém a palavra “vitamina”. A identidade aceita apenas esses nomes e a apresentação em comprimidos; não se trata de uma regra para qualquer produto da marca Centrum. Nomes desconhecidos, kits e linhas adicionais dependem de conferência específica.

Fontes primárias consultadas:

- [Centrum Essencial](https://www.centrum.com.br/produtos/multivitaminicos/centrum-essencial/): o fabricante identifica o produto como suplemento vitamínico e informa embalagem de 30 comprimidos.
- [Multivitamínicos Centrum](https://www.centrum.com.br/produtos/multivitaminicos/): o fabricante reúne as linhas Adulto, Homem, Mulher, Select Homem e Select Mulher nesta família.

`vitamin-identity.ts` concentra a identidade editorial compartilhada pelo filtro e por `productTypeHint`. A forma “comprimidos” deixa de sugerir medicamento para essas identidades confirmadas. Termos explicitamente medicinais continuam prioritários. O hint é utilizado no cadastro ADMIN e na avaliação de marketing; não foi encontrado consumidor direto dessa função na ingestão de fornecedores. Nenhum registro ou classificação sanitária persistente é alterado automaticamente.

A seção continua aceitando nomes vitamínicos explícitos, incluindo o plural de multivitamínico e polivitamínico. Cosméticos com vitamina no nome, medicamentos, receita, Farmácia Popular e classificações incompatíveis não são incluídos por essa regra. Whey, creatina e suplementos proteicos não se tornam vitaminas; permanecem no departamento e na seção Suplementos conforme as regras existentes.

## Consulta e paginação

`getStorefrontProducts` consulta no banco os produtos ativos do grupo/categoria. Depois, aplica `matchesCatalogSection` ao conjunto completo em JavaScript, calcula a quantidade e só então pagina. Não existe um predicado SQL independente para a seção Vitaminas; o teste integrado cobre 31 itens sintéticos, sendo 28 vitaminas e 3 outros suplementos, em duas páginas, sem duplicação ou perda do Centrum.

A projeção de `getPublicCatalogSections` também carrega `requiresPrescription`, `prescriptionType` e `isPopularPharmacy`, para aplicar os mesmos bloqueios do filtro da listagem. Uma regressão com Prisma falso respeitando `select` cobre receita, Farmácia Popular e categorias nulas, vazias ou com espaços; categorias vazias não criam uma seção global.

Um GET público em `https://wimifarma.com.br/catalogo?grupo=vitamins` respondeu HTTP 200 e mostrou Centrum Essencial 30 comprimidos entre os produtos existentes. Esse é um diagnóstico anterior à publicação desta alteração local; não comprova que o novo filtro esteja em produção. Nenhuma escrita no banco, backend, SSH ou publicação foi executada nesta tarefa.

O GET de `?grupo=vitamins&assunto=vitamins`, também HTTP 200, trouxe apenas Equaliv Vitamina C 500 mg e as duas apresentações Dr.Good Vitamina C (Adulto e Kids). Isso reproduz a divergência relatada sem acesso administrativo. O departamento também contém nomes abreviados “Centrum 60/150 comprimidos”, kits e linhas focadas em benefícios; eles não foram todos convertidos em vitaminas por associação de marca.

## Limites

O reconhecimento é editorial e o hint é uma sugestão de cadastro. Não confirma EAN, composição, indicação, equivalência ou qualquer regra de receita/compra. Novas linhas e nomes incompletos permanecem fora da exceção até conferência em fonte primária. Preço, estoque, status, permissões e regras comerciais não foram alterados.
