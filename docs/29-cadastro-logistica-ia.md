# Peso e medidas no cadastro assistido

## Escopo e uso

O cadastro/edição de produtos possui a seção **Peso e medidas para frete**. A pesquisa existente de nome/marca/EAN também procura especificações logísticas, sem chamada adicional por tecla. O botão **Pesquisar peso e medidas** repete a pesquisa completa quando necessário.

1. Informe marca, apresentação, quantidade e EAN quando disponível. A mesma linha com outro tamanho/quantidade pode ter embalagem diferente.
2. Confira o peso bruto, comprimento, largura e altura apresentados com fonte e trecho da pesquisa. Campos sem evidência utilizável permanecem vazios.
3. ADMIN pode **Usar referências nos campos vazios**; valores manuais não são substituídos. Dados copiados da pesquisa são descartados se a identidade mudar, preservando os campos digitados manualmente.
4. Pese/meça a unidade pronta para envio, incluindo a proteção e caixa realmente usadas pela farmácia. As fontes normalmente descrevem apenas a embalagem comercial; a IA não sabe a embalagem adicional da loja.
5. Salve o produto. Os dados de frete ficam em rascunho, inclusive quando completos. Em **Fretes e entregas**, confira peso, medidas, conservação e aceitação antes de aprovar a embalagem e liberar o produto. A ativação geral do Melhor Envio continua separada.

Medicamentos podem ter medidas pesquisadas e cadastradas, mas continuam fora da cotação automática. Nenhum texto da IA altera receita, Farmácia Popular ou permissão de transporte. Colaboradores podem consultar referências no cadastro, mas somente ADMIN grava medidas.

## Critérios da pesquisa

- Medicamentos: caixa/frasco da concentração e quantidade exatas, nunca mg por comprimido como peso bruto.
- Perfumaria/higiene: frasco cheio com tampa e embalagem comercial; ml/L não são convertidos em g/kg. A densidade não é presumida.
- Fraldas: pacote fechado da linha, tamanho e contagem exatos. Tamanho da fralda aberta e faixa de peso do bebê não são dados de transporte. Divergência M/G/RN/etc bloqueia aplicação da referência.
- Alimentos e kits: distinguir unidade vendida, kit completo e caixa master. Não dividir caixa master nem multiplicar dimensões para estimar unidades.
- Fabricante e ficha técnica são priorizados; distribuidores/lojas com a apresentação identificada podem fornecer referências sujeitas a revisão. Fonte e trecho são mostrados por grupo de medidas. Não há garantia de disponibilidade, exatidão ou aprovação logística de uma página externa.
- Peso líquido, valores sem fonte, unidades desconhecidas, dimensões incompletas, eixos não identificados, conflito de apresentação e estimativas por foto/produto parecido não são usados. Não substituir divergências por média.

A estruturadora só recebe notas e fontes da pesquisa Google. Cada fato logístico exige índice de fonte válido, trecho presente nas notas e valores/unidades compatíveis com esse trecho. Conversões são determinísticas: kg → g e mm/m → cm, com limites do perfil de frete; valores não são arredondados para baixo. Isso reduz erros de estruturação, mas não certifica o conteúdo da página ou a interpretação da pesquisa: conferência física continua necessária. Trata-se de instruções, validação e pesquisa do assistente existente, não treinamento de um novo modelo.

## Persistência e autorização

- Reutiliza `Product.shippingProfile` JSON; sem migration ou nova dependência. Rascunho aceita medidas parciais e mantém referência, fontes e data; força `enabled: false` e `transportReviewed: false`.
- POST/PATCH de produtos aceita esse rascunho somente para ADMIN. Tentar gravar perfil aprovado pelo cadastro é rejeitado. A API existente de fretes permanece responsável pela aprovação.
- Omissão de `shippingProfile` mantém dados existentes. Mudança de identidade (nome/marca/EAN) invalida a liberação anterior e limpa a referência antiga. Edição de medidas também exige revisão novamente. Atualização otimista por `updatedAt`, transação e auditoria preservadas.
- O calculador continua exigindo perfil completo, revisão explícita e produto liberado. Rascunhos não alimentam cotações. A impressão/compra de etiquetas e emissão fiscal não foram alteradas.
- A pesquisa continua em duas chamadas Gemini, com limites de saída ajustados para as referências logísticas. Nenhuma pesquisa ou custo de IA adicional foi inserido na vitrine pública.

## Arquivos e validação

- Pesquisa/validação: `src/features/products/ai-suggestions.ts`, `src/features/shipping/product-reference.ts`, `product-draft.ts` e testes.
- Cadastro/persistência: `products-catalog-panel.tsx`, `product-shipping-fields.tsx`, schemas e APIs de produtos, página administrativa.
- Revisão de embalagem: `shipping-panel.tsx` e schema aprovado de frete, preservando referências.
- Prévia visual isolada: `npm.cmd exec -- tsx scripts/shipping-reference-preview.ts`, acessível somente em `127.0.0.1:3016`, com dados sintéticos, sem banco nem provedor. Encerrar após QA.

Em 01/10: 154 testes gerais e 16 de frete aprovados, incluindo referências sem fonte, dados líquidos, unidades, pacote diferente, conflito de EAN/tamanho, rascunho e bloqueio de gravação por perfis sem autorização. Lint, TypeScript e Prisma validate aprovados. Prévia do componente real no Chrome confirmou cópia para campos vazios, preservação do peso manual, descarte de dimensões copiadas ao trocar a identidade, rascunho desabilitado e ausência de edição para colaborador; sem transbordamento horizontal nas larguras móveis de 320 e 390 px. Auditoria npm mantém dois alertas altos preexistentes (`fast-uri` e `brace-expansion`); dependências não alteradas. Compilador nativo SWC bloqueado pelo Controle de Aplicativo do Windows; build local interrompido, sem alterar essa proteção.

Em 02/10: build Linux/Docker concluído com compilação, lint, tipos e geração de páginas. Commit funcional `4275b07` publicado; somente o serviço `app` foi recriado, sem migration. Imagem anterior preservada como `wimifarma-br-app:pre-shipping-ai-238623f`. Container saudável e `/api/health` com `ok: true` após a ativação. No Chrome, a seção publicada foi inspecionada e uma pesquisa real de “Óleo de Banho Dove Glicerinado 240ml” concluiu as duas etapas da IA. Ela retornou dados de catálogo e fontes, mas nenhuma referência logística utilizável: a interface informou a ausência e manteve peso/medidas vazios. Esse teste confirma o fluxo em produção e o comportamento quando faltam dados; não confirma medidas desse produto. O caminho com referências utilizáveis foi validado pelos testes e pela prévia com dados sintéticos. A seção publicada também foi inspecionada em viewport de 390 px: campos em duas colunas e largura de conteúdo igual à largura disponível, sem transbordamento horizontal; viewport restaurado após QA. Nenhum produto foi cadastrado ou alterado, nem frete/etiqueta comprado nessa validação.

## Referências

- [Melhor Envio — cotação e unidades da API](https://docs.melhorenvio.com.br/docs/cotacao-de-fretes).
- [Melhor Envio — peso com embalagem individual no cadastro](https://centraldeajuda.melhorenvio.com.br/hc/pt-br/articles/31220437601556-Como-cadastrar-meus-produtos-na-minha-plataforma-de-e-commerce).
- [GS1 — conteúdo líquido declarado](https://www.gs1.org/1/gtinrules/en/rule/266/declared-net-content).
- [GS1 — padrão de medição de produtos e embalagens](https://www.gs1.org/standards/gs1-package-and-product-measurement-standard/10).
