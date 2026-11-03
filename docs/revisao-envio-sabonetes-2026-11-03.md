# Revisão de envio com medidas estimadas — 03/11/2026

## Resultado verificado

O lojista autorizou estipular medidas e reaproveitar o trabalho existente. A revisão utilizou os perfis estimados, sem converter estimativas em medições ou atribuí-las ao fabricante. Foram habilitados mais 19 sabonetes sólidos, com identidade por SKU/EAN, carga geral e serviços permitidos. O total observado passou de 318 para **337 perfis habilitados**, entre 3.068 produtos ativos.

Esse estado permite consultar frete dos itens habilitados conforme CEP e serviços disponíveis. Não significa aceitação de qualquer mercadoria em todas as modalidades ou cobertura de todos os CEPs. Estoque, oferta, receita e regras de venda continuam sendo avaliados separadamente.

Os 19 itens são dois kits Lux/Nivea, dez apresentações Protex e sete Phebo. Identidades, EANs, perfis anteriores, manifestos e recibos estão no diretório de evidências abaixo. Não foram incluídos líquidos, medicamentos ou os três Oral-B de conteúdo/bateria ainda não confirmados.

## Duas hipóteses corrigidas

Os dois Protex L6P5 tinham hipótese de 220 g e 24 × 15 × 10 cm, inadequada para representar o kit completo. Os perfis passaram a uma hipótese de **1.470 g e 30 × 20 × 15 cm**, considerando seis unidades de 85 g e proteção estimada:

| Produto | EAN normalizado |
| --- | --- |
| Protex Balance Saudável 85 g L6P5 | 07891024035559 |
| Protex Limpeza Profunda 85 g L6P5 | 07891024035511 |

O metadado `ownerPackagingHypothesis` registra explicitamente que caixa externa, ajuste do conteúdo, proteção e medição física não foram confirmados. O peso total acima não é uma tara medida. Os outros 17 itens conservaram integralmente as hipóteses físicas anteriores. Todos os 19 continuam com `measurementBasis:estimated` e `reference:null`.

## Proteções e validação

- Revisão independente dos 19 planos e das duas correções, antes da aplicação.
- Ensaio transacional real com rollback das duas correções, sem alteração persistente nessa etapa.
- Aplicação com ADMIN ativo, lock do catálogo, identidade e revisão esperadas, CAS e auditoria; duas auditorias de correção e 19 de revisão.
- Preflight e aplicação do revisor estrito para os 19 itens, com hashes vinculados aos snapshots atuais.
- Conferência posterior: campos fora de `shippingProfile`/`updatedAt`, ofertas, configuração de integração e política de frete preservados. Política na revisão 8; MD5 da configuração `bb6c3d9e22ab9059b0405866616d5399`.
- Três consultas públicas retornaram HTTP 200, `available` e sete modalidades: Phebo Amazonian 90 g e os dois kits Protex corrigidos. Não foi criado pedido, pagamento ou etiqueta.

Não houve alteração de código ou nova publicação APP nesta operação de dados. APP, PostgreSQL e checkout do servidor permaneceram iguais aos snapshots anteriores; o checkout era `cec463a50db0cd319268ac18c1346eb88e0d5a5a`. O helper temporário foi removido do APP e os recibos foram preservados.

## Pendências reais

No snapshot de conferência, 2.731 perfis continuam pendentes: 1.269 medicamentos com aceite condicionado, 244 líquidos com condições pendentes, três Oral-B sem confirmação de conteúdo/bateria e 1.215 itens cuja carga/serviços ainda exigem revisão por apresentação. Todos já têm hipótese dimensional; preencher ou estipular medidas não constitui essa revisão de transporte.

O Imosec permanece com hipótese desativada, sem serviços aprovados, receita `UNREVIEWED` e estoque zero. A revisão não cria estoque ou oferta nem libera itens em “Avise-me”. As condições específicas de medicamentos, perfumes, aerossóis e demais cargas permanecem nas políticas existentes. Referência: [guia oficial de mercadorias do Melhor Envio](https://centraldeajuda.melhorenvio.com.br/hc/pt-br/articles/31220391789332-Guia-de-produtos-que-podem-ou-n%C3%A3o-ser-enviados-pelo-Melhor-Envio).

## Triagem adicional somente local

A conferência complementar encontrou outros 23 sólidos candidatos, registrados em `triagem-adicional-nao-aplicada.json`. Dezessete passaram no preflight do helper existente; seis absorventes secos foram bloqueados exclusivamente pelo detector textual de perfume, inclusive apresentações chamadas “sem perfume”. Esses planos não foram aplicados em produção e não integram os 337 habilitados. Exigem snapshots novos e janela coordenada antes de qualquer aplicação. Nenhuma guarda foi contornada e nenhuma concessão externa foi restaurada ou revogada.

O detector duplicado no revisor e em `permittedShippingServices` foi corrigido localmente por uma função compartilhada, `hasPerfumeShippingCargo`, em `eligibility.ts`. A exceção exige apresentação explícita de absorvente, contagem em unidades e qualificador com/sem perfume; apresentações líquidas, spray, ambíguas e outros indicadores de perfume continuam restritos. Carga `perfume` explicitamente existente no perfil não é retirada pela exceção.

As regressões demonstraram primeiro a recusa textual no revisor e depois a exclusão indevida do serviço 1 na elegibilidade. A revisão independente exigiu veto também a elétrica/bateria/pilha/recarregável e umedecido/umidificado no caminho público, além da tipagem explícita da fixture HYGIENE. Os ajustes foram feitos e receberam aprovação final, sem achados remanescentes. Os testes focais de revisor, elegibilidade e CLI passaram (27/27), assim como ESLint dos quatro arquivos e `git diff --check`.

O módulo final corrigido foi compilado em memória e aceitou os 23 planos reais do snapshot sem acesso ao banco. A prova final é `triagem-adicional-final-nao-aplicada.json`, com os hashes dos quatro arquivos revisados. Os dois JSON de triagem anteriores preservam estados intermediários; não representam o código final. Isso é validação local de código e planos, sem comprovar publicação APP ou aplicação desses 23 perfis.

Com o código final aprovado, `npm.cmd run test:security` passou: **557 testes, 557 aprovados, zero falhas/cancelamentos/ignorados, código 0**. O comando rodou pelo executor `task_cleanup` no escopo da tarefa. Recibo e log em `source-fix-gates.json` e `security-final.log`. O rerun global de tipos após a fixture corrigida também passou, conforme recibo do chat 9 em `typecheck-and-coordination.json`. Não se atribuem a esta alteração os testes globais anteriores à correção.

Posteriormente, o chat 9 autorizou somente o commit local dos quatro arquivos de shipping e deste documento, sobre `c360ba86274b5b1667e0967edaf3fc2f78ab1574`. Os hashes dos quatro arquivos foram novamente conferidos contra a prova final aprovada. Push, pull no servidor, publicação APP e novas escritas DB continuam suspensos; o coordenador informou outra janela ativa do chat 13. O novo SHA combinado será entregue ao chat 9 para congelamento e validação da futura publicação. Os 23 planos adicionais permanecem sem aplicação.

## Coordenação e evidências

Durante a última leitura de preservação, o canônico de outro lote mudou externamente de `569f9dea7e7a0baa3b0befdb127c527933097f7d5800325b9f12d51511d9931a` para `2766b9c377c0de50fed0113548788780c0ec98c8d2043fffd6de5f8cb5e162c5`, em fase `granted`. Esta operação não gravou o canônico. A divergência foi informada aos chats 9 e 10, com encerramento das nossas escritas produtivas e solicitação de revalidação dos bindings pelo proprietário do lote seguinte. Nenhuma restauração ou reaplicação foi feita.

Evidências duráveis em `D:/Codex-outputs/wimifarma-br/revisao-sabonetes-2026-11-03-01a19a02/`: `before.json`, `plans.json`, `rollback-proof.json`, `manifest.json`, `apply-proof.json`, `public-checks.json`, `resumo-atualizado.json` e `conferencia-produtos-atualizada.csv` (3.068 identidades). O relatório inicial permanece em `D:/Codex-outputs/wimifarma-br/confirmacao-envio-2026-11-03-01a19a02/`; seus números de 318 habilitados são anteriores a esta aplicação.

Hash do SQL das duas correções: `e6729291e1675d2f1bb004c413470dc3f3fe2369e10fd5def610b941d88844c2`. Hash do plano aplicado pelo revisor: `0bf88ab88349b6197cac5389539d7bf17b18795aa856ee2ff172d599147e70e8`. Os arquivos são recibos da operação concluída, não instruções para reaplicá-la.

## Publicação do código — 03/11/2026

Os helpers desta revisão foram publicados com a fonte APP `f9abb42ac9bb9d7171ca1499acceb5fe97ed018f` e imagem `sha256:d6ebd114354d2dc1609f6762c8cc87caf45b4bf89b8607163551cef39521684b`, após revisão independente, 557 testes de segurança na fonte consolidada, build Linux e verificação do app/ambiente/PostgreSQL. A publicação da fonte não aplicou os 23 planos adicionais nem validou novas medições, estoque ou serviços. Esses planos permanecem sem aplicação e exigem conferência própria com o novo baseline.
