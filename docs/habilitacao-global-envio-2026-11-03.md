# Habilitação global de envio por rotas — 03/11/2026

## Pedido, inventário e limites

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
