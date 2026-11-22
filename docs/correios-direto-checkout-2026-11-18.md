# Correios direto no checkout — 18/11/2026

## Decisão e funcionamento

A pedido do lojista, o contrato direto dos Correios passa a ser uma opção adicional de cotação na loja, junto com Melhor Envio e SuperFrete. A identidade é `provider: correios`, com código original `03298` para PAC e `03220` para SEDEX. Os IDs numéricos internos não pertencem ao catálogo Melhor Envio. A apresentação identifica **Correios — contrato Wimifarma**, inclusive quando somente esse canal responde.

O cliente escolhe a opção; o servidor assina a cotação por 15 minutos e revalida a seleção na criação do pedido. O preço do pedido vem do token validado, com conferência de CEP, produtos, quantidades, preços, revisão da integração, configuração ativa, carga e preparação. O snapshot conserva provedor, código, embalagem e postagem em AC Ivaté/PR. A ausência de cotação de um provedor não pode eliminar respostas válidas dos demais.

O contrato direto usa o custo integral cotado. Não herda subsídio, meta de frete grátis ou aprovação comercial de outros provedores. Preço e prazo continuam sujeitos ao CEP, pacote e contrato; prazo mostrado inclui preparação da farmácia. Não há mínimo de faturamento introduzido pelo sistema.

## Política própria de carga

A revisão solicitada pelo titular em 18/11 amplia o canal para medicamentos comuns já classificados, MIPs, higiene e cosméticos não perigosos, incluindo líquidos e pastosos com embalagem aprovada operacionalmente. A aprovação é específica por produto e serviço, no campo opcional `approvedCorreiosServiceCodes`, com PAC `03298` e SEDEX `03220`. Uma lista vazia bloqueia o canal. Produtos legados sem esse campo seguem a política inicial de carga geral seca e alimento industrializado seco. As estimativas físicas continuam identificadas como estimativas.

O canal cruza os códigos aprovados de todos os produtos na cotação e na criação do pedido. A lista é independente dos IDs de serviços do Melhor Envio. A aprovação permite carga geral, alimento industrializado, medicamento comum, líquido e perfume não perigoso. Controlados, antimicrobianos, Farmácia Popular, aerossóis, conteúdo não especificado, inflamáveis, solventes, pilhas/baterias, perecíveis e conservação especial seguem fora desse canal. A dispensação dos medicamentos sujeitos a receita comum exige a conferência farmacêutica já existente.

O titular confirmou embalagem, conservação ambiente e elegibilidade do catálogo. A revisão operacional usa essa confirmação e as condições publicadas pelos Correios. Para líquidos não perigosos, a operação exige embalagem contra vazamentos, identificação do conteúdo nas três faces externas e discriminação dos itens em NF ou declaração de conteúdo. A aceitação física continua sujeita à conferência da agência. [Regras nacionais dos Correios](https://www.correios.com.br/enviar/proibicoes-e-restricoes/proibicoes-e-restricoes)

A caixa calculada conserva as dimensões protegidas dos itens e empilha suas alturas; não presume consolidação menor. Limites do canal: uma caixa, até 30 kg, maior dimensão de até 100 cm e soma das dimensões de até 200 cm. Antes de emitir etiqueta, pesar e medir a caixa externa pronta, incluindo proteção; diferença exige nova cotação.

## Valor declarado e credencial

A cotação exibida na ficha do produto usa a mesma seleção de códigos do contrato direto que o checkout. Um produto aprovado apenas para PAC, por exemplo, consulta e exibe somente PAC nesse canal.

A cotação direta inclui o valor integral da mercadoria no serviço adicional de Valor Declarado: PAC `064`, SEDEX `019`. O servidor consulta os limites autenticados por serviço, omite serviços incompatíveis e exige confirmação do adicional na resposta de preço. Não reduz o valor da mercadoria para caber no limite. Usa `pcFinal`, que já inclui o adicional.

Em consulta de produção somente leitura em 18/11/2026, os limites autenticados foram mínimo R$ 25,63, máximo PAC R$ 4.668,29 e SEDEX R$ 39.680,48. Esses limites são consultados pela integração, não tratados como valores eternos. Abaixo do mínimo de Valor Declarado, o canal pode ser omitido; não se presume cobertura automática.

Ativar com `CORREIOS_CHECKOUT_ENABLED=true` no ambiente privado, mantendo o frete nacional em produção na configuração administrativa. A credencial existente é restrita a Preço/Prazo; permanece somente no servidor. Não criar credencial de pré-postagem para esta entrega. A chave histórica vence em 15/05/2027; renovar antes do vencimento e validar a cotação novamente. Para suspender somente o canal direto, definir o flag como `false` e recriar o contêiner do app.

## Pedido e postagem

Após conferir pagamento, nota fiscal, destinatário e caixa, abrir **Preparar envio no Correios — contrato Wimifarma** no resumo administrativo do pedido. O link abre o [portal de pré-postagem](https://prepostagem.correios.com.br/). Escolher o cartão do contrato e o mesmo código PAC/SEDEX, modalidade a faturar e sem coleta. Conferir o preço final antes de concluir e levar a encomenda à agência. Somente o atendimento físico confirma a aceitação e o comprovante de postagem.

A integração desta entrega cota e registra a escolha no pedido. A etiqueta é preparada manualmente no PPN. Não há criação automática de pré-postagem, compra de etiqueta ou rastreio via API. Automatizar esse processo exige permissão PPN e controle de remessas/idempotência próprios. O e-mail de boas-vindas oferece apoio, mas não comprova essa permissão na chave atual.

## Validação e limites

Consulta CWS de produção, Ivaté `87525000` → São Paulo `01001001`, pacote 500 g, 25 × 15 × 10 cm, mercadoria declarada de R$ 100,00: PAC **R$ 18,82**, SEDEX **R$ 21,31**, ambos HTTP 200. O adicional confirmado foi **R$ 0,74**, já incluído nos totais. São referências desse pacote/data, não tarifas fixas. Nenhum pedido, pagamento, etiqueta, pré-postagem ou faturamento foi criado nesse teste.

Validação local: 288 testes da suíte de frete e 577 de segurança aprovados; depois da correção do gate de disponibilidade sem Melhor Envio, 13 testes focados de backend/interface foram repetidos com sucesso. A interface compara os três provedores e preserva seleção exclusiva em viewport de 320 px. Lint, TypeScript, build Next.js e validação Prisma aprovados. O primeiro build esgotou o heap do Node na checagem de tipos; a repetição usou `NODE_OPTIONS=--max-old-space-size=4096` somente no processo local, sem alterar a configuração do projeto ou do runtime. A revisão independente encerrou sem achados pendentes após corrigir o gate do checkout.

A auditoria de produção (`npm audit --omit=dev --audit-level=high`) passou o bloqueio de altas/críticas, com **quatro moderadas** em `fast-uri`, `glob`, `minimatch` e `react-email`. A auditoria completa (`--audit-level=moderate`) **não passou**: oito moderadas e nove altas na árvore de desenvolvimento, envolvendo ESLint e suas dependências de descoberta de arquivos. O lockfile e as dependências não foram alterados por esta tarefa; tratar a atualização em uma entrega própria, sem aplicar downgrade automático sugerido pelo npm.

### Publicação e prova de produção

Código publicado no commit `0e2a5e92245aacc2891b05c00de912ba0c93ddcb`, com push para `main`, pull no servidor, build Docker e recriação somente do app. `CORREIOS_CHECKOUT_ENABLED=true` foi ativado no ambiente privado; as credenciais existentes foram preservadas. O contêiner ficou `running healthy` e `/api/health` retornou `ok: true` em 18/11/2026 às 09h34, horário de Brasília. A imagem anterior foi preservada como `wimifarma-br-app:before-correios-20261118` para reversão.

Depois da publicação, as APIs públicas de revisão do carrinho, estimativa de produto e cotação do checkout foram consultadas com uma unidade de **Absorvente Always Liners 80 unidades**, preço canônico de **R$ 27,78**, pacote previsto de 700 g e 24 × 15 × 10 cm, destino `01001001`. Resultado direto: **PAC 03298 R$ 19,39 / 9 dias úteis**; **SEDEX 03220 R$ 22,42 / 5 dias úteis**, incluindo preparação. A estimativa veio como `available`. A cotação do checkout retornou ambos os códigos, tokens com identidade/preço correspondentes e embalagem com valor declarado integral; o custo do cliente foi o total cotado, sem subsídio implícito.

O Melhor Envio também retornou alternativas no mesmo teste, incluindo PAC e SEDEX com o mesmo custo base e preços ao cliente menores pela política de subsídio existente. Portanto, esta amostra não comprova economia no contrato direto: ele amplia as opções e a continuidade de cotação, e a interface ordena pelo preço efetivamente cobrado do cliente. SuperFrete não retornou opção nessa amostra. A prova não criou pedido, reserva de estoque, pagamento, etiqueta, pré-postagem nem cobrança. A primeira postagem física e seu comprovante continuam dependentes de uma encomenda real.

## Fontes oficiais consultadas

- [OpenAPI Preço](https://api.correios.com.br/preco/v3/api-docs): `servicosAdicionais`, `vlDeclarado`, `pcFinal`, consulta de adicionais por produto.
- [OpenAPI Prazo](https://api.correios.com.br/prazo/v3/api-docs).
- [Serviços adicionais e limites](https://www.correios.com.br/enviar/servicos-adicionais).
- [Guia de endereçamento, códigos dos adicionais](https://www.correios.com.br/enviar/precisa-de-ajuda/guia-de-enderecamento/guia-de-enderecamento).
- [Proibições e restrições](https://www.correios.com.br/enviar/proibicoes-e-restricoes/proibicoes-e-restricoes).
- [Manual PPN](https://www.correios.com.br/atendimento/developers/manual-do-usuario-ppn).
