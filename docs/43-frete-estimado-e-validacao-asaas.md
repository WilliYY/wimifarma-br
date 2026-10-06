# 43 - Frete estimado, envio próprio de e-mails e validação Asaas

## Decisão do lojista em 06/10/2026

O lojista autorizou usar peso médio para iniciar cotações, sem tratar a estimativa como medição. Perfis operacionais propostos por unidade pronta para envio:

| Produto | Peso total estimado, com caixa e proteção | Caixa externa C × L × A |
| --- | --- | --- |
| Cimegripe 20 cápsulas | 500 g | 20,8 × 20,8 × 21,6 cm |
| KitKat do cadastro atual | 500 g | 20,8 × 20,8 × 21,6 cm |
| Dove óleo de banho 240 ml | 800 g | 20,8 × 20,8 × 21,6 cm |

São margens operacionais autorizadas, não pesos exatos de fabricante. A caixa [Packit de 20 cm](https://www.packit.com.br/10-caixas-de-papelao-20x20x20-cm) informa medidas internas de 20 × 20 × 20 cm e externas acima. O modelo não foi comprado ou pesado; não combinar sua dimensão com tara confirmada de outro fabricante. O peso total não deve receber tara novamente. Conferir caixa, encaixe, proteção e peso reais antes da postagem, pois divergências podem gerar ajuste de cobrança.

O [Dove no distribuidor](https://www.goiasatacado.com.br/oleo-dove-240ml-banho-glicerinado-51854-1) informa 0,320 kg e dimensões comerciais de 6 × 6 × 14 cm, sem identificar peso bruto. As referências de medicamento continuam insuficientes para declarar medidas precisas. KitKat segue sem EAN/gramagem confirmados; a estimativa vale somente para a unidade cadastrada e deve ser revista ao identificar/apresentar outro tamanho.

Losartana cadastrada exige receita; permanece no atendimento farmacêutico e não recebe liberação automática. Frete por transportadora continua limitado à aceitação dos serviços. Para chocolates e líquidos, revisar conservação, lacração e proteção. Nenhuma regra de receita foi removida.

## Cadastro e aprovação

Perfis guardam `measurementBasis` (`measured` ou `estimated`). O painel permite salvar rascunhos parciais desabilitados, usar o preset de dimensões externas da caixa e revisar explicitamente antes de liberar. Trocar a caixa invalida a revisão e a liberação; preserva o peso preenchido. Dados incompletos ou `enabled: true` sem revisão não são aceitos. APIs continuam exclusivas de ADMIN, com atualização otimista e auditoria.

O cálculo atual mantém um volume por unidade. Duas unidades geram duas caixas e a cotação pode ser mais cara que uma caixa consolidada. Esta entrega não implementa encaixe/consolidação automática nem promete tarifa ótima para carrinhos mistos. Cotação automática por CEP, ordenação por preço e prazo de desempate e frete local gratuito preservados. A aprovação operacional e o teste real têm comprovante próprio abaixo.

## Podemos entregar e-mails diretamente?

Sim, tecnicamente podemos manter software de campanhas e servidor SMTP próprios. O que não se elimina é a operação: fila, tentativas seguras, DKIM/SPF/DMARC, DNS reverso/PTR, TLS, reputação do IP, devoluções, reclamações e descadastro. O [Gmail exige autenticação e DNS reverso válido](https://support.google.com/mail/answer/81126). Instalar software não garante que mensagens cheguem à caixa de entrada.

Diagnóstico somente leitura em 06/10: domínio principal tem SPF `v=spf1 -all`, DMARC `p=reject` e MX nulo `0 .`. SPF não autoriza remetentes; MX nulo declara ausência de recebimento de e-mails, não bloqueia sozinho o envio. DKIM existente não foi inferido por varredura de seletores. O domínio não está preparado nesta verificação para um novo servidor remetente. Uma conexão do VPS ao MX Gmail pela porta 25 expirou após oito segundos (exit 124); não determina sozinha a origem do bloqueio. [Oracle documenta bloqueio padrão de SMTP externo em contas recentes](https://docs.oracle.com/en-us/iaas/Content/Network/Troubleshoot/vcn_troubleshooting.htm).

Não alteramos DNS, firewall, reputação ou servidor de e-mail. Recomendação sem mensalidade: painel nosso com provedor gratuito ou por uso, preservando fila/prioridade e descadastro. A decisão entre infraestrutura própria e relay fica separada da interface administrativa. Quotas e projeto do painel em [41-emails-pagamentos-e-confianca.md](41-emails-pagamentos-e-confianca.md).

## Asaas: conferência da conta em 06/10

- Login do titular concluído; dados comerciais, documentos e aprovação geral aparecem aprovados.
- Plano **Básico** é o plano atual. Não contratamos Plano Avançado, mensalidade, subconta, antecipação ou notificações pagas.
- A tela **Taxas → Integrações** informa API e integrações gratuitas. Subcontas têm cobrança separada; não usamos subcontas.
- Cartão online: 1x em 1,99% + R$0,49, 2–6x em 2,49% + R$0,49, promoção até 04/01/2027; prazo de 32 dias. Antecipação é adicional.
- **Integrações → Chaves de API → Gerar chave de API** continua desabilitado e sem chave existente. Motivo não informado na interface. É bloqueio do painel Asaas; não foi contornado. Conta aprovada não significa integração de cobrança homologada.
- A gratuidade de Pix dinâmico está na aba **Movimentações financeiras**, junto de pagamentos/transferências. Isso não comprova recebimento comercial gratuito. A tarifa manual de zero cadastrada anteriormente deve ser retirada da comparação até confirmação da tarifa de entrada; não cadastrar taxa pública como contrato da conta.

[Preços oficiais](https://www.asaas.com/precos-e-taxas) distinguem manutenção gratuita, taxas por recebimento e serviços adicionais. Não é preciso comprar plano mensal para a integração básica. Próxima ação na conta: solicitar ao suporte a liberação de chave API e a confirmação da tarifa de Pix recebido por cobrança. Não foi enviada mensagem de suporte em nome do lojista.

## Caminhos para reputação

- [Criar página da empresa no Reclame AQUI](https://www.reclameaqui.com.br/criar-pagina-empresa): informar CNPJ, validar e-mail e acesso. Cadastro básico gratuito. [Guia oficial](https://www.reclameaqui.com.br/empresa/reclameaqui/faq/sou-empresa-e-quero-me-cadastrar_4toEyA3djba7xEAh/).
- **RA1000** não é uma conta ou plano para contratar: é reputação alcançada pelos critérios e auditoria do Reclame AQUI. [Explicação oficial](https://blog.reclameaqui.com.br/o-que-e-o-selo-ra1000/).
- [Ebit para empresas](https://www.ebit.com.br/empresa): cadastrar a loja, aguardar aprovação e integrar o código oficial recebido. Começa com selo “Em Avaliação”; Diamante depende da reputação. [Passo a passo oficial](https://ebit.zendesk.com/hc/pt-br/articles/360011020013-Como-posso-cadastrar-minha-loja-virtual-na-Ebit).

Não criamos contas, aceitamos contratos, contratamos planos ou exibimos selos não concedidos. Ebit e Reclame AQUI não substituem a segurança técnica do site.

## Comprovante de validação

Publicação, testes, atualização dos perfis reais e retorno do Melhor Envio serão registrados após a conferência. Não confundir simulação administrativa com carrinho elegível, etiqueta comprada ou postagem realizada.
