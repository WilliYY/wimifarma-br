# 46 - Cadastros de reputação e presença

Conferência e preparação feitas em 06/10/2026, nos sites oficiais e no Chrome autorizado pelo lojista. Este registro diferencia formulário preparado, cadastro enviado, propriedade verificada e selo concedido.

## Andamento comprovado

Em 07/10, o fluxo oficial reenviou o código ao e-mail da contabilidade vinculado ao CNPJ. O novo código fornecido pelo titular foi aceito, e a etapa **Crie seu acesso** abriu. Dados do responsável foram preenchidos; o teste do plano pago ficou desmarcado. A aba aguarda definição de senha e confirmação final para criar o acesso. Validação do e-mail não comprova página pública ou selo concedido. Códigos e capturas privadas não são versionados.

| Canal | Resultado desta etapa | O que falta |
| --- | --- | --- |
| [Reclame AQUI](https://www.reclameaqui.com.br/criar-pagina-empresa/) | CNPJ localizado e e-mail da contabilidade validado em 07/10. Dados do responsável preenchidos, plano pago desmarcado e etapa de senha aberta. | Definir senha e confirmar criação do acesso gratuito; conferir página resultante. Nenhuma página pública ou acesso empresarial ativado foi confirmado. |
| [Google Perfil da Empresa](https://business.google.com/add) | Localizada ficha existente **Wimifarma**, na Av. Minas Gerais, 2263, Ivaté-PR. Após autorização dos termos, enviada solicitação de **Administração**, confirmada pela tela “Solicitação enviada”. A ficha já é gerenciada por outra conta. | O proprietário atual pode responder até **09/10/2026**. Ausência de resposta pode abrir outro caminho de verificação, mas não garante acesso. Não houve transferência de propriedade nem acesso administrativo concedido. |
| [Ebit](https://nielseniq.com/global/pt/landing-page/ebit/nielseniq-ebit-brasil/quero-me-tornar-parceiro-colaborador/) | Links de inscrição sem formulário funcional. Após autorização dos termos, solicitação de orientação para adesão **gratuita** submetida ao suporte como lojista. E-mail confirmado pelo link da mensagem esperada; tela final confirmou “Sua solicitação foi enviada”. | Aguardar resposta sobre disponibilidade de novas adesões e processo de aprovação. Ticket de suporte não equivale a loja cadastrada, aprovada ou certificada. |
| [Google Search Console](https://search.google.com/search-console) | Após autorização específica, propriedade de prefixo `https://wimifarma.com.br/` verificada por Tag HTML na conta autorizada. Sitemap enviado e processado em 06/10/2026, com **15 páginas encontradas**. | Aguardar relatórios e indexação; envio/processamento não garante posição nas buscas. Manter a metatag. A propriedade de domínio completo permanece pendente de DNS no Registro.br; não é necessária para acompanhar este prefixo HTTPS. |
| [Bing Places](https://www.bing.com/forbusiness) | Página gratuita e opções de entrada conferidas. | Entrar com conta autorizada, localizar/reivindicar ficha e verificar os dados. Não houve concessão OAuth, criação de conta ou publicação de ficha. |
| [Google Merchant Center](https://merchants.google.com/) | Roteiro e feed já documentados no documento 44; nenhuma alteração externa nesta etapa. | Verificar/reivindicar domínio, políticas comerciais e mercadorias elegíveis; usar `https://wimifarma.com.br/google-products.xml`. |

Os formulários pendentes permaneceram abertos para continuação. Capturas locais em `outputs/cadastros-reputacao-2026-10-06/` não integram o Git. Nenhuma assinatura, cobrança, contratação de anúncios, envio de documento pessoal ou selo foi ativado.

Após a autorização explícita do lojista, as duas etapas acima foram concluídas e comprovadas em `google-acesso-solicitado.jpg` e `ebit-solicitacao-enviada.jpg`. O Google recebeu apenas a solicitação de administração da ficha existente, com contato comercial; não foi solicitada propriedade ou criada ficha duplicada. A Ebit recebeu consulta sobre o programa gratuito, sem anexos ou contratação. A confirmação de e-mail foi aberta somente na mensagem relacionada a essa solicitação.

A preparação do Search Console por metatag está em `search-console-verificacao-https-preparada.jpg`; a confirmação em `search-console-propriedade-verificada.jpg` e o envio em `search-console-sitemap-enviado.jpg`. O [Google diferencia propriedade de domínio e prefixo](https://support.google.com/webmasters/answer/9008080?hl=pt-BR): a primeira exige DNS; a segunda permite tag HTML ou arquivo no site. A autorização do Perfil da Empresa não foi reaproveitada: o lojista autorizou separadamente a concessão de propriedade e o sitemap. Após publicar a configuração existente, o Google confirmou a propriedade e mostrou “O sitemap foi processado”, com 15 páginas. A lista inicialmente apresentou falha de busca durante processamento; o detalhe atualizado confirmou a leitura. Não houve alteração de DNS. A captura final do processamento ficou limitada pela exigência de atualização da extensão do Chrome; o estado textual foi conferido.

## Operação da verificação Google

- Adicionada somente `GOOGLE_SITE_VERIFICATION` ao `.env` privado da VPS, sem versionar o valor ou modificar código. Backup privado com permissão 600; demais variáveis preservadas.
- Recriado somente `app` com `docker compose up -d --no-deps --no-build --pull never --force-recreate app`. Imagem preservada: `sha256:0415efa648e2e679ea824313c182f35a4b910fbba3570695fa53164e3fe0646c`. Container voltou a `healthy`; banco e demais serviços não foram recriados.
- Homepage pública retornou HTTP 200 com metatag correspondente; sitemap retornou HTTP 200, XML válido e 15 URLs, inclusive com User-Agent Googlebot. Robots permite sitemap e páginas públicas.
- Manter a chave nas próximas atualizações. Rollback remove somente a chave adicionada, preservando alterações concorrentes, e recria apenas o app; isso revoga a continuidade desta verificação e deve ser deliberado.

## Dados e padrão de cadastro

- Usar a marca **Wimifarma**, domínio oficial, endereço e contato comercial consistentes. O CNPJ foi conferido pelo fluxo do Reclame AQUI e já havia sido informado pelo lojista no cadastro da loja do Melhor Envio.
- Não substituir endereço operacional por informação antiga de diretórios públicos, nem publicar telefone de autenticação do titular como telefone de atendimento da loja. Contato público atual do site: **(44) 98413-4971**.
- Usar sempre a logo oficial completa. Inserir links de perfis públicos no rodapé somente depois de confirmar identidade e publicação. Ficha localizada não equivale a ficha gerenciada.
- Escolher a modalidade básica gratuita. RA Verificada, relatórios, anúncios e outros planos comerciais precisam de análise e autorização próprias; não são necessários para iniciar a página gratuita.
- Não guardar senhas, códigos de confirmação, tokens ou documentos privados nos registros do projeto. Validação de titular e criação de senha seguem o fluxo do serviço.

## Selos e avaliações reais

### Reclame AQUI / RA1000

O [critério oficial atualizado em julho de 2026](https://blog.reclameaqui.com.br/selo-ra1000-muito-mais-credibilidade-na-reputacao/) exige simultaneamente, no mesmo período reputacional: pelo menos 50 avaliações, respostas e solução de pelo menos 90%, nota do consumidor de pelo menos 7 e intenção de voltar a comprar de pelo menos 70%. A auditoria também considera cadastro superior a seis meses, moderação e irregularidades.

Criar a página gratuita inicia a presença e o histórico; não concede RA1000. Responder e resolver casos reais é a ação operacional apropriada. Não criar reclamações ou avaliações para alcançar contadores.

### Ebit / Diamante

A [página oficial da NIQ](https://nielseniq.com/global/pt/landing-page/ebit/nielseniq-ebit-brasil/quero-me-tornar-parceiro-colaborador/) anuncia adesão gratuita. A [orientação de cadastro](https://ebit.zendesk.com/hc/pt-br/articles/360011020013-Como-posso-cadastrar-minha-loja-virtual-na-Ebit) exige revisão da loja e integração. A disponibilidade real de novas adesões precisa ser confirmada devido aos links falhos observados.

O [termo atualmente publicado, Anexo II](https://company.ebit.com.br/termo-lojista), exige para Diamante: ao menos 90 dias de convênio; 2.000 pesquisas de compra e 200 de entrega nos últimos 90 dias; no mínimo 85% de entrega no prazo e 85% de intenção de recompra. Materiais antigos apresentam números diferentes; usar a versão contratual aceita pela loja e confirmar critérios com a Ebit na adesão.

O termo exige integração de pesquisa após pedido e selo dinâmico, sujeitos à aprovação. Ele também proíbe descontos e prêmios por avaliações Ebit. Não reaproveitar o cashback das avaliações próprias como incentivo para Ebit ou Google. Nenhum script externo foi instalado nesta preparação.

## Ordem prática recomendada

1. Concluir propriedade do perfil Google já existente e a página básica Reclame AQUI.
2. Verificar Search Console e enviar sitemap, para acompanhar indexação e buscas.
3. Configurar Merchant Center para produtos elegíveis, com preços, frete e devoluções consistentes. [Listagens gratuitas](https://support.google.com/merchants/answer/13889434?hl=pt-BR) não exigem campanha paga; aprovação de medicamentos segue [política específica](https://support.google.com/merchants/answer/6150151?hl=pt-BR).
4. Reivindicar/cadastrar Bing Places gratuito com os mesmos dados; o [endereço atual](https://www.bing.com/forbusiness) substitui o fluxo antigo.
5. Concluir adesão Ebit somente quando houver confirmação de novas inscrições e aprovação da loja.

Search Console, Merchant Center, Google Perfil da Empresa e Bing Places são canais de presença e gestão; não são certificações de segurança. RA1000 e Diamante dependem de resultados reais. Manter dados empresariais, políticas claras, HTTPS, atendimento e avaliações verificadas continua sendo parte da confiança, sem promessa de invulnerabilidade ou posição garantida nas buscas.

## Validação e limites da entrega

- Inspeção dos fluxos oficiais em navegador e pesquisa primária independente; nenhuma confirmação baseada apenas em link de cadastro.
- Sem mudança de código, dependência, banco, pagamento, frete ou autorização comercial. Publicação limitada à variável de verificação já suportada e recriação do app com a mesma imagem; lint/build não foram repetidos.
- `npm.cmd run test:security`: 92 testes passaram. `npm.cmd audit --omit=dev --audit-level=high`: zero vulnerabilidades. Auditoria completa `npm.cmd audit --audit-level=moderate`: cinco alertas high na cadeia de ferramentas de desenvolvimento permanecem; não ocultar esses alertas. Revisão independente confirmou cuidados de runtime, backup, imagem e teste público.
- Pendências que exigem ação do titular, aceite ou aprovação externa permanecem explícitas. As credenciais de outras plataformas não são reutilizadas nestes cadastros.
