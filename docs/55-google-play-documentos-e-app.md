# 55 — Google Play: documentos e preparação do app

Verificação em 08/10/2026. Nenhum documento pessoal foi copiado para o repositório, enviado pelo agente ou incluído neste guia.

## Situação encontrada

O Play Console abriu a conta existente do titular como **conta pessoal**, sem aplicativo criado. A página solicitou confirmação de identidade e posterior validação de telefone. O Google vinculou o celular para continuar o envio de documento; isso não comprova aprovação da identidade. A janela foi deixada para continuidade posterior, conforme pedido do titular. Nenhum app foi publicado.

Google Play, Perfil da Empresa no Google e Search Console são serviços diferentes. O perfil empresarial acessível pela conta pessoal aparece como **Cópia**, sem verificação. A sessão de `wimifarma@gmail.com` não foi confirmada no navegador conectado; não foi criado outro perfil. A reivindicação anterior deve ser conferida antes de qualquer remoção ou novo cadastro.

## Documentos para separar agora

Para a conta pessoal brasileira, preparar **um documento oficial com foto**, como CNH ou RG, e **comprovante de residência** em nome do titular. Contas de consumo ou extrato bancário são exemplos aceitos. Nome e endereço devem coincidir com o perfil de pagamentos. Usar documento válido, colorido, legível e sem alterações. Enviar somente no fluxo oficial do Google; não enviar documentos ou códigos nesta conversa.

O formulário determina as imagens e comprovações finais. Depois da aprovação, concluir a confirmação do telefone e qualquer verificação de dispositivo Android indicada. Vincular o celular ao fluxo de documento não substitui necessariamente a verificação de dispositivo exigida para a conta.

Referências: [documentos aceitos no Brasil](https://support.google.com/googleplay/android-developer/answer/15633622?co=GENIE.CountryCode%3DBR&hl=pt-BR), [ordem das verificações](https://support.google.com/googleplay/android-developer/answer/10841920?hl=pt-BR).

## Conta da farmácia

Para publicar em nome da empresa, avaliar a conta **Organização** antes de criar o aplicativo. Preparar comprovante do CNPJ/registro empresarial, documento do representante autorizado e número **D-U-N-S**, com razão social e endereço coerentes. A solicitação do D-U-N-S é gratuita; não contratar intermediário pago por necessidade presumida. A mudança da conta existente precisa seguir a opção/suporte oficial, sem criar outra conta desnecessariamente.

O Google exige Organização para determinadas atividades, incluindo apps classificados como saúde/medicina. Um catálogo de comércio físico não deve ser classificado como serviço clínico automaticamente: definir as funcionalidades reais e conferir as políticas antes de escolher categoria e declarações.

Fontes: [tipo de conta](https://support.google.com/googleplay/android-developer/answer/13634885), [verificação e D-U-N-S](https://support.google.com/googleplay/android-developer/answer/10841920?hl=pt-BR).

## Próximos materiais do aplicativo

| Material | Preparação |
| --- | --- |
| Nome, descrição e suporte | Wimifarma, descrição factual de compras/retirada/entrega e contato comercial confirmado |
| Marca e imagens | Logo oficial, ícone adequado, imagens promocionais e capturas reais do app; sem selos concedidos ficticiamente |
| Privacidade e exclusão de conta | URLs públicas válidas e fluxo real de exclusão; revisar dados de endereço, pedidos, mensagens, analytics e possíveis dados de saúde |
| Segurança dos dados | Declarar coleta/compartilhamento/retensão conforme implementação e SDKs usados, incluindo pagamentos e notificações |
| Acesso da revisão | Instruções e conta de revisão, se houver área restrita; sem dados reais de clientes |
| Declarações da loja | Público-alvo, anúncios, classificação de conteúdo e declaração de saúde aplicável às funcionalidades reais |
| Pacote Android | Android App Bundle assinado, identificador definitivo, chave protegida e testes em dispositivo real |
| Teste fechado, quando exigido | Contas pessoais novas podem exigir ao menos 12 participantes por 14 dias consecutivos antes do pedido de acesso à produção |

Nenhum prazo de aprovação é garantido. Requisitos finais aparecem no Console e devem ser revisados antes do envio. [Regra oficial do teste fechado](https://support.google.com/googleplay/android-developer/answer/14151465?hl=pt-BR).

## Caminho técnico recomendado

Começar avaliando uma **PWA com Android Trusted Web Activity** para reaproveitar o site e o checkout, evitando duplicar catálogo, pedidos e administração. O projeto ainda não tem manifesto PWA, service worker nem Digital Asset Links; não há pacote Android pronto nesta entrega.

Antes de gerar/publicar: implementar manifesto e ícones oficiais, definir comportamento offline sem cache de dados privados ou pagamentos, associar domínio ao pacote e certificado reais, testar login, retorno de pagamento, Pix, cartão, navegação e retomada no Android. Só então gerar o AAB assinado e preencher a ficha da loja. Recursos nativos adicionais podem justificar outra arquitetura posteriormente.

Compras de produtos físicos podem usar o checkout externo de pagamentos existente; não transformar o catálogo em cobrança de conteúdo digital. Conferir [política de pagamentos](https://support.google.com/googleplay/android-developer/answer/9858738) e [TWA oficial](https://developer.chrome.com/docs/android/trusted-web-activity/quick-start?hl=pt-br) antes da implementação.

## Limites desta entrega

- Documentação e diagnóstico preparados; identidade ainda não aprovada no fluxo observado.
- Não enviada documentação pessoal, não alterado tipo de conta, não gerado D-U-N-S, não criado aplicativo e não aceitos novos contratos.
- A publicação depende de conta regularizada, decisão sobre o titular/organização, implementação Android e validações da loja.
