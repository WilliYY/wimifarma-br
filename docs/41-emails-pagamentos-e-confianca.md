# 41 - E-mails, pagamentos e confiança

Atualização em 06/10/2026: diagnóstico de DNS (SPF sem remetentes autorizados, DMARC reject, MX nulo), teste limitado de SMTP externo do VPS, validação Asaas Básico sem mensalidade e links diretos de cadastro estão em [43-frete-estimado-e-validacao-asaas.md](43-frete-estimado-e-validacao-asaas.md). Software próprio de campanhas é possível; a operação de entrega exige autenticação, reputação, filas e tratamento de devoluções/descadastro. Nenhum SMTP, campanha ou plano pago foi instalado/ativado.

Consulta de fontes oficiais em 05/10/2026. Preços públicos não substituem as condições efetivas da conta, a elegibilidade da farmácia ou a homologação do checkout. Nenhuma conta nova, contrato, cobrança, campanha ou selo foi ativado nesta pesquisa.

## Vale construir o painel de e-mails?

Sim: construir a interface ADMIN e reutilizar a entrega de um provedor é a opção recomendada. Não vale reproduzir toda a infraestrutura SMTP, reputação de IP e proteção contra spam do Brevo. O painel próprio controla modelos, campanhas, públicos, agendamento, histórico e automações; o provedor entrega as mensagens e informa falhas/reclamações. A ausência de mensalidade não significa custo zero de infraestrutura ou envio.

O limite do Brevo Free é **300 e-mails enviados por dia**, não 300 pessoas cadastradas. O plano permite até 100.000 contatos. O saldo diário não acumula; 900 destinatários consomem pelo menos três dias, sem contar mensagens de pedidos. A operação precisa reservar capacidade para transacionais, em vez de gastar toda a quota numa campanha. [Planos Brevo](https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans), [limites Free](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan).

| Opção | Sem mensalidade inicial | Onde faz sentido |
| --- | --- | --- |
| Brevo Free | 300 envios/dia; até 100.000 contatos | Início simples com campanhas e transacionais; serviços adicionais têm limites próprios. Créditos pré-pagos são uma opção para volume pontual. |
| Resend | Transacional Free: 3.000/mês e 100/dia. Marketing Free: até 1.000 contatos, broadcasts sem limite tarifário de volume na tabela consultada | Bom candidato para um painel próprio de novidades; Marketing e `/emails` transacional têm quotas e APIs distintas. |
| MailerSend | Free: 500/mês, API/SMTP; conta sujeita a aprovação e cadastro de cartão | Volume transacional pequeno. O antigo número de 3.000/mês não descreve o Free atual. |
| SES + listmonk | listmonk é software gratuito; SES cobra por uso | Volume maior sem assinatura mensal de marketing, com mais manutenção. |

Fontes: [Resend preços](https://resend.com/pricing.md), [Resend modalidades](https://resend.com/docs/knowledge-base/what-is-resend-pricing), [MailerSend](https://www.mailersend.com/pricing), [listmonk](https://listmonk.app/), [SES](https://aws.amazon.com/ses/pricing/).

Desde 21/07/2026, novas contas/regiões SES começam em Essentials: US$0,16 por 1.000 envios. À la carte continua disponível por US$0,10/1.000. Dez mil envios custam US$1,60 ou US$1,00 apenas nessa parcela, mais dados, impostos/câmbio, hospedagem e operação. Sandbox permite 200 mensagens/24h para destinatários verificados; produção exige aprovação. [SES produção](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html).

Recomendação: começar com painel próprio e Brevo para simplicidade, ou avaliar Resend Marketing se a prioridade for novidades para até 1.000 inscritos. Migrar para SES/listmonk quando o volume justificar a manutenção. Não instalar ou conectar dois provedores sem necessidade; separar o contrato do painel do adaptador permite trocar depois.

## Aba ADMIN proposta

1. **Visão geral:** envios disponíveis, fila transacional prioritária, entregas/falhas, reclamações e inscrições.
2. **Modelos:** pedido recebido, Pix gerado/aguardando, pagamento confirmado, envio/rastreio, carrinho e pós-venda. Reutilizar as informações canônicas da Miauby em `37-mensagens-clientes.md`.
3. **Campanhas:** rascunho, prévia desktop/celular, destinatário interno de teste, público elegível e confirmação explícita do ADMIN. Nenhum produto novo dispara campanha sozinho.
4. **Contatos:** consentimento de marketing, origem/data/versão, descadastro e supressão por endereço inválido/reclamação. Não inscrever clientes existentes automaticamente.
5. **Histórico:** evento único, versão do modelo, estado e referência do provedor. Aceito pelo provedor não significa entregue. Resultado incerto exige conciliação antes de repetir.
6. **Configurações:** remetente, Reply-To, domínio autenticado e chave cifrada; ativação separada para transacionais, recuperação e novidades, inicialmente pausadas.

Domínio, DKIM/SPF/DMARC, bounce/complaint e descadastro são necessários mesmo com software próprio. Não substituir DNS existente por valores presumidos. Marketing não deve usar dados de saúde, receita ou medicamento comprado como segmentação; resumo detalhado fica na conta autenticada. Contrato de dados e implantação em `33-emails-clientes.md`. [Gmail: remetentes](https://support.google.com/mail/answer/81126), [Brevo: descadastro](https://help.brevo.com/hc/en-us/articles/9741388688402-Do-I-need-to-add-an-unsubscribe-link-to-my-emails).

Esse painel é uma proposta implementável, não uma aba de disparo já conectada. Continuam ausentes provedor/remetente autenticado, outbox de e-mails e consentimento persistido de marketing.

## Outros pagamentos sem mensalidade

Nenhuma opção pesquisada foi comprovada mais barata em todos os valores, parcelamentos e prazos. Comparar taxa fixa + percentual + parcelamento/antecipação e prazo de recebimento. Taxa de maquininha não é automaticamente a taxa de checkout web.

| Opção | Referência pública consultada | Impacto na Wimifarma |
| --- | --- | --- |
| Mercado Pago | Cartão 1x: 3,98% D30, 4,49% D14 ou 4,98% D0; Pix 0,99% | Já integrado. Fontes oficiais divergem em taxas e adicional de 3x; usar contrato da conta para roteamento. |
| Asaas | Normal: cartão 1x 2,99% + R$0,49; 3x 3,49% + R$0,49, recebimento mensal; Pix R$1,99/cobrança. Promoção de 90 dias tem taxas menores | Conta aprovada, botão de chave ainda desabilitado. Tarifas promocionais registradas no comparador não são permanentes. Antecipação tem custo adicional. |
| InfinitePay | Online D+1: cartão 1x 4,20%, 3x 7,01%; Pix gratuito. D0 cartão custa mais | API real `POST /links` e webhook, mas checkout hospedado com redirecionamento; não equivale a Bricks embutido. Candidato concreto para Pix sem taxa. |
| PagBank | Checkout: 1x 3,99% + R$0,40 D30 ou 4,99% + R$0,40 D14; Pix 1,89% | Há checkout transparente/API. Não comprova vantagem sobre Asaas/MP neste cenário; adicional parcelado divulgado é mensal, não taxa total de 3x. |
| Pagar.me/Stone | Oferta Essencial: 1x 4,19%, Pix 0,99%, mensalidade/processamento/antifraude gratuitos; 6x 13,63% | Oferta, prazo/retenção e 3x precisam de proposta da conta; não escolher apenas pelo anúncio. |
| Stripe Brasil | 3,99% + R$0,39 por cartão; Pix 1,19% por convite, sem setup/mensalidade | Parcelamento brasileiro comum em 3x não foi comprovado nessa pesquisa. Não atende automaticamente ao contrato atual de até 3x sem juros. |

Fontes: [MP Checkout](https://www.mercadopago.com.br/ferramentas-para-vender/check-out), [Asaas](https://www.asaas.com/precos-e-taxas), [promoção Asaas](https://central.ajuda.asaas.com/hc/pt-br/articles/32095332785947-Regulamento-Promo%C3%A7%C3%A3o-3-meses-de-taxas-reduzidas), [InfinitePay taxas](https://www.infinitepay.io/taxas), [API InfinitePay](https://www.infinitepay.io/checkout), [PagBank](https://pagbank.com.br/para-seu-negocio/online/checkout), [Pagar.me oferta](https://www.pagar.me/ofertas), [Pagar.me API](https://docs.pagar.me/docs/overview-principal), [Stripe](https://stripe.com/br/pricing), [parcelamento Stripe](https://docs.stripe.com/payments/installments).

Recomendação: concluir Asaas antes de adicionar outro cartão; avaliar InfinitePay como alternativa de Pix se o redirecionamento for aceitável. A seleção automática exige homologação, tarifa válida da conta e prazo/regras equivalentes. Um checkout sem taxa de Pix pode adicionar atrito de navegação; medir conversão também.

O comparador já considera valor, taxa fixa, método, parcelas e prazo. Futuro roteamento deve fixar o provedor no pedido antes da cobrança, manter idempotência e nunca criar outra cobrança após timeout incerto. Não renovar manualmente tarifa promocional por conta própria, nem considerar preço desconhecido como zero. Contratos em `38-politica-de-taxas.md` e `40-asaas-configuracao-e-homologacao.md`.

## Confiança no rodapé

| Recurso | O que comprova / custo |
| --- | --- |
| Perfil Reclame AQUI | Cadastro e atendimento gratuitos; link para o perfil correto da empresa. Não concede selo. |
| RA1000 | Reputação conquistada e auditada: mínimo 50 avaliações, respostas e solução de 90%, nota 7, voltaria a comprar 70%, cadastro superior a seis meses. Não comprar ou simular avaliações. |
| RA Verificada | Verificação comercial de existência/CNPJ/canais, distinta de RA1000; assinatura anunciada a partir de R$49/mês, sujeita ao pacote. |
| Ebit | Há plano gratuito. Exige condições cadastrais/comerciais e integração das pesquisas; começa Em Avaliação, medalhas dependem dos compradores. Diamante não vem automaticamente. |
| Trustvox / RA Reviews | Serviço comercial de avaliações reais de compradores; preço por proposta/volume. Não é certificação contra invasões. |
| HTTPS / Let's Encrypt | Proteção da conexão; certificado pode ser gratuito. O site já responde HTTPS/HSTS. Não criar uma certificação comercial fictícia. |
| Google Safe Browsing | Consulta de ameaças reportadas; não certifica reputação ou ausência de todas as falhas. |

Fontes: [Reclame AQUI cadastro](https://www.reclameaqui.com.br/empresa/reclameaqui/faq/sou-empresa-e-quero-me-cadastrar_4toEyA3djba7xEAh/), [RA1000](https://blog.reclameaqui.com.br/selo-ra1000-muito-mais-credibilidade-na-reputacao/), [RA Verificada](https://parasuaempresa.reclameaqui.com.br/raverificada/termos-de-uso/), [Ebit cadastro](https://ebit.zendesk.com/hc/pt-br/articles/360011020013-Como-posso-cadastrar-minha-loja-virtual-na-Ebit), [Ebit integração](https://ebit.com.br/developer), [RA Reviews](https://site.trustvox.com.br/planos), [Let's Encrypt](https://letsencrypt.org/), [Safe Browsing](https://safebrowsing.google.com/).

Prioridade sem mensalidade: perfil Reclame AQUI, candidatura Ebit, HTTPS e avaliações verificadas próprias. Exibir somente os selos realmente concedidos, com link/código oficial. Não adicionar imagem de Diamante, estrelas, cliente fictício ou selo de segurança genérico para aparentar certificação.

Dados reais da empresa, CNPJ/razão social, endereço, canais, condições de entrega/pagamento e meios claros de troca/cancelamento também ajudam a confiança. O art. 2º do [Decreto 7.962/2013](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm) exige informações visíveis do fornecedor e da oferta; art. 5º trata dos meios para arrependimento. Conferir os dados/registros da farmácia antes de publicar; não inventar licenças, políticas ou números profissionais. A revisão atual do rodapé encontrou endereço/WhatsApp/privacidade, mas não CNPJ/razão social nesse componente.
