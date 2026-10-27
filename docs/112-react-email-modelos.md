# 112 — Modelos React Email e escolha do serviço

## Integração em 27/10/2026

A pedido do lojista, `react-email` **6.11.3** foi fixado no manifesto e no lockfile. Licença MIT; Node >=20.19 e React 18/19. O pacote antigo `@react-email/components` 1.0.12 está marcado como descontinuado no npm, portanto não foi adotado. A versão atual concentra os componentes e reexporta a renderização; não foi instalada a API de nenhum provedor.

`src/features/communications/customer-email.tsx` renderiza HTML no servidor a partir de `buildCustomerMessage`. Assunto e texto puro permanecem canônicos. Estados financeiros, totais, destinatário autorizado para detalhes, privacidade padrão e bloqueio de eventos incompatíveis continuam no gerador existente. O renderizador não consulta nem altera pedidos e não confirma pagamento.

Os seis exemplos sintéticos foram centralizados em `customer-message-samples.ts`. A página ADMIN Miauby verifica permissão antes de renderizá-los e passa somente HTML serializado para a interface. A prévia de e-mail usa iframe com `sandbox=""`, sem scripts ou permissão de mesma origem. A biblioteca de renderização não entra no cliente nem no site público. A logo PNG de 600 px deriva da arte vetorial oficial, sem redesenho; e-mails usam URL HTTPS absoluta e a prévia usa caminho da mesma origem para respeitar a CSP também no ambiente local.

Não há envio automático, provedor conectado, chave de API, novo endpoint público, alteração de banco ou lista de clientes transmitida a terceiros. Modelos são uma parte da integração; entrega exige remetente/domínio autenticados, credencial segura, outbox, supressão, tratamento de eventos e homologação interna. Marketing e carrinho abandonado conservam consentimento e controles próprios de [33](33-emails-clientes.md) e [37](37-mensagens-clientes.md).

## Escolha proporcional à escala

Consulta agregada somente leitura em 27/10 indica escala inicial; totais comerciais permanecem na evidência privada da tarefa. Excluídos somente pedidos vinculados a `OnlinePayment.environment=test`; testes manuais podem permanecer. Campo e-mail preenchido não comprova destinatário verificado ou consentimento de marketing. Não há tráfego automático de e-mail ativo. O número de produtos não define a quantidade de envios.

**Recomendação condicionada à atividade:** pesquisa posterior no mesmo dia encontrou produtos farmacêuticos/suplementos na lista de conteúdo proibido do Resend e restrições/avaliação prévia no Brevo. Foram enviadas consultas autorizadas aos dois serviços antes de cadastro ou integração. Nenhuma exceção transacional foi presumida. SES permanece alternativa sujeita à aprovação AWS e ao custo operacional. Detalhes em [114](114-elegibilidade-email-e-condicoes-transportadoras.md). Os valores abaixo comparam capacidade/preço, sem comprovar elegibilidade da farmácia.

Valores públicos em US$, consulta de 27/10/2026, antes de impostos, câmbio e extras; cenários mensais de 30 dias e um destinatário por mensagem:

| Mensagens/mês | Resend | Brevo Free / Starter pago | SES à la carte / Essentials |
| ---: | ---: | ---: | ---: |
| 1.000 | 0 | 0 / 9 | 0,10 / 0,16 |
| 3.000 | 0 | 0 / 9 | 0,30 / 0,48 |
| 5.000 | 20 | 0 / 9 | 0,50 / 0,80 |
| 10.000 | 20 | Não cabe / 17 | 1 / 1,60 |
| 50.000 | 20 | Não cabe / 56 | 5 / 8 |

Resend Free exige <=100/dia, além do limite mensal. Brevo Free exige <=300/dia, sem acumular e com marca; portanto 5.000 só cabem com distribuição diária adequada. Os planos pagos Brevo foram calculados na API comercial oficial, sem extrapolação linear. A remoção de marca no Starter aparece como US$12 na API e US$9 na ajuda: conferir checkout da conta, sem assumir o menor valor. Marketing Resend tem preços e cotas separados. SES pode incluir tráfego de dados e serviços adicionais; novos clientes começam no Essentials e podem mudar de modalidade. Entrega aceita pelo servidor destinatário não comprova leitura nem caixa principal.

Fontes: [React Email render](https://react.email/docs/utilities/render), [licença](https://github.com/resend/react-email/blob/canary/LICENSE.md), [Resend](https://resend.com/pricing.md), [Brevo](https://www.brevo.com/pricing.md), [API comercial Brevo](https://pricing-backend.brevo.com/public/pricing/api/plans/all?currency=USD), [limites Brevo](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan), [SES](https://aws.amazon.com/ses/pricing/), [sandbox SES](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html).

## Verificação e limites

Regressões sintéticas cobrem renderização HTML, texto canônico, escape, privacidade, estados financeiros incompatíveis, seis exemplos e caminhos de imagem na prévia. `npm.cmd run test:commerce` passou com 24 testes. Lint, typecheck, build e 491 testes de segurança passaram. Auditorias npm completa e de produção retornaram um alerta moderado preexistente em `fast-uri`, zero high/critical; não houve atualização forçada.

Inspeção em fixture com o componente real, HTML gerado, CSS e CSP do aplicativo: 390/1440 px, seis eventos, sem erros JavaScript ou transbordamento horizontal. Isso não equivale a homologação em Gmail/Outlook nem envio real. Revisão independente aprovou os limites de autorização, dados e dependência; o ajuste de caminho da logo na prévia recebeu regressão própria. Evidência local em `outputs/react-email-2026-10-27/`, fora do Git. Publicação e validação do ambiente real devem ser distinguidas desses checks locais.

## Publicação em 27/10/2026

Implementação `7b7c780`, documentação logística `bd5b077`, enviadas ao GitHub. Servidor atualizado por fast-forward com checkout limpo e concessão canônica de catálogo inativa. Build Linux/Docker passou e somente `app` foi recriado com `--no-deps`; identidade/início do PostgreSQL foram preservados, sem migration.

Imagem ativa `sha256:29c5ead199b6e206ba3a867e5375ead2ab81db6ea89d19c07e651f727107ae84`, saudável e zero reinícios. Recuperação preservada em `wimifarma-br-app:pre-react-email-bd5b077`, imagem anterior `sha256:0b713f2b912732d99ea35bf5459dffeb4d18fe1d1ce54dc3ac833eeb20a8c7a6`.

HTTPS: health, home e checkout 200; Miauby ADMIN redireciona sessão ausente com 307 e sua API recusa com 401, `private, no-store`, CSP, nosniff e DENY. PNG público com SHA-256 `bb09fb50a5c8b063f1adfa7f555827def40b3c11caf70f6592380e87c4affbd5`. A inspeção visual autenticada em produção e homologação de entrega em clientes de e-mail não foram realizadas; os seis modelos foram exercitados na fixture local. Nenhuma mensagem ou contratação foi criada.
