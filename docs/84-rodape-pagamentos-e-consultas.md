# 84 — Rodapé: pagamentos, consultas e reputação

## Pedido e resultado — 20/10/2026

O lojista pediu formas de pagamento com inclusão automática de novas bandeiras, Pix, referência à Anvisa e conferência de reCAPTCHA, Reclame AQUI e Ebit. O rodapé mantém a faixa vermelha, o corpo branco, a marca completa e as 128 bolhas originais, com tempos, filtro e preferência de movimento reduzido preservados.

A seção de pagamentos destaca Pix com os 3% já aprovados e reúne as bandeiras informadas pelo Mercado Pago. A seção de consultas oferece acesso ao portal oficial da Anvisa. Reclame AQUI e Google ficam em “Avaliações e atendimento”, sem reproduzir notas, estrelas ou selos não concedidos.

## Bandeiras e disponibilidade

- Reutiliza `publicPaymentConfiguration(false)`: apenas configuração pública de produção, sem habilitar ambiente de teste ou alterar roteamento financeiro.
- O componente servidor entrega somente `{ id, name, image }` e um indicador de origem para a apresentação. Token, segredo de webhook, conta e revisão não são serializados no rodapé; a chave pública também não é necessária nessa seção.
- O catálogo vem de `/v1/payment_methods`. Permanecem os tipos ativos `credit_card`, `debit_card` e `prepaid_card` já usados pela integração. IDs são deduplicados e o corte antigo em 12 foi removido.
- URLs de imagem aceitam somente a origem HTTPS `http2.mlstatic.com`, sem usuário ou senha. Ausência, URL recusada ou erro de carregamento usa o nome da bandeira. Não há lista manual que precise ser atualizada para incluir novas marcas do catálogo.
- O endpoint descreve métodos disponíveis para integração conforme o país associado à conta. `active` não comprova habilitação ou homologação individual para a loja. Por isso a legenda informa: “Bandeiras disponibilizadas pelo Mercado Pago. A opção final e as condições são confirmadas no checkout.”
- Cache de apresentação por conta, revisão e ambiente: sucesso de 30 minutos, chamada compartilhada por chave e intervalo de 60 segundos após falha. Entradas assentadas vencidas são descartadas na próxima consulta. Uma requisição antiga não sobrescreve outra configuração. Nenhum dado de pagamento ou total é armazenado nesse cache.
- Um componente servidor assíncrono em `Suspense` permite renderizar o restante do rodapé enquanto a consulta ocorre. Na indisponibilidade, Pix/cartão genéricos e orientação para conferir o checkout continuam disponíveis. O fallback Asaas existente é preservado e não recebe bandeiras inventadas.
- Sem novos meios, PicPay, parcelas, cobranças, formulários de cartão, API pública ou dependências.

Referências oficiais: [escopo do catálogo Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs/sales-processing/payment-methods), [API de meios de pagamento](https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-api/payment-methods/get).

## Anvisa

Exibe “Consultas na Anvisa”, ícone genérico e [portal oficial](https://consultas.anvisa.gov.br/#/). Não afirma que o site possui certificação da agência. A Anvisa exige aprovação da Assessoria de Comunicação para terceiros utilizarem sua logomarca: [orientação oficial](https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa/2017/anvisa-alerta-para-uso-irregular-de-sua-marca).

A consulta atual por CNPJ ficou inconclusiva: a tela exibiu carregamento e ausência de registros simultaneamente, com erro do desafio de proteção. Isso não prova inexistência de autorização. Um DOU de 2010 cita o mesmo CNPJ e razão social antiga; não foi tratado como comprovação vigente. Não publicar AFE, licença ou responsável técnico sem conferência atual.

## Reclame AQUI e Ebit

O [perfil público](https://www.reclameaqui.com.br/empresa/w-y-yoshiura-willian-produtos-farmaceuticos-e-perfumaria/) foi conferido em 20/10/2026: CNPJ, domínio e descrição correspondem à Wimifarma. Estava não verificado, sem reputação definida e sem reclamações/avaliações no período exibido. O link institucional permanece; não se exibe RA Verificada ou RA1000. A primeira concessão do RA1000 exige indicadores e auditoria: [manual oficial](https://manual.reclameaqui.com.br/reputacao-no-reclame-aqui).

A [busca pública Ebit](https://www.ebit.com.br/reputacao-de-lojas) não localizou “Wimifarma” ou “Yoshiura” nesta consulta. Isso não equivale a afirmar inexistência no sistema, nem revoga o histórico das solicitações anteriores. Medalha exige cadastro aprovado, integração e classificação efetiva: [critérios NIQ](https://nielseniq.com/global/pt/landing-page/ebit/nielseniq-ebit-brasil/medalhas/), [integração oficial](https://company.ebit.com.br/developer/codigo-da-medalha).

Nenhuma conta, adesão, assinatura, solicitação ou avaliação externa foi criada. Links institucionais não alteram as notas dos produtos, relatos existentes ou regras de cashback.

## reCAPTCHA

Não foi encontrada integração ativa no projeto. O rodapé não exibe “protegido por reCAPTCHA”. O serviço é uma medida contra abuso automatizado em formulários, não uma certificação de qualidade ou reputação da farmácia. Uma eventual adoção depende de necessidade concreta, configuração, avaliação no backend e revisão dos fluxos protegidos.

A documentação atual mudou em 02/04/2026; não copiar automaticamente o aviso antigo de privacidade/termos. Referências: [configuração web](https://docs.cloud.google.com/recaptcha/docs/setup-overview-web), [FAQ vigente](https://docs.cloud.google.com/recaptcha/docs/faq).

## Validação

- RED confirmado para parser/cache ausente e ausência de cooldown na implementação anterior.
- Primeira rodada GREEN: 11 testes sintéticos, incluindo renderização real do rodapé em Chromium, 16 bandeiras, imagem quebrada, fallback, links externos e ausência de transbordamento em 320, 390, 768 e 1440 px.
- Revisão identificou alternância de chaves concorrentes perdendo o compartilhamento/cooldown; regressão específica adicionada antes da correção.
- GREEN após a correção: 33 testes focados de pagamentos/cache/configuração, incluindo as duas alternâncias de chave. Revisão independente aprovou a correção sem novos achados.
- `npm.cmd run test:security`: 418/418. Dois testes de interface em Chromium passaram novamente com capturas e inspeção visual em celular/desktop; os testes de configuração usam banco e provedor simulados.
- `npm.cmd run lint`, `npm.cmd run typecheck` e `git diff --check` passaram.
- `npm.cmd audit --omit=dev --audit-level=high --json`: zero vulnerabilidades. Auditoria completa com nível moderate encontrou cinco alertas altos já existentes no ferramental de desenvolvimento (`@next/eslint-plugin-next`, `eslint-config-next`, `braces`, `fast-glob`, `micromatch`), zero críticos. Nenhuma dependência foi adicionada ou atualizada nesta tarefa.
- Build Linux, saúde do container e conferência pública serão registrados após a publicação. A suíte completa de todas as áreas não foi repetida para esta alteração de apresentação; a verificação financeira foi focada e a suíte obrigatória de segurança foi executada.

Capturas e logs ficam em `outputs` ou no escopo temporário da tarefa, fora do Git. Os ensaios não criam pedidos, cobranças, avaliações ou cadastros externos.
