# Wimifarma BR

Rodapé público com efeito original de bolhas preservado, identidade oficial, informações empresariais, contato, compra e privacidade: [docs/47-rodape-e-confianca-visual.md](docs/47-rodape-e-confianca-visual.md). Selos externos aparecem somente depois de aprovados.

Cadastro reúne identificação, descrição/SEO e logística com um assistente único: [docs/48-cadastro-unificado.md](docs/48-cadastro-unificado.md). Pagamento reutiliza a mesma classificação de receita do checkout; receita comum revisada permite Pix/cartão, mantendo a conferência farmacêutica antes da dispensação.

Entrega de 07/10/2026, com conferência produtiva, testes, cotações reais e limites de homologação: [docs/49-validacao-checkout-cadastro-e-frete.md](docs/49-validacao-checkout-cadastro-e-frete.md). Controles de receita retirados da tela; classificações existentes preservadas.

Recuperação de consultas de pagamento, revisão explícita do carrinho e andamento das conexões Asaas/Reclame AQUI: [docs/50-recuperacao-de-compra-e-conexoes.md](docs/50-recuperacao-de-compra-e-conexoes.md).

Cadastros de reputação e presença: [docs/46-cadastros-reputacao-e-presenca.md](docs/46-cadastros-reputacao-e-presenca.md). Search Console HTTPS verificado e sitemap processado, com 15 páginas encontradas. Solicitações Google e Ebit enviadas; Perfil da Empresa aguarda proprietário até 09/10. Reclame AQUI empresarial gratuito ativo, com login pessoal confirmado e somente o titular como administrador ativo; acesso da contabilidade desativado. Descrição, confirmação do site, logo e URL pública ainda pendentes. Nenhum selo concedido.

Pedido online de medicamentos de receita comum, sem upload no checkout, com conferência farmacêutica antes da dispensação: [docs/45-pedido-online-e-conferencia-de-receita.md](docs/45-pedido-online-e-conferencia-de-receita.md). Classificação exclusiva de ADMIN, sem decisão automática da IA; controlados e Farmácia Popular seguem atendimento assistido.

Ecossistema de envio, integração Asaas sem mensalidade, limites do roteamento de custos e cadastros Google/Bing/Reclame AQUI/Ebit: [docs/44-ecossistema-frete-pagamentos-e-presenca.md](docs/44-ecossistema-frete-pagamentos-e-presenca.md). Em 07/10 o titular criou a chave Asaas; conexão segura e homologação seguem pendentes. O segundo gateway ainda não foi ativado. Estado atual em [docs/40-asaas-configuracao-e-homologacao.md](docs/40-asaas-configuracao-e-homologacao.md).

Segurança: revisão padrão em [SECURITY.md](SECURITY.md), suite `npm run test:security` e CI de push/PR/semanal com auditoria de produção. Correções e limites em [docs/42-revisao-de-seguranca.md](docs/42-revisao-de-seguranca.md). A atualização exige nova entrada para sessões antigas, sem alterar contas/senhas.

Pesquisa atual de painel próprio de e-mails, provedores sem mensalidade, outros gateways e selos reais em [docs/41-emails-pagamentos-e-confianca.md](docs/41-emails-pagamentos-e-confianca.md). E-mails e novos gateways não foram ativados por essa pesquisa.

Frete: cotação automática após CEP completo, cancelamento de respostas antigas e repetição explícita. Referências em [docs/39-frete-automatico-e-embalagens.md](docs/39-frete-automatico-e-embalagens.md). O lojista autorizou estimativas operacionais para três produtos, com caixa média de 20 cm e origem dos dados explícita; valores, limites e validação em [docs/43-frete-estimado-e-validacao-asaas.md](docs/43-frete-estimado-e-validacao-asaas.md). Dados comerciais em rascunho não liberam o transporte automaticamente.

IA do cadastro: fatos exatos primeiro; dados ausentes podem receber faixa estimada por embalagem comparável com fonte e margem, preenchendo apenas rascunhos vazios. Contrato em [docs/29-cadastro-logistica-ia.md](docs/29-cadastro-logistica-ia.md). Asaas: conta aprovada, tarifas administrativas registradas e chave API criada pelo titular; conexão segura e homologação pendentes. Configuração e próximos testes em [docs/40-asaas-configuracao-e-homologacao.md](docs/40-asaas-configuracao-e-homologacao.md).

Operação comercial: comparador de tarifas ADMIN sem mudar o gateway do checkout ([contrato](docs/38-politica-de-taxas.md)), prévia canônica Miauby/e-mail ainda sem envio ao cliente ([mensagens](docs/37-mensagens-clientes.md)), ranking por mês e histórico individual ([acessos](docs/17-usuarios-e-acessos.md)). Testes adicionais: `npm run test:commerce` e `npm run test:payments`.

Cashback por produto: configuracao ADMIN, percentual inicial de 2%, valores na vitrine e saldo/pendencias do cliente. Regras em [docs/15-cashback-produtos.md](docs/15-cashback-produtos.md). Bonus de 1% pela primeira avaliacao de cada produto e uso do saldo como desconto: [docs/16-cashback-avaliacoes-resgate.md](docs/16-cashback-avaliacoes-resgate.md).

Plataforma comercial da Wimifarma, farmacia em Ivate-PR. O projeto nao e WordPress, nao depende de HostGator e nao deve ser misturado com Candy English.

## Objetivo

Criar uma base moderna e evolutiva para site publico, ofertas, catalogo, atendimento via WhatsApp, login, painel administrativo, APIs internas, banco de dados e modulos futuros como cupons, roleta promocional controlada e cashback.

O sistema possui carrinho e checkout, entrega local ou retirada e atendimento humano. Mercado Pago / Orders e Bricks permite Pix e cartão na finalização após homologação e ativação; inicia desativado. Dados de cartão ficam nos campos seguros do provedor. Contrato em [docs/28-mercado-pago.md](docs/28-mercado-pago.md).

Estado operacional: Mercado Pago conectado e pagamento público ativado. Compra real do lojista com cartão consta aprovada; tentativas anteriores de Pix falharam no processamento. O titular cadastrou a chave Pix; uma nova geração precisa confirmar o QR em produção. Melhor Envio conectado com cotação nacional ativada. Em 06/10/2026, o lojista autorizou pesos estimados de volumes prontos; perfis e cotações reais ficam registrados no documento 43. Receita comum pode usar checkout após classificação administrativa; a conferência farmacêutica ocorre antes da dispensação. Asaas Básico não exige mensalidade; o titular criou a chave API em 07/10, mas a conexão segura e a cobrança homologada por esse provedor ainda estão pendentes.

Checkout e pedidos receberam revisão visual; pesquisa da IA reutiliza resultados por identidade exata e mantém medidas sem referência vazias. Comparação de e-mails gratuitos/pré-pagos e bases logísticas em [docs/35-referencias-catalogo-e-emails.md](docs/35-referencias-catalogo-e-emails.md). E-mails ainda não estão conectados nem enviando.

## Stack

- Next.js 15 com App Router
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
- TanStack Table, Recharts, date-fns
- bcryptjs, lucide-react, sonner, sharp, qrcode

## Status Atual

- Checkout em uma pagina responsiva: Pix por duas horas, cartao com parcelas reais do Mercado Pago (conta configurada ate 3x sem juros), telefone com +55 e dinheiro somente retirada/entrega local. Frete gratis acima de R$ 99,90 apos cashback tambem para outras cidades elegiveis; cotacao nacional ainda depende de embalagens reais. Guia: [docs/32-checkout-e-confianca.md](docs/32-checkout-e-confianca.md).
- Visitantes unicos por navegador persistente, com F5/abas contabilizados como visualizacoes. Contrato e privacidade: [docs/31-visitas-do-site.md](docs/31-visitas-do-site.md).

- Miauby: alertas de carrinho, pedido e pagamento confirmado por WhatsApp através de ponte restrita com o canal existente. Painel e histórico exclusivos de ADMIN em `/admin/miauby`; configuração e limites em [docs/30-miauby-whatsapp-comercio.md](docs/30-miauby-whatsapp-comercio.md).

- Cadastro assistido pesquisa peso bruto e dimensões da apresentação exata e preenche os campos vazios junto dos dados de catálogo/SEO quando a identidade tem alta confiança. Preserva valores manuais, exibe fontes e salva medidas como rascunho para revisão no módulo de frete. Não mede por fotografia nem confunde conteúdo líquido com peso embalado. Contrato: [docs/29-cadastro-logistica-ia.md](docs/29-cadastro-logistica-ia.md).

- Fretes Melhor Envio: módulo ADMIN `/admin/fretes` com conexão OAuth, simulação e embalagens. Ativação depende de conta autorizada e homologação dos serviços/produtos; não compra etiquetas nem processa pagamentos. Contrato em [docs/27-melhor-envio.md](docs/27-melhor-envio.md).

- Site publico com campanhas de quatro produtos reais por banner (Dove, NIVEA, Rexona, Huggies e Johnson’s), carregamento apenas da campanha ativa e campanha de avaliacao `Sua opinião vale mais`, com bonus explicado separadamente. `Melhores ofertas`, perfumaria, medicamentos publicados e avaliacoes verificadas preservados. Fotos e textos ficam separados no celular. Pagina do produto com zoom, compartilhamento e total por quantidade; validacao em [docs/19-produtos-e-campanhas.md](docs/19-produtos-e-campanhas.md).
- `Produtos / Catalogo` pesquisa nome/EAN com Gemini e preenche campos vazios apenas com identidade e fonte oficial confirmadas. Dados divergentes exigem revisao; ha previa de SEO, status Publicado por padrao e destaque opcional. Contrato e testes em [docs/18-cadastro-inteligente-e-fotos.md](docs/18-cadastro-inteligente-e-fotos.md).
- Assistente atende tambem perfumaria, higiene e alimentos/chocolates. Ao enviar foto, analisa a embalagem, busca fotos reais e permite criar artes de estudio/editoriais para escolher uma capa, sem publicacao automatica. Fluxo, limites e testes em [docs/20-assistente-catalogo-e-imagens.md](docs/20-assistente-catalogo-e-imagens.md).
- A Miauby abre uma conversa responsiva no site, usa Gemini com historico curto e contexto do catalogo publicado, mostra produtos relacionados e encaminha confirmacoes comerciais ou clinicas para a equipe.
- WhatsApp principal: `+55 44 98413-4971`, com mensagem padrao para medicamentos e Farmacia Popular.
- Rotas publicas basicas criadas: `/`, `/ofertas`, `/farmacia-popular`, `/delivery`, `/sobre`, `/contato`, `/roleta`, `/login`.
- A rota `/ofertas` continua existindo, mas nao aparece no menu principal enquanto a home estiver focada em anuncio.
- `/roleta` publica redireciona para `/ofertas`; a roleta real fica pendente para fase futura.
- Login/cadastro visual existe em `/login`; Google OAuth identifica clientes e permite acesso administrativo somente com vinculo explicito autorizado, conforme `docs/17-usuarios-e-acessos.md`.
- Quando o cliente esta logado pelo Google, o header publico mostra o nome da conta e o botao `Sair`.
- Login Google cria ou atualiza um registro em `Customer` usando e-mail, nome, foto e identificador Google.
- `Usuarios Wimifarma` em `/admin/usuarios` centraliza hierarquia, ultimo login, bloqueio, perfis e ranking por pedidos concluidos e pagos. Somente ADMIN pode consultar ou alterar acessos.
- `/minha-conta` existe como painel do cliente com dados de usuario e entrega juntos, senha e resumo de cashback.
- Cadastro comum por email, telefone e senha cria `Customer` e entra no painel do cliente.
- Login administrativo usa Auth.js Credentials e direciona para `/admin/dashboard`.
- Painel admin existe como estrutura modular; criacao de ADM/colaborador ja cria acessos reais com email e senha, e outros modulos seguem em evolucao.
- O modulo admin de cupons permite criar, editar, pausar e excluir registros elegiveis, com datas de inicio/fim, limite de uso, busca e filtros. Usos e vinculos com premios sao preservados. Veja `docs/14-cupons-admin.md`.
- `Produtos / Catalogo` permite cadastrar em modal, buscar, classificar, editar e adicionar ou remover produtos de `Melhores ofertas`; fotos podem ser retiradas/trocadas e tratadas antes de salvar. Novos WebP tem ate 1600 px/350 KB e ficam no volume `wimifarma-br-uploads`, servidos dinamicamente para evitar 404 apos upload.
- A busca publica consulta produtos publicados no PostgreSQL por nome, marca, categoria, SKU, EAN, principios ativos e termos de busca; o autocomplete mostra foto e preco, abre `/produto/[slug]` no Enter e apresenta correlatos para consulta, sem tratar correlacao como substituicao automatica.
- Produtos elegiveis podem ser adicionados ao carrinho e enviados pelo checkout em `/checkout`; o servidor recalcula preco, confere estoque e cria um pedido pendente para a equipe acompanhar em `/admin/pedidos`.
- Receita comum classificada permite checkout sem envio de arquivo, com conferência farmacêutica antes da dispensação. Controlados, receita não classificada e Farmácia Popular seguem atendimento pelo WhatsApp. Pix combinado, cartão na entrega e dinheiro continuam preferências do atendimento. Quando habilitado, Mercado Pago oferece pagamento online e confirma o resultado por consulta autenticada; o site não armazena número de cartão ou CVV.
- A politica publica em `/privacidade` descreve dados de conta, pedido, armazenamento local do carrinho e direitos do titular.
- Admin possui o modulo `API e Senhas` para guardar credenciais sensiveis cifradas no banco, restrito a `ADMIN`.
- APIs reservadas existem e exigem sessao `ADMIN` ou `MANAGER`.
- APIs do cofre administrativo exigem sessao `ADMIN`.
- Prisma schema, migration inicial e seed existem.
- Docker Compose oficial usa `wimifarma-br-app` e `wimifarma-br-postgres`.
- O login temporario `adm / adm` foi removido; administradores usam registros reais do banco com senha protegida.

## Instalacao Local

No Windows:

```powershell
cd C:\Projetos\wimifarma-br
npm.cmd install
copy .env.example .env
```

Edite o `.env` local e troque os valores de exemplo. Nunca suba `.env` real para o Git.

## Rodar em Desenvolvimento

Uso recomendado para mexer em layout, telas e componentes:

```powershell
cd C:\Projetos\wimifarma-br
npm.cmd run dev
```

Abra:

```text
http://localhost:3000
```

Observacao: `localhost:3002` pode ser outro projeto local chamado `wimifarma-com`; nao confundir com `wimifarma-br`.

## Rodar com Docker Local

Use Docker quando quiser testar mais perto da producao:

```powershell
cd C:\Projetos\wimifarma-br
docker compose up -d postgres
docker compose --profile tools run --rm migrate
docker compose --profile tools run --rm seed
docker compose up -d app
curl.exe http://127.0.0.1:3001/api/health
```

O app fica em:

```text
http://127.0.0.1:3001
```

## Comandos Principais

```powershell
npm.cmd run dev
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run prisma:validate
npm.cmd run prisma:generate
npm.cmd run prisma:deploy
npm.cmd run prisma:seed
npm.cmd audit --audit-level=moderate
```

Se o `npm audit` falhar por certificado no Windows:

```powershell
$env:NODE_OPTIONS='--use-system-ca'
npm.cmd audit --audit-level=moderate
```

## Estrutura de Pastas

```text
src/app/(site)        Rotas publicas
src/app/admin         Rotas administrativas
src/app/api           APIs internas
src/components/site   Componentes do site publico
src/components/admin  Shell e componentes do painel
src/components/ui     Componentes base
src/components/motion Componentes de animacao
src/features          Schemas e logica por modulo
src/lib               Prisma, env, site config e helpers
src/types             Tipos globais e dominio
src/hooks             Hooks reutilizaveis
prisma                Schema, migration e seed
docs                  Memoria longa do projeto
public                Assets publicos, logo e videos
```

## Variaveis de Ambiente

Base em `.env.example`. Valores reais devem ficar apenas no `.env` local ou no servidor.

| Variavel | Uso |
| --- | --- |
| `APP_HOST_BIND` | Bind da porta local Docker, normalmente `127.0.0.1`. |
| `APP_PORT` | Porta local do app Docker, normalmente `3001`. |
| `NEXTAUTH_URL` | URL publica usada pelo Auth.js. |
| `AUTH_URL` | URL base usada pelo Auth.js. |
| `AUTH_SECRET` | Segredo forte do Auth.js. Obrigatorio em producao. |
| `SECRET_VAULT_KEY` | Chave forte para cifrar o cofre `API e Senhas`. Definir antes de salvar segredos reais. |
| `VISIT_HASH_SALT` | Sal opcional para hash de IP no contador anonimo de visitas. |
| `NODE_OPTIONS` | Limite/ajuste de memoria do Node. |
| `POSTGRES_DB` | Nome do banco. |
| `POSTGRES_USER` | Usuario do banco. |
| `POSTGRES_PASSWORD` | Senha do banco. Nao versionar. |
| `DATABASE_URL` | String de conexao do Prisma. |
| `ADMIN_NAME` | Nome do admin criado pelo seed. |
| `ADMIN_EMAIL` | Email do admin criado pelo seed. |
| `ADMIN_PASSWORD` | Senha inicial do admin. Trocar sempre. |
| `ADMIN_RESET_PASSWORD` | Permite resetar senha via seed quando `true`. |
| `GOOGLE_CLIENT_ID` | OAuth Google para clientes. |
| `GOOGLE_CLIENT_SECRET` | OAuth Google para clientes. |
| `GEMINI_API_KEY` | Gemini server-side para Miauby e sugestoes do catalogo; nunca expor no cliente ou no Git. |
| `GEMINI_MODEL` | Modelo Gemini usado no servidor; padrao `gemini-2.5-flash`. |
| `GEMINI_IMAGE_MODEL` | Modelo para artes solicitadas no cadastro; padrao `gemini-2.5-flash-image`, com a mesma conta Gemini. |

Para Google OAuth de clientes em producao:

- Origem JavaScript autorizada: `https://wimifarma.com.br`
- URI de redirecionamento autorizada: `https://wimifarma.com.br/api/auth/callback/google`

Se um client secret aparecer em print ou conversa, gere um novo no Google Cloud e atualize o `.env` do servidor.

## Docker Oficial

- App: `wimifarma-br-app`
- Postgres: `wimifarma-br-postgres`
- Database: `wimifarma_br`
- User: `wimifarma_user`
- Volume: `wimifarma-br-postgres-data`
- Network: `wimifarma-br-network`
- Porta local: `127.0.0.1:3001:3000`

O PostgreSQL nao deve ter porta publica.

## Deploy Oracle Ubuntu

Pasta recomendada:

```text
/home/ubuntu/projetos/wimifarma-br
```

Primeiro deploy:

```bash
cd /home/ubuntu/projetos
git clone https://github.com/WilliiY/wimifarma-br.git wimifarma-br
cd /home/ubuntu/projetos/wimifarma-br
cp .env.example .env
nano .env
docker compose build
docker compose up -d postgres
docker compose --profile tools run --rm migrate
docker compose --profile tools run --rm seed
docker compose up -d app
curl http://127.0.0.1:3001/api/health
```

Atualizacao:

```bash
cd /home/ubuntu/projetos/wimifarma-br
git pull
docker compose build app
docker compose --profile tools build migrate
docker compose --profile tools run --rm migrate
docker compose up -d app
docker compose ps
curl http://127.0.0.1:3001/api/health
```

## Nginx Proxy Manager

Proxy Host:

```text
Domain Names: wimifarma.com.br, www.wimifarma.com.br
Scheme: http
Forward Hostname/IP: wimifarma-br-app
Forward Port: 3000
Websockets Support: ligado
Block Common Exploits: ligado
SSL: Let's Encrypt
Force SSL: ligado
HTTP/2: ligado
```

Se o Nginx Proxy Manager nao resolver `wimifarma-br-app`, conecte o container dele na rede do projeto:

```bash
docker network connect wimifarma-br-network nginx-proxy-manager-app-1
```

## Documentacao

- `docs/33-emails-clientes.md`: proposta de confirmação de compra, carrinho e novidades; configuração externa e automações ainda pendentes. Prévia com dados fictícios em `docs/email-modelos.html`.

A pasta `docs/` e a memoria longa do projeto. Comece por:

- `docs/00-visao-geral.md`
- `docs/01-arquitetura.md`
- `docs/02-banco-de-dados.md`
- `docs/03-fluxos-do-sistema.md`
- `docs/04-padroes-de-codigo.md`
- `docs/05-comandos.md`
- `docs/06-pendencias.md`
- `docs/07-historico-de-decisoes.md`
- `docs/08-autenticacao-e-permissoes.md`
- `docs/09-deploy-e-ambiente.md`
- `docs/10-layout-e-experiencia.md`
- `docs/11-seguranca-backup-e-recuperacao.md`
- `docs/12-carrinho-checkout-pedidos.md`
- `docs/21-seo-marketing-e-referencias.md`: catalogo indexavel, referencias visuais, cashback decimal e exportacao revisavel para Google.
- `docs/25-seo-automatico-e-lixeira.md`: descoberta automática, feed público, exclusão com restauração por dois meses e animação da marca.
- `docs/26-logo-animada-original.md`: animação original aprovada, transparente e otimizada sem alterar os pixels.

## Cuidados

- Nao versionar `.env` real.
- Nao colocar senha real no repositorio.
- Nao usar dados reais de clientes em seed, teste ou exemplo.
- Nao integrar cobranca online nem coletar dados de cartao sem gateway homologado e decisao registrada.
- Nao misturar este projeto com `candy-english` ou `wimifarma-com`.
- Antes de producao, resolver as pendencias de seguranca em `docs/06-pendencias.md`.
