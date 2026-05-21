# 04 - Padroes de Codigo

## O Que Esta Parte Faz

Define como evoluir o codigo mantendo consistencia, rastreabilidade e seguranca.

## Padroes Gerais

- Usar TypeScript.
- Preferir componentes pequenos e claros.
- Manter site, admin, APIs, features e banco separados.
- Usar Zod para validar entradas.
- Usar Prisma para persistencia.
- Usar Tailwind para estilos.
- Usar `lucide-react` para icones.
- Usar `sonner` para feedback client-side quando necessario.
- Evitar comentarios obvios.

## Next.js

- Rotas publicas ficam em `src/app/(site)`.
- Rotas admin ficam em `src/app/admin`.
- APIs ficam em `src/app/api`.
- Componentes client devem declarar `"use client"`.
- Server Components devem buscar sessao/dados quando possivel.

## UI e Layout

- Componentes do site publico ficam em `src/components/site`.
- Componentes admin ficam em `src/components/admin`.
- Componentes base ficam em `src/components/ui`.
- Animacoes ficam em `src/components/motion` ou dentro do componente quando forem especificas.
- Preservar identidade vermelha/branca da Wimifarma.
- Verde deve ser apoio para WhatsApp/Farmacia Popular, nao cor principal.

## Banco e APIs

- Schemas Zod por modulo ficam em `src/features/*/schema.ts`.
- Endpoints devem validar body antes de usar Prisma.
- Mutacoes administrativas devem registrar auditoria quando o fluxo real for implementado.
- Nao consultar banco diretamente em componentes client.

## Autenticacao

- Config principal: `src/features/auth/auth.ts`.
- Permissoes de API: `src/features/auth/permissions.ts`.
- Tipos NextAuth: `src/types/next-auth.d.ts`.
- Login temporario `adm / adm` e risco conhecido e deve ser removido/protegido antes de producao.

## Documentacao

Atualize docs quando mudar comportamento relevante. Use:

- `docs/06-pendencias.md` para gaps.
- `docs/07-historico-de-decisoes.md` para decisoes.
- Docs especificos para modulos grandes.

## Validacao

Para mudancas importantes:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run prisma:validate
```

Para mudancas de dependencia:

```powershell
npm.cmd audit --audit-level=moderate
```

## Riscos ao Alterar

- Fazer refactor amplo em uma tarefa pequena.
- Criar estilos globais que quebram varias telas.
- Mudar schema sem migration.
- Criar endpoint sem permissao.
- Esquecer de atualizar docs.

## Evolucao

Quando houver testes automatizados, documentar padroes em `docs/16-testes.md`.
