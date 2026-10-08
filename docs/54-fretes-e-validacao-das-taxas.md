# 54 — Fretes e validação das taxas

Consulta e decisão em 08/10/2026. Este registro complementa os documentos 27, 44 e 53; não representa contratação de transportadora nem medição física dos produtos.

## Consultas reais de frete

No painel de produção `/admin/fretes`, a origem carregada foi **87525-000, Ivaté/PR**, com Melhor Envio conectado, frete nacional ativo e um dia útil de preparação. A simulação consulta todos os serviços retornados pelo provedor, sem limitar a busca aos serviços selecionados para o checkout.

Encomenda de referência: **500 g, comprimento 20,8 × largura 20,8 × altura 21,6 cm**, valor declarado de R$50. Consulta sem compra de etiqueta:

| Destino | Serviço | Preço retornado | Prazo estimado, incluindo preparação |
| --- | --- | --- | --- |
| 01001-000, São Paulo/SP | PAC | R$21,94 | Até 9 dias úteis |
| 01001-000, São Paulo/SP | SEDEX | R$24,93 | Até 5 dias úteis |
| 87501-070, Umuarama/PR | PAC | R$21,94 | Até 8 dias úteis |
| 87501-070, Umuarama/PR | SEDEX | R$24,93 | Até 4 dias úteis |

Somente PAC e SEDEX retornaram opções nessas duas consultas. Não foram alterados serviços ou perfis de produtos. Preços e cobertura variam conforme CEP, carga, conta e momento da consulta; os exemplos não garantem cobertura nacional integral nem preço futuro. O checkout ordena por preço crescente e usa o prazo crescente como desempate. Entrega local em Ivaté/Douradina permanece gratuita; a regra nacional de R$99,90 depende de serviço disponível.

## Opções para ampliar a comparação

- Primeiro aproveitar serviços adicionais do próprio Melhor Envio quando retornarem cotação e houver postagem/coleta viável e aceitação da carga.
- **Frenet Iniciante:** a página oficial apresenta plano de R$0 e integração para plataforma própria. É o candidato para uma segunda consulta, após criação da conta, obtenção de token e validação das transportadoras. Contratos próprios e recursos de planos pagos não estão incluídos automaticamente. Nenhuma conta ou integração Frenet foi criada nesta entrega.
- Kangu: condições atuais e ponto acessível em Ivaté não foram confirmados; a documentação retornou bloqueio de acesso.
- Envia.com: a API informa ausência de cobrança adicional de uso, mas a política lista medicamentos entre os itens proibidos. Não é solução geral para o catálogo farmacêutico.

Aceitação é específica por transportadora. Jadlog, por exemplo, impõe condições próprias para medicamentos; não habilitar uma opção apenas porque aparece no agregador.

Fontes oficiais: [Melhor Envio — cotação](https://docs.melhorenvio.com.br/docs/cotacao-de-fretes), [guia de mercadorias](https://centraldeajuda.melhorenvio.com.br/hc/pt-br/articles/31220391789332-Guia-de-produtos-que-podem-ou-n%C3%A3o-ser-enviados-pelo-Melhor-Envio), [Frenet — planos](https://frenet.com.br/planos-e-precos/), [plataforma própria](https://ajuda.frenet.com.br/knowledge-base/tenho-plataforma-propria-consigo-integrar-a-frenet-em-minha-plataforma/), [regras Jadlog](https://ajuda.frenet.com.br/knowledge-base/regras-de-embarque-jadlog/), [API Envia](https://help.envia.com/pt/api-envia/), [itens proibidos Envia](https://help.envia.com/pt/artigos-proibidos).

## Limite das medidas e empacotamento

Os quatro produtos carregaram perfis aprovados de **estimativa operacional autorizada**: 500 g por unidade para Cimegrip, Kit Kat e Losartana; 800 g para Dove. Todos usam o volume externo acima, derivado da caixa média de referência. Esses valores não são medidas físicas comprovadas do produto.

Hoje cada unidade é um volume separado, inclusive em carrinhos com vários itens. Isso pode encarecer o envio. O Melhor Envio aceita produtos para empacotamento pelo provedor ou volumes montados pela loja, mas consolidar com segurança exige dimensões dos itens, proteção, conservação e caixas disponíveis. Não tratar o volume completo de cada unidade como se vários coubessem automaticamente na mesma caixa de 20 cm. Não alterar pesos para obter artificialmente frete menor.

## Pagamentos e menor custo

O contrato comercial continua em [53-asaas-clientes-e-roteamento.md](53-asaas-clientes-e-roteamento.md). Asaas está habilitado para crédito à vista; Mercado Pago atende Pix e parcelamento. Recebimento Pix Asaas ainda precisa de homologação antes da liberação pública.

O sistema compara custo percentual + fixo para o valor e as condições do pedido, somente entre instrumentos ativos, homologados e tarifas atuais vinculadas à conta/modalidade. Regras Asaas são consultadas a cada seis horas e expiram em 24 horas. Mercado Pago exige reconfirmação do contrato em até sete dias. Promoções e antecipação não estão garantidas na estimativa; tarifa desconhecida nunca significa custo zero. Portanto, não prometer a menor taxa efetiva em qualquer circunstância.

Conferência no simulador ADMIN de produção em 08/10, cartão 1x: para **R$10**, Mercado Pago foi selecionado (R$0,50, contra R$0,79 Asaas); para **R$100**, Asaas foi selecionado (R$3,48, contra R$4,98 Mercado Pago). Prazos exibidos: Mercado Pago 0 dias, Asaas 32 dias, sem antecipação. São comparações de tarifas registradas válidas, sem criação de cobrança ou garantia de custo futuro.

Correção desta entrega: Asaas produtivo habilitado com configuração inválida ou sem webhook não desaparece silenciosamente da auditoria. Novos pedidos conservam o gateway válido, com motivo `invalid-provider-configuration` e diagnóstico fixo `invalid-configuration` ou `missing-webhook`. Erro bruto, credencial e conteúdo descriptografado não são incluídos. Provedor desativado continua distinto de provedor inválido. Se nenhum gateway válido existir, a API retorna indisponibilidade. Pagamentos já iniciados não trocam de provedor.

O aviso do painel Sandbox também foi corrigido: os ensaios não alteram os meios públicos, mas não afirmam mais que o checkout atende exclusivamente pelo Mercado Pago depois da ativação comercial do Asaas.

Regressões sintéticas em `src/features/payments/routing.test.ts`: diagnóstico seguro, provedor desativado, webhook ausente, escolha por custo, mesma transação de tarifas, indisponibilidade sem alternativa e isolamento do modo de teste ADMIN.

## Medicamentos

Medicamentos isentos de receita seguem compra normal. Receita comum classificada permite carrinho e pagamento **sem upload**, conforme documento 45; a conferência pelo farmacêutico antes da dispensação continua exigida pela [RDC 44/2009](https://bvsms.saude.gov.br/bvs/saudelegis/anvisa/2009/rdc0044_17_08_2009.pdf). A situação de uma loja concorrente não muda essa obrigação. Controlados, antibióticos e novos itens não devem receber classificação liberatória automática da IA; o fluxo futuro de receita depende de decisão e regras sanitárias específicas.

## Validação desta entrega

- `npm.cmd run test:security`: 225 testes passaram, sem falhas, incluindo seis regressões novas de roteamento.
- Lint, typecheck, Prisma validate e build local passaram. Não há alteração de schema ou migração.
- Revisão independente de roteamento e testes: nenhum achado novo; diagnóstico anterior corrigido. O agente principal executou os testes no escopo temporário atual; o revisor fez inspeção estática, pois seu escopo antigo foi recusado pelo executor.
- `npm.cmd audit --omit=dev --audit-level=high --json`: zero alertas de produção.
- Auditoria completa: cinco high, zero critical, na cadeia já registrada de `braces`/`micromatch`/`fast-glob`/ESLint Next. A fonte oficial e npm continuam sem versão corrigida de braces; não aplicado downgrade sugerido de ESLint Next. Registro em documento 42. Auditoria completa não passou e não foi omitida.
