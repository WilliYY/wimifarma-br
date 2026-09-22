# SEO automático, lixeira de produtos e animação da marca

## Escopo autorizado — 2026-09-22

O lojista solicitou descoberta automática dos produtos atuais/futuros no Google, exclusão com histórico por dois meses e retorno da animação da logo.

## Contrato

- Todo produto publicado já recebe URL pública, título, descrição, canonical, dados estruturados e inclusão dinâmica no sitemap. Reforçar a apresentação desse funcionamento no admin e fornecer feed público atualizado para leitura programada pelo Merchant Center, sem enviar anúncios ou prometer aprovação/indexação.
- A Busca orgânica e o Merchant Center são diferentes: medicamentos podem ter página rastreável, enquanto o feed comercial conserva as regras de elegibilidade. Conexão inicial da conta Google e análise das políticas continuam externas ao site.
- Exclusão manda o produto para lixeira, arquiva ofertas vinculadas e libera sua posição na vitrine. Produto sai da loja, pesquisa e sitemap imediatamente. Nenhum produto existente é excluído como parte desta implantação.
- Retenção de **dois meses de calendário**, calculada em UTC, preservando o horário e ajustando para o último dia do mês quando necessário. O admin mostra o prazo exato no fuso de São Paulo.
- Restauração antes do prazo retorna como rascunho, preservando foto, preço e estoque, sem republicar promoções. Exclusão/restauração usam controle de concorrência e auditoria.
- Após o prazo, limpeza automática no processo Node de produção, a cada hora, em lotes limitados. Habilitada pelo Docker Compose; não executada em builds nem em QA local por padrão. Pedidos e lançamentos financeiros preservados; avaliações ligadas ao produto seguem a cascata existente, sem perder a possibilidade de estornar seus bônus, que usa o livro financeiro independente.
- Fotos da biblioteca são preservadas: podem estar compartilhadas ou usadas nos registros de compra. SKU/slug ficam reservados até a exclusão definitiva.
- A logo oficial completa permanece legível durante uma animação CSS leve. Movimento reduzido continua respeitado; sem GIF pesado ou momento mostrando apenas cruz.

## Critérios de aceite

Testes de calendário, concorrência, permissões, lixeira, restauração, prazo expirado, purga limitada e preservação de pedidos/financeiro. Conferência de páginas públicas, sitemap/feed e animação com/sem movimento reduzido. QA de admin com dados sintéticos, backup antes da migração aditiva, validações da stack e verificação pública após o deploy.

## Operação e testes

- `npm test`: calendário, versão/concorrência, autorização das APIs, restauração, purga e paginação do feed, incluindo páginas inteiras de itens inelegíveis e falhas no banco.
- `npm run audit:trash`: componentes reais com HTTP simulado, sem banco; cancelamento, falha/repetição e restauração em 320/390/768/1440 px.
- `npm run audit:trash:db`: exige `PRODUCT_TRASH_QA=1`, host `wimifarma-br-trash-qa`, banco vazio `trash_qa`. Usar exclusivamente container descartável em rede isolada. Confere CHECK, ofertas, restauração, purga idempotente, snapshots dos pedidos e preservação financeira. Nunca apontar para a base comercial.
- `node scripts/brand-ui-audit.mjs`: marca completa e animação normal/reduzida, cinco páginas e quatro larguras.
- `PRODUCT_MAINTENANCE_ENABLED=false` desliga o worker após reinício. Não existe botão para antecipar a exclusão definitiva. Após expirar, a restauração é bloqueada; remoção ocorre na próxima execução do worker disponível. Biblioteca de imagens e logs de auditoria ficam preservados.
- Google: cadastrar o sitemap no Search Console e a URL do feed como fonte programada no Merchant Center uma única vez. `GOOGLE_SITE_VERIFICATION` aceita o código de verificação HTML. Não é prova de que a conta foi conectada ou de que produtos foram aprovados.

## Validação local — 2026-09-22

- 153 testes passaram; lint, typecheck, build e validação Prisma aprovados. `npm audit --audit-level=moderate` com zero vulnerabilidades.
- Lixeira: cancelamento sem escrita, recuperação de erro e restauração como rascunho em 320/390/768/1440 px, sem overflow ou erro de JavaScript. Somente fixtures.
- Marca: cinco páginas × quatro larguras, seis campanhas com assinatura oficial, animação ativa no modo normal e estática com movimento reduzido. Nenhuma escrita comercial.
- Migration e publicação ainda dependem da conferência isolada no PostgreSQL e do backup operacional.

## Referências oficiais

- https://developers.google.com/search/docs/appearance/structured-data/product-snippet
- https://developers.google.com/search/docs/specialty/ecommerce/help-google-understand-your-ecommerce-site-structure
- https://support.google.com/merchants/answer/12158480?hl=pt-BR
- https://nextjs.org/docs/app/guides/instrumentation
