# 95 — Correção de segurança do Next.js 15

## Escopo — 22/10/2026

Atualização mínima de `next` e `eslint-config-next` de **15.5.27 para 15.5.28**, com versões exatas no manifesto e lockfile. O lock atualiza somente a família Next.js: framework, configuração/plugin ESLint, `@next/env` e binários SWC por plataforma. Nenhum pacote foi removido ou dependência alheia atualizada. Sharp permanece **0.35.5**, React/React DOM **19.2.5** e NextAuth **5.0.0-beta.32**.

Não há mudança de schema, migração, credenciais, regras de receita, frete, pagamentos, preços ou dados comerciais. A publicação dos itens autorizados é uma operação separada e não é comprovada pelos testes desta correção.

## Motivo e fontes primárias

- [GHSA-2464-fhr4-w9xw](https://github.com/advisories/GHSA-2464-fhr4-w9xw): RCE na otimização de imagens em Linux com glibc; afeta Next.js até 15.5.27. A versão corrigida é 15.5.28. O workaround publicado exige Sharp >= 0.35.5, já presente no lock antes desta atualização; o alerta de versão não comprova exploração do site.
- [GHSA-p3m5-59mp-jv5r](https://github.com/advisories/GHSA-p3m5-59mp-jv5r): DoS no App Router com Server Actions; corrigido em 15.5.28. O advisory informa que a atualização é necessária, sem workaround alternativo.
- [Release oficial v15.5.28](https://github.com/vercel/next.js/releases/tag/v15.5.28): lista as duas correções. Os advisories foram publicados na base GitHub em 22/10/2026; a release e a publicação original no repositório são de 14/10/2026.
- npm registry confirmou versão, integridade SHA-512, dependências e peers de [next@15.5.28](https://registry.npmjs.org/next/15.5.28) e [eslint-config-next@15.5.28](https://registry.npmjs.org/eslint-config-next/15.5.28). A consulta Context7 à documentação oficial disponível da linha 15 foi auxiliar; as fontes acima comprovam o patch exato.

## Auditoria antes e depois

- RED: `npm.cmd audit --omit=dev --json` antes da alteração terminou com exit 1. O npm agrupa os avisos do pacote `next` pela maior severidade: metadata registrou um pacote critical.
- GREEN: `npm.cmd audit --omit=dev --audit-level=high --json` após a instalação terminou com exit 0 e **zero vulnerabilidades**.
- Auditoria completa `npm.cmd audit --audit-level=moderate --json`: exit 1, **cinco high de desenvolvimento e zero critical**. Cadeia: `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces`. Fonte: [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

O npm sugere downgrade incompatível de `eslint-config-next` para 14.2.35. Não foi aplicado `npm audit fix --force`; os alertas de desenvolvimento permanecem registrados. A auditoria de produção sem alertas não comprova ausência de outras falhas nem invulnerabilidade.

## Validação local e publicação

A instalação `npm.cmd install --save-exact next@15.5.28 eslint-config-next@15.5.28 --ignore-scripts --no-audit --no-fund` terminou com exit 0. Manifesto, lockfile e pacotes instalados foram comparados; `npm.cmd ls next eslint-config-next sharp react react-dom next-auth --json` também terminou com exit 0. As integridades SHA-512 de Next.js e ESLint no lock coincidem com as respostas do registry.

- `npm.cmd run test:security`: **444/444**, zero falhas, cancelamentos ou skips.
- `npm.cmd run lint`, `npm.cmd run typecheck` e `npm.cmd run prisma:validate`: exit 0.
- `npm.cmd run build`: exit 0, Next.js 15.5.28, **39/39 páginas estáticas**, compilação concluída em 91 segundos. O build completo levou 261,49 segundos. Aviso não fatal `[footer] payment-brands-unavailable`: o componente existente usa sua apresentação alternativa ao não conseguir carregar a configuração pública das bandeiras; não foi alterado neste patch.
- `npm.cmd run test:all`: **1.020/1.020 testes**, 180 arquivos, exit 0, zero falhas, cancelamentos ou skips. O runner levou 164,56 segundos; o comando completo, 166,10 segundos. A suíte de segurança se sobrepõe à completa; não somar as contagens como testes únicos.
- `git diff --check`: passou. O diff contém apenas manifesto, lockfile e os três documentos desta correção.

Logs e respostas públicas do registry ficam na pasta privada ignorada `outputs/correcao-seguranca-next-2026-10-22`. Comandos usam o executor de temporários da tarefa e `NODE_OPTIONS=--use-system-ca`.

Esta evidência é local no Windows. Build Linux/Docker, revisão independente, backup da imagem ativa, publicação somente do app sem migrações e conferência de runtime/health/cabeçalhos continuam sendo requisitos da publicação conduzida pelo principal. Não houve ação em produção nesta etapa.

## Confirmação posterior em produção e encerramento

Em 22/10/2026, às 20:13:30 UTC, o commit `778cb2402932edb66a2ccb8ae465c5af5539aade` foi implantado após build Linux/Docker e revisão independente. A promoção recriou somente o aplicativo, sem migração. O runtime real confirmou Next.js 15.5.28, Sharp 0.35.5 e Node 24.21.0 em Linux arm64, health saudável e zero reinícios. O PostgreSQL manteve ID e horário de início anteriores; a imagem anterior foi preservada em tag de recuperação. Home e `/api/health` responderam HTTP 200.

A retomada manual concluiu exclusivamente os lotes autorizados: seis itens infantis, oito medicamentos antigos, três Granado e sete Principia. Os sete Principia receberam autorização humana própria e reexecutaram os gates reais quando a validade anterior terminou, preservando fontes, datas comerciais e arquivos selados. Cada publicação usou revisão independente, QA isolado, auditoria de produção sem alertas, concessão serial CAS, backup validado, baseline/dry-run, inclusão exclusiva por EAN e provas de preservação e HTTPS. As quatro concessões foram encerradas; não há operação produtiva incerta.

A consulta própria em transação somente leitura, às 21:25:30 UTC de 22/10, confirmou **619 produtos ativos, 621 registros totais e 220 medicamentos ativos**, incluindo os 24 EANs desta retomada sem duplicações. Um refil Granado indisponível e três Principia com divergências permaneceram retidos. A gerência foi encerrada e o acompanhamento central continua pausado, sem novos lotes ou retomada automática. A meta numérica anterior foi substituída pela instrução humana de fechar apenas os lotes existentes.

As provas completas e o balanço estão em `outputs/catalogo-paralelo-2026-10-20/`, pasta privada ignorada pelo Git. A conferência pública validou campos das páginas e bytes das imagens por HTTPS; não constituiu uma nova avaliação visual do layout. Os cinco alertas de desenvolvimento já descritos permanecem registrados; a auditoria de dependências de produção permaneceu zerada nos gates atuais.
