# 65 - Local de postagem e validação operacional

## Contrato

O lojista confirmou que pode levar encomendas a Umuarama e pediu aviso de cidade de postagem para ADMIN e colaborador. O destino do cliente e o local onde a farmácia entrega o pacote à transportadora são informações distintas.

- `ShippingIntegration.settings` mantém `originCity`, `originState` e `postingLocations`, com um registro por `serviceId`: cidade, UF e nome opcional do ponto. A configuração é exclusiva de ADMIN e mantém o controle de revisão existente.
- A equipe configura os locais em **Fretes e entregas → Conexão e origem → Locais de postagem por serviço**. Cidade vazia remove o mapeamento. Não inferir postagem por nome de transportadora ou CEP do cliente.
- `validateOrderShipping` resolve a rota no servidor e grava `postingLocation` no snapshot JSON de `Order.shippingQuote`. Contém cidade, UF, ponto opcional e `requiresTravel`, comparando cidade/UF com a origem. A comparação ignora acentos e caixa.
- Alterações da configuração invalidam cotações pela revisão existente. Pedidos criados preservam o local histórico. O preço, o prazo, a origem de cálculo do frete e as regras de aceitação de mercadorias continuam os mesmos.
- `/admin/pedidos` mostra o aviso no topo do card e oferece filtro de cidade. ADMIN e STAFF veem o mesmo local; STAFF não altera a configuração. O endereço do destinatário continua separado. Sem snapshot do local, inclusive pedidos antigos, aparece **confirmação pendente**; não atribuir retroativamente um ponto.
- A tela não compra etiqueta, não agenda coleta e não confirma aceitação física no ponto. Conferir agência, horário, embalagem, documento fiscal e pagamento antes de postar.

## Operação prevista

Conforme consulta anterior de agências documentada em [64](64-correcao-cashback-checkout-e-transportadoras.md), Correios tem opção em Ivaté; Jadlog, Total Express, Loggi e J&T têm pontos em Umuarama. A rota por serviço é configurável e deve ser revista quando a farmácia mudar de ponto. Os serviços globalmente ativos e as aprovações por produto continuam governando as opções do cliente.

## QA reproduzível

`scripts/audit-order-fulfillment.ts` executa Chromium com a aplicação Next.js normal e PostgreSQL descartável. Exige banco vazio `127.0.0.1:55440/wimifarma_orders_qa` e aplicação exclusiva `http://127.0.0.1:3019`, além de `AUTH_SECRET` iniciado por `isolated-orders-qa-`. Não carrega `.env`. O servidor QA deve usar rede Docker interna, sem `.env` de produção, gateway, credenciais reais ou workers de comunicação. A porta do servidor deve ficar restrita ao loopback/túnel SSH.

O script cria somente contas, produto e saldos sintéticos. Usa login real de CUSTOMER/ADMIN/STAFF, compra pelo navegador, POST real de checkout, persistência e leitura reais, operação STAFF e liquidação de benefícios no banco QA. Respostas de CEP e cotações são fixtures assinadas com a chave exclusiva de QA; o teste não comprova cobrança no gateway ou postagem física. Não instalar integrações reais para contornar essa limitação.

Casos: retirada com cashback e WimiCoins acumulados; entrega local; transportadora com postagem em Ivaté, Umuarama e outra cidade; preservação dos snapshots após mudar a configuração; exibição ADMIN/STAFF em desktop/mobile; cliente impedido de operar pedidos; STAFF impedido de editar fretes.

Artefatos locais ficam em `outputs/postagem-pedidos-2026-10-14/`; não versionar capturas, banco, senhas ou logs. Ao terminar, remover somente os containers/rede QA identificados por nome e label de propriedade.

## Verificação desta entrega

- Revisão independente: APPROVE, nenhum defeito confirmado. Esclarecido que fixtures de cotação não validam a API externa; o script verifica preços esperados para cada pedido.
- Validação local: `npm.cmd run test:all` 593/593; `test:security` 289/289; lint, typecheck, build e Prisma validate aprovados. Regressão focada de resolução autoritativa, revisão e locais 4/4.
- Auditoria de dependências: produção sem vulnerabilidades; auditoria completa mantém cinco alertas high das ferramentas de desenvolvimento já documentados em 64, sem atualização forçada.
- QA com banco/navegador e configuração de produção serão registrados após a execução. Nenhuma cobrança ou mensagem real é necessária para essa validação.
