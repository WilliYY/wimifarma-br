# 03 - Fluxos do Sistema

## O Que Esta Parte Faz

Este documento descreve os fluxos reais existentes hoje e os fluxos planejados que ainda nao estao completos.

## Fluxo Publico Atual

1. Usuario acessa `/`.
2. Ve o video institucional/comercial e um espaco grande reservado para anuncio principal.
3. Pode clicar em WhatsApp para iniciar atendimento.
4. Pode acessar paginas publicas basicas como `/ofertas`, `/farmacia-popular`, `/sobre` e `/contato`.
5. A rota `/ofertas` continua existindo, mas nao aparece no menu principal enquanto a home estiver focada em anuncio.

Arquivos principais:

- `src/components/site/home-page.tsx`
- `src/components/site/site-header.tsx`
- `src/components/site/floating-whatsapp.tsx`
- `src/lib/site.ts`

## Fluxo de WhatsApp

O WhatsApp e o canal principal de conversao. O site deve facilitar o pedido, mas a confirmacao de preco, disponibilidade, receita e entrega continua humana.

O link centralizado em `src/lib/site.ts` usa o numero `+55 44 98413-4971` e a mensagem padrao "Olá, tudo bem? Gostaria de falar sobre medicamentos ou da Farmácia Popular". Esse link deve ser reaproveitado pelos botoes publicos e administrativos.

Arquivos:

- `src/lib/whatsapp.ts`
- `src/lib/site.ts`
- `src/app/api/whatsapp/route.ts`
- `src/features/whatsapp/schema.ts`

## Fluxo de Login

1. Usuario acessa `/login`.
2. A tela exibe blocos de entrar e cadastrar.
3. Login Google, quando configurado, e destinado apenas a clientes e retorna para `/login`.
4. No primeiro login Google, o sistema cria ou atualiza um `Customer` pelo e-mail/identificador Google.
5. Apos login de cliente, o header publico mostra o nome vindo da conta Google e um botao `Sair`.
6. Cliente logado pode clicar no nome no header e acessar `/minha-conta`.
7. Cadastro por formulario cria `Customer` com email, telefone e senha.
8. Cliente por email/senha entra em `/minha-conta`; admin por Credentials entra em `/admin/dashboard`.
9. Logout publico encerra a sessao e redireciona para `/`.

Arquivos:

- `src/components/site/customer-auth-page.tsx`
- `src/components/site/customer-account-panel.tsx`
- `src/features/auth/auth.ts`
- `src/lib/validations/auth.ts`
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/app/api/minha-conta/*`

## Fluxo Minha Conta

1. Cliente autenticado acessa `/minha-conta`.
2. A pagina carrega o `Customer` da sessao e bloqueia usuarios administrativos.
3. A aba `Usuario` salva nome, telefone, endereco, bairro, cidade e observacoes em um unico botao `Salvar`.
4. A aba `Senha` permite criar senha para conta Google ou trocar senha existente.
5. A opcao de redefinicao por email aparece como ponto preparado, mas depende de provedor de envio de email.
6. A aba `Cashback` mostra saldo e ultimas movimentacoes se houver `CashbackAccount`.

Arquivos:

- `src/app/(site)/minha-conta/page.tsx`
- `src/components/site/customer-account-panel.tsx`
- `src/app/api/minha-conta/route.ts`
- `src/app/api/minha-conta/password/route.ts`
- `src/app/api/minha-conta/register/route.ts`

## Fluxo Admin Atual

1. Usuario autenticado acessa `/admin/dashboard`.
2. A pagina valida permissao server-side pela rota antes de renderizar o modulo.
3. `AdminShell` monta sidebar e header.
4. Links aparecem conforme role (`ADMIN`, `MANAGER`, `STAFF`) usando o mesmo mapa de permissao das paginas.
5. `ADMIN` ve tambem modulos sensiveis como `API e Senhas`, temas, configuracoes, cashback e clube.
6. `Criar ADM` e `Criar colaborador` permitem criar acessos reais com email, senha temporaria, role, listagem e bloqueio/reativacao.
7. Muitas telas ainda sao placeholders com descricao de futuro modulo.

Arquivos:

- `src/components/admin/admin-shell.tsx`
- `src/components/admin/module-placeholder.tsx`
- `src/features/auth/permissions.ts`
- `src/components/admin/admin-users-panel.tsx`
- `src/app/api/admin/usuarios/*`
- `src/app/admin/*/page.tsx`

## Fluxo API e Senhas

1. Administrador acessa `/admin/api-senhas`.
2. Preenche nome, servico, identificador, segredo e notas opcionais.
3. A API `/api/admin/api-senhas` valida com Zod e cifra segredo/notas antes de gravar.
4. A listagem retorna apenas metadados; o segredo fica mascarado na UI.
5. Ao clicar em revelar, `/api/admin/api-senhas/[id]/reveal` descriptografa e registra auditoria.
6. Exclusao usa `/api/admin/api-senhas/[id]` e tambem registra auditoria.

Arquivos:

- `src/app/admin/api-senhas/page.tsx`
- `src/components/admin/secret-vault-panel.tsx`
- `src/app/api/admin/api-senhas/route.ts`
- `src/lib/secret-vault.ts`

## Fluxo de APIs

1. Cliente chama endpoint em `src/app/api`.
2. APIs de negocio executam `requireAdminApi`; APIs mais sensiveis podem executar `requireAdminOnlyApi`.
3. Sem sessao valida, retornam `401`.
4. Com sessao `ADMIN` ou `MANAGER`, executam consulta ou criacao com validacao Zod.

Arquivos:

- `src/features/auth/permissions.ts`
- `src/app/api/produtos/route.ts`
- `src/app/api/ofertas/route.ts`
- `src/app/api/clientes/route.ts`
- `src/app/api/cupons/route.ts`
- `src/app/api/roleta/route.ts`
- `src/app/api/cashback/route.ts`
- `src/app/api/whatsapp/route.ts`
- `src/app/api/admin/api-senhas/route.ts`

## Fluxo Docker/Deploy

1. Criar `.env` a partir de `.env.example`.
2. Build do app.
3. Subir Postgres.
4. Rodar migrations.
5. Rodar seed.
6. Subir app.
7. Validar `/api/health`.
8. Nginx Proxy Manager aponta para `wimifarma-br-app:3000`.

## Regras a Preservar

- Nao prometer compra online.
- Nao prometer disponibilidade sem atendimento.
- Nao abrir APIs administrativas ao publico.
- Nao usar dados reais de clientes.

## Riscos

- Usuario cliente ser redirecionado para area admin por regra incompleta.
- Colaborador acessar rota de administrador se novo modulo for criado sem registrar permissao server-side.
- Segredo administrativo ser exposto em print, log ou resposta de listagem.
- Redefinicao de senha por email parecer ativa antes de haver provedor de email configurado.

## Pendencias

- Implementar envio real de email para redefinicao de senha.
- Implementar CRUD real nos modulos admin.
- Integrar site publico com dados reais do banco.

## Evolucao

Cada novo fluxo importante deve ganhar documentacao propria ou nova secao aqui.
