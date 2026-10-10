# 60 - Correção e revisão de segurança

## Escopo — 10/10/2026

Correções autorizadas após a revisão de permissões, cofre, consumo de IA, leitura de requisições e recuperação financeira. Testes usam dados sintéticos e substitutos de banco/gateways: não geram cobrança, mensagem, etiqueta ou alteração de cliente real. Nenhuma migration, nova dependência ou regra comercial foi introduzida.

## Correções

1. **Criação de administrador:** depois do hash da senha, a transação adquire o mesmo bloqueio de acesso usado pela revogação e confere novamente se o ator continua ADMIN ativo. Criação e auditoria são atômicas. Uma revogação durante o processamento não autoriza a criação posterior.
2. **Cofre:** criar/excluir credencial e gravar sua auditoria agora pertencem à mesma transação; falha de auditoria desfaz a mutação. O POST também utiliza a leitura JSON limitada.
3. **Corpos HTTP:** o leitor compartilhado limita os bytes efetivamente recebidos a 64.000 e o tempo de leitura a 10 segundos, independentemente de `Content-Length`. UTF-8 inválido e conteúdo comprimido são rejeitados. As APIs JSON preservam seu contrato de entrada inválida (`null`, convertido pelas rotas em 400/422). Auth.js recebe os bytes originais em um novo `NextRequest`, preservando URL, cookies e formulário; seu POST retorna 413/408/415 quando aplicável. O GET do Auth.js permanece original.
4. **Uploads:** a autorização ocorre antes da leitura. O corpo multipart inteiro, incluindo campos extras, tem limite de 10 MiB + 64.000 bytes e 30 segundos; o arquivo continua sujeito às validações existentes. O parsing acontece somente depois da leitura limitada.
5. **Asaas:** cancelamento/expiração de sessão e ausência de recurso após a janela de consulta produzem revisão técnica visível. A manutenção consulta somente os motivos técnicos explicitamente permitidos. Uma resposta financeira canônica, vinculada à conta, ambiente e sessão corretos, pode recuperar o estado; consulta vazia não devolve estoque nem repete cobrança. Estorno em andamento e outras revisões financeiras continuam bloqueados, inclusive diante de confirmação atrasada.

## Miauby: correção da conclusão anterior e limites adicionais

O middleware **já limitava a Miauby a 20 consultas por minuto e verificava origem**. A conclusão inicial de ausência de rate limit era ampla demais: o teste isolava o handler e não exercitava o middleware. Esta entrega acrescenta proteção no próprio handler e limita o consumo de inferência.

| Controle adicional | Limite por processo em execução |
| --- | --- |
| Requisições por IP | 10/minuto e 100/hora |
| Requisições globais ao catálogo | 120/minuto |
| Entradas de visitantes mantidas em memória | 2.000; excesso rejeitado |
| Inferências globais | 60/minuto e 500 por janela de 24 horas |
| Inferências simultâneas | 4 |
| Circuito de falha do provedor | 3 falhas, pausa de 60 segundos |

Sem capacidade de inferência, a Miauby usa a resposta local existente. Requisições excessivas recebem 429 e `Retry-After`. A chave por IP pressupõe proxy confiável sobrescrevendo `x-real-ip`; acesso direto ao app não deve ser público.

As cotas são locais ao processo: reinícios zeram contadores e réplicas têm cotas próprias. Não representam limite financeiro durável da conta Gemini. Antes de escalar, usar armazenamento compartilhado e configurar orçamento/cota no provedor. Origem HTTP reduz abuso pelo navegador, mas não autentica um cliente externo.

## Validação e revisão

- Regressões demonstraram falhas antes das correções para revogação durante criação ADMIN, atomicidade do cofre, limites de corpos, consumo da IA, recuperação Asaas e POST excessivo no Auth.js.
- Revisão independente de autenticação/cofre e de pagamentos aprovada. A revisão financeira encontrou uma regressão em confirmação tardia após estorno; a correção inclui quatro sequências sintéticas que preservam a revisão financeira.
- Testes de isolamento entre clientes, webhooks, assinaturas, vinculação financeira, imagens remotas e permissões continuam na suíte. A seleção `test:security` foi ampliada com abuso da Miauby, uploads e leitor HTTP.
- Auditoria npm de produção: zero vulnerabilidades reportadas nesta revisão. Auditoria completa: cinco high, zero critical, na cadeia de desenvolvimento `braces`/`micromatch`/`fast-glob`/ESLint Next já registrada no documento 42. Não aplicar downgrade ou `audit fix --force` para ocultá-las.
- Validação final local: `test:all` com **540/540**, `test:security` com **267/267**, lint, typecheck, Prisma validate e build aprovados. O teste Auth.js também foi executado isoladamente com **2/2**; a primeira tentativa com o runner nativo Node não resolvia `next/server`, e foi substituída pelo runner `tsx` oficial do projeto.

## Publicação e reversão

Publicar somente o serviço `app` do Compose, após `git pull --ff-only` no checkout oficial e preservar uma tag local da imagem anterior. Não há migration nesta entrega. Não recriar Postgres, proxy ou Cockpit. Conferir commit no servidor, saúde/reinícios do container, páginas públicas, APIs privadas sem sessão, GET CSRF e rejeição de corpo excessivo/origem externa; não executar compras ou ataques de carga. Se houver regressão, reimplantar a imagem anterior preservada. A evidência produtiva final deve ser comunicada separadamente: aprovação local e saúde do container não comprovam comportamento financeiro real.

## Limitações e pendências

- A revisão não é perícia de incidente, teste de invasão irrestrito ou garantia de ausência de outras falhas. Não há evidência suficiente para afirmar que houve ou que nunca houve invasão.
- Infraestrutura compartilhada foi inspecionada sem exploração. O titular decidiu manter os painéis e adiar a atualização do proxy em 10/10/2026; essas mudanças não fazem parte desta publicação. Detalhes de acesso e exploração não devem ser publicados.
- Continuam pendentes MFA próprio, orçamento externo durável da IA, limites no proxy antes do buffering, revisão de sistema operacional/backups e remediação compatível dos alertas de desenvolvimento.
- Autenticação Google real, nova cobrança e reembolso real não foram executados como testes de segurança. Preservar homologação e autorização próprias para operações financeiras.

Referências: [OWASP — consumo sem limites em LLMs](https://genai.owasp.org/llmrisk/llm102025-unbounded-consumption/), [Nginx Proxy Manager — versão 2.16.0](https://github.com/NginxProxyManager/nginx-proxy-manager/releases/tag/v2.16.0), [alerta de desenvolvimento braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
