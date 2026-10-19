# 74 — Avise-me quando chegar

## Contrato

O lojista autorizou avisos por WhatsApp e e-mail em 19/10/2026. Produtos publicados sem disponibilidade continuam cadastrados e visíveis, com compra impedida pelo fluxo existente. O recurso não inativa nem exclui produtos, não altera estoque físico ou de distribuidor e não renova ofertas/cotas.

O cliente autenticado escolhe um ou ambos os canais e autoriza o contato especificamente para aquele produto, por até 30 dias. A origem dos contatos é a própria conta; a API não aceita destinatários arbitrários. Uma inscrição por cliente/produto evita duplicações. O cliente acompanha e cancela em **Minha conta > Meus avisos**. Não há adesão automática de clientes existentes nem consentimento de marketing.

A elegibilidade usa a disponibilidade comercial canônica, incluindo validade da oferta, custo, preço, cotas, reservas e consumo. Produtos inativos/apagados e itens que exigem atendimento assistido não aceitam inscrição. Controlados, classificações pendentes e Farmácia Popular mantêm o atendimento humano; o recurso não libera compra, pagamento ou dispensação.

## Equipe e envio

Em `/admin/avisos-estoque`, ADMIN e MANAGER consultam solicitações válidas, com filtro **Prontos para avisar**. A disponibilidade é conferida novamente ao registrar contato. Cada canal tem seu próprio estado; o aviso só é concluído depois de ambos os canais escolhidos terem o contato registrado. Abrir um rascunho não registra envio nem comprova entrega. A equipe confere o destinatário, envia a mensagem e usa **Marcar contato feito**.

**Não há disparo automático conectado nesta etapa.** A ponte Miauby existente envia alertas ao proprietário e não foi reutilizada para destinatários clientes. E-mail ainda não tem remetente/provedor configurado. Os links `wa.me` e `mailto` apenas preparam uma mensagem genérica, com link HTTPS da própria loja, sem medicamentos no assunto. O sucesso do contato não interfere na compra.

Envio automático futuro exige canal WhatsApp para clientes e remetente autenticado de e-mail, verificação de destinatário, supressão/cancelamento, limites, idempotência, estados de entrega e quarentena de resultados incertos. Não basta ativar a ponte de alertas do proprietário.

## Persistência, privacidade e APIs

- Migração aditiva `20261019140000_restock_interests`: tabela própria, sem modificar dados comerciais existentes.
- Cliente: `/api/minha-conta/avisos-estoque` — GET próprio, POST com consentimento e canais, DELETE próprio.
- Equipe: `/api/admin/avisos-estoque` — GET paginado, POST de preparação de rascunho e PATCH de registro manual por canal, com controle de versão. Antes de abrir o aplicativo externo, o servidor confere novamente consentimento, contato atual, versão, validade e disponibilidade. Uma mensagem já aberta no aplicativo externo fica sob controle humano; cancelar no site não apaga um rascunho externo já aberto.
- Sessão e cliente ativo são revalidados; respostas privadas usam `no-store` e `noindex`; escritas exigem origem válida, corpo limitado e schema estrito.
- Até 50 solicitações pendentes por cliente, com serialização no cliente para evitar excedente concorrente.
- Cancelamento, expiração e conclusão retiram os snapshots de contatos. A limpeza de expirados ocorre nas consultas/escritas; registros vencidos são imediatamente excluídos das listas úteis, mesmo antes da limpeza oportunista. Não há novo serviço agendado.
- Nenhuma inscrição ou contato real foi criado para testar a funcionalidade. Os ensaios usam dados sintéticos e bloqueiam chamadas externas.

## Operação

A disponibilidade depende de estoque físico ou de ofertas de distribuidor válidas. Oferta vencida continua indisponível; o Avise-me não renova a observação do fornecedor. A validade do aviso é diferente da validade comercial.

Antes da publicação: testes de regras/serviço/rotas, links e interface isolada; segurança, lint, typecheck, Prisma validate, build e auditoria de produção. Validação produtiva e seus limites devem ser registrados na entrega, sem confundir rascunho preparado com mensagem entregue.

O primeiro lint encontrou erros apenas em geradores privados anteriores dentro de `outputs/`. Esse acervo e `.codex/` foram explicitamente separados do código da aplicação em Git, ESLint e TypeScript; não entram no deploy nem mascaram alertas de dependências.

Validação local em 19/10/2026: 794/794 testes gerais, 368/368 de segurança, lint, typecheck, Prisma validate e build passaram. Revisão independente aprovou, com 30 regressões específicas, incluindo quatro ensaios Chromium; as telas foram conferidas a 390 e 1.280 px, sem transbordamento horizontal. Auditoria de produção: zero alertas. A auditoria completa mantém cinco high de desenvolvimento na cadeia já registrada em `42-revisao-de-seguranca.md`, sem atualização forçada.

`scripts/restock-db-audit.ts` é um ensaio sintético, restrito ao banco dedicado `wimifarma_restock_qa_20261019`, inicialmente vazio. Testa deduplicação concorrente, IDOR, disponibilidade, preparação sem envio, versões concorrentes, conclusão por canal, troca de contato, cancelamento e limite de 50 inscrições sob concorrência. Não aceita o banco produtivo e bloqueia chamadas `fetch`.
