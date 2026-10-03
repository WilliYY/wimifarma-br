# 27 - Melhor Envio e frete por transportadora

## Escopo e implantação

Solicitado pelo lojista em 28/09/2026. Origem confirmada: Avenida Minas Gerais, 2263, Ivaté/PR, CEP 87525-000. O endereço pessoal em Umuarama não é a origem da farmácia. A loja Wimifarma é separada da loja preexistente de outra atividade.

Esta entrega implementa autorização OAuth, cotação, configuração administrativa, embalagens e associação da cotação ao pedido. **Não compra etiquetas, não emite documento fiscal e não cobra pagamentos.** A preparação e compra da etiqueta continuam no painel do Melhor Envio, após conferência humana. Mercado Pago/Bricks tem implementação e homologação separadas em `28-mercado-pago.md`.

O novo módulo começa desativado. Nenhum produto ganha medidas ou permissão de envio automaticamente. Ativação depende de conexão, serviços com postagem/coleta viável, documentação fiscal e medidas conferidas. Não habilitar produtos ou serviços para demonstrar sucesso se não houver evidência desses dados.

## Operação

Regra aprovada em 03/10/2026: frete gratis a partir de **R$ 99,90 em produtos apos o desconto de cashback**, incluindo outras cidades com CEP/servico elegivel. A cotacao assinada mantem o custo original da transportadora; o pedido registra separadamente `customerPriceCents` e `freeShipping`. O servidor recalcula a gratuidade, sem confiar no resumo do navegador. Essa regra nao habilita cotacao/produtos pendentes de revisao.

Dinheiro fica limitado a retirada ou entrega local em Ivaté/Douradina-PR. Local exige CEP, cidade e UF coerentes: faixa ja existente de Ivaté (87525-000 a 87527-999) e CEP generico confirmado de Douradina (87485-000). Nao ampliar para faixas rurais presumidas. Enderecos fora dessa cobertura exigem frete real selecionado; cartao na entrega nao vale para transportadora.

1. ADMIN abre `/admin/fretes` e cadastra e-mail técnico, CEP de saída e dias úteis para preparação.
2. O aplicativo cadastrado no Melhor Envio usa a URL de callback `https://wimifarma.com.br/api/admin/fretes/conectar/callback`. Os dados do aplicativo são guardados cifrados no banco. Sandbox e produção são contas/aplicativos distintos; mudar ambiente limpa a conexão.
3. O botão Conectar inicia OAuth; o administrador autoriza no próprio Melhor Envio. Escopos: `shipping-calculate`, `shipping-companies`, `shipping-tracking`. **Não solicitar `shipping-checkout` ou outras permissões de gasto nesta fase.**
4. Simular uma embalagem consulta preços e não gera remessas. Selecionar serviços somente após confirmar aceitação da carga, unidade de postagem e/ou coleta em Ivaté. Salvar configuração aplica a seleção.
5. Pesar e medir cada unidade já embalada; registrar gramas e centímetros. Cada unidade é cotada como um volume separado, limitando a 20 volumes por pedido. Consolidação de vários produtos na mesma caixa é uma evolução pendente; não presumir dimensões da caixa a partir de fotos ou peso nominal do produto.
6. Marcar a revisão de conservação/aceitação e liberar os produtos elegíveis. Medicamentos sem receita podem usar PAC/SEDEX; a categoria não bloqueia esses itens. `requiresPrescription` e Farmácia Popular continuam no atendimento. Líquidos, aerossóis e itens sensíveis ao calor exigem análise da equipe e da transportadora.
7. Ativar a cotação no checkout somente depois da homologação. Entrega local e retirada permanecem disponíveis. Para outros CEPs o cliente calcula e escolhe uma cotação. O pagamento nacional aceita Pix combinado com a equipe ou Mercado Pago quando homologado e habilitado.
8. O admin de pedidos mostra serviço, transportadora, valor e prazo escolhido. Comprar a etiqueta no Melhor Envio somente após conferir pagamento, NF-e, embalagem e destinatário.

## Contratos e segurança

- Desde 01/10, peso e dimensões podem ser pesquisados/salvos como rascunho no cadastro de produtos, com fontes e revisão obrigatória. `shippingProfile` em rascunho nunca passa pela validação da cotação. Alterar a identidade ou medidas invalida a liberação anterior. Contrato: `29-cadastro-logistica-ia.md`.

- `ShippingIntegration`: configuração, revisão otimista e credenciais AES-256-GCM com o cofre existente. API pública/admin nunca devolve segredos. `AUTH_SECRET` assina cotações e `SECRET_VAULT_KEY` protege credenciais; não trocar essas chaves sem planejamento.
- `Product.shippingProfile`: liberação explícita, peso/medidas e confirmação de revisão de transporte. Só ADMIN altera pelo módulo de frete; usuários comuns, STAFF e MANAGER não administram conexão nem embalagens.
- `Order.shippingQuote`: snapshot da cotação selecionada. O servidor acrescenta frete ao total; cashback continua incidindo sobre os produtos e não desconta frete.
- Token de cotação HMAC com validade de 15 minutos, ligado a CEP, produtos, quantidades, preços, medidas, versões dos produtos e revisão da integração. Cliente não escolhe livremente o valor do frete. Cotação expirada ou alterada exige nova consulta.
- Fluxo OAuth usa estado cifrado, cookie HttpOnly/SameSite, prazo de 10 minutos, usuário ADMIN e revisão da configuração. Callback não expõe códigos ou credenciais em mensagens e logs. Erros de conexão retornam ao admin.
- Renovação sob demanda antes de expirar, com lock de banco e verificação otimista para evitar concorrência. Access token dura aproximadamente 30 dias e refresh token 45 dias conforme documentação do provedor. Longa inatividade pode exigir reconexão. Não existe heartbeat externo criado nesta entrega.
- HTTP server-side, hosts fixos, redirecionamento bloqueado, timeout de 12 segundos e mensagens de erro saneadas. Não repetir automaticamente operações de token, evitando consumo duplicado de códigos.
- Cotação pública limitada a 15 consultas por minuto/IP por processo, com mapa limitado. O proxy deve manter IP real confiável; rate limit distribuído/WAF é melhoria futura se escalar para várias instâncias.
- Cotações enviam apenas CEPs, peso, dimensões e valor. A política pública descreve o compartilhamento; nomes, CPF e detalhes clínicos não são enviados na cotação.
- Não copiar senhas, tokens, documentos pessoais ou dados fiscais reais para Git, logs, seed ou testes.

## Arquivos

`src/features/shipping/*`, APIs `/api/admin/fretes/*` e `/api/fretes/cotacao`, módulo `/admin/fretes`, componentes `shipping-panel`, `checkout-shipping-options`, `order-shipping-summary`, fluxo de checkout, política de privacidade e migration `20260928213000_melhor_envio`.

## Validação

Executar `npm.cmd run test:shipping`, `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run build`, `npm.cmd run prisma:validate`. Testar migration em banco isolado antes de aplicar em produção; preservar backup e não executar seed em produção. Conferir módulo admin em desktop/mobile e bloqueio anônimo antes de autorizar o aplicativo real.

Testes cobrem adulteração/expiração de cotação, alteração de carrinho/embalagem, respostas inválidas do provedor, serviços não habilitados, permissão de transporte, estado OAuth e manutenção das regras de retirada/entrega local. Também verificam bloqueio de todas as APIs de administração para anônimos, clientes, STAFF e MANAGER, origem/JSON/tamanho das requisições, separação sandbox/produção e tratamento de falhas sem expor segredos. A cotação real e autorização externa são verificações separadas dos testes locais.

Validação local em 28/09/2026: 153 testes existentes e 10 testes de frete aprovados; lint, typecheck, build e Prisma validate aprovados. A auditoria completa apontou um alerta alto preexistente em `fast-uri`, transitivo de `prisma > @prisma/dev > @prisma/streams-local > ajv`; nenhuma dependência foi adicionada nesta integração. O alerta também aparece com `--omit=dev`, pois Prisma está instalado como dependência do projeto. Não aplicar atualização indiscriminada durante a configuração logística.

Publicação em 28/09/2026 (29/09 UTC): commit de implementação `4849d2b`, build Docker de `app` e `migrate`, backup completo com integridade verificada e aplicação das 15 migrations em PostgreSQL descartável, sem rede externa, portas ou volume de produção. Migration aditiva aplicada em produção, app recriado e health público confirmado. APIs admin e callback retornaram 401 sem sessão; a cotação pública retornou 503 explicando que o envio nacional ainda está em preparação. Painel autenticado aberto e configuração de origem/contato salva, mantendo cotações desativadas. Cadastro/autorização OAuth e cotação real dependem da conclusão no provedor; esta publicação não comprova conexão externa. Captura do painel no navegador encontrou timeout; inspeção responsiva visual permanece pendente.

## Conexão verificada em 29/09/2026

OAuth da aplicação Wimifarma concluído com os três escopos previstos. Selecionados PAC e SEDEX (IDs 1 e 2); unidade Correios AC IVATE, Rua Maringá, 1994, Centro. Simulação real de 87525-000 para 01001-000, volume de 0,3 kg, 15 × 10 × 20 cm, valor declarado R$ 50: PAC R$ 19,77 / 11 dias úteis e SEDEX R$ 24,05 / 7 dias úteis, incluindo um dia de preparação. Valores são evidência daquela consulta, não tabela fixa. Painel conectado e captura desktop conferidos; inspeção mobile continua pendente.

Cotações públicas continuam desativadas e produtos sem liberação automática. Nenhuma etiqueta ou cobrança foi criada. Pendentes: medidas reais, elegibilidade da carga e preparação fiscal.

Revisão em 01/10/2026: conexão de produção preservada e cotação pública ainda desativada. Solicitados ao lojista peso e dimensões da embalagem pronta do KitKat e do Dove, além de confirmação sobre NF-e e local de postagem. A agência selecionada anteriormente é uma referência da configuração, não comprovação de que a operação já está pronta. Mercado Pago foi ativado separadamente; isso não libera frete nacional, compra de etiquetas ou emissão fiscal. Ao liberar futuramente, conferir a embalagem real, testar a cotação e manter etiqueta/postagem sob operação humana.

## Diagnóstico inicial e apresentação no checkout em 03/10/2026

O painel autenticado confirmou conexão de produção, PAC/SEDEX selecionados e a opção de cotação pública desmarcada. A falha observada ocorre antes da chamada ao provedor. Para a cesta Dove + Cimegrip, há ainda dois bloqueios independentes: Dove sem peso/dimensões aprovados e Cimegrip sujeito a atendimento farmacêutico. Ativar somente a chave geral não resolve essa cesta.

`publicCarrierShippingAvailable()` fornece exclusivamente um booleano ao checkout, sem renovar tokens, chamar o Melhor Envio ou expor configuração/credenciais. Erros de leitura/decifração/validação retornam indisponível e geram o marcador fixo `[melhor-envio] connection-unavailable`. Não imprime o erro original ou dados privados.

A interface mostra o impedimento antes do botão de cotação, oferece retirada/WhatsApp e não chama a API enquanto a configuração ou a regra farmacêutica impedir o envio. O predicado de restrição é compartilhado com a validação existente do servidor. Uma seleção antiga nesses casos deixa de compor preço/validação e é removida do rascunho. A interface é orientação; assinatura, estoque, embalagem e elegibilidade continuam conferidos na API.

Para liberar produtos elegíveis: medir/pesar a embalagem pronta, confirmar revisão e liberação no painel de fretes, conferir aceitação da carga/documento fiscal/postagem e então habilitar a cotação e testar o serviço real. A conferência desta tarefa não alterou essas aprovações nem criou etiqueta.

## Liberação solicitada e revisão das restrições em 03/10/2026

O lojista autorizou a chave geral de cotação nacional. A revisão remove o bloqueio baseado apenas na categoria Medicamentos; exige ainda peso bruto, dimensões, conservação e aceitação aprovados por ADMIN. Carrinho que contenha medicamento admite exclusivamente os serviços Melhor Envio **1/PAC e 2/SEDEX** nesta fase. O filtro vale tanto na consulta como na validação da cotação assinada ao finalizar; outros serviços cotados pelo provedor não são aceitos automaticamente.

Ativação da configuração confirmada no painel e na base: revisão **5**, produção, `enabled=true`, origem 87525-000 e serviços 1/2. Nenhum produto tem perfil de embalagem aprovado; isso permanece um impedimento real da cotação do carrinho, inclusive após a ativação geral.

Medicamentos de prescrição não são sinônimo de controlados. RDC 44/2009 exige avaliação da receita antes da dispensação também para prescrição comum. `requiresPrescription` permanece bloqueado no checkout, pois ainda não existe comprovação persistida de avaliação farmacêutica para liberar um pedido específico. RDC 812/2023 permite entrega remota de controlados nos seus requisitos, mas mantém vedada compra/venda pela internet; uma foto enviada ao WhatsApp não libera essa compra. `isPopularPharmacy` mantém seu fluxo próprio. Não desmarcar esses campos para oferecer frete.

A conferência do catálogo encontrou Losartana Teuto sem marcador de receita, contrariando a embalagem apresentada. Correção pelo painel: marcar receita e remover cashback incompatível com o contrato vigente, sem alterar preço ou estoque. Cimegrip e Dove estão sem qualquer perfil de embalagem; remover o bloqueio de categoria não inventa essas medidas nem aprova envio.

Simulação real: origem 87525-000, volume ilustrativo de 300 g e largura × altura × comprimento de 15 × 10 × 20 cm, mercadoria R$ 50,00. Para 01001-000 o provedor retornou PAC R$ 19,77/9 dias e SEDEX R$ 24,05/5 dias, incluindo preparação. Esses dados não são medidas dos produtos da loja nem tabela fixa de fretes. Consultas posteriores foram recusadas pelo provedor; o CEP 69005-010 foi confirmado válido pelo serviço de endereço. A falha não comprova ausência de cobertura nacional e não deve ser apresentada como cotação bem-sucedida. O simulador passa a limpar preços anteriores quando a encomenda muda ou uma nova consulta começa, evitando mostrar o preço de outro destino depois de uma falha.

Cobertura permanece dinâmica por CEP/serviço; não prometer entrega domiciliar em 100% dos lugares. Etiqueta, documento fiscal e postagem continuam humanos. Melhor Envio não recebeu permissão adicional de gasto.

Publicação da revisão `3ab8a86`: build Linux/Docker aprovado, aplicação healthy, zero reinícios e health público `ok=true`. Conferência no navegador após publicar: chave geral marcada, Cimegrip com campos de embalagem disponíveis e Losartana ainda no atendimento. Cotação da cesta real Dove + Cimegrip para 87501-070 foi recusada corretamente por falta de liberação da embalagem do Dove; nenhum preço fictício, pedido, cobrança ou etiqueta foi criado. Cesta de dois itens/R$ 46,89 preservada.

Validação: 173 testes gerais, 29 de frete, 13 de pagamento, 42 da Miauby e 24 cenários UI; lint, typecheck, Prisma e `git diff --check` aprovados. Auditoria npm reconfirmou sete HIGH preexistentes, registradas em `06-pendencias.md`, sem alterações de dependências. Rollback do aplicativo preservado em `wimifarma-br-app:pre-national-3ab8a86`; imagem publicada `wimifarma-br-app:national-3ab8a86`. Não há migration nesta entrega.

Referências oficiais consultadas em 03/10/2026:

- RDC 44/2009, arts. 52–57: https://anvisalegis.datalegis.net/action/ActionDatalegis.php?acao=abrirTextoAto&cod_menu=8542&cod_modulo=310&link=S&numeroAto=00000044&orgao=RDC/DC/ANVISA/MS&seqAto=000&tipo=RDC&valorAno=2009
- RDC 812/2023, art. 34-B: https://anvisalegis-empresa.datalegis.net/action/ActionDatalegis.php?acao=abrirTextoAto&cod_menu=8542&cod_modulo=310&link=S&numeroAto=00000812&orgao=RDC/DC/ANVISA/MS&seqAto=000&tipo=RDC&valorAno=2023
- Correios, restrições e contrato específico para controlados: https://www.correios.com.br/enviar/proibicoes-e-restricoes
- Aceitação por transportadora: https://centraldeajuda.melhorenvio.com.br/hc/pt-br/articles/31220391789332-Guia-de-produtos-que-podem-ou-n%C3%A3o-ser-enviados-pelo-Melhor-Envio

## Referências oficiais da API

- https://docs.melhorenvio.com.br/reference/introducao-api-melhor-envio
- https://docs.melhorenvio.com.br/docs/autenticacao
- https://docs.melhorenvio.com.br/reference/solicitacao-do-token
- https://docs.melhorenvio.com.br/reference/fluxo-de-autoriza%C3%A7%C3%A3o
- https://docs.melhorenvio.com.br/reference/calculo-de-fretes-por-produtos
- https://docs.melhorenvio.com.br/docs/cotacao-de-fretes

Integração direta com `fetch` e Zod existentes: nenhum SDK ou pacote adicional. A skill `api-integration` orientou limites de acesso e tratamento independente de falhas; não foi adicionada ferramenta externa de teste.
