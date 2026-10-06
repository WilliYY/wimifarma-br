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

Losartana cadastrada exige receita; recebeu rascunho estimado de 500 g na mesma caixa, sem revisão ou transporte habilitados. Permanece no atendimento farmacêutico e não recebe liberação automática. Frete por transportadora continua limitado à aceitação dos serviços. Para chocolates e líquidos, revisar conservação, lacração e proteção. Nenhuma regra de receita foi removida.

## Cadastro e aprovação

Perfis guardam `measurementBasis` (`measured` ou `estimated`). O painel permite salvar rascunhos parciais desabilitados, usar o preset de dimensões externas da caixa e revisar explicitamente antes de liberar. Trocar a caixa marca a origem estimada, invalida a revisão e a liberação e preserva o peso preenchido. Dados incompletos ou `enabled: true` sem revisão não são aceitos. APIs continuam exclusivas de ADMIN, com atualização otimista e auditoria.

A pedido seguinte do lojista, a interface foi unificada: uma pesquisa/aplicação no topo faz cadastro, descrição/SEO e peso/medidas. A seção logística mantém fontes, referências/estimativas e edição manual, sem uma segunda IA ou botão de pesquisa. Todos os tipos podem guardar dados de embalagem, inclusive rascunho para medicamentos com receita; os bloqueios de venda/dispensação automática permanecem. Ver [29-cadastro-logistica-ia.md](29-cadastro-logistica-ia.md).

O cálculo atual mantém um volume por unidade. Duas unidades geram duas caixas e a cotação pode ser mais cara que uma caixa consolidada. Esta entrega não implementa encaixe/consolidação automática nem promete tarifa ótima para carrinhos mistos. Cotação automática por CEP, ordenação por preço e prazo de desempate e frete local gratuito preservados. A aprovação operacional e o teste real têm comprovante próprio abaixo.

## Precisamos de outra plataforma de envio?

Pesquisa oficial em 06/10/2026: manter Melhor Envio por enquanto. A cotação real funciona com Correios PAC/SEDEX; uma segunda integração deve demonstrar vantagem no preço final para o mesmo volume, prazo e valor segurado, ou oferecer coleta/postagem acessível a partir de Ivaté. Cotações disponíveis não comprovam aceitação de todos os produtos, disponibilidade de coleta ou contratação de transporte farmacêutico. Nenhuma segunda plataforma foi cadastrada, conectada ou contratada nesta entrega.

| Plataforma | Custo e possibilidade de integração | Limitação decisiva para esta loja |
| --- | --- | --- |
| Frenet | [Plano Iniciante R$0](https://frenet.com.br/planos-e-precos/), fretes pagos por envio; [API para integração própria](https://ajuda.frenet.com.br/knowledge-base/api-frenet/). Contratos próprios de transportadoras exigem plano Profissional de R$99/mês. | Há sobreposição de transportadoras. As [regras Jadlog](https://ajuda.frenet.com.br/knowledge-base/regras-de-embarque-jadlog/) restringem medicamentos/farmacêuticos, com exceções sob consulta. Conferir [pontos de postagem](https://docs.frenet.com.br/docs/transportadoras-e-pontos-de-postagem) antes de ativar. |
| envia.com | [API de cotação, etiquetas e rastreamento](https://docs.envia.com/docs/getting-started), sem taxa adicional de integração; [preços no Brasil](https://envia.com/pt-BR/precos) dependem de saldo pré-pago ou crédito elegível. Não foi encontrada tabela pública de mensalidade nesta pesquisa. | A [política publicada](https://help.envia.com/pt/artigos-proibidos/) lista medicamentos como proibidos e líquidos como restritos. A aceitação específica no Brasil precisa ser confirmada; não resolve automaticamente o catálogo de farmácia. |
| SuperFrete | [Sem mensalidade ou volume mínimo](https://superfrete.com/), pagamento por etiqueta; [API própria e sandbox](https://superfrete.readme.io/reference/primeiros-passos). | [Cosméticos e perfumes](https://ajuda.superfrete.com/artigo/posso-enviar-cosmeticos-e-perfumes/) têm condições por transportadora; aerossóis são proibidos. Documentação Jadlog tem divergência sobre declaração/NF para origem no Paraná: [regras de operação](https://ajuda.superfrete.com/artigo/como-funciona-a-jadlog-na-superfrete/) e [ativação](https://ajuda.superfrete.com/artigo/como-ativar-e-desativar-a-jadlog-na-integracao-superfrete/). Confirmar antes de recomendar esse fluxo para Ivaté. |

Na simulação administrativa real de 06/10, a API Melhor Envio foi consultada sem filtro de serviços para origem configurada em Ivaté, destino 01001-000, 0,5 kg, C20,8 × L20,8 × A21,6 cm e valor R$4,99. A interface exibiu somente PAC R$21,70/9 dias úteis e SEDEX R$24,68/5 dias úteis; não houve seleção adicional nem salvamento da configuração global. Isso comprova o resultado dessa combinação, não ausência de outras transportadoras para todos os CEPs e volumes.

Antes de multiplicar agregadores, a consolidação de itens em uma caixa real e a revisão de embalagens menores podem reduzir custo, pois o sistema atual cota uma caixa por unidade. São melhorias futuras separadas, sem mudança do cálculo nesta entrega. Para medicamentos, priorizar aceitação formal da carga e condições de conservação, além do preço.

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
- A gratuidade de Pix dinâmico está na aba **Movimentações financeiras**, junto de pagamentos/transferências. Isso não comprova recebimento comercial gratuito. A tarifa manual de zero foi retirada do comparador em 06/10 pela operação administrativa auditada. Selecionar Pix passou a mostrar custo desconhecido/sem tarifa válida. Cartão 1x foi preservado; a conexão Mercado Pago permaneceu em produção/ativada. Não cadastrar taxa pública como contrato da conta.

[Preços oficiais](https://www.asaas.com/precos-e-taxas) distinguem manutenção gratuita, taxas por recebimento e serviços adicionais. Não é preciso comprar plano mensal para a integração básica. Próxima ação na conta: solicitar ao suporte a liberação de chave API e a confirmação da tarifa de Pix recebido por cobrança. Não foi enviada mensagem de suporte em nome do lojista.

## Caminhos para reputação

- [Criar página da empresa no Reclame AQUI](https://www.reclameaqui.com.br/criar-pagina-empresa): informar CNPJ, validar e-mail e acesso. Cadastro básico gratuito. [Guia oficial](https://www.reclameaqui.com.br/empresa/reclameaqui/faq/sou-empresa-e-quero-me-cadastrar_4toEyA3djba7xEAh/).
- **RA1000** não é uma conta ou plano para contratar: é reputação alcançada pelos critérios e auditoria do Reclame AQUI. [Explicação oficial](https://blog.reclameaqui.com.br/o-que-e-o-selo-ra1000/).
- [Ebit para empresas](https://www.ebit.com.br/empresa): cadastrar a loja, aguardar aprovação e integrar o código oficial recebido. Começa com selo “Em Avaliação”; Diamante depende da reputação. [Passo a passo oficial](https://ebit.zendesk.com/hc/pt-br/articles/360011020013-Como-posso-cadastrar-minha-loja-virtual-na-Ebit).

Não criamos contas, aceitamos contratos, contratamos planos ou exibimos selos não concedidos. Ebit e Reclame AQUI não substituem a segurança técnica do site.

## Comprovante de validação

- Código inicial `423dfd8`, publicado no GitHub/VPS. Revisão independente corrigiu origem estimada no preset; 47 testes de frete, 79 de segurança e 187 gerais passaram, além de lint, typecheck, Prisma validate e build Linux/Docker. Patch transitivo `source-map-js` 1.2.2 corrige [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q). Auditoria de produção zero; auditoria completa mantém cinco alertas high na cadeia de desenvolvimento/lint, sem downgrade forçado. CI Security checks passou.
- App healthy, zero reinícios, imagem `sha256:613a12d9218f50f92ca7cf0c74c756b762f2dc91190630d5594eef5406cbf896`. Recuperação `wimifarma-br-app:pre-estimated-shipping-423dfd8`; sem migration ou credenciais alteradas. Checkout 200 e APIs privadas de frete/histórico retornam 401 sem sessão.
- Chrome autenticado: três perfis da tabela foram salvos em ADMIN e conferidos após recarregar: `estimated`, peso/dimensões previstos, `transportReviewed: true`, `enabled: true`. Nenhum preço, estoque ou identidade de produto foi modificado.
- Checkout real com uma unidade do KitKat: preencher 01001-000 gerou PAC R$21,70/até 9 dias úteis e SEDEX R$24,68/até 5 dias úteis, nessa ordem. Escolher PAC atualizou o total de R$4,99 para R$26,69. Alterar para 87501-070 gerou os mesmos preços com até 8/4 dias úteis; 87525-000 exibiu Entrega local · Grátis. Os prazos incluem preparação. São preços retornados nesta consulta, não promessa permanente ou cobertura de todo CEP.
- Código seguinte `52256a8`, publicado no GitHub/VPS, unificou a interface e permitiu o rascunho de receita sem aprovação. Revisão independente sem pendências; 47 testes de frete e 79 de segurança, lint, typecheck, Prisma validate e build Linux/Docker aprovados. [CI Security checks](https://github.com/WilliYY/wimifarma-br/actions/runs/37466463119) passou.
- Imagem atual `sha256:bfcfc292def2468f83934cdc415245648914662c7b00bee3b58adce4fa7f417d`, healthy e zero reinícios. Recuperação `wimifarma-br-app:pre-unified-assistant-52256a8`; health OK, checkout 200 e APIs privadas de frete/histórico 401 sem sessão, conferidos após o segundo deploy.
- Conferência visual autenticada em larguras CSS efetivas de 390 e 1440 px: um assistente no topo, um botão de pesquisa, ausência de botões de pesquisa logística duplicados e sem transbordamento horizontal de página, modal ou campos. Formulário vazio foi cancelado; nenhum produto de demonstração foi criado. Losartana recarregada confirmou 500 g, dimensões previstas, `estimated`, `transportReviewed: false` e `enabled: false`.
- Nenhum pedido, pagamento, etiqueta ou envio de mensagem foi criado nos testes. As verificações de conta Asaas e configuração de Mercado Pago não constituem nova homologação de pagamento real.
