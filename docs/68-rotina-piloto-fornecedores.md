# Rotina do piloto de fornecedores

## Escopo aprovado em 18/10/2026

Somente ANB e Profarma abastecem o catálogo neste piloto de losartana potássica 50 mg. GAM e SantaCruz são referências opcionais de identidade, descrição e imagem; não fornecem ofertas comerciais nesta etapa. A API e o importador recusam essas referências como fornecedores ativos. O simulador manual permite comparar GAM sem publicar seus dados.

O catálogo usa um produto por GTIN/apresentação, acréscimo de 60% sobre o custo final unitário e teto conservador conferido na tabela oficial. Não confundir acréscimo com margem líquida. Embalagem de distribuição não é quantidade disponível. Sinais como `+100` não são convertidos em saldo exato. A cota do piloto permanece em até cinco unidades por oferta, descontando reservas e unidades consumidas, sem renovação automática.

Produtos físicos continuam `PHARMACY`; importação não altera seus preços, fotos ou estoque e recusa EAN que já pertença a essa origem. O Teuto físico existente deve ser preservado até revisão manual de seu EAN, sem criar cópia externa. Não publicar Legrand ou Eurofarma com indisponibilidade observada em ambas as fontes.

## Conferência e atualização

1. Entrar normalmente nas sessões autorizadas da ANB e Profarma. Usar somente credenciais específicas do fornecedor, sem gravá-las em JSON, código, logs ou documentação. Não contornar bloqueios de navegador, CAPTCHA ou avisos de segurança.
2. Pesquisar os EANs publicados; conferir nome, fabricante/marca, dosagem, número de comprimidos e possibilidade real de comprar. Na ANB, usar **Unit c/ST**; na Profarma, **Preço final** já inclui o ST exibido. Não somar ST duas vezes. Pesquisa apenas pelo nome pode omitir resultados; confirmar EAN exato e paginação.
3. Registrar horário real da observação e validade positiva de no máximo 24 horas. Se a consulta falhar, não atualizar os horários. Uma oferta vencida se torna indisponível automaticamente; indisponibilidade confirmada deve atualizar `available:false` e saldo zero, sem excluir o cadastro.
4. Preparar JSON privado com os EANs já aprovados e as duas fontes no máximo. Não usar esse procedimento para publicar automaticamente EANs novos. Preservar `externalCode` existente: no piloto original, o código Profarma foi registrado como EAN, mesmo quando o portal também mostra outro código interno.
5. Executar `scripts/import-supplier-pilot.ts --file <arquivo privado> --actor-id <ADMIN ativo>` sem `--apply`. Conferir plano, preços e disponibilidade. Depois executar o mesmo comando com `--apply`.
6. O importador trava o catálogo/produto/ofertas, rejeita identidade divergente e observação antiga/futura/vencida, mantém cotas existentes, reservas e unidades consumidas, considera outras ofertas ainda válidas e registra auditoria. É permitido indisponibilizar produto existente sem uma alternativa vendável. Produto novo exige oferta válida.
7. Conferir busca pública, página de produto e revisão de carrinho, sem criar pedido, pagamento ou compra no fornecedor. A aquisição e a conferência farmacêutica continuam humanas.

## Horários e limites da automação

Foi solicitada rotina **todos os dias às 8h, 12h e 17h, horário de Brasília**, vinculada a esta conversa no Codex. Identificador: `atualizar-piloto-de-losartana-wimifarma`. A automação deve ficar silenciosa sem mudança acionável; avisar falha de acesso, mudança relevante de preço/disponibilidade ou necessidade de intervenção.

Essa rotina depende do computador, Codex e navegador autorizados e disponíveis. Ela não é um conector independente rodando na VPS. Se a sessão falhar, não prolongar ofertas nem informar sincronização bem-sucedida. Para operação independente do computador, será necessário obter arquivo/API/EDI autorizado de cada fornecedor ou um executor dedicado com sessões e monitoramento próprios. Isso não foi instalado nesta etapa. Não ligar consultas de portais ao laço de manutenção de pagamentos.

Não transmitir pedidos, efetuar pagamentos, enviar mensagens, substituir fabricante/apresentação nem renovar cotas automaticamente. Segredos e custos negociados ficam fora do Git e do contexto Docker de build. Dados de um fornecedor não comprovam saldo de outro.

## Fotos internas

Conferir marca, dosagem e quantidade visíveis na embalagem antes de associar ao EAN. URL do distribuidor não comprova autorização comercial nem que a arte é a versão mais recente; registrar a origem e não afirmar atualidade gráfica sem comprovação. Não gerar ou redesenhar embalagem de medicamento.

As fotos de medicamentos com receita deste piloto ficam **somente no ADMIN/MANAGER**, fora de `public`, por regra sanitária já documentada no catálogo. O site público mantém representação neutra e a compra normal de receita comum, com conferência farmacêutica antes da dispensação. URLs internas também são removidas das respostas públicas, avaliações e dados enviados à IA.

`preparePrivateSupplierImage` valida sem gravar, inclusive no dry-run. `storePrivateSupplierImage` gera WebP de até 352 px, sem ampliar, limitado a 100 KB. `internalImage` no JSON aceita caminho local, MIME, EAN correspondente e URL HTTPS de origem. O importador registra hash SHA-256 da fonte, dimensões, tamanho e URL privada na auditoria. O arquivo de rotina de preços deve omitir `internalImage` se não houver foto nova conferida.

Persistência: volume exclusivo `wimifarma-br-private-supplier-images`, montado em `/app/var/private-supplier-images`, diretório 700 e arquivos 600 pertencentes ao UID 1001 da aplicação. A imagem de ferramentas gera o cliente Prisma no build; executar a importação com `--user 1001:1001` e esse volume montado, depois de sua inicialização pela aplicação. Assim os arquivos são criados com o proprietário correto. Incluir esse volume no backup operacional. Não copiar imagens para uploads públicos.

Leitura `/api/admin/fornecedores/imagens/[uuid].webp` exige sessão ADMIN/MANAGER e usa `private, no-store` e `nosniff`. Upload autenticado usa limite de corpo, origem e auditoria. Validação de produto impede mover uma URL interna para estoque próprio ou produto sem receita. Erros de armazenamento retornam falha operacional, sem expor caminhos ou segredos.

## Evidências e pendências

### Peso e frete

O cálculo existente envia peso em kg a partir de `weightGrams`, dimensões em cm e valor segurado ao Melhor Envio, uma unidade embalada por volume. Não usa preço fixo por peso nem inventa encaixe de vários itens numa caixa. Peso, cubagem, CEP, serviço e quantidade afetam a cotação. Mudar perfil/quantidade/preço invalida a cotação assinada; a preparação externa não é contada duas vezes.

O titular pediu incluir peso e dados de envio em 18/10. Ainda não há medidas verificadas da embalagem pronta das novas apresentações nas fontes consultadas. Não converter dose de 50 mg, quantidade de comprimidos, caixa de distribuição ou dimensões em pixels da foto em peso logístico. Não habilitar automaticamente transporte nem copiar uma estimativa de 30 comprimidos para 60 como se fosse medição. Aguardam-se peso total e dimensões externas da embalagem real, ou fonte confiável correspondente, e revisão do transporte no ADMIN. Retirada e entrega local seguem as regras atuais.

`scripts/supplier-shipping-pilot-audit.ts --actor-id <ADMIN ativo>` executa somente cotações diagnósticas de quatro embalagens hipotéticas em dois CEPs públicos, variando peso e volume. Não grava perfil, pedido, pagamento ou etiqueta; não comprova medidas reais do produto nem cobertura nacional. Para medicamentos, mantém apenas serviços postais configurados já permitidos; cotar outra transportadora não significa aceitação da carga.

Referências oficiais: [dados de produtos na integração](https://centraldeajuda.melhorenvio.com.br/hc/pt-br/articles/31220437601556-Como-cadastrar-meus-produtos-na-minha-plataforma-de-e-commerce) e [peso cubado](https://melhorenvio.com.br/blog/frete-e-logistica/cubagem-o-que-e-como-calcular/). Como este projeto envia volumes individuais já embalados, os perfis não são medidas de caixas coletivas nem uma tara aplicada novamente a cada consulta.

Conferência ANB e Profarma realizada em 18/10/2026. Treze apresentações simples de 50 mg foram identificadas; onze estavam compráveis em pelo menos uma fonte, incluindo Teuto físico já existente. O plano de publicação externa contempla dez apresentações, sem duplicar Teuto. Fotos de Germed, Medley, Aradois 30, Aradois 60 e Corus foram conferidas visualmente na fonte Profarma. Biosintética e Nova Química não carregaram a imagem; placeholders ANB idênticos foram rejeitados. Outras fotos aguardam fonte válida.

GAM inicialmente recusou a credencial do cofre. Uma credencial atualizada foi fornecida pelo titular, mas o navegador local ficou desabilitado nas configurações do Work antes de nova tentativa. SantaCruz permaneceu na tela de login do portal oficial, sem catálogo comprovado. Nenhuma oferta dessas referências foi importada. Não há afirmação de falha definitiva nas contas ou indisponibilidade comercial dessas empresas.

Feriados, cortes comerciais reais, custos fiscais/embalagem, documentos de envio e autorização de reutilização comercial das fotos continuam exigindo validação operacional. O prazo usa recebimento terça a sábado e corte de 18h30, sem calendário de feriados. Manter a data de preparação visível antes de concluir a compra.
