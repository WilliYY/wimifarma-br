# 141 — Homologação interna de e-mail pela Brevo

## Transporte SMTP (14/11/2026)

O transporte recomendado para a Wimifarma é SMTP com uma chave dedicada de envio. A chave de API transacional também permite administrar recursos como modelos e logs. Para selecionar SMTP, configure `BREVO_TRANSPORT=smtp`, `BREVO_SMTP_LOGIN` com o login SMTP exibido na Brevo e `BREVO_SMTP_KEY` com a chave SMTP. Use o remetente autenticado `pedidos@emails.wimifarma.com.br` com nome `Wimifarma`. Guarde credenciais no ambiente privado do servidor. Revogue a chave na Brevo se precisar interromper o acesso. Para bloquear IPs desconhecidos, primeiro confira o IP de saída e se a conta tem outros clientes SMTP. A lista de endereços autorizados é compartilhada. [Chaves SMTP](https://help.brevo.com/hc/en-us/articles/7959631848850-Create-and-manage-your-SMTP-keys) · [Bloqueio por IP](https://help.brevo.com/hc/en-us/articles/5740111683858-Authorize-and-block-IP-addresses-for-API-and-SMTP-security).

O app usa TLS na porta 465, com certificado validado, e só considera a mensagem aceita após `250` ao fim do corpo. Resposta permanente `5xx` vira rejeição. Falha temporária, desconexão ou resposta ambígua fica incerta, sem nova tentativa automática. Versões que ainda usam `BREVO_API_KEY` continuam com o transporte `api` quando `BREVO_TRANSPORT` está ausente. A seleção `smtp` com credenciais incompletas recusa o envio. Os modelos React Email e as flags de cada fluxo são compartilhados pelos dois transportes.

Para homologar, mantenha as três flags de clientes desligadas. Configure `BREVO_EMAIL_MODE=internal_test` e `BREVO_TEST_RECIPIENT=wimifarma@gmail.com` no ambiente que executa o script. Rode `npm exec -- tsx scripts/send-password-recovery-test-email.ts --send` uma vez e confirme na caixa a logo, o remetente e a entrega da amostra com código inerte. O servidor usa protocolo SMTP para essa execução quando o transporte selecionado é `smtp`. Confira o rastreamento no e-mail recebido. O SMTP segue a política da conta Brevo e não envia o campo de consentimento individual da API. [Rastreamento transacional](https://help.brevo.com/hc/en-us/articles/11643306229906-Can-I-anonymize-the-tracking-of-opens-and-clicks-for-my-emails).

As seções seguintes registram a preparação original do transporte de API.

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

## Validação real do transporte SMTP — 19/11/2026

A credencial SMTP já configurada autenticou em produção com resposta `235`, conexão TLS e certificado válidos. O remetente institucional configurado foi conferido. A imagem antiga de ferramentas não incluía o módulo SMTP; foi construída uma imagem oficial isolada com o estágio `tools` da revisão atual, sem substituir o app ou executar migrations.

Um único envio do CLI `send-password-recovery-test-email.ts --send`, em `BREVO_EMAIL_MODE=internal_test`, foi aceito e entregue à caixa de entrada institucional de homologação. A mensagem foi recebida às 22h37 de Brasília, com SPF, DKIM e DMARC aprovados. A amostra contém HTML e imagem com texto alternativo da marca; a política da conta Brevo reescreveu links e imagens para rastreamento. Não foi realizada redefinição real de senha nem disparo à base de clientes.

As três modalidades de clientes continuaram desativadas durante o teste e no app em execução. Este resultado valida autenticação SMTP, submissão e entrega da amostra; não substitui a homologação dos fluxos completos de recuperação, pedidos e carrinho, nem ativa suas flags.

Avisos recentes consultados na caixa institucional identificam chaves de API expiradas e uma chave SMTP criada separadamente. A chave de API não está configurada no app. Não houve criação, troca ou revogação de credencial nesta validação. A consulta do vencimento da chave SMTP no painel ficou pendente porque o acesso local ao navegador estava indisponível neste chat; o vencimento não pode ser deduzido da autenticação bem-sucedida. Comprovantes privados, sem valores de chaves, em `D:/Codex-outputs/wimifarma-br/brevo-validacao-20261119/`.

## Homologação isolada dos fluxos — 20/11/2026

Os fluxos de confirmação de e-mail, recuperação de senha e avisos de pedido passaram em uma instância real do Next/Auth.js com PostgreSQL novo, migrations aplicadas e dados fictícios. A rede Docker era interna, sem publicação de portas ou acesso ao provedor. O transporte de API foi interceptado exclusivamente nesse ambiente por `scripts/email-qa-provider.cjs`, com chave fictícia e destinatários `@example.test`; nenhuma mensagem dessa execução saiu para a internet. Essa prova complementa a entrega SMTP interna de 19/11, sem repetir o envio real.

O driver `scripts/audit-customer-email-qa.ts` confirmou login real, armazenamento dos tokens por hash, confirmação de endereço e rejeição de reutilização. Na recuperação, confirmou a troca de senha, login com a nova senha, rejeição da senha antiga, do token reutilizado e da sessão anterior. Sessão JSON `null` do Auth.js é tratada como ausência, mantendo HTTP 200 obrigatório e as provas positivas de login.

O worker real consumiu dois eventos válidos de pedido e ignorou dois eventos com endereço revogado ou estado desatualizado. Um envio interrompido ficou `UNCERTAIN`. Uma segunda passagem confirmou ausência de duplicação e de repetição do evento incerto. Foram capturadas quatro mensagens fictícias: confirmação, recuperação e dois avisos de pedido. As fixtures próprias foram removidas; os quatro containers e a rede de QA foram eliminados, sem erros de limpeza.

O CLI recusa bancos, hosts, segredo de autenticação, credenciais de provedor, URL da aplicação e caminho de captura fora dos valores exclusivos de QA. Exige banco vazio antes de criar fixtures. O preload também recusa configuração divergente, destinatário externo, rastreamento consentido ou rota Brevo diferente de `/v3/smtp/email`. Não carregar o preload no app de produção. Os arquivos não são importados pelo produto nem ativam flags.

Comprovantes privados, sem credenciais, em `D:/Codex-outputs/wimifarma-br/brevo-flows-20261120/outcome.json`. A execução terminou às 16h04 de Brasília. O executor operacional registra IDs e labels dos recursos e verifica a remoção; falha de inspeção Docker não conta como ausência. Capturas com tokens fictícios e configurações temporárias ficam fora do Git.

As três flags de clientes permanecem desativadas em produção. Não houve criação, troca ou revogação de chave nesta etapa. O painel abriu no navegador deste chat, mas o login Google ainda exige intervenção do titular; vencimento, supressão e política de rastreamento da conta continuam pendentes de conferência. Não foi localizada resposta humana à consulta de elegibilidade da farmácia registrada em [114](114-elegibilidade-email-e-condicoes-transportadoras.md). Um rascunho de acompanhamento foi preparado fora do repositório, sem envio. Esta homologação técnica não equivale a aceite específico da operação pela Brevo.

Validações locais dos dois scripts: ESLint dirigido sem cache, TypeScript global sem emissão, regressões de recuperação/worker/carrinho e `test:security` passaram. O TypeScript exigiu `--max-old-space-size=6144` após esgotar o heap padrão. Não foi necessário novo build do app: os arquivos de QA não participam do runtime, e a prova integrada usou a mesma imagem em execução na produção. Revisão independente sem achados remanescentes.

As auditorias de dependências de 20/11, com TLS do sistema, retornaram exit 1: produção com cinco alertas moderados e três altos; completa com dez moderados e três altos; ambas sem críticos. Os altos pertencem a `prisma`, `@prisma/config` e `effect`. A sugestão automática envolve mudança major de Prisma e não foi aplicada. Não houve mudança de dependências. Pelas regras de segurança do projeto, esses alertas bloqueiam nova publicação/ativação do app até correção e nova validação. A sincronização destes scripts isolados e da documentação não substitui nem reinicia o runtime em produção.
