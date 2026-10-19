# 75 — Catálogo, vitrines e compra de distribuidor

## Pedido e alcance

Em 19/10/2026, o lojista solicitou catálogo administrativo compacto, seleção e edição em massa, separação visual das origens, login mais claro e três vitrines horizontais com fotografias reais. Autorizou também cobrar pedidos de distribuidor acima das quantidades observadas, assumindo a conferência humana posterior com fornecedor e cliente.

Esta entrega não importa novos EANs, não altera percentuais existentes, não renova ofertas e não transforma estimativas logísticas em autorização de transporte. ANB e Profarma continuam as únicas fontes comerciais homologadas. A DM foi solicitada para análise; seu acesso não equivale à integração comercial ativa.

## Administração e imagens

- Abas **Loja física** e **Distribuidoras** filtram `inventorySource`, sem mover ou misturar estoques. A seleção é limitada aos itens visíveis e descartada quando estes deixam o filtro.
- Linhas compactas usam o mesmo componente de imagem pública da loja, incluindo a caixa institucional apropriada quando faltar foto. Não publicam os originais privados de fornecedores.
- Edição em massa aceita até 50 itens por transação. Campos vazios permanecem intocados; prévia lista alterações e produtos antes da aplicação. Status e categoria são permitidos a ADMIN/MANAGER. Acréscimo e benefícios exigem ADMIN ativo.
- A API `PATCH /api/admin/produtos/lote` exige sessão, origem, JSON limitado e schema estrito. Revalida ator, versões e todos os produtos sob locks antes da primeira escrita; qualquer conflito ou falha de auditoria reverte o lote inteiro.
- Origem, estoque, receita, EAN, pedidos e saldos não são campos de edição em massa. Acréscimo exige origem distribuidor e as mesmas verificações de teto/oferta/pedidos abertos da edição individual. Benefícios não são ativados em produtos com receita ou Farmácia Popular.

## Loja e login

As coleções **Cuidados**, **MIP/OTC** e **Menores preços** comportam até 15 itens, com arraste e setas. Exigem foto pública local que exista e decodifique, disponibilidade válida e preço comercial positivo. Ilustração institucional, arquivo ausente/corrompido, receita e Farmácia Popular ficam fora das vitrines. MIP exige classificação explícita consistente; não é inferido pelo nome. Produtos sem fotografia continuam nas pesquisas e categorias.

A rotação é determinística pelo dia de Brasília; o preço promocional/comercial decide os 15 menores preços. Os cinco mais baratos mantêm prioridade, e os demais mudam de posição diariamente mesmo sem preços empatados. Acervo escasso gera menos itens e não cria três faixas idênticas. A página não inventa fotos nem classificações para completar 15 posições. Categorias dos atalhos usam grupos reais e preço crescente antes da paginação, incluindo medicamentos classificados em subcategorias. Grupo sem categoria disponível mantém consulta à equipe.

Login e cadastro usam modos separados no mesmo painel, campos legíveis, confirmação de senha e botão de mostrar/ocultar. Preservam Auth.js, Google, validação, retorno seguro e atalho administrativo. Falha de rede libera nova tentativa sem apagar campos.

Foi removido somente o parágrafo informativo de conferência de receita da área de compra. Classificações, atendimento assistido de controlados/Farmácia Popular e anexo privado obrigatório para antimicrobianos permanecem no servidor e checkout.

## Demanda de distribuidor e preservação histórica

A oferta continua exigindo EAN/apresentação, disponibilidade positiva, custo, percentual, teto aplicável e observação válida de até 24 horas. Quantidade conhecida zero e oferta vencida impedem compra. Quando o fornecedor informa disponibilidade sem quantidade exata, o saldo continua desconhecido; não se grava estoque fictício.

Para novos pedidos, a cota observada deixa de ser o limite comercial de unidades. O DTO fornece a capacidade de compra ao carrinho sem expor custos. O painel diz **quantidade a conferir**, sem afirmar que existem 999 unidades. Há guarda técnica de **999 unidades por item**, 30 itens distintos e subtotal máximo de 600.000.000 centavos, para limitar processamento e valores; isso não comprova estoque infinito.

A migração aditiva `20261019210000_supplier_demand_policy` acrescenta `OrderItem.supplierDemandAllowed`, com padrão `false`. Novos itens de distribuidor recebem `true`; pedidos antigos preservam a política de cota anterior. Reserva, validação de pagamento e cancelamento usam o snapshot persistido. Cotas, reservas e consumo existentes não são reiniciados, e estoque físico continua limitado às unidades reais. Preços históricos não são recalculados.

Cotação nacional mantém o limite já existente de até 20 volumes unitários. Acima disso, a interface informa necessidade de embalagem consolidada e cálculo pela equipe, antes de expandir produtos em memória ou chamar a transportadora. Não se inventa embalagem para liberar frete. Retirada e entrega local continuam sujeitas às respectivas regras existentes.

## Integrações e evidências

No Gmail `wimifarma@gmail.com`, foi conferida a confirmação GrupoSC de 18/10 e a página **E-mail confirmado / Sua solicitação foi enviada**. Não foi localizada resposta Profarma na pesquisa delimitada, inclusive `in:anywhere profarma`, em 19/10. Não houve resposta a mensagem inexistente, contratação, aceite de termos ou envio de credenciais. O cofre contém o registro DM ARTHUR; o titular confirmou a identidade e informou que fornecerá o site depois. Nenhuma credencial DM foi extraída ou armazenada nesta etapa.

Validação: testes de schema, atomicidade, permissões, demanda e histórico, foto truncada, categorias e rotação; Chromium para login e lote; revisão independente dos guards financeiros e decodificação de fotos. O script `scripts/catalog-upgrade-db-audit.ts` aceita somente o banco sintético `wimifarma_br_catalog_qa_20261019`, com modo explícito, e reverte seus dados ao terminar. Resultados finais de build, banco e publicação devem ser registrados após execução; esta seção não antecipa aprovação produtiva.

Validação local concluída: 819 testes gerais e 385 de segurança aprovados; após o último ajuste de rotação, os cinco testes da coleção passaram novamente. Typecheck, Prisma validate e build passaram. Auditoria de produção: zero alertas. Auditoria completa: cinco high na cadeia de desenvolvimento ESLint/fast-glob/micromatch/braces já registrada no documento 42, sem atualização forçada. Revisão independente aprovou controles financeiros, snapshot histórico e correção da decodificação de fotos; uma segunda inspeção aprovou a rotação sem exigir empate de preços.

Arquivos principais: `products-catalog-panel`, `product-bulk-editor`, `customer-auth-page`, `home-page`, `home-product-carousel`, `home-collections`, `home-photos`, `storefront`, API de lote, `quantity`, carrinho/checkout e inventário de fornecedor. Schema/migração, testes e scripts QA acompanham os fluxos. README, arquitetura, pendências e histórico de decisões referenciam este contrato.

Comandos: `npm.cmd run test:all`, `test:security`, `typecheck`, `lint`, `prisma:validate`, `build`; `npm.cmd audit --omit=dev --json` e auditoria completa. Auditoria visual usa componentes reais, CSS compilado e dados sintéticos em 390/1.280 px, com chamadas externas e escritas bloqueadas; não demonstra envio de e-mail, pagamento ou estoque reais.

## Publicação — 19/10/2026

Código `02ecef6` enviado ao GitHub e aplicado no servidor oficial. Builds Docker `app` e `migrate` concluídos, backup validado e imagem anterior preservada. Todas as migrações passaram primeiro no banco sintético dedicado. O primeiro acesso ao QA foi recusado pela guarda de URL por parâmetros extras de conexão; o bootstrap passou a remover esses parâmetros somente da URL derivada do QA. Nenhuma migração produtiva foi aplicada nessa tentativa recusada.

O ensaio PostgreSQL seguinte aprovou lote atômico, conflitos de versão, permissões, auditoria com falha SQL, reserva de 150 unidades sobre observação de 100/cota 5, política histórica e cancelamento idempotente. Executou também `createCheckout` real no banco sintético: 150 unidades, política persistida no item, preço correto e pagamento pendente, sem gateway ou fila de mensagem. Fixtures foram revertidas e o banco dedicado foi removido após conferir seu nome e marcador de propriedade.

A migração produtiva acrescentou o campo com padrão `false`; o app foi recriado e está saudável. Hashes antes/depois confirmaram preservação de produtos, ofertas, pedidos, itens anteriores, clientes e reservas. O hash de itens exclui apenas a coluna nova; consulta separada confirmou que nenhum item histórico recebeu a nova política.

Seis rotas públicas retornaram HTTP 200; a API de lote anônima retornou 401 com `private, no-store` e `noindex`, sem expor custos nos resultados públicos. Home e login novos foram conferidos no Chrome conectado. A home real apresentou **7 itens em Cuidados e 9 em Menores preços**, sem imagem carregada quebrada, erro JavaScript ou transbordamento horizontal. Não havia MIP/OTC com foto e classificação elegíveis; a respectiva coleção permanece preparada, sem criar itens artificiais.

O script visual aprovou 14 capturas em 390/1.280 px, com imagens sintéticas claramente identificadas, UTF-8 e CSS atual. O aviso automático de carrinho foi abortado no fixture; nenhuma escrita de rede ou requisição externa foi concluída. Artefatos locais estão em `outputs/catalogo-vitrine-2026-10-19/` e não foram versionados.

Limite da evidência: a credencial disponível não foi aceita para a entrada ADMIN no BR; a tentativa de usar uma sessão já aberta no outro perfil do Chrome encontrou timeout de acesso. Não houve troca de senha nem alteração de conta. O fluxo administrativo autenticado foi comprovado em QA, e suas proteções anônimas foram conferidas em produção; não foi alegada edição real de produtos na conta produtiva. Não houve pedido, pagamento, etiqueta ou comunicação real para testar a entrega.
