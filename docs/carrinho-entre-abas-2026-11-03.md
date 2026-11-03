# Carrinho entre abas — 03/11/2026

## Comportamento

Abas da mesma origem compartilham alterações por produto. Adicionar um kit de R$ 11,00 em outra aba preserva o algodão de R$ 5,15 já adicionado: total R$ 16,15. Remover sabonete em uma aba e aumentar algodão para duas unidades em outra mantém somente algodão, total R$ 10,30. Alterar quantidade de um produto removido não o recria.

## Persistência e concorrência

`CartProvider` mantém sua interface pública. O módulo `cart-storage.ts` registra operações imutáveis em chaves `wimifarma-cart-op-v2:<UUID>`. Escritores simultâneos usam chaves diferentes, preservando ambas as operações. Cada operação recebe um relógio lógico maior que todos os registros observados. Empates concorrentes usam a ordem lexical do UUID; todas as abas reconstroem a mesma sequência quando observam os mesmos registros. Quantidade representa o valor solicitado; adições acumulam quantidades, com os limites comerciais existentes. Quantidade não insere produtos ausentes.

Eventos `storage`, foco e retorno à aba provocam leitura das chaves atuais; o conteúdo possivelmente atrasado de `event.newValue` não é aplicado. Cada ação também lê os registros atuais antes de gravar. Eventos entregues durante concorrência podem produzir uma visualização intermediária; a convergência ocorre ao observar os registros persistidos. Isso não representa uma transação linearizável entre todas as abas.

A chave legada `wimifarma-cart-v1` é capturada antes de consultar o bootstrap. A primeira migração preserva uma base validada, sem duplicação de IDs, em `wimifarma-cart-base-v2:<UUID>`. Se hidratações simultâneas produzirem mais de um candidato imutável, todas as abas elegem o menor UUID em ordem lexical e voltam a conferir essa eleição nas sincronizações. Uma base já persistida é reutilizada; alterações posteriores feitas por escritores v1 são ignoradas pelo protocolo novo. Isso evita aplicar operações novamente sobre um snapshot antigo já incrementado. A migração converge entre leitores sem sobrescrever seeds. O novo código não grava snapshots em v1. Registros inválidos são ignorados individualmente. Abas antigas precisam ser recarregadas para participar das novas alterações; suas edições posteriores à migração não são importadas automaticamente.

`clearCart` persiste primeiro uma barreira de limpeza. Somente depois que essa barreira é observada no armazenamento, remove v1, seeds e operações ordenadas antes dela; mantém a própria barreira e todas as operações posteriores na ordem determinística, inclusive as concorrentes ordenadas depois dela. Eventos, recarga e novas leituras repetem essa coleta para registros antigos que chegarem atrasados. Uma falha de gravação da barreira nunca autoriza apagar a cesta persistida. Quantidade/revisão de uma aba obsoleta não restauram o conteúdo anterior. Revisões exigem a fonte vigente na aba e o mesmo conteúdo no replay compartilhado. A identidade da revisão depende da última barreira CLEAR e dos IDs posteriores a ela; não depende de seeds ou operações anteriores já removidos. Assim, a coleta não invalida uma revisão posterior legítima nem restaura seu preço antigo. Preço, imagem pública, regras de receita/assistência, 30 tipos e limite comercial de até 999 unidades continuam nos contratos existentes. O checkout continua revalidando valores e elegibilidade no servidor; o armazenamento do navegador não concede autoridade comercial.

## Limitações e privacidade

O protocolo não exige Web Locks, BroadcastChannel, banco, autenticação ou novos serviços. Exige `localStorage` gravável e UUIDs da API Web Crypto no contexto seguro usado pelo site. Se o navegador bloquear armazenamento ou atingir a quota, o usuário recebe um aviso; as operações continuam na memória dessa aba, sem garantia de sincronização ou sobrevivência à recarga.

Entre limpezas completas da cesta, o journal cresce e pode conservar metadados de produtos removidos individualmente. A barreira CLEAR coleta apenas o histórico anterior; não existe compactação geral por snapshot. Os registros contêm metadados e quantidades de produtos, sem acrescentar campos de identificação, endereço, upload de receita, credenciais ou pagamento. A escolha de medicamentos e seu histórico podem revelar informações sensíveis e permanecem no armazenamento da mesma origem até essa coleta ou remoção dos dados do site pelo navegador. Depois de uma limpeza persistida e coleta bem-sucedida, os namespaces do carrinho não conservam os produtos anteriores à barreira; operações novas posteriores permanecem. Se o navegador impedir a gravação ou a remoção, a coleta não pode ser garantida e o aviso de armazenamento é exibido. Uma futura retenção/compactação entre limpezas precisa ser projetada separadamente.

## Verificação reproduzível

- `node scripts/cart-cross-tab.test.mjs`: empacota o provider real com React, abre duas páginas Chromium no mesmo contexto, usa produtos sintéticos e intercepta APIs; verifica os dois cenários, recarga, eventos atrasados e gravações sobrepostas controladas; um segundo contexto usa três páginas para simular um escritor v1 antigo, uma aba migrada e um leitor tardio com recarga. Um terceiro contexto verifica exclusão do nome de medicamento sintético em todos os namespaces, gravação antiga retida até depois do CLEAR, chegada tardia de v1/seeds e preservação do preço revisado de 100 para 200 após coleta e recarga.
- `node node_modules/tsx/dist/cli.mjs --test src/components/site/cart-storage.test.ts src/features/products/cart-review.test.ts`: verifica empate de relógios, SKUs distintos/iguais, remoção, limpeza, revisão obsoleta, base legada, migrações simultâneas e escritor antigo, limites, registros inválidos e quota.

O teste browser foi executado antes da correção e falhou em R$ 16,15 esperado contra R$ 5,15 observado na primeira aba. Os resultados finais constam no relatório da tarefa. O harness é local, sem banco ou dados de clientes.

Fixtures de catálogo, frete, relacionados, cards, revisão e auditorias leem o resultado por um probe de `useCart` no DOM. `v1` permanece somente como seed para provar a migração, sem espelho atualizado. A fixture de compras insere novos produtos pela operação pública `addProduct`, inclusive depois de uma limpeza. Uma revisão aceita preserva a identidade de `proposal.items` usada pelo aviso da página; o replay rastreia a aceitação do ID da revisão, e coincidência de conteúdo após CLEAR concorrente não é tratada como atualização aplicada.

## Integração e publicação

Scripts dedicados: `npm.cmd run test:cart`, `npm.cmd run test:cart:tabs` e `npm.cmd run test:shopping-context`. A política pública de privacidade informa o histórico local de alterações e distingue a validade do contexto de navegação da permanência de seus registros.

A revisão independente exercitou a migração com escritor legado, coleta após CLEAR, preservação de operações posteriores e aceitação efetiva de revisão. A navegação e o filtro Vitaminas também passaram pela revisão. Segurança: 555 testes aprovados. Auditoria de produção: três alertas baixos e quatro moderados; auditoria completa: três baixos e 17 moderados, sem altos ou críticos. Nenhuma dependência foi acrescentada ou atualizada.

A suíte padrão teve 301 aprovações e um timeout de interface; esse teste passou isoladamente, totalizando 302 casos aprovados entre as duas execuções. A auditoria de interface também reproduziu no HEAD anterior duas falhas existentes: expectativa antiga de “frete grátis aplicado” e sobreposição do banner Pix em 320 px. Esses comportamentos não foram alterados nesta correção; os recibos comparativos permanecem nos artefatos locais da tarefa.

Esta entrega foi publicada após a liberação coordenada e a renovação das guardas, conforme recibo abaixo. Nenhuma escrita em produtos, ofertas, clientes, pedidos, configurações logísticas ou no canônico foi realizada por esta tarefa.

## Publicação verificada — 03/11/2026

Fonte APP `f9abb42ac9bb9d7171ca1499acceb5fe97ed018f`, imagem `sha256:d6ebd114354d2dc1609f6762c8cc87caf45b4bf89b8607163551cef39521684b` em Linux/ARM64. App e PostgreSQL saudáveis; ambiente, contratos de execução e avaliações preservados. A publicação alterou somente o app, sem migrations, SQL de catálogo, pedidos, estoque, preços, configurações ou aprovação logística.

Passaram 131 testes dirigidos, 307 da suíte padrão, 557 de segurança, lint, tipos, Prisma e build Linux. Auditoria de produção: três alertas baixos e quatro moderados; auditoria completa: três baixos e 17 moderados, sem altos ou críticos. Nenhuma dependência foi alterada. As tentativas locais de build na cópia com junction entre C: e D: falharam por resolução de módulos; a compilação efetiva e a imagem publicada foram validadas no Linux.

GETs públicos confirmaram os mesmos cinco resultados principais de dipirona 1 g/1000 mg, quatro de paracetamol 750 mg/0,75 g, dois Protex L6P5 e três Intimus L16P15/Leve 16 unidades Pague 15 unidades. Desloratadina mantém 15 xaropes nos principais com vírgula ou ponto, com os oito relacionados separados. Bepantol Baby mantém os mesmos quatro SKUs, inclusive os lenços, nos três caminhos testados. As fichas mostram Protex 6 × 85 g = 510 g líquidos e Colorama 6 × 8 mL = 48 mL, e as duas rotas Medicamentos divulgam o mesmo título, canonical, endereço social e seleção.

Recebidos os encerramentos de catálogo e renovadas as guardas físicas, a implantação preservou o canônico `7782112b1705d8a3225edda23a2f39b34f54cf9d4aa79ad09bcc57f6fb35c6ae`. Os lotes de dados de outras frentes não foram repetidos. Recibos e logs ficam em `D:/Codex-outputs/wimifarma-br/catalog-dose-pack-brand-seo-2026-11-03/`, incluindo `public-feature-proof.json` e `hotfix/release-proof.json`.
