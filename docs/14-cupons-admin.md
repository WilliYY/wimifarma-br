# Cupons no Admin

## Fluxo

- Acesso em `/admin/cupons`, para ADMIN e MANAGER. STAFF e visitantes nao podem consultar ou alterar a API.
- Lista em primeiro plano, indicadores compactos, busca por codigo/campanha e filtro de status. Novo cupom e edicao usam formulario em modal responsivo.
- Clique no codigo ou no lapis para editar. Acoes adicionais: copiar, pausar/habilitar e excluir com confirmacao (foco inicial em Cancelar).
- Datas inicial e final pelo calendario; inicio vazio significa imediato, e `Sem data final` remove a expiracao. A data final inclui o dia inteiro, ate 23:59:59.999, UTC-03:00. Exibicao usa America/Sao_Paulo.
- Estados: pausado, expirado, limite atingido, agendado e ativo. Habilitar nao ignora validade ou limite. Indicadores atualizados a cada 30 segundos e apos alteracoes.
- Contador representa usos, nao pessoas unicas. O formulario nao permite editar esse historico.
- Cupons usados preservam codigo, tipo, valor de desconto e pedido minimo. Descricao, datas, limite e habilitacao podem mudar; limite nunca pode ser inferior aos usos existentes.
- Exclusao fisica somente sem usos e sem premios da roleta vinculados. Nos demais casos, a tela explica a protecao e permite editar/pausar.
- Lista paginada em lotes de 100 com `Carregar mais cupons`; busca, filtros e indicadores abrangem os cupons carregados. O contador informa quando ha outras paginas.

## API

- `GET /api/cupons?cursor=<id>`: `data` com registros serializados e `nextCursor` (null na ultima pagina). Cada registro inclui `linkedPrizes`.
- `POST /api/cupons`: codigo, descricao opcional, tipo, valor, pedido minimo opcional, limite opcional, inicio/fim e `isActive`.
- `PATCH /api/cupons/[id]`: mesmo cadastro completo mais `expectedUpdatedAt` (ISO UTC retornado pela API). `usesCount` nao e aceito em edicao.
- `DELETE /api/cupons/[id]`: JSON com `expectedUpdatedAt`. Resposta `{ success: true }`.
- Mutacoes exigem `Content-Type: application/json` e autenticacao; sem CORS para origens externas.
- Erros: 401 sem perfil permitido, 404 ausente, 409 duplicidade/conflito/historico protegido, 415 formato incorreto, 422 validacao, 500 falha interna com mensagem generica.
- Compatibilidade: POST ainda aceita `durationDays` entre 1 e 365 quando `endsAt` nao e enviado; padrao legado de 7 dias. `endsAt: null` significa sem vencimento. Nao combinar duracao e data final.
- POST conserva `usesCount` inicial para consumidores anteriores; a interface nova inicia em zero. Limites inteiros ate 2147483647; valores ate 99999999.99 e duas casas; percentual maior que zero e ate 100. Frete gratis persiste valor zero.

## Persistencia e Seguranca

- Sem alteracao de schema, migration ou regras de pagamento/checkout.
- Criacao/edicao/exclusao e AuditLog na mesma transacao. Auditoria preserva o snapshot; edicao inclui antes/depois.
- PATCH/DELETE usam transacao Serializable, revisao obrigatoria e predicado de escrita. Conflitos retornam 409 sem sobrescrever outra edicao; o admin deve atualizar a lista e reabrir o formulario.
- Delete confere novamente ausencia de usos/premios no banco. Pausar e recomendado quando houver historico.
- Esta entrega nao aplica descontos automaticamente no checkout, nao cria resgates por cliente e nao ativa regras da roleta.

## Validacao

- `npm.cmd test`: schema, datas inclusivas, status, limites, revisao, historico e contrato transacional.
- `scripts/coupons-audit.ts`: teste integrado das APIs com autenticacao, PostgreSQL, concorrencia, rollback e browser em 375/768/1280/1920 px. Executar via `npx.cmd tsx scripts/coupons-audit.ts` com `DATABASE_URL=postgresql://coupon_test@127.0.0.1:55439/coupon_test`, app local usando exclusivamente esse banco e `COUPONS_AUDIT_URL=http://127.0.0.1:3010`.
- O script recusa outro host/porta/banco e usa usuarios/campanhas sinteticos. Banco temporario deve ser inicializado com `prisma db push`; nao executar esse comando sobre dados reais. Encerrar app, tunel e instancia descartavel apos QA.
- Screenshots em `artifacts/coupons-audit` ficam fora do Git.

### Evidencia de 2026-09-10

- 67 testes unitarios passaram (14 especificos de cupons), lint, TypeScript e Prisma validate sem erros.
- QA integrado com PostgreSQL 17 isolado: autenticacao ADMIN/MANAGER/STAFF, rejeicao de visitantes, duplicidade, datas/valores invalidos, conflito de duas edicoes reais, rollback por falha de auditoria, protecao de usos/premios e paginacao acima de 100 registros.
- Browser: criar, editar, pausar, buscar/filtrar, cancelar/confirmar exclusao, preservar formulario apos conflito, tratar erro com nova tentativa e 4 larguras sem overflow. Nenhum erro de pagina.
- Usuarios e cupons sinteticos removidos pelo script; nenhuma mutacao de teste em dados de producao.
- `npm.cmd audit --json`: 3 alertas altos na cadeia existente de ferramentas do Prisma, registrados em `docs/06-pendencias.md`. Nenhuma dependencia foi atualizada nesta entrega.
