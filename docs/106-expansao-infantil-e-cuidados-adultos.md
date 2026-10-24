# Expansão infantil e cuidados adultos

## Escopo e resultado em 24/10/2026

O lojista solicitou todas as apresentações identificáveis de 25 marcas infantis e de cuidados adultos nas distribuidoras ANB e Profarma, com fotos exatas, sem duplicação e sem compras nas distribuidoras.

A pesquisa produziu 270 GTINs distintos em 17 marcas: 263 candidatos novos e sete registros existentes bloqueados para recriação. São candidatos de identidade, não 270 ofertas disponíveis. Foram publicados e conferidos **20 novos Johnson’s Baby: 16 shampoos e quatro apresentações de lenços/toalhinhas**. Os outros 243 novos permanecem separados pelas pendências abaixo. Os nove produtos Hidraderm/Dorflex da entrega anterior, assim como inclusões de outras frentes, não integram esses 20.

As apresentações incluídas abrangem Regular, Cachos dos Sonhos, Cabelos Claros, Blackinho Poderoso, Gold, Cheirinho Prolongado, Gotas de Brilho e lenços Hora do Sono, Recém-Nascido e Proteção da Pele. Cada volume, refil e quantidade corresponde ao GTIN e à foto revisados. Para o EAN 07891010875657, o nome público Cachos dos Sonhos 400 ml foi confirmado pela apresentação atual e pelo fabricante; a descrição bruta antiga permanece na evidência privada.

## Regras preservadas e pendências

- Aplicou-se somente a regra comercial já autorizada em 21/10/2026: acréscimo de 35% sobre o custo final para os novos shampoos e lenços Johnson’s Baby. ST informado integra o custo uma única vez. Acréscimo sobre custo não equivale a margem líquida.
- As vinte ofertas selecionadas foram ANB, com preço, disponibilidade, condições e datas reais preservados. A elegibilidade de higiene com ST desconhecido na Profarma segue o contrato específico de `docs/78-st-observado-profarma.md`; traço continua nulo, sem presumir zero ou aplicar essa exceção a medicamentos.
- Os vinte itens são higiene, sem receita. Cashback, WimiCoins, frete, pagamentos e suas regras existentes não foram alterados.
- Faltam regras comerciais para 224 dos novos candidatos. A pergunta sobre acréscimo de 35% ou 20% permanece pendente; as regras anteriores não foram generalizadas para todas as marcas ou cuidados adultos.
- Quinze novas apresentações de fraldas têm dúvida de unidade de venda: pacote versus caixa fechada. Duas Huggies possuíam oferta positiva observada, mas isso não comprova preço por pacote. Não houve divisão de custo por suposição.
- Quatro Johnson’s com regra comercial conhecida continuam sem foto exata: 07891010257118, 07891010257125, 07891010257651 e 07891010568757. Fotos de outro volume, quantidade ou pacote unitário não substituem a apresentação correta.
- MamyPoko, Mili, Personal Baby, Cottonbaby, Anjinho, TENA, Adultcare e Poise não tiveram candidato de identidade exata localizado nas consultas realizadas. Isso não comprova inexistência ou falta de estoque. Resultados semelhantes de outras marcas/produtos foram excluídos.

As pendências por GTIN podem se sobrepor. Não se transformou ausência de resultado em estoque zero. Produtos existentes não foram desativados. A solicitação das 25 marcas continua parcialmente atendida e requer resolução das pendências para novas publicações.

## Fonte, revisão e publicação

Preparação privada: `outputs/infantil-e-adulto-chat5-2026-10-24/`. O relatório de quantidades, variantes e pendências está em `RELATORIO-FINAL.md`; o ponto de continuação é `CONTINUAR-AQUI.json`. Cotações, custos, capturas, fotos originais, manifestos e backups não são versionados.

Fonte executável revisada: `a5a77f7cbe04b6e4bb27b27e97363237b6c917cc`; imagem de ferramentas imutável `sha256:29aa41f16267278af4547908e92b6060a47e71d4e467259a032e4b6945e40929`. Foram conferidos 974 arquivos da fonte e 25 arquivos operacionais. O checkout permitido durante a execução foi `1def61cc73998164c4c713485a84ce972c8178c0`, com mudanças apenas de documentação em relação à fonte protegida. Não houve rebuild ou restart do app.

Pacote `johnsons20-v1`: 59 arquivos exatos, 20 fotos; fingerprint `eced32d5af72dd0f2fd06058b6b02b918b31dde74cfce792301a39fab1587841`. Revisões independentes reais conferiram dados, fotos, runtime, autorização, controle de grant e release. A aprovação de runtime às 06:48:50 UTC iniciou o prazo de 30 minutos; nenhuma data foi renovada ou aprovação anterior reutilizada.

O controle serial preservou a janela anterior de outra frente e usou CAS, mutex, marcadores, backups e grant exclusivo próprios. A janela `chat5-johnsons20-v1-20261024-065120` foi aplicada uma única vez. Encerramento ordinário às **07:03:53.075670 UTC**, com `phase=completed_released` e `productionGrant=false`, antes do vencimento original às 07:18:50 UTC. Não foi usado o modo excepcional de release de outro lote. SHA256 do estado encerrado: `a83461fa79fcfe2f854c968a645777eb401dad4f13edfa4103f6bf5ff2f7a5e6`.

## Verificação e limites

- QA Linux isolado: 20 produtos, 20 fotos, 40 auditorias, duplicação/rollback e reconciliação com fixtures financeiras não vazias nas oito tabelas protegidas. Banco de QA removido somente após confirmar propriedade e conteúdo; backups preservados.
- Lint, typecheck, build, validação Prisma, testes, segurança e auditorias executados na imagem revisada. Auditorias completa e de produção conservaram seis alertas moderados, zero altos e zero críticos. Os relatórios integrais foram preservados.
- Backup da janela, baseline e dry-run reais precederam a aplicação. Produção: 20 produtos, ofertas e fotos; 40 auditorias; registros existentes e tabelas protegidas preservados, sem aplicação incerta ou contêiner próprio ativo.
- Conferência física após a aplicação: 1.604 registros totais e 1.601 ativos naquele instante. Conferência pública das 20 páginas, preços, imagens e hashes publicados passou; não se inferiu sucesso público apenas do teste isolado.
- Falhas auxiliares de relatório por nomes de arquivo foram corrigidas preservando os logs e as provas reais. A captura física já concluída foi gravada no caminho esperado pela validação pública, sem repetir grant ou aplicação. O processo Plink local de QA, que permaneceu aberto após o servidor registrar sucesso e ausência de contêiner próprio, foi encerrado somente após conferir sua identidade.

Provas privadas principais: `johnsons20-v1-qa-evidence/`, `johnsons20-v1-production-evidence/` e `johnsons20-v1-closure-evidence/`. SHA256 da prova de produção: `02ceaff14e7d99895d6e58fb3a77978a31c5295e7e2d9aa2415f2810fd793825`; prova pública: `f5566842b2edfaef1f4c046744cd586b0c70c3f7d16052234eb63430c67d99c1`.
