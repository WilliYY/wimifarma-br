# 42 - Revisão de segurança

## Cashback em genéricos e similares com receita — 23/10/2026

A autorização comercial amplia apenas o cashback de compra. Classificação estrita e validada no servidor, versão do produto, locks, auditoria e liquidação idempotente preservam o limite financeiro. A revisão independente identificou e corrigiu defaults do cadastro e divergência entre filtros JSONB por caminho e o schema estrito; o filtro agora compara objetos JSON exatos. Identidade nova alterada também invalida a classificação de receita no formulário.

O plano de ativação usa ADMIN atual, GTIN/versão/configuração anterior, expiração, hash externo e transação única. Não aceita creditar carteiras ou recalcular pedidos. Testes sintéticos não usam dados de clientes e a auditoria real recusa banco fora do nome QA permitido. Resultados finais de checks, auditorias npm e implantação devem ser registrados na evidência da tarefa; esta descrição do mecanismo não comprova execução nem ativação em produção.

Conferência posterior: revisão independente sem achados pendentes, incluindo validação do autor no CLI/helper antes de consultar Prisma. 485 regressões de segurança e auditoria financeira em PostgreSQL descartável aprovadas. Auditorias npm completas e de produção em 24/10/2026 UTC retornaram um alerta moderado em `fast-uri` e zero high/critical; o bloqueio high/critical não foi ignorado e nenhuma dependência foi modificada nesta entrega. Testes e checks adicionais constam em [15](15-cashback-produtos.md).

## Zod e consumo de memória em coleções — 23/10/2026

A auditoria de produção anterior à publicação dos logos retornou um alerta **high** em `zod` 4.4.3, reproduzido em nova consulta, apesar de a auditoria completa retornar zero naquele momento. A divergência não foi usada para desconsiderar o bloqueio. O aviso [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), atualizado nesta data, aponta versões anteriores à 4.6.6; a correção upstream antecipa a rejeição de coleções que excedam limites declarados.

Preparada atualização restrita de `zod` para **4.6.6**, fixada no manifesto e no lock, sem `audit fix --force`, troca de stack ou atualização de outros pacotes. Permanecem necessários os limites de corpo HTTP, tamanho de coleções, tempo e concorrência existentes; atualizar a biblioteca não prova que toda entrada esteja limitada. A atualização é separada da alteração visual de logos.

Após o patch, TypeScript, lint e os 484 testes de segurança passaram; auditorias npm de produção e completa retornaram zero vulnerabilidades. Revisão independente sem achados confirmou a alteração exclusiva do Zod no manifesto/lock. CI, build e estado de publicação ficam na evidência da tarefa em `outputs/linhas-e-fotos-2026-10-23/validacao-e-publicacao.json`. Nenhum teste com cobrança ou cliente real é necessário para essa conferência. Resultado local ou CI não comprova, sozinho, atualização da imagem em produção.

## Auditoria funcional e de acessos — 23/10/2026

Corrigido o caminho Club/Customer que permitia trocar a senha local vinculada sem conferir a credencial atual. Validação autoritativa, revalidação sob locks, CAS e isolamento transacional preservam concorrência e Google-only; falhas de infraestrutura têm resposta 503 e diagnóstico fixo sem segredos. Revisões independentes aprovaram acesso e mudanças comerciais. A suíte de segurança passou com 484 testes, e as auditorias npm de produção e completa retornaram zero vulnerabilidades nesta consulta. Controles públicos, bugs corrigidos, pendência de frete e limites em [101](101-auditoria-funcional-e-acessos.md). Os testes novos de concorrência usam banco simulado, sem afirmar prova PostgreSQL real.

## Auditoria de compra e frete — 23/10/2026

452 testes de segurança e auditoria de concorrência/idempotência em PostgreSQL descartável passaram; revisão independente sem achados novos nas mudanças. Auditorias npm de produção e completa com desenvolvimento retornaram zero alertas nesta consulta, atualizando o retrato histórico abaixo. Lint, typecheck e build local passaram. Escopo, controles, matriz de frete, configuração efetiva dos gateways e limites em [99-auditoria-frete-checkout-seguranca.md](99-auditoria-frete-checkout-seguranca.md). Não é prova de ausência de qualquer vulnerabilidade nem homologação com cobrança real.

## Correções e revisão ampliada — 10/10/2026

- Criação ADMIN revalida acesso sob bloqueio após o hash; criação de usuário e criação/exclusão no cofre são atômicas com auditoria.
- JSON e POST Auth.js limitados durante a leitura; multipart limita o corpo inteiro antes do parsing. Miauby ganha cotas de inferência, concorrência e fallback no handler. O middleware já tinha rate limit/origem: a alegação anterior de ausência de limite foi corrigida.
- Asaas distingue revisão técnica recuperável de revisão financeira, preservando estoque e impedindo reenvio de cobrança. Estorno em revisão não é promovido por confirmação atrasada.
- Revisões independentes aprovadas; produção npm sem alertas, cinco high de desenvolvimento continuam visíveis. Infraestrutura compartilhada permanece sem alterações por decisão do titular. Contratos, validação e limites em [60-correcao-e-revisao-de-seguranca.md](60-correcao-e-revisao-de-seguranca.md).

## Correções da auditoria — 08/10/2026

- Limitar corpo JSON de frete durante leitura por bytes; cancelar excesso preservando erro 413. Devoluções de estoque seguem a ordem das reservas, preservando confirmação financeira e idempotência. Novas regressões de abuso/concorrência na seleção de segurança.
- Provider de saldo por cliente, sem cache global entre sessões; regressão UI de troca de identidade/logout. CI executa descoberta completa de testes, incluindo Miauby e Chromium isolado.
- Verificação independente de dependências reconfirmou `braces` 3.0.3 sem patch. Manter cinco high visíveis e ferramentas restritas a padrões glob confiáveis; revisão recomendada em 15/10/2026, sem automação criada. Fontes, validação e publicação no documento 57.

## Roteamento de pagamentos — 08/10/2026

- Asaas habilitado inválido agora produz diagnóstico fixo auditável, conservando o gateway válido para novos pedidos. Mensagens brutas e segredos não são serializados; teste ADMIN permanece isolado. Revisão independente estática sem achados novos.
- Validação local: 225 testes de segurança, lint, typecheck, Prisma validate e build passaram. Produção: auditoria npm zero alertas. Completa: cinco high e zero critical na cadeia de ferramentas já registrada abaixo.
- Reconfirmado [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm): versões até 3.0.3 afetadas, sem patch publicado; `npm view braces version` retornou 3.0.3. Não aplicar downgrade automático de `eslint-config-next` para 14.2.35. A cadeia é de desenvolvimento; não fornecer padrões glob externos não confiáveis às ferramentas. Isso não equivale a remediação da dependência nem comprova ausência de outras falhas.
- Não houve mudança de permissões, credenciais, schema, regras de dispensação ou animações. Contrato funcional, frete ao vivo e limites em documento 54; Google Play no documento 55.

## Dependência Next.js — 08/10/2026

A auditoria antes da publicação do painel Sandbox identificou dois alertas moderate em Next.js até 15.5.26: [GHSA-4jqv-mc3x-m676](https://github.com/advisories/GHSA-4jqv-mc3x-m676) e [GHSA-mcj8-r9mp-w47p](https://github.com/advisories/GHSA-mcj8-r9mp-w47p), relacionados a envenenamento de cache SSG/ISR. Atualizados `next` e `eslint-config-next` de 15.5.25 para **15.5.27**, fixando a versão corrigida no manifesto/lock. A aplicação usa App Router; os avisos não demonstram por si só exploração desta aplicação. O patch preserva Next.js 15, contratos e layout, sem `audit fix --force` ou downgrade.

Os cinco alertas high da cadeia de desenvolvimento `braces`/`micromatch`/`fast-glob`/ESLint Next continuam sendo reportados separadamente. A auditoria de produção e as validações após o patch têm registro próprio abaixo; não confundir ausência de alertas npm com segurança completa do site.

Validação local após o patch: **118/118** testes de segurança, lint, build Next.js (37 páginas estáticas) e Prisma validate passaram. `npm audit --omit=dev --json` retornou zero; a auditoria completa retornou cinco high, zero critical, na mesma cadeia de ferramentas. Revisão independente aprovou manifesto/lock, integridades e compatibilidade React 19/ESLint 9/TypeScript. Comandos executados pelo isolamento temporário por tarefa; nenhuma credencial, banco, screenshot ou arquivo de ambiente entra no commit.

Publicação `9818312`: build Docker/Next passou; somente app recriado, sem migração. Runtime Linux confirmou Next.js 15.5.27; container healthy e zero reinícios. Health/home/checkout retornaram 200; API administrativa Sandbox recusou sessão ausente com 401, `private, no-store`, CSP, HSTS, `nosniff` e `DENY`. Evidência de imagem, rollback e validação autenticada em [40-asaas-configuracao-e-homologacao.md](40-asaas-configuracao-e-homologacao.md).

O workflow [Security checks](https://github.com/WilliYY/wimifarma-br/actions/runs/37772449602) foi confirmado concluído com sucesso pela API do GitHub para esse commit.

## Dependência de imagens — 06/10/2026

A auditoria antes da entrega de ecossistema encontrou um novo alerta high de produção: [GHSA-wq5f-xc86-pv6w](https://github.com/advisories/GHSA-wq5f-xc86-pv6w), publicado na base GitHub em 06/10, afeta o librsvg empacotado por `sharp <0.35.5`. Atualizado `sharp` 0.35.4 → 0.35.5 no manifesto/lock, sem mudança na API de imagens, limites, formatos ou identidade visual. O [changelog oficial](https://sharp.pixelplumbing.com/changelog/v0.35.5/) identifica a versão corrigida; runtime Windows confirmou librsvg 2.63.2 e libvips 8.18.7.

Após atualização: 27 testes de imagens e 79 de segurança, typecheck e lint passaram; revisão independente aprovou o patch, sem achados novos. Auditoria de produção retornou zero; completa mantém cinco high em `@next/eslint-plugin-next`, `braces`, `eslint-config-next`, `fast-glob` e `micromatch`, sem downgrade forçado. Build e runtime Linux foram conferidos no comprovante abaixo. Não usar versão do runtime Windows como prova dos binários Linux.

A allowlist MIME existente permanece preservada e recusa `image/svg+xml`, mas MIME adulterado ou uma fonte remota podem alcançar o decoder librsvg. Não afirmar bloqueio integral de SVG: esta entrega corrige a dependência que processa os bytes e mantém os limites de imagem existentes.

### Comprovante Linux e publicação — 06/10/2026

- Commit `cf2ceb0` publicado por fast-forward, build Docker/Next concluído e somente o app recriado, sem migração ou reinício de PostgreSQL. [Security checks](https://github.com/WilliYY/wimifarma-br/actions/runs/37504595404) passou.
- Imagem ativa: `sha256:d9c249028316465fd4bc669bb2bbc61e2f9f1ed49fd900a04cf0de007b5dfa3c`; container healthy, zero reinícios. Imagem anterior preservada como `wimifarma-br-app:pre-sharp-cf2ceb0`.
- Runtime Linux arm64/Node 24.21.0 confirmou Sharp 0.35.5 e libvips 8.18.7. O standalone omite `versions.json`, portanto `sharp.versions` não mostra librsvg. A biblioteca real foi comparada com o arquivo publicado no pacote npm `@img/sharp-libvips-linux-arm64@1.3.4`: integridade SHA-512 do tarball conferida e SHA-256 da biblioteca idêntico (`97c2ae9a663cd3de58a34d68820994e49e0e261fddbd4616bd726a72610bbc8f`). Metadados desse pacote confirmam librsvg **2.63.2**. Não inferir a plataforma a partir do computador local.
- Conversão sintética SVG → WebP no container produziu imagem de 16 × 12 px/64 bytes; não reutilizou dados ou imagens de clientes. Health, home e checkout responderam 200; APIs de frete administrativo e pedidos privados responderam 401 sem sessão, com `private, no-store` e cabeçalhos de segurança. Não houve compra, cobrança, envio de mensagem ou alteração de credencial neste ensaio.

## Escopo — 05/10/2026

Revisão de autenticação/permissões, histórico privado, pagamentos/webhooks, cofre, imagens remotas e configuração. Rotas mapeadas e fluxos sensíveis revisados; não é pentest completo, análise forense nem garantia contra qualquer invasão. Testes usaram dados sintéticos, sem banco/rede reais. Verificação de infraestrutura foi somente leitura.

## Correções

1. **Associação Google por e-mail:** um cadastro local com senha e sem subject Google não pode ser associado automaticamente pelo e-mail. Google só preserva conta já vinculada ao mesmo subject, ou registro sem senha. Vinculação explícita de conta local exige fluxo futuro com comprovação; não apagar senha para liberar a associação. Unicidade do banco continua fechando corridas de criação.
2. **Revogação na troca de senha:** JWT criptografado/httpOnly contém uma versão derivada da credencial, conferida contra o banco a cada atualização. A versão é fixada somente no login; nunca adotada silenciosamente por cookie antigo nem exposta na Session pública. Troca de senha invalida sessões anteriores de cliente, Google vinculado e staff correspondente. A tela de senha pede nova entrada.
3. **APIs privadas:** `/api/admin/*` e `/api/minha-conta/*` ganham `Cache-Control: private, no-store, max-age=0`, incluindo revelação de cofre. Nenhum segredo foi aberto em produção para testar o cabeçalho.
4. **Dependências:** `fast-uri` 3.1.6 → 3.1.8, `brace-expansion` 1.1.18 → 1.1.21 e 5.0.9 → 5.0.12, mantendo faixas compatíveis. Nenhuma dependência direta nova ou troca de stack.

Esta publicação exige novo login para cookies anteriores sem versão, inclusive administrativos. Contas/senhas e dados permanecem intactos. Não comprova integridade de associações feitas antes do patch: qualquer análise histórica deve ser privada e baseada em evidências, sem assumir que houve invasão.

Fontes de versão corrigida: [fast-uri](https://github.com/advisories/GHSA-hrr3-gc8f-f4qj), [brace-expansion](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr).

## Controles confirmados

- HTTPS responde 200 com CSP, HSTS, nosniff, DENY para frames e política de referrer. CSP admite inline necessário ao framework; não afirmar que isso elimina XSS.
- App em execução como usuário `nextjs`, não root; PostgreSQL saudável sem portas publicadas no host. Esses controles não auditam todos os serviços/portas do VPS.
- APIs sensíveis verificam sessão/perfil e propriedade; segredos ficam cifrados. Pagamentos conferem comerciante, referência, moeda/valor e assinatura; resposta incerta não confirma pagamento.
- URLs remotas de imagens bloqueiam destinos internos e validam resolução/redirecionamento. Saída da IA continua dado não confiável, sem permissão para conceder acesso ou aprovar pagamentos/embalagens.

## Padrão permanente

- `SECURITY.md` e `AGENTS.md` passam a exigir revisão dos limites de confiança e testes de segurança antes de entrega.
- `npm run test:security` cobre associação Google, revogação, perfis/dono, entradas/SSRF, OAuth, assinatura de frete e reconciliação de pagamento.
- Workflow existente de push/PR/manual/semanal ganha regressões e bloqueio de alertas high/critical de produção. Auditoria completa continua bloqueando critical e exibindo os demais alertas.
- Após publicação: health, cabeçalhos, API privada sem sessão e funcionamento do fluxo afetado. Não enviar campanha, abrir segredo ou executar compra real sem necessidade/autorização específica.

## Validação e limites atuais

- Segurança: 79/79; geral: 187/187; comércio: 18/18; frete: 45/45. Suites têm testes sobrepostos; não somar como contagem de testes únicos. Lint, typecheck e Prisma validate passaram.
- As regressões de associação e revogação falharam antes dos patches e passaram depois. Ensaio independente também confirmou STAFF, Google+staff, corrida entre autorização e rotação, rejeição de cookie sem versão e ausência da versão na Session pública.
- `npm audit --omit=dev`: zero vulnerabilidades na consulta atual. Auditoria completa ainda tem cinco high na cadeia de desenvolvimento `braces` → `micromatch`/`fast-glob` → ESLint Next. Não é prova de exploração do site. [Aviso upstream](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) não publicou versão corrigida compatível na consulta; não aplicar downgrade automático de Next/ESLint.
- MFA próprio, restauração de backups, segurança dos demais serviços do VPS, auditoria de associações antigas, scan de imagem/OS e pentest completo continuam fora desta comprovação. MFA da conta Google é controle separado.
- Build Linux, publicação, health e histórico real do workflow têm evidência própria após a entrega. Não confundir configuração CI com execução comprovada no GitHub.

## Comprovante de publicação — 2026-10-05

- Código `8f18abb` publicado no GitHub e aplicado por fast-forward no VPS. Build Linux/Docker concluído; app recriado sem migração de banco.
- Imagem em execução: `sha256:c7a855927317ea3e6867b47a6023916f524e5ec631219790d88cfff343ce3197`, usuário `nextjs`, health `healthy`, zero reinícios. Imagem anterior preservada como `wimifarma-br-app:pre-security-8f18abb`.
- HTTPS público: `/api/health`, home, login e checkout retornaram 200. APIs `/api/admin/fretes` e `/api/minha-conta/pedidos` retornaram 401 sem sessão e `Cache-Control: private, no-store, max-age=0`.
- HSTS, `nosniff` e `X-Frame-Options: DENY` presentes; política específica do checkout mantém o SDK Mercado Pago. A verificação não criou pedidos, cobranças, etiquetas ou mensagens.
- Workflow [Security checks](https://github.com/WilliYY/wimifarma-br/actions/runs/37354232654) concluído com sucesso para esse commit, confirmado pela API oficial do GitHub.
- Revogação e associação Google verificadas por regressões e revisão independente com dados sintéticos. Não foi alterada senha real em produção como teste; sessões legadas precisam de novo login.
