# 97 — Operação administrativa e etapas por WhatsApp

Atualização de 23/10/2026: cancelamentos canônicos por Mercado Pago/Asaas e cancelamento antes da submissão registram a etapa de cancelado na mesma transação somente quando o pedido muda para CANCELED. Opt-in, ambiente comercial, destino canônico e deduplicação permanecem; conciliações repetidas não criam aviso retroativo. Não houve envio real para testar. Evidências e limites em [101](101-auditoria-funcional-e-acessos.md).

## Pedidos e notificações

A lista única mostra 30 pedidos por página entre os últimos 100 carregados. “Todos” é a fila ativa; “Pedidos feitos” contém PENDING, “Em andamento” contém CONFIRMED/PREPARING/READY/OUT_FOR_DELIVERY. Concluídos ficam em verde; andamento em amarelo; cancelados/estornados em vermelho, fora da fila ativa. Os contadores da lista não representam o histórico integral.

Ao expandir, cada pedido reúne seus itens em Farmácia e em cada distribuidora, com quantidade restante e EAN de origem identificada. Não há uma segunda lista por distribuidora. A origem usa os dados vinculados ao pedido, sem recalcular a compra pela oferta mais recente.

As etapas orientam confirmação, separação, pronto e conclusão. Retirada mostra “Pronto para retirada”; entrega mostra “Pronto para envio” e “Saiu para entrega”. A API rejeita OUT_FOR_DELIVERY para retirada. Pagamento online canônico deve estar pago, em produção e sem revisão financeira; bloqueios de receita, faltas e homologação continuam. A venda e a nota fiscal são realizadas pelo lojista no sistema da farmácia.

O aviso do cabeçalho consulta a cada 30 segundos com a aba visível. A primeira consulta estabelece a referência; um novo pedido abre um painel acessível sem roubar o foco. Mostra até dez números e horários, link para `/admin/pedidos?pedido=ID` e “Marcar como visualizado”. O link encontra a página e expande o pedido carregado. Visualização usa localStorage por usuário/navegador, com até 100 IDs; não modifica pedido, pagamento nem leitura de outros usuários. Não é confirmação operacional. A API preserva autorização ADMIN/MANAGER/STAFF, filtros financeiros e `private, no-store`, sem nome ou contato do cliente.

## Avisos das etapas para o cliente

O gerador editorial de [37](37-mensagens-clientes.md) continua uma prévia. O novo envio operacional usa mensagens genéricas específicas, com número e etapa, sem produtos, dados clínicos ou promessa de pagamento/reembolso. O canal de e-mail continua sem envio conectado.

`customerStatusAlerts`, desligado por padrão, depende do controle geral da Miauby. Ativação ADMIN exige ponte habilitada, conectada e com capacidade `customerStatus:true`. Mudanças antigas da configuração que omitem o novo campo preservam seu valor.

A mudança efetiva de status registra, na mesma transação, um evento `order_status` com chave única por pedido/etapa, telefone brasileiro canônico, texto congelado, `orderId` e `orderStatus`. Repetir a atualização não cria outro evento. Telefone inválido fica FAILED para conferência e não impede a etapa operacional. O telefone não é retornado na resposta da atualização nem no histórico público da Miauby.

O worker reserva atomicamente e relê configuração, pedido, etapa, modalidade, pagamento e receita antes de enviar. Evento obsoleto, cancelado/refundido, de teste, em revisão financeira ou bloqueado por receita fica FAILED sem transporte. Cancelamento só comunica cancelamento quando ainda é o estado atual. A conferência ocorre antes da chamada HTTP; um envio já iniciado não pode ser recolhido caso o pedido mude simultaneamente.

A ponte usa rota autenticada separada `/commerce/customer-status`; o destino é explícito e validado. A rota antiga `/commerce/alerts` mantém destino fixo do proprietário. Deduplicação inclui canal/destino/texto, impedindo reaproveitar ID para outro telefone. Nenhum lock de pedido fica aberto durante HTTP.

QUEUED significa fila; SENT significa aceitação com identificador do provedor, sem comprovar leitura ou entrega no aparelho. Timeout, interrupção ou resultado ambíguo fica UNCERTAIN, sem reenvio automático. Bloqueios comprovados antes do transporte seguem a política existente de tentativas limitadas. Desativar o controle cancela somente eventos pendentes aplicáveis; não desfaz envio iniciado.

## Catálogo, cashback, menu e busca

O catálogo administrativo renderiza 100 itens por página, com busca/filtros globais sobre os metadados já carregados. Não é paginação de banco. Trocar página ou filtros limpa a seleção, mantendo limite de 50 por lote e revisão/versionamento existentes.

O cashback apresenta linhas compactas e páginas de 100, permitindo selecionar até 50 produtos elegíveis por lote. O operador revisa ativação, desativação ou percentual antes de aplicar. O endpoint existente de lote valida ADMIN, versões e restrições; medicamentos/Farmácia Popular não recebem elegibilidade indevida. Após sucesso, conflito, erro ou resposta incerta, a seleção é reconciliada com a consulta atual; não há repetição automática de mutação.

A lista e seus contadores excluem produtos da lixeira. O preço mostrado usa a mesma resolução de oferta do catálogo para DISTRIBUTOR e mantém a promoção cadastrada para PHARMACY. Sem oferta elegível, mostra “Preço indisponível” e não calcula valor por unidade; o percentual ainda pode ser configurado para uso futuro. A resposta contém somente os campos necessários à tela, sem custos ou ofertas privadas.

Pedidos permanece primeiro no menu. Fretes e Pagamentos são úteis e ficam em “Configurações da loja”, recolhido. Ofertas, Temas e Fornecedores/margem saem da navegação diária, mas mantêm módulos, rotas e dados. O catálogo continua permitindo preços promocionais por produto; campanhas futuras não foram apagadas. API e Senhas fica sem atalho; ocultação não substitui a autorização ADMIN, criptografia e no-store já existentes.

A busca pública mantém um único botão acessível de limpar, com área de toque de 44 px; o controle nativo duplicado fica oculto. Estados vazios/erro são compactos, nomes quebram linha no celular e navegação por teclado/debounce continuam.

## Entrega e óleo Dove

A entrega local já atende os produtos compráveis, respeitando a política de compra. Transporte exige conferência real de peso, medidas, conservação, carga e serviços aceitos. Marcar explicitamente “revisão” pré-seleciona a liberação de um item permitido; desmarcar a retira. Abrir a tela preserva perfis anteriormente desligados. Não existe liberação automática de perfis incompletos.

Consulta de 22/10/2026 encontrou 805 produtos sem perfil conferido e somente três com perfil liberado, incluindo um rascunho. A liberação dos pendentes depende de pesos/medidas reais ou embalagem padrão informada pelo responsável; não usar números fictícios.

Óleo Dove 240 ml, EAN 7891150098442: mudança autorizada para DISTRIBUTOR com acréscimo de 20% previamente aprovado em [77](77-expansao-dermocosmeticos-e-dm.md). A ANB foi consultada por EAN, com custo final R$ 20,28 incluindo ST R$ 2,57; acréscimo resulta em R$ 24,34. O portal mostrou “+100”, portanto estoque exato permanece desconhecido. A Profarma não retornou resultado na condição consultada. Validade interna de até 24 horas é política de atualização, não garantia do fornecedor.

A operação deve preservar estoque físico de duas unidades, fotos, perfil de transporte conferido e estado DRAFT, sem publicar o produto por consequência. A oferta fica vinculada pelo endpoint auditado após mudança com versão esperada. Evidência privada e resultado de aplicação ficam em `outputs/operacao-admin-2026-10-22/`, sem credenciais ou dados de clientes no Git.

## Publicação e verificação

Migração `20261023023000_customer_order_status_alerts`: opção booleana default false e três campos opcionais em MiaubyEvent (destinatário, pedido e etapa). Não altera pedidos, saldos ou percentuais existentes. Validar em PostgreSQL descartável, preservar backup do banco e imagens anteriores; publicar a ponte compatível primeiro, aplicar migração BR e recriar somente o app. Ativar a opção somente após confirmar capacidade/conexão.

Testes cobrem transições/modalidades, outbox única, isolamento de destino, cancelamento/estorno entre fila e envio, opt-in, incerteza sem reenvio, resumo sem PII, deep link/visualização, seleção em massa, paginação, busca e proteção física do transporte. QA visual usa dados sintéticos em 320/390/1440 px; não avançar pedido real ou enviar mensagem a cliente para testar. Registrar separadamente validação local, migração isolada, publicação e health; nenhuma delas comprova recebimento no aparelho.

Validação local: 1.072 testes gerais e 448 de segurança aprovados; lint, typecheck, Prisma validate e build aprovados. A primeira execução geral identificou duas expectativas antigas de renderizar todos os produtos; foram atualizadas para 100 por página e busca global, e a suíte completa passou novamente. Revisão independente aprovou backend/ponte e interface após corrigir refresh que reabria o pedido do deep link e limpava os filtros do operador. Ponte: 78 testes, build e check aprovados. Auditoria de produção: zero vulnerabilidades; auditoria completa: cinco HIGH na cadeia de desenvolvimento de braces/micromatch/fast-glob/eslint-config-next, já descrita em [95](95-correcao-next-15-seguranca.md). Não foi aplicada correção forçada nem adicionada dependência.

## Conferência de publicação — 23/10/2026

Código operacional BR `c31834d`, ponte `3041a18`, ambos enviados ao GitHub e compilados no Linux. Backup privado verificado por `pg_restore --list` em `/home/ubuntu/backups/wimifarma-br/admin-operations-20261023T025214Z`; imagens anteriores preservadas. Banco descartável sem dados reais confirmou migração aditiva/default desligado, preservação de evento legado, rollback, 15 upserts concorrentes produzindo um evento, destino canônico, telefone inválido FAILED e opt-in desligado sem fila; nenhum envio externo. Recursos descartáveis próprios removidos após validar identidade.

Ponte publicada antes do BR; consulta autenticada GET confirmou configured/enabled/connected/customerStatus=true. Migração aplicada pelo serviço Compose de ferramentas, aplicativo recriado sem reiniciar PostgreSQL ou demais módulos. Health HTTP 200; APIs de resumo e Miauby sem sessão HTTP 401, private/no-store. A primeira tentativa de migração com `docker --env-file` rejeitou a URL antes de conectar por diferença na interpretação das aspas; o serviço oficial Compose resolveu a configuração sem editar ou revelar segredos.

Dove convertido pelo formulário ADMIN, com versão esperada, para DISTRIBUTOR/20%. Consulta real ANB repetida imediatamente antes da gravação confirmou código 356050, custo com ST R$ 20,28 e saldo “+100”. Oferta salva às 03:00:50 UTC, validade interna até 24/10/2026 03:00:50 UTC, saldo exato null e cota operacional cinco. A tela recalculou R$ 24,34; leitura posterior confirmou DRAFT, estoque físico 2, capa e perfil de transporte preservados. O formulário atual registra separadamente ST somente para Profarma; na ANB foi salvo o custo final já inclusivo e o valor observado de ST R$ 2,57 ficou na evidência privada, sem somar novamente.

O controle de etapas para clientes foi ativado pelo painel ADMIN após a confirmação da ponte. Leitura posterior confirmou `customerStatusAlerts=true` e nenhum evento de cliente criado nos testes. Painéis publicados conferidos somente por leitura: menu reduzido, Dove/100 por página, busca com um único limpar, popup com número/link/visualizado e deep link abrindo retirada com etapas próprias. Não houve confirmação/separação de pedido real nem mensagem a cliente para QA. O recebimento real no aparelho ainda não foi testado.

A conferência final detectou preço físico histórico na lista de cashback de distribuidoras e dois itens da lixeira; regressões reproduziram ambos antes da correção. Seis testes API/card passaram e revisão independente aprovou exclusão da lixeira, preço canônico, ausência de vazamento e preço nulo sem oferta.
