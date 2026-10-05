# 39 - Frete automático e conferência de embalagens

## Comportamento do checkout

A cotação inicia automaticamente 450 ms após um CEP completo e carrinho elegível. Mudanças em CEP, produto, quantidade ou preço cancelam a consulta anterior e invalidam opções/seleção antigas. Respostas atrasadas não substituem a consulta atual. Alterar endereço complementar, cashback ou callback do componente não solicita outro frete. O cliente escolhe o serviço; o botão **Consultar novamente** permite repetir uma falha.

Entrega local gratuita em Ivaté/Douradina e retirada preservam as regras existentes. Para transportadora, continua obrigatório um perfil aprovado do volume pronto para envio. Os serviços aparecem por preço crescente, com prazo como desempate. Não há compra de etiqueta, consolidação automática de caixas ou aprovação de produtos nesta mudança.

## Pesquisa do catálogo em 04/10 e atualização em 05/10/2026

As fontes foram conferidas para a apresentação exata. Nenhum peso bruto pronto para envio foi comprovado. O lojista informou que ainda não possui caixas e pretende comprar três tamanhos.

| Produto | Resultado | Aplicação |
| --- | --- | --- |
| Cimegrip 20cp, EAN 7896523200576 | O código identifica Cimegripe com 20 cápsulas. Não foram encontradas medidas ou peso bruto comprovados. | Conferir apresentação física antes de corrigir o nome; nenhuma medida presumida. |
| Óleo de Banho Dove Glicerinado 240ml | EAN correto 7891150098442. O código anterior 4005808808281 identifica Nivea 200ml. Distribuidor informa altura 14cm, largura 6cm e comprimento 6cm da unidade comercial; “Peso: 0,320Kg” não especifica bruto. | Marca/EAN corrigidos pelo painel; comprimento 6, largura 6 e altura 14cm salvos como rascunho, peso vazio, transporte desabilitado e não revisado. Preço/estoque preservados. |
| Kit Kat Milk Chocolate Wafer Bar | Nome sem EAN, gramagem ou país não diferencia barra, multipack e outras apresentações. | Conferir EAN/gramagem da embalagem; não assumir 41,5g, nem transformar peso líquido em peso de frete. |
| Losartana Teuto 50mg, 30 comprimidos | Referência comercial associa EAN 7896112114185; página com “Peso 0.100000” não informa unidade ou tipo de peso. | Não aplicar massa ambígua. Receita e atendimento farmacêutico preservados. |

Fontes:

- [Cimed — Cimegripe](https://cimedremedios.com.br/remedio/cimegripe/) e [Drogasil — 20 cápsulas](https://www.drogasil.com.br/cimegripe-20-capsulas.html).
- [Dove oficial — óleo de banho](https://www.dove.com/br/p/sabonete-liquido-oleo-de-banho.html/07891150098442), [Raia — apresentação/EAN](https://www.drogaraia.com.br/oleo-de-banho-glicerinado-dove-240ml-1324945.html), [Martins — EAN Nivea](https://www.martinsatacado.com.br/produto/sabonete-liquido-nivea-oleo-de-banho-200ml-armazemmontreal_1854335) e [Goiás Atacado — dimensões comerciais](https://www.goiasatacado.com.br/oleo-dove-240ml-banho-glicerinado-51854-1). A última ficha respondeu HTTP 200 na consulta direta; o leitor de pesquisa retornou 403.
- [Nestlé — KitKat](https://www.nestle.com.br/marcas/chocolates/kitkat).
- [Agille Med — apresentação Losartana](https://www.agillemed.com.br/losartana-50mg-c-30comp-teuto) e [Drogaria Shoper — peso sem unidade](https://www.drogariashoper.com.br/losartana-potassica-50mg-30-comprimidos-teuto).

## Três caixas para avaliar antes de comprar

| Opção do fornecedor | Medidas internas C × L × A | Peso da caixa vazia |
| --- | --- | --- |
| [Pequena](https://outletdascaixas.com.br/br/products/caixa-papelao-16x11x6) | 16 × 11 × 6cm | 39g |
| [Média](https://outletdascaixas.com.br/br/products/caixa-papelao-20x15x15) | 20 × 15 × 15cm | 85g |
| [Grande](https://outletdascaixas.com.br/br/products/caixa-papelao-35x25x15) | 35 × 25 × 15cm | 186g |

Estas são referências comerciais, não caixas selecionadas/compradas ou medidas finais de transporte. Confirmar entrega no PR, dimensões externas e encaixe/proteção dos produtos. A pequena pode não acomodar um frasco de 14cm com proteção; o encaixe depende dos eixos e da embalagem real. Não usar dimensões internas para cotar. Fita e proteção também entram no peso final. Nesta versão, cada unidade embalada é um volume separado: três tamanhos de caixa não ativam consolidação de carrinhos.

O [guia Melhor Envio](https://centraldeajuda.melhorenvio.com.br/hc/pt-br/articles/31220391789332-Guia-de-produtos-que-podem-ou-n%C3%A3o-ser-enviados-pelo-Melhor-Envio) exige conferência por serviço e mercadoria. Referência dimensional não comprova aceitação, conservação ou receita.

## Cotação real da integração em 04/10/2026

Origem 87525-000. Encomenda fictícia de teste: 300g, C20 × L15 × A10cm, valor R$50. Nenhum perfil de produto recebeu esses valores.

| Destino | PAC | SEDEX |
| --- | --- | --- |
| 01001-000, São Paulo | R$19,77; até 9 dias úteis | R$24,05; até 5 dias úteis |
| 87501-070, Umuarama | R$19,77; até 8 dias úteis | R$24,05; até 4 dias úteis |

Prazos incluem um dia útil de preparação. A simulação administrativa confirmou conta conectada, produção, PAC/SEDEX selecionados e resposta do provedor. Não comprova transporte de todos os produtos, cobertura de todos os CEPs, coleta em domicílio, emissão fiscal ou postagem efetiva. Nenhuma etiqueta foi comprada.

## Validação e operação

Regressões do controlador de cotação cobrem debounce, mudança de carrinho, cancelamento, respostas antigas, erro/repetição explícita, entrada inválida e ausência de opções inventadas. Conferir a interface publicada com CEP externo e local após o deploy. A seleção continua vinculada ao token assinado de 15 minutos e às validações de carrinho/preço/embalagem/revisão do servidor.

Antes de liberar um produto: confirmar apresentação/EAN, pesar a unidade pronta, medir o volume externo e revisar conservação/aceitação em **Fretes e entregas**. Dados de fabricante/distribuidor agilizam a conferência da unidade comercial; não determinam a caixa adicional da farmácia.

A pedido do lojista, a IA ganhou fallback por embalagem comparável quando faltam fatos exatos. Faixas com fonte, premissas e margem conservadora preenchem rascunhos vazios; não entram na cotação antes da aprovação. Contrato e limites em [29-cadastro-logistica-ia.md](29-cadastro-logistica-ia.md).

## Checks locais e interface — 05/10/2026

- `npm.cmd run test:shipping`: 45 testes aprovados; `npm.cmd test`: 185 testes aprovados. Lint completo, typecheck, Prisma validate e `git diff --check` passaram. Auditoria mantém sete vulnerabilidades high preexistentes na cadeia de desenvolvimento; nenhuma dependência alterada.
- Ensaio isolado com o componente real no Chrome: um CEP completo disparou uma consulta sem botão; complemento/cashback preservaram seleção e contagem; quantidade disparou nova consulta; resposta atrasada de outro CEP não substituiu opções atuais. Falha controlada permitiu nova tentativa; retirada desmontou a cotação. Sem overflow horizontal em 260 e 390 px.
- Formulário completo isolado: estimativa sintética preencheu dimensões 18 × 24 × 36cm, preservou peso manual 1.200g e mostrou faixas/fonte. Trocar a apresentação limpou dimensões copiadas e manteve peso manual. Modal a 390px teve `scrollWidth === clientWidth`; captura com recorte do viewport foi inspecionada. O servidor de ensaio recusa gravações; nenhum desses valores foi aplicado a produto real.
- As duas prévias foram encerradas, viewport restaurado. Não houve pedido, cobrança ou alerta a clientes nos ensaios.

## Publicação e conferência real — 05/10/2026

- Código `2bb60e0` publicado por fast-forward no VPS e build Linux/Docker concluído. Apenas o app foi recriado, sem migration, alteração de dependências ou credenciais. Recuperação preservada em `wimifarma-br-app:pre-autocep-2bb60e0`.
- Imagem em execução: `sha256:2218e3466895ed4b11ba9a6ea12c479257006565e4fca7eaf0ba32f2f5b5ffd0`. Container `running/healthy`, zero reinícios; `/api/health` local e público respondeu com sucesso, e `/api/admin/fretes` sem sessão respondeu 401.
- Chrome em produção: preencher 01001-000 disparou a consulta automaticamente, sem clicar em botão. O retorno identificou corretamente que o KitKat do carrinho ainda não tem transporte liberado. Trocar para 87525-000 mostrou **Entrega local · Grátis**. Nenhum pedido, pagamento ou etiqueta foi criado neste teste.
- Pesquisa real do Dove, já com marca/EAN corrigidos: o assistente respondeu, mas não comprovou peso bruto nem comparável qualificado. Mostrou **Dados insuficientes para sugerir medidas**, mantendo as dimensões manuais. O formulário foi cancelado; nenhum número de estimativa foi gravado para demonstrar sucesso.
- A publicação confirma consulta automática e tratamento seguro de referência ausente. Não confirma que os quatro produtos estão liberados para transporte: a unidade pronta, a caixa externa e a aceitação ainda precisam de conferência. Uma referência ou medição validada por apresentação/SKU pode ser reutilizada para as unidades iguais; não é necessário medir cada unidade do estoque.
