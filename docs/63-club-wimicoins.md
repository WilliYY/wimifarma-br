# Club Wimifarma e WimiCoins

Atualização de 23/10/2026: ao criar o vínculo para um User local, o novo Customer recebe a mesma credencial, sem criar senha distinta. O marcador `!GOOGLE_ONLY` nunca é copiado como senha nem substituído por uma senha de cliente. Vínculos antigos sem hash são tratados pela validação da senha local vinculada e pelo painel; não houve migração ou backfill de credenciais. Auditoria em [101](101-auditoria-funcional-e-acessos.md).

Atualização de 20/10/2026: faltas aceitas como crédito devolvem os WimiCoins usados à carteira original e anulam ganhos das unidades não entregues. Cancelamento posterior devolve somente o saldo ainda não restituído. O crédito novo é separado dos pontos e pode ser usado no checkout; locks passam por Customer, cashback, crédito de compra e WimiCoins. Contrato em [92](92-creditos-por-itens-faltantes.md).

Atualização de 19/10/2026: os ganhos de novos pedidos Pix usam o líquido após o desconto de 3%, além dos resgates de cashback/WimiCoins. A promoção não altera saldos reservados/devolvidos nem pedidos anteriores. Contrato e validações em [83](83-desconto-pix.md).

## Contrato autorizado em 13/10/2026

Adesão gratuita e explícita da conta autenticada. O administrador vê participantes e saldos. Clientes antigos não são inscritos automaticamente; entrar no Club não cria bônus de boas-vindas nem autorização para mensagens comerciais.

100 WimiCoins equivalem a R$ 1 de desconto; um ponto equivale a um centavo. O lojista pediu saldo separado do cashback, com uso combinado no checkout. O crédito único de 500 pontos (R$ 5) solicitado é exclusivo da conta do titular identificada pela sessão/vínculo persistente; não é benefício geral.

ADMIN pode habilitar WimiCoins por produto e escolher o percentual extra, iniciado em 2% no formulário. Produtos existentes e novos ficam desabilitados até seleção explícita. Itens com receita ou Farmácia Popular não participam. O cashback atual mantém suas regras e pode ser acumulado com os WimiCoins dos membros.

As compras fotografam adesão e benefício vigente. Recompensas usam o valor líquido efetivamente pago, após os dois descontos, sem frete. Créditos são liberados somente em pedido COMPLETED + PAID; cancelamento/reembolso estorna ganhos e devolve os benefícios reservados/consumidos uma única vez. Nada de saque, transferência, expiração, bônus retroativo ou campanhas adicionais nesta etapa.

O cálculo distribui o valor líquido do item entre as unidades, preservando os centavos restantes antes de arredondar a recompensa de cada unidade. Exemplo: 20 unidades de R$ 10,25, desconto total de um centavo e taxa de 2% geram 419 pontos. A correção de 14/10/2026 afeta somente novos pedidos; snapshots históricos e bônus por avaliação permanecem inalterados.

## Decisão de arquitetura

Escolhidas adesão explícita, carteira de pontos inteiros e livro de lançamentos separado, preservando o cashback existente. Unificar moedas com cashback reduziria componentes, mas impediria distinguir os dois saldos/seletores exigidos pelo lojista. Integração ocorre na mesma transação do pedido e no mesmo total encaminhado ao gateway.

Bloqueios seguem ordem estável: pedido/idempotência conforme fluxo existente, carteira cashback e depois WimiCoins. Chaves únicas de evento protegem adesão, reserva, crédito, devolução e concessão do titular contra repetição. Recompensa não é saldo disponível antes da liquidação. Saldo negativo após estorno de benefício já gasto permanece registrado, bloqueando novo resgate até existir saldo positivo.

Identidade deriva da sessão e do vínculo explícito User–Customer; nenhum campo enviado pelo navegador identifica outro beneficiário e email não é prova de associação. Usuário administrativo sem conta pessoal vinculada pode criá-la mediante sua adesão explícita; conflito de email existente interrompe a operação, sem fundir contas. O vínculo é revalidado pelo servidor.

## Interface

Campanha atualizada em 13/10/2026: fundo vermelho sólido, headline curto, cartão ilustrativo com logo oficial branca e moeda/coroa de WimiCoins. Adesão gratuita e benefício combinado apresentados de forma direta; a equivalência em reais não aparece no banner. Nenhuma mudança de API, adesão, saldo, resgate ou crédito. Direção e comportamento em `10-layout-e-experiencia.md`.

Ajuste de 13/10/2026 após a conferência do lojista: o cabeçalho mostra apenas a quantidade de WimiCoins, sem equivalente em reais ou tooltip de conversão. Cartão da conta ampliado para evitar aperto e sobreposição; saldos móveis em duas linhas a partir de 480px. Essa alteração é visual: conversão, saldo, resgate e informações necessárias no checkout permanecem com o mesmo contrato.

Banner HTML com logo oficial completa e coroa separada, sem redesenhar a marca; adesão grátis e benefícios por produto. WimiCoins aparecem acima do cashback na conta. Produtos oferecem elegibilidade e percentual. Checkout permite usar ambos, discrimina descontos e aplica teto pelo subtotal restante; frete e cobrança usam o total líquido correto. Painel do Club lista somente adesões reais, sem cartões técnicos de schema/API.

## Verificação e entrega

Verificação local: 220 testes existentes, 21 testes de Club/cálculo/sessão e 282 de segurança aprovados; lint e typecheck aprovados. A suíte de segurança passou a incluir Club e rateio dos dois benefícios. Auditoria de dependências de produção: zero vulnerabilidades. Revisão independente de 24 arquivos backend/migração aprovada, sem achados; 17 regressões adicionais aprovadas pelo revisor. O filtro de participantes antes da paginação recebeu regressão e revisão independente adicional de dois arquivos, também aprovada.

Todas as migrações aplicadas em PostgreSQL 17 descartável, na rede Docker interna exclusiva da tarefa. Sete cenários transacionais aprovados: banco vazio/proteções; adesão repetida e conflito de identidade; crédito único de 500 pontos; descontos líquidos combinados e repetição de envio; rejeição por saldo/adesão/autenticação com rollback; conclusão/pagamento/avaliação/reembolso uma vez; dois resgates concorrentes do último saldo com um vencedor e devolução por cancelamento. Nenhuma integração financeira ou transporte de mensagens configurado na QA; HTTP externo bloqueado. Contêiner e rede QA removidos após o teste.

Comandos: `npm run test:club`, `npm test`, `npm run test:security`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run prisma:validate`, `npm audit --omit=dev --audit-level=high`, `npm audit --audit-level=moderate`. `npm run audit:club` exige banco vazio com host `db-club-qa` e nome prefixado `wimifarma_club_qa`; nunca apontar para produção.

Build e validação Prisma aprovados. Auditoria completa mantém cinco alertas high na cadeia de desenvolvimento ESLint (`eslint-config-next`, `@next/eslint-plugin-next`, `braces`, `fast-glob`, `micromatch`); nenhuma vulnerabilidade de produção. Nenhuma atualização forçada de dependência foi realizada nesta feature.

QA visual com componentes reais e APIs sintéticas, via navegador conectado: banner, adesão gratuita, participantes, elegibilidade/percentual padrão desabilitado, consulta indisponível e checkout combinado. Larguras 320 e 1440 sem transbordamento horizontal. Carrinho sintético de R$ 30 com R$ 5 de cashback + 500 WimiCoins resultou em R$ 20, sem enviar pedido. Interface consultiva indisponível não manteve desconto selecionado.

Publicação concluída em 13/10/2026: feature `ebbb650`, ajuste de busca `d37dd29`. Backup restrito `daily/20261013T150345Z` validado por checksums, leitura do dump PostgreSQL e arquivo de uploads antes da migração `20261013120000_club_wimicoins`. Somente app/tools construídos e aplicação recriada; nenhum seed ou alteração de proxy/serviços compartilhados. Imagem anterior preservada como `wimifarma-br-app:club-rollback-20261013`. App e PostgreSQL saudáveis, zero reinícios; `/api/health` 200 e APIs privadas 401 sem autenticação.

Adesão do titular confirmada pela interface autenticada. Crédito único de 500 pontos conferido no banco e na conta: uma concessão, saldo 500 (R$ 5), sem reserva ou compra real. A repetição segura do comando manteve exatamente um lançamento e 500 pontos. ADMIN mostra o participante; pesquisa sem correspondência retorna zero e a limpeza do filtro restaura a lista. Formulário produtivo mostra elegibilidade desabilitada e percentual inicial de 2%; aberto e cancelado sem salvar. Conta e painel conferidos em 375 px, sem transbordamento, com atalho administrativo preservado. Produtos existentes continuam desabilitados até seleção ADMIN; nenhum pedido produtivo ganhou/usou pontos durante a entrega.

O script privado `scripts/grant-owner-wimicoins.ts` exige `CLUB_OWNER_USER_ID`, vínculo ADMIN ativo e adesão; faz somente leitura por padrão. A opção `--confirm-owner-500` concede exatamente 500 pontos com chave estável, auditoria e repetição segura. Não existe API pública de concessão nem bônus geral. Capturas ficam em `outputs/club-wimicoins-2026-10-13`, fora do Git. Recursos QA descartáveis removidos; nenhum pagamento, pedido de teste ou mensagem comercial real enviado.
