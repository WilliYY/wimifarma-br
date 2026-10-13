# Minha conta: painel e acompanhamento de pedidos

## Objetivo e contrato

- Renovar `/minha-conta` com visão geral, histórico de pedidos, dados pessoais, segurança e cashback; preservar os formulários existentes.
- Mostrar apenas pedidos vinculados ao `customerId` da sessão. Compras feitas sem login não são associadas por nome, email ou telefone.
- O acompanhamento representa o status atual registrado pela equipe. Não há GPS, prazo estimado ou datas individuais de cada etapa no banco; não inventar esses dados.
- Diferenciar entrega e retirada, incluindo cancelamento, pagamento e resumo dos itens/preços registrados na compra. Pagamento continua sujeito à confirmação humana.
- Histórico paginado (8 pedidos), filtros e atualização manual, com estados de vazio/erro/carregamento. Nenhuma escrita em pedidos ou nova tabela.
- Usar identidade oficial Wimifarma, layout acessível e responsivo, sem dependência adicional ou imagem pesada.

## Implementação

### Benefícios e participação no Club — 13/10/2026

Direção visual: área pessoal de varejo, com saldos em primeiro plano, dourado para o Club, verde para cashback e cartões compactos para pedidos. Mantém a tipografia, marca oficial e navegação existentes. O destaque vem da hierarquia dos valores e do status de participação, sem dependências adicionais (avaliação de design DFII: 14).

Ajuste posterior solicitado pelo lojista: saudação em fundo claro com rosa suave, texto escuro e botão vermelho. Anéis e luz de fundo se movimentam lentamente por CSS, sem deslocar o conteúdo. Uma coroa dourada acima do nome aparece exclusivamente para `summary.member === true`, com flutuação discreta. A indicação de participação continua como atalho aos benefícios. As novas animações são desativadas em `prefers-reduced-motion: reduce`; marca, cabeçalho público e bolhas do rodapé permanecem preservados.

Composição atual refinada: perfil e ação de compra à esquerda, cartão claro do Club à direita no desktop, com logo oficial e acesso aos benefícios. O cartão mostra `Você faz parte` somente após confirmar adesão; sem resposta, usa título neutro. Moedas decorativas avulsas foram substituídas pelo cartão, com filete nas cores da marca e movimento discreto. Foto circular com moldura dourada e coroa acima do nome somente para membros. No celular, o cartão lateral fica oculto e a marca aparece junto ao título da área pessoal; compra, status e acesso aos benefícios permanecem disponíveis. Movimento reduzido desativa a animação do cartão e as demais animações da faixa.

A visão geral separa benefícios e pedidos: WimiCoins e cashback ocupam cartões próprios, com acesso aos respectivos extratos. Os cartões de pedidos ficam em uma linha independente, sem serem esticados pela altura dos benefícios. Em telas estreitas, as áreas se empilham.

O indicador `Participando do Club` aparece no cartão e na saudação somente quando `summary.member` é verdadeiro. A mesma consulta `useClubSummary` abastece saudação, visão geral e aba Benefícios, mantendo o estado após navegar ou confirmar adesão. Loading e falhas de consulta não são apresentados como ausência de adesão; erro oferece atualização explícita. Não existe inscrição automática ou novo bônus.

Na visão geral, WimiCoins exibem quantidade; equivalência e regras ficam no detalhe dos benefícios e checkout. Valores disponíveis, pendentes e movimentações mantêm as regras de `63-club-wimicoins.md`. Dados, segurança, histórico e fluxos comerciais permanecem preservados.

Validação desta atualização: build com lint/tipos, ESLint dirigido, Prisma validate, `git diff --check`, 282 testes de segurança e revisão independente aprovados. Conferência CUA com componentes reais e dados sintéticos em 320/390/768/1440px: sem transbordamento, indicador legível, adesão refletida na saudação e extrato, acesso ao cashback e formulário de dados preservados. Carregamento, falha com atualização explícita e saldo extenso conferidos; nenhuma escrita comercial real. Auditoria de produção sem vulnerabilidades; auditoria completa mantém cinco alertas high na cadeia de desenvolvimento ESLint, sem alteração de dependências nesta tarefa.

- `src/components/site/customer-account-panel.tsx`: painel com navegação responsiva, visão geral, progresso dos dados pessoais, cashback, avaliações, suporte e formulários; falhas de rede permitem nova tentativa. Identidade com `BrandSignature` oficial.
- `src/components/site/customer-order-history.tsx`: fotos, quantidades e valores da compra, etapas, detalhes expansíveis por teclado, filtros, paginação e ajuda pelo WhatsApp com o número do pedido (envio fica a cargo do cliente).
- `src/features/orders/customer-orders.ts` e `customer-orders-service.ts`: apresentação por modalidade, parâmetros limitados e projeção explícita sem notas internas/dados de contato. Todas as consultas incluem o cliente da sessão; utilizam o índice existente `(customerId, createdAt)`.
- `GET /api/minha-conta/pedidos?filter=all&page=1`: filtros `all`, `active`, `completed`, `canceled`; páginas de 1 a 1000, oito pedidos por página. Conta ativa obrigatória, sem cache compartilhado (`private, no-store`) e `noindex`. Respostas 401 (sem conta ativa), 400 (parâmetros inválidos), 503 (consulta temporariamente indisponível).
- Sem migração, dependência adicional, pagamento online ou mudança em estados comerciais. Os horários mostrados são de criação/atualização do pedido, no fuso `America/Sao_Paulo`, e não de cada etapa.

## Validação

Testar isolamento entre clientes, seleção mínima de dados, paginação/filtros e todas as etapas de acompanhamento; verificar o componente real com dados fictícios em 320, 390, 768 e 1440 px. Não criar pedidos ou alterar dados comerciais em produção. Executar testes, lint, typecheck, build, Prisma validate e auditoria de dependências antes de publicar.

`npm.cmd run audit:account` requer servidor local em `127.0.0.1:3017` para obter o cabeçalho e CSS reais. O painel privado usa somente fixtures em `scripts/fixtures/account-data.ts`; alterações de cadastro/senha são interceptadas e jamais enviadas ao servidor. Verifica filtros, paginação, atualização de status, detalhes por teclado, conta vazia, salvamento e recuperação de falhas.

## Limites

Não associa compras antigas ou anônimas automaticamente. Não oferece localização ao vivo, código de transportadora ou previsão de chegada. O cliente pode atualizar o acompanhamento manualmente; a equipe continua responsável pelos estados no admin.

## Evidências locais — 2026-09-22

- `npm.cmd test`: 143 testes aprovados, incluindo regras e proteção do histórico.
- `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run prisma:validate` e `npm.cmd run build`: aprovados. Rota `/minha-conta`: 15,4 kB, primeiro carregamento JS 145 kB, incluindo código compartilhado.
- `npm.cmd audit --audit-level=moderate` com `NODE_OPTIONS=--use-system-ca`: zero vulnerabilidades.
- `npm.cmd run audit:account`: 320, 390, 768 e 1440 px; histórico, etapas, filtros, paginação, detalhes por teclado, formulários, conta vazia e recuperação de falhas aprovados, sem overflow ou escritas comerciais.
- Build local: API sem sessão retorna 401 com `private, no-store`; `/minha-conta` redireciona para `/login` (307). O teste visual privado usa fixtures; não acessa histórico de clientes reais.

## Publicação verificada — 2026-09-22

- Código `f43f323` enviado ao GitHub, sincronizado no servidor e publicado com rebuild/recriação somente do serviço `app`. Sem migração nova. Imagem anterior preservada como `wimifarma-br-app:pre-account-d1121c2`.
- App, PostgreSQL e remoção de fundo permaneceram `healthy`.
- Produção: `/api/minha-conta/pedidos` sem sessão retorna 401, `private, no-store` e `noindex, nofollow`; `/minha-conta` retorna 307 para `/login`; `/delivery` e `/catalogo` retornam 200.
- Auditoria privada realizada com fixtures locais, sem abrir dados pessoais de clientes em produção. Servidor local encerrado e log temporário do build remoto removido.
