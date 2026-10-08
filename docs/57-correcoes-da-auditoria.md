# 57 — Correções da auditoria de backend e frontend

Data: 08/10/2026. Origem: [56-auditoria-backend-frontend.md](56-auditoria-backend-frontend.md).

## Escopo aprovado e Asaas

O lojista aprovou correções de busca, cashback, consultas do cabeçalho, ordem de bloqueio do estoque, limite do corpo de frete, testes e segurança. Não foi introduzida aprovação manual de cada compra nem novo fluxo de revisão Asaas.

A consulta agregada de leitura no banco produtivo, em 08/10, encontrou zero pagamentos Asaas produtivos em `REVIEW`/`UNKNOWN` e zero eventos produtivos Asaas em `REVIEW`. Os registros Asaas encontrados eram ensaios de teste. É uma consulta pontual; não comprova processamento de venda real nem elimina futuras exceções técnicas.

O achado 1 da auditoria, sobre revisões de checkout Asaas visíveis e resolvíveis, permanece uma evolução separada. Nenhum resultado incerto autoriza cancelamento, liberação de estoque ou nova cobrança automaticamente. Atendimento e cancelamento continuam sob controle da farmácia, com confirmação financeira pelo gateway.

## Comportamentos corrigidos

- **Busca:** resultados vinculados à consulta concluída. Alterar o texto invalida imediatamente resultados utilizáveis e bloqueia envio durante debounce/consulta. Respostas abortadas não substituem a consulta atual. Navegação por teclado continua disponível após resposta válida.
- **Cashback:** o texto mostra o valor efetivamente selecionado e aplicado ao resumo/envio. A cesta crescer não aumenta resgate silenciosamente; reduzir a cesta preserva o limite existente do subtotal. Atualizar saldo continua limpando a seleção para nova escolha explícita.
- **Cabeçalho:** mobile e desktop compartilham consulta, intervalo e listeners em provider local. A autorização permanece no servidor. A chave por identidade de cliente remonta o provider ao trocar a sessão, sem reutilizar saldo entre clientes.
- **Estoque:** devoluções Mercado Pago/Asaas usam a mesma ordenação por ID das reservas. Quantidades, gatilhos de devolução, confirmação do gateway e idempotência permanecem preservados.
- **Frete:** leitura por stream limitada a **32.000 bytes UTF-8**, sem depender de `Content-Length`. Excesso cancela leitura e retorna 413; falha no descarte não substitui esse erro. Origem, conteúdo e mensagens dos demais erros são preservados.
- **Miauby:** fake do teste entende classificação e `OR` da consulta atual. Asserções verificam aceitação/recusa, subtotal e ausência de efeitos para itens recusados. A rota comercial não foi alterada.

Layout, 128 bolhas, animação da marca, aprovação farmacêutica, tarifas, meios de pagamento e cálculo comercial de frete não foram redesenhados ou alterados.

## Testes e CI

`npm.cmd run test:all` descobre `.test.ts` e `.test.mjs` em `src` e `scripts`, exclui código gerado e executa cada arquivo uma vez. A CI usa essa seleção completa, incluindo Miauby e UI. `test:security` inclui explicitamente as novas regressões HTTP/estoque.

As regressões UI usam React real e Chromium via Playwright/esbuild já presentes. Página e APIs são fictícias/interceptadas; destinos externos são bloqueados. A CI instala Chromium e bibliotecas antes da execução. Nenhuma nova dependência foi adicionada.

Reproduções RED/GREEN:

- Dove → Nivea → Enter durante debounce; teclado após resposta atual e resposta antiga atrasada.
- Saldo fictício R$30, cesta R$10 → R$20: rótulo, resumo e envio mantêm R$10; redução respeita o subtotal.
- Duas apresentações do saldo: um refresh por evento/intervalo, descarte ao desmontar e troca de cliente A → B/logout sem mostrar saldo anterior.
- Quatro combinações de reserva/devolução entre gateways: ciclo de espera antes, ordem consistente depois. Usa serviços reais com modelo sintético de locks, **não PostgreSQL concorrente real**.
- Limite exato/um byte acima, Unicode em chunks, excesso sem leitura do restante e erro ao cancelar leitura.
- Miauby aceita receita comum classificada; controlados, não classificados com receita, inativos e Farmácia Popular não criam alerta.

Validação local: **507/507** testes completos e **234/234** da seleção de segurança passaram; lint, typecheck e Prisma validate passaram. Os quatro testes UI usam React real/Chromium, incluindo troca de identidade. Revisão independente de backend, UI e executor/CI aprovada, sem achados novos. Concorrência continua comprovada pelo modelo sintético, sem ensaio em PostgreSQL real.

Auditoria npm renovada: produção sem alertas, código 0; completa com cinco high/zero critical na cadeia de ferramentas, código 1. Build Next.js passou, incluindo 37 páginas estáticas.

## Publicação e conferência em produção

Fonte publicada: commit **`74163ec`** (`fix: corrige busca cashback estoque e limite de frete`), em 08/10/2026. Build Docker concluído no servidor e somente `wimifarma-br-app` recriado, sem migrations ou reinício do PostgreSQL. Imagem em execução: `sha256:b47481748cc1e1e2fef334140c2ae5de328aab4f7c6bf981a37cf1a9b89fad1c`. A imagem anterior foi preservada na tag `wimifarma-br-app:pre-audit-fixes-74163ec` para retorno.

Conferência após a troca:

- Container `healthy`, zero reinícios. `/api/health`, `/`, `/catalogo` e `/checkout` retornaram HTTP 200; `/api/admin/pagamentos/asaas` sem sessão retornou 401.
- No Chrome conectado, Dove retornou o produto atual; trocar para Losartana e pressionar Enter durante debounce manteve a página, sem abrir o resultado Dove anterior. Depois da resposta, teclado navegou para um resultado da consulta atual.
- Catálogo e checkout renderizados em produção. A cesta existente de dois itens foi preservada. Checkout em 1440 e 390 pixels sem transbordamento horizontal (`scrollWidth === clientWidth`); atalho administrativo visível também no celular.
- Header mantém `logo-wimifarma-animated.svg`; rodapé mantém 128 bolhas. A preferência de tamanho do navegador foi restaurada ao final. Nenhum erro ou aviso capturado pelo logger da aba durante a conferência; o popup da extensão Méliuz é externo ao site.
- Nenhum pedido, cobrança, cancelamento, envio de mensagem ou alteração de cliente foi executado. Não foi repetida homologação financeira real nesta entrega. Resgate de cashback e troca de identidade foram comprovados nos testes React com dados fictícios; a conta aberta não possuía saldo para reproduzi-los ao vivo.

Observação fora das correções publicadas: a página de Cimegrip ainda mostra um texto antigo sobre combinar pagamento no atendimento, enquanto o checkout oferece pagamento online. Registrar para revisão de conteúdo; essa observação não indica falha comprovada no gateway.

## Dependências e alertas sem patch

Verificação independente em fontes oficiais em 08/10/2026: `braces` permanece em 3.0.3, afetado até essa versão, sem patch no [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). O [registro npm](https://registry.npmjs.org/braces) e os metadados de [fast-glob](https://registry.npmjs.org/fast-glob), [micromatch](https://registry.npmjs.org/micromatch) e do [plugin Next](https://registry.npmjs.org/@next%2feslint-plugin-next) mantêm a cadeia afetada.

Não há remediação compatível comprovada nesta consulta. `eslint-config-next@15.5.27` permanece alinhado à stack. Não aplicar downgrade automático para 14.2.35, `audit fix --force`, versões fictícias ou overrides sem patch. Migrar para Next 16 também não remove essa cadeia e não integra o escopo aprovado.

Mitigação temporária: ferramentas recebem padrões glob controlados pelo projeto, sem entrada externa não confiável. Limitar apenas o comprimento não resolve a recursão profunda do [issue upstream](https://github.com/micromatch/braces/issues/70). Os cinco high de desenvolvimento continuam visíveis; não equivalem a cinco falhas independentes comprovadas em produção.

Próxima revisão recomendada: **15/10/2026**, antecipada se houver release/advisory novo. É pendência documentada, não agendamento criado. Encerrar somente após patch real, compatibilidade/testes e auditoria da cadeia corrigida.
