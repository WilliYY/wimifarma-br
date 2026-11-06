# Publicação dos produtos próprios — 06/11/2026

Os dois cadastros existentes foram publicados após o pedido direto do lojista e suas correções de estoque e dados físicos.

| Produto | SKU | Preço de venda | Estoque interno |
| --- | --- | ---: | ---: |
| WimiB Complex Wimifarma, 60 cápsulas de 500 mg | `WIMI-WIMIB-COMPLEX-60CAP` | R$ 19,99 | 60 unidades |
| Creme para mãos WimiLab/Wimifarma, 60 g | `WIMI-CREME-MAOS-60G` | R$ 12,99 | 30 unidades |

Ambos usam `inventorySource=PHARMACY` e `status=ACTIVE`. Os custos unitários informados pelo lojista constam nos metadados privados da auditoria administrativa. O modelo `Product` não possui campo de custo unitário; os valores não foram incluídos nesta documentação.

## Fotos e logística

As capas foram tratadas a partir das fotos fornecidas, com fundo branco, preservando a embalagem e a marca. As imagens já vinculadas aos cadastros foram conferidas na publicação.

O lojista declarou, após pergunta sobre o pacote fechado, **60 g de peso total, altura de 10 cm e base de 5 × 5 cm para cada produto**. A origem permanece registrada como `DECLARED_BY_MERCHANT_NOT_INDEPENDENTLY_MEASURED`. O conteúdo líquido do rótulo e a quantidade em estoque são informações distintas.

O perfil logístico foi validado pelas regras existentes do aplicativo, com revisão de transporte e serviços PAC/SEDEX 1/2. A revisão considerou frasco fechado para o suplemento e vedação/proteção contra vazamentos para o creme, conforme as [restrições dos Correios](https://www.correios.com.br/enviar/proibicoes-e-restricoes).

## Operação e verificação

- Operação: `wimifarma-marca-propria-2-publicacao-20261106-v2`.
- Configuração revisada: `35042b096954921876426cf644db06b1e2d7304287e2662a36dbdf9e68437a11`.
- Fonte do APP em execução: `2d2dda16b8dabd23ad16f520b33d56b81d16ecb0`. Esta operação publicou dados dos produtos.
- O ADMIN ativo foi revalidado. As quatro auditorias registram operador agente e `humanAdminClick=false`.
- A transação atualizou somente o status e o perfil logístico dos dois registros. Preços, estoques, identidade, capas e demais campos foram preservados por comparação integral e controle de concorrência.
- A tentativa V1 foi retirada antes de qualquer apply, após recusa por mudança em tabelas protegidas. A V2 utilizou observações novas, QA própria, revisão independente, backup conferido e baseline capturado imediatamente antes da janela de aplicação.

Validações concluídas:

- `real-qa.mjs`: oito cenários em PostgreSQL isolado, incluindo rollback, ADMIN revogado, concorrência, fotos, falha de auditoria, aplicação e bloqueio de repetição. A semente sintética foi restaurada ao final.
- `publish-own-brand.test.ts`: 26 testes; `production-runner.guard.test.mjs`: cinco; `test-controller-lease.py`: quatro verificações sem banco. Typecheck do adaptador aprovado.
- `npm run test:security`, no snapshot da fonte do APP: **564 testes aprovados**.
- `npm audit --omit=dev --audit-level=high --json`: três alertas baixos e quatro moderados; zero altos/críticos. Auditoria completa: três baixos e nove moderados; zero altos/críticos. Os relatórios completos foram preservados fora do Git.
- Rotina de manutenção: `baseline → grant → dry-run → apply → verify → public → release`. O dry-run confirmou rollback; a aplicação e a releitura confirmaram dois produtos ativos e quatro auditorias. As tabelas protegidas permaneceram iguais ao baseline da operação.
- GETs públicos confirmaram HTTP 200, nome, preço e capa WebP dos dois produtos; página inicial e `/api/health` também responderam 200.
- A janela foi encerrada com zero grants ativos e `uncertainApply=false`; o grant local foi consumido. Canônico no fechamento: `bd4c05c1b0e580427ec7c81a2b1b57eb33fa4a268c9b150d9037cf04a2fcf955`.
- As QA próprias V1/V2 foram removidas após conferir nome, OID, owner, comentário/nonce e zero sessões, sem `FORCE`. A releitura confirmou ausência das duas QA, dados dos dois produtos e custos privados corretos, quatro auditorias e APP saudável, com a mesma imagem.

Páginas verificadas:

- [WimiB Complex](https://wimifarma.com.br/produto/wimib-complex-wimifarma-60-capsulas-de-500-mg)
- [Creme para mãos](https://wimifarma.com.br/produto/creme-para-maos-wimilab-wimifarma-60-g)

Os artefatos operacionais, imagens originais, custos, relatórios e backup ficam nos destinos privados da tarefa. A documentação versionada descreve o resultado e as verificações.
