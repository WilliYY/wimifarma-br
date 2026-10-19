# 76 - App Wimifarma para Android e iOS

Levantamento em 19/10/2026. Escopo confirmado pelo titular: Android na Google Play e iPhone na App Store, com a identidade, os produtos e as funcionalidades do site. Esta entrega documenta necessidades e proposta técnica; não contém aplicativo compilado ou publicado.

## Situação das contas

- Google Play Console conferida no navegador em 19/10: conta pessoal existente, sem primeiro app criado. O painel exige verificar o telefone de contato para concluir a configuração. A ausência de outro aviso na página inicial não comprova aprovação de todas as verificações.
- O titular informou possuir somente a conta Google Developer. Apple Developer ainda precisa ser preparada; não foi consultada uma conta Apple.
- Para um app que trata receitas e outros dados sensíveis, conferir o enquadramento da entidade prestadora e a conta Organização. Não criar uma segunda conta Google automaticamente; verificar a conversão/suporte da existente. Separar CNPJ, representação, licenças da farmácia e D-U-N-S conforme os portais oficiais. Dados pessoais, documentos, chaves e certificados ficam fora do Git.
- Taxas oficiais consultadas: Play Console US$ 25 uma vez para inscrição; Apple Developer US$ 99 por ano, com moeda local quando disponível. A conta Google já existente não implica novo pagamento. Não houve contratação ou pagamento nesta análise. Fontes: [Google inscrição](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en), [Google tipos de conta](https://support.google.com/googleplay/android-developer/answer/13634885?hl=en), [Google verificações](https://support.google.com/googleplay/android-developer/answer/10841920?hl=en), [Apple inscrição](https://developer.apple.com/help/account/membership/program-enrollment/).

O documento [55](55-google-play-documentos-e-app.md) preserva o diagnóstico de 08/10. A conferência acima é a evidência mais recente para a pendência visível; não foram enviados documentos, códigos ou formulários.

## O que significa manter site e app alinhados

| Alteração | Comportamento exigido |
| --- | --- |
| Produto, foto, preço, disponibilidade, oferta e elegibilidade de benefícios | Uma gravação pelo admin; site e app consultam a mesma fonte. Atualizar na próxima consulta/retomada e revalidar no checkout. Atualização instantânea em telas já abertas exigiria um mecanismo adicional. |
| Pedido, pagamento, cashback, WimiCoins e conta | Mesmos registros e serviços no servidor. Aprovação financeira somente pelo gateway; nenhuma segunda carteira ou baixa de estoque no aparelho. |
| Regra comercial | Implementar no servidor e testar consumidores web e móvel. O servidor continua protegendo pedidos de versões antigas do app. |
| Cor, marca, texto e elementos visuais | Compartilhar tokens e conteúdo quando compatível. Componentes HTML/CSS do site não se tornam componentes nativos automaticamente. |
| Nova tela, navegação, permissão ou integração nativa | Implementar e testar nas duas interfaces; gerar versão compatível e passar pela distribuição exigida. Alterar o site não atualiza sozinho um binário instalado. |
| Carrinho entre celular, app e computador | Necessita implementação própria de persistência vinculada à conta e regras de mesclagem. Hoje o site usa armazenamento local por navegador. |

Não haverá cópia periódica de catálogo, conexão direta do celular ao PostgreSQL ou regras comerciais independentes no app.

## Matriz de paridade funcional

| Área | Base atual para reutilizar | Necessidade do app |
| --- | --- | --- |
| Home, ofertas, categorias e busca por nome/EAN | `home-collections`, serviços de catálogo, `/api/produtos/busca` e `/api/ofertas/vitrine` | Contratos públicos paginados para listas, categorias e home; estados de indisponibilidade e atualização. |
| Produto, fotos, preço, quantidade e avaliações | Página `/produto/[slug]`, serviços em `features/products`, API de avaliações | API pública de detalhe completo; preservar classificação, origem e limites de compra, sem revelar custos ou ofertas privadas. |
| Carrinho | `cart-provider.tsx` e `/api/carrinho/revisao` | Estado móvel persistente, revisão canônica e definição de sincronização por cliente. |
| Checkout, entrega/retirada, CEP, frete e cupom | `/api/pedidos`, `/api/cep`, `/api/fretes/cotacao` e serviços de checkout/cupom | Mesmos cálculos no servidor, idempotência e recuperação após falha de conexão ou suspensão. |
| Pix, cartão e dinheiro elegível | `/api/pagamentos/[id]` e integração Mercado Pago | Homologar a apresentação móvel do gateway, parcelas, cópia Pix, retorno do banco e retomada. Dinheiro mantém somente os casos já permitidos. |
| Receita e atendimento assistido | `/api/minha-conta/receitas` e política canônica de compra | Arquivo/câmera com permissão contextual, envio privado e sessão móvel. Preservar as diferenças ORDINARY, ANTIMICROBIAL, CONTROLLED, UNREVIEWED e Farmácia Popular. |
| Login, cadastro e perfil | Auth.js, Google, credenciais e `/api/minha-conta` | Autenticação móvel segura, revogação, retorno de login e ciclo de exclusão de conta. Avaliar Sign in with Apple. |
| Pedidos, saldos e benefícios | APIs `/api/minha-conta/pedidos`, `/cashback` e `/club` | Mesma identidade do cliente e extratos; resgate sempre revalidado pelo servidor. |
| Avise-me | `/api/minha-conta/avisos-estoque` e fila restrita da equipe | Mesma adesão explícita e cancelamento. Push, se adotado, exige transporte e consentimento próprios; não existe disparo automático conectado hoje. |
| Miauby, WhatsApp, contato, delivery e páginas institucionais | APIs/componentes e conteúdo público existentes | Preservar limites da assistente, passagem explícita ao WhatsApp e retorno ao app. Não transmitir receitas ou dados privados em links. |
| Admin | Mesmo painel web, permissões e auditoria | Manter administração central. Preservar o atalho autorizado do site; um painel administrativo nativo completo não é requisito confirmado. |

Funções planejadas ou desativadas no site continuam nesse estado. Não ativar roleta, campanhas, notificações, novas formas de cobrança ou venda de controlados por causa do app.

## Lacunas técnicas comprovadas

- `src/app/api/produtos/route.ts:107` possui GET protegido por permissão; não deve ser aberto para servir o catálogo móvel. Criar contratos públicos específicos que reutilizem os serviços e serializadores seguros.
- Catálogo e detalhe usam serviços/Prisma em componentes de servidor. A conta também carrega perfil e saldos no servidor; as APIs existentes não entregam todos esses contratos para uma interface nativa.
- `src/components/site/cart-provider.tsx` usa `localStorage`. Igualdade de catálogo não significa igualdade dos carrinhos entre instalações.
- O checkout emite cookie de acesso de pagamento `httpOnly` e `sameSite: lax`. O upload de receita exige origem web e sessão. Definir e testar um contrato móvel próprio, sem enfraquecer CSRF/origem do site nem liberar CORS globalmente.
- O login oferece Google e credenciais. Não foi localizado provedor Apple nem fluxo de exclusão nas rotas/componentes de conta examinados; `/api/minha-conta` expõe PATCH. A implementação de exclusão precisa distinguir dados removíveis de registros sujeitos a retenção justificada.
- Não há projeto Android/iOS, manifesto PWA, service worker, associação de domínio com apps ou pipeline de assinatura identificado no repositório. O site usa Next.js com execução no servidor, não uma exportação estática pronta para embutir.

## Proposta de arquitetura

Status: **proposta técnica**, sem pacote ou SDK instalado. A fonte única dos dados e das regras é requisito confirmado; framework e versões ainda precisam de prova de compatibilidade.

Recomenda-se avaliar React Native com Expo para uma única aplicação móvel Android/iOS, no mesmo repositório, consumindo os serviços atuais por APIs de cliente. Preservar o Next.js e o Docker atuais. Adicionar contratos TypeScript, esquemas e tokens compartilhados gradualmente, sem mover todo o site de pasta para começar. Código Prisma, credenciais e lógica privilegiada permanecem exclusivamente no servidor.

Expo suporta workspaces, com custo adicional de configuração. Deve-se evitar duplicações incompatíveis de React/React Native. O SSR do Next.js não executa como tela nativa. Fontes: [monorepos](https://docs.expo.dev/guides/monorepos/), [Next.js e Expo](https://docs.expo.dev/guides/using-nextjs/).

| Alternativa | Vantagem | Limitação para este pedido |
| --- | --- | --- |
| React Native/Expo e backend compartilhado | Uma base móvel para Android/iOS; experiência e integrações nativas | Requer APIs adicionais, telas próprias e disciplina de paridade com o site. Proposta principal. |
| PWA/TWA Android | Reutiliza as telas hospedadas e suas atualizações | TWA não entrega iOS. Caminho complementar, se ainda necessário; não é a solução completa solicitada. [TWA oficial](https://developer.chrome.com/docs/android/trusted-web-activity). |
| Site remoto encapsulado em WebView | Reutilização visual imediata | Exige provar utilidade móvel e validar login, arquivos e pagamento. O `server.url` do Capacitor é destinado a live reload, não a produção. Não adotar esse atalho como arquitetura pronta. [Configuração oficial](https://capacitorjs.com/docs/config). |
| Android e iOS totalmente separados | Controle nativo de cada plataforma | Duas bases móveis além do site; aumenta a manutenção para esta equipe. |

Antes da instalação, registrar versões exatas, licença, mantenedor, advisories, compatibilidade de React/Node/SDKs, lockfile e integridade. Não escolher versões futuras por suposição. Build iOS pode usar macOS local ou serviço de build macOS na nuvem; não é obrigatório comprar um Mac para avaliar a rota EAS. Custos e contas do serviço são uma escolha posterior. [EAS Build](https://docs.expo.dev/build/introduction/), [build iOS](https://docs.expo.dev/build-reference/ios-builds/).

## Exigências de publicação que afetam o produto

- Apple 4.2 exige experiência com utilidade além de um site reempacotado. Framework algum garante aprovação. Compras completas, acompanhamento, acessibilidade e integrações móveis devem ser demonstrados. [Diretrizes Apple](https://developer.apple.com/app-store/review/guidelines/).
- Apple 4.8 exige alternativa equivalente nos casos aplicáveis de login social; avaliar Sign in with Apple. A criação de conta exige exclusão dentro do app; Google também exige caminho web para solicitação. [Apple](https://developer.apple.com/app-store/review/guidelines/), [Google exclusão](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en).
- Bens físicos podem manter gateway externo, conforme Apple 3.1.3(e) e política Google. Homologar a integração móvel; não pressupor que o Brick web é um SDK nativo compatível. [Apple](https://developer.apple.com/app-store/review/guidelines/), [Google pagamentos](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en).
- Apple 1.4.3 contempla farmácias licenciadas, e 5.1.1(ix) trata da entidade responsável por serviços sensíveis. Isso não amplia permissões comerciais brasileiras. Preservar [45](45-pedido-online-e-conferencia-de-receita.md) e [71](71-inventario-completo-e-receitas.md). [Apple](https://developer.apple.com/app-store/review/guidelines/).
- Google proíbe facilitar medicamentos sujeitos a receita sem receita. O fluxo ORDINARY atual permite pagar antes da conferência farmacêutica; sua adequação à distribuição nas lojas precisa de análise específica, sem afirmar aprovação ou reprovação automática. Não modificar essa regra silenciosamente. [Política de saúde Google](https://support.google.com/googleplay/android-developer/answer/16679511?hl=en).
- Preparar privacidade, retenção, Data safety/App Privacy, declaração de saúde aplicável, público/classificação, suporte, conta sintética de revisão e materiais reais do app. Conferir também avaliações/conteúdo de usuários e as políticas aplicáveis à assistente de IA antes do envio. [Google dados](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en).

## Etapas e critérios de aceite

1. **Prova técnica:** fixar versões, validar Android/iOS com consulta pública, login seguro, upload privado e pagamento de teste. Decidir compartilhamento compatível sem alterar o deploy web. Resultado: builds de desenvolvimento e limitações medidas.
2. **Contratos comuns:** APIs públicas/cliente paginadas e versionadas, DTOs seguros, autenticação/revogação móvel, preços e estoque canônicos, ciclo de exclusão e compatibilidade com versões instaladas. Revisão independente e regressões de abuso com dados sintéticos.
3. **Interface completa:** implementar toda a matriz com identidade oficial, navegação móvel, acessibilidade e movimento reduzido. Preservar marca completa e animações aprovadas do site. Validar layouts em Android e iPhone reais.
4. **Integração operacional:** definir carrinho por conta/mesclagem; retomada de pedidos, deep links verificados e consentimentos. Push exige implementação e autorização separadas para a finalidade real; não inscrever clientes automaticamente.
5. **Distribuição:** regularizar contas, escolher identificadores definitivos, guardar assinatura fora do Git, gerar AAB/iOS, executar teste interno/fechado e TestFlight e preparar fichas/capturas. Enviar somente depois de revisão e das confirmações exigidas para contratos/pagamentos. Aprovação e prazo pertencem às lojas.

Para cada funcionalidade futura, avaliar explicitamente site, Android e iOS. Compartilhar contratos/testes de regra; comparar os três resultados com os mesmos dados sintéticos. Usar compatibilidade de API e transição gradual para apps antigos. Código nativo e permissões podem exigir novo binário; atualizações compatíveis também obedecem às regras das lojas. [Compatibilidade Expo](https://docs.expo.dev/eas-update/runtime-versions/).

Aceite mínimo: os mesmos produtos/preços elegíveis aparecem nos três canais após atualização; checkout reconfirma preço/estoque/benefícios; login e saída não vazam sessão; conta A não vê dados de B; receita nunca vira asset público; perda de rede, toque repetido e retorno do banco não duplicam pedido/cobrança; status pago vem do gateway; exclusão e consentimento funcionam; nenhuma tela offline confirma compra ou conserva dados privados indevidamente.

## Verificação deste levantamento

Inspecionados documentação, estrutura Git, rotas, catálogo, autenticação, carrinho, checkout, uploads e estado visível da Play Console. Consultadas fontes oficiais das lojas e dos frameworks. Somente documentação é alterada nesta tarefa; não foram executados testes/build do aplicativo, alterados dados comerciais ou instaladas dependências móveis. Testes de execução e homologação são entregas das etapas acima, não evidência já obtida.
