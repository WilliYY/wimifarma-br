# Fotos públicas conferidas e ofertas eGAM

## Escopo autorizado em 19/10/2026

O titular pediu fotos reais para os dermocosméticos e itens de higiene/perfumaria sem imagem, incluindo os próximos cadastros, e autorizou comparar ofertas comerciais do eGAM. ANB e Profarma continuam prioritárias para consulta; DM e GAM também podem concorrer pelo menor custo elegível do **mesmo EAN/apresentação**. SantaCruz permanece referência de identidade/imagem nesta etapa.

O lote publicado contém as 44 imagens que faltavam na ampliação do documento 77: 36 fontes oficiais Nivea e oito arquivos Profarma vinculados por EAN a Vichy, La Roche-Posay, Neutrogena e ISDIN. Revisão visual, fonte, horário e hashes ficam nos artefatos privados da operação e na auditoria de publicação. O publicador gera WebP de até 640 px, sem ampliar, limitado a 100 KB; imagens já existentes não são substituídas.

### Apresentações e atualidade

- Soft EAN 42110200 mantém o cadastro de 48 g: a tampa da foto oficial declara 48 g. O seletor da página informa 50 ml; essa divergência é registrada sem conversão de unidades.
- Esfoliante EAN 4005808808243 tinha título de 200 g. O título é corrigido para **Esfoliante Corporal Nivea para Banho 204 g**, conforme o rótulo legível da foto oficial ligada ao EAN. O seletor oficial de 200 ml é registrado como divergente, sem afirmar equivalência entre massa e volume. A correção não altera EAN, ofertas, estoque, classificação ou preços de pedidos.
- ISDIN Coverage mantém as fotos das apresentações de **30 g** cadastradas. Fotos atuais de 50 ml e embalagens de outros países não substituem essas apresentações.
- As fontes foram consultadas nesta rodada. Isso comprova a imagem oferecida pela fonte e sua correspondência revisada; não comprova qual desenho gráfico estará em cada unidade física enviada. Revalidar quando fornecedor/fabricante indicar mudança de embalagem ou apresentação. Imagem não é atualizada pela rotina de preços.

## Regra para os próximos produtos

Novos produtos de distribuidor sem receita entram em `DRAFT`, preservando a comparação de ofertas. Publicação exige capa da biblioteca pública, associação explícita revisada por ADMIN e prova de auditoria ligada à identidade atual, classificação, origem, capa e galeria completa. Produtos físicos classificados como higiene/perfumaria também exigem essa conferência ao publicar. Rx/Farmácia Popular continuam nos contratos sanitários existentes.

O publicador aceita `publishOnApproval:true` somente após a revisão própria do lote e grava foto, status e auditoria atomicamente. O padrão é `false`. Importação de preço não ativa produto nem publica foto. O publicador preserva capas e galerias existentes, mesmo em rascunho; revisão de uma foto existente exige ação ADMIN explícita.

Criação, PATCH, publicação em massa e classificação compartilham a validação. Alterar galeria ou capa exige ADMIN; editar apenas preço não equivale a aprovar foto. Uma mudança de identidade invalida a aprovação anterior. PATCH admite `photoReviewConfirmed:true` para revisão explícita da mesma foto; o campo não é persistido como autorização genérica. Preço/estoque de produtos ativos legados continuam editáveis sem despublicação retroativa.

## GAM e comparação de preços

`SupplierCode.GAM` é uma extensão aditiva. O importador aceita até quatro fontes distintas: `ANB`, `PROFARMA`, `DM` e `GAM`. Não usa o texto `eGAM` nem `SANTACRUZ` como códigos comerciais. A interface administrativa exibe GAM/eGAM.

Foram conferidas oito ofertas Nivea no eGAM, pelo EAN e apresentação exatos. O custo usado é **Líquido + Imposto**, sem somar ST novamente. A observação ocorreu em **19/10/2026 às 22h19m05s de Brasília**, com validade máxima de 24 horas. Quantidade não informada fica `null`; estoque baixo não vira quantidade inventada. Ofertas com mínimo/progressivo não comprovadamente atingido e apresentações divergentes foram excluídas.

O lote de preços contém apenas essas oito ofertas GAM. Não renova observações ANB/Profarma, não repõe cotas e preserva o percentual ADMIN atual por produto. O menor custo elegível recalcula o preço público; valores já registrados em pedidos permanecem imutáveis. A regra de ST observado da Profarma para medicamentos continua no documento 78.

Não foi instalado coletor independente, enviado pedido ou ativado transporte. A automação existente permanece **PAUSED**. Novas consultas exigem acesso normal e observação real; sessão indisponível não renova validade.

## Verificação e implantação

Código `b6453ea` publicado em 19/10/2026, com migração aditiva GAM e aplicação por ADMIN ativo após backup, QA sintético e dry-run sem escrita. Revisão independente aprovou as correções de aprovação incidental, mudança de identidade e troca de galeria. As 44 fotos, oito ofertas e uma correção de título produziram 53 registros auditados.

A conferência de produção preservou por hashes todos os preços-base e percentuais, estoque físico, ofertas anteriores (inclusive datas/cotas), pedidos, usuários, clientes, reservas, assets e auditorias preexistentes. O total permanece **377 produtos, 375 ativos**. Os **304 itens da ampliação agora têm capa pública**. O banco QA sintético foi removido após conferir seu nome e marcador exclusivos; evidências privadas foram preservadas. Nenhum pedido, pagamento, etiqueta ou mensagem comercial foi criado.

Validação fresca:

- `npm.cmd run test:catalog-photos`: 35 testes; `test:suppliers`: 99; `test:security`: 400. Algumas regressões de foto também fazem parte da suíte de segurança; as contagens não representam testes únicos somados.
- `npm.cmd run lint`, `typecheck`, `prisma:validate`, `build` e `git diff --check`: aprovados. Build Docker da versão exata também aprovado.
- Auditoria `npm.cmd audit --omit=dev --audit-level=high`: zero alertas. Auditoria completa conserva cinco alertas high de desenvolvimento em `braces`, `micromatch`, `fast-glob`, `@next/eslint-plugin-next` e `eslint-config-next`, já registrados anteriormente; não foram ocultados nem corrigidos fora deste escopo.
- HTTP público: 44/44 arquivos WebP retornaram 200 e tamanho permitido; 44 páginas de produto contêm a capa correta. Revisão de carrinho para os 44 itens retornou imagem e preço esperados. Home e catálogo retornaram 200. Nivea Men Defende 200 ml passou de R$21,22 registrado para **R$20,02**, com o percentual ADMIN preservado.
- A revisão visual dos arquivos foi concluída. A conferência visual final no Chrome ficou limitada por falhas da conexão da extensão; a confirmação pública acima é por HTTP/renderização HTML e API de revisão do carrinho, sem alegar sessão visual concluída.

Arquivos principais: `photo-publication-policy.ts` e regressões, APIs de produtos, serviços de publicação em massa/classificação, importador/publicador e seus testes, schema/migração Prisma e configuração de fornecedor ADMIN. Contratos atualizados em README, documentos 07, 68 e este documento. Os artefatos de fonte, custo e operação em `outputs/fotos-gam-2026-10-19/` ficam fora do Git e do build.
