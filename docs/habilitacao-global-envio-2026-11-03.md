# Habilitação global de envio por rotas — 03/11/2026

## Preparação inicial: pedido, inventário e limites

O lojista pediu continuar a revisão dos 2.708 perfis pendentes, buscando a melhor rota. O snapshot de estudo contém 3.068 produtos ativos, 360 habilitados e quatro campos físicos positivos estimados em todos os ativos. A autorização de estimativas não converte peso/dimensões em medições, não comprova composição e não cria contrato ou aceite de transportadora.

O usuário informou não ter/não saber contrato Correios ou aceite comercial do Melhor Envio para medicamentos. A única integração cadastrada é Melhor Envio, em produção, revisão 8. Não foram encontrados metadados de credencial Correios/Frenet no cofre; isso não prova ausência de uma conta externa. Nesta etapa de código e planejamento, nenhum perfil da nova coorte foi aplicado.

## Correção compartilhada para pós secos

`hasPerfumeShippingCargo` passa a reconhecer o qualificador com/sem perfume em talco ou desodorante para pés explicitamente em pó, com massa final em g/kg e sem indicação de apresentação líquida, cremosa, pastosa, oleosa, spray, aerossol, álcool, solvente, elétrico ou kit ambíguo. O caso real é Tenys Pé Baruel Sem Perfume em pó 100 g. O nome não descreve um frasco de perfume.

A exceção anterior de absorventes permanece intacta. O predicado continua compartilhado entre elegibilidade, revisor estimado e consulta pública. Carga `perfume` explicitamente existente, serviços previamente restritos, receita, classificação sanitária, Popular, estoque, Avise-me, prontidão e imutabilidade dos dados não foram dispensados. Não se generalizou a remoção de palavras negativas para produtos de composição desconhecida.

## Primeira coorte planejada: 78

- 51 alimentos/suplementos secos, sem marca anterior de líquido e sem apresentação em mL, aprovados somente para PAC/SEDEX (IDs 1/2).
- 12 pós de higiene/perfumaria e 15 acessórios/aparelhos manuais/kit em pó, como carga geral, nos sete serviços configurados permitidos pela política.
- Todos sem receita exigida, `prescriptionType:UNREVIEWED`, Popular falso, sem flag somente Avise-me, perfil estimado desativado e não revisado. As classes estruturadas dos alimentos foram preservadas.

Os kits e conjuntos permanecem unidades completas: três kits Centrum 60+30, caixa de 12 sachês de 5 g, conjuntos de cargas Mach3, Probak com 28 aparelhos e Corega com três frascos. A validação local aceitou 78/78; nenhum candidato passou por renomeação ou transformação de conteúdo.

Manifestos planejados: lote de 50, SHA `fcfcfbbf0ee54248c848f37e26278e73a0ffccfca9e95a1af8de4edec8261a73`; lote de 28, SHA `ba62ba04745cf1a2365ac66540a01532dab36a3b623acdc6e3e90b9395754ec2`. São planos, não recibos de aplicação. A execução depende de snapshots renovados, revisão independente, janela própria, runtime/checkout/canônico atuais, ADMIN ativo, locks, CAS, auditoria e conferência posterior. Não reutilizar operadores, concessões ou lotes consumidos de etapas anteriores.

## Demais rotas em estudo

Para líquidos cosméticos não perigosos, o [guia Loggi no Melhor Envio](https://centraldeajuda.melhorenvio.com.br/hc/pt-br/articles/53080081292948-Como-embalar-seus-envios-pela-Loggi-guia-de-dimens%C3%B5es-e-regras-t%C3%A9cnicas) descreve recipiente vedado, tampa selada, proteção secundária impermeável, absorvente e divisórias. Essa seção não exige homologação externa, mas não libera medicamentos, inflamáveis, perfumes ou aerossóis. Nomes de famílias servem para triagem; a classificação precisa de fundamento e as condições precisam ser registradas. Não houve nova aprovação genérica de `conditional` no código desta entrega.

Para medicamentos comuns não controlados, há uma rota candidata [Correios direto](https://www.correios.com.br/enviar/proibicoes-e-restricoes), inclusive sem contrato para postagem de balcão. Isso não transfere aceite nem preço ao contrato Melhor Envio. A [API Preço](https://www.correios.com.br/atendimento/developers/manuais/manual-api-preco-1) requer contrato ativo a faturar, serviço e autenticação. Não foram criados conta, contrato, integração ou tarifa estimada como se fossem existentes. Conferência de receita, conservação, nota fiscal e regularidade da farmácia permanecem separadas.

Perfumes/aerossóis e os três Oral-B continuam sujeitos às informações e condições específicas. A pesquisa não fechou o vínculo primário dos GTINs Oral-B com modelo/bateria; o reCAPTCHA GS1 não foi contornado. Não se usaram regras de serviço internacional como autorização doméstica. Os [termos do canal Melhor Envio](https://centraldeajuda.melhorenvio.com.br/hc/pt-br/articles/31220391789332-Guia-de-produtos-que-podem-ou-n%C3%A3o-ser-enviados-pelo-Melhor-Envio) distinguem transportadoras; suplementos ficam limitados a Correios nesta coorte.

## Validação e evidências

O falso positivo do pó foi reproduzido antes do ajuste. As regressões incluem o SKU real, apresentação estimada/revisada, serviço do provedor, formas cremosas/pastosas/oleosas e restrições explícitas. Passaram 30 testes focais, revisão independente sem achados, typecheck global com geração Prisma, lint global e `git diff --check`. A suíte de segurança passou com 559/559, sem falhas, cancelamentos ou casos ignorados. A publicação APP e aplicação de dados serão comprovadas em recibos próprios; esses testes locais não as antecipam.

Planos, inventário, manifestos e fontes de estudo ficam em `D:/Codex-outputs/wimifarma-br/habilitacao-global-envio-2026-11-03-01a19a02/`. O fechamento anterior de 360 perfis e do hotfix está em [revisão anterior](revisao-envio-sabonetes-2026-11-03.md); a sincronização documental final foi o commit `76db8dcab7cc8bbd59fb5202cc0a0316dc0d24f2`. A nova frente não o trata como concessão produtiva.

## Encerramento comprovado: APP e 78 perfis

As seções anteriores registram a preparação e seus gates. A publicação APP foi concluída pelo chat 9 na fonte `c39e3a60418cb4243b8b305c769cd744f4f45fc8`, container `d0a5bbb3495395efedec28dc27622c4e6d2eb23525b822fdab10cd767eda1d77`, imagem `sha256:80f7e8673768a73a4b63080f039ceaaec02dfe56690c2c60cf12c0a23ba0f4c3`, iniciado em `2026-11-03T14:50:09.334511086Z`. O build Linux/ARM64 e as verificações de publicação passaram. O recibo está em `D:/Codex-outputs/wimifarma-br/shipping-dry-powder-api-2026-11-03/release-proof.json` (SHA256 `4c834a104b296699bf4c8470982eb33ab0d29c7561a27e9999baa0b1f7126b8e`).

Os manifestos de 50 e 28 foram renovados, revisados independentemente e simulados em produção. A janela coordenada foi `03/11/2026 15:34–15:50 UTC`, com relógio do servidor, pins, CAS, locks, ADMIN e auditoria. Ambos foram aplicados uma única vez. A consulta posterior de `15:41:58.013071 UTC` confirmou **438 habilitados/revisados, 2.630 pendentes e 3.068 ativos**, com 78 auditorias correspondentes aos planos.

Foram preservados todos os campos de Product exceto `shippingProfile`/`updatedAt`, todos os campos dos produtos fora da coorte, ofertas e integração de frete (revisão 8, MD5 de settings `bb6c3d9e22ab9059b0405866616d5399`). Os quatro campos físicos foram preservados: `measurementBasis:estimated`, `physicalMeasurementConfirmed:false`. Estoque, preços, receitas, classes e Popular mantiveram seus valores.

O operador e o job `national-shipping-600a294366ea29ee-data` estão **consumidos**. O cleanup físico de `15:45:47 UTC` comprovou a ausência do runtime próprio no APP e do bundle remoto, mantendo quatro recibos: dois dry-runs e duas aplicações. APP/PG, seus StartedAt, checkout de código e canônico `9bd8c753e56d1e553d2923cdac7abb5910b38a20cfa0a7c3031989d2ca885ea7` foram preservados, saudáveis/limpos. Não repetir essas fases. Prova: `application-proof-78.json` na pasta desta tarefa em D:.

### Cotações públicas verificadas após a aplicação

Para uma unidade, HTTP 200 e modo `available`:

| Produto | CEP | Frete normal | Frete a pagar | Faltam para a meta estimada | Meta estimada |
| --- | --- | ---: | ---: | ---: | ---: |
| Tenys Pé Baruel Sem Perfume em pó 100 g | 01001000 | R$ 13,52 | R$ 12,76 | R$ 188,78 | R$ 200,00 |
| Centrum Adulto 30 comprimidos | 01001000 | R$ 16,44 | R$ 11,54 | R$ 107,26 | R$ 150,00 |
| Gillette Mach3 Carbono 1 unidade | 69005010 | R$ 28,82 | R$ 26,64 | R$ 398,09 | R$ 430,00 |

São valores daquele momento, com subsídio parcial e metas estimadas específicas do produto/carrinho/CEP/modalidade, recalculadas quando o carrinho muda. O Centrum retornou somente Correios 1/2, conforme a revisão dos alimentos/suplementos; os dois exemplos gerais retornaram sete opções. O CEP `40020000` permaneceu sem cotação confirmada em três consultas, incluindo dois produtos: HTTP 502 público e HTTP 422 do provedor. A validade desse CEP e o retorno do provedor continuam em análise; esse resultado não comprova indisponibilidade de todo um estado.

As tentativas completas, inclusive falhas, estão em `commercial-proof-78.json`. O ticket técnico ao Melhor Envio foi autorizado, mas não enviado: o Computer Use encerrou o controle por não conseguir confirmar a URL atual. Rascunho e situação estão preservados em `consulta-melhor-envio-rascunho.md` e `consulta-melhor-envio-status.md`. As demais rotas permanecem nas pendências específicas descritas acima.

## Encerramento posterior: 13 perfis Gillette

Uma nova coorte de aparelhos manuais, refis de lâminas e kits Gillette/Venus foi revisada, simulada e aplicada uma única vez na janela `03/11/2026 19:39–19:53 UTC`. O manifesto canônico é `446f6523bce7da4c0b7091462c4c378f6a194b86025eaa110714270162e74ba5`; o plano confirmado no dry-run e na aplicação é `f20fcc60ba405b37d3aacf5c30f37ae35b77387009a6460c56da9ebff3ce3649`.

A leitura posterior de `19:43:03.529107 UTC` confirmou **451 perfis habilitados/revisados, 2.617 pendentes e 3.068 produtos ativos**. As auditorias de revisão passaram de 439 para 452, com exatamente 13 na coorte. Os perfis gravados correspondem integralmente ao plano; campos físicos, kits completos, nomes, receitas, classes, Popular, preços, estoques, ofertas, integração e produtos fora da coorte foram preservados. As medidas continuam `estimated`; fontes de embalagem de venda não foram apresentadas como medição do pacote protegido.

Os serviços aprovados nesta coorte são `1, 2, 3, 4, 33, 35`. O serviço `33` é JeT; `31` é Loggi e ficou fora desta revisão. A execução usou o runtime auditado da revisão APP `c39e3a6`, com APP/PG, imagens e StartedAt preservados. O checkout no momento da operação era `f4708d9930b97f7927fd2248ae65034ccf98eda0`; a comparação dos 25 caminhos relevantes de fonte/schema/dependências não encontrou diferenças nos contratos usados pelo runtime. O canônico `7a5a109c3f058ff3550de6c9e13511dc208c60b5559310ee1e30c566c24cac90` permaneceu preservado.

O operador incluiu conferência final dos perfis físicos e revisões contra o manifesto. A regressão reproduziu a ausência dessa proteção antes da correção; o código corrigido passou em 22 testes mockados e revisão independente, seguida de revisão dos vínculos reais. A execução manteve ADMIN, CAS, locks, relógio do servidor, reserva de tempo, recibos por hash e antirreplay.

O ciclo `42663bc385a17277` está **consumido**. A limpeza física às `19:44:15.988289 UTC` confirmou a ausência do runtime próprio no container e do bundle no job, preservando dois recibos, owner e registro de limpeza. Não repetir stage, simulação ou aplicação desse ciclo. Evidência: `D:/Codex-outputs/wimifarma-br/gillette-13-preparacao-2026-11-03/application-proof-13.json`, SHA256 `8c2e9432a55a7d38901e70d84d39b6745e352812cd0a3593aa7451facb899414`.

### Frete e meta estimada nas cinco regiões

Para uma unidade do Gillette Mach3 Sensitive, os cinco CEPs retornaram HTTP 200, modo `available` e seis opções de transporte. Os valores abaixo são da opção com menor valor a pagar na consulta:

| Cidade | CEP | Frete normal | Frete a pagar | Faltam para a meta estimada | Meta estimada |
| --- | --- | ---: | ---: | ---: | ---: |
| São Paulo/SP | 01001000 | R$ 16,33 | R$ 14,15 | R$ 208,09 | R$ 240,00 |
| Salvador/BA | 40010000 | R$ 25,74 | R$ 23,56 | R$ 348,09 | R$ 380,00 |
| Manaus/AM | 69005010 | R$ 38,65 | R$ 36,47 | R$ 538,09 | R$ 570,00 |
| Porto Alegre/RS | 90010150 | R$ 15,98 | R$ 13,80 | R$ 208,09 | R$ 240,00 |
| Brasília/DF | 70058900 | R$ 23,14 | R$ 20,96 | R$ 308,09 | R$ 340,00 |

O kit Mach3 Sensitive com um aparelho e 12 cargas também retornou HTTP 200, `available` e seis opções para `40010000`, mantendo a unidade comercial inteira. Recibos e retornos completos estão em `public-quotes-13.json` na pasta desta coorte.

As cotações são daquele momento e daqueles CEPs; não comprovam cobertura universal ou aceite de qualquer mercadoria. O benefício usa a política de margem histórica já autorizada, com reserva de 50%. As metas e o valor restante são estimados e recalculados conforme produtos, quantidade, volume, CEP e modalidade. Esta revisão não converte custos históricos em custo atual nem comprova lucro real.

### Pendências que continuam separadas

A situação anterior do contato Melhor Envio foi superada: o **ticket 2100064 foi criado**, com confirmação visível no painel e por e-mail. As quatro questões abrangem medicamentos/contrato comercial, cosméticos/Loggi/FDS, perfumes/aerossóis e postagem em Ivaté, Douradina ou Umuarama. A verificação posterior ainda encontrou somente o recebimento automático, sem resposta técnica de aceitação. Não duplicar o ticket nem tratar sua abertura como autorização de carga.

O refil Oral-B GTIN `4210201338444` recebeu aprovação documental de natureza/composição como duas cabeças mecânicas para uma proposta posterior separada; não foi incluído nestes 13 nem habilitado por esta execução. Os aparelhos Cars `4210201334774` e Princess `4210201334712` continuam pendentes de dados de pilhas/conteúdo vinculados à apresentação. Compatibilidade com aparelho elétrico não comprova bateria em um refil. Perfumes, aerossóis, medicamentos e as demais categorias condicionais mantêm suas exigências próprias.
