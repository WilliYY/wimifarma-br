# Cadastro unificado de produtos

## Interface administrativa

Em 07/10/2026, o formulário de criação e edição do catálogo reúne identificação, descrição, termos de busca, prévia de SEO e medidas logísticas na mesma superfície. Todos os campos permanecem visíveis; os atalhos no início rolam até cada seção, sem abas que escondam conteúdo. Preços, estoque, publicação, regras comerciais e fotos continuam no mesmo formulário, em uma coluna lateral nas telas largas e abaixo nas telas menores.

O assistente central continua responsável pela pesquisa de nome, marca, apresentação, descrição, categoria, SEO e logística. Não há nova chamada, provedor ou botão de IA na seção de medidas. O preenchimento automático usa o caminho existente e preserva campos preenchidos; a substituição explícita de dados de catálogo mantém a confirmação existente e nunca substitui medidas manuais.

## Conferência e segurança

- Peso permanece em gramas (g), conforme o contrato persistente; comprimento, largura e altura permanecem em centímetros (cm).
- Fontes, trechos, estimativas, premissas e avisos permanecem junto das medidas. Falta de referência mantém os campos vazios.
- Trocar a identidade continua descartando medidas copiadas da pesquisa, preservando valores manuais.
- Somente ADMIN pode salvar medidas. Salvar mantém o rascunho e a revisão explícita em **Fretes e entregas**; o cadastro não aprova transporte.
- Os controles visíveis **Exige receita** e **Tipo de receita** foram retirados do cadastro a pedido do lojista. Produtos novos usam `requiresPrescription: false` e `UNREVIEWED`. Na edição, campos ocultos preservam a exigência e a classificação existentes quando a identidade permanece a mesma; troca de nome, marca ou EAN mantém a invalidação anterior. Colaboradores continuam sem enviar classificação administrativa. Essa mudança de interface não remove bloqueios comerciais existentes nem classifica receitas por IA.
- Farmácia Popular, cashback, preço, estoque e publicação preservam seus controles humanos existentes.

O contrato da pesquisa e da persistência continua em [29-cadastro-logistica-ia.md](29-cadastro-logistica-ia.md). Não há alteração de API, schema ou integração de pagamento.

## Validação

A prévia sintética existente `scripts/shipping-reference-preview.ts --catalog` permite conferir criação, aplicação da IA e troca de identidade sem gravar produtos ou chamar o provedor. Lint dos componentes e TypeScript verificam os contratos de composição; a inspeção visual deve incluir celular e desktop.
