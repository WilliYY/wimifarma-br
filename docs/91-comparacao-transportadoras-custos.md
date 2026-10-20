# 91 — Comparação de transportadoras e custo operacional

## Escopo — 20/10/2026

O ADMIN em `/admin/fretes` compara os serviços do catálogo do Melhor Envio, incluindo os ainda não selecionados. A consulta não compra etiquetas, não agenda coleta e não confirma aceitação física no ponto. Planejar uma rota não ativa o serviço.

A consulta de produção retornou 15 serviços de oito empresas: Correios (1, 2, 17), Jadlog (3, 4, 27), LATAM Cargo (12), Azul Cargo (15, 16), Buslog (22), Loggi (31, 32, 34), J&T (33) e Total Express (35). A configuração existente selecionava sete serviços: 1, 2, 31, 33, 4, 35 e 3. Os locais configurados eram Ivaté para PAC/SEDEX e Umuarama para os demais. Catálogo e configuração não comprovam disponibilidade atual de coleta ou aceitação em cada unidade.

## Custos e desconhecidos

`ShippingIntegration.settings.operationalCosts` é opcional, exclusivo de ADMIN, no JSON com revisão/auditoria existentes, sem migração. Há no máximo um registro por `serviceId`:

- `tripCostCents`: viagem de ida e volta. `parcelsPerTrip`: encomendas reais previstas na viagem, com rateio arredondado para cima em centavos.
- `collectionFeeCents`: coleta adicional por encomenda, cobrada fora da etiqueta.
- `extraInsuranceCents`: seguro externo adicional; o valor segurado da mercadoria não é um prêmio a somar ao frete.
- `returnReserveCents`: provisão interna por encomenda, estimada pela loja a partir dos próprios retornos; não é tarifa obrigatória da transportadora.
- `otherFeesCents`: demais adicionais conhecidos, sem repetir valores incluídos na cotação.
- `routeKey`: vínculo com CEP/cidade/UF de origem e cidade/UF/ponto de postagem. Mudar a rota invalida os valores até nova revisão; a primeira edição na nova rota inicia os demais componentes em branco.

Vazio significa desconhecido; zero precisa ser explícito. A tela mostra **Subtotal conhecido** enquanto houver pendência. Só há **Custo total estimado** com local e todos os componentes válidos. Não foram preenchidas médias inventadas na produção.

Exemplo exclusivamente sintético: etiqueta de R$ 10 + viagem de R$ 60 para uma encomenda custa R$ 70. Etiqueta de R$ 20 sem adicionais custa R$ 20. Se a primeira viagem transportar dez encomendas, o custo por encomenda passa a R$ 16. O rateio depende do volume real da viagem, não da quantidade de itens no carrinho.

**Menor custo entre rotas completas** considera apenas custos completos e carga aceita ou com condições explicitamente revisadas nesta simulação. Opções incompletas não viram gratuitas. O cálculo é interno: não muda `ShippingOption.priceCents`, cobrança ao cliente, frete grátis, Pix, cashback ou WimiCoins.

## Aceitação da carga

O simulador recebe `cargoKinds` e `acceptanceConfirmed`, sem enviá-los como dimensões ao provedor. Carga ausente fica `unspecified`, sem recomendação. Revisão humana não supera proibição. Em cargas mistas prevalece a restrição mais forte.

A matriz em `cargo-policy.ts` segue o [guia oficial do Melhor Envio](https://centraldeajuda.melhorenvio.com.br/hc/pt-br/articles/31220391789332-Guia-de-produtos-que-podem-ou-n%C3%A3o-ser-enviados-pelo-Melhor-Envio), consultado em 20/10/2026, atualizado em 19/10/2026:

| Carga | Tratamento |
| --- | --- |
| Medicamento | Correios, LATAM e Buslog condicionados; demais bloqueados. Jadlog tem conflito tabela/texto: prevalece o texto proibitivo. Checkout mantém a restrição adicional local a PAC/SEDEX, sem liberação automática de LATAM/Buslog. |
| Perfume | Jadlog, Buslog e J&T aceitos por categoria; Total condicionado; demais bloqueados. |
| Aerossol | Jadlog e Buslog aceitos por categoria; Total condicionado; demais bloqueados. |
| Alimento industrializado | Loggi/Buslog bloqueados; J&T condicionado; demais aceitos por categoria. |
| Perecível | Buslog condicionado; Jadlog não comprovado por conflito da fonte; demais bloqueados. |
| Sensível à temperatura | Conservação não comprovada; sem recomendação automática. |
| Líquido | Condicionado à revisão de embalagem/conservação e eventual homologação. |

Aceitação por categoria não comprova todas as condições do produto ou serviço. Não extrapolar contratos diretos dos Correios para o contrato do Melhor Envio. Rever a matriz quando o guia ou o contrato mudar.

`shippingProfile.cargoKinds` guarda características restritivas e sua edição exige nova revisão. O cadastro geral preserva essas características ao invalidar medidas. Classificação estruturada `catalogClassification.kind = MEDICINE`, receita/categoria farmacêutica e nomes explícitos de perfume/aerossol acrescentam restrições no servidor. “Mercadoria geral” não remove essas regras; “Perfumaria” sozinha não significa perfume e “spray” sozinho não comprova aerossol. Perfis antigos preservam a revisão existente, sem classificação fictícia em massa. Produtos sem descrição/classificação suficientes precisam de conferência antes de aprovar.

## Fontes sobre adicionais

- [Cotação por produto](https://docs.melhorenvio.com.br/reference/calculo-de-fretes-por-produtos) e [valor segurado](https://centraldeajuda.melhorenvio.com.br/hc/pt-br/articles/31220417305492-O-que-%C3%A9-Valor-Segurado): não somar o valor da mercadoria como se fosse tarifa de seguro.
- [Postagem e coleta](https://centraldeajuda.melhorenvio.com.br/hc/pt-br/articles/31220745885332-Postagem-e-coleta-com-cada-transportadora): conferir disponibilidade e eventual negociação de coleta; deslocamento próprio é custo da loja.
- [Suspensão e devolução](https://centraldeajuda.melhorenvio.com.br/hc/pt-br/articles/31220455161620-Como-pedir-a-suspens%C3%A3o-de-entrega-e-devolu%C3%A7%C3%A3o-de-um-envio): isenção de tarifa de devolução não significa reembolso da ida ou logística reversa gratuita. Não criar tarifa universal de retorno.
- [Postagem nos Correios](https://centraldeajuda.melhorenvio.com.br/hc/pt-br/articles/31220425804052-Como-realizar-a-postagem-pelos-Correios): conferir unidade de origem e adicionais de objeto não mecanizável.

## Verificação e limites

- Suíte completa: 959/959 testes em 169 arquivos, com paralelismo limitado a quatro; segurança: 420/420. Lint e typecheck aprovados.
- Chromium com o CSS construído da aplicação, em 390 e 1440 px: comparação por custo total, invalidação após mudança de rota, sem erros de página e sem transbordamento horizontal. As cotações/dados dessa prova visual são sintéticos.
- Auditoria de produção: zero vulnerabilidades. Auditoria completa: cinco alertas altos na cadeia de desenvolvimento `braces`/ESLint já existente, sem críticos; nenhuma dependência alterada e sem correção forçada fora do escopo.
- Revisão independente: encontrado marcador `unspecified` sem controle para remoção no editor. Corrigido, com regressão de reclassificação preservando as restrições reais.
- Regressão adicional do rateio: apagar/redigitar a quantidade da viagem preserva os demais valores do rascunho; enquanto inválida, a composição fica pendente. Teste Chromium, lint focado e typecheck final aprovados. Prisma validate e build local aprovados; o build Docker confere a versão publicada.

Arquivos principais: `src/components/admin/shipping-panel.tsx`, `shipping-operational-costs.tsx`, `product-shipping-fields.tsx`; `src/features/shipping/{cargo-policy,carrier-comparison,operational-cost,operational-cost-schema,schema,eligibility,product-draft,rules,service}.ts`; API `src/app/api/admin/fretes/simular/route.ts` e regressões. Documentação relacionada: README, histórico 07, contratos 27 e 65.

Regressões: custo total versus etiqueta, rateio, zero versus desconhecido, mudança de rota, persistência sem ativação, condições/proibições, classificação estruturada de medicamentos e preservação das características. Testes de interface usam dados sintéticos em Chromium, sem pedidos ou etiquetas reais.

Pendências: custo real por viagem, encomendas por viagem, embalagem/proteção, coleta contratada, seguro externo se houver e histórico de devoluções. Sem esses dados, o painel não promete economia ou lucratividade. A comparação por encomenda não substitui a conferência da caixa final nem a análise de margem dos produtos.
