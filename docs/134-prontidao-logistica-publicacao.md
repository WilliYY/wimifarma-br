# 134 — Prontidão logística antes da publicação

## Pedido e limite operacional — 01/11/2026

O lojista solicitou que os produtos novos colocados na loja tenham peso, dimensões e preparo de transporte corretos. O preenchimento estimado do catálogo permanece útil para planejamento, mas não constitui medição do pacote protegido nem confirmação de aceitação pela transportadora.

O fluxo passa a ser **rascunho → conferência ADMIN em Fretes e entregas → publicação**. Esta mudança não desativa os produtos legados nem habilita transportadoras automaticamente. A implantação deve ser registrada separadamente das validações locais.

## Contrato de publicação

- O cadastro geral e novos registros do importador iniciam em `DRAFT`. O cadastro geral continua aceitando somente um rascunho logístico, sem conceder aprovação de transporte.
- A criação ou reativação para `ACTIVE` exige perfil completo, revisão explícita e base `measured` declarada no dado original. O default do parser não substitui essa declaração. Nenhuma estimativa existente é promovida automaticamente a medição.
- Para produtos elegíveis ao envio automático, exigir perfil habilitado, carga informada sem `unspecified` e ao menos um serviço conhecido, aprovado explicitamente e compatível pela política existente.
- Produtos com atendimento assistido continuam protegidos pela elegibilidade do checkout e do transporte. Seus dados físicos também precisam estar revisados para nova publicação, mas a publicação informativa não exige habilitar cotação automática nem transforma produto assistido em venda livre.
- Edição de preço, estoque ou descrição dos ativos atuais permanece possível. Mudança de identidade que já invalida o perfil logístico exige salvar como rascunho antes de voltar a publicar; a normalização existente de identidade é preservada.
- Aplicar o mesmo helper nas rotas de criação/edição, publicação em lote, importação e publicação por fotos, preservando transações, locks e auditoria. A fila de Fretes inclui rascunhos, permitindo concluir o fluxo.

O gate verifica o contrato cadastral. A veracidade da pesagem, o encaixe da proteção, a validade do contrato de transporte e a cobertura de cada CEP continuam fatos operacionais que precisam de evidência; um booleano não os comprova sozinho. Escritas administrativas fora desses fluxos devem respeitar o mesmo contrato, sem presumir proteção por trigger de banco.

## Conferência da base existente

Leitura produtiva em 01/11/2026 encontrou **3.062 ativos**, **3.056 perfis físicos completos e estimados**, **seis incompletos** e **dois anteriormente habilitados**. Nenhum perfil foi marcado como medido nessa consulta. Há **31 produtos com referência de peso bruto da unidade comercial**, **46 com referência de dimensões**, sendo **26 com ambas**. Onze produtos têm referência física de fabricante. Nenhuma `PackagingRecipe` está cadastrada.

Nos produtos com referência comercial aproveitável, a comparação automatizada não encontrou perfil cujo peso fosse menor que o bruto registrado na fonte ou cujo envelope dimensional ordenado fosse menor que a unidade comercial. Esse resultado é uma verificação restrita de coerência; não mede o pacote final, não elimina conflito entre fontes e não valida a geometria da proteção.

Triagem por nome/apresentação, somente para organizar conferência:

| Fila | Produtos |
| --- | ---: |
| Sólidos orais, blister e cartucho | 1.100 |
| Outras apresentações ainda a identificar | 963 |
| Líquidos | 317 |
| Shampoos e condicionadores | 176 |
| Tubos e potes | 173 |
| Cremes dentais | 106 |
| Fraldas | 98 |
| Sabonetes em barra | 67 |
| Aerossóis e sprays a conferir | 62 |

Essas filas não são classes de carga aprovadas, nem autorização para copiar uma massa ou medida para todos os integrantes. Quantidade, material, fechamento, unidade/kit e dimensões comerciais devem ser compatíveis antes de reutilizar uma receita.

## Rota para conferir grupos

1. Medir os lados internos e externos da caixa efetivamente utilizada. A referência nominal do lojista é 24 × 15 × 10 cm; caixas maiores continuam pendentes de confirmação.
2. Pesar a caixa vazia e a proteção efetivamente usada. Registrar material, folga e orientação; papelão ou plástico-bolha internos não têm tara presumida zero.
3. Conferir uma unidade comercial representativa e o pacote completo. Não somar dosagem de princípio ativo como se fosse massa do comprimido; volume em mL também não determina sozinho massa bruta.
4. Para GTINs com fontes comerciais completas, confrontar a unidade atual com o documento e registrar os compatíveis na receita. Para demais variantes, manter estimativas explícitas até conferir apresentação/peso necessários; não preencher `compatibleGtins` apenas por pertencer à mesma marca.
5. Conferir o serviço aprovado para cada carga. O [guia oficial do Melhor Envio](https://centraldeajuda.melhorenvio.com.br/hc/pt-br/articles/31220391789332) mantém categorias proibidas e condicionadas a aprovação/contrato. Dados físicos completos não eliminam essas condições.

O lojista confirmou possuir balança, mas informou não poder pesar as amostras agora e pediu continuidade da pesquisa documental. A coleta segue por GTIN e fontes originais; isso não registra tara ou encaixe da caixa dele como conferidos.

## Exceções preservadas e novo produto

Imosec 12, Clopidogrel/Albendazol/Beneum Teuto e Plax Melancia 500 mL mantêm as contradições e limites documentados em [129](129-hipoteses-por-tipo-de-embalagem.md). Não rejeitar uma fonte conflitante apenas para permitir estimativa.

O sexto incompleto é **Cordarex 5 mg 60 comprimidos, GTIN 07896181927846**, incluído após a conferência anterior. O [portal oficial Aché](https://cuidadospelavida.com.br/medicamentos-participantes/cordarex) confirma 5 mg, 60 comprimidos e EAN 7896181927846. A [Portaria SRE 13/2023 de São Paulo, página 33, item 4506](https://legislacao.fazenda.sp.gov.br/SiteAssets/Paginas/Portaria-SRE-13-de-2023/Portaria%20SRE%2013_2023.pdf) identifica cartucho com blister de alumínio/plástico âmbar. Essas fontes não forneceram massa bruta e medidas comerciais para essa apresentação. Valores de imagem em pixels e dosagem de 5 mg não foram convertidos em medidas/peso do pacote.

Coleta privada, consultas somente de leitura e dados derivados: `outputs/logistica-prontidao-2026-11-01/`. Nenhum perfil, preço, estoque ou serviço foi modificado pela triagem.

Foram capturadas e incorporadas duas novas referências próprias do varejista, com EAN exato, bruto em gramas, uma unidade comercial e eixos nomeados: [Dove Original 90 g](https://www.paodeacucar.com/produto/127976/sabonete-barra-original-dove-90g), GTIN 07898422746759, 101 g e altura/largura/profundidade 5,94/8,3/3,18 cm; [Colgate Tripla Ação Menta 90 g](https://www.paodeacucar.com/produto/152694/creme-dental-colgate-tripla-a%C3%A7%C3%A3o-menta-original-90g), GTIN 07891024132005, 102,2 g e 3,8/16,5/3 cm. Corpos originais, hashes descomprimidos, trechos e schemas estão preservados em `fontes-higiene/`. A operação `evidence-operation-recovery-v2` aplicou somente `SAVE_EVIDENCE_ONLY` em 01/11, após backup e revisão do plano congelado. Referência comercial não se torna medição da unidade atual ou do volume protegido. Dove Karité permanece HOLD porque a unidade da ficha não está documentada.

## Divisão de trabalho e verificação

Chat 14: correção visual do CEP durante carregamento em 320 px e remoção de avisos regulares repetidos na apresentação compacta, preservando benefícios reais e aviso final de recotação. Chat 9: integração, prontidão de publicação, evidências físicas e revisão independente do contrato sensível.

Passaram 52 testes iniciais e 46 após revisão da política, com correção de serviço desconhecido e invalidação de identidade; a revisão independente aprovou o escopo. Foi encontrado e corrigido também o comportamento preexistente que injetava `DRAFT` em edição sem status: o default agora pertence somente à criação, e a edição usa o status efetivo lido sob lock. Trinta regressões finais cobrem parse, rotas e lote; typecheck completo/incremental e ESLint dirigido passaram. Os estados dos ativos não são alterados por omitir status.

Chat 14 entregou 27 testes dirigidos e QA com CSS real em 320/390/1440 px: largura do botão estável, CEP completo, notas comerciais preservadas e um só aviso genérico ao final do resultado compacto. Não houve mutação comercial nas fixtures.

A entrega integrada passou **496 testes de segurança**, sem falhas. Auditoria de produção: três baixos e quatro moderados; completa: três baixos e 17 moderados. Nenhum alto/crítico. Os alertas existentes foram mantidos visíveis, sem atualização de dependências. Logs privados em `validation/` e `validation-final/`.

O chat 10 confirmou que não abriu concessão ou aplicação do lote de 16, suspenderá a aplicação durante a publicação APP e preparará os novos itens em `DRAFT`, sem converter estimativa em medição. Coordenação privada em `chat10-coordenacao.md`. A pedido posterior do lojista, o chat 14 recebeu também a análise e otimização do robô no repositório separado de Cotação; não há integração de bancos ou credenciais entre os projetos.

## Publicação e conferência final — 01/11/2026

O commit `14721f28168488b040518a743bb47590be2303ce` foi construído no Linux e publicado somente no app, com o contrato de prontidão e a correção visual do CEP. O operador independente retornou `VERIFIED_APP_ONLY`; home e saúde HTTP 200, API administrativa de produtos HTTP 401 anônimo. As comparações de `Product`, `SupplierCatalogOffer`, `Offer` e `Order` preservaram os dados comerciais. PostgreSQL não foi recriado; backup custom, TOC e imagem anterior permanecem disponíveis. Recibo privado em `production-app-result.json`.

Na busca pública por Kit Kat, o modal abriu sem navegação. Com viewport de 320 px e fontes reais, o botão manteve 90,828125 px antes/durante carregamento e o campo conservou o CEP 01001-000 completo. A cotação real retornou cinco serviços, de R$ 17,65 a R$ 21,59, sem avisos regulares repetidos e com um aviso final de recotação. Não houve pedido, pagamento ou etiqueta de teste. A política administrativa foi verificada por regressões sintéticas e pela imagem publicada, sem criação de produto na conta produtiva.

A importação documental teve recuperação explícita: o primeiro operador parou por opção incompatível do Compose, e o primeiro apply de recuperação falhou na desserialização de `void` do advisory lock. A reconciliação de leitura confirmou ausência de novas fontes e timestamps preservados; essa tentativa permaneceu consumida. A nova operação reutilizou o helper existente com cast `::text` e a ordem global → usuário → produto. Uma rodada isolada parou por diferença CRLF/LF na config; equivalência com o Git/imagem foi comprovada, sem afrouxar o validador produtivo por bytes.

Antes da aplicação v2, **14 verificações reais no PostgreSQL 17.9 isolado** passaram: reprodução da falha original, CAS com zero linhas e rollback, falhas após importação, commit de duas evidências/auditorias, repetição, revogação de ADMIN e contenção de locks. Os containers/rede descartáveis foram removidos por IDs e labels conferidos. O novo dry-run, backup e plano foram revisados; apply executado uma vez. A leitura independente confirmou duas fontes e duas auditorias novas, perfis/preços/estoque preservados e runtime do app/banco idêntico. Provas privadas em `evidence-operation-recovery-v2/`.

O retrato posterior possui **3.062 ativos, 3.056 perfis físicos estimados completos, seis incompletos e dois envios habilitados**. Agora são **33 produtos com referência de bruto comercial, 48 com medidas comerciais e 28 com ambas**. Nenhum perfil passou a medido ou habilitado por essa importação. Tara, proteção, encaixe e serviços permitidos continuam exigindo conferência; os seis casos incompletos permanecem separados.
