# AGENTS.md

Manual obrigatorio para qualquer futura conversa do Codex neste projeto.

## Identidade do Projeto

Wimifarma BR e uma plataforma comercial para uma farmacia em Ivate-PR. O objetivo e evoluir de site publico para sistema comercial com ofertas, catalogo, atendimento por WhatsApp, admin, APIs internas, banco PostgreSQL e modulos futuros.

Este projeto:

- Nao e WordPress.
- Nao depende de HostGator.
- Nao deve ser misturado com Candy English.
- Nao deve ser misturado com o projeto local antigo `wimifarma-com`.
- Nao possui checkout/pagamento nesta fase.

## Regra 1: Leitura Obrigatoria Antes de Alterar Arquivos

Antes de alterar qualquer arquivo, sempre ler:

- `AGENTS.md`
- `README.md`
- arquivos relevantes da pasta `docs/`

Para tarefas grandes, ler tambem:

- `docs/00-visao-geral.md`
- `docs/01-arquitetura.md`
- `docs/06-pendencias.md`
- `docs/07-historico-de-decisoes.md`

## Regra 2: Nao Reescrever Sem Necessidade

Nunca reescrever o projeto inteiro sem necessidade. Prefira corrigir ou evoluir a parte exata solicitada.

## Regra 3: Mudancas Pequenas e Reversiveis

Fazer alteracoes pequenas, rastreaveis e reversiveis. Evitar refactors amplos se o pedido for visual, textual ou pontual.

## Regra 4: Preservar Padroes Existentes

Preservar os padroes ja existentes no projeto, salvo quando houver motivo tecnico claro para alterar. Se alterar um padrao, documentar o motivo.

## Regra 5: Seguranca e Dados

- Nunca versionar `.env` real.
- Nunca colocar senha real no GitHub.
- Nunca usar dados reais de clientes em seed, teste ou exemplo.
- Nunca expor PostgreSQL publicamente.
- Nunca deixar credenciais temporarias em producao.
- O login temporario `adm / adm` e pendencia critica e deve ser removido ou condicionado antes de producao.

## Regra 6: Escopo Comercial

- WhatsApp e o canal principal de conversao nesta fase.
- Nao implementar checkout/pagamento agora.
- Roleta, cashback e clube devem ficar preparados, mas sem regras comerciais reais ate aprovacao.
- Farmacia Popular nao deve prometer disponibilidade automatica.

## Regra 7: Atualizacao Obrigatoria da Documentacao

Atualizar a documentacao sempre que houver mudanca em:

- arquitetura;
- banco de dados;
- APIs;
- autenticacao;
- permissoes;
- regras de negocio;
- seguranca;
- deploy;
- layout principal;
- fluxos de usuario;
- modulos internos;
- integracoes externas;
- comportamento importante do sistema.

Use `docs/07-historico-de-decisoes.md` para decisoes tecnicas importantes.

## Regra 8: Resumo Obrigatorio ao Finalizar Tarefa

Ao finalizar qualquer tarefa, informar:

- arquivos alterados;
- documentacao criada ou atualizada;
- comandos executados;
- testes, build ou lint realizados;
- pendencias abertas;
- riscos ou cuidados encontrados.

## Stack Atual

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Componentes estilo shadcn/ui
- Prisma 7 com PostgreSQL 17
- Auth.js / NextAuth v5
- Zod
- React Hook Form
- Docker e Docker Compose
- Framer Motion, GSAP, Lenis
- TanStack Table, Recharts
- bcryptjs, lucide-react, sonner, sharp, qrcode

## Estrutura Principal

```text
src/app/(site)        Rotas publicas
src/app/admin         Rotas reservadas
src/app/api           APIs internas
src/components/site   Site publico
src/components/admin  Painel administrativo
src/components/ui     Componentes base
src/components/motion Animacoes
src/features          Schemas e logica por modulo
src/lib               Prisma, env, helpers e configuracoes
src/types             Tipos globais
src/hooks             Hooks reutilizaveis
prisma                Schema, migration e seed
docs                  Memoria longa do projeto
public                Assets publicos
```

## Docker Oficial

Usar nomes exclusivos da Wimifarma BR:

- App: `wimifarma-br-app`
- Postgres: `wimifarma-br-postgres`
- Database: `wimifarma_br`
- User: `wimifarma_user`
- Volume: `wimifarma-br-postgres-data`
- Network: `wimifarma-br-network`
- Porta local Docker: `127.0.0.1:3001:3000`

No Nginx Proxy Manager, o destino deve ser:

```text
Forward Hostname/IP: wimifarma-br-app
Forward Port: 3000
```

## Validacao Recomendada

Antes de entregar mudancas importantes:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run prisma:validate
npm.cmd audit --audit-level=moderate
```

Se `npm audit` falhar por certificado no Windows:

```powershell
$env:NODE_OPTIONS='--use-system-ca'
npm.cmd audit --audit-level=moderate
```

## Processo de Trabalho Para Agentes

1. Ler a documentacao relevante.
2. Verificar `git status --short`.
3. Identificar arquivos diretamente relacionados.
4. Fazer mudancas pequenas.
5. Atualizar docs quando necessario.
6. Rodar validacoes adequadas ao risco da mudanca.
7. Informar claramente o que mudou e o que ainda falta.

## Areas Sensiveis

- `src/features/auth/auth.ts`: autenticacao, login temporario e NextAuth.
- `src/features/auth/permissions.ts`: permissoes de APIs.
- `src/components/admin/admin-shell.tsx`: shell e navegacao admin.
- `prisma/schema.prisma`: modelos persistentes.
- `docker-compose.yml`: infraestrutura local/servidor.
- `.env.example`: contrato de configuracao sem segredos reais.

## Nao Fazer

- Nao usar dados reais de clientes.
- Nao commitar `.env`.
- Nao trocar a stack sem necessidade.
- Nao quebrar compatibilidade com Docker Compose.
- Nao criar checkout/pagamento sem pedido explicito e nova decisao registrada.
- Nao remover modulos futuros sem registrar motivo.
