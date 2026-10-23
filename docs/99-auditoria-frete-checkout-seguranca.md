# 99 — Dados logísticos, frete nacional e segurança da compra

Verificação de 23/10/2026. Escopo: fontes de pesos/dimensões, consulta de frete, escolha do gateway e testes defensivos. Sem pedidos, cobranças, etiquetas ou mensagens reais. Não houve alteração de tarifas, integrações ativas, credenciais, classificação de produtos ou perfis logísticos de produção.

## Rota recomendada para dados reais por EAN

1. Obter do fabricante ou distribuidor contratado uma exportação do cadastro logístico por EAN. Exigir apresentação exata, nível de embalagem, quantidade contida, **peso bruto**, unidade de peso, três dimensões com unidade, responsável, data e ficha/arquivo de origem. Não há comprovação de que os fornecedores já disponibilizem esse arquivo.
2. Complementar com GS1 Brasil Provider/Verified depois de testar uma amostra do inventário. A [FAQ oficial](https://portalapi.gs1br.org/pageFaq) distingue cadastro próprio no CNP da consulta contratada a produtos de terceiros. O [manual público R1.3](https://gs1portalstoragecdncms.blob.core.windows.net/strapi/strapi-assets/Manual_do_Usuario_API_Verified_by_GS_1_R1_31_1_a534922ec8.pdf) documenta atributos logísticos nacionais sujeitos a preenchimento/compartilhamento; isso não garante cobertura de todos os EANs. O [portal atual](https://swagger-api.gs1br.org/) anuncia v3.1: confirmar versão, campos, licença, preços e limites antes de integrar ou contratar.
3. Concluir a ficha do pacote de expedição da farmácia: produto protegido, caixa fechada, peso bruto total e dimensões externas. Uma ficha da unidade de venda não comprova esse pacote. Conferir encaixe, composição e restrições do serviço. A [conciliação métrica do Melhor Envio](https://centraldeajuda.melhorenvio.com.br/hc/pt-br/articles/31220446441620-Como-funciona-a-concilia%C3%A7%C3%A3o-m%C3%A9trica) pode cobrar diferenças entre declaração e aferição.

Preservar EAN como texto, arquivo original, URL/localizador e hash. Revisões ou divergências não sobrescrevem a prova anterior. Aprovar separadamente `REFERENCIA_COMERCIAL_APROVADA` e `PACOTE_EXPEDICAO_APROVADO`; a primeira não habilita transporte automaticamente. Não converter ml em g, inferir unidade pelo número, estimar por foto ou dividir medidas de caixa master para inventar medidas unitárias.

Os 105 EANs NIVEA encontrados anteriormente continuam pendentes de confirmação de unidade, peso bruto e nível de embalagem. A caixa informada de **24 × 15 × 10 cm** ainda precisa de tara e confirmação das medidas externas/proteção; não foi aplicada a todo o catálogo. Contratos de perfis e caixa: [39](39-frete-automatico-e-embalagens.md), [89](89-consolidacao-embalagens.md) e [98](98-compra-mobile-e-referencia-de-caixa.md).

Contrato de recebimento com 29 campos e pesquisa detalhada preservados em `outputs/auditoria-compra-seguranca-2026-10-23/rota-dados.md`. Não houve contato com empresas ou contratação.

## Frete real: resultado e limite da amostra

- Melhor Envio habilitado em produção, origem 87525000. Foram cotados **31 CEPs válidos: as 27 UFs e quatro cidades do interior**, com uma unidade do produto público Cimegrip 20cp, preço conferido e perfil já habilitado. Todos retornaram HTTP 200 com PAC e SEDEX. Cinco CEPs inicialmente antigos/genéricos foram substituídos por CEPs de logradouro confirmados e testados; falha de verificação de CEP não foi contada como falha do frete.
- Cotação não cria pedido nem compra etiqueta. Provas sanitizadas não guardam tokens assinados. A amostra comprova funcionamento nacional do conector, sem garantir atendimento a todos os CEPs, carrinhos ou serviços. Preços e prazos dependem da consulta atual.
- O produto de teste usa perfil operacional existente, com estimativa de 500 g; a matriz não comprova aferição física desse pacote nem usa a nova caixa. A leitura atual mostrou 858 produtos e três perfis habilitados/revisados: a ampliação continua dependente dos dados físicos, disponibilidade e restrições de cada apresentação.
- Corrigido CEP `00000000`: era enviado ao fornecedor e retornava erro técnico 502. Agora a validação retorna 422 antes de consultar o provedor. Regressão prova zero chamadas para CEP inválido, itens duplicados e valores inválidos, e uma chamada para entrada válida. A mudança não obriga consulta a um serviço externo de CEP.

## Qual gateway é escolhido

Configuração efetiva lida em transação somente leitura, sem expor segredos nem chamar gateways:

| Integração | Ambiente | Instrumentos efetivos |
|---|---|---|
| Mercado Pago, revisão 4 | Produção, habilitado | Pix e cartão |
| Asaas, revisão 3 | Produção, habilitado | Cartão em uma parcela |
| Asaas sandbox, revisão 2 | Teste, desabilitado | Fora do checkout comercial |

Simulações da decisão do servidor para R$ 10, R$ 100 e R$ 500, com Pix e cartão em 1/3/6/12 parcelas, produziram **15 escolhas pelo Mercado Pago**. Pix e cartão parcelado tinham apenas esse candidato disponível. No cartão à vista a comparação de tarifas dos candidatos não estava completa; aplicou-se o provedor padrão. Não afirmar que o roteador sempre escolhe a menor taxa. Nenhuma configuração foi alterada.

O servidor escolhe o gateway ao criar o pedido e persiste provedor, conta, ambiente e revisão. Retomar um pagamento usa o provedor salvo. O navegador não decide livremente o gateway nem confirma pagamento. Corrigidas duas mensagens da API de andamento que citavam Mercado Pago para qualquer pagamento online: agora são neutras, mantendo todos os bloqueios de reconciliação/cancelamento.

Pix continua sem seleção inicial e concede 3% somente após escolha explícita; trocar para cartão restaura o preço anterior ao desconto. A auditoria de banco foi atualizada para declarar cartão/12 parcelas na criação do pedido de teste, respeitando o vínculo entre método escolhido e pagamento iniciado, sem enfraquecer o contrato.

## Segurança e verificações

- **452/452 testes de segurança**, **106/106 de frete**, 14/14 de andamento e 17/17 do recorte de regressão de cotação. Há sobreposição entre suites; não somar como testes únicos. Casos incluem isolamento por dono/perfil, assinatura/conta/valor de pagamentos, idempotência, revisões financeiras, SSRF, uploads, origem, tamanho de corpo e segredos.
- Auditoria de integração em PostgreSQL descartável, sem rede externa, volume persistente ou credenciais reais: concorrência de estoque, checkout online/manual idempotente, validade Pix, parcelas, eventos duplicados/atrasados, estorno, liberação única de reserva, resposta incerta e cancelamento passaram. Gateway e mensagens simulados. Container removido pelo ID e rótulo próprios. Banco produtivo não foi usado. Hashes do núcleo de pagamentos da imagem de testes comparados ao código atual.
- Auditorias npm de produção e completa, esta explicitamente incluindo desenvolvimento: **zero vulnerabilidades informadas** na consulta desta data. Lint, typecheck e build local passaram. Não houve instalação/downgrade forçado ou mudança de dependências.
- Revisão independente aprovou as alterações de API, validação de cotação, regressões e fixture do banco, sem achados novos de alta gravidade.
- **21/21 ensaios públicos controlados** passaram: acesso sem sessão, cookie/cabeçalho adulterados, arquivos privados, origem indevida, JSON inválido, excesso de corpo Auth.js, webhooks sem assinatura válida, isolamento de pagamento, cabeçalhos e flags dos cookies. O limite Auth.js é 64.000 bytes; o ensaio final usou corpo maior que esse limite e recebeu 413. Não se fez teste de carga ou tentativa de descobrir senhas.
- Carrinho/checkout publicados passaram em 320, 390 e 430 px com carrinho sintético local: R$ 200 antes da escolha, R$ 194 após Pix, R$ 200 após cartão; rascunho preservado e escolha de pagamento novamente explícita após recarregar. Escritas HTTP bloqueadas no navegador, sem pedido/cobrança real.
- **28/28 cenários de checkout interceptado** passaram, incluindo cliente logado simulado, cartão/12 parcelas, gates de dados/privacidade/endereço, erros/retomada Pix e ausência de segunda cobrança. Fixtures atualizadas para escolher Pix explicitamente, usar mocks atuais e exigir ação antes do cartão. Uma falha preexistente da CI no teste de catálogo esperava ausência de `article`; foi ajustada ao card neutro já existente, preservando ausência de controles, fotos e elementos promocionais. Sem alteração na aplicação para satisfazer esses testes.
- Infraestrutura observada: app saudável na porta de loopback 127.0.0.1:3001; PostgreSQL saudável sem porta publicada. Não foram auditados todos os serviços compartilhados do VPS.

Ensaios públicos controlados e publicação têm comprovante sanitizado em `outputs/auditoria-compra-seguranca-2026-10-23/`. Os testes não constituem pentest completo, não comprovam invulnerabilidade e não substituem restauração de backups, revisão de infraestrutura, MFA e acompanhamento contínuo de avisos. Não se fez cobrança real para homologar o ciclo financeiro nesta tarefa.
