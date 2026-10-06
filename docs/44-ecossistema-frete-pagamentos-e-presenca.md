# 44 - Ecossistema de frete, pagamentos e presença da Wimifarma

## Escopo e estado em 06/10/2026

O lojista pediu uma recomendação de transporte para ampliar o atendimento, integração Asaas sem mensalidade, escolha automática do menor custo e orientação sobre cadastros externos. A pesquisa não criou contas, contratos, cobranças, etiquetas ou mensagens. A nova conferência autenticada do Asaas confirmou ausência de chaves e botão **Gerar chave de API** desabilitado, sem motivo apresentado. Nenhum bloqueio foi contornado. Mercado Pago permanece o único gateway do checkout.

## Frete recomendado

Manter **Melhor Envio + Correios PAC/SEDEX** como operação inicial. A cotação real já retornou preços para origem em Ivaté; resultados e estimativas de volumes estão no documento [43](43-frete-estimado-e-validacao-asaas.md). Um novo agregador não amplia automaticamente a cobertura quando revende as mesmas transportadoras. Para outro CEP, disponibilidade, serviço, preço e prazo dependem da consulta e da aceitação da mercadoria.

Antes de adicionar uma integração, comparar o mesmo volume, valor segurado, CEP e prazo, incluindo custo de coleta/postagem e adicionais. Confirmar o ponto acessível ou a coleta em Ivaté e as condições de conservação. Cosméticos líquidos, aerossóis, chocolates e medicamentos não possuem a mesma aceitação operacional.

- **SuperFrete:** candidato para uma comparação futura sem mensalidade, principalmente de mercadorias comuns. A sobreposição de Correios/Jadlog/Loggi não demonstra nova cobertura. As condições Jadlog para origem no Paraná precisam ser esclarecidas antes de ativar; ver fontes no documento 43.
- **Frenet:** interessante quando houver volume ou contrato de transportadora negociado; contratos próprios exigem plano pago, incompatível com a preferência atual por ausência de mensalidade. Jadlog restringe medicamentos e outros produtos, com exceções somente mediante consulta.
- **envia.com:** não é a primeira escolha para o catálogo de farmácia; sua política publicada restringe medicamentos/líquidos. Confirmar o contrato brasileiro antes de considerar integração.

Há divergência documental para líquidos: [Correios](https://www.correios.com.br/enviar/proibicoes-e-restricoes/proibicoes-e-restricoes) permite não perigosos com embalagem e identificação adequadas, enquanto o [guia Melhor Envio](https://centraldeajuda.melhorenvio.com.br/hc/pt-br/articles/31220391789332-Guia-de-produtos-que-podem-ou-n%C3%A3o-ser-enviados-pelo-Melhor-Envio) prevê condições específicas para medicamentos líquidos. Aplicar as regras do canal contratado; cotação não representa autorização de postagem. [Anvisa, FAQ de transporte](https://www.gov.br/anvisa/pt-br/acessoainformacao/perguntasfrequentes/administrativo/autorizacao-de-funcionamento-afe-ou-ae/distribuidora-importadora-e-transportadora) prevê exceção de AFE entre varejista e consumidor final, com exigências adicionais para controlados. Não exigir AFE indiscriminadamente nem remover as regras de dispensação.

A melhoria operacional prioritária é conferir caixas reais e consolidar vários itens, pois o cálculo atual usa uma caixa por unidade. Nenhuma consolidação ou segunda plataforma foi implementada nesta pesquisa.

## Asaas e escolha do menor custo

O plano Básico e a integração API não exigem mensalidade; recebimentos e serviços adicionais têm tarifas. Os [preços oficiais](https://www.asaas.com/precos-e-taxas) distinguem recebimento Pix de pagamentos/transferências e orientam conferir o contrato da conta. Não contratar Plano Avançado, antecipação, subconta ou notificações pagas apenas para integrar o checkout.

O comparador determinístico existente em `/admin/pagamentos` já considera percentual, tarifa fixa, valor, parcelas, validade e prazo. Não precisa de IA nem chamadas a modelos. A integração de consulta Asaas preparada usa [taxas da própria conta](https://docs.asaas.com/reference/recuperar-taxas-da-conta), com revisão a cada seis horas após conexão e validade de 24 horas. Hoje está sem credencial; tarifas manuais não se atualizam sozinhas. Taxa desconhecida nunca é zero.

O comparador administrativo ainda **não roteia cobranças**. Para isso, o contrato de implementação é:

1. Conectar e homologar cada gateway, com tarifas comerciais confirmadas por método/parcelas. Comparar custo total, incluindo juros absorvidos, tarifa fixa e antecipação se contratada; estabelecer o prazo aceito pelo lojista.
2. Excluir provedores inativos, não homologados, de sandbox ou com tarifas expiradas/incompletas. Não declarar um provedor mais barato sem conhecer os custos elegíveis.
3. Escolher o provedor no servidor e persistir atomicamente provedor, conta, ambiente, decisão de tarifa e chave idempotente antes da cobrança. O modelo atual de pagamento ainda não guarda o provedor escolhido e a tarifa aplicada para esse roteamento.
4. Usar interface segura compatível com o provedor. Token de cartão Mercado Pago não é reutilizável automaticamente no Asaas. O [Asaas não oferece tokenização de cartão no navegador](https://docs.asaas.com/docs/pci-dss); captura direta pelo nosso servidor amplia obrigações PCI. Preferir [página hospedada do Asaas](https://docs.asaas.com/docs/checkout-asaas) para cartão, caso essa experiência seja aprovada. Pix pode ter QR/copia e cola na interface da loja após homologação de cobrança e expiração.
5. Implementar webhook autenticado e reconciliação Asaas. Timeout ou resposta incerta mantém o provedor e a tentativa original; nunca cria uma segunda cobrança em outro gateway. Confirmar pagamento no provedor antes de atualizar pedidos, cashback e mensagens.

O serviço atual de Mercado Pago já conserva idempotência e resultados incertos; a segunda integração não deve enfraquecê-los. Não houve nova ativação ou tentativa de pagamento. Detalhes em [38](38-politica-de-taxas.md) e [40](40-asaas-configuracao-e-homologacao.md).

### Bloqueio e próxima ação no Asaas

A página `https://www.asaas.com/customerApiAccessToken/index` permaneceu sem chaves e com botão desabilitado na conferência de hoje. A [orientação oficial de geração](https://central.ajuda.asaas.com/hc/pt-br/articles/33618186066331-Como-gerar-uma-nova-chave-de-API-no-Asaas) exige cadastro aprovado, atividade/faturamento preenchidos e confirmação Token App/SMS. Não foi inferida a causa do bloqueio nem inventado dado financeiro.

Texto preparado para o titular solicitar suporte, sem envio automático: “Minha conta empresarial está aprovada, mas em Integrações → Chaves de API o botão Gerar chave de API está desabilitado e não há nenhuma chave. Qual requisito falta para liberar a API no plano Básico? Confirmem também as tarifas de recebimento por cobrança Pix e cartão, separadas de transferências e notificações.”

Após liberação e confirmação segura da chave, conectar a consulta de tarifas no painel e homologar cobrança separadamente. Conta aprovada ou taxa cadastrada não significa segundo gateway pronto.

## Cadastros externos, em ordem de prioridade

| Cadastro | Para que serve | Custo básico e ação |
| --- | --- | --- |
| [Google Perfil da Empresa](https://business.google.com/add) | Maps, buscas locais, horários, fotos, contatos e avaliações | [Gratuito](https://support.google.com/business/answer/2911778?hl=pt-BR). Reivindicar perfil existente antes de criar outro; manter nome/endereço/telefone consistentes. |
| [Google Search Console](https://search.google.com/search-console) | Indexação, termos de busca e erros técnicos | [Gratuito](https://support.google.com/webmasters/answer/9128668?hl=pt-BR). Verificar domínio e enviar `https://wimifarma.com.br/sitemap.xml`. Não é selo e não garante posição. |
| [Google Merchant Center](https://merchants.google.com/) | Produtos, preços e disponibilidade em listagens gratuitas | [Listagens gratuitas](https://support.google.com/merchants/answer/12159157?hl=pt-BR). Verificar domínio, políticas e fonte `https://wimifarma.com.br/google-products.xml`; iniciar com mercadorias elegíveis. |
| [Bing Places](https://www.bingplaces.com/) | Presença complementar nas buscas locais do Bing | Cadastro [gratuito](https://www.bing.com/forbusiness/help/modernExperience?setlang=en); reivindicar perfil e manter os mesmos dados empresariais. |
| [Reclame AQUI](https://www.reclameaqui.com.br/criar-pagina-empresa) | Página da empresa, atendimento e reputação | [Página básica gratuita](https://www.reclameaqui.com.br/empresa/reclameaqui/faq/sou-empresa-e-quero-me-cadastrar_4toEyA3djba7xEAh/), com CNPJ e validação. [RA1000](https://blog.reclameaqui.com.br/o-que-e-o-selo-ra1000/) depende de indicadores e auditoria; não vem com o cadastro. |
| [Ebit](https://www.ebit.com.br/empresa) | Avaliações pós-compra e reputação do comércio | [Programa básico gratuito](https://company.ebit.com.br/Termos/termo-lojista_EBIT_NIELSEN.pdf), condicionado à [aprovação da loja](https://ebit.zendesk.com/hc/pt-br/articles/360011020013-Como-posso-cadastrar-minha-loja-virtual-na-Ebit). Começa “Em Avaliação”; medalhas dependem de avaliações e critérios. |

As contas não foram criadas nem sua propriedade confirmada nesta pesquisa inicial. Preparação posterior e bloqueios reais dos formulários estão em [46-cadastros-reputacao-e-presenca.md](46-cadastros-reputacao-e-presenca.md): ficha Google existente, validação Reclame AQUI por e-mail vinculado, links de adesão Ebit sem formulário e Search Console pendente de DNS. Nenhuma integração Ebit ou selo foi publicado. Search Console e Merchant Center são ferramentas administrativas; não usar seus logos como certificação de segurança.

### Produtos e avaliações no Google

A [política de saúde para listagens gratuitas](https://support.google.com/merchants/answer/12079605?hl=pt-brbr) também se aplica ao Merchant Center sem anúncios pagos. Medicamentos isentos de prescrição no Brasil exigem registro da farmácia e certificação Google; os sujeitos a receita não são permitidos nessas listagens brasileiras. Suplementos, alegações e ingredientes também precisam de análise. O feed atual já restringe exportação a tipos elegíveis de higiene, beleza e alimentos, com identidade, imagem e preço verificados; isso não comprova aprovação do Google. SEO orgânico e aprovação de produto no Merchant Center são processos diferentes.

Cashback por avaliação no site continua sob seu contrato próprio. **Não estender o incentivo às avaliações do Google:** a [política de contribuições](https://support.google.com/contributionpolicy/answer/16597558?hl=pt-BR) proíbe benefícios em troca de avaliações.

## Apresentação profissional no próprio site

Priorizar marca oficial, fotos reais, contatos e horários, formas de pagamento e entrega claras, política de trocas/devoluções e privacidade. Informações sanitárias devem ser reais e vigentes. A [RDC 44/2009, arts. 53–55](https://anvisalegis.datalegis.net/action/ActionDatalegis.php?acao=abrirTextoAto&cod_menu=8542&cod_modulo=310&link=S&numeroAto=00000044&orgao=RDC%2FDC%2FANVISA%2FMS&seqAto=000&tipo=RDC&valorAno=2009) prevê na página principal identificação empresarial, CNPJ/endereço/contatos, farmacêutico responsável/CRF, licença sanitária, AFE e AE quando aplicável, além dos procedimentos e links pertinentes. Não preencher licenças ou números profissionais por suposição; esta pesquisa não atesta a regularidade documental da loja.

Selos só devem aparecer depois de concedidos e vinculados à Wimifarma. HTTPS, ícones de cadeado e marcas de gateways não equivalem a auditoria independente ou garantia de invulnerabilidade.

## Verificação desta entrega

Pesquisa e documentação não alteraram banco, configuração comercial de pagamento/frete ou cadastros externos. Houve conferência atual do botão Asaas pelo navegador, revisão independente somente leitura dos contratos de tarifas/cobrança e pesquisa oficial de transporte/presença.

A auditoria de entrega revelou GHSA-wq5f-xc86-pv6w; o commit `cf2ceb0` atualiza a dependência de imagens Sharp 0.35.4 → 0.35.5 e seu lock, sem mudar a API. Passaram 27 testes de imagens, 79 de segurança, typecheck, lint e revisão independente. Auditoria de produção: zero vulnerabilidades; auditoria completa: cinco high na cadeia de desenvolvimento/lint, sem correção forçada. O [workflow Security checks](https://github.com/WilliYY/wimifarma-br/actions/runs/37504595404) desse commit passou.

Patch publicado com build Docker/Linux, app healthy/zero reinícios e prova da biblioteca arm64 idêntica ao pacote oficial que contém librsvg 2.63.2. Conversão sintética de imagem passou; health/home/checkout responderam 200 e APIs privadas anônimas 401/no-store. Imagem anterior mantida para recuperação; comprovante e hashes em [42-revisao-de-seguranca.md](42-revisao-de-seguranca.md). Esta correção não homologou pagamentos Asaas, nem alterou frete, dados comerciais ou contas externas.
