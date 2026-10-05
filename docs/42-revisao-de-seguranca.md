# 42 - Revisão de segurança

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
