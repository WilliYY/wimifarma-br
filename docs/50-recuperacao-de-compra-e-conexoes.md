# 50 - Recuperação de compra e conexões externas

## Mudanças em 07/10/2026

- Uma falha na consulta inicial do pagamento agora mostra **Tentar consultar novamente**. A ação consulta o mesmo pedido por GET, sem criar pedido, gerar outra cobrança, apagar a referência local ou estender o vencimento do Pix. Estados incertos continuam exigindo reconciliação; não migrar uma tentativa incerta para outro gateway.
- O carrinho oferece **Consultar dados atuais**. Preço, estoque e disponibilidade vêm do banco, e a proposta mostra valores e quantidades anteriores e novos antes de **Aplicar atualização**. O cliente pode manter o carrinho. Produtos indisponíveis, sem estoque ou de atendimento assistido têm remoção proposta explicitamente; nada é removido silenciosamente.
- Uma mudança de quantidade, remoção ou inclusão durante a consulta invalida a proposta, inclusive quando os valores retornam ao estado anterior. O provedor do carrinho também confere a referência do estado ao aplicar. Quantidade nunca aumenta automaticamente e respeita estoque e limite de 20 unidades.
- E-mail é obrigatório apenas para Pix/cartão online. Dinheiro elegível pode prosseguir sem e-mail; um e-mail informado continua sujeito à validação existente.

## API e segurança

`POST /api/carrinho/revisao` aceita apenas `{ productIds: string[] }`, com 1–30 IDs distintos, corpo máximo de 4096 bytes, JSON e origem válida. Limite de 15 consultas por minuto/IP e resposta `private, no-store`. É uma leitura de produtos ativos e não excluídos, restrita a campos públicos; não recebe preço do cliente, não reserva estoque e não grava produtos ou pedidos. Erros internos são sanitizados.

Preço, estoque, reserva, propriedade do pedido, homologação e confirmação exclusiva pelo gateway continuam no servidor. A atualização do carrinho não libera controlados, classificação pendente ou Farmácia Popular. As bolhas originais do rodapé e os demais padrões visuais não foram alterados.

## Validação

- `npm.cmd test`: **203 testes aprovados**.
- `npm.cmd run test:security`: **109 testes aprovados**, incluindo recuperação GET, carrinho alterado durante consulta, origens externas, corpo excessivo, rate limit e erro de banco sem exposição de detalhes.
- Revisão independente dos nove arquivos de implementação/teste: nenhum bloqueador; 11 regressões focadas aprovadas.
- `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run build`, `npm.cmd run prisma:validate` e `git diff --check`: aprovados.
- Auditoria de produção: zero vulnerabilidades. Auditoria completa mantém cinco alertas high na cadeia de desenvolvimento: `@next/eslint-plugin-next`, `eslint-config-next`, `fast-glob`, `micromatch` e `braces`. Não houve troca de dependências nem ocultação desses alertas.
- Prévia no navegador com dados sintéticos: consulta de pagamento falha e recupera o mesmo pedido; dinheiro permite e-mail vazio; carrinho apresenta a proposta de preço/quantidade antes de aplicar. Pedidos, cobranças e envios externos bloqueados nessa prévia. Esses ensaios não comprovam recebimento produtivo nem homologação Asaas.

## Conexões externas

O titular criou a chave Asaas. Após recuperar o controle da aba em 07/10, a credencial foi transferida diretamente para **Pagamentos → Conectar consulta de tarifas Asaas**, e o painel confirmou resposta válida e persistência após recarregar. A simulação de R$100 em cartão 1x mostrou R$3,48 de custo padrão conservador, R$96,52 líquidos e 32 dias para o primeiro recebimento. A chave não foi transcrita, armazenada em documentação ou versionada. Em 08/10, a auditoria confirmou duas revisões automáticas com intervalo de seis horas.

O titular concluiu a conta Sandbox e autorizou chave temporária sem saques, guardada cifrada no cofre separado. O novo bloco ADMIN de validação consulta apenas a API Sandbox sem substituir a produção. Ensaios posteriores no provedor criaram QR Pix fictício e confirmaram cartão fictício por tela/API; não criaram pedidos ou mensagens da Wimifarma. Recebimento Pix, webhooks, recusas/estornos e ativação do gateway continuam pendentes. Detalhes e limites em [40-asaas-configuracao-e-homologacao.md](40-asaas-configuracao-e-homologacao.md).

O Reclame AQUI validou o e-mail da contabilidade vinculado ao CNPJ, e o titular concluiu a senha e a criação do acesso. O painel empresarial abriu no plano **Gratuito** para a razão social conferida. O teste de plano pago e a oferta posterior de assinatura não foram contratados.

A pedido do titular, foi enviado convite de administrador para seu e-mail pessoal autorizado. Após a conclusão pelo titular, **Gestão de usuários** confirmou esse acesso como **Ativado**. Em seguida, o titular determinou que somente ele tivesse administração total no Reclame AQUI. O login pessoal foi confirmado antes de desativar o acesso da contabilidade. A interface confirmou a perda de acesso desse usuário e passou a mostrar **um administrador ativo**, exclusivamente o titular. O cadastro anterior permanece desativado e recuperável, sem exclusão definitiva. Nenhuma senha foi alterada pelo agente. O convite já consumido não foi reenviado. Senhas, códigos, links de convite e capturas privadas não são versionados.

A descrição factual da Wimifarma foi enviada e aparece **Aguardando aprovação**. A alteração do site oficial exige confirmação pelo link enviado ao e-mail validado da empresa. A logo completa foi preparada em PNG, mas o upload ficou bloqueado pela permissão de acesso a arquivos da extensão Chrome. Essas etapas permanecem pendentes. O acesso empresarial ativo não comprova URL pública publicada, RA Verificada ou RA1000; nenhum selo foi acrescentado ao site.

## Arquivos e operação

Implementação em `src/components/site/{cart-page,cart-provider,checkout-page,online-payment}.tsx`, `src/features/products/cart-review.ts`, `src/features/payments/client-recovery.ts` e `src/app/api/carrinho/revisao/route.ts`, com testes correspondentes. `package.json` inclui `test:cart` e as regressões do carrinho em `test:security`. Documentação atualizada em README, histórico de decisões e documentos 40/46/50.

Publicação de código: **`ff9db6e` — `fix(checkout): recover payment views and review stale carts`**, enviado ao GitHub e aplicado por `git pull --ff-only` em `/home/ubuntu/projetos/wimifarma-br`. Rebuild/recriação somente do app, sem migração ou alteração de dados comerciais.

- Imagem publicada: `sha256:9e23442cb315c67b6e45f67e774a74584ecc10dc198e95469b740cf02a5bee9b`.
- Container `wimifarma-br-app`: **healthy**, zero reinícios na conferência.
- `/api/health`, `/carrinho`, `/checkout` e `/privacidade`: HTTP 200, com CSP e HSTS.
- API de revisão com ID sintético inexistente: mesma origem retornou HTTP 200 com lista vazia e `Cache-Control: private, no-store`; origem externa retornou HTTP 403. Nenhum produto ou pedido foi gravado.
- Rollback preservado em `wimifarma-br-recovery-rollback:ff9db6e`, imagem anterior `sha256:8d8905190a4361fd315f1a49f887ecca4a2d1ea80f213ad98ef462a6e48a3b0f`.

A continuação anterior do cadastro Reclame AQUI alterou somente documentação. A nova validação administrativa Sandbox descrita no documento 40 exige build/publicação próprios. A conexão de tarifas Asaas está salva; a integração produtiva de cobrança ainda exige homologação própria. O checkout permanece Mercado Pago.
