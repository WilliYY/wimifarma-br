# 33 - E-mails personalizados para clientes

## Situação e proposta

Comparação de 04/10: `35-referencias-catalogo-e-emails.md`. Para começar sem mensalidade, Brevo Free e créditos pré-pagos; alternativa com cobrança por uso é SES, com listmonk para campanhas. Hospedagem/manutenção e autenticação de domínio continuam necessárias. Nenhum serviço novo foi contratado ou conectado.

Pedido do lojista em 03/10/2026: confirmação de compra, recuperação de carrinho e novidades. **O site ainda não envia e-mails.** Não existe provedor de e-mail configurado, remetente autenticado, fila de e-mails ou consentimento específico de marketing persistido. A proposta abaixo não habilita disparos nem importa clientes para terceiros.

Recomendação: Brevo, cuja API oficial reúne e-mails transacionais, contatos e campanhas. Usar a conta empresarial da Wimifarma, sem misturar com outros projetos. O lojista ainda precisa confirmar o serviço/conta; não contratar plano pago automaticamente. Modelos visuais com dados fictícios: `email-modelos.html`.

## Mensagens e disparadores

| Mensagem | Evento e conteúdo | Controle |
| --- | --- | --- |
| Pedido recebido | Transação do pedido concluída no banco; número, valor e próximo passo | Não dizer “pago” enquanto o gateway não confirmar |
| Pagamento confirmado | Conciliação autenticada do Mercado Pago muda o pedido para PAID | Uma mensagem por pedido/evento; webhook repetido não duplica |
| Pedido enviado | Equipe registra envio/rastreio confirmado | Informar a transportadora real; não prometer postagem pelo simples cálculo de frete |
| Carrinho aguardando | Proposta: após 1 hora de inatividade, com e-mail identificado e autorização de marketing | Cancelar ao esvaziar/comprar/descadastrar; no máximo 1 lembrete por carrinho e 1 por cliente em 24 horas |
| Novidades | Campanha escolhida, revisada e enviada pelo ADMIN | Somente inscritos; descadastro visível; não disparar automaticamente cada produto novo |

A compra e a mensagem de pagamento confirmado são eventos diferentes. Erros de entrega de e-mail não podem desfazer ou bloquear uma compra. Não enviar lembrete para carrinho anônimo: antes de fornecer e-mail, não existe destinatário legítimo identificado.

## Personalização e privacidade

- Usar primeiro nome, número do pedido, estado do pagamento e link seguro da conta. Nunca inferir doença ou segmentar campanhas por medicamentos comprados, receitas, princípios ativos ou outros dados de saúde.
- Recibos e lembretes devem usar assunto genérico e resumo mínimo; não colocar detalhes clínicos no assunto, no tracker ou nos eventos enviados à Brevo. O cliente confere os produtos dentro da conta autenticada.
- Criar adesão opcional e desmarcada: “Quero receber ofertas e novidades da Wimifarma por e-mail”. Registrar data, origem e versão do texto; manter separada do aceite de privacidade necessário ao checkout. Rejeitar marketing não impede comprar.
- Não transformar usuários existentes em inscritos. Descadastro de marketing, reclamações e endereços inválidos entram em lista de supressão. Mensagens estritamente transacionais seguem finalidade própria e não incluem campanha promocional embutida.
- Não incluir chave de compra, token de acesso ou e-mail em links de marketing. Recuperação do carrinho exige sessão autenticada e revalida preço, estoque, receita e embalagem ao voltar ao site.

## Implantação após escolher a conta

1. Autenticar um domínio/subdomínio exclusivo, por exemplo `emails.wimifarma.com.br`, seguindo os registros apresentados pela conta Brevo. DKIM/DMARC e os demais registros devem ser conferidos no DNS real; não inventar valores nem substituir registros de outro serviço. Gmail pessoal não serve como domínio autenticado da loja.
2. Validar o remetente, por exemplo `Wimifarma <pedidos@emails.wimifarma.com.br>`, e um Reply-To que a equipe realmente recebe. O endereço é uma proposta, não uma caixa já criada.
3. Guardar a chave da API exclusivamente no cofre do servidor. Criar configuração e aba de e-mails somente ADMIN, com ativação separada para transacionais, carrinhos e campanhas, inicialmente pausadas.
4. Implementar outbox própria com evento único, destinatário, modelo/versão e estado de envio. Confirmar aceitação do provedor e distinguir de entrega efetiva. Resposta incerta exige conciliação, sem repetir cegamente uma mensagem possivelmente aceita.
5. Consumir webhooks autenticados de entrega, erro, reclamação e descadastro. Guardar evidência mínima e evitar corpo ou segredo em logs.
6. Testar primeiro com destinatário interno autorizado, nunca com a base de clientes. Conferir celular, desktop, caixa de entrada e spam. Ativar cada automação após esses testes; campanhas continuam exigindo revisão do ADMIN.

## Limites desta entrega

Conta do provedor, acesso ao DNS, remetente e regras de adesão precisam ser definidos antes da integração de envio. Nenhuma migration de marketing, importação de dados, chave privada ou envio real foi criada nesta etapa. As três prévias permitem revisar a identidade visual e o texto antes dessa configuração.

Prévia verificada em desktop e celular de 390 px, com três logos oficiais carregadas e sem overflow. Capturas locais: `outputs/email-modelos/desktop.png` e `mobile.png`, fora do Git e com dados fictícios. Isso valida a prévia no navegador; a homologação nos clientes reais de e-mail faz parte da integração futura.

## Referências consultadas em 03/10/2026

- API oficial e recursos transacionais/campanhas: https://developers.brevo.com/docs/getting-started
- Diferenças entre mensagens de marketing e transacionais: https://help.brevo.com/hc/en-us/articles/360021196220-What-are-the-differences-between-marketing-transactional-and-automation-emails
- Autenticação de domínio: https://help.brevo.com/hc/en-us/articles/35852083084178-Domain-setup-for-better-email-deliverability
- Webhooks protegidos: https://developers.brevo.com/docs/secured-webhooks
