# Revisao OpenAI com prazo e orcamento — 21/11/2026

O lojista autorizou usar os creditos promocionais para analisar a Wimifarma, produzir relatorios e preparar melhorias de catalogo, marketing, precos, frete, entrega e compra por quantidade. O processo fica separado do servidor HTTP: nenhuma consulta de cliente aciona a API ou espera uma resposta do modelo.

## Modelo, saldo e prazo

- Modelo solicitado e identificador oficial: `gpt-6.2-astra`.
- O guia da Responses API documenta esforcos ate `max`; `ultra` nao e um valor comprovado nessa API. O worker solicita `max` e para se a conta/modelo recusar, sem trocar silenciosamente de modelo ou esforco. O teste autenticado ainda e necessario.
- Em 21/11, o painel da organizacao Personal mostrou um unico saldo disponivel de **US$ 117**, integralmente com vencimento em **23/11/2026**, sem forma de pagamento cadastrada. Esse retrato nao reserva saldo nem acompanha consumo de outros projetos.
- A previa do beneficio informou vencimento `2026-11-23T15:01:52Z` (12h01min52s de Brasilia). A parada operacional e antecipada para **23/11/2026 as 11h30 de Brasilia**, `2026-11-23T14:30:00Z`. Novas chamadas exigem pelo menos 30 minutos restantes: a ultima pode comecar ate as 11h00. O timeout e de no maximo 30 minutos. Cancelar a espera no cliente nao comprova cancelamento do processamento ou faturamento no servidor OpenAI; a reserva permanece quando houver duvida.
- Limite local total de US$ 117. Nao ha compra, recarga automatica ou promessa de esgotar o saldo exatamente. O worker conserva margem quando uma nova chamada nao cabe e preserva reservas de chamadas cujo resultado e incerto.

Precos Standard verificados: US$ 8 por milhao de tokens de entrada e US$ 40 por milhao de tokens de saida, incluindo raciocinio. O worker solicita `service_tier: "default"`, usa esse teto sem descontar cache e limita a entrada abaixo do patamar de 272 mil tokens. Retorno com tier ausente ou diferente exige parada e conserva a reserva; o pedido nao comprova sozinho a tarifa aplicada. Multi-agent beta nao e ativado: seu consumo agregado precisaria de um contrato de reserva comprovado antes de ampliar esta implementacao.

Fontes oficiais: [modelo](https://developers.openai.com/api/docs/models/gpt-6.2-astra), [reasoning](https://developers.openai.com/api/docs/guides/reasoning#reasoning-effort), [precos](https://developers.openai.com/api/docs/pricing#text-tokens), [creditos do ChatGPT](https://developers.openai.com/api/docs/guides/chatgpt-api-credits).

## Trabalho e limites

`scripts/prepare-ai-review.ts` prepara tarefas distintas com fontes numeradas, hashes e um retrato comercial projetado explicitamente. A consulta ao banco e somente de leitura; nao inclui clientes, pedidos, receitas, mensagens, logs ou cofre. O modo de snapshot tambem descarta campos desconhecidos. O manifesto e os relatorios ficam fora do repositorio.

Os trabalhos cobrem integridade do catalogo, identidade e imagens, regras de disponibilidade, precos e custos historicos, frete e embalagem, descontos acumulados, busca, checkout, seguranca, desempenho e propostas comerciais. A fila alterna os tipos para incluir cedo frete, economia, marketing e WimiParceiros. Tarifas, aceite de carga, lucro liquido e entrega efetiva exigem evidencias operacionais. Na ausencia de cotacoes e custos atuais, o relatorio deve identificar a lacuna.

Ao preparar com `--site-audit <evidence.json>`, a primeira tarefa revisa o site publicado a partir das verificacoes da entrada da campanha, busca, produto, carrinho, checkout, frete e layout feitas de fato. O arquivo aceita `capturedAt`, `landingPath` e `checks` com `check`, `path`, `viewport` e `result`. `httpStatus`, `elapsedMs` e `reason` sao opcionais. Sao aceitos somente caminhos publicos de compra, sem query ou fragmento. Os campos opcionais `observations` e `shippingSamples` registram sinais de interface e cotacoes de teste por UF, capital/interior, status e opcoes PAC/SEDEX. Campos brutos como HTML, cookies, CEP de cliente e identificadores sao descartados. Registre como `limited` qualquer etapa que nao tenha sido exercitada. Tempo de um teste isolado nao mede Core Web Vitals.

`measurement` e opcional e recebe `windowStart`, `windowEnd`, `newBrowserIds`, `socialReferrerBrowserIds`, `ordersCreated`, `campaignAttributionAvailable: false` e os opcionais `activeBrowserIds` e `ordersCompletedPaid`. Esses numeros sao agregados da loja. `socialReferrerBrowserIds` conta novos identificadores cujo primeiro referrer tem origem social conhecida. O registro da loja nao vincula UTM, clique ou visita a pedido, e a tarefa nao estima conversao ou retorno do post. Nenhum rastreador novo e instalado pelo worker.

Marketing gera rascunhos para itens elegiveis, preservando marca oficial, apresentacao, precos e limitacoes de medicamentos. WimiParceiros e uma proposta de programa assistido para revendedores; WimiRende e uma proposta de compra por quantidade. Nenhuma tabela de atacado, desconto, minimo, beneficio ou nova atividade comercial e ativada por estes relatorios.

O worker usa somente Responses, `store: false`, sem ferramentas, shell, SQL, navegacao ou gravacao comercial pelo modelo. Conteudo de catalogo, codigo e resposta e tratado como dado nao confiavel. Os arquivos Markdown sao para revisao privada; nao devem ser renderizados como HTML confiavel nem publicados automaticamente.

## Execucao

Com as dependencias existentes instaladas e o cliente Prisma gerado:

```text
npm run audit:ai:prepare -- --out <manifesto-absoluto-fora-do-repositorio>
npm run audit:ai:prepare -- --site-audit <evidence.json> --out <novo-manifesto-absoluto>
npm run audit:ai -- --manifest <manifesto> --run-dir <diretorio-persistente> --dry-run
npm run audit:ai -- --manifest <manifesto> --run-dir <diretorio-persistente> --once
npm run audit:ai -- --manifest <manifesto> --run-dir <diretorio-persistente>
npm run test:ai-review
```

A chave e provisionada pelo seletor seguro OpenAI Developers, na organizacao/projeto confirmados, e salva somente no destino local aprovado. Nao informar a chave no chat, em argumentos de processo, em docs ou no Git. O exemplo de servico usa `.env.openai-review.local`, arquivo ignorado pelo Git, exclusivo do worker. Se o destino aprovado for outro, ajustar `EnvironmentFile` antes de instalar. Carregar apenas `OPENAI_API_KEY` nesse arquivo e restringir acesso no host a `0600`.

`ops/wimifarma-ai-review.service` e um modelo para o host Linux, com Node 20 ou posterior, usuario ubuntu, diretorio de trabalho preservado, memoria de 512 MB e CPU de 25%. Preparar `/home/ubuntu/wimifarma-ai-review/run` com acesso restrito antes de instalar. A unidade nao reinicia automaticamente e nao altera o app, containers, redes ou banco. Apenas instalar o arquivo nao comprova ativacao.

Antes de iniciar, confirmar chave, organizacao/projeto, acesso ao modelo e esforco, saldo atual e ausencia de recarga paga. Fazer uma primeira tarefa com `--once`, conferir resposta e contabilizacao e entao drenar a fila. Nao iniciar se o prazo ja passou. O checkpoint e a trava pertencem a uma unica execucao orcamentaria: preservar seu diretorio ao reiniciar. Nao usar outros diretorios para contornar o limite.

## Falhas, revisao e verificacao

Uma reserva persistida precede cada chamada. Falha de rede, timeout, resposta sem uso comprovavel ou interrupcao conserva a reserva e bloqueia novas chamadas, inclusive depois de reiniciar. O checkpoint usa escrita atomica e `fsync` do arquivo e, em Linux, do diretorio; Windows sincroniza somente o arquivo. A recuperacao de uma trava exige confirmar que nenhum processo esta ativo; nao apagar o checkpoint para liberar consumo. Erros expostos usam diagnostico fixo, sem corpo bruto da API ou chave.

`checkpoint.json` preserva chamadas e valores; `summary.json` resume consumo e estado. `worker.lock` impede outra instancia no mesmo diretorio. O CLI retorna `0` ao concluir ou simular, `1` em erro/resultado incerto e `2` em resposta incompleta. Saida parcial nao e tratada como analise concluida.

O processo encerra ao concluir a fila, atingir prazo, encontrar falha ou nao caber outra chamada no orcamento. Nao repete tarefas vazias para consumir credito. Novas analises devem acrescentar informacao, hipoteses ou cenarios diferentes. Uma futura automacao de revisao deve ler resultados concretos e distinguir achado confirmado, suspeita, regra esperada e dado ausente; a automacao Codex usa limites do Codex, nao estes creditos de API.

Testes exigidos: transporte sintetico, limite financeiro, prazo, retomada, deduplicacao, trava, chamada incerta, saida parcial, ausencia de chave e projecao sem dados pessoais. Executar tambem typecheck, lint, regressao de seguranca e auditorias npm antes da publicacao. Testes locais nao comprovam chamada real ou servico ativo; a evidencia operacional deve registrar primeira resposta, consumo, estado do servico e caminhos dos relatorios.

Em 21/11/2026, a extracao somente de leitura gerou 645 trabalhos para 4.589 registros, incluindo 3.070 ativos. As 24 fontes de codigo coincidiram com o repositorio por SHA-256. A simulacao no Linux validou o manifesto e o teto de US$ 117. A fila completa excede esse valor no pior caso de reserva e serve como lista de trabalhos candidatos. A chave e o teste autenticado permaneceram pendentes porque o conector OpenAI Developers retornou `not connected`.

Na execucao autenticada posterior, o primeiro relatorio analisou a campanha e o caminho de compra. A API retornou Astra 6.2, esforco `max` solicitado e processamento Standard, com custo calculado de US$ 0,466968. O processo no servidor retomou o mesmo checkpoint e avancou para os relatorios de frete e economia. O ajuste de texto do carrinho saiu da revisao do relatorio e foi conferido no checkout antes de editar a interface.

Cada proposta deve ser conferida na fonte, com produto e CEP de teste quando aplicavel. So tratar como falha confirmada o comportamento reproduzido. Por exemplo, um 502 isolado nao identifica restricao de carga nem autoriza mudar transportadora. O worker carrega o manifesto na partida. Alterar prioridades durante uma chamada exigiria um ponto de parada controlada, para preservar a reserva e evitar duplicidade. A fila existente pode continuar enquanto as correcoes sao testadas separadamente.
