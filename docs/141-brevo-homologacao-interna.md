# 141 — Homologação interna de e-mail pela Brevo

## Decisão e situação em 02/11/2026

O lojista autorizou começar com Brevo sem contratar plano pago e considerar outro serviço no futuro, se necessário. O acesso solicitado usa o Google empresarial no perfil wimi. O navegador chegou à etapa de completar o perfil, mas o controle automático não conseguiu ler ou preencher a página. Isso não comprova cadastro completo, ativação transacional ou elegibilidade da operação.

Os modelos React Email existentes continuam. O transporte preparado nesta etapa é exclusivamente um teste sintético interno, não uma automação de clientes. Não houve criação de chave, alteração de DNS, contratação ou envio real nesta preparação. Informações de login ficam na evidência privada da tarefa, fora do Git; não registrar credenciais nesta documentação.

## Limite implementado

`src/features/communications/brevo-email.ts` oferece `sendBrevoTestEmail`, sem receber pedido, mensagem ou destinatário do chamador. A função renderiza somente o exemplo fictício `ORDER_RECEIVED`, usando `renderCustomerEmail` e o gerador canônico existentes. Não consulta banco, importa contatos, concede benefícios nem altera estados comerciais.

O módulo importa uma API exclusiva de Node e recusa execução com `window`. Não existe rota pública, botão de envio ou ligação com eventos de pedido/checkout. Também não altera a fila WhatsApp da Miauby.

O endereço do serviço é fixo: `POST https://api.brevo.com/v3/smtp/email`, por HTTPS, sem redirecionamentos. O destinatário único vem da configuração interna. O corpo contém somente o exemplo sintético renderizado, o remetente configurado e o destinatário de homologação. O limite da tentativa é dez segundos, sem repetição automática.

## Configuração exclusiva do servidor

| Variável | Uso |
| --- | --- |
| `BREVO_EMAIL_MODE` | Ausente ou `disabled` não realiza chamadas. Somente `internal_test` permite a homologação; outros valores são recusados. |
| `BREVO_API_KEY` | Chave secreta de API da Brevo, não uma chave SMTP. Nunca usar `NEXT_PUBLIC_*`. |
| `BREVO_SENDER_EMAIL` | Remetente real autorizado na conta, ainda a configurar. |
| `BREVO_SENDER_NAME` | Nome institucional, por exemplo Wimifarma. |
| `BREVO_TEST_RECIPIENT` | Um único endereço interno autorizado, ainda a configurar. Não usar destinatários da base de clientes. |

`.env.example` mantém o modo desligado e não contém chaves nem endereços de produção. O script local lê a configuração com `dotenv/config`; isso não publica valores no cliente nem altera o ambiente do container. Nenhum valor real foi configurado nesta etapa.

Para um teste real futuro, conferir antes a conta, o domínio, o remetente, a ativação e o destinatário; então executar manualmente, no ambiente correto:

```powershell
node node_modules/tsx/dist/cli.mjs scripts/send-brevo-test-email.ts --send
```

O argumento `--send` é obrigatório e a configuração precisa estar em `internal_test`. Não usar o comando durante testes automatizados. Depois da homologação, retornar o modo a `disabled` enquanto a integração de clientes não estiver pronta.

## Resultado e incerteza

| Resultado | Significado |
| --- | --- |
| `disabled` | Transporte desligado, nenhuma chamada. |
| `invalid_config` | Modo ou configuração recusados antes do envio. |
| `preparation_failed` | Não foi possível preparar o exemplo; nenhuma chamada foi iniciada. |
| `accepted` | A Brevo respondeu 201 com identificador no formato esperado. Não comprova entrega, leitura ou caixa principal. |
| `rejected` | Resposta HTTP 4xx, exceto 408, indicando rejeição da tentativa. O resultado contém somente o status HTTP. |
| `uncertain` | Timeout, conexão/JSON inválido ou resposta sem confirmação inequívoca. Conferir o histórico da Brevo antes de qualquer nova tentativa. |

A função e o CLI não devolvem chave, endereços, conteúdo da mensagem ou corpo arbitrário da resposta. O teste não persiste uma fila; cada execução manual é uma tentativa distinta. Não repetir automaticamente um resultado incerto.

## Próximas etapas para a conta e para clientes

1. Completar o cadastro e conferir o e-mail Google efetivamente vinculado no painel. O login pedido não cria uma senha local da Brevo nesta implementação.
2. Conferir a situação transacional na conta e solicitar ativação ao suporte se a Brevo exigir. Cadastro gratuito não comprova liberação para enviar; não declarar aprovação específica da farmácia sem evidência.
3. Autenticar o domínio efetivamente usado no remetente com os registros gerados pela conta. Preservar registros existentes, especialmente DMARC; não inventar valores nem substituir MX ou o serviço atual de e-mail.
4. Criar uma chave padrão restrita ao recurso `Transactional email: All`, demais recursos `None`, e guardar exclusivamente no servidor. Não converter a chave em chave MCP. A criação pode exigir verificação da conta.
5. Homologar uma mensagem fictícia no endereço interno, conferindo histórico e caixa de entrada. Aceitação API e entrega são verificações distintas.
6. Antes de clientes, implementar a outbox própria, idempotência, revalidação do pedido/destinatário, auditoria mínima, limites, supressão e webhooks autenticados previstos em [33](33-emails-clientes.md) e [37](37-mensagens-clientes.md). Marketing/carrinho continuam separados e não se presume consentimento dos cadastros existentes ou da inscrição no Club.

## Validação desta preparação

As regressões usam `fetch` simulado e dados fictícios, sem conta Brevo ou e-mails reais. Cobrem desligamento, configuração inválida, destinatário fixo, conteúdo canônico, aceitação, rejeição, incerteza, timeout e execução exclusiva no servidor. Resultados efetivamente executados devem ser registrados na evidência da tarefa. Esta descrição não comprova aprovação dos checks, publicação ou homologação de entrega.

Validação local desta preparação: 10 testes de transporte/renderização e 525 testes de segurança passaram; TypeScript global (`--noEmit --incremental false`), ESLint dirigido e lint global passaram. O CLI sem `--send` recusou a execução com exit 1, como esperado. A revisão independente não encontrou achados materiais. Não foi executado novo build ou deploy da aplicação: o módulo não está ligado às rotas ou aos eventos do site e o transporte continua desligado.

As auditorias npm de 02/11/2026 registraram sete alertas de produção (três baixos e quatro moderados) e vinte na auditoria completa (três baixos e dezessete moderados), com zero altos ou críticos em ambas. A auditoria integral não foi ocultada; os comandos de auditoria retornaram 1 pela presença dos alertas, enquanto a verificação de bloqueio high/critical de produção passou. Não foram modificadas dependências nem aplicadas correções forçadas. Os resultados não substituem a homologação da conta e da entrega real.

## Fontes oficiais consultadas

- [Enviar e-mail transacional por API](https://developers.brevo.com/reference/send-transac-email).
- [Ativação transacional e remetente](https://help.brevo.com/hc/en-us/articles/115000188150-Troubleshooting-Issues-with-Brevo-SMTP).
- [Autenticação de domínio](https://help.brevo.com/hc/en-us/articles/12163873383186-Authenticate-your-domain-with-Brevo-Brevo-code-DKIM-DMARC).
- [Criação de chave API](https://help.brevo.com/hc/en-us/articles/40159485019794-Create-and-manage-your-API-keys) e [permissões](https://help.brevo.com/hc/en-us/articles/40158277171474-About-API-key-permissions).
- [Webhooks protegidos](https://developers.brevo.com/docs/secured-webhooks).
