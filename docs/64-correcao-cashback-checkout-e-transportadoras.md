# 64 - Correções de benefícios, checkout e transportadoras

## Autorização e escopo — 14/10/2026

O lojista autorizou corrigir as falhas da auditoria comercial, verificar as oito transportadoras, incluir somente selos concedidos e ampliar os testes gerais. Não foram autorizadas novas campanhas de benefícios, pagamentos de teste reais, compras de etiquetas ou certificações fictícias.

## Correções

- Cashback e WimiCoins distribuem os centavos restantes do valor líquido entre as unidades antes de aplicar o arredondamento unitário existente. O caso de 20 unidades de R$ 10,25, desconto de R$ 0,01 e benefício de 2% gera 419 centavos/pontos. Não recalcular lançamentos históricos; o bônus de avaliação mantém sua regra própria.
- Checkout e confirmação de pagamento compartilham `cartIdentity`, com os mesmos cinco campos persistidos anteriormente. Pagamento PAID limpa somente um carrinho hidratado e inalterado; mudanças em quantidade, preço, produto ou classificação preservam a cesta.
- A suíte geral revelou outro defeito: alterar a cesta resetava o cashback explicitamente escolhido e mudava seu texto. O cashback passa a acompanhar a identidade da conta, preservando o valor escolhido até o teto atual. Trocar de conta/atualizar saldo limpa a seleção; WimiCoins continuam exigindo nova escolha após alteração da cesta.
- A restrição de medicamentos a PAC/SEDEX considera os marcadores canônicos de receita e Farmácia Popular, além da categoria legada. Receita comum em categoria genérica não contorna a política. Controlados e receita não classificada continuam assistidos.
- Resposta malformada ou erro técnico de frete não se transforma em falta de cobertura. Falhas desconhecidas retornam 502; indisponibilidade reconhecida retorna 503; ausência de cobertura conhecida retorna lista vazia. Tarifas válidas sobrevivem a falhas de outros serviços. Logs registram somente operação, status e categorias fixas, sem corpo, endereço ou credenciais.
- A normalização aceita tanto uma lista quanto o objeto único retornado pelo Melhor Envio para um único serviço.
- Simulação ADMIN consulta o catálogo dinâmico de serviços, valida até 50 IDs inteiros positivos e os envia explicitamente ao cálculo. A consulta sem `services` retornava somente Correios na conta atual; a consulta explícita revelou outras empresas. O guard ADMIN e a seleção de serviços do checkout são preservados.
- `shippingProfile.approvedServiceIds` é uma lista opcional de até 50 IDs inteiros positivos, persistida no JSON existente; não exige migração. Ausência mantém compatibilidade legada, enquanto `[]` bloqueia serviços explicitamente. Perfis novos/revisados no painel iniciam com PAC/SEDEX. Os formulários preservam a lista ao editar, e mudar serviços invalida revisão/liberação até nova aprovação.
- Consulta e finalização aplicam a interseção entre a configuração global e as listas de todos os produtos, mais a restrição de medicamentos. Alterar o perfil invalida a cotação assinada. Antes de ampliar a configuração global, persistir as listas dos quatro produtos existentes; não deixar o modo legado ampliar automaticamente a aceitação.

## Oito transportadoras: evidência real

Consultas autenticadas somente de leitura/cotação na API de produção. Credenciais ficaram no servidor; nenhum token, corpo privado ou dado de cliente foi armazenado no relatório. Origem 87525000; uma caixa de 0,5 kg, C/L 20,8 cm, A 21,6 cm, valor declarado R$ 20. Nenhuma etiqueta, cobrança ou envio foi criado.

O catálogo retornou 15 serviços de oito empresas. Para São Paulo/01001000:

| Empresa | Serviços com preço | Menor preço observado | Limite operacional |
| --- | --- | --- | --- |
| Correios | PAC e SEDEX | R$ 21,70 | Mini Envios recusou as dimensões. Agência em Ivaté. |
| Jadlog | .Package, .Com, .Package Centralizado | R$ 17,65 | Pontos encontrados em Umuarama; depende da operação de postagem. |
| LATAM Cargo | éFácil | R$ 20,92 | Cotação não comprova agência/coleta viável na origem. |
| Azul Cargo Express | Expresso e e-commerce | R$ 22,60 | Cotação não comprova agência/coleta. A documentação da API restringe etiquetas comerciais NFe pela API. |
| Buslog | Nenhum neste trecho | — | Resposta: “Transportadora não atende este trecho.” |
| Loggi | Express | R$ 13,62 | Coleta e Loggi Ponto recusaram este trecho; pontos físicos em Umuarama. |
| J&T Express (JeT na API) | Standard | R$ 15,77 | Pontos encontrados em Umuarama. |
| Total Express | Standard | R$ 21,01 | Ponto encontrado em Umuarama. |

Preços são observações desta encomenda e data, sujeitos a variação. Prazo do provedor recebe o dia útil de preparação configurado no site. O código não aplica corte por menor preço ou quantidade pequena de empresas.

Salvador/40020000: Melhor Envio retornou HTTP 422, erro de `postal_code`, embora o ViaCEP encontre esse CEP. Não atribuir automaticamente o erro ao cliente nem afirmar ausência de cobertura nacional. Uma busca por logradouro público no ViaCEP retornou Salvador/41219620; a cotação desse destino teve preços das mesmas sete empresas. A divergência específica de CEP permanece externa ao cálculo do site.

A API de agências retornou pontos Correios em Ivaté e opções Jadlog, J&T, Loggi e Total Express em Umuarama. A disponibilidade de tarifa não prova que a farmácia fará o deslocamento ou que a transportadora aceita todas as mercadorias. A operação de postagem/coleta deve ser definida antes de liberar essas opções aos clientes. Medicamentos mantêm PAC/SEDEX; líquidos, aerossóis e itens sensíveis exigem aceitação e embalagem apropriadas.

O lojista confirmou nesta conversa que consegue postar em Umuarama. A preparação passa a considerar Correios, Jadlog, J&T, Loggi e Total Express; LATAM/Azul dependem de logística própria ainda não confirmada e Buslog não atende o trecho ensaiado.

O guia oficial de cargas, atualizado em 25/09/2026, proíbe alimentos industrializados na Loggi e exige aprovação na J&T. Alimentos industrializados são aceitos por Jadlog/Total; líquidos na Jadlog exigem homologação de embalagem. Por isso, a ampliação exige uma lista de serviços aprovados por produto, com interseção na cesta. Para o catálogo atual, preparar Kit Kat com PAC/SEDEX, Jadlog .Package/.Com e Total Express; medicamentos e Dove mantêm PAC/SEDEX. Não atribuir ao óleo de banho a aceitação de um cosmético sólido nem inventar homologação de embalagem. .Package Centralizado, apesar de cotar, não integra a primeira liberação: a operação específica desse serviço ainda não foi confirmada.

## Confiança e selos

Página pública do Reclame AQUI confirmada pelo CNPJ 07.676.534/0001-81, com razão social, descrição e site corretos. O rodapé inclui “Nosso perfil no Reclame AQUI” como link institucional, sem representação de certificado. Preservadas as 128 bolhas e a identidade oficial completa.

O perfil continua “não verificada” e “sem reputação definida”; nenhum RA1000 ou RA Verificada concedido. Ebit respondeu em 7/10 que as medalhas estavam temporariamente indisponíveis por atualização. Sem confirmação posterior de concessão/homologação. Nenhum selo dessas entidades, Anvisa ou outro certificador foi inventado ou instalado.

## Verificação e publicação

As reproduções dos defeitos falharam antes das correções e passaram depois. Revisão financeira independente comparou 25.450 casos de rateio com distribuição explícita por unidade, sem divergências. O revisor de frete identificou uma resposta malformada ainda descartada antes da validação; ela recebeu correção e regressão adicionais.

Verificação local final: `npm run test:all` 588/588 e `npm run test:security` 289/289, zero falhas/ignorados; as suítes se sobrepõem. `npm run lint`, `npm run typecheck` e `git diff --check` aprovados. A primeira execução geral revelou a regressão de cashback da cesta, corrigida antes da aprovação; um aviso stderr do npm também exigiu ajustar a coleta pelo executor PowerShell, sem esconder falhas.

Auditoria de produção: zero vulnerabilidades. Auditoria completa: cinco alertas high na cadeia de desenvolvimento ESLint (`@next/eslint-plugin-next`, `eslint-config-next`, `braces`, `fast-glob`, `micromatch`), sem alertas critical e sem mudança de dependências. Não executar upgrade forçado incompatível.

Build de produção local e validação do schema Prisma aprovados. Revisões independentes de comércio e frete aprovadas, incluindo a seleção de cashback preservada e o novo controle por produto.

QA transacional: 21 migrações aplicadas em PostgreSQL 17 descartável, com rede interna exclusiva, sem configuração de gateway ou transporte de mensagens e HTTP externo bloqueado pelo script de auditoria. `npm run audit:club` aprovou sete cenários: banco vazio/proteções, adesão explícita/idempotente e identidade, concessão única sintética, reservas/descontos líquidos combinados/repetição, rejeições com rollback, conclusão/pagamento/avaliação/reembolso uma vez e dois resgates concorrentes do último saldo com um vencedor. Contêiner e rede removidos, com ausência confirmada por label de propriedade. Nenhum saldo de produção foi alterado.

Publicação em 14/10/2026: commits `2bb3c74` (benefícios/carrinho), `0b82544` (fretes e serviços aprovados) e `07f3171` (perfil público/documentação), enviados para `main`. Backup `daily/20261014T133557Z` verificado por checksums, catálogo do dump e leitura do arquivo de uploads. Build de `app`/`migrate` no servidor aprovado; somente `app` recriado, sem migração em produção, seed, alteração de proxy ou reinício do PostgreSQL. Imagem anterior preservada como `wimifarma-br-app:commerce-rollback-20261014`.

App e PostgreSQL saudáveis, zero reinícios. Health, home, catálogo, checkout e login HTTP 200; APIs de frete ADMIN, pagamentos ADMIN, Club da conta e cashback HTTP 401 sem sessão. Uma consulta inicial de saúde usou uma rota Club inexistente (404); a rota real `/api/minha-conta/club` foi localizada no código e confirmou 401. Isso não representou falha da API real.

Configuração produtiva aplicada pelo painel, após salvar as listas dos quatro produtos: revisão 6, serviços globais `[1,2,31,33,4,35,3]` (Correios, Loggi Express, J&T Standard, Jadlog .Com/.Package e Total Express Standard). Produtos: Kit Kat `[1,2,3,4,35]`; Cimegrip, Losartana e Dove `[1,2]`. Loggi/J&T estão preparadas globalmente, sem produto atual autorizado; novas aprovações exigem revisão da carga. Sem liberação de Buslog, LATAM, Azul, Mini Envios ou .Package Centralizado.

Cinco ensaios reais da API pública de cotação retornaram HTTP 200 com opções assinadas: Kit Kat para São Paulo e Salvador com Correios/Jadlog/Total; Cimegrip, Dove e cesta mista Kit Kat+Cimegrip para São Paulo somente com Correios. Valores respeitaram o produto e os volumes; a cesta mista cotou dois volumes. Uma tentativa inicial por endereço HTTP interno foi corretamente rejeitada pela proteção de origem; a validação final usou o endereço HTTPS público e mesma origem, sem alterar a proteção.

Conferência visual no Chrome: nomes e tarifas de sete empresas carregados no simulador, cinco empresas selecionadas na configuração global e link correto do Reclame AQUI no rodapé. Rodapé preserva 128 bolhas e apresentou largura útil/rolável de 375/375 px na inspeção mobile; viewport restaurado. A captura por recorte fora da área visível excedeu o timeout, substituída por capturas normais da tela. Comprovantes em `outputs/correcoes-comerciais-2026-10-14`, fora do Git.

Conferência final: health público HTTP 200 e app/banco saudáveis, zero reinícios. Nos logs recentes, zero ocorrências de TypeError, ReferenceError, erro conhecido Prisma ou rejeição de promise sem tratamento. Uma ocorrência de diagnóstico seguro de serviço de frete veio da consulta administrativa completa, que também recebe serviços recusados; tarifas válidas continuaram disponíveis. A CLI `gh` não está instalada e o conector de status retornou lista vazia para o commit; o resultado do workflow GitHub Actions não foi confirmado por esta consulta. Isso é distinto dos checks locais executados e aprovados.

Para rollback à imagem anterior, reduzir primeiro os serviços globais a PAC/SEDEX: o aplicativo antigo desconhece as listas por produto. Não considerar uma cotação como prova de postagem ou entrega, nem teste sintético como recebimento real de pagamento.

## Fontes oficiais

- [Catálogo de serviços da API](https://docs.melhorenvio.com.br/reference/listar-servicos).
- [Cálculo de fretes](https://docs.melhorenvio.com.br/reference/calculo-de-fretes-por-produtos).
- [Agências e filtros](https://docs.melhorenvio.com.br/reference/listar-agencias-e-opcoes-de-filtro).
- [Oito transportadoras parceiras](https://centraldeajuda.melhorenvio.com.br/hc/pt-br/articles/31220760653588-Quais-s%C3%A3o-as-transportadoras-parceiras-do-Melhor-Envio).
- [Restrições por mercadoria](https://centraldeajuda.melhorenvio.com.br/hc/pt-br/articles/31220391789332-Guia-de-produtos-que-podem-ou-n%C3%A3o-ser-enviados-pelo-Melhor-Envio).
- [Perfil público correto no Reclame AQUI](https://www.reclameaqui.com.br/empresa/w-y-yoshiura-willian-produtos-farmaceuticos-e-perfumaria/).
- [Adesão e homologação Ebit](https://nielseniq.com/global/pt/landing-page/ebit/nielseniq-ebit-brasil/quero-me-tornar-parceiro-colaborador/).
