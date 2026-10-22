# 96 — Cadastro por família de princípio ativo

## Escopo autorizado

Em 22/10/2026, o lojista substituiu a prioridade da planilha histórica pela pesquisa de uma família completa por vez. A inclusão deve comparar ANB e Profarma e preservar marcas, fabricantes, doses, formas e quantidades diferentes. Associações entram quando contêm o princípio ativo solicitado; nomes apenas parecidos não são equivalentes.

Primeira etapa: levotiroxina, nimesulida, simeticona, tadalafila, ibuprofeno e loratadina. Em novo pedido na mesma conversa, o lojista acrescentou paracetamol, acetilcisteína, dexclorfeniramina, fexofenadina e ambroxol, incluindo a orientação de mostrar “Avise-me” quando houver falta de estoque confirmada. Desloratadina encontrada por busca parcial fica fora desta autorização. Não iniciar outras famílias sem novo pedido.

## Conferência e publicação

- Coletar a lista completa disponível no fornecedor, incluindo paginação ou carregamento adicional. O resultado da pesquisa não comprova estoque nem cobertura de todo o mercado.
- Identificar cada apresentação pelo GTIN textual normalizado, composição, dose, forma e quantidade. Conferir divergências entre o fornecedor, fabricante e documentos oficiais; preservar a origem e a resolução de cada conflito.
- Comparar o custo final elegível para uma unidade. Não somar ST novamente quando ela já integra o custo final, interpretar ST ausente como zero ou usar desconto condicionado a quantidade maior.
- Reutilizar a política comercial aprovada, respeitando o teto da apresentação. Escolhas individuais ficam registradas separadamente; não criar promoções ou preços anteriores fictícios.
- Novos cadastros exigem oferta real atual. Produtos existentes conservam seus dados e a continuidade comercial descrita em [94](94-catalogo-lateral-e-continuidade.md). Esta inclusão não renova cotas ou observações antigas.
- Manter o importador de novos GTINs separado da atualização de ofertas: uma colisão deve interromper a inclusão, inclusive em registros físicos, excluídos ou com outra representação do mesmo GTIN.
- Classificar receita por apresentação e composição. A classe regulatória `Novo` não significa automaticamente medicamento de referência. A condição comercial de segmento ético é independente.

## Itens indisponíveis e duplicidade

“Avise-me” usa o fluxo existente de [avisos de disponibilidade](74-avisos-de-disponibilidade.md), com consentimento do cliente e sem liberar compra ou disparar mensagens automaticamente. Falta confirmada em uma distribuidora não invalida estoque físico da farmácia ou oferta positiva de outra fonte. Ausência de atualização, sessão expirada e erro de consulta não comprovam estoque zero.

Antes de criar, conciliar o GTIN canônico com todos os registros, inclusive excluídos e de estoque físico. Uma apresentação existente deve ser reconciliada no registro original, sem duplicação. Novos indisponíveis precisam de identidade, classificação e preço positivo comprovado; itens de venda livre também exigem foto exata antes de ficarem públicos. O importador de ofertas elegíveis não deve ser relaxado para representar uma indisponibilidade como oferta de compra.

## Fotos

O lojista pediu fotos atuais para todos os itens que permitem imagem pública. Um produto dessa categoria não deve ser publicado sem a foto da apresentação exata conferida. Usar fonte do fabricante ou distribuidor, preservar URL e hash e revisar visualmente dose, forma e quantidade. Uma imagem genérica do distribuidor não substitui a embalagem do produto.

Medicamentos com receita continuam com as ilustrações institucionais públicas existentes; originais privados não devem aparecer no catálogo. MIP e medicamento notificado precisam de comprovação específica antes de receber foto pública. A pesquisa oficial segue LMIP/LMN e a RDC 44/2009, sem classificar uma família inteira por uma única apresentação.

## Operação

As capturas, custos, imagens originais, manifestos, backups e provas operacionais ficam em diretórios privados ignorados pelo Git. A publicação exige revisão do conjunto exato, testes e banco isolado, backup, baseline, dry-run, importação única e verificação pública. Nenhum teste transmite pedido às distribuidoras ou efetua pagamento.

Um novo pedido autorizado pode registrar seu próprio operador e conjunto de EANs em janela comprovadamente livre, preservando a identidade histórica do coordenador. A transição usa o mutex compartilhado, comparação dos hashes do estado, provas recentes e verificação de HEAD e imagem de ferramentas. Não reutiliza concessão antiga nem apresenta o operador como outro chat. Resultado incerto exige inspeção antes de qualquer repetição.

## Primeira etapa concluída: 153 inclusões

As seis primeiras famílias tiveram 153 novos produtos efetivamente publicados e conferidos em 22/10/2026:

| Família | Novos produtos |
| --- | ---: |
| Levotiroxina | 54 |
| Nimesulida | 20 |
| Simeticona | 18 |
| Tadalafila | 23 |
| Ibuprofeno | 34 |
| Loratadina | 4 |
| **Total** | **153** |

Levotiroxina: 11 apresentações de Puran T4, 11 de Euthyrox, 11 de Synthroid, 11 de Levoid e dez genéricos Merck. Nimesulida: 16 simples, duas de betaciclodextrina e as associações Nidue e Nivux. Ibuprofeno: 33 simples e uma de ibuprofeno arginina.

Foram publicadas 43 fotos reais de apresentações de venda livre; 110 produtos com receita mantiveram ilustração institucional. A conferência verificou 153 páginas e 43 arquivos públicos de imagem por HTTP, MIME e hash da transformação oficial. O catálogo terminou esta etapa com 772 ativos. As seis janelas foram liberadas, sem concessão pendente; registros, ofertas, imagens anteriores e oito tabelas protegidas foram preservados. As bases próprias de QA foram removidas após conferir titularidade e ausência de conexões; backups de recuperação foram preservados.

Validações em Linux, na imagem de ferramentas imutável: lint, typecheck, build e Prisma passaram; testes gerais 243/243, segurança 444/444 e fornecedores 107/107. Esses conjuntos podem se sobrepor. Auditoria de produção com zero vulnerabilidades; a auditoria completa manteve cinco alertas high de desenvolvimento já registrados no documento 95. Nenhuma migração ou mudança do aplicativo foi necessária para estes cadastros.

Os dados privados, apresentações e links públicos estão em `outputs/familias-medicamentos-2026-10-22/relatorio-primeira-etapa-153.md`. As provas de cada pacote e o fechamento consolidado ficam em `operacao*`; o resumo consolidado é `operacao-mip2/published-first-stage-summary.json`. Coleta ou preparação não devem ser contadas como publicação.

Na pesquisa dessas seis famílias, 116 apresentações comerciais ficaram fora do conjunto publicado: 25 na fila de foto/embalagem e 91 com pendências de identidade, disponibilidade, tributação ou classificação. Os 446 GTINs localizados somente em documentos oficiais não comprovam cotação ou estoque. A orientação posterior de mostrar indisponíveis como “Avise-me” será tratada com os dados exatos revisados, preservando as publicações desta etapa.

## Ampliação em andamento

A segunda coleta foi autorizada para paracetamol, acetilcisteína, dexclorfeniramina, fexofenadina e ambroxol. Ela tem diretório privado separado, `outputs/familias-medicamentos-rodada-2-2026-10-22/`, e deve informar inclusões efetivas separadamente. Registros existentes precisam ser conciliados por GTIN; associações controladas ou com classificação pendente não podem ser importadas como receita comum.
