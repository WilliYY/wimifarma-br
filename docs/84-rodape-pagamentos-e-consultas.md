# 84 — Rodapé: pagamentos, consultas e reputação

Atualização de 23/10: nomes normalizados e aliases conhecidos Elo/Elo Débito/Elo crédito aparecem uma vez no rodapé, sem fundir IDs ou métodos do gateway. Contrato em [98](98-compra-mobile-e-referencia-de-caixa.md).

## Pedido e resultado — 20/10/2026

O lojista pediu formas de pagamento com inclusão automática de novas bandeiras, Pix, referência à Anvisa e conferência de reCAPTCHA, Reclame AQUI e Ebit. O rodapé mantém a faixa vermelha, o corpo branco, a marca completa e as 128 bolhas originais, com tempos, filtro e preferência de movimento reduzido preservados.

A seção de pagamentos destaca Pix com os 3% já aprovados e reúne as bandeiras informadas pelo Mercado Pago. A seção de consultas oferece acesso ao portal oficial da Anvisa. Reclame AQUI e Google ficam em “Avaliações e atendimento”, sem reproduzir notas, estrelas ou selos não concedidos.

## Bandeiras e disponibilidade

- Reutiliza `publicPaymentConfiguration(false)`: apenas configuração pública de produção, sem habilitar ambiente de teste ou alterar roteamento financeiro.
- O componente servidor entrega somente `{ id, name, image }` e um indicador de origem para a apresentação. Token, segredo de webhook, conta e revisão não são serializados no rodapé; a chave pública também não é necessária nessa seção.
- O catálogo vem de `/v1/payment_methods`. Permanecem os tipos ativos `credit_card`, `debit_card` e `prepaid_card` já usados pela integração. IDs são deduplicados e o corte antigo em 12 foi removido.
- URLs de imagem aceitam somente as origens HTTPS `http2.mlstatic.com` e `www.mercadopago.com`, sem usuário ou senha. A segunda é documentada no exemplo oficial de `secure_thumbnail`; HTTP e domínios semelhantes continuam recusados. Ausência, URL recusada ou erro de carregamento usa o nome da bandeira. Não há lista manual que precise ser atualizada para incluir novas marcas do catálogo.
- O endpoint descreve métodos disponíveis para integração conforme o país associado à conta. `active` não comprova habilitação ou homologação individual para a loja. Por isso a legenda informa: “Bandeiras disponibilizadas pelo Mercado Pago. A opção final e as condições são confirmadas no checkout.”
- Cache de apresentação por conta, revisão e ambiente: sucesso de 30 minutos, chamada compartilhada por chave e intervalo de 60 segundos após falha. Entradas assentadas vencidas são descartadas na próxima consulta. Uma requisição antiga não sobrescreve outra configuração. Nenhum dado de pagamento ou total é armazenado nesse cache.
- Um componente servidor assíncrono em `Suspense` permite renderizar o restante do rodapé enquanto a consulta ocorre. Na indisponibilidade, Pix/cartão genéricos e orientação para conferir o checkout continuam disponíveis. O fallback Asaas existente é preservado e não recebe bandeiras inventadas.
- Sem novos meios, PicPay, parcelas, cobranças, formulários de cartão, API pública ou dependências.

Referências oficiais: [escopo do catálogo Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs/sales-processing/payment-methods), [API de meios de pagamento](https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-api/payment-methods/get).

### Política de imagens e marca Pix

A conferência pública da primeira publicação identificou logos substituídos por nomes: a CSP das páginas públicas bloqueava `http2.mlstatic.com`, embora o checkout já o permitisse. O `img-src` geral foi ampliado apenas para as duas origens HTTPS oficiais acima. Scripts, conexões e frames do Mercado Pago continuam restritos às rotas de pagamento; não houve wildcard, nova API de proxy ou liberação de HTTP. A regressão de interface agora usa a CSP real, uma imagem válida e uma imagem quebrada, além do catálogo com 16 bandeiras.

O Pix usa `public/payments/pix-symbol.svg`, com os três caminhos vetoriais extraídos de `ArquivosdaMarcaPix/pdf/simbolo_pix_policromia_positivo.pdf` do [pacote oficial do BC](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/marca/ArquivosdaMarcaPix.zip). Geometria, proporção e área de proteção preservadas; cor RGB `#77B6A8` conforme o [manual v1.6](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/I_manual_uso_marca_pix.pdf), sem efeitos ou referências externas. Artboard de 44 px resulta em símbolo de aproximadamente 32 px, acima dos 24 px mínimos. O texto “Pagando com Pix” acompanha o desconto sem reconstruir o logotipo. PDF de origem SHA-256: `97f05061832a99c04d3ca834dd14598eabac672a81e18fd1df6760ba2555cffc`. O [BC orienta o uso da marca por comerciantes](https://www.bcb.gov.br/estabilidadefinanceira/pix-cobranca) para identificar o meio aceito.

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
- `npm.cmd run prisma:validate` passou. Primeira publicação `ea18562`: build Linux passou e container ficou saudável; a conferência real identificou o bloqueio de imagens descrito acima.
- RED do logo oficial e da CSP confirmado; após a correção, 17/17 testes focados passaram, incluindo imagem carregada, fallback e responsividade sob a política real. Revisão independente aprovou a permissão mínima e o SVG local, sem achados.
- Rodada final de `npm.cmd run test:security`: 420/420 após o ajuste das imagens/CSP. A suíte completa de todas as áreas não foi repetida para esta alteração de apresentação; a verificação financeira foi focada e a suíte obrigatória de segurança foi executada.

## Publicação e conferência final

- Código final `0fb68a4541665b4798681650229f68e9778370fc`, após a implementação `ea18562`, enviado ao GitHub e atualizado no servidor por fast-forward. Build Linux de produção passou, incluindo lint e TypeScript; somente o app foi recriado, sem migração ou alteração de banco/proxy.
- Container `wimifarma-br-app` saudável, com label da revisão final. Imagem `sha256:e90b3e8628dd98ea452a2b0d6bbfd199603bb0851e0cc051bcb7251a04e0f407`. Imagem anterior preservada em `wimifarma-br-app:pre-footer-0fb68a454166`.
- Conferência real anônima na home e no produto de referência: seis bandeiras do catálogo, com logos carregados; símbolo Pix e marca Wimifarma também carregados (oito imagens do rodapé com `complete` e largura natural positiva).
- Desktop padrão e celular de 390 px sem transbordamento horizontal, 128 bolhas preservadas e links corretos para Anvisa, Reclame AQUI e Google. O viewport temporário do navegador foi restaurado. Nenhum pedido, cobrança, avaliação ou cadastro externo foi criado.
- Capturas finais inspecionadas: `outputs/footer-2026-10-20/footer-publicado.png` e `footer-publicado-390.png`, fora do Git. O build foi feito antes da troca, com guarda de revisão/imagem e recuperação da imagem anterior em caso de falha de saúde.

## Arquivos e comandos principais

- Interface: `site-footer.tsx`, `footer-payment-methods.tsx`, `footer-payment-methods-content.tsx`, `footer-payment-brand.tsx` e `site-footer.test.ts`, em `src/components/site`.
- Catálogo/cache: `src/features/payments/integration.ts`, `payment-brands.ts`, `payment-brands.test.ts` e `integration-display.test.ts`.
- Política de imagens: `next.config.ts` e `src/lib/security-headers.test.ts`; símbolo local em `public/payments/pix-symbol.svg`.
- Documentação: `README.md`, documentos 07, 10, 47, 61 e este documento 84.
- Comandos: runner `tsx --test` nos testes focados, `npm.cmd run test:security`, `lint`, `typecheck`, `prisma:validate`, auditorias NPM completa/produção, `git diff --check`, commit/push/pull, `docker build --target runner` e `docker compose up -d --no-deps --no-build app`. Comandos locais que geram temporários passaram pelo executor de limpeza da tarefa.

Pendências desta pesquisa: eventual concessão oficial de selos, conferência sanitária vigente e decisão futura sobre proteção contra robôs. Nenhuma foi representada como já concluída. Os cinco alertas altos de desenvolvimento permanecem documentados acima; produção segue sem vulnerabilidades na auditoria executada.

Capturas e logs ficam em `outputs` ou no escopo temporário da tarefa, fora do Git. Os ensaios não criam pedidos, cobranças, avaliações ou cadastros externos.
